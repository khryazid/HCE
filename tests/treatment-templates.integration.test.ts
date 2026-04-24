import { describe, expect, it } from "vitest";
import { buildNextTemplate } from "@/lib/local-data/treatments";

describe("treatment templates versioning", () => {
  it("creates template version 1 then updates to version 2", () => {
    const base = buildNextTemplate(
      {
        doctor_id: "doctor-1",
        clinic_id: "clinic-1",
        trigger: "hipertension",
        title: "HTA inicial",
        treatment: "Control de presion y dieta",
      },
      undefined,
      "2026-04-16T00:00:00.000Z",
    );

    const updated = buildNextTemplate(
      {
        doctor_id: "doctor-1",
        clinic_id: "clinic-1",
        trigger: "hipertension",
        title: "HTA inicial",
        treatment: "Control de presion, dieta y seguimiento quincenal",
      },
      base,
      "2026-04-17T00:00:00.000Z",
    );

    expect(base.current_version).toBe(1);
    expect(updated.current_version).toBe(2);
    expect(updated.versions).toHaveLength(2);
    expect(updated.versions[1].notes).toContain("seguimiento quincenal");
  });
});
