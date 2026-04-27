import { describe, expect, it } from "vitest";
import { buildConsultationPdfPreviewData } from "@/lib/consultations/pdf-preview";

describe("pdf preview builder", () => {
  it("normalizes cie codes into an array for printable previews", () => {
    const preview = buildConsultationPdfPreviewData({
      patientName: "Carlos Rios",
      patientDocument: "0102030405",
      consultationDate: "27/04/2026 10:00",
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
      physicalExam: "Abdomen blando",
      diagnosis: "Gastroenteritis",
      cieCodes: "A09,  K30",
      clinicalAnalysis: "Cuadro compatible con GEA",
      treatmentPlan: "Hidratacion",
      recommendations: "Reposo relativo",
      warningSigns: "Fiebre persistente",
      specialtyKind: "medicina-general",
    });

    expect(preview.cieCodes).toEqual(["A09", "K30"]);
    expect(preview.patientName).toBe("Carlos Rios");
  });
});