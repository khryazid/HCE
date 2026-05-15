import { createClient } from "@/lib/supabase/server";

const RATE_LIMIT_SCOPE = "cie-suggestions";
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 30;

type RateLimitInput = {
  userId: string;
};

export async function isCieSuggestionRateLimited({ userId }: RateLimitInput) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("claim_api_rate_limit", {
    p_scope: RATE_LIMIT_SCOPE,
    p_identifier: userId,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    p_max_requests: RATE_LIMIT_MAX_REQUESTS,
  });

  if (error || typeof data !== "boolean") {
    return true;
  }

  return data;
}