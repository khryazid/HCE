import { describe, expect, it } from "vitest";
import { buildConsultationPayload, buildConsultationSuccessMessage } from "@/lib/consultations/wizard-payload";
import type { ConsultationPayloadInput } from "@/lib/consultations/wizard-payload";

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<ConsultationPayloadInput> = {}): ConsultationPayloadInput {
  return {
    tenant: { clinicId: "clinic-1", doctorId: "doc-1" },
    patientId: "patient-1",
    specialtyKind: "medicina-general",
    entryMode: "consulta",
    linkedRecordId: "",
    chiefComplaint: "Cefalea intensa",
    anamnesis: "Inicio brusco hace 2h",
    symptoms: "Fotofobia, fonofobia",
    medicalHistory: "",
    backgrounds: { pathological: "", surgical: "", allergic: "", pharmacological: "", family: "", toxic: "", gynecoObstetric: "" },
    vitalSigns: { bloodPressure: "130/85", heartRate: "72", respiratoryRate: "16", temperature: "36.5", oxygenSaturation: "98", weight: "70", height: "1.70" },
    physicalExam: "Sin focalidad neurológica",
    diagnosis: "Migraña sin aura",
    clinicalAnalysis: "",
    treatmentTemplateId: "",
    treatmentPlan: "Ibuprofeno 400mg",
    recommendations: "",
    warningSigns: "",
    evolutionStatus: "",
    nextFollowUpDate: "",
    patientSnapshot: { gender: "M", occupation: "Ingeniero", insurance: "IESS" },
    fallbackTreatmentPlan: "Paracetamol 500mg",
    timestamp: "2026-04-27T10:00:00.000Z",
    recordId: "rec-uuid-1",
    specialtyId: "spec-uuid-1",
    cieCodes: "G43, R51",
    ...overrides,
  };
}

// ─── buildConsultationPayload ─────────────────────────────────────────────────

describe("buildConsultationPayload — record structure", () => {
  it("uses treatmentPlan when not empty", () => {
    const { record } = buildConsultationPayload(makeInput({ treatmentPlan: "Plan A" }));
    const data = record.specialty_data as Record<string, unknown>;
    expect(data.treatment_plan).toBe("Plan A");
  });

  it("falls back to fallbackTreatmentPlan when treatmentPlan is empty", () => {
    const { record } = buildConsultationPayload(
      makeInput({ treatmentPlan: "", fallbackTreatmentPlan: "Plan Fallback" }),
    );
    const data = record.specialty_data as Record<string, unknown>;
    expect(data.treatment_plan).toBe("Plan Fallback");
  });

  it("normalizes CIE codes from comma-separated string to array", () => {
    const { record } = buildConsultationPayload(makeInput({ cieCodes: "G43, R51, K30" }));
    expect(record.cie_codes).toEqual(["G43", "R51", "K30"]);
  });

  it("produces empty cie_codes for empty cieCodes string", () => {
    const { record } = buildConsultationPayload(makeInput({ cieCodes: "" }));
    expect(record.cie_codes).toEqual([]);
  });

  it("sets linked_record_id to null in consulta mode", () => {
    const { record } = buildConsultationPayload(
      makeInput({ entryMode: "consulta", linkedRecordId: "old-record" }),
    );
    const data = record.specialty_data as Record<string, unknown>;
    expect(data.linked_record_id).toBeNull();
  });

  it("sets linked_record_id in seguimiento mode", () => {
    const { record } = buildConsultationPayload(
      makeInput({ entryMode: "seguimiento", linkedRecordId: "prev-record-id" }),
    );
    const data = record.specialty_data as Record<string, unknown>;
    expect(data.linked_record_id).toBe("prev-record-id");
  });

  it("trims chiefComplaint and falls back to default if empty", () => {
    const { record } = buildConsultationPayload(makeInput({ chiefComplaint: "   " }));
    expect(record.chief_complaint).toBe("Consulta médica");
  });

  it("sets correct tenant and patient ids", () => {
    const { record, specialtyRow } = buildConsultationPayload(makeInput());
    expect(record.clinic_id).toBe("clinic-1");
    expect(record.doctor_id).toBe("doc-1");
    expect(record.patient_id).toBe("patient-1");
    expect(specialtyRow.clinical_record_id).toBe("rec-uuid-1");
    expect(specialtyRow.specialty_kind).toBe("medicina-general");
  });

  it("includes patient_snapshot in specialty_data", () => {
    const { record } = buildConsultationPayload(makeInput());
    const data = record.specialty_data as Record<string, unknown>;
    const snapshot = data.patient_snapshot as Record<string, unknown>;
    expect(snapshot.gender).toBe("M");
    expect(snapshot.occupation).toBe("Ingeniero");
    expect(snapshot.insurance).toBe("IESS");
  });

  it("sets schema_version 3 in specialty_data", () => {
    const { record } = buildConsultationPayload(makeInput());
    const data = record.specialty_data as Record<string, unknown>;
    expect(data.schema_version).toBe(3);
  });
});

// ─── buildConsultationSuccessMessage ─────────────────────────────────────────

describe("buildConsultationSuccessMessage", () => {
  it("returns seguimiento+pdf message", () => {
    const msg = buildConsultationSuccessMessage({ entryMode: "seguimiento", generatedPdf: true });
    expect(msg).toContain("Seguimiento");
    expect(msg).toContain("PDF");
  });

  it("returns consulta+pdf message", () => {
    const msg = buildConsultationSuccessMessage({ entryMode: "consulta", generatedPdf: true });
    expect(msg).toContain("Consulta");
    expect(msg).toContain("PDF");
  });

  it("returns seguimiento without pdf message", () => {
    const msg = buildConsultationSuccessMessage({ entryMode: "seguimiento", generatedPdf: false });
    expect(msg).toContain("Seguimiento");
    expect(msg).toContain("sin generar");
  });

  it("returns consulta without pdf message", () => {
    const msg = buildConsultationSuccessMessage({ entryMode: "consulta", generatedPdf: false });
    expect(msg).toContain("Consulta");
    expect(msg).toContain("sin generar");
  });
});
