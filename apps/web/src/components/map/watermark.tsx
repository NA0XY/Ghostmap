import Link from "next/link";
import React from "react";

export function Watermark(): React.ReactElement {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 70,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 150,
        background: "var(--gm-bg-overlay)",
        border: "1px solid var(--gm-border)",
        borderRadius: "var(--gm-control-radius)",
        padding: "10px 18px",
        fontFamily: "var(--gm-font-ui)",
        fontSize: "var(--gm-font-size-sm)",
        color: "var(--gm-text-secondary)",
        backdropFilter: "blur(8px)",
        whiteSpace: "nowrap",
        pointerEvents: "auto",
      }}
    >
      <span style={{ color: "var(--gm-accent)" }}>◎</span> ghostmap.dev ·{" "}
      <Link
        href="/login"
        style={{
          color: "var(--gm-accent-hover)",
          fontWeight: 600,
        }}
      >
        Sign in
      </Link>{" "}
      to unlock Ownership, Decay &amp; Stranger Danger layers
    </div>
  );
}
