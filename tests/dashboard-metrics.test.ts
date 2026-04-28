import { describe, it, expect } from "vitest";
import {
  calculateAge,
  getLast7DaysConsultations,
  getSpecialtyBreakdown,
  calculateMetrics,
  buildActivityFeed,
} from "@/lib/dashboard/metrics";
import type { ClinicalRecordRecord } from "@/types/consultation";
import type { PatientRecord } from "@/types/patient";

// ─── Factories ────────────────────────────────────────────────────────────────

function makeRecord(overrides: Partial<ClinicalRecordRecord> = {}): ClinicalRecordRecord {
  return {
    id: "rec-1",
    clinic_id: "clinic-1",
    doctor_id: "doc-1",
    patient_id: "patient-1",
    chief_complaint: "Dolor de cabeza",
    cie_codes: ["R51"],
    specialty_kind: "medicina-general",
    specialty_data: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makePatient(overrides: Partial<PatientRecord> = {}): PatientRecord {
  return {
    id: "patient-1",
    clinic_id: "clinic-1",
    doctor_id: "doc-1",
    document_number: "0000000001",
    full_name: "Juan Pérez",
    birth_date: "1990-01-15",
    status: "activo",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── calculateAge ─────────────────────────────────────────────────────────────

describe("calculateAge", () => {
  it("returns 'Edad no registrada' for null", () => {
    expect(calculateAge(null)).toBe("Edad no registrada");
  });

  it("calculates correct age in años", () => {
    const birth = new Date();
    birth.setFullYear(birth.getFullYear() - 35);
    const result = calculateAge(birth.toISOString().slice(0, 10));
    expect(result).toBe("35 años");
  });

  it("returns 0 años for a birth date today", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(calculateAge(today)).toBe("0 años");
  });
});

// ─── getLast7DaysConsultations ────────────────────────────────────────────────

describe("getLast7DaysConsultations", () => {
  it("returns 7 slots regardless of records", () => {
    const result = getLast7DaysConsultations([], new Date("2026-01-10"));
    expect(result).toHaveLength(7);
  });

  it("counts today's consultations correctly", () => {
    const today = new Date("2026-01-10");
    const todayIso = "2026-01-10T10:00:00.000Z";
    const records = [
      makeRecord({ created_at: todayIso }),
      makeRecord({ created_at: todayIso }),
    ];

    const result = getLast7DaysConsultations(records, today);
    const lastSlot = result[result.length - 1];
    expect(lastSlot.total).toBe(2);
  });

  it("ignores records older than 7 days", () => {
    const today = new Date("2026-01-10");
    const records = [makeRecord({ created_at: "2026-01-01T10:00:00.000Z" })];
    const result = getLast7DaysConsultations(records, today);
    expect(result.every((slot) => slot.total === 0)).toBe(true);
  });
});

// ─── getSpecialtyBreakdown ───────────────────────────────────────────────────

describe("getSpecialtyBreakdown", () => {
  it("returns empty array for no records", () => {
    expect(getSpecialtyBreakdown([])).toEqual([]);
  });

  it("computes percentages correctly", () => {
    const records = [
      makeRecord({ specialty_kind: "medicina-general" }),
      makeRecord({ specialty_kind: "medicina-general" }),
      makeRecord({ specialty_kind: "pediatria" }),
    ];
    const result = getSpecialtyBreakdown(records);
    expect(result[0].specialty).toBe("medicina-general");
    expect(result[0].total).toBe(2);
    expect(result[0].percentage).toBe(67);
    expect(result[1].specialty).toBe("pediatria");
    expect(result[1].percentage).toBe(33);
  });

  it("sorts by total descending", () => {
    const records = [
      makeRecord({ specialty_kind: "odontologia" }),
      makeRecord({ specialty_kind: "medicina-general" }),
      makeRecord({ specialty_kind: "medicina-general" }),
    ];
    const result = getSpecialtyBreakdown(records);
    expect(result[0].specialty).toBe("medicina-general");
  });
});

// ─── calculateMetrics ────────────────────────────────────────────────────────

describe("calculateMetrics", () => {
  const today = new Date("2026-01-10T12:00:00.000Z");
  today.setHours(0, 0, 0, 0);

  it("counts active patients", () => {
    const patients = [makePatient(), makePatient({ id: "p2", document_number: "0002" })];
    const result = calculateMetrics(patients, [], { conflicted: 0, failedOrAbandoned: 0 }, today);
    expect(result.activePatients).toBe(2);
  });

  it("counts consultations today correctly", () => {
    const records = [
      makeRecord({ created_at: "2026-01-10T10:00:00.000Z" }),
      makeRecord({ created_at: "2026-01-09T23:59:00.000Z" }), // yesterday
    ];
    const result = calculateMetrics([], records, { conflicted: 0, failedOrAbandoned: 0 }, today);
    expect(result.consultationsToday).toBe(1);
  });

  it("counts incomplete records (no CIE or empty complaint)", () => {
    const records = [
      makeRecord({ cie_codes: [], chief_complaint: "Algo" }), // missing CIE
      makeRecord({ cie_codes: ["R51"], chief_complaint: "" }), // empty complaint
      makeRecord({ cie_codes: ["R51"], chief_complaint: "Normal" }), // complete
    ];
    const result = calculateMetrics([], records, { conflicted: 0, failedOrAbandoned: 0 }, today);
    expect(result.incompleteRecords).toBe(2);
  });

  it("passes sync stats from queueStats", () => {
    const result = calculateMetrics([], [], { conflicted: 2, failedOrAbandoned: 3 }, today);
    expect(result.conflictedSyncItems).toBe(2);
    expect(result.failedSyncItems).toBe(3);
  });
});

// ─── buildActivityFeed ───────────────────────────────────────────────────────

describe("buildActivityFeed", () => {
  it("returns at most 5 patients", () => {
    const patients = Array.from({ length: 8 }, (_, i) =>
      makePatient({ id: `p${i}`, document_number: `000${i}` }),
    );
    const result = buildActivityFeed(patients, []);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("populates lastVisitReason from most recent record", () => {
    const patient = makePatient();
    const records = [
      makeRecord({ chief_complaint: "Older", updated_at: "2026-01-01T00:00:00Z" }),
      makeRecord({ chief_complaint: "Newer", updated_at: "2026-01-10T00:00:00Z" }),
    ];
    const result = buildActivityFeed([patient], records);
    expect(result[0].lastVisitReason).toBe("Newer");
  });

  it("sets lastVisitReason to null if no records for patient", () => {
    const patient = makePatient({ id: "no-records" });
    const result = buildActivityFeed([patient], []);
    expect(result[0].lastVisitReason).toBeNull();
  });

  it("sorts by most recently updated patient first", () => {
    const older = makePatient({ id: "old", document_number: "001", updated_at: "2026-01-01T00:00:00Z" });
    const newer = makePatient({ id: "new", document_number: "002", updated_at: "2026-01-10T00:00:00Z" });
    const result = buildActivityFeed([older, newer], []);
    expect(result[0].id).toBe("new");
  });
});
