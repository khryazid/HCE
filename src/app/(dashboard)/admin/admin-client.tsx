"use client";

import { useState, useMemo, useTransition, useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { AdminUserRecord, AdminStats, AdminClinicRecord } from "@/features/admin/actions";
import { setSubscriptionStatus, deleteUserAccount, setClinicSubscriptionStatus } from "@/features/admin/actions";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type AbandonedItem = {
  id: number;
  clinic_id: string;
  doctor_id: string | null;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown>;
  created_at: string;
};

type Props = {
  initialUsers: AdminUserRecord[];
  stats: AdminStats;
  abandonedItems: AbandonedItem[];
  pricing: { proPrice: number; clinicPrice: number };
  initialClinics: AdminClinicRecord[];
  globalConfig: {
    terms_version: string;
    terms_content: string;
    maintenance_mode: boolean;
    global_notice: string;
  };
  currentPage: number;
  totalPages: number;
  totalItems: number;
};

type PlanDraft = {
  status: "active" | "lifetime" | "canceled";
  days?: number;
  plan: "basic" | "clinic";
};

type StatusFilter = "all" | "active" | "lifetime" | "trialing" | "incomplete" | "canceled" | "none";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  active:             { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-300", label: "Activo" },
  lifetime:           { bg: "bg-purple-100 dark:bg-purple-900/40",   text: "text-purple-800 dark:text-purple-300",  label: "Lifetime ∞" },
  trialing:           { bg: "bg-sky-100 dark:bg-sky-900/40",         text: "text-sky-800 dark:text-sky-300",        label: "Trial" },
  canceled:           { bg: "bg-red-100 dark:bg-red-900/40",         text: "text-red-800 dark:text-red-300",        label: "Cancelado" },
  past_due:           { bg: "bg-orange-100 dark:bg-orange-900/40",   text: "text-orange-800 dark:text-orange-300",  label: "Vencido" },
  paused:             { bg: "bg-yellow-100 dark:bg-yellow-900/40",   text: "text-yellow-800 dark:text-yellow-300",  label: "Pausado" },
  incomplete:         { bg: "bg-slate-100 dark:bg-slate-700",        text: "text-slate-600 dark:text-slate-300",    label: "Incompleto" },
  incomplete_expired: { bg: "bg-slate-100 dark:bg-slate-700",        text: "text-slate-500 dark:text-slate-400",    label: "Expirado" },
  unpaid:             { bg: "bg-orange-100 dark:bg-orange-900/40",   text: "text-orange-700 dark:text-orange-300",  label: "Sin pagar" },
  none:               { bg: "bg-slate-100 dark:bg-slate-700",        text: "text-slate-600 dark:text-slate-300",    label: "Sin plan" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["none"];
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function StatCard({
  label, value, color, active, onClick,
}: {
  label: string; value: number; color: string;
  active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`hce-surface rounded-xl p-4 flex flex-col gap-1 text-left transition-all ${
        onClick ? "cursor-pointer hover:border-accent/50" : "cursor-default"
      } ${active ? "ring-2 ring-accent border-accent" : ""}`}
    >
      <p className="text-xs text-ink-soft">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </button>
  );
}

function isRecentUser(created_at: string): boolean {
  const diff = Date.now() - new Date(created_at).getTime();
  return diff < 48 * 60 * 60 * 1000; // 48 hours
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      title="Copiar"
      className="ml-1 opacity-40 hover:opacity-100 transition-opacity text-xs"
    >
      {copied ? "✓" : "⎘"}
    </button>
  );
}

// ─── CONFIRM DIALOG ───────────────────────────────────────────────────────────

function ConfirmDialog({
  user, plan, onConfirm, onCancel, loading,
}: {
  user: AdminUserRecord;
  plan: PlanDraft;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const planLabel = {
    active:   plan.days ? `Activo por ${plan.days} día(s)` : "Activo",
    lifetime: "Lifetime (sin expiración)",
    canceled: "Cancelado / Inactivo",
  }[plan.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 space-y-4">
        <h2 className="text-lg font-bold text-ink">Confirmar cambio de plan</h2>
        <p className="text-sm text-ink-soft">
          Vas a cambiar a <span className="font-semibold text-ink">{user.full_name}</span>{" "}
          ({user.email}) al plan:
        </p>
        <div className="rounded-lg bg-bg-soft border border-border px-4 py-3">
          <p className="font-semibold text-ink">{planLabel}</p>
          <p className="text-sm text-ink-soft">Tipo: {plan.plan === "clinic" ? "Plan Clínica" : "Plan Básico"}</p>
        </div>
        <p className="text-xs text-ink-soft">Esta acción se aplica inmediatamente.</p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-ink hover:bg-bg-soft transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {loading ? "Guardando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DELETE CONFIRM ───────────────────────────────────────────────────────────

function DeleteDialog({
  user, onConfirm, onCancel, loading,
}: {
  user: AdminUserRecord;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [typed, setTyped] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-red-500/50 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 space-y-4">
        <h2 className="text-lg font-bold text-red-500">⚠️ Eliminar cuenta</h2>
        <p className="text-sm text-ink-soft">
          Esto eliminará permanentemente la cuenta de{" "}
          <span className="font-semibold text-ink">{user.full_name}</span> ({user.email}).
          Esta acción no se puede deshacer.
        </p>
        <p className="text-xs text-ink-soft">
          Escribe <span className="font-mono font-bold text-red-400">ELIMINAR</span> para confirmar.
        </p>
        <input
          className="hce-input"
          placeholder="ELIMINAR"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-ink hover:bg-bg-soft transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={typed !== "ELIMINAR" || loading}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-40"
          >
            {loading ? "Eliminando…" : "Eliminar para siempre"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PLAN EDITOR ──────────────────────────────────────────────────────────────

function PlanEditor({
  user, onApply, loadingId, setDeleteTarget,
}: {
  user: AdminUserRecord;
  onApply: (user: AdminUserRecord, plan: PlanDraft) => void;
  loadingId: string | null;
  setDeleteTarget: (user: AdminUserRecord) => void;
}) {
  const [selectedStatus, setSelectedStatus] = useState<PlanDraft["status"]>("active");
  const [days, setDays] = useState<number>(30);
  const [selectedPlan, setSelectedPlan] = useState<PlanDraft["plan"]>((user.plan as "basic" | "clinic") || "basic");
  const isLoading = loadingId === user.id;

  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      <select
        className="hce-input text-xs py-1 px-2 w-auto"
        value={selectedPlan}
        onChange={(e) => setSelectedPlan(e.target.value as PlanDraft["plan"])}
      >
        <option value="basic">Básico</option>
        <option value="clinic">Clínica</option>
      </select>

      <select
        className="hce-input text-xs py-1 px-2 w-auto"
        value={selectedStatus}
        onChange={(e) => setSelectedStatus(e.target.value as PlanDraft["status"])}
      >
        <option value="active">Activo</option>
        <option value="lifetime">Lifetime ∞</option>
        <option value="canceled">Cancelar</option>
      </select>

      {selectedStatus === "active" && (
        <select
          className="hce-input text-xs py-1 px-2 w-auto"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>7 días</option>
          <option value={15}>15 días</option>
          <option value={30}>30 días</option>
          <option value={90}>3 meses</option>
          <option value={180}>6 meses</option>
          <option value={365}>1 año</option>
          <option value={3650}>10 años</option>
        </select>
      )}

      <button
        disabled={isLoading}
        onClick={() =>
          onApply(user, {
            status: selectedStatus,
            days: selectedStatus === "active" ? days : undefined,
            plan: selectedPlan,
          })
        }
        className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
      >
        {isLoading ? "…" : "Aplicar"}
      </button>

      <button
        onClick={() => setDeleteTarget(user)}
        className="px-3 py-1 rounded-lg border border-red-400/50 text-red-400 text-xs font-semibold hover:bg-red-500/10 transition-colors"
      >
        🗑
      </button>
    </div>
  );
}

// ─── CLINIC PLAN EDITOR ───────────────────────────────────────────────────────

function ClinicPlanEditor({
  clinic, onApply, loadingId,
}: {
  clinic: AdminClinicRecord;
  onApply: (clinic: AdminClinicRecord, plan: PlanDraft) => void;
  loadingId: string | null;
}) {
  const [selectedStatus, setSelectedStatus] = useState<PlanDraft["status"]>("active");
  const [days, setDays] = useState<number>(30);
  const [selectedPlan, setSelectedPlan] = useState<PlanDraft["plan"]>((clinic.dominant_plan as "basic" | "clinic") || "clinic");
  const isLoading = loadingId === clinic.id;

  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      <select
        className="hce-input text-xs py-1 px-2 w-auto"
        value={selectedPlan}
        onChange={(e) => setSelectedPlan(e.target.value as PlanDraft["plan"])}
      >
        <option value="basic">Básico</option>
        <option value="clinic">Clínica</option>
      </select>

      <select
        className="hce-input text-xs py-1 px-2 w-auto"
        value={selectedStatus}
        onChange={(e) => setSelectedStatus(e.target.value as PlanDraft["status"])}
      >
        <option value="active">Activo</option>
        <option value="lifetime">Lifetime ∞</option>
        <option value="canceled">Cancelar (Revocar a todos)</option>
      </select>

      {selectedStatus === "active" && (
        <select
          className="hce-input text-xs py-1 px-2 w-auto"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>7 días</option>
          <option value={15}>15 días</option>
          <option value={30}>30 días</option>
          <option value={90}>3 meses</option>
          <option value={180}>6 meses</option>
          <option value={365}>1 año</option>
        </select>
      )}

      <button
        disabled={isLoading}
        onClick={() =>
          onApply(clinic, {
            status: selectedStatus,
            days: selectedStatus === "active" ? days : undefined,
            plan: selectedPlan,
          })
        }
        className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
      >
        {isLoading ? "…" : "Aplicar a Clínica"}
      </button>
    </div>
  );
}

// ─── STATUS FILTER PILLS ──────────────────────────────────────────────────────

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all",        label: "Todos" },
  { value: "active",     label: "Activos" },
  { value: "lifetime",   label: "Lifetime" },
  { value: "trialing",   label: "Trial" },
  { value: "incomplete", label: "Incompletos" },
  { value: "canceled",   label: "Cancelados" },
  { value: "none",       label: "Sin plan" },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function AdminPanelClient({ initialUsers, stats, abandonedItems, pricing, initialClinics, globalConfig, currentPage, totalPages, totalItems }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParamsHook = useSearchParams();
  const [activeTab, setActiveTab] = useState<"users" | "clinics" | "config">("users");
  
  const [users, setUsers] = useState<AdminUserRecord[]>(initialUsers);
  const [clinics, setClinics] = useState<AdminClinicRecord[]>(initialClinics);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    user: AdminUserRecord;
    plan: PlanDraft;
  } | null>(null);
  const [confirmClinicTarget, setConfirmClinicTarget] = useState<{
    clinic: AdminClinicRecord;
    plan: PlanDraft;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRecord | null>(null);

  // Pricing state
  const [proPrice, setProPrice] = useState(pricing?.proPrice ?? 29);
  const [clinicPrice, setClinicPrice] = useState(pricing?.clinicPrice ?? 99);
  const [isSavingPricing, setIsSavingPricing] = useState(false);

  // Global Config state
  const [config, setConfig] = useState(globalConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const handleSavePricing = async () => {
    setIsSavingPricing(true);
    try {
      const { updatePricing } = await import("@/features/admin/actions");
      await updatePricing(proPrice, clinicPrice);
      toast.success("Precios actualizados en la base de datos.");
    } catch (e) {
      toast.error("Error al actualizar precios: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSavingPricing(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const { updateGlobalConfig } = await import("@/features/admin/actions");
      await updateGlobalConfig(config.terms_version, config.terms_content, config.maintenance_mode, config.global_notice);
      toast.success("Configuración global actualizada.");
    } catch (e) {
      toast.error("Error al actualizar configuración: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSavingConfig(false);
    }
  };

  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setConfig(prev => ({ ...prev, terms_content: content }));
        toast.success("Archivo Markdown cargado en el editor.");
      }
    };
    reader.onerror = () => toast.error("Error al leer el archivo.");
    reader.readAsText(file);
  };

  // Derived: how many new in last 48h
  const recentCount = useMemo(
    () => users.filter((u) => isRecentUser(u.created_at)).length,
    [users],
  );

  // Filtered users
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        u.full_name.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        u.specialty.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "none"
          ? u.subscription_status === "none" || !u.subscription_status
          : u.subscription_status === statusFilter);

      return matchSearch && matchStatus;
    });
  }, [users, search, statusFilter]);

  const handleApply = (user: AdminUserRecord, plan: PlanDraft) => {
    setConfirmTarget({ user, plan });
  };

  const handleConfirm = () => {
    if (!confirmTarget) return;
    const { user, plan } = confirmTarget;

    startTransition(async () => {
      setLoadingId(user.id);
      try {
        const result = await setSubscriptionStatus(user.id, plan.status, plan.days, plan.plan);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  subscription_status: plan.status,
                  subscription_expires_at: result.expires_at ?? null,
                  plan: plan.plan,
                }
              : u,
          ),
        );
        toast.success("Suscripción actualizada ✓");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar");
      } finally {
        setLoadingId(null);
        setConfirmTarget(null);
      }
    });
  };

  const handleClinicApply = (clinic: AdminClinicRecord, plan: PlanDraft) => {
    setConfirmClinicTarget({ clinic, plan });
  };

  const handleClinicConfirm = () => {
    if (!confirmClinicTarget) return;
    const { clinic, plan } = confirmClinicTarget;

    startTransition(async () => {
      setLoadingId(clinic.id);
      try {
        const result = await setClinicSubscriptionStatus(clinic.id, plan.status, plan.days, plan.plan);
        setClinics((prev) =>
          prev.map((c) =>
            c.id === clinic.id
              ? {
                  ...c,
                  dominant_status: plan.status,
                  dominant_expires_at: result.expires_at ?? null,
                  dominant_plan: plan.plan,
                }
              : c,
          ),
        );
        toast.success("Suscripción de clínica actualizada. Todos los miembros han sido actualizados ✓");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar la clínica");
      } finally {
        setLoadingId(null);
        setConfirmClinicTarget(null);
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;

    startTransition(async () => {
      setLoadingId(target.id);
      try {
        await deleteUserAccount(target.id);
        setUsers((prev) => prev.filter((u) => u.id !== target.id));
        toast.success("Cuenta eliminada correctamente");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al eliminar cuenta");
      } finally {
        setLoadingId(null);
        setDeleteTarget(null);
      }
    });
  };

  return (
    <>
      {/* ── TABS NAVEGACIÓN ── */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "users" ? "border-accent text-accent" : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Usuarios
        </button>
        <button
          onClick={() => setActiveTab("clinics")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "clinics" ? "border-accent text-accent" : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Clínicas
        </button>
        <button
          onClick={() => setActiveTab("config")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "config" ? "border-accent text-accent" : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Config. Global
        </button>
      </div>

      {activeTab === "users" && (
        <>
          {/* ── STAT CARDS (clickables como filtros) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          label="Total Usuarios" value={stats.total} color="text-ink"
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <StatCard
          label="Activos" value={stats.active} color="text-emerald-500"
          active={statusFilter === "active"}
          onClick={() => setStatusFilter("active")}
        />
        <StatCard
          label="Lifetime" value={stats.lifetime} color="text-purple-500"
          active={statusFilter === "lifetime"}
          onClick={() => setStatusFilter("lifetime")}
        />
        <StatCard
          label="Inactivos" value={stats.inactive} color="text-red-400"
          active={statusFilter === "canceled"}
          onClick={() => setStatusFilter("canceled")}
        />
        <StatCard
          label="Sin Plan" value={stats.none} color="text-slate-400"
          active={statusFilter === "none"}
          onClick={() => setStatusFilter("none")}
        />
      </div>

      {/* ── CONFIGURACIÓN DE PRECIOS ── */}
      <div className="hce-surface rounded-xl overflow-hidden border border-border p-5 mt-4">
        <h2 className="text-lg font-bold text-ink mb-1">Configuración Pública (Landing)</h2>
        <p className="text-sm text-ink-soft mb-4">
          Modifica los precios mostrados en el Landing Page en tiempo real.
        </p>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">Plan Profesional ($)</label>
            <input
              type="number"
              value={proPrice}
              onChange={(e) => setProPrice(Number(e.target.value))}
              className="hce-input w-32"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-soft mb-1">Plan Clínica ($)</label>
            <input
              type="number"
              value={clinicPrice}
              onChange={(e) => setClinicPrice(Number(e.target.value))}
              className="hce-input w-32"
            />
          </div>
          <button
            onClick={handleSavePricing}
            disabled={isSavingPricing}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isSavingPricing ? "Guardando..." : "Guardar Precios"}
          </button>
        </div>
      </div>

      {/* ── RECENT USERS NOTICE ── */}
      {isMounted && recentCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-sm">
          <span className="inline-block w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          <span>
            <strong>{recentCount}</strong> usuario{recentCount !== 1 ? "s" : ""} nuevo{recentCount !== 1 ? "s" : ""} en las últimas 48h
          </span>
        </div>
      )}

      {/* ── SEARCH + FILTER PILLS ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            className="hce-input flex-1"
            placeholder="Buscar por nombre, email o especialidad…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-ink-soft hover:text-ink"
            >
              Limpiar
            </button>
          )}
          <p className="text-xs text-ink-soft whitespace-nowrap">
            {filtered.length} / {users.length} usuarios
          </p>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                statusFilter === opt.value
                  ? "bg-accent text-bg border-accent"
                  : "border-border text-ink-soft hover:border-accent/50 hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── USERS TABLE ── */}
      <div className="hce-surface rounded-xl overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg-soft text-ink-soft border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Doctor</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Especialidad</th>
                <th className="px-5 py-3">Tipo Plan</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Expira</th>
                <th className="px-5 py-3">Registro</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-bg-soft/50 transition-colors ${
                    isMounted && isRecentUser(user.created_at) ? "border-l-2 border-l-sky-500" : ""
                  }`}
                >
                  <td className="px-5 py-4 font-medium text-ink whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {user.full_name}
                      {isMounted && isRecentUser(user.created_at) && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400">
                          Nuevo
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-ink-soft mt-0.5 flex items-center">
                      {user.id.slice(0, 8)}…
                      <CopyButton text={user.id} />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-ink-soft">
                    <div className="flex items-center gap-1">
                      {user.email ?? "—"}
                      {user.email && <CopyButton text={user.email} />}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-ink-soft text-xs">
                    {user.specialty || "—"}
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-ink">
                    {user.plan === "clinic" ? "Clínica" : "Básico"}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={user.subscription_status} />
                  </td>
                  <td suppressHydrationWarning className="px-5 py-4 text-xs text-ink-soft">
                    {user.subscription_expires_at
                      ? new Date(user.subscription_expires_at).toLocaleDateString("es-ES")
                      : user.subscription_status === "lifetime"
                        ? "∞ Nunca"
                        : "—"}
                  </td>
                  <td suppressHydrationWarning className="px-5 py-4 text-xs text-ink-soft whitespace-nowrap">
                    {new Date(user.created_at).toLocaleDateString("es-ES")}
                  </td>
                  <td className="px-5 py-4">
                    <PlanEditor
                      user={user}
                      onApply={handleApply}
                      loadingId={loadingId}
                      setDeleteTarget={setDeleteTarget}
                    />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-ink-soft">
                    No se encontraron usuarios con esa búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-ink-soft">
              Página {currentPage} de {totalPages} ({totalItems} en total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage <= 1 || isPending}
                onClick={() => {
                  const params = new URLSearchParams(searchParamsHook.toString());
                  params.set("page", (currentPage - 1).toString());
                  startTransition(() => router.push(`${pathname}?${params.toString()}`));
                }}
                className="px-3 py-1 rounded-lg border border-border text-xs font-medium hover:bg-bg-soft disabled:opacity-50 transition-colors"
              >
                Anterior
              </button>
              <button
                disabled={currentPage >= totalPages || isPending}
                onClick={() => {
                  const params = new URLSearchParams(searchParamsHook.toString());
                  params.set("page", (currentPage + 1).toString());
                  startTransition(() => router.push(`${pathname}?${params.toString()}`));
                }}
                className="px-3 py-1 rounded-lg border border-border text-xs font-medium hover:bg-bg-soft disabled:opacity-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* ── CLINICS TAB ── */}
      {activeTab === "clinics" && (
        <div className="hce-surface rounded-xl overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-bg-soft text-ink-soft border-b border-border text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Clínica</th>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Miembros</th>
                  <th className="px-5 py-3">Estado Dominante</th>
                  <th className="px-5 py-3">Registro</th>
                  <th className="px-5 py-3 text-right">Aplicar en Bloque a Clínica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clinics.map((clinic) => (
                  <tr key={clinic.id} className="hover:bg-bg-soft/50 transition-colors">
                    <td className="px-5 py-4 font-medium text-ink whitespace-nowrap">
                      {clinic.name}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-ink-soft">
                      {clinic.id.slice(0, 8)}…
                      <CopyButton text={clinic.id} />
                    </td>
                    <td className="px-5 py-4 text-ink font-semibold">
                      {clinic.member_count}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={clinic.dominant_status} />
                    </td>
                    <td className="px-5 py-4 text-xs text-ink-soft whitespace-nowrap">
                      {new Date(clinic.created_at).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-5 py-4">
                      <ClinicPlanEditor
                        clinic={clinic}
                        onApply={handleClinicApply}
                        loadingId={loadingId}
                      />
                    </td>
                  </tr>
                ))}
                {clinics.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-ink-soft">
                      No hay clínicas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "config" && (
        <div className="space-y-6 max-w-2xl">
          <div className="hce-surface rounded-xl overflow-hidden border border-border p-5">
            <h2 className="text-lg font-bold text-ink mb-1">Políticas Legales y Configuración Global</h2>
            <p className="text-sm text-ink-soft mb-6">
              Gestiona aspectos que afectan a toda la plataforma. Al cambiar la versión de los T&C, forzarás a todos los usuarios que no la hayan aceptado a confirmar las nuevas reglas.
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-ink mb-1">Versión Actual de Términos y Condiciones</label>
                <p className="text-xs text-ink-soft mb-2">Incrementa este número (Ej. 1.0.0 a 1.1.0) cuando actualices las reglas legales para solicitar re-aceptación masiva.</p>
                <input
                  type="text"
                  value={config.terms_version}
                  onChange={(e) => setConfig({ ...config, terms_version: e.target.value })}
                  className="hce-input w-full"
                  placeholder="1.0.0"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-semibold text-ink">Contenido de Términos (Markdown)</label>
                  <label className="cursor-pointer px-3 py-1 bg-bg-soft hover:bg-border text-ink-soft hover:text-ink border border-border rounded text-xs font-medium transition-colors">
                    <span>Subir archivo .md</span>
                    <input 
                      type="file" 
                      accept=".md" 
                      className="hidden" 
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
                <p className="text-xs text-ink-soft mb-2">
                  Puedes pegar el contenido en formato Markdown aquí o subir un archivo directamente. 
                  Este contenido se mostrará públicamente en <a href="/terminos" target="_blank" className="text-accent hover:underline">/terminos</a>.
                </p>
                <textarea
                  value={config.terms_content}
                  onChange={(e) => setConfig({ ...config, terms_content: e.target.value })}
                  className="hce-input w-full min-h-[200px] font-mono text-xs"
                  placeholder="# Términos y Condiciones..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.maintenance_mode}
                    onChange={(e) => setConfig({ ...config, maintenance_mode: e.target.checked })}
                    className="rounded border-border text-accent focus:ring-accent"
                  />
                  Activar Modo Mantenimiento
                </label>
                <p className="text-xs text-ink-soft ml-6">Bloqueará el acceso al Dashboard a todos los usuarios mostrando una pantalla de mantenimiento.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1">Anuncio Global en el Dashboard</label>
                <p className="text-xs text-ink-soft mb-2">Escribe un mensaje aquí para mostrarlo de forma persistente a todos los usuarios (déjalo vacío para ocultarlo).</p>
                <textarea
                  value={config.global_notice}
                  onChange={(e) => setConfig({ ...config, global_notice: e.target.value })}
                  className="hce-input w-full min-h-[80px]"
                  placeholder="Ej. Realizaremos mantenimiento programado esta madrugada a las 3:00 AM..."
                />
              </div>

              <div className="pt-2 border-t border-border">
                <button
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {isSavingConfig ? "Guardando..." : "Guardar Cambios Globales"}
                </button>
              </div>
            </div>
          </div>
          
          {/* Aquí movemos la parte de Precios a la pestaña Configuración */}
          <div className="hce-surface rounded-xl overflow-hidden border border-border p-5">
            <h2 className="text-lg font-bold text-ink mb-1">Configuración Pública (Landing)</h2>
            <p className="text-sm text-ink-soft mb-4">
              Modifica los precios mostrados en el Landing Page en tiempo real.
            </p>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Plan Profesional ($)</label>
                <input
                  type="number"
                  value={proPrice}
                  onChange={(e) => setProPrice(Number(e.target.value))}
                  className="hce-input w-32"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Plan Clínica ($)</label>
                <input
                  type="number"
                  value={clinicPrice}
                  onChange={(e) => setClinicPrice(Number(e.target.value))}
                  className="hce-input w-32"
                />
              </div>
              <button
                onClick={handleSavePricing}
                disabled={isSavingPricing}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isSavingPricing ? "Guardando..." : "Guardar Precios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ABANDONED SYNC ITEMS ── */}
      <div className="mt-12 hce-surface rounded-xl overflow-hidden border border-border">
        <div className="px-5 py-4 border-b border-border bg-bg-soft flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">Sincronización Abandonada</h2>
            <p className="text-sm text-ink-soft mt-1">
              Ítems que fallaron más de 3 veces al sincronizar con el servidor.
            </p>
          </div>
          {abandonedItems.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
              {abandonedItems.length}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg-soft text-ink-soft border-b border-border text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Tabla</th>
                <th className="px-5 py-3">ID Registro</th>
                <th className="px-5 py-3">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {abandonedItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-ink-soft">
                    ✓ Sin registros abandonados. ¡Todo sincronizado!
                  </td>
                </tr>
              ) : (
                abandonedItems.map((item) => {
                  const errorMsg =
                    item.changes && typeof item.changes.error === "string"
                      ? item.changes.error
                      : "Error desconocido";
                  return (
                    <tr key={item.id} className="hover:bg-bg-soft/50 transition-colors">
                      <td suppressHydrationWarning className="px-5 py-4 text-xs text-ink-soft whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString("es-ES")}
                      </td>
                      <td className="px-5 py-4 font-medium text-amber-600">
                        {item.resource_type}
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-ink-soft flex items-center gap-1">
                        {item.resource_id.slice(0, 12)}…
                        <CopyButton text={item.resource_id} />
                      </td>
                      <td
                        className="px-5 py-4 text-xs text-red-500 max-w-md truncate"
                        title={errorMsg}
                      >
                        {errorMsg}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-ink-soft text-right mt-4">
        ⚠️ Panel de acceso exclusivo para administradores del sistema. No indexado por buscadores.
      </p>

      {/* ── CONFIRM MODAL ── */}
      {confirmTarget && (
        <ConfirmDialog
          user={confirmTarget.user}
          plan={confirmTarget.plan}
          loading={isPending || loadingId === confirmTarget.user.id}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      {/* ── CLINIC CONFIRM MODAL ── */}
      {confirmClinicTarget && (
        <ConfirmDialog
          user={{ full_name: `toda la ${confirmClinicTarget.clinic.name}`, email: "Clínica", id: "" } as any}
          plan={confirmClinicTarget.plan}
          loading={isPending || loadingId === confirmClinicTarget.clinic.id}
          onConfirm={handleClinicConfirm}
          onCancel={() => setConfirmClinicTarget(null)}
        />
      )}

      {/* ── DELETE MODAL ── */}
      {deleteTarget && (
        <DeleteDialog
          user={deleteTarget}
          loading={isPending || loadingId === deleteTarget.id}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
