import type { GraphNode } from "@ghostmap/core";
import type { ActiveLayer } from "../types/ui.js";

export interface NodeStyle {
  baseColor: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  radius: number;
  shape: "circle" | "diamond";
  opacity: number;
  isStrangerDanger: boolean;
  isPulsing: boolean;
}

export const FILE_PALETTE = [
  "#4d8ef0",
  "#e05c8a",
  "#2ec4a0",
  "#f5a623",
  "#a66cf5",
  "#e04f4f",
  "#3ac8e0",
  "#80c94d",
  "#f07840",
  "#e0c23a",
] as const;

export interface NodeColorContext {
  fileIndexById: Map<string, number>;
  parentFileByFunctionId: Map<string, string>;
}

export function fileColor(fileIndex: number): string {
  const paletteLength = FILE_PALETTE.length;
  const normalized = ((Math.trunc(fileIndex) % paletteLength) + paletteLength) % paletteLength;
  return FILE_PALETTE[normalized] ?? FILE_PALETTE[0];
}

export function getNodeStyle(
  node: GraphNode,
  layer: ActiveLayer,
  isSelected: boolean,
  isHighlighted: boolean,
  isSearchMatch: boolean,
  isDimmed: boolean,
  isHovered: boolean,
  colorContext: NodeColorContext,
): NodeStyle {
  const isFile = node.type === "file";
  const baseRadius = isFile
    ? clamp(8 + Math.log((node.metadata.lineCount ?? 50) + 1) * 1.5, 8, 22)
    : clamp(5 + Math.log((node.metadata.lineCount ?? 10) + 1), 5, 12);

  const radius = isSelected ? baseRadius * 1.3 : baseRadius;
  const shape: "circle" | "diamond" = isFile ? "circle" : "diamond";
  const dynamicBaseColor = getDynamicNodeColor(node, colorContext);

  let fill = dynamicBaseColor;
  let stroke: string;
  let strokeWidth = isSelected ? 2.5 : isHighlighted ? 1.5 : 1;

  if (layer === "ownership") {
    fill = node.metadata.ownerColor ?? dynamicBaseColor;
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
    fill = isDanger ? "var(--gm-stranger)" : dynamicBaseColor;
    stroke = isDanger ? "var(--gm-stranger)" : "transparent";
    strokeWidth = isDanger ? 2 : 1;
  } else {
    fill = dynamicBaseColor;
    if (isFile && isHovered) {
      fill = brightenHex(fill, 0.2);
    }
    stroke = isSelected
      ? "var(--gm-node-selected)"
      : "color-mix(in srgb, var(--gm-text-primary) 8%, transparent)";
  }

  if (isSelected) {
    fill = "#ffffff";
    stroke = dynamicBaseColor;
    strokeWidth = 2;
  }

  const opacity = isDimmed ? 0.15 : isSearchMatch ? 1 : isHighlighted ? 0.95 : 1;
  const isStrangerDanger = node.metadata.strangerDanger === true;

  return {
    baseColor: dynamicBaseColor,
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
  return highlightedEdgeIds.has(edge.id) ? 0.9 : 0.08;
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

function getDynamicNodeColor(node: GraphNode, colorContext: NodeColorContext): string {
  if (node.type === "file") {
    const index = colorContext.fileIndexById.get(node.id) ?? 0;
    return fileColor(index);
  }

  const parentFileId = colorContext.parentFileByFunctionId.get(node.id);
  const parentIndex = colorContext.fileIndexById.get(parentFileId ?? "") ?? 0;
  return pastelizeFromFileColor(fileColor(parentIndex));
}

function pastelizeFromFileColor(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return "rgb(170, 170, 170)";
  }
  const r = rgb.r * 0.55 + 210 * 0.45;
  const g = rgb.g * 0.55 + 210 * 0.45;
  const b = rgb.b * 0.55 + 210 * 0.45;
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function brightenHex(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) {
    return hex;
  }
  const mix = clamp(amount, 0, 1);
  const r = Math.round(rgb.r + (255 - rgb.r) * mix);
  const g = Math.round(rgb.g + (255 - rgb.g) * mix);
  const b = Math.round(rgb.b + (255 - rgb.b) * mix);
  return `rgb(${r}, ${g}, ${b})`;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}
