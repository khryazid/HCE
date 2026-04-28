import { describe, expect, it } from "vitest";
import {
  validateWizardForm,
  buildQuickPatientRecord,
  buildFollowUpFormState,
  buildConsultaModeFormState,
  type WizardValidationInput,
  type FollowUpEditableFields,
} from "@/lib/consultations/wizard-domain";
import type { ClinicalRecordRecord } from "@/types/consultation";

// ─── Factories ────────────────────────────────────────────────────────────────

function makeValidConsultaInput(): WizardValidationInput {
  return {
    patientId: "patient-1",
    entryMode: "consulta",
    chiefComplaint: "Dolor de cabeza",
    diagnosis: "Migraña",
    treatmentPlan: "Paracetamol 500mg",
    evolutionStatus: "",
  };
}

function makeValidSeguimientoInput(): WizardValidationInput {
  return {
    patientId: "patient-1",
    entryMode: "seguimiento",
    chiefComplaint: "",
    diagnosis: "Migraña",
    treatmentPlan: "",
    evolutionStatus: "Mejora progresiva",
  };
}

function makeRecord(overrides: Partial<ClinicalRecordRecord> = {}): ClinicalRecordRecord {
  return {
    id: "record-1",
    clinic_id: "clinic-1",
    doctor_id: "doc-1",
    patient_id: "patient-1",
    chief_complaint: "Dolor de cabeza",
    cie_codes: ["G43", "R51"],
    specialty_kind: "medicina-general",
    specialty_data: {
      diagnosis: "Migraña crónica",
      symptoms: "Fotofobia",
      treatment_plan: "Sumatriptán 50mg",
    },
    created_at: "2026-04-20T10:00:00.000Z",
    updated_at: "2026-04-20T10:00:00.000Z",
    ...overrides,
  };
}

// ─── validateWizardForm ───────────────────────────────────────────────────────

