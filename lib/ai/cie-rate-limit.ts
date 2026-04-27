import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase.types";

const RATE_LIMIT_SCOPE = "cie-suggestions";
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 30;

type RateLimitInput = {
  userId: string;
  token: string;
};

function createAuthorizedClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export async function isCieSuggestionRateLimited({ userId, token }: RateLimitInput) {
  const supabase = createAuthorizedClient(token);
  if (!supabase) {
    return true;
  }

  const { data, error } = await supabase.rpc("claim_api_rate_limit", {
    p_scope: RATE_LIMIT_SCOPE,
    p_identifier: userId,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    p_max_requests: RATE_LIMIT_MAX_REQUESTS,
  } as never);

  if (error || typeof data !== "boolean") {
    return true;
  }

  return data;
}