"use client";

import React from "react";
import { createClient } from "../../lib/supabase/client";

interface LoginButtonProps {
  redirectTo?: string;
  className?: string;
}

export function LoginButton({
  redirectTo = "/dashboard",
  className,
}: LoginButtonProps): React.ReactElement {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
          scopes: "read:user user:email",
        },
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
      }
    } catch (err) {
      setError(String(err));
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleLogin} disabled={isLoading} className={className} aria-busy={isLoading}>
        {isLoading ? "Redirecting…" : "Sign in with GitHub"}
      </button>
      {error && (
        <p
          role="alert"
          style={{
            color: "var(--gm-decay-high)",
            fontSize: 12,
            marginTop: 4,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
