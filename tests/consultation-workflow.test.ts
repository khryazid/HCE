import { describe, expect, it } from "vitest";
import { ensureWizardStep, normalizeCommaValues } from "@/lib/consultations/workflow";

describe("consultation workflow helpers", () => {
  it("normalizes CIE comma values", () => {
    expect(normalizeCommaValues("A09, K30, , I10")).toEqual(["A09", "K30", "I10"]);
  });

  it("clamps wizard step bounds", () => {
    expect(ensureWizardStep(-2)).toBe(1);
    expect(ensureWizardStep(3)).toBe(3);
    expect(ensureWizardStep(9)).toBe(4);
  });
});
