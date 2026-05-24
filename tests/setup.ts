import { vi } from "vitest";
import "@testing-library/jest-dom";

process.env.GEMINI_API_KEY = "dummy-key-for-vitest";
process.env.STRIPE_SECRET_KEY = "dummy-stripe-key";
process.env.STRIPE_WEBHOOK_SECRET = "dummy-webhook-secret";
process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy-service-key";

// Mock global de @google/genai para evitar consumos o fallos en CI
export const mockGenerateContent = vi.fn().mockResolvedValue({
  text: JSON.stringify([
    { code: "A09", rationale: "Mocked rationale", confidence: 0.9 },
  ]),
});

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
      };
    },
  };
});
