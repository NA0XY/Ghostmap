import type { GraphNode } from "@ghostmap/core";
import type { ActiveLayer } from "../types/ui.js";

export interface NodeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  shape: "circle" | "diamond";
  opacity: number;
  isStrangerDanger: boolean;
  isPulsing: boolean;
}

const LANGUAGE_COLORS: Record<string, string> = {
  javascript: "var(--gm-node-file-hover)",
  typescript: "var(--gm-node-file)",
  python: "var(--gm-edge-active)",
};

export function getNodeStyle(
  node: GraphNode,
  layer: ActiveLayer,
  isSelected: boolean,
  isHighlighted: boolean,
  isSearchMatch: boolean,
  isDimmed: boolean,
): NodeStyle {
  const isFile = node.type === "file";
  const baseRadius = isFile
    ? clamp(8 + Math.log((node.metadata.lineCount ?? 50) + 1) * 1.5, 8, 22)
    : clamp(5 + Math.log((node.metadata.lineCount ?? 10) + 1), 5, 12);

  const radius = isSelected ? baseRadius * 1.3 : baseRadius;
  const shape: "circle" | "diamond" = isFile ? "circle" : "diamond";

  let fill: string;
  let stroke: string;
  let strokeWidth = isSelected ? 2.5 : isHighlighted ? 1.5 : 1;

  if (layer === "ownership") {
    fill = node.metadata.ownerColor ?? "var(--gm-node-file)";
    stroke = isSelected
      ? "var(--gm-node-selected)"
      : "color-mix(in srgb, var(--gm-text-primary) 15%, transparent)";
  } else if (layer === "decay") {
    fill = decayColor(node.metadata.decayScore ?? 0);
    stroke = isSelected
      ? "var(--gm-node-selected)"
      : "color-mix(in srgb, var(--gm-text-primary) 10%, transparent)";
  } else if (layer === "stranger-danger") {
    const isDanger = node.metadata.strangerDanger === true;
    fill = isDanger
      ? "var(--gm-stranger)"
      : isFile
        ? "var(--gm-node-file)"
        : "var(--gm-node-fn)";
    stroke = isDanger ? "var(--gm-stranger)" : "transparent";
    strokeWidth = isDanger ? 2 : 1;
  } else {
    fill = isFile
      ? (LANGUAGE_COLORS[node.language ?? ""] ?? "var(--gm-node-file)")
      : "var(--gm-node-fn)";
    stroke = isSelected
      ? "var(--gm-node-selected)"
      : "color-mix(in srgb, var(--gm-text-primary) 8%, transparent)";
  }

  if (isSelected) {
    stroke = "var(--gm-node-selected)";
    strokeWidth = 2.5;
  }

  const opacity = isDimmed ? 0.15 : isSearchMatch ? 1 : isHighlighted ? 0.95 : 1;
  const isStrangerDanger = node.metadata.strangerDanger === true;

  return {
    fill,
    stroke,
    strokeWidth,
    radius,
    shape,
    opacity,
    isStrangerDanger,
    isPulsing: isStrangerDanger && layer === "stranger-danger",
  };
}

export function decayColor(score: number): string {
  const s = clamp(score, 0, 1);
  if (s < 0.33) {
    return `color-mix(in srgb, var(--gm-decay-low) ${100 - s * 200}%, var(--gm-decay-mid) ${s * 200}%)`;
  }
  if (s < 0.66) {
    return `color-mix(in srgb, var(--gm-decay-mid) ${100 - (s - 0.33) * 200}%, var(--gm-decay-high) ${(s - 0.33) * 200}%)`;
  }
  return "var(--gm-decay-high)";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getEdgeOpacity(
  edge: { id: string; type: string },
  highlightedEdgeIds: Set<string>,
  hasSelection: boolean,
): number {
  if (!hasSelection) {
    return 0.35;
  }
  return highlightedEdgeIds.has(edge.id) ? 0.9 : 0.06;
}

export function getEdgeColor(type: "import" | "call" | "contains"): string {
  switch (type) {
    case "import":
      return "var(--gm-edge-import)";
    case "call":
      return "var(--gm-edge-call)";
    case "contains":
      return "var(--gm-edge-contains)";
  }
}
