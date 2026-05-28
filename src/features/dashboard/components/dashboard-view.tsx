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
import { isSameDay, parseISO } from "date-fns";
import { useTenant } from "@/lib/supabase/tenant-context";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { listSyncQueueItems } from "@/lib/db/indexeddb";

import "./dashboard.css";
import { usePatients, useClinicalRecords } from "@/features/patients/lib/use-patients-queries";
import { usePatientsRealtime } from "@/features/patients/lib/use-patients-realtime";
import { useClinicalRecordsRealtime } from "@/features/patients/lib/use-clinical-records-realtime";

import {
  type DashboardMetrics,
  type ActivityItem,
  type FollowUpPanelFilter,
  type FollowUpPanelItem,
  EMPTY_METRICS,
} from "@/features/dashboard/components/types";
import { DashboardActivityFeed } from "@/features/dashboard/components/dashboard-activity-feed";
import { DashboardFollowUpPanel } from "@/features/dashboard/components/dashboard-follow-up-panel";
import { DashboardAgendaPanel } from "@/features/dashboard/components/dashboard-agenda-panel";
import { useAgenda } from "@/features/agenda/lib/use-agenda";
import {
  calculateMetrics,
  buildActivityFeed,
} from "@/features/dashboard/lib/metrics";

// ─── Page Container ───────────────────────────────────────────────────────────

