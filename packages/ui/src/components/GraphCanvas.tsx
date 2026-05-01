import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { GraphEdge, GraphNode } from "@ghostmap/core";
import type { GraphCanvasProps, SimulationNode } from "../types/ui.js";
import { useD3Simulation } from "../hooks/useD3Simulation.js";
import { useGraphSelection } from "../hooks/useGraphSelection.js";
import { useZoom } from "../hooks/useZoom.js";
import { buildClusterMembranePath, hexAlpha } from "../utils/graphMembraneUtils.js";
import { fileColor, getEdgeColor, getEdgeOpacity, getNodeStyle } from "../utils/node-style.js";
import { searchNodes } from "../utils/search.js";

function diamondPath(cx: number, cy: number, r: number): string {
  return `M ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} L ${cx - r} ${cy} Z`;
}

function hasCoords(node: SimulationNode): node is SimulationNode & { x: number; y: number } {
  return typeof node.x === "number" && typeof node.y === "number";
}

function lineFromLink(
  source: SimulationNode | string,
  target: SimulationNode | string,
): { source: SimulationNode; target: SimulationNode } | null {
  if (typeof source === "string" || typeof target === "string") {
    return null;
  }
  if (!hasCoords(source) || !hasCoords(target)) {
    return null;
  }
  return { source, target };
}

