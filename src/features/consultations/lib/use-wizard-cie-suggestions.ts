"use client";

import { useEffect, useRef, useState } from "react";
import {
  type CieSuggestion,
  type CieSuggestionSource,
} from "@/features/consultations/lib/ai/cie-suggestions";
import {
  fetchCieSuggestionsFromApi,
  CieRateLimitError,
} from "@/features/consultations/lib/cie-suggestions-client";

type Params = {
  wizardOpen: boolean;
  step: number;
  diagnosis: string;
  symptoms: string;
  anamnesis: string;
  /** Especialidad real del médico (texto libre del perfil). Usada como contexto para Gemini. */
  specialtyKind: string;
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
    useState<CieSuggestionSource>("gemini");
  const [cieSuggestionLoading, setCieSuggestionLoading] = useState(false);
  const [cieSuggestionError, setCieSuggestionError] = useState<string | null>(null);
  /** Segundos restantes del cooldown por rate-limit. 0 = sin cooldown. */
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const rateLimitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      setCieSuggestions([]);
      setCieSuggestionSource("gemini");
      setCieSuggestionLoading(false);
      setCieSuggestionError(null);
      return;
    }

    const query = [diagnosis, symptoms, anamnesis].filter(Boolean).join(" ").trim();

    if (!query || query.length < 6) {
      setCieSuggestions([]);
      setCieSuggestionLoading(false);
      setCieSuggestionError(null);
      return;
    }

    // No disparar si el cooldown aún está activo
    if (rateLimitCountdown > 0) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setCieSuggestionLoading(true);
      void fetchCieSuggestionsFromApi(
        { diagnosis, symptoms, anamnesis, specialtyKind },
        controller.signal,
      )
        .then((data) => {
          if (controller.signal.aborted) return;

          if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
            setCieSuggestions(data.suggestions);
            setCieSuggestionSource(data.source ?? "gemini");
            setCieSuggestionError(null);
          } else {
            // Gemini respondió pero sin sugerencias (ej. input insuficiente)
            setCieSuggestions([]);
            setCieSuggestionError(null);
          }
        })
        .catch((requestError: unknown) => {
          if (controller.signal.aborted) return;

          if (requestError instanceof CieRateLimitError) {
            startRateLimitCountdown(requestError.retryAfterMs);
            return;
          }

          if (requestError instanceof Error && requestError.message === "CIE_UNAUTHORIZED") {
            setCieSuggestionError(
              "Tu sesion expiro. Vuelve a iniciar sesion para usar sugerencias IA.",
            );
            return;
          }

          setCieSuggestionError("Gemini no estuvo disponible. Intenta de nuevo.");
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