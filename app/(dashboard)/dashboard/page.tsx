"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { loadTenantProfile, type TenantProfile } from "@/lib/supabase/profile";
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

function getStartOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function calculateMetrics(
  patients: PatientRecord[],
  records: ClinicalRecordRecord[],
  queue: Awaited<ReturnType<typeof listSyncQueueItems>>,
): DashboardMetrics {
  const startOfToday = getStartOfToday();
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

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

  const latestConsultationByPatient = new Map<string, Date>();
  for (const record of records) {
    const createdAt = new Date(record.created_at);
    const previous = latestConsultationByPatient.get(record.patient_id);

    if (!previous || createdAt > previous) {
      latestConsultationByPatient.set(record.patient_id, createdAt);
    }
  }

  const followUpPending = patients.filter((patient) => {
    const latest = latestConsultationByPatient.get(patient.id);

    if (!latest) {
      return true;
    }

    return latest < thirtyDaysAgo;
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
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY_METRICS);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        const tenantProfile = await loadTenantProfile(session.user.id);

        if (!tenantProfile) {
          setProfileError(
            "No se encontro perfil de tenant para esta cuenta. Revisa la tabla profiles en Supabase.",
          );
        }

        if (tenantProfile) {
          const [patients, records, queue] = await Promise.all([
            listPatientsByTenant(tenantProfile.doctor_id, tenantProfile.clinic_id),
            listClinicalRecordsByTenant(tenantProfile.doctor_id, tenantProfile.clinic_id),
            listSyncQueueItems(),
          ]);

          if (active) {
            setMetrics(calculateMetrics(patients, records, queue));
            setActivity(buildActivityFeed(patients, records));
          }
        }

        if (active) {
          setProfile(tenantProfile);
          setDisplayName(
            tenantProfile?.full_name ||
              (typeof session.user.user_metadata?.full_name === "string"
                ? session.user.user_metadata.full_name
                : null) ||
              session.user.email ||
              null,
          );
        }
      } catch (error) {
        if (active) {
          setProfileError(
            error instanceof Error ? error.message : "No se pudo cargar el tenant.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSession();

    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Panel Clinico</h1>
        <p className="text-sm text-slate-600">Cargando sesion...</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Sesion activa
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Hola{displayName ? `, ${displayName}` : ""}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-700">
              {profile
                ? `${profile.full_name} trabaja con ${profile.specialties.join(", ")} dentro de un entorno privado y sin exponer datos internos.`
                : "Cargando perfil profesional..."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[28rem]">
            <Link
              href="/consultas"
              className="rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Nueva consulta
            </Link>
            <Link
              href="/pacientes"
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Ver pacientes
            </Link>
          </div>
        </div>
      </header>

      {profileError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {profileError}
        </div>
      ) : null}

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

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Actividad reciente</h2>
            <p className="text-xs text-slate-500">Toca un item para verlo en detalle</p>
          </div>
          <div className="mt-3 space-y-2">
            {activity.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
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
                className="inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
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
