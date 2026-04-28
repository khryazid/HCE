"use client";

import { useEffect, useRef, useState } from "react";
import {
  type CieSuggestion,
  type CieSuggestionSource,
} from "@/lib/ai/cie-suggestions";
import { searchCieCatalog } from "@/lib/constants/cie-catalog";
import {
  fetchCieSuggestionsFromApi,
  CieRateLimitError,
} from "@/lib/consultations/cie-suggestions-client";
import type { SpecialtyKind } from "@/types/clinical";

type Params = {
  wizardOpen: boolean;
  step: number;
  diagnosis: string;
  symptoms: string;
  anamnesis: string;
  specialtyKind: SpecialtyKind;
};

export function useWizardCieSuggestions({
  wizardOpen,
  step,
  diagnosis,
  symptoms,
  anamnesis,
  specialtyKind,
}: Params) {
  const [cieSuggestions, setCieSuggestions] = useState<CieSuggestion[]>([]);
  const [cieSuggestionSource, setCieSuggestionSource] =
    useState<CieSuggestionSource>("catalog");
  const [cieSuggestionLoading, setCieSuggestionLoading] = useState(false);
  const [cieSuggestionError, setCieSuggestionError] = useState<string | null>(
    null,
  );
  /** Segundos restantes del cooldown por rate-limit. 0 = sin cooldown. */
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const rateLimitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Inicia el countdown de rate-limit y limpia el estado al terminar. */
  function startRateLimitCountdown(retryAfterMs: number) {
    const seconds = Math.ceil(retryAfterMs / 1000);
    setRateLimitCountdown(seconds);
    setCieSuggestionError(`Limite de solicitudes alcanzado. Intenta en ${seconds} s.`);

    if (rateLimitTimerRef.current) clearInterval(rateLimitTimerRef.current);

    rateLimitTimerRef.current = setInterval(() => {
      setRateLimitCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(rateLimitTimerRef.current!);
          rateLimitTimerRef.current = null;
          setCieSuggestionError(null);
          return 0;
        }
        const next = prev - 1;
        setCieSuggestionError(`Limite de solicitudes alcanzado. Intenta en ${next} s.`);
        return next;
      });
    }, 1000);
  }

  useEffect(() => {
    return () => {
      if (rateLimitTimerRef.current) clearInterval(rateLimitTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!wizardOpen || step !== 2) {
      // Defer state updates to avoid synchronous setState in effect
      Promise.resolve().then(() => {
        setCieSuggestions([]);
        setCieSuggestionSource("catalog");
        setCieSuggestionLoading(false);
        setCieSuggestionError(null);
      });
      return;
    }

    const query = [diagnosis, symptoms, anamnesis]
      .filter(Boolean)
      .join(" ")
      .trim();
    const localMatches = searchCieCatalog(query).slice(0, 5);

    if (!query) {
      Promise.resolve().then(() => {
        setCieSuggestions([]);
        setCieSuggestionSource("catalog");
        setCieSuggestionLoading(false);
        setCieSuggestionError(null);
      });
      return;
    }

    // Set local matches synchronously but defer to microtask to avoid cascading renders
    Promise.resolve().then(() => {
      setCieSuggestions(
        localMatches.map((entry, index) => ({
          code: entry.code,
          description: entry.description,
          rationale: "Coincidencia del catalogo local.",
          confidence: Math.max(0.55, 0.9 - index * 0.08),
          source: "catalog",
        })),
      );
      setCieSuggestionSource("catalog");
      setCieSuggestionError(null);
    });

    if (query.length < 6) {
      Promise.resolve().then(() => setCieSuggestionLoading(false));
      return;
    }

    // No disparar si el cooldown aún está activo
    if (rateLimitCountdown > 0) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setCieSuggestionLoading(true);
      void fetchCieSuggestionsFromApi(
        {
          diagnosis,
          symptoms,
          anamnesis,
          specialtyKind,
        },
        controller.signal,
      )
        .then((data) => {
          if (controller.signal.aborted) {
            return;
          }

          if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
            setCieSuggestions(data.suggestions);
            setCieSuggestionSource(data.source ?? "catalog");
            setCieSuggestionError(null);
          }
        })
        .catch((requestError: unknown) => {
          if (controller.signal.aborted) return;

          if (requestError instanceof CieRateLimitError) {
            startRateLimitCountdown(requestError.retryAfterMs);
            return;
          }

          if (
            requestError instanceof Error &&
            requestError.message === "CIE_UNAUTHORIZED"
          ) {
            setCieSuggestionError(
              "Tu sesion expiro para sugerencias asistidas. Vuelve a iniciar sesion para usar Gemini.",
            );
            return;
          }

          setCieSuggestionError(
            "La sugerencia asistida no estuvo disponible; se conservan coincidencias locales.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setCieSuggestionLoading(false);
          }
        });
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
    // rateLimitCountdown intencionalmente excluido para no re-lanzar durante cooldown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anamnesis, diagnosis, specialtyKind, step, symptoms, wizardOpen]);

  return {
    cieSuggestions,
    cieSuggestionSource,
    cieSuggestionLoading,
    cieSuggestionError,
    rateLimitCountdown,
    setCieSuggestionLoading,
  };
}