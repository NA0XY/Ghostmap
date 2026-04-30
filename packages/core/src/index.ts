import fs from "node:fs";
import path from "node:path";
import { buildGraph } from "./graph/builder.js";
import { detectLanguage } from "./parser/language-detector.js";
import { parseJsTsFile } from "./parser/js-ts-parser.js";
import { walkFiles } from "./parser/file-walker.js";
import { parsePythonFile } from "./parser/python-parser.js";
import { initParsers } from "./parser/tree-sitter.js";
import type { GraphData, ParsedFile } from "./types/index.js";
import { logger } from "./utils/logger.js";

export type {
  AuthorStats,
  BlameEntry,
  CommitRecord,
  FunctionCall,
  GraphData,
  GraphEdge,
  GraphNode,
  GraphStats,
  Import,
  Language,
  ParsedFile,
  ParsedFunction,
} from "./types/index.js";

export interface AnalyzeOptions {
  maxFiles?: number;
  includeFunctions?: boolean;
  includeOnly?: string[];
}

function toRelativePath(filePath: string, repoRoot: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function normalizePath(filePath: string): string {
  return path.resolve(filePath);
}

export async function analyzeRepo(
  repoPath: string,
  options: AnalyzeOptions = {},
): Promise<GraphData> {
  const startTimeMs = Date.now();
  const absoluteRoot = normalizePath(repoPath);
  const maxFiles = options.maxFiles ?? 50_000;
  const includeFunctions = options.includeFunctions ?? true;

  if (!fs.existsSync(absoluteRoot)) {
    throw new Error(`Repository path does not exist: ${absoluteRoot}`);
  }
  if (!fs.statSync(absoluteRoot).isDirectory()) {
    throw new Error(`Repository path is not a directory: ${absoluteRoot}`);
  }

  logger.info("Starting repository analysis", {
    repoPath: absoluteRoot,
    maxFiles,
  });

  initParsers();

  const discoveredFiles = await walkFiles(absoluteRoot, maxFiles);
  const includeOnlySet = new Set(
    (options.includeOnly ?? []).map((entry) => normalizePath(entry)),
  );

  const filePaths =
    includeOnlySet.size > 0
      ? discoveredFiles.filter((filePath) => includeOnlySet.has(normalizePath(filePath)))
      : discoveredFiles;

  logger.info("File discovery complete", {
    discoveredFiles: discoveredFiles.length,
    selectedFiles: filePaths.length,
  });

  const fileStatMap = new Map<string, { lastModifiedMs: number }>();
  await Promise.allSettled(
    filePaths.map(async (filePath) => {
      try {
        const stat = await fs.promises.stat(filePath);
        fileStatMap.set(filePath, { lastModifiedMs: stat.mtimeMs });
      } catch (error) {
        logger.debug("Unable to collect file stat", {
          filePath,
          error: String(error),
        });
      }
    }),
  );

  const parsedFiles: ParsedFile[] = [];

  for (const filePath of filePaths) {
    const language = detectLanguage(filePath);
    if (!language) {
      continue;
    }

    let parsedFile: ParsedFile;
    try {
      if (language === "python") {
        parsedFile = parsePythonFile(filePath, absoluteRoot);
      } else {
        parsedFile = parseJsTsFile(filePath, absoluteRoot, language);
      }
    } catch (error) {
      logger.error("Unexpected parser failure", {
        filePath,
        error: String(error),
      });
      parsedFile = {
        path: filePath,
        relativePath: toRelativePath(filePath, absoluteRoot),
        language,
        functions: [],
        imports: [],
        lineCount: 0,
        sizeBytes: 0,
        parseError: `Unexpected parser failure: ${String(error)}`,
      };
    }

    if (!includeFunctions) {
      parsedFile = { ...parsedFile, functions: [] };
    }

    parsedFiles.push(parsedFile);
  }

  const analysisTimeMs = Date.now() - startTimeMs;
  const graphData = buildGraph(parsedFiles, absoluteRoot, analysisTimeMs, fileStatMap);

  logger.info("Repository analysis complete", {
    analysisTimeMs,
    files: graphData.stats.totalFiles,
    nodes: graphData.nodes.length,
    edges: graphData.edges.length,
  });

  return graphData;
}
