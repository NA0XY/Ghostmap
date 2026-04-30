import type { UserTier } from "../supabase/database.types";

const DAILY_LIMITS: Record<UserTier, number> = {
  anonymous: 1,
  free: 5,
  pro: Number.POSITIVE_INFINITY,
};

export interface UsageCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  tier: UserTier;
}

export async function checkUsageLimit(
  supabase: unknown,
  userId: string,
): Promise<UsageCheckResult> {
  type UserTierRow = { tier: UserTier };
  type QueryError = { message: string } | null;
  interface UsersQuery {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => Promise<{ data: UserTierRow | null; error: QueryError }>;
      };
    };
  }
  interface UsageClient {
    from: (table: "users") => UsersQuery;
    rpc: (
      fn: "get_usage_today" | "increment_usage",
      args: { p_user_id: string },
    ) => Promise<{ data: number | null; error: QueryError }>;
  }
  const usageClient = supabase as UsageClient;

  const { data: userRow, error: userError } = await usageClient
    .from("users")
    .select("tier")
    .eq("id", userId)
    .single();

  if (userError || !userRow) {
    console.error("[limits] Failed to fetch user tier:", userError?.message);
    return { allowed: true, currentCount: 0, limit: DAILY_LIMITS.free, tier: "free" };
  }

  const tier = userRow.tier;
  const limit = DAILY_LIMITS[tier];
  if (limit === Number.POSITIVE_INFINITY) {
    return { allowed: true, currentCount: 0, limit: Number.POSITIVE_INFINITY, tier };
  }

  const { data: count, error: usageError } = await usageClient.rpc("get_usage_today", {
    p_user_id: userId,
  });

  if (usageError) {
    console.error("[limits] Failed to fetch usage:", usageError.message);
    return { allowed: true, currentCount: 0, limit, tier };
  }

  const currentCount = count ?? 0;
  return {
    allowed: currentCount < limit,
    currentCount,
    limit,
    tier,
  };
}

export async function incrementUsage(
  supabase: unknown,
  userId: string,
): Promise<number> {
  type QueryError = { message: string } | null;
  interface UsageClient {
    rpc: (
      fn: "increment_usage",
      args: { p_user_id: string },
    ) => Promise<{ data: number | null; error: QueryError }>;
  }
  const usageClient = supabase as UsageClient;

  const { data, error } = await usageClient.rpc("increment_usage", {
    p_user_id: userId,
  });

  if (error) {
    console.error("[limits] Failed to increment usage:", error.message);
    return 0;
  }

  return data ?? 0;
}
