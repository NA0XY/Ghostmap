import React from "react";

export function Footer(): React.ReactElement {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--gm-border)",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "var(--gm-font-ui)",
        fontSize: "var(--gm-font-size-xs)",
        color: "var(--gm-text-muted)",
      }}
    >
      <span>
        <span style={{ color: "var(--gm-accent)" }}>◎</span> ghostmap.dev
      </span>
      <span>Results expire after 48 hours.</span>
    </footer>
  );
}
