import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CIE_CATALOG, searchCieCatalog } from "@/lib/constants/cie-catalog";
import {
  buildCatalogSuggestions,
  buildCieSuggestionPrompt,
  extractGeminiSuggestions,
  type CieSuggestionInput,
} from "@/lib/ai/cie-suggestions";
import type { Database } from "@/types/supabase.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = CieSuggestionInput;
const MAX_INPUT_LENGTH = 1200;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

type RateLimitEntry = {
  count: number;
  windowStart: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function readRequestText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, MAX_INPUT_LENGTH) : "";
}

function resolveClientIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

function cleanupRateLimitStore(now: number) {
  if (rateLimitStore.size < 1500) {
    return;
  }

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitStore.delete(key);
    }
  }
}

function isRateLimited(request: Request) {
  const tokenKey = readBearerToken(request)?.slice(0, 24) || "no-token";
  const clientKey = `${resolveClientIdentifier(request)}:${tokenKey}`;
  const now = Date.now();

  cleanupRateLimitStore(now);

  const current = rateLimitStore.get(clientKey);
  if (!current || now - current.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(clientKey, {
      count: 1,
      windowStart: now,
    });
    return false;
  }

  current.count += 1;
  rateLimitStore.set(clientKey, current);
  return current.count > RATE_LIMIT_MAX_REQUESTS;
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

async function isAuthorizedRequest(request: Request) {
  const token = readBearerToken(request);
  if (!token) {
    return false;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return false;
  }

  const supabase = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    return false;
  }

  return Boolean(data.user);
}

async function requestGeminiSuggestions(input: RequestBody) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const combinedQuery = [input.diagnosis, input.symptoms, input.anamnesis].filter(Boolean).join(" ").trim();
  const candidateEntries = searchCieCatalog(combinedQuery).slice(0, 8);
  const contextEntries = candidateEntries.length > 0 ? candidateEntries : CIE_CATALOG.slice(0, 8);

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
    if (isRateLimited(request)) {
      return NextResponse.json(
        {
          source: "catalog",
          suggestions: [],
          error: "Rate limit exceeded",
        },
        { status: 429 },
      );
    }

    const authorized = await isAuthorizedRequest(request);

    if (!authorized) {
      return NextResponse.json(
        {
          source: "catalog",
          suggestions: [],
          error: "Unauthorized",
        },
        { status: 401 },
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

    return NextResponse.json({
      source: "catalog",
      suggestions: buildCatalogSuggestions(localCandidates, "Sugerencias basadas en el catalogo local."),
    });
  } catch {
    return NextResponse.json(
      {
        source: "catalog",
        suggestions: buildCatalogSuggestions(CIE_CATALOG.slice(0, 5), "No se pudo consultar Gemini; se usan sugerencias locales."),
      },
      { status: 200 },
    );
  }
}
