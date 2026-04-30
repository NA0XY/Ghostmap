import {
  createBrowserClient,
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (options) {
              const nextOptions =
                options as NonNullable<Parameters<typeof cookieStore.set>[2]>;
              cookieStore.set(
                name,
                value,
                nextOptions,
              );
            } else {
              cookieStore.set(name, value);
            }
          });
        } catch {
          // setAll called from a Server Component; middleware handles refresh path.
        }
      },
    },
  });
}

export function createServiceRoleClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY — only use in worker process");
  }

  return createBrowserClient<Database>(url, serviceKey);
}
