import React from "react";
import type { ActiveLayer, FeatureTogglesProps } from "../types/ui.js";

const LAYERS: { id: ActiveLayer; label: string; icon: string; description: string }[] = [
  {
    id: "graph",
    label: "Graph",
    icon: "◎",
    description: "File + function dependency graph",
  },
  {
    id: "ownership",
    label: "Ownership",
    icon: "👤",
    description: "Who owns each file (requires git analysis)",
  },
  {
    id: "decay",
    label: "Decay",
    icon: "🕰",
    description: "Stale + heavily-depended-on files",
  },
  {
    id: "stranger-danger",
    label: "Stranger Danger",
    icon: "⚠",
    description: "High-risk untested undocumented nodes",
  },
];

export function FeatureToggles({
  activeLayer,
  onChange,
  availableLayers = ["graph"],
}: FeatureTogglesProps): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        padding: "8px 12px",
        background: "var(--gm-bg-surface)",
        borderBottom: "1px solid var(--gm-border)",
        fontFamily: "var(--gm-font-ui)",
      }}
    >
      {LAYERS.map((layer) => {
        const isActive = activeLayer === layer.id;
        const isAvailable = availableLayers.includes(layer.id);

        return (
          <button
            key={layer.id}
            onClick={() => {
              if (isAvailable) {
                onChange(layer.id);
              }
            }}
            title={layer.description}
            aria-label={`${layer.label} layer${!isAvailable ? " (not available)" : ""}`}
            aria-pressed={isActive}
            disabled={!isAvailable}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 10px",
              border: `1px solid ${isActive ? "var(--gm-accent)" : "var(--gm-border)"}`,
              borderRadius: "var(--gm-control-radius)",
              background: isActive ? "var(--gm-accent-muted)" : "var(--gm-control-bg)",
              color: isActive
                ? "var(--gm-accent-hover)"
                : isAvailable
                  ? "var(--gm-text-secondary)"
                  : "var(--gm-text-muted)",
              cursor: isAvailable ? "pointer" : "not-allowed",
              fontSize: "var(--gm-font-size-sm)",
              fontFamily: "var(--gm-font-ui)",
              opacity: isAvailable ? 1 : 0.45,
              transition: "all var(--gm-transition-fast)",
            }}
          >
            <span style={{ fontSize: 12 }}>{layer.icon}</span>
            <span>{layer.label}</span>
          </button>
        );
      })}
    </div>
  );
}
