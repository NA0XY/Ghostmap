import React, { useCallback, useEffect, useMemo } from "react";
import type { GraphEdge, GraphNode } from "@ghostmap/core";
import type { GraphCanvasProps, SimulationNode } from "../types/ui.js";
import { useD3Simulation } from "../hooks/useD3Simulation.js";
import { useGraphSelection } from "../hooks/useGraphSelection.js";
import { useZoom } from "../hooks/useZoom.js";
import { getEdgeColor, getEdgeOpacity, getNodeStyle } from "../utils/node-style.js";
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
          <path
            d="M 0 0 L 6 3 L 0 6 Z"
            fill="var(--gm-edge-active)"
            opacity={0.6}
          />
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
                strokeWidth={isHighlighted ? 1.5 : 0.75}
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
