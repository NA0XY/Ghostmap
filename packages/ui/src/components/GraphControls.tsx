import React from "react";

interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onReset: () => void;
  onReheat: () => void;
  isStabilized: boolean;
  nodeCount: number;
  edgeCount: number;
}

export function GraphControls({
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onReset,
  onReheat,
  isStabilized,
  nodeCount,
  edgeCount,
}: GraphControlsProps): React.ReactElement {
  const btnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    background: "var(--gm-control-bg)",
    border: "1px solid var(--gm-border)",
    borderRadius: "var(--gm-control-radius)",
    color: "var(--gm-text-secondary)",
    cursor: "pointer",
    fontSize: 14,
    transition: "background var(--gm-transition-fast), color var(--gm-transition-fast)",
  };

  const hoverStyle: React.CSSProperties = {
    background: "var(--gm-control-hover)",
    color: "var(--gm-text-primary)",
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        zIndex: 100,
      }}
    >
      <div
        style={{
          fontFamily: "var(--gm-font-code)",
          fontSize: "var(--gm-font-size-xs)",
          color: "var(--gm-text-muted)",
          textAlign: "right",
          marginBottom: 4,
        }}
      >
        {nodeCount} nodes · {edgeCount} edges
        {!isStabilized && <span style={{ color: "var(--gm-accent)", marginLeft: 6 }}>●</span>}
      </div>

      {[
        { icon: "+", label: "Zoom in", onClick: onZoomIn },
        { icon: "−", label: "Zoom out", onClick: onZoomOut },
        { icon: "⊡", label: "Fit to screen", onClick: onFitToScreen },
        { icon: "↺", label: "Reset view", onClick: onReset },
        { icon: "⚡", label: "Reheat simulation", onClick: onReheat },
      ].map(({ icon, label, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          title={label}
          aria-label={label}
          style={btnStyle}
          onMouseEnter={(event) => {
            Object.assign(event.currentTarget.style, hoverStyle);
          }}
          onMouseLeave={(event) => {
            Object.assign(event.currentTarget.style, {
              background: "var(--gm-control-bg)",
              color: "var(--gm-text-secondary)",
            });
          }}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
