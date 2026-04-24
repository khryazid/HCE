import { describe, expect, it } from "vitest";
import { buildPdfLines } from "@/lib/consultations/pdf";

describe("pdf export payload", () => {
  it("builds printable lines with letterhead", () => {
    const lines = buildPdfLines(
      {
        doctor_name: "Dra. Andrea Perez",
        professional_title: "Medico Especialista",
        specialties: "Medicina Interna",
        address: "Av. Clinica 123",
        phone_primary: "099111222",
        phone_secondary: "022334455",
        contact_email: "medica@correo.com",
      },
      {
        patientName: "Carlos Rios",
        patientDocument: "0102030405",
        consultationDate: "16/04/2026",
        anamnesis: "Dolor abdominal",
        symptoms: "Nauseas",
        diagnosis: "Gastroenteritis",
        cieCodes: ["A09"],
        treatmentPlan: "Hidratacion y dieta",
        specialtyKind: "medicina-general",
      },
    );

    expect(lines.join("\n")).toContain("Carlos Rios");
    expect(lines.join("\n")).toContain("A09");
    expect(lines.join("\n")).toContain("Dra. Andrea Perez");
  });
});
