import { describe, expect, it } from "vitest";
import {
  buildAutofillFormStatePatch,
  buildDeepLinkFollowUpFormState,
  buildPendingFollowUp,
  buildTimelineRows,
  findLatestPatientRecord,
  listPatientRecordsByUpdatedAt,
  type DeepLinkFollowUpEditableFields,
} from "@/lib/consultations/wizard-domain";
import type { ClinicalRecordRecord } from "@/types/consultation";

function buildRecord(): ClinicalRecordRecord {
  return {
    id: "record-1",
    clinic_id: "clinic-1",
    doctor_id: "doctor-1",
    patient_id: "patient-1",
    chief_complaint: "Dolor abdominal",
    cie_codes: ["A09", "K30"],
    specialty_kind: "medicina-general",
    specialty_data: {
      diagnosis: "Gastroenteritis",
      symptoms: "Dolor abdominal",
      treatment_plan: "Hidratacion oral",
    },
    created_at: "2026-04-27T10:00:00.000Z",
    updated_at: "2026-04-27T10:00:00.000Z",
  };
}

describe("wizard domain deep-link helper", () => {
  it("builds follow-up form state from linked record", () => {
    const initialState: DeepLinkFollowUpEditableFields = {
      entryMode: "consulta",
      patientId: "",
      linkedRecordId: "",
      diagnosis: "",
      symptoms: "",
      chiefComplaint: "",
      anamnesis: "",
      treatmentPlan: "",
      cieCodes: "",
      specialtyKind: "medicina-general",
    };

    const nextState = buildDeepLinkFollowUpFormState(initialState, {
      patientId: "patient-1",
      record: buildRecord(),
    });

    expect(nextState.entryMode).toBe("seguimiento");
    expect(nextState.patientId).toBe("patient-1");
    expect(nextState.linkedRecordId).toBe("record-1");
    expect(nextState.chiefComplaint).toBe("Control de seguimiento");
    expect(nextState.diagnosis).toBe("Gastroenteritis");
    expect(nextState.treatmentPlan).toBe("Hidratacion oral");
    expect(nextState.cieCodes).toBe("A09, K30");
  });

  it("finds the latest record for a patient by updated_at", () => {
    const older = buildRecord();
    older.id = "record-old";
    older.updated_at = "2026-04-26T08:00:00.000Z";

    const newer = buildRecord();
    newer.id = "record-new";
    newer.updated_at = "2026-04-27T08:00:00.000Z";

    const latest = findLatestPatientRecord([older, newer], "patient-1");

    expect(latest?.id).toBe("record-new");
  });

  it("builds autofill patch from latest record", () => {
    const record = buildRecord();
    record.specialty_data = {
      ...record.specialty_data,
      medical_history: "Asma",
      patient_snapshot: {
        gender: "F",
        occupation: "Docente",
        insurance: "IESS",
      },
      backgrounds: {
        pathological: "Asma",
        family: "HTA",
      },
    };

    const patch = buildAutofillFormStatePatch(record);

    expect(patch.gender).toBe("F");
    expect(patch.occupation).toBe("Docente");
    expect(patch.medicalHistory).toBe("Asma");
    expect(patch.backgrounds.pathological).toBe("Asma");
    expect(patch.backgrounds.family).toBe("HTA");
    expect(patch.backgrounds.surgical).toBe("");
  });

  it("returns empty autofill patch when no record exists", () => {
    const patch = buildAutofillFormStatePatch(null);

    expect(patch.gender).toBe("");
    expect(patch.medicalHistory).toBe("");
    expect(patch.backgrounds).toEqual({
      pathological: "",
      surgical: "",
      allergic: "",
      pharmacological: "",
      family: "",
      toxic: "",
      gynecoObstetric: "",
    });
  });

  it("sorts patient records by updated_at descending", () => {
    const older = buildRecord();
    older.id = "record-a";
    older.updated_at = "2026-04-26T08:00:00.000Z";

    const newer = buildRecord();
    newer.id = "record-b";
    newer.updated_at = "2026-04-27T08:00:00.000Z";

    const sorted = listPatientRecordsByUpdatedAt([older, newer], "patient-1");

    expect(sorted.map((item) => item.id)).toEqual(["record-b", "record-a"]);
  });

  it("builds timeline rows from selected or fallback patient", () => {
    const patientA = buildRecord();
    patientA.id = "record-a";
    patientA.patient_id = "patient-a";

    const patientB = buildRecord();
    patientB.id = "record-b";
    patientB.patient_id = "patient-b";

    const selectedRows = buildTimelineRows(
      [patientA, patientB],
      "patient-b",
      "patient-a",
    );
    const fallbackRows = buildTimelineRows([patientA, patientB], "", "patient-a");

    expect(selectedRows.map((item) => item.id)).toEqual(["record-b"]);
    expect(fallbackRows.map((item) => item.id)).toEqual(["record-a"]);
  });

  it("builds pending follow-up from latest record", () => {
    const record = buildRecord();
    record.specialty_data = {
      diagnosis: "Gastroenteritis",
      treatment_plan: "Hidratacion oral",
      next_follow_up_date: "2026-04-28",
    };

    const pending = buildPendingFollowUp(
      record,
      new Date("2026-04-27T12:00:00.000Z").getTime(),
    );

    expect(pending?.recordId).toBe("record-1");
    expect(pending?.diagnosis).toBe("Gastroenteritis");
    expect(pending?.isOverdue).toBe(false);
  });

  it("returns null pending follow-up when follow-up date is missing", () => {
    const record = buildRecord();
    record.specialty_data = {
      diagnosis: "Gastroenteritis",
    };

    expect(buildPendingFollowUp(record)).toBeNull();
  });
});
