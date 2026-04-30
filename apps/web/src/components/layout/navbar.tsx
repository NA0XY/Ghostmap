"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import React from "react";
import { LoginButton } from "../auth/login-button";
import { UserMenu } from "../auth/user-menu";
import { createClient } from "../../lib/supabase/client";

export default function Navbar(): React.ReactElement {
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        setUser(data.user ?? null);
      })
      .catch((error: unknown) => {
        console.error("[navbar] failed to load user", error);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 52,
        background: "var(--gm-bg-surface)",
        borderBottom: "1px solid var(--gm-border)",
        position: "sticky",
        top: 0,
        zIndex: 200,
      }}
    >
      <Link
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--gm-text-primary)",
          fontFamily: "var(--gm-font-code)",
          fontWeight: 600,
          fontSize: "var(--gm-font-size-lg)",
          letterSpacing: "-0.02em",
        }}
      >
        <span style={{ color: "var(--gm-accent)" }}>◎</span>
        ghostmap
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {user && (
          <Link
            href="/dashboard"
            style={{
              color: "var(--gm-text-secondary)",
              fontSize: "var(--gm-font-size-sm)",
              fontFamily: "var(--gm-font-ui)",
              transition: "color var(--gm-transition-fast)",
            }}
          >
            Dashboard
          </Link>
        )}
        {user ? <UserMenu user={user} /> : <LoginButton />}
      </div>
    </nav>
  );
}
