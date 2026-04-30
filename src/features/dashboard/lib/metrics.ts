/**
 * lib/dashboard/metrics.ts
 *
 * Helpers puros de cálculo de métricas para el dashboard.
 * Extraídos del container para ser testeables en aislamiento.
 */

import { countRecordsWithFollowUpDate } from "@/features/consultations/lib/follow-up";
import type { ClinicalRecordRecord } from "@/features/consultations/types";
import type { PatientRecord } from "@/features/patients/types";
import type {
  ActivityItem,
  DashboardMetrics,
  SpecialtyBreakdown,
  WeeklyConsultationPoint,
} from "@/features/dashboard/components/types";

function getStartOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function calculateAge(birthDate: string | null): string {
  if (!birthDate) return "Edad no registrada";
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return "Edad no registrada";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  if (age < 0 || age > 130) return "Edad no registrada";
  return `${age} años`;
}

export function getLast7DaysConsultations(
  records: ClinicalRecordRecord[],
  today: Date = getStartOfToday(),
): WeeklyConsultationPoint[] {
  const slots = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      key: date.toISOString().slice(0, 10),
      dayLabel: date.toLocaleDateString("es-EC", { weekday: "short" }),
      total: 0,
    };
  });

  const byDay = new Map(slots.map((slot) => [slot.key, slot]));
  for (const record of records) {
    const dayKey = record.created_at.slice(0, 10);
    const slot = byDay.get(dayKey);
    if (slot) slot.total += 1;
  }

  return slots.map((slot) => ({ dayLabel: slot.dayLabel, total: slot.total }));
}

export function getSpecialtyBreakdown(records: ClinicalRecordRecord[]): SpecialtyBreakdown[] {
  if (records.length === 0) return [];

  const counter = new Map<string, number>();
  for (const record of records) {
    counter.set(record.specialty_kind, (counter.get(record.specialty_kind) ?? 0) + 1);
  }

  return Array.from(counter.entries())
    .map(([specialty, total]) => ({
      specialty,
      total,
      percentage: Math.round((total / records.length) * 100),
    }))
    .sort((a, b) => b.total - a.total);
}

export function calculateMetrics(
  patients: PatientRecord[],
  records: ClinicalRecordRecord[],
  queueStats: { conflicted: number; failedOrAbandoned: number },
  today: Date = getStartOfToday(),
): DashboardMetrics {
  const consultationsToday = records.filter(
    (record) => new Date(record.created_at) >= today,
  ).length;

  const specialtyCounter = new Map<string, number>();
  for (const record of records) {
    specialtyCounter.set(
      record.specialty_kind,
      (specialtyCounter.get(record.specialty_kind) ?? 0) + 1,
    );
  }

  const consultationsBySpecialty = Array.from(specialtyCounter.entries())
    .map(([specialty, total]) => ({ specialty, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);

  const followUpPending = countRecordsWithFollowUpDate(records);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const consultationsThisMonth = records.filter(
    (record) => new Date(record.created_at) >= startOfMonth,
  ).length;

  return {
    activePatients: patients.length,
    consultationsToday,
    consultationsBySpecialty,
    followUpPending,
    recentConsultations: records.slice(0, 5),
    recentPatients: patients.slice(0, 5),
    conflictedSyncItems: queueStats.conflicted,
    failedSyncItems: queueStats.failedOrAbandoned,
    consultationsThisMonth,
  };
}

export function buildActivityFeed(
  patients: PatientRecord[],
  records: ClinicalRecordRecord[],
): ActivityItem[] {
  return patients
    .slice(0, 5)
    .map((patient) => {
      const lastRecord = records
        .filter((r) => r.patient_id === patient.id)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];

      return {
        id: patient.id,
        fullName: patient.full_name,
        ageText: calculateAge(patient.birth_date),
        lastVisitReason: lastRecord ? lastRecord.chief_complaint : null,
        status: patient.status,
        date: patient.updated_at,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
