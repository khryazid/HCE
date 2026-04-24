import type { CieCatalogEntry } from "@/lib/constants/cie-catalog";

export type CieSuggestionSource = "catalog" | "gemini";

export type CieSuggestion = {
  code: string;
  description: string;
  rationale: string;
  confidence: number;
  source: CieSuggestionSource;
};

export type CieSuggestionInput = {
  diagnosis: string;
  symptoms: string;
  anamnesis: string;
  specialtyKind: string;
};

type ParsedGeminiSuggestion = {
  code: string;
  description?: string;
  rationale?: string;
  confidence?: number;
};

export function mergeCieCodeList(existingCodes: string, code: string) {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) {
    return existingCodes.trim();
  }

  const codes = existingCodes
    .split(",")
    .map((entry) => normalizeCode(entry))
    .filter(Boolean);

  if (codes.includes(normalizedCode)) {
    return codes.join(", ");
  }

  return [...codes, normalizedCode].join(", ");
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export function buildCieSuggestionPrompt(input: CieSuggestionInput, candidates: CieCatalogEntry[]) {
  const candidateList = candidates
    .map((entry) => `- ${entry.code}: ${entry.description}`)
    .join("\n");

  return [
    "Eres un asistente clinico para sugerir codigos CIE/ICD.",
    "Usa solo los codigos de la lista permitida.",
    "Devuelve exclusivamente JSON valido con esta forma:",
    "[{\"code\":\"A09\",\"description\":\"...\",\"rationale\":\"...\",\"confidence\":0.82}]",
    "No agregues texto adicional, markdown ni explicaciones.",
    "Prioriza codigos que coincidan con el diagnostico, sintomas y anamnesis.",
    `Especialidad: ${input.specialtyKind}`,
    `Diagnostico: ${input.diagnosis || "Sin diagnostico"}`,
    `Sintomas: ${input.symptoms || "Sin sintomas"}`,
    `Anamnesis: ${input.anamnesis || "Sin anamnesis"}`,
    "Codigos permitidos:",
    candidateList || "- Sin candidatos disponibles",
  ].join("\n");
}

export function buildCatalogSuggestions(candidates: CieCatalogEntry[], rationale: string): CieSuggestion[] {
  return candidates.map((entry, index) => ({
    code: entry.code,
    description: entry.description,
    rationale,
    confidence: Math.max(0.55, 0.9 - index * 0.08),
    source: "catalog" as const,
  }));
}

export function extractGeminiSuggestions(payload: unknown, candidates: CieCatalogEntry[]) {
  const items = parseGeminiSuggestionPayload(payload);
  if (items.length === 0) {
    return [] as CieSuggestion[];
  }

  const candidateMap = new Map(candidates.map((entry) => [normalizeCode(entry.code), entry]));

  return items.flatMap((item) => {
    const matched = candidateMap.get(normalizeCode(item.code));
    if (!matched) {
      return [];
    }

    return [
      {
        code: matched.code,
        description: matched.description,
        rationale: item.rationale || `Coincide con el texto clinico para ${matched.code}.`,
        confidence: clampConfidence(item.confidence),
        source: "gemini" as const,
      } satisfies CieSuggestion,
    ];
  });
}

function parseGeminiSuggestionPayload(payload: unknown) {
  if (typeof payload !== "string") {
    return [] as ParsedGeminiSuggestion[];
  }

  const trimmed = payload.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => normalizeGeminiEntry(entry))
        .filter((entry): entry is ParsedGeminiSuggestion => Boolean(entry));
    }

    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { suggestions?: unknown }).suggestions)) {
      return (parsed as { suggestions: unknown[] }).suggestions
        .map((entry) => normalizeGeminiEntry(entry))
        .filter((entry): entry is ParsedGeminiSuggestion => Boolean(entry));
    }
  } catch {
    return [];
  }

  return [];
}

function normalizeGeminiEntry(entry: unknown): ParsedGeminiSuggestion | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const value = entry as Record<string, unknown>;
  if (typeof value.code !== "string") {
    return null;
  }

  return {
    code: value.code,
    description: typeof value.description === "string" ? value.description : undefined,
    rationale: typeof value.rationale === "string" ? value.rationale : undefined,
    confidence: typeof value.confidence === "number" ? value.confidence : undefined,
  };
}

function clampConfidence(confidence?: number) {
  if (typeof confidence !== "number" || Number.isNaN(confidence)) {
    return 0.7;
  }

  if (confidence < 0) {
    return 0;
  }

  if (confidence > 1) {
    return 1;
  }

  return confidence;
}
