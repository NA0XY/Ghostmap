import fs from "node:fs";
import path from "node:path";
import type Parser from "tree-sitter";
import type { FunctionCall, Import, ParsedFile, ParsedFunction } from "../types/index.js";
import { parseSource } from "./tree-sitter.js";
import { resolvePythonImport } from "../utils/path-utils.js";
import { logger } from "../utils/logger.js";

function toRelativePath(filePath: string, repoRoot: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function makeErrorFile(
  filePath: string,
  repoRoot: string,
  sizeBytes: number,
  error: string,
): ParsedFile {
  return {
    path: filePath,
    relativePath: toRelativePath(filePath, repoRoot),
    language: "python",
    functions: [],
    imports: [],
    lineCount: 0,
    sizeBytes,
    parseError: error,
  };
}

export function parsePythonFile(filePath: string, repoRoot: string): ParsedFile {
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
        sizeBytes,
        `File too large (${sizeBytes} bytes)`,
      );
    }

    source = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    return makeErrorFile(filePath, repoRoot, 0, `Cannot read file: ${String(error)}`);
  }

  const parsed = parseSource(source, filePath);
  if (!parsed) {
    return makeErrorFile(filePath, repoRoot, sizeBytes, "Tree-sitter returned null");
  }

  const lineCount = source === "" ? 0 : source.split(/\r?\n/).length;
  let imports: Import[] = [];
  let functions: ParsedFunction[] = [];

  try {
    imports = extractPythonImports(filePath, repoRoot, parsed.tree);
  } catch (error) {
    logger.warn("Python import extraction failed", {
      filePath,
      error: String(error),
    });
  }

  try {
    functions = extractPythonFunctions(parsed.tree);
  } catch (error) {
    logger.warn("Python function extraction failed", {
      filePath,
      error: String(error),
    });
  }

  return {
    path: filePath,
    relativePath: toRelativePath(filePath, repoRoot),
    language: "python",
    functions,
    imports,
    lineCount,
    sizeBytes,
    parseError: parsed.hasError ? "Tree-sitter reported syntax errors" : null,
  };
}

function extractPythonImports(
  filePath: string,
  repoRoot: string,
  tree: Parser.Tree,
): Import[] {
  const imports: Import[] = [];

  function walk(node: Parser.SyntaxNode): void {
    if (node.type === "import_statement") {
      for (const child of node.children) {
        if (child.type === "dotted_name" || child.type === "aliased_import") {
          const moduleName =
            child.type === "aliased_import"
              ? child.childForFieldName("name")?.text ?? child.children[0]?.text ?? ""
              : child.text;

          if (!moduleName) {
            continue;
          }

          const resolvedPath = resolvePythonImport(moduleName, filePath, repoRoot, false);
          imports.push({
            sourceFile: filePath,
            importedNames: ["*"],
            rawSpecifier: moduleName,
            resolvedPath,
            isExternal: resolvedPath === null,
            line: child.startPosition.row + 1,
          });
        }
      }
    } else if (node.type === "import_from_statement") {
      const relativePart =
        node.children.find((child) => child.type === "relative_import")?.text ?? "";
      const moduleNode =
        node.childForFieldName("module_name") ??
        node.children.find((child) => child.type === "dotted_name") ??
        null;

      const moduleName = moduleNode?.text ?? "";
      const rawSpecifier = `${relativePart}${moduleName}` || ".";
      const isRelative = rawSpecifier.startsWith(".");

      const importedNames: string[] = [];
      const importListNode = node.children.find((child) => child.type === "import_list") ?? null;
      if (importListNode) {
        for (const child of importListNode.children) {
          if (child.type === "identifier") {
            importedNames.push(child.text);
          } else if (child.type === "aliased_import") {
            const nameNode = child.childForFieldName("name") ?? child.children[0] ?? null;
            if (nameNode) {
              importedNames.push(nameNode.text);
            }
          }
        }
      }

      const resolvedPath = resolvePythonImport(moduleName, filePath, repoRoot, isRelative);
      imports.push({
        sourceFile: filePath,
        importedNames: importedNames.length > 0 ? importedNames : ["*"],
        rawSpecifier,
        resolvedPath,
        isExternal: !isRelative && resolvedPath === null,
        line: node.startPosition.row + 1,
      });
    }

    for (const child of node.children) {
      walk(child);
    }
  }

  walk(tree.rootNode);

  const seen = new Set<string>();
  const deduped: Import[] = [];
  for (const entry of imports) {
    const key = `${entry.sourceFile}::${entry.rawSpecifier}::${entry.line}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(entry);
  }
  return deduped;
}

function extractPythonFunctions(tree: Parser.Tree): ParsedFunction[] {
  const functions: ParsedFunction[] = [];
  const seen = new Set<string>();

  function walk(node: Parser.SyntaxNode, scopePrefix = ""): void {
    if (node.type === "class_definition") {
      const className = node.childForFieldName("name")?.text ?? "UnknownClass";
      const nextPrefix = scopePrefix ? `${scopePrefix}.${className}` : className;
      const classBody = node.childForFieldName("body");
      if (classBody) {
        for (const child of classBody.children) {
          walk(child, nextPrefix);
        }
      }
      return;
    }

    if (node.type === "function_definition" || node.type === "async_function_definition") {
      const nameNode = node.childForFieldName("name");
      if (!nameNode) {
        return;
      }

      const baseName = nameNode.text;
      const qualifiedName = scopePrefix ? `${scopePrefix}.${baseName}` : baseName;
      const startLine = node.startPosition.row + 1;
      const key = `${qualifiedName}:${startLine}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);

      const bodyNode = node.childForFieldName("body");
      const hasDocstring = bodyNode ? checkPythonDocstring(bodyNode) : false;
      const calls = bodyNode ? extractPythonCalls(bodyNode) : [];

      functions.push({
        name: qualifiedName,
        startLine,
        endLine: node.endPosition.row + 1,
        calls,
        hasDocstring,
        isExported: !baseName.startsWith("_"),
        isAsync: node.type === "async_function_definition",
      });

      if (bodyNode) {
        for (const child of bodyNode.children) {
          walk(child, qualifiedName);
        }
      }
      return;
    }

    for (const child of node.children) {
      walk(child, scopePrefix);
    }
  }

  walk(tree.rootNode);
  return functions;
}

function checkPythonDocstring(bodyNode: Parser.SyntaxNode): boolean {
  const firstStatement =
    bodyNode.namedChildren.find((child) => child.type !== "comment") ?? null;

  if (!firstStatement || firstStatement.type !== "expression_statement") {
    return false;
  }

  const expr = firstStatement.namedChildren[0] ?? null;
  return expr?.type === "string";
}

function extractPythonCalls(bodyNode: Parser.SyntaxNode): FunctionCall[] {
  const calls: FunctionCall[] = [];

  function walk(node: Parser.SyntaxNode): void {
    if (node.type === "function_definition" || node.type === "async_function_definition") {
      return;
    }

    if (node.type === "call") {
      const fn = node.childForFieldName("function");
      if (fn) {
        calls.push({
          calleeName: fn.text.replace(/\s+/g, ""),
          line: fn.startPosition.row + 1,
        });
      }
    }

    for (const child of node.children) {
      walk(child);
    }
  }

  walk(bodyNode);
  return calls;
}
