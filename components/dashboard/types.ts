/**
 * components/dashboard/types.ts
 *
 * Tipos compartidos entre los componentes del dashboard.
 */

import type { ClinicalRecordRecord } from "@/types/consultation";
import type { PatientRecord } from "@/types/patient";

export type DashboardMetrics = {
  activePatients: number;
  consultationsToday: number;
  consultationsBySpecialty: Array<{ specialty: string; total: number }>;
  followUpPending: number;
  recentConsultations: ClinicalRecordRecord[];
  recentPatients: PatientRecord[];
  conflictedSyncItems: number;
  failedSyncItems: number;
  incompleteRecords: number;
};

export const EMPTY_METRICS: DashboardMetrics = {
  activePatients: 0,
  consultationsToday: 0,
  consultationsBySpecialty: [],
  followUpPending: 0,
  recentConsultations: [],
  recentPatients: [],
  conflictedSyncItems: 0,
  failedSyncItems: 0,
  incompleteRecords: 0,
};

export type ActivityItem = {
  id: string;
  fullName: string;
  ageText: string;
  lastVisitReason: string | null;
  status: string;
  date: string;
};

export type FollowUpPanelFilter = "urgentes" | "vencidos" | "proximos";

export type FollowUpPanelItem = {
  recordId: string;
  patientId: string;
  patientName: string;
  diagnosis: string;
  specialtyKind: string;
  dueDate: string;
  isOverdue: boolean;
  isUrgent: boolean;
};

export type WeeklyConsultationPoint = {
  dayLabel: string;
  total: number;
};

export type SpecialtyBreakdown = {
  specialty: string;
  total: number;
  percentage: number;
};
