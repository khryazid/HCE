"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTenant } from "@/lib/supabase/tenant-context";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { listClinicalRecordsByTenant, listPatientsByTenant, listSyncQueueItems } from "@/lib/db/indexeddb";
import type { ClinicalRecordRecord } from "@/types/consultation";
import type { PatientRecord } from "@/types/patient";
import { countRecordsWithFollowUpDate } from "@/lib/clinical/follow-up";

type DashboardMetrics = {
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

const EMPTY_METRICS: DashboardMetrics = {
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

type ActivityItem = {
  id: string;
  fullName: string;
  ageText: string;
  lastVisitReason: string | null;
  status: string;
  date: string;
};

type FollowUpPanelFilter = "urgentes" | "vencidos" | "proximos";

type FollowUpPanelItem = {
  recordId: string;
  patientId: string;
  patientName: string;
  diagnosis: string;
  specialtyKind: string;
  dueDate: string;
  isOverdue: boolean;
  isUrgent: boolean;
};

type WeeklyConsultationPoint = {
  dayLabel: string;
  total: number;
};

type SpecialtyBreakdown = {
  specialty: string;
  total: number;
  percentage: number;
};

function getStartOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getTodayLabel() {
  return new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function getLast7DaysConsultations(records: ClinicalRecordRecord[]): WeeklyConsultationPoint[] {
  const startOfToday = getStartOfToday();
  const slots = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfToday);
    date.setDate(startOfToday.getDate() - (6 - index));
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
    if (slot) {
      slot.total += 1;
    }
  }

  return slots.map((slot) => ({
    dayLabel: slot.dayLabel,
    total: slot.total,
  }));
}

function getSpecialtyBreakdown(records: ClinicalRecordRecord[]): SpecialtyBreakdown[] {
  if (records.length === 0) {
    return [];
  }

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

function calculateMetrics(
  patients: PatientRecord[],
  records: ClinicalRecordRecord[],
  queue: Awaited<ReturnType<typeof listSyncQueueItems>>,
): DashboardMetrics {
  const startOfToday = getStartOfToday();

  const consultationsToday = records.filter(
    (record) => new Date(record.created_at) >= startOfToday,
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
    .sort((first, second) => second.total - first.total)
    .slice(0, 4);

  const followUpPending = countRecordsWithFollowUpDate(records);

  const incompleteRecords = records.filter(
    (record) => record.cie_codes.length === 0 || record.chief_complaint.trim().length === 0,
  ).length;

  const conflictedSyncItems = queue.filter((item) => item.status === "conflicted").length;
  const failedSyncItems = queue.filter(
    (item) => item.status === "failed" || item.status === "abandoned",
  ).length;

  return {
    activePatients: patients.length,
    consultationsToday,
    consultationsBySpecialty,
    followUpPending,
    recentConsultations: records.slice(0, 5),
    recentPatients: patients.slice(0, 5),
    conflictedSyncItems,
    failedSyncItems,
    incompleteRecords,
  };
}

function calculateAge(birthDate: string | null): string {
  if (!birthDate) return "Edad no registrada";
  const birth = new Date(birthDate);
  const diff = Date.now() - birth.getTime();
  const ageDate = new Date(diff);
  return `${Math.abs(ageDate.getUTCFullYear() - 1970)} años`;
}

function buildActivityFeed(
  patients: PatientRecord[],
  records: ClinicalRecordRecord[]
): ActivityItem[] {
  return patients
    .slice(0, 5)
    .map((patient) => {
      const patientRecords = records
        .filter((r) => r.patient_id === patient.id)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      
      const lastRecord = patientRecords[0];

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

export default function DashboardPage() {
  const { tenant, session, loading: tenantLoading, error: tenantError } = useTenant();
  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY_METRICS);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [patientsData, setPatientsData] = useState<PatientRecord[]>([]);
  const [recordsData, setRecordsData] = useState<ClinicalRecordRecord[]>([]);
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpPanelFilter>("urgentes");
  const [loading, setLoading] = useState(true);

  const displayName =
    tenant?.full_name ||
    (typeof session?.user.user_metadata?.full_name === "string"
      ? session.user.user_metadata.full_name
      : null) ||
    session?.user.email ||
    null;

  useEffect(() => {
    if (tenantLoading || !tenant) {
      return;
    }

    let active = true;

    const loadData = async () => {
      try {
        const [patients, records, queue] = await Promise.all([
          listPatientsByTenant(tenant.clinic_id),
          listClinicalRecordsByTenant(tenant.doctor_id, tenant.clinic_id),
          listSyncQueueItems(),
        ]);

        if (active) {
          setPatientsData(patients);
          setRecordsData(records);
          setMetrics(calculateMetrics(patients, records, queue));
          setActivity(buildActivityFeed(patients, records));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [tenant, tenantLoading]);

  const followUpItems = useMemo(() => {
    const patientById = new Map(patientsData.map((patient) => [patient.id, patient]));
    const now = Date.now();
    const urgentWindowMs = 48 * 60 * 60 * 1000;

    const items: FollowUpPanelItem[] = [];

    for (const record of recordsData) {
      const specialtyData = record.specialty_data as Record<string, unknown>;
      const dueDateRaw =
        typeof specialtyData.next_follow_up_date === "string"
          ? specialtyData.next_follow_up_date.trim()
          : "";

      if (!dueDateRaw) {
        continue;
      }

      const dueDateMs = Date.parse(dueDateRaw);
      if (Number.isNaN(dueDateMs)) {
        continue;
      }

      const diagnosis =
        typeof specialtyData.diagnosis === "string" && specialtyData.diagnosis.trim().length > 0
          ? specialtyData.diagnosis.trim()
          : record.chief_complaint;

      const patient = patientById.get(record.patient_id);
      const isOverdue = dueDateMs < now;
      const isUrgent = !isOverdue && dueDateMs <= now + urgentWindowMs;

      items.push({
        recordId: record.id,
        patientId: record.patient_id,
        patientName: patient?.full_name ?? "Paciente sin nombre",
        diagnosis,
        specialtyKind: record.specialty_kind,
        dueDate: dueDateRaw,
        isOverdue,
        isUrgent,
      });
    }

    return items.sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate));
  }, [patientsData, recordsData]);

  const filteredFollowUpItems = useMemo(() => {
    return followUpItems.filter((item) => {
      if (followUpFilter === "vencidos") {
        return item.isOverdue;
      }

      if (followUpFilter === "urgentes") {
        return !item.isOverdue && item.isUrgent;
      }

      return !item.isOverdue && !item.isUrgent;
    });
  }, [followUpFilter, followUpItems]);

  const followUpCounts = useMemo(() => {
    return followUpItems.reduce(
      (acc, item) => {
        if (item.isOverdue) {
          acc.vencidos += 1;
        } else if (item.isUrgent) {
          acc.urgentes += 1;
        } else {
          acc.proximos += 1;
        }

        return acc;
      },
      { urgentes: 0, vencidos: 0, proximos: 0 } as Record<FollowUpPanelFilter, number>,
    );
  }, [followUpItems]);

  const weeklyConsultations = useMemo(
    () => getLast7DaysConsultations(recordsData),
    [recordsData],
  );

  const weeklyMax = useMemo(
    () => Math.max(1, ...weeklyConsultations.map((point) => point.total)),
    [weeklyConsultations],
  );

  const specialtyBreakdown = useMemo(
    () => getSpecialtyBreakdown(recordsData),
    [recordsData],
  );

  const urgentFollowUps = followUpCounts.urgentes + followUpCounts.vencidos;
  const todayLabel = useMemo(() => getTodayLabel(), []);

  if (tenantLoading || loading) {
    return <DashboardSkeleton />;
  }

  return (
    <section className="hce-page">
      <header className="hce-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="hce-page-header">
            <p className="hce-kicker">
              Sesion activa
            </p>
            <h1 className="hce-page-title">
              Hola{displayName ? `, ${displayName}` : ""}
            </h1>
            <p className="hce-page-lead max-w-2xl">
              {tenant
                ? `${tenant.full_name} trabaja con ${tenant.specialties.join(", ")} dentro de un entorno privado y sin exponer datos internos.`
                : "Cargando perfil profesional..."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[28rem]">
            <Link
              href="/consultas"
              className="hce-btn-primary py-3"
            >
              Nueva consulta
            </Link>
            <Link
              href="/pacientes"
              className="hce-btn-secondary py-3"
            >
              Ver pacientes
            </Link>
          </div>
        </div>
      </header>

      {tenantError ? (
        <div className="hce-alert-warning" role="alert" aria-live="polite">
          {tenantError}
        </div>
      ) : null}

      <article className="hce-surface relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,118,110,.12),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,.12),transparent_45%)]" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Resumen del dia</p>
            <h2 className="text-2xl font-semibold capitalize text-[color:var(--ink)]">{todayLabel}</h2>
            <p className="text-sm text-[color:var(--ink-soft)]">
              {metrics.consultationsToday > 0
                ? `Hoy registraste ${metrics.consultationsToday} consulta${metrics.consultationsToday === 1 ? "" : "s"}.`
                : "Aun no registras consultas hoy. Puedes iniciar con una accion rapida."}
            </p>
        </div>
        </div>
      </article>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="hce-surface p-4 flex flex-col items-center justify-center text-center transition hover:shadow-md">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
            Pacientes activos
          </h2>
          <p className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">{metrics.activePatients}</p>
        </article>
        <article className="hce-surface p-4 flex flex-col items-center justify-center text-center transition hover:shadow-md">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
            Seguimientos pendientes
          </h2>
          <p className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">{metrics.followUpPending}</p>
        </article>
        <article className={`hce-surface p-4 flex flex-col items-center justify-center text-center transition hover:shadow-md ${metrics.incompleteRecords > 0 ? 'border-amber-200 bg-amber-50/30' : ''}`}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
            Registros incompletos
          </h2>
          <p className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">{metrics.incompleteRecords}</p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="hce-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[color:var(--ink)]">Consultas por semana</h2>
            <span className="text-xs text-[color:var(--ink-soft)]">Ultimos 7 dias</span>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2">
            {weeklyConsultations.map((point) => {
              const barHeight = Math.max(8, Math.round((point.total / weeklyMax) * 120));
              return (
                <div key={point.dayLabel} className="flex flex-col items-center gap-2">
                  <span className="text-[11px] font-semibold text-[color:var(--ink)]">{point.total}</span>
                  <div className="flex h-32 w-full items-end rounded-lg bg-[color:var(--bg-soft)] px-1">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-teal-600 to-cyan-400"
                      style={{ height: `${barHeight}px` }}
                    />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--ink-soft)]">
                    {point.dayLabel.replace(".", "")}
                  </span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="hce-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[color:var(--ink)]">Desglose por especialidad</h2>
            <span className="text-xs text-[color:var(--ink-soft)]">Distribucion actual</span>
          </div>

          {specialtyBreakdown.length === 0 ? (
            <div className="hce-empty mt-4">Sin consultas registradas para graficar.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {specialtyBreakdown.map((entry) => (
                <div key={entry.specialty}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-[0.1em] text-[color:var(--ink)]">
                      {entry.specialty}
                    </span>
                    <span className="text-[color:var(--ink-soft)]">
                      {entry.total} ({entry.percentage}%)
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[color:var(--bg-soft)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      style={{ width: `${entry.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="hce-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[color:var(--ink)]">Pacientes Recientes</h2>
            <Link href="/pacientes" className="text-xs text-accent hover:underline">Ver todos</Link>
          </div>
          <div className="mt-4 space-y-2">
            {activity.length === 0 ? (
              <div className="hce-empty">
                Aun no hay actividad reciente.
              </div>
            ) : (
              activity.map((item) => (
                <Link
                  key={item.id}
                  href={`/pacientes?id=${item.id}`}
                  className="block w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-left transition hover:bg-[color:var(--bg-soft)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--ink)]">{item.fullName}</p>
                      <p className="text-xs text-[color:var(--ink-soft)] mt-0.5">
                        {item.ageText} {item.lastVisitReason ? `· Motivo: ${item.lastVisitReason.slice(0, 40)}${item.lastVisitReason.length > 40 ? '...' : ''}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider
                        ${item.status === 'activo' ? 'bg-emerald-100 text-emerald-700' : ''}
                        ${item.status === 'inactivo' ? 'bg-bg-soft text-ink-soft' : ''}
                        ${item.status === 'en-seguimiento' ? 'bg-sky-100 text-sky-700' : ''}
                        ${item.status === 'alta' ? 'bg-amber-100 text-amber-700' : ''}
                      `}>
                        Estado: {item.status.replace('-', ' ')}
                      </span>
                      <span className="text-[10px] text-[color:var(--ink-soft)]">{new Date(item.date).toLocaleDateString("es-EC")}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="hce-surface p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[color:var(--ink)]">Seguimientos Pendientes</h2>
              <p className="text-xs text-[color:var(--ink-soft)]">Urgentes y vencidos</p>
            </div>
          </div>
          <div className="space-y-2">
            {filteredFollowUpItems.length === 0 ? (
              <div className="hce-empty">
                No hay seguimientos pendientes urgentes.
              </div>
            ) : (
              filteredFollowUpItems.slice(0, 5).map((item) => (
                  <div
                    key={item.recordId}
                    className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 flex items-center justify-between transition hover:bg-[color:var(--bg-soft)]"
                  >
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--ink)]">{item.patientName}</p>
                    <p className="text-xs text-[color:var(--ink-soft)] mt-0.5">
                        Control pendiente: {new Date(item.dueDate).toLocaleDateString("es-EC")}
                    </p>
                  </div>
                  <Link
                    href={`/consultas?mode=seguimiento&patientId=${item.patientId}&recordId=${item.recordId}`}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    Abrir
                  </Link>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
