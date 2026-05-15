import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildCieSuggestionPrompt,
  extractGeminiSuggestions,
  type CieSuggestionInput,
} from "@/features/consultations/lib/ai/cie-suggestions";
import { isCieSuggestionRateLimited } from "@/features/consultations/lib/ai/cie-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = CieSuggestionInput;
const MAX_INPUT_LENGTH = 1200;

function readRequestText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, MAX_INPUT_LENGTH) : "";
}

async function getAuthorizedUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;

  return { userId: data.user?.id ?? null };
}

async function requestGeminiSuggestions(input: RequestBody): Promise<ReturnType<typeof extractGeminiSuggestions> | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: buildCieSuggestionPrompt(input) }] }],
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      maxOutputTokens: 512,
      responseMimeType: "application/json",
    },
  });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Reintentar una vez si Gemini devuelve 503 (sobrecarga temporal)
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      return null;
    }

    if (response.ok) {
      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const suggestions = extractGeminiSuggestions(text);
      return suggestions.length > 0 ? suggestions : null;
    }

    // Solo reintentar en 503 (servicio sobrecargado)
    if (response.status !== 503) {
      console.warn("[HCE:cie-api] Gemini returned non-ok status", {
        status: response.status,
        model,
        specialtyKind: input.specialtyKind,
      });
      return null;
    }

    console.warn("[HCE:cie-api] Gemini 503 — reintentando...", { attempt: attempt + 1, model });
  }

  console.warn("[HCE:cie-api] Gemini 503 tras reintentos", { model, specialtyKind: input.specialtyKind });
  return null;
}

export async function POST(request: Request) {
  try {
    const authorizedUser = await getAuthorizedUserId();

    if (!authorizedUser?.userId) {
      return NextResponse.json(
        { source: "gemini", suggestions: [], error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (await isCieSuggestionRateLimited({ userId: authorizedUser.userId })) {
      return NextResponse.json(
        { source: "gemini", suggestions: [], error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const body = (await request.json()) as Partial<RequestBody>;
    const diagnosis = readRequestText(body.diagnosis);
    const symptoms = readRequestText(body.symptoms);
    const anamnesis = readRequestText(body.anamnesis);
    const specialtyKind = readRequestText(body.specialtyKind) || "medicina-general";

    const query = [diagnosis, symptoms, anamnesis].filter(Boolean).join(" ").trim();

    if (!query) {
      return NextResponse.json({ source: "gemini", suggestions: [] });
    }

    const geminiSuggestions = await requestGeminiSuggestions({ diagnosis, symptoms, anamnesis, specialtyKind });

    if (geminiSuggestions && geminiSuggestions.length > 0) {
      return NextResponse.json({ source: "gemini", suggestions: geminiSuggestions });
    }

    // Gemini no disponible — retorna vacío, el cliente mostrará el mensaje apropiado.
    return NextResponse.json({ source: "gemini", suggestions: [] });
  } catch {
    return NextResponse.json(
      { source: "gemini", suggestions: [], error: "Internal error" },
      { status: 500 },
    );
  }
}
