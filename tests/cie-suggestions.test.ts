import { describe, expect, it } from "vitest";
import {
  buildCieSuggestionPrompt,
  extractGeminiSuggestions,
  mergeCieCodeList,
} from "@/features/consultations/lib/ai/cie-suggestions";

describe("cie suggestions", () => {
  it("merges cie codes without duplicates", () => {
    expect(mergeCieCodeList("A09, K30", "k30")).toBe("A09, K30");
    expect(mergeCieCodeList("", "a09")).toBe("A09");
  });

  it("builds a prompt with specialty context", () => {
    const prompt = buildCieSuggestionPrompt({
      diagnosis: "cefalea",
      symptoms: "dolor de cabeza",
      anamnesis: "inicio agudo",
      specialtyKind: "Neurología",
    });

    expect(prompt).toContain("Asegúrate de que los códigos pertenezcan a la nomenclatura CIE-11 real");
    expect(prompt).toContain("Neurología");
  });

  it("extracts gemini output correctly", () => {
    const suggestions = extractGeminiSuggestions(
      JSON.stringify([
        { code: "A09", rationale: "Coincide", confidence: 0.8 },
        { code: "ZZZ", rationale: "No valido", confidence: 0.9 },
      ])
    );

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]?.code).toBe("A09");
    expect(suggestions[1]?.code).toBe("ZZZ");
    expect(suggestions[0]?.source).toBe("gemini");
  });
});
