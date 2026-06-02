/**
 * patient-profile-helpers.ts
 *
 * Pure domain functions for the Patient Profile Overlay.
 * No side effects — all logic is derived from inputs.
 * Used by patient-profile-overlay.tsx and tested in
 * tests/features/patients/patient-profile-helpers.test.ts.
 */

import type { ClinicalRecordRecord } from "@/features/consultations/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PatientProfileMetrics = {
  totalConsultations: number;
  firstVisitDate: string | null;
  lastVisitDate: string | null;
  lastDiagnosis: string | null;
  lastCieCodes: string[];
  lastSpecialty: string | null;
};

export type PatientTimelineEntry = {
  id: string;
  date: string;
  chiefComplaint: string;
  specialty: string;
  cieCodes: string[];
  diagnosis: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Filters and sorts clinical records for a given patient.
 * Returns newest-first ordering by `created_at`.
 */
export function getPatientRecords(
  allRecords: ClinicalRecordRecord[],
  patientId: string,
): ClinicalRecordRecord[] {
  return allRecords
    .filter((r) => r.patient_id === patientId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/**
 * Calculates aggregate metrics for a patient from their clinical records.
 * Expects records to be **already filtered** for the target patient.
 */
export function calculatePatientProfileMetrics(
  records: ClinicalRecordRecord[],
): PatientProfileMetrics {
  if (records.length === 0) {
    return {
      totalConsultations: 0,
      firstVisitDate: null,
      lastVisitDate: null,
      lastDiagnosis: null,
      lastCieCodes: [],
      lastSpecialty: null,
    };
  }

  // Sort newest-first to pick the latest record
  const sorted = [...records].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  const latest = sorted[0];
  const oldest = sorted[sorted.length - 1];

  // Extract diagnosis from specialty_data if available, fallback to chief_complaint
  const specialtyData = latest.specialty_data as Record<string, unknown>;
  const diagnosis =
    typeof specialtyData.diagnosis === "string" &&
    specialtyData.diagnosis.trim().length > 0
      ? specialtyData.diagnosis.trim()
      : latest.chief_complaint || null;

  return {
    totalConsultations: records.length,
    firstVisitDate: oldest.created_at,
    lastVisitDate: latest.created_at,
    lastDiagnosis: diagnosis,
    lastCieCodes: latest.cie_codes ?? [],
    lastSpecialty: latest.specialty_kind ?? null,
  };
}

/**
 * Builds a chronological timeline of consultations for a patient.
 * Returns newest-first for rendering as a stacked history.
 */
export function buildPatientTimeline(
  records: ClinicalRecordRecord[],
): PatientTimelineEntry[] {
  return [...records]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((r) => {
      const specialtyData = r.specialty_data as Record<string, unknown>;
      const diagnosis =
        typeof specialtyData.diagnosis === "string" &&
        specialtyData.diagnosis.trim().length > 0
          ? specialtyData.diagnosis.trim()
          : null;

      return {
        id: r.id,
        date: r.created_at,
        chiefComplaint: r.chief_complaint,
        specialty: r.specialty_kind,
        cieCodes: r.cie_codes ?? [],
        diagnosis,
      };
    });
}

/**
 * Calculates age in full years from a birth date string (ISO or yyyy-mm-dd).
 * Returns null for invalid or missing dates.
 *
 * @param birthDate - ISO date string or yyyy-mm-dd
 * @param referenceDate - Date to calculate age relative to (defaults to now).
 *                        Pass explicitly for deterministic tests.
 */
export function calculateAge(
  birthDate: string | null | undefined,
  referenceDate: Date = new Date(),
): number | null {
  if (!birthDate) return null;

  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && referenceDate.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age < 0 ? null : age;
}

/**
 * Formats a date string into a human-readable relative string in Spanish.
 *
 * - Today: "hoy"
 * - Yesterday: "ayer"
 * - < 7 days: "hace N días"
 * - < 30 days: "hace N semanas"
 * - Else: formatted date (dd/mm/yyyy)
 *
 * @param dateString - ISO date string
 * @param now - Reference timestamp for deterministic tests (defaults to Date.now())
 */
export function formatRelativeDate(
  dateString: string,
  now: number = Date.now(),
): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  const diffMs = now - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return date.toLocaleDateString("es-EC");
  if (diffDays === 0) return "hoy";
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays} días`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `hace ${weeks} semana${weeks !== 1 ? "s" : ""}`;
  }

  return date.toLocaleDateString("es-EC");
}