describe("validateWizardForm", () => {
  it("returns no errors for valid consulta input", () => {
    const errors = validateWizardForm(makeValidConsultaInput());
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("returns no errors for valid seguimiento input", () => {
    const errors = validateWizardForm(makeValidSeguimientoInput());
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("requires patientId", () => {
    const errors = validateWizardForm({ ...makeValidConsultaInput(), patientId: "" });
    expect(errors.patientId).toBeDefined();
  });

  it("requires chiefComplaint for consulta mode", () => {
    const errors = validateWizardForm({ ...makeValidConsultaInput(), chiefComplaint: "" });
    expect(errors.chiefComplaint).toBeDefined();
  });

  it("does NOT require chiefComplaint for seguimiento mode", () => {
    const errors = validateWizardForm({ ...makeValidSeguimientoInput(), chiefComplaint: "" });
    expect(errors.chiefComplaint).toBeUndefined();
  });

  it("requires diagnosis in both modes", () => {
    const consultaErrors = validateWizardForm({ ...makeValidConsultaInput(), diagnosis: "" });
    const seguimientoErrors = validateWizardForm({ ...makeValidSeguimientoInput(), diagnosis: "" });
    expect(consultaErrors.diagnosis).toBeDefined();
    expect(seguimientoErrors.diagnosis).toBeDefined();
  });

  it("requires treatmentPlan for consulta mode", () => {
    const errors = validateWizardForm({ ...makeValidConsultaInput(), treatmentPlan: "" });
    expect(errors.treatmentPlan).toBeDefined();
  });

  it("does NOT require treatmentPlan for seguimiento mode", () => {
    const errors = validateWizardForm({ ...makeValidSeguimientoInput(), treatmentPlan: "" });
    expect(errors.treatmentPlan).toBeUndefined();
  });

  it("requires evolutionStatus for seguimiento mode", () => {
    const errors = validateWizardForm({ ...makeValidSeguimientoInput(), evolutionStatus: "" });
    expect(errors.evolutionStatus).toBeDefined();
  });

  it("does NOT require evolutionStatus for consulta mode", () => {
    const errors = validateWizardForm({ ...makeValidConsultaInput(), evolutionStatus: "" });
    expect(errors.evolutionStatus).toBeUndefined();
  });

  it("whitespace-only fields are treated as empty", () => {
    const errors = validateWizardForm({
      ...makeValidConsultaInput(),
      chiefComplaint: "   ",
      diagnosis: "   ",
      treatmentPlan: "   ",
    });
    expect(errors.chiefComplaint).toBeDefined();
    expect(errors.diagnosis).toBeDefined();
    expect(errors.treatmentPlan).toBeDefined();
  });
});

// ─── buildQuickPatientRecord ──────────────────────────────────────────────────

describe("buildQuickPatientRecord", () => {
  const tenant = { doctor_id: "doc-1", clinic_id: "clinic-1" };
  const timestamp = "2026-04-27T10:00:00.000Z";

  it("builds a patient with correct full_name from firstName + lastName", () => {
    const patient = buildQuickPatientRecord(
      { documentNumber: "1234567890", firstName: "Ana", lastName: "García", birthDate: "1990-05-10" },
      tenant,
      timestamp,
      "uuid-1",
    );
    expect(patient.full_name).toBe("Ana García");
    expect(patient.document_number).toBe("1234567890");
    expect(patient.status).toBe("activo");
    expect(patient.id).toBe("uuid-1");
    expect(patient.birth_date).toBe("1990-05-10");
  });

  it("trims whitespace from firstName and lastName", () => {
    const patient = buildQuickPatientRecord(
      { documentNumber: "  0001  ", firstName: "  Luis  ", lastName: "  Pérez  ", birthDate: "" },
      tenant,
      timestamp,
      "uuid-2",
    );
    expect(patient.full_name).toBe("Luis Pérez");
    expect(patient.document_number).toBe("0001");
  });

  it("sets birth_date to null when empty string", () => {
    const patient = buildQuickPatientRecord(
      { documentNumber: "0001", firstName: "X", lastName: "Y", birthDate: "" },
      tenant,
      timestamp,
      "uuid-3",
    );
    expect(patient.birth_date).toBeNull();
  });

  it("assigns clinic_id and doctor_id from tenant", () => {
    const patient = buildQuickPatientRecord(
      { documentNumber: "0001", firstName: "X", lastName: "Y", birthDate: "" },
      tenant,
      timestamp,
      "uuid-4",
    );
    expect(patient.clinic_id).toBe("clinic-1");
    expect(patient.doctor_id).toBe("doc-1");
  });
});

// ─── buildFollowUpFormState ───────────────────────────────────────────────────

describe("buildFollowUpFormState", () => {
  function makeCurrentForm(): FollowUpEditableFields {
    return {
      entryMode: "consulta",
      linkedRecordId: "",
      diagnosis: "",
      symptoms: "",
      anamnesis: "",
      treatmentPlan: "",
      cieCodes: "",
    };
  }

  it("sets entryMode to seguimiento when record is null", () => {
    const result = buildFollowUpFormState(makeCurrentForm(), null);
    expect(result.entryMode).toBe("seguimiento");
    expect(result.linkedRecordId).toBe("");
  });

  it("populates from record when provided", () => {
    const record = makeRecord();
    const result = buildFollowUpFormState(makeCurrentForm(), record);

    expect(result.entryMode).toBe("seguimiento");
    expect(result.linkedRecordId).toBe("record-1");
    expect(result.diagnosis).toBe("Migraña crónica");
    expect(result.symptoms).toBe("Fotofobia");
    expect(result.treatmentPlan).toBe("Sumatriptán 50mg");
    expect(result.cieCodes).toBe("G43, R51");
  });

  it("preserves existing current values over record values", () => {
    const record = makeRecord();
    const current: FollowUpEditableFields = {
      ...makeCurrentForm(),
      diagnosis: "Diagnóstico actualizado",
      symptoms: "Síntomas actualizados",
    };
    const result = buildFollowUpFormState(current, record);

    // Current values should win over record
    expect(result.diagnosis).toBe("Diagnóstico actualizado");
    expect(result.symptoms).toBe("Síntomas actualizados");
    // Record values fill empty fields
    expect(result.treatmentPlan).toBe("Sumatriptán 50mg");
  });

  it("sets anamnesis as seguimiento prefix when current anamnesis is empty", () => {
    const result = buildFollowUpFormState(makeCurrentForm(), makeRecord());
    expect(result.anamnesis).toContain("Seguimiento de");
    expect(result.anamnesis).toContain("Migraña crónica");
  });
});

// ─── buildConsultaModeFormState ───────────────────────────────────────────────

describe("buildConsultaModeFormState", () => {
  it("sets entryMode to consulta and clears linkedRecordId", () => {
    const current: FollowUpEditableFields = {
      entryMode: "seguimiento",
      linkedRecordId: "old-record-id",
      diagnosis: "Algo",
      symptoms: "",
      anamnesis: "",
      treatmentPlan: "",
      cieCodes: "",
    };

    const result = buildConsultaModeFormState(current);

    expect(result.entryMode).toBe("consulta");
    expect(result.linkedRecordId).toBe("");
    // Other fields should be preserved
    expect(result.diagnosis).toBe("Algo");
  });
});
