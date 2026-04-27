import { describe, expect, it } from "vitest";
import { CIE_CATALOG } from "@/lib/constants/cie-catalog";
import {
  buildCatalogSuggestions,
  buildCieSuggestionPrompt,
  extractGeminiSuggestions,
  mergeCieCodeList,
} from "@/lib/ai/cie-suggestions";

describe("cie suggestions", () => {
  it("merges cie codes without duplicates", () => {
    expect(mergeCieCodeList("A09, K30", "k30")).toBe("A09, K30");
    expect(mergeCieCodeList("", "a09")).toBe("A09");
  });

  it("builds a prompt without catalog restrictions", () => {
    const prompt = buildCieSuggestionPrompt(
      {
        diagnosis: "cefalea",
        symptoms: "dolor de cabeza",
        anamnesis: "inicio agudo",
        specialtyKind: "medicina-general",
      }
    );

    expect(prompt).toContain("Asegúrate de que los códigos pertenezcan a la nomenclatura CIE-10 real");
  });

  it("extracts gemini output correctly without filtering by catalog", () => {
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

  it("creates local catalog suggestions", () => {
    const suggestions = buildCatalogSuggestions(CIE_CATALOG.slice(0, 2), "Catalogo local");

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]?.source).toBe("catalog");
  });
});
