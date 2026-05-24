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

import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { serverLog } from "@/lib/observability/server-logger";

const cieSuggestionBodySchema = z.object({
  diagnosis: z.string().optional(),
  symptoms: z.string().optional(),
  anamnesis: z.string().optional(),
  specialtyKind: z.string().optional()
});

type RequestBody = CieSuggestionInput;
const MAX_INPUT_LENGTH = 1200;

function readRequestText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, MAX_INPUT_LENGTH) : "";
}

async function getAuthorizedUserId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const userId = data.user.id;

  // A-04: Verify active subscription server-side — the frontend guard is not enough.
  // A user with a valid JWT but cancelled subscription must not consume Gemini quota.
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, subscription_expires_at")
    .eq("doctor_id", userId)
    .maybeSingle();

  const validStatuses = ["active", "trialing", "lifetime", "past_due", "paused"];
  const status = profile?.subscription_status ?? "";

  if (!validStatuses.includes(status)) {
    return null; // Treated as unauthorized
  }

  // F-40: Fix — verificar expires_at para todos los estados expirables,
  // no solo active/trialing. past_due recibe 7 dias de gracia (ventana de
  // reintentos de Stripe). paused no recibe gracia adicional.
  const GRACE_MS: Record<string, number> = {
    active:   0,
    trialing: 0,
    past_due: 7 * 24 * 60 * 60 * 1000, // 7 days grace
    paused:   0,
  };

  if (status in GRACE_MS && profile?.subscription_expires_at) {
    const graceMs = GRACE_MS[status] ?? 0;
    if (new Date(profile.subscription_expires_at).getTime() + graceMs < Date.now()) {
      return null;
    }
  }

  return { userId };
}

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: serverEnv.GEMINI_API_KEY });

async function requestGeminiSuggestions(input: RequestBody, reqId: string): Promise<ReturnType<typeof extractGeminiSuggestions> | null> {
  const model = serverEnv.GEMINI_MODEL || "gemini-3.5-flash";
  const log = serverLog.withRequestId(reqId);

  // Reintentar una vez si Gemini devuelve 503 (sobrecarga temporal)
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 8000);

      try {
        const response = await ai.models.generateContent({
          model,
          contents: buildCieSuggestionPrompt(input),
          config: {
            responseMimeType: "application/json",
          },
        });
        clearTimeout(timeoutId);

        const text = response.text;
        if (!text) return null;

        const suggestions = extractGeminiSuggestions(text);
        return suggestions.length > 0 ? suggestions : null;
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        // @google/genai throws errors with .status for HTTP errors
        const err = error as { status?: number; message?: string };
        const status = err?.status;
        
        if (status === 503) {
          log.warn("cie-api", "Gemini 503 — reintentando...", { attempt: attempt + 1, model });
          continue;
        }
        
        log.warn("cie-api", "Gemini API Error", {
          status,
          message: err?.message,
          model,
          specialtyKind: input.specialtyKind,
        });
        return null;
    }
  }

  log.warn("cie-api", "Gemini 503 tras reintentos", { model, specialtyKind: input.specialtyKind });
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

    const reqId = request.headers.get("x-request-id") ?? "";
    const log = serverLog.withRequestId(reqId);

    let rawBody;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ source: "gemini", suggestions: [], error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = cieSuggestionBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ source: "gemini", suggestions: [], error: "Invalid Payload" }, { status: 400 });
    }

    const body = parsed.data;
    const diagnosis = readRequestText(body.diagnosis);
    const symptoms = readRequestText(body.symptoms);
    const anamnesis = readRequestText(body.anamnesis);
    const specialtyKind = readRequestText(body.specialtyKind) || "medicina-general";

    const query = [diagnosis, symptoms, anamnesis].filter(Boolean).join(" ").trim();

    if (!query) {
      return NextResponse.json({ source: "gemini", suggestions: [] });
    }

    const geminiSuggestions = await requestGeminiSuggestions({ diagnosis, symptoms, anamnesis, specialtyKind }, reqId);

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
