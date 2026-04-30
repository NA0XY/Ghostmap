import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";
import { JobList } from "../../components/dashboard/job-list";
import { createServerSupabaseClient } from "../../lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard — Ghostmap",
};

export default async function DashboardPage(): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select(
      "id, repo_owner, repo_name, status, classification, created_at, completed_at, error_message",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[dashboard] Failed to load jobs:", error.message);
  }

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "40px 24px",
        fontFamily: "var(--gm-font-ui)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "var(--gm-font-size-lg)",
              fontWeight: 600,
              color: "var(--gm-text-primary)",
            }}
          >
            Your Maps
          </h1>
          <div
            style={{
              marginTop: 4,
              fontSize: "var(--gm-font-size-sm)",
              color: "var(--gm-text-secondary)",
            }}
          >
            {user.email}
          </div>
        </div>
        <Link
          href="/"
          style={{
            padding: "8px 16px",
            background: "var(--gm-accent)",
            borderRadius: "var(--gm-control-radius)",
            color: "var(--gm-text-primary)",
            fontSize: "var(--gm-font-size-sm)",
            fontWeight: 600,
          }}
        >
          + New map
        </Link>
      </div>

      <JobList jobs={jobs ?? []} />
    </div>
  );
}
