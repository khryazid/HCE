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
  emitAppEvent,
} from "@/lib/observability/app-events";

export type CieSuggestionRequestResult = {
  source?: CieSuggestionSource;
  suggestions?: CieSuggestion[];
};

export async function fetchCieSuggestionsFromApi(
  input: CieSuggestionInput,
  signal?: AbortSignal,
) {
  emitAppEvent(APP_EVENT_CIE_SUGGESTIONS_REQUESTED, {
    specialtyKind: input.specialtyKind,
  });

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
      emitAppEvent(APP_EVENT_CIE_SUGGESTIONS_COMPLETED, {
        source: "unauthorized",
      });
      throw new Error("CIE_UNAUTHORIZED");
    }

    emitAppEvent(APP_EVENT_CIE_SUGGESTIONS_COMPLETED, {
      source: "error",
      status: response.status,
    });
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