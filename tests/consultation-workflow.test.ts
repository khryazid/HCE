import { describe, expect, it } from "vitest";
import { normalizeCommaValues } from "@/features/consultations/lib/workflow";

describe("consultation workflow helpers", () => {
  it("normalizes CIE comma values", () => {
    expect(normalizeCommaValues("A09, K30, , I10")).toEqual(["A09", "K30", "I10"]);
  });

  it("filters empty entries", () => {
    expect(normalizeCommaValues("  ,  , A01")).toEqual(["A01"]);
  });
});
