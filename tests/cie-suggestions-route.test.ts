import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetUser,
  mockFetch,
  mockIsRateLimited,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFetch: vi.fn(),
  mockIsRateLimited: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

vi.mock("@/lib/ai/cie-rate-limit", () => ({
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
    const response = await POST(
      buildRequest({ diagnosis: "cefalea", symptoms: "dolor de cabeza", anamnesis: "inicio agudo" }),
    );

    expect(response.status).toBe(401);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("rejects requests when Supabase credentials are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await POST(
      buildRequest(
        { diagnosis: "cefalea", symptoms: "dolor de cabeza", anamnesis: "inicio agudo" },
        "token-missing-env",
      ),
    );

    expect(response.status).toBe(401);
    expect(mockGetUser).not.toHaveBeenCalled();
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

  it("returns 503 when Gemini is configured but unavailable", async () => {
    process.env.GEMINI_API_KEY = "gemini-key";
    mockGetUser.mockResolvedValue({
      data: { user: { id: "doctor-gemini" } },
      error: null,
    });
    mockFetch.mockResolvedValue({ ok: false });

    const response = await POST(
      buildRequest(
        { diagnosis: "cefalea", symptoms: "dolor de cabeza", anamnesis: "inicio agudo" },
        "token-gemini",
      ),
    );

    expect(response.status).toBe(503);

    const payload = (await response.json()) as { source?: string; error?: string };
    expect(payload.source).toBe("catalog");
    expect(payload.error).toBe("Gemini unavailable");
  });
});