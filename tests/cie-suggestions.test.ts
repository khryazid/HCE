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

  it("builds a prompt with allowed codes", () => {
    const prompt = buildCieSuggestionPrompt(
      {
        diagnosis: "cefalea",
        symptoms: "dolor de cabeza",
        anamnesis: "inicio agudo",
        specialtyKind: "medicina-general",
      },
      CIE_CATALOG.slice(0, 2),
    );

    expect(prompt).toContain("Usa solo los codigos de la lista permitida.");
    expect(prompt).toContain("A09");
  });

  it("filters gemini output to known catalog codes", () => {
    const suggestions = extractGeminiSuggestions(
      JSON.stringify([
        { code: "A09", rationale: "Coincide", confidence: 0.8 },
        { code: "ZZZ", rationale: "No valido", confidence: 0.9 },
      ]),
      CIE_CATALOG,
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.code).toBe("A09");
    expect(suggestions[0]?.source).toBe("gemini");
  });

  it("creates local catalog suggestions", () => {
    const suggestions = buildCatalogSuggestions(CIE_CATALOG.slice(0, 2), "Catalogo local");

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]?.source).toBe("catalog");
  });
});
