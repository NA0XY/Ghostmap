import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import TypeScript from "tree-sitter-typescript";
import Python from "tree-sitter-python";
import type { Language } from "../types/index.js";
import { logger } from "../utils/logger.js";

let jsParser: Parser | null = null;
let tsParser: Parser | null = null;
let tsxParser: Parser | null = null;
let pyParser: Parser | null = null;
let initialized = false;

export interface ParseResult {
  readonly tree: Parser.Tree;
  readonly hasError: boolean;
}

export function initParsers(): void {
  if (initialized) {
    return;
  }

  try {
    jsParser = new Parser();
    jsParser.setLanguage(JavaScript);

    tsParser = new Parser();
    tsParser.setLanguage(TypeScript.typescript);

    tsxParser = new Parser();
    tsxParser.setLanguage(TypeScript.tsx);

    pyParser = new Parser();
    pyParser.setLanguage(Python);

    initialized = true;
    logger.info("Tree-sitter parsers initialized");
  } catch (error) {
    logger.error("Failed to initialize Tree-sitter parsers", {
      error: String(error),
    });
    throw new Error(`Tree-sitter initialization failed: ${String(error)}`);
  }
}

type SupportedExtension =
  | ".js"
  | ".jsx"
  | ".mjs"
  | ".cjs"
  | ".ts"
  | ".tsx"
  | ".mts"
  | ".cts"
  | ".py";

function extensionFromPath(filePath: string): string {
  const normalized = filePath.toLowerCase();
  if (normalized.endsWith(".d.ts")) {
    return ".d.ts";
  }
  return normalized.slice(normalized.lastIndexOf(".")) as SupportedExtension;
}

export function parseSource(sourceCode: string, filePath: string): ParseResult | null {
  if (!initialized) {
    initParsers();
  }

  const ext = extensionFromPath(filePath);
  let parser: Parser | null = null;

  if (ext === ".tsx") {
    parser = tsxParser;
  } else if (ext === ".ts" || ext === ".mts" || ext === ".cts") {
    parser = tsParser;
  } else if (ext === ".js" || ext === ".jsx" || ext === ".mjs" || ext === ".cjs") {
    parser = jsParser;
  } else if (ext === ".py") {
    parser = pyParser;
  }

  if (!parser) {
    logger.warn("No parser for file extension", { filePath, ext });
    return null;
  }

  try {
    const tree = parser.parse(sourceCode);
    return { tree, hasError: tree.rootNode.hasError };
  } catch (error) {
    logger.error("Tree-sitter parse failed", { filePath, error: String(error) });
    return null;
  }
}

export function query(
  language: Language,
  queryString: string,
  node: Parser.SyntaxNode,
): Parser.QueryMatch[] {
  if (!initialized) {
    initParsers();
  }

  try {
    let parserLanguage: unknown;
    if (language === "python") {
      parserLanguage = Python;
    } else if (language === "typescript") {
      parserLanguage = TypeScript.typescript;
    } else {
      parserLanguage = JavaScript;
    }

    const compiledQuery = new Parser.Query(parserLanguage, queryString);
    return compiledQuery.matches(node);
  } catch (error) {
    logger.warn("Tree-sitter query failed", {
      language,
      error: String(error),
    });
    return [];
  }
}
