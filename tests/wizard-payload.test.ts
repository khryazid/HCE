import { describe, expect, it } from "vitest";
import {
  buildConsultationPayload,
  buildConsultationSuccessMessage,
} from "@/lib/consultations/wizard-payload";

describe("wizard payload helpers", () => {
  it("builds the clinical payload bundle from wizard state", () => {
    const bundle = buildConsultationPayload({
      tenant: { clinicId: "clinic-1", doctorId: "doctor-1" },
      patientId: "patient-1",
      specialtyKind: "medicina-general",
      entryMode: "seguimiento",
      linkedRecordId: "record-9",
      chiefComplaint: "Dolor de cabeza",
      anamnesis: "Inicio agudo",
      symptoms: "Cefalea",
      medicalHistory: "Sin antecedentes",
      backgrounds: {
        pathological: "",
        surgical: "",
        allergic: "",
        pharmacological: "",
        family: "",
        toxic: "",
        gynecoObstetric: "",
      },
      vitalSigns: {
        bloodPressure: "120/80",
        heartRate: "80",
        respiratoryRate: "18",
        temperature: "36.6",
        oxygenSaturation: "98",
        weight: "70",
        height: "170",
      },
      physicalExam: "Normal",
      diagnosis: "Migraña",
      clinicalAnalysis: "Compatible con cefalea primaria",
      treatmentTemplateId: "template-1",
      treatmentPlan: "",
      recommendations: "Reposo",
      warningSigns: "Alertas",
      evolutionStatus: "Mejoría",
      nextFollowUpDate: "2026-05-01",
      patientSnapshot: {
        gender: "F",
        occupation: "Docente",
        insurance: "IESS",
      },
      fallbackTreatmentPlan: "Tratamiento previo",
      timestamp: "2026-04-27T10:00:00.000Z",
      recordId: "record-1",
      specialtyId: "specialty-1",
      cieCodes: "A01, B02, A01",
    });

    expect(bundle.record.cie_codes).toEqual(["A01", "B02", "A01"]);
    expect(bundle.record.specialty_data).toMatchObject({
      treatment_plan: "Tratamiento previo",
      linked_record_id: "record-9",
    });
    expect(bundle.specialtyRow.clinical_record_id).toBe("record-1");
  });

  it("builds a readable success message per mode", () => {
    expect(
      buildConsultationSuccessMessage({
        entryMode: "consulta",
        generatedPdf: true,
      }),
    ).toBe("Consulta guardada con flujo guiado y PDF generado.");
    expect(
      buildConsultationSuccessMessage({
        entryMode: "seguimiento",
        generatedPdf: false,
      }),
    ).toBe("Seguimiento guardado sin generar PDF.");
  });
});