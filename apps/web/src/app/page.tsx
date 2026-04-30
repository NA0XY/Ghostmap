import type { Metadata } from "next";
import React from "react";
import { Features } from "../components/landing/features";
import { UrlInput } from "../components/landing/url-input";
import { Footer } from "../components/layout/footer";

export const metadata: Metadata = {
  title: "Ghostmap — Codebase Intelligence. Visualized.",
};

export default function LandingPage(): React.ReactElement {
  return (
    <div style={{ minHeight: "calc(100vh - 52px)", display: "flex", flexDirection: "column" }}>
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "100px 24px 80px",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            background: "var(--gm-accent-muted)",
            border: "1px solid var(--gm-accent)",
            borderRadius: 20,
            fontFamily: "var(--gm-font-code)",
            fontSize: "var(--gm-font-size-xs)",
            color: "var(--gm-accent-hover)",
            letterSpacing: "0.04em",
          }}
        >
          <span>◎</span> Codebase Intelligence
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(36px, 6vw, 64px)",
            fontWeight: 700,
            fontFamily: "var(--gm-font-ui)",
            color: "var(--gm-text-primary)",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            maxWidth: 700,
          }}
        >
          Your codebase, <span style={{ color: "var(--gm-accent)" }}>mapped</span>.
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "var(--gm-text-secondary)",
            fontFamily: "var(--gm-font-ui)",
            lineHeight: 1.6,
            maxWidth: 520,
          }}
        >
          Paste a GitHub URL. Get an interactive force-directed graph showing who owns what,
          what&rsquo;s rotting, and where the hidden bombs are.
        </p>

        <UrlInput />

        <div
          style={{
            fontSize: "var(--gm-font-size-xs)",
            color: "var(--gm-text-muted)",
            fontFamily: "var(--gm-font-ui)",
          }}
        >
          No install required · Public repos are free · Results ready in seconds
        </div>
      </section>

      <Features />
      <div style={{ flex: 1 }} />
      <Footer />
    </div>
  );
}
