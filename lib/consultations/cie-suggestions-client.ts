"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  CieSuggestion,
  CieSuggestionInput,
  CieSuggestionSource,
} from "@/lib/ai/cie-suggestions";
import {
  APP_EVENT_CIE_SUGGESTIONS_COMPLETED,
  APP_EVENT_CIE_SUGGESTIONS_REQUESTED,
  APP_EVENT_API_ERROR,
  emitAppEvent,
} from "@/lib/observability/app-events";
import { logApiError } from "@/lib/observability/error-logger";

export type CieSuggestionRequestResult = {
  source?: CieSuggestionSource;
  suggestions?: CieSuggestion[];
};

/**
 * Error tipado para rate limiting 429.
 * Permite que el consumidor distinga el caso y muestre un countdown.
 */
export class CieRateLimitError extends Error {
  readonly retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super("CIE_RATE_LIMITED");
    this.name = "CieRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export async function fetchCieSuggestionsFromApi(
  input: CieSuggestionInput,
  signal?: AbortSignal,
): Promise<CieSuggestionRequestResult> {
  emitAppEvent(APP_EVENT_CIE_SUGGESTIONS_REQUESTED, {
    specialtyKind: input.specialtyKind,
  });

  // NF-01: Guardia offline — evita TypeError: Failed to fetch en modo sin conexión.
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    emitAppEvent(APP_EVENT_CIE_SUGGESTIONS_COMPLETED, {
      source: "catalog",
      offline: true,
    });
    return { source: "catalog", suggestions: [] };
  }

  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch("/api/cie-suggestions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify(input),
    signal,
  });

  if (!response.ok) {
    if (response.status === 401) {
      const detail = { status: 401, specialtyKind: input.specialtyKind };
      logApiError("fetchCieSuggestionsFromApi", "Sesion no autorizada para CIE", detail);
      emitAppEvent(APP_EVENT_API_ERROR, { source: "cie", ...detail });
      emitAppEvent(APP_EVENT_CIE_SUGGESTIONS_COMPLETED, { source: "unauthorized" });
      throw new Error("CIE_UNAUTHORIZED");
    }

    if (response.status === 429) {
      const retryAfterSec = Number(response.headers.get("Retry-After") ?? "60");
      const retryAfterMs = (Number.isFinite(retryAfterSec) ? retryAfterSec : 60) * 1000;
      const detail = { status: 429, retryAfterMs, specialtyKind: input.specialtyKind };
      logApiError("fetchCieSuggestionsFromApi", "Rate limit CIE alcanzado", detail);
      emitAppEvent(APP_EVENT_API_ERROR, { source: "cie", ...detail });
      emitAppEvent(APP_EVENT_CIE_SUGGESTIONS_COMPLETED, { source: "rate_limited", retryAfterMs });
      throw new CieRateLimitError(retryAfterMs);
    }

    const detail = { status: response.status, specialtyKind: input.specialtyKind };
    logApiError("fetchCieSuggestionsFromApi", "Error al consultar sugerencias CIE", detail);
    emitAppEvent(APP_EVENT_API_ERROR, { source: "cie", ...detail });
    emitAppEvent(APP_EVENT_CIE_SUGGESTIONS_COMPLETED, { source: "error", status: response.status });
    throw new Error("No se pudo consultar sugerencias CIE.");
  }

  const result = (await response.json()) as CieSuggestionRequestResult;

  emitAppEvent(APP_EVENT_CIE_SUGGESTIONS_COMPLETED, {
    source: result.source ?? "catalog",
    suggestions: Array.isArray(result.suggestions) ? result.suggestions.length : 0,
  });

  return result;
}

export async function fetchFirstCieSuggestionCode(
  input: CieSuggestionInput,
  signal?: AbortSignal,
) {
  const result = await fetchCieSuggestionsFromApi(input, signal);
  const firstSuggestion =
    Array.isArray(result.suggestions) && result.suggestions.length > 0
      ? result.suggestions[0]
      : null;

  return firstSuggestion?.code ?? null;
}