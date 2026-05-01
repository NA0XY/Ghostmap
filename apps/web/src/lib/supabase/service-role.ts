import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let client: SupabaseClient<Database> | null = null;

/**
 * Server-only service-role client for backend reads/writes that must bypass RLS.
 * Returns null when service-role env is not configured.
 */
export function createServiceRoleClient(): SupabaseClient<Database> | null {
  if (client) return client;

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceRoleKey) {
    return null;
  }

  client = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}
