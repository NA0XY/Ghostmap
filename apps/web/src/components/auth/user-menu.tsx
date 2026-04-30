"use client";

import React from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";

interface UserMenuProps {
  user: User;
}

export function UserMenu({ user }: UserMenuProps): React.ReactElement {
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = async (): Promise<void> => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      setIsSigningOut(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 13 }}>
        {user.user_metadata?.["avatar_url"] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.user_metadata["avatar_url"] as string}
            alt="Avatar"
            width={24}
            height={24}
            style={{ borderRadius: "50%", verticalAlign: "middle", marginRight: 6 }}
          />
        )}
        {(user.user_metadata?.["user_name"] as string | undefined) ?? user.email}
      </span>
      <button onClick={handleSignOut} disabled={isSigningOut} style={{ fontSize: 12 }}>
        {isSigningOut ? "…" : "Sign out"}
      </button>
    </div>
  );
}
