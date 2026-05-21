import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockGetUser,
  mockFetch,
  mockIsRateLimited,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFetch: vi.fn(),
  mockIsRateLimited: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { subscription_status: "active" } }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/features/consultations/lib/ai/cie-rate-limit", () => ({
  isCieSuggestionRateLimited: mockIsRateLimited,
}));

vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/cie-suggestions/route";

function buildRequest(body: Record<string, unknown>, token?: string) {
  return new Request("http://localhost/api/cie-suggestions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("cie suggestions route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "doctor-test" } },
      error: null,
    });
    mockIsRateLimited.mockResolvedValue(false);

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  it("rejects requests without bearer token", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "Unauthorized" } });
    const response = await POST(
      buildRequest({ diagnosis: "cefalea", symptoms: "dolor de cabeza", anamnesis: "inicio agudo" }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects requests when Supabase credentials are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "Unauthorized" } });

    const response = await POST(
      buildRequest(
        { diagnosis: "cefalea", symptoms: "dolor de cabeza", anamnesis: "inicio agudo" },
        "token-missing-env",
      ),
    );

    expect(response.status).toBe(401);
  });

  it("rate limits repeated requests for the same user", async () => {
    let attempts = 0;
    mockIsRateLimited.mockImplementation(async () => {
      attempts += 1;
      return attempts > 30;
    });

    let lastResponse: Response | null = null;

    for (let attempt = 0; attempt < 31; attempt += 1) {
      lastResponse = await POST(
        buildRequest(
          { diagnosis: "cefalea", symptoms: "dolor de cabeza", anamnesis: "inicio agudo" },
          "token-rate",
        ),
      );
    }

    expect(lastResponse?.status).toBe(429);
  });

  it("returns 200 with empty suggestions when Gemini is configured but unavailable", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    mockGetUser.mockResolvedValue({
      data: { user: { id: "doctor-gemini" } },
      error: null,
    });
    mockFetch.mockResolvedValue({ ok: false, status: 503 });

    const response = await POST(
      buildRequest(
        { diagnosis: "cefalea", symptoms: "dolor de cabeza", anamnesis: "inicio agudo" },
        "token-gemini",
      ),
    );

    // Gemini no disponible → 200 con array vacío (graceful degradation, no error para el cliente)
    expect(response.status).toBe(200);

    const payload = (await response.json()) as { source?: string; suggestions?: unknown[] };
    expect(payload.source).toBe("gemini");
    expect(Array.isArray(payload.suggestions)).toBe(true);
    expect(payload.suggestions).toHaveLength(0);
  });
});