export default function DashboardView() {
  const { tenant, session, loading: tenantLoading, error: tenantError } = useTenant();
  const { appointments } = useAgenda();
  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY_METRICS);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpPanelFilter>("urgentes");

  // React Query fetch (cached, auto-invalidated)
  const { data: patientsData = [], isLoading: patientsLoading } = usePatients(tenant);
  const { data: recordsData = [], isLoading: recordsLoading } = useClinicalRecords(tenant);
  
  // Realtime subscriptions
  usePatientsRealtime(tenant);
  useClinicalRecordsRealtime(tenant);

  const loading = patientsLoading || recordsLoading;

  const displayName =
    tenant?.full_name ||
    (typeof session?.user.user_metadata?.full_name === "string"
      ? session.user.user_metadata.full_name
      : null) ||
    session?.user.email ||
    null;

  // Sync Queue is checked periodically for metrics since it's local only
  useEffect(() => {
    if (tenantLoading || !tenant || loading) return;
    let active = true;

    const loadSyncQueue = async () => {
      try {
        const queue = await listSyncQueueItems();
        if (active) {
          setMetrics(calculateMetrics(patientsData, recordsData, {
            conflicted: queue.filter((i) => i.status === "conflicted").length,
            failedOrAbandoned: queue.filter(
              (i) => i.status === "failed" || i.status === "abandoned",
            ).length,
          }));
          setActivity(buildActivityFeed(patientsData, recordsData));
        }
      } catch (err) {
        console.error("Error loading sync queue", err);
      }
    };

    void loadSyncQueue();
    // Refresh the sync queue every 10 seconds just for the indicator
    const interval = setInterval(() => void loadSyncQueue(), 10000);
    
    return () => { 
      active = false; 
      clearInterval(interval);
    };
  }, [tenant, tenantLoading, loading, patientsData, recordsData]);

  const followUpItems = useMemo(() => {
    const patientById = new Map(patientsData.map((p) => [p.id, p]));
    // eslint-disable-next-line react-hooks/purity
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

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("es-EC", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
    [],
  );

  const todayAppointmentsCount = useMemo(() => {
    const today = new Date();
    return appointments.filter((a) => isSameDay(parseISO(a.start_time), today)).length;
  }, [appointments]);

  if (tenantLoading || loading) return <DashboardSkeleton />;

  const overdueFollowUps = followUpItems.filter(i => i.isOverdue);
  // eslint-disable-next-line react-hooks/purity
  const daysLeft = tenant?.subscription_expires_at ? Math.floor((new Date(tenant.subscription_expires_at).getTime() - Date.now()) / 86_400_000) : -1;
  const isTrialActive = tenant?.subscription_status === "trialing" && daysLeft >= 0;

  return (
    <>
      <style>{"\n"}</style> {/* Trigger re-render if needed or global css applies */}
      <div className="gx-dash-inner animate-in fade-in duration-300">

        {/* Header */}
        <header className="gx-header gx-s gx-s1">
          <div className="gx-header-left">
            <h1 className="gx-greeting">
              Buenos días, {displayName ? <span className="gx-name">{displayName.split(" ")[0]}</span> : null}
            </h1>
            <div className="gx-header-sep" />
            <span className="gx-header-meta">
              {tenant?.specialties?.[0] || "Medicina General"} · {todayLabel}
            </span>
          </div>
          <div className="gx-header-right flex-wrap sm:flex-nowrap">
            <Link href="/consultas" className="gx-btn gx-btn-p">Nueva consulta</Link>
            <Link href="/agenda" className="gx-btn gx-btn-s">Mi Agenda</Link>
          </div>
        </header>

        {tenantError && (
          <div className="rounded-md bg-red-50 p-4 mt-4" role="alert">
            <p className="text-sm font-medium text-red-800">{tenantError}</p>
          </div>
        )}

        {/* Trial Banner */}
        {isTrialActive && (
          <div className="gx-trial gx-s gx-s2">
            <div className="gx-trial-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div className="gx-trial-body">
              <div className="gx-trial-title">
                {daysLeft === 0 ? "Prueba gratuita — último día" : `Prueba gratuita (${daysLeft} día${daysLeft !== 1 ? "s" : ""} restante${daysLeft !== 1 ? "s" : ""})`}
              </div>
              <div className="gx-trial-text">Motor clínico completo. Activa tu suscripción para acceso permanente.</div>
            </div>
            <Link href="/billing" className="gx-btn gx-btn-p bg-accent text-white hover:bg-accent-hover text-center px-4 py-1.5 flex items-center justify-center border-0" style={{ border: "none" }}>Activar cuenta</Link>
          </div>
        )}

        {/* Metrics Strip */}
        <div className="gx-metrics gx-s gx-s2">
          <div className="gx-m">
            <span className="gx-mv gx-mv-a">{metrics.consultationsToday}</span>
            {todayAppointmentsCount > 0 && <span className="gx-mf">/{todayAppointmentsCount}</span>}
            <span className="gx-ml">consultas hoy</span>
          </div>
          <div className="gx-m">
            <span className="gx-mv">{metrics.activePatients}</span>
            <span className="gx-ml">pacientes</span>
          </div>
          <div className="gx-m">
            <span className="gx-mv">{metrics.followUpPending}</span>
            <span className="gx-ml">seguimientos</span>
          </div>
          {overdueFollowUps.length > 0 && (
            <div className="gx-m">
              <span className="gx-mv gx-mv-r">{overdueFollowUps.length}</span>
              <span className="gx-ml">vencidos</span>
            </div>
          )}
        </div>

        {/* Overdue Banner */}
        {overdueFollowUps.length > 0 && (
          <div className="gx-overdue gx-s gx-s3">
            <div className="gx-overdue-ico">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            </div>
            <div className="gx-overdue-body">
              <div className="gx-overdue-t">
                {overdueFollowUps.length} seguimiento{overdueFollowUps.length !== 1 ? "s" : ""} vencido{overdueFollowUps.length !== 1 ? "s" : ""}
              </div>
              <div className="gx-overdue-d">
                {overdueFollowUps.slice(0, 2).map(i => i.patientName).join(", ")}
                {overdueFollowUps.length > 2 ? ` y ${overdueFollowUps.length - 2} más` : ""}
              </div>
            </div>
            <Link href="/pacientes" className="gx-btn bg-red-600 hover:bg-red-700 text-white border-0 text-center flex items-center justify-center px-4 py-1.5 rounded-md" style={{ border: "none" }}>Ver pacientes</Link>
          </div>
        )}

        {/* Main grid */}
        <div className="gx-dash-grid gx-s gx-s4">
          <DashboardAgendaPanel appointments={appointments} />
          
          <aside className="gx-side">
            <DashboardActivityFeed activity={activity} />
            <DashboardFollowUpPanel
              items={filteredFollowUpItems}
              counts={followUpCounts}
              activeFilter={followUpFilter}
              onFilterChange={setFollowUpFilter}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
