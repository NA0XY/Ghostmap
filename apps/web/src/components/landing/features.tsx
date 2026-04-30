import React from "react";

interface Feature {
  icon: string;
  title: string;
  tag: string;
  tagColor: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: "◎",
    title: "The Graph",
    tag: "INSTANT",
    tagColor: "var(--gm-decay-low)",
    description:
      "Parse any repo and render an interactive force-directed graph. Files cluster together. Functions orbit their files. Import chains pull things close.",
  },
  {
    icon: "👤",
    title: "Ownership Layer",
    tag: "MODERATE",
    tagColor: "var(--gm-decay-mid)",
    description:
      "Color every node by who owns it — the developer with the most commits. Contested files get a mixed pattern. Reveals bus factor risk instantly.",
  },
  {
    icon: "🕰",
    title: "Decay Heatmap",
    tag: "MODERATE",
    tagColor: "var(--gm-decay-mid)",
    description:
      "Overlay a heat score based on how stale each file is versus how many files depend on it. Your technical debt time bombs, visualised.",
  },
  {
    icon: "⚠",
    title: "Stranger Danger",
    tag: "MODERATE",
    tagColor: "var(--gm-decay-mid)",
    description:
      "Nodes that are heavily connected, untested, undocumented, and last touched six months ago. They pulse. They glow. They will break everything.",
  },
  {
    icon: "⏱",
    title: "Timeline Slider",
    tag: "HEAVY",
    tagColor: "var(--gm-decay-high)",
    description:
      "Scrub through git history and watch the graph change. See when the architecture started going wrong. D3 animated transitions between snapshots.",
  },
];

export function Features(): React.ReactElement {
  return (
    <section
      style={{
        padding: "60px 24px",
        maxWidth: 1000,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          fontFamily: "var(--gm-font-ui)",
          fontSize: "var(--gm-font-size-lg)",
          color: "var(--gm-text-secondary)",
          fontWeight: 500,
          marginBottom: 40,
          marginTop: 0,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Five layers of intelligence
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            style={{
              padding: "20px 20px 24px",
              background: "var(--gm-bg-surface)",
              border: "1px solid var(--gm-border)",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 24 }}>{feature.icon}</span>
              <span
                style={{
                  fontFamily: "var(--gm-font-code)",
                  fontSize: "var(--gm-font-size-xs)",
                  color: feature.tagColor,
                  letterSpacing: "0.05em",
                }}
              >
                {feature.tag}
              </span>
            </div>

            <div
              style={{
                fontFamily: "var(--gm-font-ui)",
                fontSize: "var(--gm-font-size-base)",
                fontWeight: 600,
                color: "var(--gm-text-primary)",
              }}
            >
              {feature.title}
            </div>

            <div
              style={{
                fontFamily: "var(--gm-font-ui)",
                fontSize: "var(--gm-font-size-sm)",
                color: "var(--gm-text-secondary)",
                lineHeight: 1.6,
              }}
            >
              {feature.description}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
