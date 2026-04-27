import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CIE_CATALOG, searchCieCatalog } from "@/lib/constants/cie-catalog";
import {
  buildCatalogSuggestions,
  buildCieSuggestionPrompt,
  extractGeminiSuggestions,
  type CieSuggestionInput,
} from "@/lib/ai/cie-suggestions";
import { isCieSuggestionRateLimited } from "@/lib/ai/cie-rate-limit";
import type { Database } from "@/types/supabase.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = CieSuggestionInput;
const MAX_INPUT_LENGTH = 1200;

function readRequestText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, MAX_INPUT_LENGTH) : "";
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim();
}

async function getAuthorizedUserId(request: Request) {
  const token = readBearerToken(request);
  if (!token) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }

  const supabase = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    return null;
  }

  return {
    userId: data.user?.id ?? null,
    token,
  };
}

async function requestGeminiSuggestions(input: RequestBody) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const combinedQuery = [input.diagnosis, input.symptoms, input.anamnesis].filter(Boolean).join(" ").trim();
  const candidateEntries = searchCieCatalog(combinedQuery).slice(0, 8);
  void candidateEntries; // Referenciado por contexto futuro; el prompt usa buildCieSuggestionPrompt

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildCieSuggestionPrompt(input) }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens: 512,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const suggestions = extractGeminiSuggestions(text);

  if (suggestions.length > 0) {
    return suggestions;
  }

  return buildCatalogSuggestions(CIE_CATALOG.slice(0, 5), "El modelo no devolvio una respuesta valida.");
}

export async function POST(request: Request) {
  try {
    const authorizedUser = await getAuthorizedUserId(request);

    if (!authorizedUser?.userId) {
      return NextResponse.json(
        {
          source: "catalog",
          suggestions: [],
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    if (await isCieSuggestionRateLimited({ userId: authorizedUser.userId, token: authorizedUser.token })) {
      return NextResponse.json(
        {
          source: "catalog",
          suggestions: [],
          error: "Rate limit exceeded",
        },
        { status: 429 },
      );
    }

    const body = (await request.json()) as Partial<RequestBody>;
    const diagnosis = readRequestText(body.diagnosis);
    const symptoms = readRequestText(body.symptoms);
    const anamnesis = readRequestText(body.anamnesis);
    const specialtyKind = readRequestText(body.specialtyKind) || "medicina-general";

    const query = [diagnosis, symptoms, anamnesis].filter(Boolean).join(" ").trim();
    const localCandidates = searchCieCatalog(query).slice(0, 5);

    if (!query) {
      return NextResponse.json({
        source: "catalog",
        suggestions: buildCatalogSuggestions(CIE_CATALOG.slice(0, 5), "Completa diagnostico o sintomas para obtener sugerencias."),
      });
    }

    const geminiSuggestions = await requestGeminiSuggestions({
      diagnosis,
      symptoms,
      anamnesis,
      specialtyKind,
    });

    if (geminiSuggestions && geminiSuggestions.length > 0) {
      return NextResponse.json({
        source: "gemini",
        suggestions: geminiSuggestions,
      });
    }

    if (process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          source: "catalog",
          suggestions: buildCatalogSuggestions(localCandidates, "Gemini no respondio; se usan sugerencias locales."),
          error: "Gemini unavailable",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      source: "catalog",
      suggestions: buildCatalogSuggestions(localCandidates, "Sugerencias basadas en el catalogo local."),
    });
  } catch {
    return NextResponse.json(
      {
        source: "catalog",
        suggestions: buildCatalogSuggestions(CIE_CATALOG.slice(0, 5), "No se pudo consultar Gemini; se usan sugerencias locales."),
        error: "Internal error",
      },
      { status: 503 },
    );
  }
}
