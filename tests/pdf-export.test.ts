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
        gender: "Masculino",
        occupation: "Empleado",
        insurance: "IESS",
        chiefComplaint: "Dolor abdominal",
        anamnesis: "Dolor abdominal de 2 días de evolución",
        medicalHistory: "Ninguno",
        vitalSigns: {
          bloodPressure: "120/80",
          heartRate: "80",
          respiratoryRate: "16",
          temperature: "36.5",
          oxygenSaturation: "98",
          weight: "70",
          height: "1.75",
        },
        physicalExam: "Abdomen blando depresible doloroso",
        diagnosis: "Gastroenteritis",
        cieCodes: ["A09"],
        clinicalAnalysis: "Cuadro compatible con GEA",
        treatmentPlan: "Hidratacion y dieta",
        recommendations: "Reposo relativo",
        warningSigns: "Fiebre persistente",
        specialtyKind: "medicina-general",
      },
    );

    expect(lines.join("\n")).toContain("Carlos Rios");
    expect(lines.join("\n")).toContain("A09");
    expect(lines.join("\n")).toContain("Dra. Andrea Perez");
  });
});
