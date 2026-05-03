"use client";

/**
 * app/(dashboard)/dashboard/page.tsx
 *
 * Container del dashboard principal.
 * Toda la lógica de carga y cálculo de métricas vive aquí.
 * Los componentes presentacionales se importan desde components/dashboard/.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTenant } from "@/lib/supabase/tenant-context";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import {
  listClinicalRecordsByTenant,
  listPatientsByTenant,
  listSyncQueueItems,
} from "@/lib/db/indexeddb";
import type { ClinicalRecordRecord } from "@/features/consultations/types";
import type { PatientRecord } from "@/features/patients/types";

import {
  type DashboardMetrics,
  type ActivityItem,
  type FollowUpPanelFilter,
  type FollowUpPanelItem,
  EMPTY_METRICS,
} from "@/features/dashboard/components/types";
import { DashboardMetricsBar } from "@/features/dashboard/components/DashboardMetricsBar";
import { DashboardActivityFeed } from "@/features/dashboard/components/DashboardActivityFeed";
import { DashboardFollowUpPanel } from "@/features/dashboard/components/DashboardFollowUpPanel";
import { DashboardCharts } from "@/features/dashboard/components/DashboardCharts";
import {
  calculateMetrics,
  buildActivityFeed,
  getLast7DaysConsultations,
  getSpecialtyBreakdown,
} from "@/features/dashboard/lib/metrics";

// ─── Page Container ───────────────────────────────────────────────────────────

export default function DashboardView() {
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
    if (tenantLoading || !tenant) return;
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
          setMetrics(calculateMetrics(patients, records, {
            conflicted: queue.filter((i) => i.status === "conflicted").length,
            failedOrAbandoned: queue.filter(
              (i) => i.status === "failed" || i.status === "abandoned",
            ).length,
          }));
          setActivity(buildActivityFeed(patients, records));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();
    return () => { active = false; };
  }, [tenant, tenantLoading]);

  const followUpItems = useMemo(() => {
    const patientById = new Map(patientsData.map((p) => [p.id, p]));
    const now = Date.now();
    const urgentWindowMs = 48 * 60 * 60 * 1000;
    const items: FollowUpPanelItem[] = [];

    for (const record of recordsData) {
      const specialtyData = record.specialty_data as Record<string, unknown>;
      const dueDateRaw =
        typeof specialtyData.next_follow_up_date === "string"
          ? specialtyData.next_follow_up_date.trim()
          : "";

      if (!dueDateRaw) continue;

      const dueDateMs = Date.parse(dueDateRaw);
      if (Number.isNaN(dueDateMs)) continue;

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

  const filteredFollowUpItems = useMemo(
    () =>
      followUpItems.filter((item) => {
        if (followUpFilter === "vencidos") return item.isOverdue;
        if (followUpFilter === "urgentes") return !item.isOverdue && item.isUrgent;
        return !item.isOverdue && !item.isUrgent;
      }),
    [followUpFilter, followUpItems],
  );

  const followUpCounts = useMemo(
    () =>
      followUpItems.reduce(
        (acc, item) => {
          if (item.isOverdue) acc.vencidos += 1;
          else if (item.isUrgent) acc.urgentes += 1;
          else acc.proximos += 1;
          return acc;
        },
        { urgentes: 0, vencidos: 0, proximos: 0 } as Record<FollowUpPanelFilter, number>,
      ),
    [followUpItems],
  );

  const weeklyConsultations = useMemo(() => getLast7DaysConsultations(recordsData), [recordsData]);
  const weeklyMax = useMemo(
    () => Math.max(1, ...weeklyConsultations.map((p) => p.total)),
    [weeklyConsultations],
  );
  const specialtyBreakdown = useMemo(() => getSpecialtyBreakdown(recordsData), [recordsData]);
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("es-EC", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
    [],
  );

  if (tenantLoading || loading) return <DashboardSkeleton />;

  return (
    <section className="hce-page">

      {/* ── Hero header ── */}
      <header className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {/* Ambient gradient */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 100% 0%, rgba(15,118,110,0.10) 0%, transparent 60%), radial-gradient(ellipse 40% 60% at 0% 100%, rgba(13,148,136,0.07) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Sesión activa
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Hola{displayName ? (
                <span
                  className="ml-2 text-transparent"
                  style={{
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    backgroundImage: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
                  }}
                >
                  {displayName.split(" ")[0]}
                </span>
              ) : ""}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">
              {tenant
                ? `${tenant.full_name} · ${tenant.specialties.join(", ")}`
                : "Cargando perfil profesional..."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[26rem]">
            <Link href="/consultas" className="hce-btn-primary py-3 text-center text-sm">
              Nueva consulta
            </Link>
            <Link href="/pacientes" className="hce-btn-secondary py-3 text-center text-sm">
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

      {/* ── Today summary ── */}
      <article
        className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm"
        aria-label="Resumen del día"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at top right, rgba(14,118,110,.10), transparent 45%)",
          }}
        />
        <div className="relative space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            Resumen del día
          </p>
          <h2 className="text-xl font-bold capitalize text-ink">{todayLabel}</h2>
          <p className="text-sm text-ink-soft">
            {metrics.consultationsToday > 0
              ? `Registraste ${metrics.consultationsToday} consulta${
                  metrics.consultationsToday === 1 ? "" : "s"
                } hoy.`
              : "Aún no registras consultas hoy. Puedes iniciar con una acción rápida."}
          </p>
        </div>
      </article>

      <DashboardMetricsBar metrics={metrics} />
      <DashboardCharts
        weeklyConsultations={weeklyConsultations}
        weeklyMax={weeklyMax}
        specialtyBreakdown={specialtyBreakdown}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardActivityFeed activity={activity} />
        <DashboardFollowUpPanel
          items={filteredFollowUpItems}
          counts={followUpCounts}
          activeFilter={followUpFilter}
          onFilterChange={setFollowUpFilter}
        />
      </div>
    </section>
  );
}
