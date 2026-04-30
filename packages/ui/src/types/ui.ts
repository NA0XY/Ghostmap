import type { GraphData, GraphEdge, GraphNode } from "@ghostmap/core";

export type ActiveLayer = "graph" | "ownership" | "decay" | "stranger-danger";

export interface SimulationNode extends GraphNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  index?: number;
}

export interface SimulationLink {
  source: SimulationNode | string;
  target: SimulationNode | string;
  type: GraphEdge["type"];
  id: string;
}

export interface SelectionState {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  highlightedNodeIds: Set<string>;
  highlightedEdgeIds: Set<string>;
}

export interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  node: GraphNode | null;
}

export interface GraphCanvasProps {
  data: GraphData;
  activeLayer: ActiveLayer;
  searchQuery: string;
  width?: number;
  height?: number;
  onNodeSelect?: (node: GraphNode | null) => void;
  onEdgeSelect?: (edge: GraphEdge | null) => void;
  className?: string;
}

export interface SidebarProps {
  selectedNode: GraphNode | null;
  activeLayer: ActiveLayer;
  graphData: GraphData;
  onClose: () => void;
}

export interface FeatureTogglesProps {
  activeLayer: ActiveLayer;
  onChange: (layer: ActiveLayer) => void;
  availableLayers?: ActiveLayer[];
}

export type { GraphData, GraphEdge, GraphNode } from "@ghostmap/core";
