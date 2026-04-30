import React from "react";
import type { TooltipState } from "../types/ui.js";

interface NodeTooltipProps {
  tooltip: TooltipState;
}

export function NodeTooltip({ tooltip }: NodeTooltipProps): React.ReactElement | null {
  if (!tooltip.visible || !tooltip.node) {
    return null;
  }

  const { node, x, y } = tooltip;
  const meta = node.metadata;
  const offsetX = 14;
  const offsetY = -10;

  return (
    <div
      style={{
        position: "fixed",
        left: x + offsetX,
        top: y + offsetY,
        pointerEvents: "none",
        zIndex: 9999,
        background: "var(--gm-bg-overlay)",
        border: "1px solid var(--gm-border)",
        borderRadius: "var(--gm-control-radius)",
        padding: "8px 12px",
        maxWidth: 280,
        fontFamily: "var(--gm-font-ui)",
        fontSize: "var(--gm-font-size-sm)",
        color: "var(--gm-text-primary)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 4px 20px color-mix(in srgb, var(--gm-bg-canvas) 80%, transparent)",
      }}
      role="tooltip"
    >
      <div
        style={{
          fontFamily: "var(--gm-font-code)",
          fontWeight: 600,
          marginBottom: 4,
          wordBreak: "break-all",
        }}
      >
        {node.label}
      </div>
      <div style={{ color: "var(--gm-text-secondary)", marginBottom: 2 }}>
        {node.type === "file" ? "File" : "Function"} · {node.language ?? "unknown"}
      </div>
      <div
        style={{
          color: "var(--gm-text-muted)",
          fontSize: "var(--gm-font-size-xs)",
          wordBreak: "break-all",
        }}
      >
        {node.relativePath}
      </div>
      {meta.lineCount !== undefined && (
        <div
          style={{
            marginTop: 4,
            color: "var(--gm-text-secondary)",
            fontSize: "var(--gm-font-size-xs)",
          }}
        >
          {meta.lineCount} lines
          {meta.sizeBytes !== undefined && ` · ${formatBytes(meta.sizeBytes)}`}
        </div>
      )}
      {meta.ownerName && (
        <div
          style={{
            marginTop: 4,
            color: "var(--gm-text-secondary)",
            fontSize: "var(--gm-font-size-xs)",
          }}
        >
          Owner: {meta.ownerName}
        </div>
      )}
      {meta.decayScore !== undefined && (
        <div
          style={{
            marginTop: 4,
            fontSize: "var(--gm-font-size-xs)",
            color: decayLabel(meta.decayScore).color,
          }}
        >
          Decay: {decayLabel(meta.decayScore).text}
        </div>
      )}
      {meta.strangerDanger && (
        <div
          style={{
            marginTop: 4,
            color: "var(--gm-stranger)",
            fontWeight: 600,
            fontSize: "var(--gm-font-size-xs)",
          }}
        >
          Stranger Danger
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function decayLabel(score: number): { text: string; color: string } {
  if (score < 0.33) {
    return { text: "Healthy", color: "var(--gm-decay-low)" };
  }
  if (score < 0.66) {
    return { text: "Moderate", color: "var(--gm-decay-mid)" };
  }
  return { text: "High Risk", color: "var(--gm-decay-high)" };
}
