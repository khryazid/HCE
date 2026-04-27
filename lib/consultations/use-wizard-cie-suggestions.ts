"use client";

import { useEffect, useState } from "react";
import {
  type CieSuggestion,
  type CieSuggestionSource,
} from "@/lib/ai/cie-suggestions";
import { searchCieCatalog } from "@/lib/constants/cie-catalog";
import { fetchCieSuggestionsFromApi } from "@/lib/consultations/cie-suggestions-client";
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

  useEffect(() => {
    if (!wizardOpen || step !== 2) {
      setCieSuggestions([]);
      setCieSuggestionSource("catalog");
      setCieSuggestionLoading(false);
      setCieSuggestionError(null);
      return;
    }

    const query = [diagnosis, symptoms, anamnesis]
      .filter(Boolean)
      .join(" ")
      .trim();
    const localMatches = searchCieCatalog(query).slice(0, 5);

    if (!query) {
      setCieSuggestions([]);
      setCieSuggestionSource("catalog");
      setCieSuggestionLoading(false);
      setCieSuggestionError(null);
      return;
    }

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

    if (query.length < 6) {
      setCieSuggestionLoading(false);
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
          if (!controller.signal.aborted) {
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
          }
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
  }, [anamnesis, diagnosis, specialtyKind, step, symptoms, wizardOpen]);

  return {
    cieSuggestions,
    cieSuggestionSource,
    cieSuggestionLoading,
    cieSuggestionError,
    setCieSuggestionLoading,
  };
}