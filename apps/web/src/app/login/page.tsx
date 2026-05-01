import type { Metadata } from "next";
import React from "react";
import { LoginButton } from "../../components/auth/login-button";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Sign In — Ghostmap",
};

interface LoginPageProps {
  searchParams: { redirectTo?: string; error?: string };
}

export default function LoginPage({ searchParams }: LoginPageProps): React.ReactElement {
  const redirectTo = searchParams.redirectTo ?? "/dashboard";
  const errorMessage =
    searchParams.error === "missing_code"
      ? "GitHub sign-in was cancelled or failed. Please try again."
      : searchParams.error
        ? decodeURIComponent(searchParams.error)
        : null;

  return (
    <div
      style={{
        minHeight: "calc(100vh - 52px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          padding: "40px 32px",
          background: "var(--gm-bg-surface)",
          border: "1px solid var(--gm-border)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--gm-font-code)",
            fontSize: "var(--gm-font-size-lg)",
            fontWeight: 600,
            color: "var(--gm-text-primary)",
          }}
        >
          <span style={{ color: "var(--gm-accent)" }}>◎</span> ghostmap
        </div>

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
            Sign in to continue
          </div>
          <div
            style={{
              fontFamily: "var(--gm-font-ui)",
              fontSize: "var(--gm-font-size-sm)",
              color: "var(--gm-text-secondary)",
              lineHeight: 1.5,
            }}
          >
            Free tier: 5 analyses per day. Ownership, Decay, and Stranger Danger layers included.
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "color-mix(in srgb, var(--gm-decay-high) 10%, transparent)",
              border: "1px solid var(--gm-decay-high)",
              borderRadius: "var(--gm-control-radius)",
              fontSize: "var(--gm-font-size-sm)",
              color: "var(--gm-decay-high)",
              fontFamily: "var(--gm-font-ui)",
            }}
          >
            {errorMessage}
          </div>
        )}

        <div
          style={{
            width: "100%",
            padding: "12px 0",
            background: "var(--gm-bg-surface-2)",
            border: "1px solid var(--gm-border)",
            borderRadius: "var(--gm-control-radius)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <LoginButton redirectTo={redirectTo} />
        </div>

        <div
          style={{
            fontFamily: "var(--gm-font-ui)",
            fontSize: "var(--gm-font-size-xs)",
            color: "var(--gm-text-muted)",
            lineHeight: 1.5,
          }}
        >
          We only request read access to your public profile and email. We never read your code.
        </div>
      </div>
    </div>
  );
}
