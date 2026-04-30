"use client";

import React, { useCallback, useState } from "react";

interface QueueScreenProps {
  repoUrl: string;
  features: string[];
  reason: string;
  onSubmit: (notifyEmail: string) => void;
  isSubmitting: boolean;
}

export function QueueScreen({
  repoUrl: _repoUrl,
  features: _features,
  reason,
  onSubmit,
  isSubmitting,
}: QueueScreenProps): React.ReactElement {
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = useCallback((): void => {
    const trimmed = email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmed)) {
      setValidationError("Please enter a valid email address.");
      return;
    }
    setValidationError(null);
    onSubmit(trimmed);
  }, [email, onSubmit]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
        padding: "60px 24px",
        maxWidth: 480,
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 40 }}>📬</div>

      <div>
        <div
          style={{
            fontFamily: "var(--gm-font-ui)",
            fontSize: "var(--gm-font-size-lg)",
            fontWeight: 600,
            color: "var(--gm-text-primary)",
            marginBottom: 8,
          }}
        >
          This one will take a while
        </div>
        <div
          style={{
            fontFamily: "var(--gm-font-ui)",
            fontSize: "var(--gm-font-size-sm)",
            color: "var(--gm-text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {reason}
        </div>
      </div>

      <div style={{ width: "100%", textAlign: "left" }}>
        <label
          htmlFor="notify-email"
          style={{
            display: "block",
            fontFamily: "var(--gm-font-ui)",
            fontSize: "var(--gm-font-size-xs)",
            color: "var(--gm-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 6,
          }}
        >
          Notify me at
        </label>
        <input
          id="notify-email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSubmit();
            }
          }}
          placeholder="you@example.com"
          disabled={isSubmitting}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: "var(--gm-bg-surface-2)",
            border: `1px solid ${validationError ? "var(--gm-decay-high)" : "var(--gm-border)"}`,
            borderRadius: "var(--gm-control-radius)",
            color: "var(--gm-text-primary)",
            fontFamily: "var(--gm-font-ui)",
            fontSize: "var(--gm-font-size-base)",
            outline: "none",
          }}
        />
        {validationError && (
          <div
            role="alert"
            style={{
              marginTop: 6,
              fontSize: "var(--gm-font-size-xs)",
              color: "var(--gm-decay-high)",
            }}
          >
            {validationError}
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !email.trim()}
        style={{
          width: "100%",
          padding: "11px 0",
          background: isSubmitting ? "var(--gm-accent-muted)" : "var(--gm-accent)",
          border: "none",
          borderRadius: "var(--gm-control-radius)",
          color: "var(--gm-text-primary)",
          fontFamily: "var(--gm-font-ui)",
          fontSize: "var(--gm-font-size-base)",
          fontWeight: 600,
          cursor: isSubmitting ? "not-allowed" : "pointer",
          opacity: isSubmitting ? 0.7 : 1,
          transition: "opacity var(--gm-transition-fast)",
        }}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Adding to queue…" : "Queue analysis →"}
      </button>

      <div
        style={{
          fontFamily: "var(--gm-font-ui)",
          fontSize: "var(--gm-font-size-xs)",
          color: "var(--gm-text-muted)",
        }}
      >
        We'll email you when your map is ready. Results are kept for 48 hours.
      </div>
    </div>
  );
}
