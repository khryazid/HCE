"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTenant } from "@/lib/supabase/tenant-context";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { listClinicalRecordsByTenant, listPatientsByTenant, listSyncQueueItems } from "@/lib/db/indexeddb";
import type { ClinicalRecordRecord } from "@/types/consultation";
import type { PatientRecord } from "@/types/patient";

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

type ActivityItem =
  | {
      type: "consultation";
      id: string;
      title: string;
      subtitle: string;
      detail: string;
      date: string;
      patientId: string;
    }
  | {
      type: "patient";
      id: string;
      title: string;
      subtitle: string;
      detail: string;
      date: string;
      patientId: string;
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

  const followUpPending = records.filter((record) => {
    const specialtyData = record.specialty_data as Record<string, unknown>;
    const nextFollowUpDate =
      typeof specialtyData.next_follow_up_date === "string"
        ? specialtyData.next_follow_up_date.trim()
        : "";

    if (!nextFollowUpDate) {
      return false;
    }

    return !Number.isNaN(Date.parse(nextFollowUpDate));
  }).length;

  const incompleteRecords = records.filter(
    (record) => record.cie_codes.length === 0 || record.chief_complaint.trim().length === 0,
  ).length;

  const conflictedSyncItems = queue.filter((item) => item.status === "conflicted").length;
  const failedSyncItems = queue.filter((item) => item.status === "failed").length;

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

function buildActivityFeed(
  patients: PatientRecord[],
  records: ClinicalRecordRecord[],
): ActivityItem[] {
  const patientMap = new Map(patients.map((patient) => [patient.id, patient]));

  const consultationItems = records.slice(0, 5).map((record) => {
    const patient = patientMap.get(record.patient_id);
    return {
      type: "consultation" as const,
      id: record.id,
      title: patient ? patient.full_name : "Consulta clinica",
      subtitle: record.specialty_kind,
      detail: record.chief_complaint,
      date: record.updated_at,
      patientId: record.patient_id,
    };
  });

  const patientItems = patients.slice(0, 5).map((patient) => ({
    type: "patient" as const,
    id: patient.id,
    title: patient.full_name,
    subtitle: patient.document_number,
    detail: patient.birth_date ? `Nacimiento: ${patient.birth_date}` : "Paciente actualizado recientemente",
    date: patient.updated_at,
    patientId: patient.id,
  }));

  return [...consultationItems, ...patientItems]
    .sort((first, second) => second.date.localeCompare(first.date))
    .slice(0, 8);
}

export default function DashboardPage() {
  const { tenant, session, loading: tenantLoading, error: tenantError } = useTenant();
  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY_METRICS);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
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
          listPatientsByTenant(tenant.doctor_id, tenant.clinic_id),
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
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
        <div className="hce-alert-warning">
          {tenantError}
        </div>
      ) : null}

      <article className="rounded-3xl border border-teal-200 bg-gradient-to-r from-teal-50 via-cyan-50 to-sky-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Resumen del dia</p>
            <h2 className="text-2xl font-semibold capitalize text-slate-900">{todayLabel}</h2>
            <p className="text-sm text-slate-700">
              {metrics.consultationsToday > 0
                ? `Hoy registraste ${metrics.consultationsToday} consulta${metrics.consultationsToday === 1 ? "" : "s"}.`
                : "Aun no registras consultas hoy. Puedes iniciar con una accion rapida."}
            </p>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto">
            <Link href="/consultas" className="rounded-2xl bg-teal-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-teal-800">
              Nueva consulta
            </Link>
            <Link href="/pacientes" className="rounded-2xl border border-teal-300 bg-white px-4 py-3 text-center text-sm font-semibold text-teal-900 transition hover:bg-teal-50">
              Buscar paciente
            </Link>
            <Link href="/consultas?mode=seguimiento" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-900 transition hover:bg-amber-100">
              Abrir seguimientos
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">Consultas hoy</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{metrics.consultationsToday}</p>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">Seguimientos urgentes</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{urgentFollowUps}</p>
          </div>
          <div className="rounded-xl border border-white/80 bg-white/80 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">Registros incompletos</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{metrics.incompleteRecords}</p>
          </div>
        </div>
      </article>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">
            Pacientes activos
          </h2>
          <p className="mt-2 text-2xl font-semibold text-cyan-950">{metrics.activePatients}</p>
        </article>
        <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
            Consultas del dia
          </h2>
          <p className="mt-2 text-2xl font-semibold text-emerald-950">{metrics.consultationsToday}</p>
        </article>
        <article className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
            Seguimiento pendiente
          </h2>
          <p className="mt-2 text-2xl font-semibold text-amber-950">{metrics.followUpPending}</p>
        </article>
        <article className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-800">
            Top especialidades
          </h2>
          <p className="mt-2 text-sm font-semibold text-violet-950">
            {metrics.consultationsBySpecialty.length > 0
              ? metrics.consultationsBySpecialty
                  .map((entry) => `${entry.specialty} (${entry.total})`)
                  .join(" · ")
              : "Sin consultas registradas"}
          </p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Consultas por semana</h2>
            <span className="text-xs text-slate-500">Ultimos 7 dias</span>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-2">
            {weeklyConsultations.map((point) => {
              const barHeight = Math.max(8, Math.round((point.total / weeklyMax) * 120));
              return (
                <div key={point.dayLabel} className="flex flex-col items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-700">{point.total}</span>
                  <div className="flex h-32 w-full items-end rounded-lg bg-slate-100 px-1">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-teal-600 to-cyan-400"
                      style={{ height: `${barHeight}px` }}
                    />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.1em] text-slate-500">
                    {point.dayLabel.replace(".", "")}
                  </span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Desglose por especialidad</h2>
            <span className="text-xs text-slate-500">Distribucion actual</span>
          </div>

          {specialtyBreakdown.length === 0 ? (
            <div className="hce-empty mt-4">Sin consultas registradas para graficar.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {specialtyBreakdown.map((entry) => (
                <div key={entry.specialty}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-[0.1em] text-slate-700">
                      {entry.specialty}
                    </span>
                    <span className="text-slate-500">
                      {entry.total} ({entry.percentage}%)
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
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

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Actividad reciente</h2>
            <p className="text-xs text-slate-500">Toca un item para verlo en detalle</p>
          </div>
          <div className="mt-3 space-y-2">
            {activity.length === 0 ? (
              <div className="hce-empty">
                Aun no hay actividad reciente.
              </div>
            ) : (
              activity.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => setSelectedActivity(item)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition hover:bg-slate-50 ${
                    selectedActivity?.type === item.type && selectedActivity?.id === item.id
                      ? "border-teal-300 bg-teal-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                        {item.type === "consultation" ? "Consulta" : "Paciente"} · {item.subtitle}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">{new Date(item.date).toLocaleString("es-EC")}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{item.detail}</p>
                </button>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Detalle</h2>
          {selectedActivity ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                  {selectedActivity.type === "consultation" ? "Consulta" : "Paciente"}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{selectedActivity.title}</h3>
                <p className="mt-1 text-sm text-slate-700">{selectedActivity.detail}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {new Date(selectedActivity.date).toLocaleString("es-EC")}
                </p>
              </div>
              <Link
                href={selectedActivity.type === "consultation" ? "/consultas" : "/pacientes"}
                className="hce-btn-primary"
              >
                Abrir modulo relacionado
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Selecciona una actividad para ver detalles accionables.
            </p>
          )}
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Panel de seguimientos pendientes</h2>
            <p className="text-xs text-slate-500">Filtra por urgentes, vencidos o proximos para priorizar controles.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["urgentes", "Urgentes"],
              ["vencidos", "Vencidos"],
              ["proximos", "Proximos"],
            ] as Array<[FollowUpPanelFilter, string]>).map(([filter, label]) => (
              <button
                key={filter}
                type="button"
                onClick={() => setFollowUpFilter(filter)}
                className={`hce-chip ${
                  followUpFilter === filter
                    ? "border-teal-300 bg-teal-50 text-teal-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {label} ({followUpCounts[filter]})
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {filteredFollowUpItems.length === 0 ? (
            <div className="hce-empty">
              No hay seguimientos en este filtro.
            </div>
          ) : (
            filteredFollowUpItems.map((item) => (
              <div
                key={item.recordId}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.patientName}</p>
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                      {item.specialtyKind} · Control {new Date(item.dueDate).toLocaleDateString("es-EC")}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{item.diagnosis}</p>
                  </div>
                  <Link
                    href={`/consultas?mode=seguimiento&patientId=${item.patientId}&recordId=${item.recordId}`}
                    className="hce-chip border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100"
                  >
                    Abrir seguimiento
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </article>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/pacientes" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100">
          <p className="text-sm font-semibold text-slate-900">Pacientes</p>
          <p className="mt-2 text-sm text-slate-700">Abrir y gestionar pacientes.</p>
        </Link>
        <Link href="/consultas" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100">
          <p className="text-sm font-semibold text-slate-900">Consultas</p>
          <p className="mt-2 text-sm text-slate-700">Registrar una nueva consulta guiada.</p>
        </Link>
        <Link href="/tratamientos" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100">
          <p className="text-sm font-semibold text-slate-900">Tratamientos</p>
          <p className="mt-2 text-sm text-slate-700">Revisar plantillas predeterminadas.</p>
        </Link>
        <Link href="/ajustes" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100">
          <p className="text-sm font-semibold text-slate-900">Ajustes</p>
          <p className="mt-2 text-sm text-slate-700">Editar membrete profesional y contacto.</p>
        </Link>
      </div>
    </section>
  );
}
