import { describe, test, expect } from "vitest";
import {
  calculatePatientProfileMetrics,
  buildPatientTimeline,
  calculateAge,
  formatRelativeDate,
  getPatientRecords,
} from "@/features/patients/lib/patient-profile-helpers";
import type { ClinicalRecordRecord } from "@/features/consultations/types";

function mockRecord(overrides: Partial<ClinicalRecordRecord> = {}): ClinicalRecordRecord {
  return {
    id: crypto.randomUUID(),
    clinic_id: "clinic-1",
    doctor_id: "doc-1",
    patient_id: "patient-1",
    chief_complaint: "Dolor de cabeza",
    cie_codes: ["R51"],
    specialty_kind: "medicina-general",
    specialty_data: {},
    created_at: "2026-01-15T10:00:00.000Z",
    updated_at: "2026-01-15T10:00:00.000Z",
    ...overrides,
  };
}

describe("patient profile helpers", () => {
  describe("calculatePatientProfileMetrics", () => {
    test("returns empty metrics for no records", () => {
      const result = calculatePatientProfileMetrics([]);
      expect(result.totalConsultations).toBe(0);
      expect(result.firstVisitDate).toBeNull();
      expect(result.lastVisitDate).toBeNull();
      expect(result.lastDiagnosis).toBeNull();
      expect(result.lastCieCodes).toEqual([]);
      expect(result.lastSpecialty).toBeNull();
    });

    test("calculates metrics for single record", () => {
      const record = mockRecord({
        cie_codes: ["R51", "G43"],
        specialty_data: { diagnosis: "Migraña crónica" },
      });
      const result = calculatePatientProfileMetrics([record]);

      expect(result.totalConsultations).toBe(1);
      expect(result.firstVisitDate).toBe(record.created_at);
      expect(result.lastVisitDate).toBe(record.created_at);
      expect(result.lastDiagnosis).toBe("Migraña crónica");
      expect(result.lastCieCodes).toEqual(["R51", "G43"]);
      expect(result.lastSpecialty).toBe("medicina-general");
    });

    test("picks newest record for last visit info", () => {
      const old = mockRecord({
        created_at: "2026-01-01T10:00:00.000Z",
        chief_complaint: "Fiebre",
        specialty_kind: "pediatria",
      });
      const recent = mockRecord({
        created_at: "2026-03-15T14:30:00.000Z",
        chief_complaint: "Control",
        specialty_kind: "medicina-general",
        specialty_data: { diagnosis: "Sano" },
      });

      const result = calculatePatientProfileMetrics([old, recent]);

      expect(result.totalConsultations).toBe(2);
      expect(result.firstVisitDate).toBe(old.created_at);
      expect(result.lastVisitDate).toBe(recent.created_at);
      expect(result.lastDiagnosis).toBe("Sano");
      expect(result.lastSpecialty).toBe("medicina-general");
    });

    test("falls back to chief_complaint when no diagnosis in specialty_data", () => {
      const record = mockRecord({
        chief_complaint: "Dolor abdominal",
        specialty_data: {},
      });
      const result = calculatePatientProfileMetrics([record]);
      expect(result.lastDiagnosis).toBe("Dolor abdominal");
    });

    test("ignores empty diagnosis string", () => {
      const record = mockRecord({
        chief_complaint: "Tos persistente",
        specialty_data: { diagnosis: "   " },
      });
      const result = calculatePatientProfileMetrics([record]);
      expect(result.lastDiagnosis).toBe("Tos persistente");
    });
  });

  describe("buildPatientTimeline", () => {
    test("returns empty array for no records", () => {
      expect(buildPatientTimeline([])).toEqual([]);
    });

    test("builds timeline entries sorted newest-first", () => {
      const older = mockRecord({
        id: "r-old",
        created_at: "2026-01-10T08:00:00.000Z",
        chief_complaint: "Fiebre",
        specialty_kind: "pediatria",
        cie_codes: ["R50"],
      });
      const newer = mockRecord({
        id: "r-new",
        created_at: "2026-02-20T15:00:00.000Z",
        chief_complaint: "Control",
        specialty_kind: "medicina-general",
        cie_codes: ["Z00"],
        specialty_data: { diagnosis: "Paciente sano" },
      });

      const timeline = buildPatientTimeline([older, newer]);

      expect(timeline).toHaveLength(2);
      expect(timeline[0].id).toBe("r-new");
      expect(timeline[0].chiefComplaint).toBe("Control");
      expect(timeline[0].diagnosis).toBe("Paciente sano");
      expect(timeline[1].id).toBe("r-old");
      expect(timeline[1].chiefComplaint).toBe("Fiebre");
      expect(timeline[1].diagnosis).toBeNull();
    });
  });

  describe("getPatientRecords", () => {
    test("filters by patient_id and sorts newest-first", () => {
      const p1Old = mockRecord({
        id: "p1-old",
        patient_id: "patient-1",
        created_at: "2026-01-01T10:00:00.000Z",
      });
      const p1New = mockRecord({
        id: "p1-new",
        patient_id: "patient-1",
        created_at: "2026-03-01T10:00:00.000Z",
      });
      const p2 = mockRecord({
        id: "p2",
        patient_id: "patient-2",
        created_at: "2026-02-01T10:00:00.000Z",
      });

      const result = getPatientRecords([p1Old, p2, p1New], "patient-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("p1-new");
      expect(result[1].id).toBe("p1-old");
    });

    test("returns empty for unmatched patient_id", () => {
      const record = mockRecord({ patient_id: "patient-x" });
      expect(getPatientRecords([record], "patient-999")).toEqual([]);
    });
  });

  describe("calculateAge", () => {
    const ref = new Date("2026-06-15T12:00:00.000Z");

    test("calculates age correctly", () => {
      expect(calculateAge("1990-06-15", ref)).toBe(36);
    });

    test("subtracts a year if birthday has not occurred yet", () => {
      expect(calculateAge("1990-07-01", ref)).toBe(35);
    });

    test("returns null for null/undefined", () => {
      expect(calculateAge(null)).toBeNull();
      expect(calculateAge(undefined)).toBeNull();
    });

    test("returns null for empty string", () => {
      expect(calculateAge("")).toBeNull();
    });

    test("returns null for invalid date", () => {
      expect(calculateAge("not-a-date")).toBeNull();
    });

    test("returns 0 for a baby born this year", () => {
      expect(calculateAge("2026-01-01", ref)).toBe(0);
    });
  });

  describe("formatRelativeDate", () => {
    // Fixed reference point: 2026-06-15T12:00:00Z
    const now = new Date("2026-06-15T12:00:00.000Z").getTime();

    test("returns 'hoy' for today", () => {
      expect(formatRelativeDate("2026-06-15T08:00:00.000Z", now)).toBe("hoy");
    });

    test("returns 'ayer' for yesterday", () => {
      expect(formatRelativeDate("2026-06-14T00:00:00.000Z", now)).toBe("ayer");
    });

    test("returns 'hace N días' for < 7 days ago", () => {
      expect(formatRelativeDate("2026-06-12T10:00:00.000Z", now)).toBe("hace 3 días");
    });

    test("returns 'hace N semanas' for < 30 days ago", () => {
      expect(formatRelativeDate("2026-06-01T10:00:00.000Z", now)).toBe("hace 2 semanas");
    });

    test("returns locale date for >= 30 days ago", () => {
      const result = formatRelativeDate("2026-04-01T10:00:00.000Z", now);
      // Should be a formatted date string, not a relative expression
      expect(result).not.toContain("hace");
      expect(result).not.toBe("hoy");
    });

    test("returns locale date for future dates", () => {
      const result = formatRelativeDate("2026-07-01T10:00:00.000Z", now);
      expect(result).not.toContain("hace");
    });

    test("returns input for invalid date", () => {
      expect(formatRelativeDate("invalid")).toBe("invalid");
    });
  });
});
