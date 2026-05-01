import React from "react";

export function DemoPreview(): React.ReactElement {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 900,
        margin: "0 auto",
        padding: "0 24px 40px",
      }}
    >
      <svg
        viewBox="0 0 900 340"
        width="100%"
        height="100%"
        role="img"
        aria-label="Ghostmap preview graph"
        style={{
          display: "block",
          background: "var(--gm-bg-surface)",
          border: "1px solid var(--gm-border)",
          borderRadius: 12,
        }}
      >
        <rect x="20" y="20" width="860" height="300" rx="10" fill="var(--gm-bg-canvas)" />
        <line x1="170" y1="170" x2="340" y2="120" stroke="var(--gm-edge-import)" strokeOpacity="0.7" />
        <line x1="340" y1="120" x2="520" y2="180" stroke="var(--gm-edge-call)" strokeOpacity="0.7" />
        <line x1="520" y1="180" x2="700" y2="130" stroke="var(--gm-edge-import)" strokeOpacity="0.7" />
        <line x1="340" y1="120" x2="340" y2="240" stroke="var(--gm-edge-contains)" strokeOpacity="0.7" />

        <circle cx="170" cy="170" r="16" fill="#4d8ef0" />
        <circle cx="340" cy="120" r="20" fill="#e05c8a" />
        <circle cx="520" cy="180" r="15" fill="#2ec4a0" />
        <circle cx="700" cy="130" r="18" fill="var(--gm-node-selected)" />
        <path d="M 340 226 L 354 240 L 340 254 L 326 240 Z" fill="rgb(189, 146, 181)" />

        <text x="170" y="205" textAnchor="middle" fill="var(--gm-text-secondary)" fontFamily="var(--gm-font-code)" fontSize="11">src/index.ts</text>
        <text x="340" y="88" textAnchor="middle" fill="var(--gm-text-primary)" fontFamily="var(--gm-font-code)" fontSize="11">src/map/shell.tsx</text>
        <text x="520" y="212" textAnchor="middle" fill="var(--gm-text-secondary)" fontFamily="var(--gm-font-code)" fontSize="11">src/hooks/use-graph.ts</text>
        <text x="700" y="98" textAnchor="middle" fill="var(--gm-text-primary)" fontFamily="var(--gm-font-code)" fontSize="11">src/api/jobs/submit.ts</text>
      </svg>
    </div>
  );
}
