import type {
  GraphData,
  GraphEdge,
  GraphNode,
  GraphNodeMetadata,
  GraphStats,
  Language,
  ParsedFile,
} from "../types/index.js";
import { makeNodeId } from "../utils/path-utils.js";
import { logger } from "../utils/logger.js";

export function buildGraph(
  parsedFiles: ParsedFile[],
  repoPath: string,
  analysisTimeMs: number,
  fileStatMap: Map<string, { lastModifiedMs: number }>,
): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  for (const file of parsedFiles) {
    const fileNodeId = makeNodeId(file.relativePath);
    if (nodeIds.has(fileNodeId)) {
      logger.warn("Duplicate file node id skipped", { fileNodeId });
      continue;
    }
    nodeIds.add(fileNodeId);

    const lastModifiedMs = fileStatMap.get(file.path)?.lastModifiedMs;
    const fileMeta: GraphNodeMetadata = {
      lineCount: file.lineCount,
      sizeBytes: file.sizeBytes,
      language: file.language,
      ...(lastModifiedMs !== undefined ? { lastModifiedMs } : {}),
    };

    nodes.push({
      id: fileNodeId,
      label: file.relativePath.split("/").pop() ?? file.relativePath,
      type: "file",
      filePath: file.path,
      relativePath: file.relativePath,
      language: file.language,
      metadata: fileMeta,
    });

    for (const fn of file.functions) {
      const fnNodeId = makeNodeId(file.relativePath, fn.name);
      if (nodeIds.has(fnNodeId)) {
        continue;
      }
      nodeIds.add(fnNodeId);

      const fnMeta: GraphNodeMetadata = {
        language: file.language,
        isExported: fn.isExported,
        isAsync: fn.isAsync,
        hasDocstring: fn.hasDocstring,
      };

      nodes.push({
        id: fnNodeId,
        label: fn.name,
        type: "function",
        filePath: file.path,
        relativePath: file.relativePath,
        language: file.language,
        metadata: fnMeta,
      });

      addEdge(edges, edgeIds, fileNodeId, fnNodeId, "contains");
    }
  }

  const fileNodeByAbsolutePath = new Map<string, string>();
  for (const parsedFile of parsedFiles) {
    fileNodeByAbsolutePath.set(parsedFile.path, makeNodeId(parsedFile.relativePath));
  }

  for (const parsedFile of parsedFiles) {
    const sourceNodeId = makeNodeId(parsedFile.relativePath);
    for (const imp of parsedFile.imports) {
      if (imp.isExternal || imp.resolvedPath === null) {
        continue;
      }
      const targetNodeId = fileNodeByAbsolutePath.get(imp.resolvedPath);
      if (!targetNodeId || targetNodeId === sourceNodeId) {
        continue;
      }
      addEdge(edges, edgeIds, sourceNodeId, targetNodeId, "import");
    }
  }

  const functionNodesByName = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.type !== "function") {
      continue;
    }
    const list = functionNodesByName.get(node.label) ?? [];
    list.push(node.id);
    functionNodesByName.set(node.label, list);
  }

  for (const file of parsedFiles) {
    for (const fn of file.functions) {
      const callerNodeId = makeNodeId(file.relativePath, fn.name);
      if (!nodeIds.has(callerNodeId)) {
        continue;
      }
      for (const call of fn.calls) {
        const baseName = call.calleeName.split(".").pop() ?? call.calleeName;
        const targets = functionNodesByName.get(baseName) ?? [];
        for (const targetNodeId of targets) {
          addEdge(edges, edgeIds, callerNodeId, targetNodeId, "call");
        }
      }
    }
  }

  const languageBreakdown: Record<Language, number> = {
    javascript: 0,
    typescript: 0,
    python: 0,
  };

  let parsedFilesCount = 0;
  let failedFilesCount = 0;
  for (const file of parsedFiles) {
    languageBreakdown[file.language] += 1;
    if (file.parseError) {
      failedFilesCount += 1;
    } else {
      parsedFilesCount += 1;
    }
  }

  const stats: GraphStats = {
    totalFiles: parsedFiles.length,
    totalFunctions: nodes.filter((node) => node.type === "function").length,
    totalEdges: edges.length,
    parsedFiles: parsedFilesCount,
    failedFiles: failedFilesCount,
    languageBreakdown,
    analysisTimeMs,
  };

  logger.info("Graph built", {
    nodes: nodes.length,
    edges: edges.length,
    parsedFiles: parsedFilesCount,
    failedFiles: failedFilesCount,
  });

  return {
    nodes,
    edges,
    generatedAt: new Date().toISOString(),
    repoPath,
    stats,
  };
}

function addEdge(
  edges: GraphEdge[],
  edgeIds: Set<string>,
  source: string,
  target: string,
  type: GraphEdge["type"],
): void {
  const edgeId = `${source}->${target}:${type}`;
  if (edgeIds.has(edgeId)) {
    return;
  }
  edgeIds.add(edgeId);
  edges.push({
    id: edgeId,
    source,
    target,
    type,
  });
}