export function GraphCanvas({
  data,
  activeLayer,
  searchQuery,
  width = 900,
  height = 600,
  onNodeSelect,
  onEdgeSelect,
  className = "",
}: GraphCanvasProps): React.ReactElement {
  const { simulationNodes, simulationLinks, isStabilized, reheat } = useD3Simulation(data, width, height);
  const { svgRef, containerRef, fitToScreen } = useZoom(width, height);
  const { selection, selectEdge, selectNode, clearSelection } = useGraphSelection();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (isStabilized && data.nodes.length > 0) {
      fitToScreen(data.nodes.length);
    }
  }, [data.nodes.length, fitToScreen, isStabilized]);

  const searchMatches = useMemo(() => searchNodes(data.nodes, searchQuery), [data.nodes, searchQuery]);
  const hasSelection = selection.selectedNodeId !== null || selection.selectedEdgeId !== null;
  const hasSearch = searchMatches !== null;

  const nodeMap = useMemo(() => new Map(data.nodes.map((node) => [node.id, node])), [data.nodes]);
  const edgeMap = useMemo(() => new Map(data.edges.map((edge) => [edge.id, edge])), [data.edges]);
  const fileIndexById = useMemo(() => {
    const map = new Map<string, number>();
    let fileIndex = 0;
    for (const node of data.nodes) {
      if (node.type === "file") {
        map.set(node.id, fileIndex);
        fileIndex += 1;
      }
    }
    return map;
  }, [data.nodes]);
  const parentFileByFunctionId = useMemo(() => {
    const map = new Map<string, string>();
    for (const edge of data.edges) {
      if (edge.type === "contains") {
        map.set(edge.target, edge.source);
      }
    }
    return map;
  }, [data.edges]);
  const fileChildrenById = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const node of data.nodes) {
      if (node.type === "file") {
        map.set(node.id, []);
      }
    }
    for (const edge of data.edges) {
      if (edge.type !== "contains") {
        continue;
      }
      const children = map.get(edge.source);
      if (children) {
        children.push(edge.target);
      }
    }
    return map;
  }, [data.edges, data.nodes]);
  const nodeColorContext = useMemo(
    () => ({ fileIndexById, parentFileByFunctionId }),
    [fileIndexById, parentFileByFunctionId],
  );
  const simulationNodeById = useMemo(() => {
    const map = new Map<string, SimulationNode>();
    for (const node of simulationNodes) {
      map.set(node.id, node);
    }
    return map;
  }, [simulationNodes]);
  const membranes = useMemo(() => {
    interface ClusterDraft {
      fileId: string;
      clusterNodeIds: string[];
      points: Array<{ x: number; y: number }>;
      center: { x: number; y: number };
      envelopeRadius: number;
      paddingScale: number;
      hidden: boolean;
    }

    const layers: Array<{ key: string; path: string; fill: string; stroke: string }> = [];
    const drafts: ClusterDraft[] = [];

    for (const [fileId, functionIds] of fileChildrenById) {
      if (functionIds.length === 0) {
        continue;
      }

      const clusterNodeIds = [fileId, ...functionIds];
      const points = clusterNodeIds
        .map((nodeId) => simulationNodeById.get(nodeId))
        .filter((node): node is SimulationNode & { x: number; y: number } => Boolean(node && hasCoords(node)))
        .map((node) => ({ x: node.x, y: node.y }));

      if (points.length === 0) {
        continue;
      }

      const center = points.reduce(
        (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
        { x: 0, y: 0 },
      );
      center.x /= points.length;
      center.y /= points.length;

      const maxPointDistance = points.reduce((max, point) => {
        const d = Math.hypot(point.x - center.x, point.y - center.y);
        return Math.max(max, d);
      }, 0);

      let envelopeRadius = maxPointDistance + 44;
      if (points.length === 1) {
        envelopeRadius = 48;
      } else if (points.length === 2) {
        const [a, b] = points;
        if (a && b) {
          envelopeRadius = Math.hypot(a.x - b.x, a.y - b.y) / 2 + 40;
        }
      }

      drafts.push({
        fileId,
        clusterNodeIds,
        points,
        center,
        envelopeRadius,
        paddingScale: 1,
        hidden: false,
      });
    }

    const minScale = 0.45;
    const gap = 8;

    for (let pass = 0; pass < 8; pass += 1) {
      for (let i = 0; i < drafts.length; i += 1) {
        for (let j = i + 1; j < drafts.length; j += 1) {
          const a = drafts[i];
          const b = drafts[j];
          if (!a || !b || a.hidden || b.hidden) {
            continue;
          }

          const distance = Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y);
          if (distance <= 0.001) {
            continue;
          }

          const rA = a.envelopeRadius * a.paddingScale;
          const rB = b.envelopeRadius * b.paddingScale;
          const maxAllowed = distance - gap;
          if (rA + rB <= maxAllowed) {
            continue;
          }

          const overflow = rA + rB - maxAllowed;
          const total = rA + rB;
          if (total <= 0.001) {
            continue;
          }

          const reduceA = (overflow * rA) / total;
          const reduceB = overflow - reduceA;

          const newRA = Math.max(a.envelopeRadius * minScale, rA - reduceA);
          const newRB = Math.max(b.envelopeRadius * minScale, rB - reduceB);
          a.paddingScale = newRA / a.envelopeRadius;
          b.paddingScale = newRB / b.envelopeRadius;
        }
      }
    }

    for (let i = 0; i < drafts.length; i += 1) {
      for (let j = i + 1; j < drafts.length; j += 1) {
        const a = drafts[i];
        const b = drafts[j];
        if (!a || !b || a.hidden || b.hidden) {
          continue;
        }

        const distance = Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y);
        const rA = a.envelopeRadius * a.paddingScale;
        const rB = b.envelopeRadius * b.paddingScale;
        if (distance + 1 >= rA + rB + gap) {
          continue;
        }

        if (a.envelopeRadius <= b.envelopeRadius) {
          a.hidden = true;
        } else {
          b.hidden = true;
        }
      }
    }

    for (const draft of drafts) {
      if (draft.hidden) {
        continue;
      }

      const path = buildClusterMembranePath(draft.points, { paddingScale: draft.paddingScale });
      if (!path) {
        continue;
      }

      const paletteIndex = fileIndexById.get(draft.fileId) ?? 0;
      const color = fileColor(paletteIndex);
      const clusterHasFocus = draft.clusterNodeIds.some(
        (nodeId) => nodeId === selection.selectedNodeId || nodeId === hoveredNodeId,
      );
      const clusterIsSelectionRelated = draft.clusterNodeIds.some(
        (nodeId) => nodeId === selection.selectedNodeId || selection.highlightedNodeIds.has(nodeId),
      );

      let fillAlpha = 0.07;
      let strokeAlpha = 0.3;
      if (hasSelection && !clusterIsSelectionRelated) {
        fillAlpha = 0.03;
        strokeAlpha = 0.1;
      }
      if (clusterHasFocus) {
        fillAlpha = 0.13;
        strokeAlpha = 0.55;
      }

      layers.push({
        key: `membrane-${draft.fileId}`,
        path,
        fill: hexAlpha(color, fillAlpha),
        stroke: hexAlpha(color, strokeAlpha),
      });
    }
    return layers;
  }, [
    fileChildrenById,
    fileIndexById,
    hasSelection,
    hoveredNodeId,
    selection.highlightedNodeIds,
    selection.selectedNodeId,
    simulationNodeById,
  ]);

  useEffect(() => {
    reheat();
  }, [activeLayer, reheat]);

  const handleNodeClick = useCallback(
    (nodeId: string, event: React.MouseEvent): void => {
      event.stopPropagation();
      const node = nodeMap.get(nodeId);
      if (!node) {
        return;
      }
      if (selection.selectedNodeId === nodeId) {
        clearSelection();
        onNodeSelect?.(null);
        return;
      }
      selectNode(node, data);
      onNodeSelect?.(node);
    },
    [clearSelection, data, nodeMap, onNodeSelect, selectNode, selection.selectedNodeId],
  );

  const handleEdgeClick = useCallback(
    (edgeId: string, event: React.MouseEvent): void => {
      event.stopPropagation();
      const edge = edgeMap.get(edgeId);
      if (!edge) {
        return;
      }
      selectEdge(edge);
      onEdgeSelect?.(edge);
    },
    [edgeMap, onEdgeSelect, selectEdge],
  );

  const handleCanvasClick = useCallback((): void => {
    clearSelection();
    onNodeSelect?.(null);
    onEdgeSelect?.(null);
  }, [clearSelection, onEdgeSelect, onNodeSelect]);

  if (data.nodes.length === 0) {
    return (
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className={className}
        style={{ background: "var(--gm-bg-canvas)" }}
      >
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          fill="var(--gm-text-muted)"
          fontFamily="var(--gm-font-ui)"
          fontSize="14"
        >
          No graph data
        </text>
      </svg>
    );
  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className={className}
      style={{ background: "var(--gm-bg-canvas)", cursor: "grab", display: "block" }}
      onClick={handleCanvasClick}
      aria-label="Codebase dependency graph"
      role="img"
    >
      <defs>
        <marker id="gm-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M 0 0 L 6 3 L 0 6 Z" fill="var(--gm-edge-active)" opacity={0.85} />
        </marker>
        <filter id="gm-danger-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g ref={containerRef}>
        <g className="gm-membranes">
          {membranes.map((membrane) => (
            <path
              key={membrane.key}
              d={membrane.path}
              fill={membrane.fill}
              stroke={membrane.stroke}
              strokeWidth="var(--gm-membrane-stroke-width)"
              strokeDasharray="none"
              style={{
                pointerEvents: "none",
                transition: "fill var(--gm-transition-base), stroke var(--gm-transition-base)",
              }}
            />
          ))}
        </g>

        <g className="gm-edges">
          {simulationLinks.map((link) => {
            const line = lineFromLink(link.source, link.target);
            if (!line || link.type === "contains") {
              return null;
            }

            const opacity = getEdgeOpacity(
              { id: link.id, type: link.type },
              selection.highlightedEdgeIds,
              hasSelection,
            );
            const isHighlighted = selection.highlightedEdgeIds.has(link.id);
            const color = isHighlighted ? "var(--gm-edge-active)" : getEdgeColor(link.type);

            return (
              <line
                key={link.id}
                x1={line.source.x}
                y1={line.source.y}
                x2={line.target.x}
                y2={line.target.y}
                stroke={color}
                strokeWidth={isHighlighted ? 2.2 : 1.2}
                strokeOpacity={opacity}
                markerEnd={link.type === "import" ? "url(#gm-arrow)" : undefined}
                style={{ cursor: "pointer", transition: "stroke-opacity var(--gm-transition-fast)" }}
                onClick={(event) => {
                  handleEdgeClick(link.id, event);
                }}
              />
            );
          })}
        </g>

        <g className="gm-nodes">
          {simulationNodes.map((node) => {
            if (!hasCoords(node)) {
              return null;
            }

            const isSelected = selection.selectedNodeId === node.id;
            const isHighlighted = selection.highlightedNodeIds.has(node.id);
            const isSearchMatch = searchMatches === null || searchMatches.has(node.id);
            const isDimmed =
              (hasSelection && !isHighlighted && !isSelected) || (hasSearch && !isSearchMatch);

            const style = getNodeStyle(
              node,
              activeLayer,
              isSelected,
              isHighlighted,
              isSearchMatch,
              isDimmed,
              hoveredNodeId === node.id,
              nodeColorContext,
            );

            const sharedProps = {
              key: node.id,
              fill: style.fill,
              stroke: style.stroke,
              strokeWidth: style.strokeWidth,
              opacity: style.opacity,
              style: {
                cursor: "pointer",
                transition: "opacity var(--gm-transition-fast), fill var(--gm-transition-base)",
                animation: style.isPulsing ? "gm-pulse-danger 2s ease-in-out infinite" : undefined,
                filter: style.isPulsing ? "url(#gm-danger-glow)" : undefined,
              } as React.CSSProperties,
              onClick: (event: React.MouseEvent) => {
                handleNodeClick(node.id, event);
              },
              onMouseEnter: () => {
                setHoveredNodeId(node.id);
              },
              onMouseLeave: () => {
                setHoveredNodeId((current) => (current === node.id ? null : current));
              },
              role: "button" as const,
              "aria-label": `${node.type}: ${node.label}`,
              "aria-pressed": isSelected,
            };

            if (style.shape === "diamond") {
              return <path {...sharedProps} d={diamondPath(node.x, node.y, style.radius)} />;
            }

            return <circle {...sharedProps} cx={node.x} cy={node.y} r={style.radius} />;
          })}
        </g>

        <g className="gm-labels" style={{ pointerEvents: "none" }}>
          {simulationNodes.map((node) => {
            if (!hasCoords(node)) {
              return null;
            }
            const isSelected = selection.selectedNodeId === node.id;
            const isHighlighted = selection.highlightedNodeIds.has(node.id);
            if (!isSelected && !isHighlighted && data.nodes.length > 100) {
              return null;
            }

            return (
              <text
                key={`label-${node.id}`}
                x={node.x}
                y={node.y + (node.type === "file" ? 20 : 16)}
                textAnchor="middle"
                fontSize={node.type === "file" ? 10 : 8}
                fontFamily="var(--gm-font-code)"
                fill={isSelected ? "var(--gm-text-primary)" : "var(--gm-text-secondary)"}
                opacity={isSelected ? 1 : 0.7}
              >
                {node.label.length > 20 ? `${node.label.slice(0, 18)}...` : node.label}
              </text>
            );
          })}
        </g>
      </g>
    </svg>
  );
}

export type { GraphNode, GraphEdge };
