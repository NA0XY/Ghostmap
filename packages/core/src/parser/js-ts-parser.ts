import fs from "node:fs";
import path from "node:path";
import type Parser from "tree-sitter";
import type {
  FunctionCall,
  Import,
  Language,
  ParsedFile,
  ParsedFunction,
} from "../types/index.js";
import { parseSource } from "./tree-sitter.js";
import { resolveJsTsImport } from "../utils/path-utils.js";
import { logger } from "../utils/logger.js";

const FUNCTION_NODE_TYPES = new Set([
  "function_declaration",
  "function_expression",
  "arrow_function",
  "method_definition",
  "generator_function_declaration",
  "generator_function",
]);

function toRelativePath(filePath: string, repoRoot: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function makeErrorFile(
  filePath: string,
  repoRoot: string,
  language: Language,
  sizeBytes: number,
  error: string,
): ParsedFile {
  return {
    path: filePath,
    relativePath: toRelativePath(filePath, repoRoot),
    language,
    functions: [],
    imports: [],
    lineCount: 0,
    sizeBytes,
    parseError: error,
  };
}

export function parseJsTsFile(
  filePath: string,
  repoRoot: string,
  language: Language,
): ParsedFile {
  let source: string;
  let sizeBytes: number;

  try {
    const stat = fs.statSync(filePath);
    sizeBytes = stat.size;

    if (sizeBytes > 1_000_000) {
      logger.warn("Skipping large file", { filePath, sizeBytes });
      return makeErrorFile(
        filePath,
        repoRoot,
        language,
        sizeBytes,
        `File too large (${sizeBytes} bytes)`,
      );
    }

    source = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    return makeErrorFile(
      filePath,
      repoRoot,
      language,
      0,
      `Cannot read file: ${String(error)}`,
    );
  }

  const parsed = parseSource(source, filePath);
  if (!parsed) {
    return makeErrorFile(filePath, repoRoot, language, sizeBytes, "Tree-sitter returned null");
  }

  const lineCount = source === "" ? 0 : source.split(/\r?\n/).length;
  const lines = source.split(/\r?\n/);
  let imports: Import[] = [];
  let functions: ParsedFunction[] = [];

  try {
    imports = extractJsTsImports(filePath, repoRoot, parsed.tree);
  } catch (error) {
    logger.warn("Import extraction failed", { filePath, error: String(error) });
  }

  try {
    functions = extractJsTsFunctions(source, lines, parsed.tree);
  } catch (error) {
    logger.warn("Function extraction failed", { filePath, error: String(error) });
  }

  return {
    path: filePath,
    relativePath: toRelativePath(filePath, repoRoot),
    language,
    functions,
    imports,
    lineCount,
    sizeBytes,
    parseError: parsed.hasError ? "Tree-sitter reported syntax errors" : null,
  };
}

function extractJsTsImports(
  filePath: string,
  repoRoot: string,
  tree: Parser.Tree,
): Import[] {
  const imports: Import[] = [];

  function walk(node: Parser.SyntaxNode): void {
    if (
      node.type === "import_statement" ||
      node.type === "import_declaration" ||
      node.type === "export_statement" ||
      node.type === "export_declaration"
    ) {
      const importEntry = parseEsmOrReExport(node, filePath, repoRoot);
      if (importEntry) {
        imports.push(importEntry);
      }
    } else if (node.type === "call_expression") {
      const requireEntry = parseRequireCall(node, filePath, repoRoot);
      if (requireEntry) {
        imports.push(requireEntry);
      }
      const dynamicImportEntry = parseDynamicImportCall(node, filePath, repoRoot);
      if (dynamicImportEntry) {
        imports.push(dynamicImportEntry);
      }
    }

    for (const child of node.children) {
      walk(child);
    }
  }

  walk(tree.rootNode);

  const seen = new Set<string>();
  const deduped: Import[] = [];
  for (const imp of imports) {
    const key = `${imp.sourceFile}::${imp.rawSpecifier}::${imp.line}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(imp);
  }
  return deduped;
}

function parseEsmOrReExport(
  node: Parser.SyntaxNode,
  filePath: string,
  repoRoot: string,
): Import | null {
  const sourceNode =
    node.childForFieldName("source") ?? node.children.find((child) => child.type === "string") ?? null;

  if (!sourceNode) {
    return null;
  }

  const rawSpecifier = stripQuotes(sourceNode.text);
  if (!rawSpecifier) {
    return null;
  }

  const importedNames = extractImportedNames(node);
  const isExternal = !rawSpecifier.startsWith(".");
  const resolvedPath = isExternal
    ? null
    : resolveJsTsImport(rawSpecifier, filePath, repoRoot);

  return {
    sourceFile: filePath,
    importedNames,
    rawSpecifier,
    resolvedPath,
    isExternal,
    line: sourceNode.startPosition.row + 1,
  };
}

function parseRequireCall(
  node: Parser.SyntaxNode,
  filePath: string,
  repoRoot: string,
): Import | null {
  const fnNode = node.childForFieldName("function");
  if (!fnNode || fnNode.text !== "require") {
    return null;
  }

  const argsNode = node.childForFieldName("arguments");
  if (!argsNode) {
    return null;
  }

  const firstArg = argsNode.namedChildren[0];
  if (!firstArg || firstArg.type !== "string") {
    return null;
  }

  const rawSpecifier = stripQuotes(firstArg.text);
  if (!rawSpecifier) {
    return null;
  }

  const isExternal = !rawSpecifier.startsWith(".");
  const resolvedPath = isExternal
    ? null
    : resolveJsTsImport(rawSpecifier, filePath, repoRoot);

  return {
    sourceFile: filePath,
    importedNames: ["*"],
    rawSpecifier,
    resolvedPath,
    isExternal,
    line: firstArg.startPosition.row + 1,
  };
}

function parseDynamicImportCall(
  node: Parser.SyntaxNode,
  filePath: string,
  repoRoot: string,
): Import | null {
  const fnNode = node.childForFieldName("function");
  if (!fnNode || fnNode.text !== "import") {
    return null;
  }

  const argsNode = node.childForFieldName("arguments");
  if (!argsNode) {
    return null;
  }

  const firstArg = argsNode.namedChildren[0];
  if (!firstArg || firstArg.type !== "string") {
    return null;
  }

  const rawSpecifier = stripQuotes(firstArg.text);
  if (!rawSpecifier) {
    return null;
  }

  const isExternal = !rawSpecifier.startsWith(".");
  const resolvedPath = isExternal
    ? null
    : resolveJsTsImport(rawSpecifier, filePath, repoRoot);

  return {
    sourceFile: filePath,
    importedNames: ["*"],
    rawSpecifier,
    resolvedPath,
    isExternal,
    line: firstArg.startPosition.row + 1,
  };
}

function extractImportedNames(node: Parser.SyntaxNode): string[] {
  const names: string[] = [];

  for (const child of node.children) {
    if (child.type === "namespace_import") {
      const alias = child.namedChildren.find((named) => named.type === "identifier");
      if (alias) {
        names.push(`* as ${alias.text}`);
      }
      continue;
    }
    if (child.type === "import_specifier" || child.type === "export_specifier") {
      const nameNode = child.childForFieldName("name") ?? child.namedChildren[0] ?? null;
      if (nameNode) {
        names.push(nameNode.text);
      }
      continue;
    }
    if (child.type === "identifier" && node.type !== "export_statement") {
      if (!names.includes(child.text)) {
        names.push(child.text);
      }
    }
  }

  return names.length > 0 ? names : ["*"];
}

function extractJsTsFunctions(
  source: string,
  lines: string[],
  tree: Parser.Tree,
): ParsedFunction[] {
  const functions: ParsedFunction[] = [];
  const seen = new Set<string>();

  function walk(node: Parser.SyntaxNode): void {
    if (FUNCTION_NODE_TYPES.has(node.type)) {
      const fn = buildParsedFunction(node, source, lines);
      if (fn) {
        const key = `${fn.name}:${fn.startLine}`;
        if (!seen.has(key)) {
          seen.add(key);
          functions.push(fn);
        }
      }
    }

    for (const child of node.children) {
      walk(child);
    }
  }

  walk(tree.rootNode);
  return functions;
}

function buildParsedFunction(
  node: Parser.SyntaxNode,
  source: string,
  lines: string[],
): ParsedFunction | null {
  const name = resolveFunctionName(node);
  if (!name || name === "<anonymous>") {
    return null;
  }

  const startLine = node.startPosition.row + 1;
  const endLine = node.endPosition.row + 1;
  const isAsync = node.children.some((child) => child.type === "async");
  const isExported = isNodeExported(node);
  const hasDocstring = checkJsDocPresence(source, lines, node, startLine);
  const calls = extractCallsFromNode(node);

  return {
    name,
    startLine,
    endLine,
    calls,
    hasDocstring,
    isExported,
    isAsync,
  };
}

function resolveFunctionName(node: Parser.SyntaxNode): string {
  const fieldName = node.childForFieldName("name");
  if (fieldName) {
    return fieldName.text;
  }

  const keyNode = node.childForFieldName("key");
  if (keyNode) {
    return keyNode.text;
  }

  const parent = node.parent;
  if (parent?.type === "variable_declarator") {
    const varName = parent.childForFieldName("name");
    if (varName) {
      return varName.text;
    }
  }

  if (parent?.type === "assignment_expression") {
    const leftNode = parent.childForFieldName("left");
    if (leftNode) {
      return leftNode.text;
    }
  }

  if (parent?.type === "pair") {
    const objectKey = parent.childForFieldName("key");
    if (objectKey) {
      return objectKey.text;
    }
  }

  return "<anonymous>";
}

function isNodeExported(node: Parser.SyntaxNode): boolean {
  let current: Parser.SyntaxNode | null = node;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (
      current.type === "export_statement" ||
      current.type === "export_declaration"
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function checkJsDocPresence(
  source: string,
  lines: string[],
  node: Parser.SyntaxNode,
  startLine: number,
): boolean {
  if (startLine >= 2) {
    const previousLine = lines[startLine - 2]?.trim() ?? "";
    if (
      previousLine.startsWith("/**") ||
      previousLine.startsWith("*") ||
      previousLine.endsWith("*/")
    ) {
      return true;
    }
  }

  const lookbackStart = Math.max(0, node.startIndex - 400);
  const prefix = source.slice(lookbackStart, node.startIndex);
  return /\/\*\*[\s\S]*\*\/\s*$/m.test(prefix);
}

function extractCallsFromNode(functionNode: Parser.SyntaxNode): FunctionCall[] {
  const calls: FunctionCall[] = [];
  const body = functionNode.childForFieldName("body");
  if (!body) {
    return calls;
  }

  function walk(node: Parser.SyntaxNode): void {
    if (FUNCTION_NODE_TYPES.has(node.type) && node !== body) {
      return;
    }

    if (node.type === "call_expression") {
      const fn = node.childForFieldName("function");
      if (fn) {
        const calleeName = fn.text.replace(/\s+/g, "");
        if (calleeName !== "" && calleeName !== "require") {
          calls.push({
            calleeName,
            line: fn.startPosition.row + 1,
          });
        }
      }
    }

    for (const child of node.children) {
      walk(child);
    }
  }

  walk(body);
  return calls;
}

function stripQuotes(text: string): string {
  return text.replace(/^["'`]|["'`]$/g, "");
}
