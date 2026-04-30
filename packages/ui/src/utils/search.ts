import type { GraphNode } from "@ghostmap/core";

export function searchNodes(nodes: GraphNode[], query: string): Set<string> | null {
  const q = query.trim().toLowerCase();
  if (!q) {
    return null;
  }

  const matches = new Set<string>();
  for (const node of nodes) {
    if (
      node.label.toLowerCase().includes(q) ||
      node.relativePath.toLowerCase().includes(q) ||
      (node.language ?? "").includes(q) ||
      (node.metadata.ownerName ?? "").toLowerCase().includes(q) ||
      (node.metadata.ownerEmail ?? "").toLowerCase().includes(q)
    ) {
      matches.add(node.id);
    }
  }
  return matches;
}
