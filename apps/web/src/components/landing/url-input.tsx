"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { parseGitHubUrl } from "../../lib/github/validate-url";
import { QueueScreen } from "../queue/queue-screen";

type SubmitPhase =
  | { kind: "idle" }
  | { kind: "validating" }
  | { kind: "submitting" }
  | { kind: "require-email"; reason: string }
  | { kind: "error"; message: string };

const PLACEHOLDER_URLS = [
  "https://github.com/facebook/react",
  "https://github.com/vercel/next.js",
  "https://github.com/supabase/supabase",
];

export function UrlInput(): React.ReactElement {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<SubmitPhase>({ kind: "idle" });
  const pendingUrlRef = useRef("");
  const router = useRouter();

  const placeholder = useMemo(() => {
    const index = Math.floor(Math.random() * PLACEHOLDER_URLS.length);
    return PLACEHOLDER_URLS[index] ?? PLACEHOLDER_URLS[0];
  }, []);

  const isValidUrl = url.trim() === "" ? null : parseGitHubUrl(url) !== null;

  const submit = useCallback(
    async (repoUrl: string, notifyEmail?: string): Promise<void> => {
      setPhase({ kind: "submitting" });
      pendingUrlRef.current = repoUrl;

      try {
        const response = await fetch("/api/jobs/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoUrl,
            features: ["graph"],
            ...(notifyEmail ? { notifyEmail } : {}),
          }),
        });

        const data = (await response.json()) as {
          jobId?: string;
          classification?: string;
          requiresEmail?: boolean;
          reason?: string;
          error?: string;
        };

        if (response.status === 202 && data.requiresEmail) {
          setPhase({ kind: "require-email", reason: data.reason ?? "" });
          return;
        }

        if (!response.ok) {
          setPhase({ kind: "error", message: data.error ?? `Error ${response.status}` });
          return;
        }

        if (!data.jobId) {
          setPhase({ kind: "error", message: "Server returned an invalid response." });
          return;
        }

        router.push(`/map/${data.jobId}`);
      } catch (err) {
        setPhase({ kind: "error", message: "Network error. Please try again." });
        console.error("[url-input] submit error:", err);
      }
    },
    [router],
  );

  const handleSubmit = useCallback((): void => {
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }
    const parsed = parseGitHubUrl(trimmed);
    if (!parsed) {
      setPhase({ kind: "error", message: "Please enter a valid GitHub repository URL." });
      return;
    }
    void submit(trimmed);
  }, [submit, url]);

  const handleEmailSubmit = useCallback(
    (email: string): void => {
      void submit(pendingUrlRef.current, email);
    },
    [submit],
  );

  const isLoading = phase.kind === "validating" || phase.kind === "submitting";

  if (phase.kind === "require-email") {
    return (
      <QueueScreen
        repoUrl={pendingUrlRef.current}
        features={["graph"]}
        reason={phase.reason}
        onSubmit={handleEmailSubmit}
        isSubmitting={false}
      />
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 600 }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          background: "var(--gm-bg-surface)",
          border: `1px solid ${isValidUrl === false ? "var(--gm-decay-high)" : "var(--gm-border)"}`,
          borderRadius: 8,
          padding: 6,
          transition: "border-color var(--gm-transition-fast)",
        }}
      >
        <input
          type="url"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            if (phase.kind === "error") {
              setPhase({ kind: "idle" });
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "10px 12px",
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--gm-text-primary)",
            fontFamily: "var(--gm-font-code)",
            fontSize: "var(--gm-font-size-sm)",
          }}
          aria-label="GitHub repository URL"
          aria-invalid={isValidUrl === false}
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || isValidUrl === false}
          aria-busy={isLoading}
          style={{
            padding: "10px 20px",
            background: isLoading ? "var(--gm-accent-muted)" : "var(--gm-accent)",
            border: "none",
            borderRadius: 6,
            color: "var(--gm-text-primary)",
            fontFamily: "var(--gm-font-ui)",
            fontSize: "var(--gm-font-size-sm)",
            fontWeight: 600,
            cursor: isLoading || isValidUrl === false ? "not-allowed" : "pointer",
            opacity: isLoading || isValidUrl === false ? 0.65 : 1,
            whiteSpace: "nowrap",
            transition: "opacity var(--gm-transition-fast)",
          }}
        >
          {isLoading ? "Submitting…" : "Map it →"}
        </button>
      </div>

      {phase.kind === "error" && (
        <div
          role="alert"
          style={{
            marginTop: 8,
            fontSize: "var(--gm-font-size-xs)",
            color: "var(--gm-decay-high)",
            fontFamily: "var(--gm-font-ui)",
          }}
        >
          {phase.message}
        </div>
      )}
      {isValidUrl === false && phase.kind !== "error" && (
        <div
          style={{
            marginTop: 8,
            fontSize: "var(--gm-font-size-xs)",
            color: "var(--gm-decay-high)",
            fontFamily: "var(--gm-font-ui)",
          }}
        >
          Must be a GitHub URL — e.g. https://github.com/owner/repo
        </div>
      )}
    </div>
  );
}
