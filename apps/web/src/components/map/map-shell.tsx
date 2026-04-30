"use client";

import type { GraphData, GraphEdge, GraphNode } from "@ghostmap/core";
import {
  FeatureToggles,
  GraphCanvas,
  GraphControls,
  NodeTooltip,
  SearchBar,
  Sidebar,
  searchNodes,
  type ActiveLayer,
  type TooltipState,
} from "@ghostmap/ui";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Watermark } from "./watermark";

interface MapShellProps {
  graphData: GraphData;
  jobId: string;
  isAnonymous: boolean;
  expiresAt: string | null;
}

export function MapShell({
  graphData,
  jobId: _jobId,
  isAnonymous,
  expiresAt,
}: MapShellProps): React.ReactElement {
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>("graph");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [_selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [tooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    node: null,
  });
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const [canvasKey, setCanvasKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = (): void => {
      if (!containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => {
      observer.disconnect();
    };
  }, []);

  const searchMatches = useMemo(
    () => searchNodes(graphData.nodes, searchQuery),
    [graphData.nodes, searchQuery],
  );
  const resultCount = searchQuery.trim() ? (searchMatches?.size ?? 0) : null;

  const availableLayers: ActiveLayer[] = isAnonymous
    ? ["graph"]
    : ["graph", "ownership", "decay", "stranger-danger"];

  const handleNodeSelect = useCallback((node: GraphNode | null): void => {
    setSelectedNode(node);
  }, []);

  const handleEdgeSelect = useCallback((edge: GraphEdge | null): void => {
    setSelectedEdge(edge);
  }, []);

  const handleCloseSidebar = useCallback((): void => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const expiryLabel = expiresAt
    ? `Expires ${new Date(expiresAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 52px)",
        background: "var(--gm-bg-canvas)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 12px",
          height: 48,
          background: "var(--gm-bg-surface)",
          borderBottom: "1px solid var(--gm-border)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--gm-font-code)",
            fontSize: "var(--gm-font-size-sm)",
            color: "var(--gm-text-secondary)",
            marginRight: 4,
            flexShrink: 0,
          }}
        >
          {graphData.repoPath.split("/").slice(-2).join("/")}
        </span>

        <FeatureToggles
          activeLayer={activeLayer}
          onChange={setActiveLayer}
          availableLayers={availableLayers}
        />

        <div style={{ flex: 1 }} />

        <SearchBar value={searchQuery} onChange={setSearchQuery} resultCount={resultCount} />

        <button
          onClick={() => {
            void navigator.clipboard.writeText(window.location.href);
          }}
          title={expiryLabel ?? "Copy link"}
          aria-label="Copy link to this map"
          style={{
            padding: "5px 10px",
            background: "var(--gm-control-bg)",
            border: "1px solid var(--gm-border)",
            borderRadius: "var(--gm-control-radius)",
            color: "var(--gm-text-secondary)",
            fontFamily: "var(--gm-font-ui)",
            fontSize: "var(--gm-font-size-xs)",
            cursor: "pointer",
            flexShrink: 0,
            transition: "background var(--gm-transition-fast)",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = "var(--gm-control-hover)";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = "var(--gm-control-bg)";
          }}
        >
          ⎘ Share
        </button>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <GraphCanvas
            key={canvasKey}
            data={graphData}
            activeLayer={activeLayer}
            searchQuery={searchQuery}
            width={dimensions.width}
            height={dimensions.height}
            onNodeSelect={handleNodeSelect}
            onEdgeSelect={handleEdgeSelect}
          />

          <GraphControls
            onZoomIn={() => undefined}
            onZoomOut={() => undefined}
            onFitToScreen={() => undefined}
            onReset={() => undefined}
            onReheat={() => {
              setCanvasKey((prev) => prev + 1);
            }}
            isStabilized={true}
            nodeCount={graphData.stats.totalFiles + graphData.stats.totalFunctions}
            edgeCount={graphData.stats.totalEdges}
          />

          {isAnonymous && <Watermark />}
        </div>

        {selectedNode && (
          <Sidebar
            selectedNode={selectedNode}
            activeLayer={activeLayer}
            graphData={graphData}
            onClose={handleCloseSidebar}
          />
        )}
      </div>

      <NodeTooltip tooltip={tooltip} />
    </div>
  );
}
