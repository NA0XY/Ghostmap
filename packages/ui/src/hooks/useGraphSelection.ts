import { useCallback, useState } from "react";
import type { GraphData, GraphEdge, GraphNode } from "@ghostmap/core";
import type { SelectionState } from "../types/ui.js";

interface UseGraphSelectionResult {
  selection: SelectionState;
  selectNode: (node: GraphNode | null, graphData: GraphData) => void;
  selectEdge: (edge: GraphEdge | null) => void;
  clearSelection: () => void;
}

const EMPTY_SELECTION: SelectionState = {
  selectedNodeId: null,
  selectedEdgeId: null,
  highlightedNodeIds: new Set(),
  highlightedEdgeIds: new Set(),
};

export function useGraphSelection(): UseGraphSelectionResult {
  const [selection, setSelection] = useState<SelectionState>(EMPTY_SELECTION);

  const selectNode = useCallback((node: GraphNode | null, graphData: GraphData): void => {
    if (!node) {
      setSelection(EMPTY_SELECTION);
      return;
    }

    const highlightedNodeIds = new Set<string>([node.id]);
    const highlightedEdgeIds = new Set<string>();

    for (const edge of graphData.edges) {
      if (edge.source === node.id || edge.target === node.id) {
        highlightedEdgeIds.add(edge.id);
        highlightedNodeIds.add(edge.source);
        highlightedNodeIds.add(edge.target);
      }
    }

    setSelection({
      selectedNodeId: node.id,
      selectedEdgeId: null,
      highlightedNodeIds,
      highlightedEdgeIds,
    });
  }, []);

  const selectEdge = useCallback((edge: GraphEdge | null): void => {
    if (!edge) {
      setSelection(EMPTY_SELECTION);
      return;
    }

    setSelection({
      selectedNodeId: null,
      selectedEdgeId: edge.id,
      highlightedNodeIds: new Set([edge.source, edge.target]),
      highlightedEdgeIds: new Set([edge.id]),
    });
  }, []);

  const clearSelection = useCallback((): void => {
    setSelection(EMPTY_SELECTION);
  }, []);

  return { selection, selectNode, selectEdge, clearSelection };
}
