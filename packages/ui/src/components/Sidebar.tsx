import React from "react";
import type { SidebarProps } from "../types/ui.js";

export function Sidebar({
  selectedNode,
  activeLayer: _activeLayer,
  graphData,
  onClose,
}: SidebarProps): React.ReactElement {
  const containerStyle: React.CSSProperties = {
    width: 280,
    height: "100%",
    background: "var(--gm-bg-surface)",
    borderLeft: "1px solid var(--gm-border)",
    fontFamily: "var(--gm-font-ui)",
    color: "var(--gm-text-primary)",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  };

  if (!selectedNode) {
    return (
      <aside style={{ ...containerStyle, alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            color: "var(--gm-text-muted)",
            textAlign: "center",
            padding: 24,
            fontSize: "var(--gm-font-size-sm)",
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8, color: "var(--gm-text-secondary)" }}>Select</div>
          Click a node to inspect it
        </div>
      </aside>
    );
  }

  const connectedEdges = graphData.edges.filter(
    (edge) => edge.source === selectedNode.id || edge.target === selectedNode.id,
  );
  const inEdges = connectedEdges.filter((edge) => edge.target === selectedNode.id);
  const outEdges = connectedEdges.filter((edge) => edge.source === selectedNode.id);

  return (
    <aside style={containerStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid var(--gm-border)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--gm-font-code)",
              fontSize: "var(--gm-font-size-base)",
              fontWeight: 600,
              wordBreak: "break-all",
              marginBottom: 2,
            }}
          >
            {selectedNode.label}
          </div>
          <div style={{ fontSize: "var(--gm-font-size-xs)", color: "var(--gm-text-secondary)" }}>
            {selectedNode.type === "file" ? "File" : "Function"} · {selectedNode.language ?? "unknown"}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close sidebar"
          style={{
            background: "none",
            border: "none",
            color: "var(--gm-text-muted)",
            cursor: "pointer",
            fontSize: 16,
            padding: "0 0 0 8px",
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: "14px 16px", flex: 1 }}>
        <SidebarSection label="Path">
          <code
            style={{
              fontSize: "var(--gm-font-size-xs)",
              color: "var(--gm-text-code)",
              wordBreak: "break-all",
              display: "block",
            }}
          >
            {selectedNode.relativePath}
          </code>
        </SidebarSection>

        <SidebarSection label="Metadata">
          <MetaRow label="Lines" value={selectedNode.metadata.lineCount?.toLocaleString()} />
          <MetaRow
            label="Size"
            value={
              selectedNode.metadata.sizeBytes
                ? formatBytes(selectedNode.metadata.sizeBytes)
                : undefined
            }
          />
          <MetaRow
            label="Exported"
            value={
              selectedNode.metadata.isExported !== undefined
                ? selectedNode.metadata.isExported
                  ? "Yes"
                  : "No"
                : undefined
            }
          />
          <MetaRow
            label="Async"
            value={
              selectedNode.metadata.isAsync !== undefined
                ? selectedNode.metadata.isAsync
                  ? "Yes"
                  : "No"
                : undefined
            }
          />
          <MetaRow
            label="Has docs"
            value={
              selectedNode.metadata.hasDocstring !== undefined
                ? selectedNode.metadata.hasDocstring
                  ? "Yes"
                  : "No"
                : undefined
            }
          />
        </SidebarSection>

        {selectedNode.metadata.ownerName && (
          <SidebarSection label="Ownership">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {selectedNode.metadata.ownerColor && (
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: selectedNode.metadata.ownerColor,
                    flexShrink: 0,
                  }}
                />
              )}
              <span style={{ fontSize: "var(--gm-font-size-sm)" }}>{selectedNode.metadata.ownerName}</span>
            </div>
          </SidebarSection>
        )}

        {selectedNode.metadata.decayScore !== undefined && (
          <SidebarSection label="Decay Score">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  height: 4,
                  background: "var(--gm-bg-surface-2)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${selectedNode.metadata.decayScore * 100}%`,
                    height: "100%",
                    background:
                      selectedNode.metadata.decayScore > 0.66
                        ? "var(--gm-decay-high)"
                        : selectedNode.metadata.decayScore > 0.33
                          ? "var(--gm-decay-mid)"
                          : "var(--gm-decay-low)",
                    borderRadius: 2,
                    transition: "width 300ms ease",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "var(--gm-font-size-xs)",
                  color: "var(--gm-text-secondary)",
                  flexShrink: 0,
                }}
              >
                {(selectedNode.metadata.decayScore * 100).toFixed(0)}%
              </span>
            </div>
          </SidebarSection>
        )}

        {selectedNode.metadata.strangerDanger && (
          <SidebarSection label="">
            <div
              style={{
                background: "color-mix(in srgb, var(--gm-stranger) 8%, transparent)",
                border: "1px solid var(--gm-stranger)",
                borderRadius: 4,
                padding: "8px 10px",
                color: "var(--gm-stranger)",
                fontSize: "var(--gm-font-size-xs)",
                fontWeight: 600,
              }}
            >
              Stranger Danger — highly connected, stale, or under-documented node.
            </div>
          </SidebarSection>
        )}

        <SidebarSection label={`Connections (${connectedEdges.length})`}>
          <MetaRow label="Imports from" value={String(inEdges.filter((edge) => edge.type === "import").length)} />
          <MetaRow label="Imported by" value={String(outEdges.filter((edge) => edge.type === "import").length)} />
          <MetaRow label="Calls" value={String(outEdges.filter((edge) => edge.type === "call").length)} />
          <MetaRow label="Called by" value={String(inEdges.filter((edge) => edge.type === "call").length)} />
        </SidebarSection>
      </div>
    </aside>
  );
}

function SidebarSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div style={{ marginBottom: 20 }}>
      {label && (
        <div
          style={{
            fontSize: "var(--gm-font-size-xs)",
            color: "var(--gm-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 6,
            fontWeight: 600,
          }}
        >
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}): React.ReactElement | null {
  if (value === undefined || value === null) {
    return null;
  }
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
      }}
    >
      <span style={{ fontSize: "var(--gm-font-size-xs)", color: "var(--gm-text-secondary)" }}>
        {label}
      </span>
      <span
        style={{
          fontSize: "var(--gm-font-size-xs)",
          color: "var(--gm-text-primary)",
          fontFamily: "var(--gm-font-code)",
        }}
      >
        {value}
      </span>
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
