"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteSyncQueueItem,
  getSyncQueueStats,
  listSyncQueueItems,
  purgeAbandonedSyncItems,
  updateSyncItemStatus,
} from "@/lib/db/indexeddb";
import {
  flushSyncQueue,
  SYNC_FINISHED_EVENT,
  type SyncFlushSummary,
} from "@/lib/sync/sync-worker";
import { buildRetryableErrorMessage } from "@/lib/ui/feedback-copy";
import type { SyncQueueItem } from "@/types/sync";
import { RefreshCw, CheckCircle2, Clock, AlertTriangle, XCircle, Wifi, WifiOff, ChevronDown, Trash2, RotateCcw } from "lucide-react";

type QueueStats = {
  pending: number;
  failed: number;
  abandoned: number;
  conflicted: number;
};

type LastSyncState = {
  at: number;
  summary: SyncFlushSummary;
};

const LAST_SYNC_KEY = "hce:last-sync";

// NF-05: locale fijo "es-EC" — consistente con el resto de la app.
function formatTimestamp(value: number) {
  return new Date(value).toLocaleString("es-EC");
}

function relativeTime(value: number): string {
  const diff = Date.now() - value;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "hace unos segundos";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  return formatTimestamp(value);
}

/**
 * M-06: Convierte códigos de error PostgreSQL a mensajes en español.
 * Los códigos aparecen en last_error cuando el sync falla contra Supabase.
 */
function pgErrorToSpanish(raw: string): string {
  if (/23505/.test(raw))
    return "Registro duplicado (cód. 23505)";
  if (/42501/.test(raw))
    return "Sin permisos (cód. 42501)";
  if (/23503/.test(raw))
    return "Referencia inválida (cód. 23503)";
  if (/40001/.test(raw))
    return "Conflicto de concurrencia (cód. 40001)";
  if (/PGRST/.test(raw))
    return `Error API: ${raw.substring(0, 80)}`;
  return raw.length > 80 ? raw.substring(0, 80) + "…" : raw;
}

function statusConfig(status: string) {
  switch (status) {
    case "pending":
      return { label: "En cola", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" };
    case "failed":
      return { label: "Fallido", icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" };
    case "abandoned":
      return { label: "Abandonado", icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" };
    case "conflicted":
      return { label: "Conflicto", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" };
    default:
      return { label: "Sincronizado", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
  }
}

export function SyncQueuePanel() {
  const [stats, setStats] = useState<QueueStats>({
    pending: 0,
    failed: 0,
    abandoned: 0,
    conflicted: 0,
  });
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<LastSyncState | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number>(0);

  const totalItems = useMemo(
    () => stats.pending + stats.failed + stats.abandoned + stats.conflicted,
    [stats],
  );

  const refreshQueue = useCallback(async () => {
    try {
      const [nextStats, nextItems] = await Promise.all([
        getSyncQueueStats(),
        listSyncQueueItems(),
      ]);

      setStats(nextStats);
      setItems(nextItems);
      setLastRefreshAt(Date.now());
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : buildRetryableErrorMessage("cargar la cola de sincronizacion"),
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsOnline(window.navigator.onLine);

    const saved = window.localStorage.getItem(LAST_SYNC_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as LastSyncState;
        if (
          typeof parsed?.at === "number" &&
          typeof parsed?.summary?.processed === "number"
        ) {
          setLastSync(parsed);
        }
      } catch {
        // Ignore parse errors and continue with empty last sync state.
      }
    }

    void refreshQueue();
  }, [refreshQueue]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshQueue();
      }
    };

    const handleSyncFinished = (event: Event) => {
      const customEvent = event as CustomEvent<SyncFlushSummary>;
      if (!customEvent.detail) {
        return;
      }

      const nextState: LastSyncState = {
        at: Date.now(),
        summary: customEvent.detail,
      };

      setLastSync(nextState);
      window.localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(nextState));
      void refreshQueue();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener(SYNC_FINISHED_EVENT, handleSyncFinished as EventListener);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(SYNC_FINISHED_EVENT, handleSyncFinished as EventListener);
    };
  }, [expanded, refreshQueue]);

  async function handleDiscard(itemId: string) {
    setWorking(true);
    setError(null);

    try {
      await deleteSyncQueueItem(itemId);
      await refreshQueue();
    } catch (discardError) {
      setError(
        discardError instanceof Error
          ? discardError.message
          : buildRetryableErrorMessage("descartar el item de la cola"),
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleRetryAbandoned(itemId: string) {
    setWorking(true);
    setError(null);

    try {
      await updateSyncItemStatus(itemId, "pending", undefined, 0, Date.now());
      await flushSyncQueue({ forceRetry: true });
      await refreshQueue();
    } catch (retryError) {
      setError(
        retryError instanceof Error
          ? retryError.message
          : buildRetryableErrorMessage("reintentar el elemento abandonado"),
      );
    } finally {
      setWorking(false);
    }
  }

  async function handlePurgeAbandoned() {
    setWorking(true);
    setError(null);

    try {
      await purgeAbandonedSyncItems();
      await refreshQueue();
    } catch (purgeError) {
      setError(
        purgeError instanceof Error
          ? purgeError.message
          : buildRetryableErrorMessage("limpiar los elementos abandonados"),
      );
    } finally {
      setWorking(false);
    }
  }

  const hasErrors = stats.failed > 0 || stats.abandoned > 0 || stats.conflicted > 0;

  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy={working}
      aria-label="Estado de sincronización"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      {/* ── Header summary ── */}
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            hasErrors ? "bg-amber-500/10" : "bg-emerald-500/10"
          }`}>
            {hasErrors ? (
              <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-ink">
              {totalItems === 0
                ? "Todo sincronizado"
                : `${totalItems} elemento${totalItems > 1 ? "s" : ""} en cola`}
            </h3>
            <p className="text-xs text-ink-soft truncate">
              {isOnline ? (
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  En línea
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                  Sin conexión
                </span>
              )}
              {lastSync && (
                <> · Última sync: {relativeTime(lastSync.at)}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {stats.abandoned > 0 && (
            <button
              type="button"
              id="sync-purge-abandoned-btn"
              onClick={() => void handlePurgeAbandoned()}
              disabled={working}
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-red-500 transition hover:bg-red-500/20 disabled:opacity-60"
            >
              Limpiar ({stats.abandoned})
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-soft transition hover:bg-bg-soft hover:text-ink ${
              expanded ? "bg-bg-soft text-ink" : ""
            }`}
          >
            {expanded ? "Ocultar" : "Ver cola"}
            <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Stat pills ── */}
      <div className="grid grid-cols-4 gap-px border-t border-border bg-border">
        {[
          { label: "Pendientes", value: stats.pending, color: "text-sky-500" },
          { label: "Fallidos", value: stats.failed, color: "text-orange-500" },
          { label: "Abandonados", value: stats.abandoned, color: "text-red-500" },
          { label: "Conflictos", value: stats.conflicted, color: "text-amber-500" },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-0.5 bg-card py-3">
            <span className={`text-lg font-extrabold tabular-nums ${stat.value > 0 ? stat.color : "text-ink-faint"}`}>
              {stat.value}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Error display ── */}
      {error ? (
        <div className="border-t border-red-500/20 bg-red-500/5 px-5 py-3">
          <p className="text-xs font-medium text-red-500">{error}</p>
        </div>
      ) : null}

      {/* ── Last sync info bar ── */}
      {lastSync && (
        <div className="flex items-center gap-2 border-t border-border bg-bg-soft/50 px-5 py-2.5">
          <RefreshCw className="h-3 w-3 text-accent shrink-0" />
          <p className="text-[11px] text-ink-soft">
            <span className="font-medium text-ink-soft">Último resultado:</span>{" "}
            {lastSync.summary.processed} procesados, {lastSync.summary.succeeded} exitosos
            {lastSync.summary.failed > 0 && <>, <span className="text-red-500">{lastSync.summary.failed} fallidos</span></>}
            {lastSync.summary.conflicted > 0 && <>, <span className="text-amber-500">{lastSync.summary.conflicted} conflictos</span></>}
          </p>
        </div>
      )}

      {/* ── Queue items list ── */}
      {expanded && (
        <div className="border-t border-border">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500/40" />
              <p className="text-sm font-medium text-ink-soft">
                No hay elementos pendientes
              </p>
              <p className="text-xs text-ink-faint">
                Todas las consultas están sincronizadas con el servidor.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => {
                const cfg = statusConfig(item.status);
                const StatusIcon = cfg.icon;
                return (
                  <article
                    key={item.id}
                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-bg-soft/50"
                  >
                    {/* Status icon */}
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg} ${cfg.border} border`}>
                      <StatusIcon className={`h-3.5 w-3.5 ${cfg.color}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink truncate">
                          {item.table_name === "clinical_records" ? "Consulta clínica" : item.table_name}
                        </p>
                        <span className="text-[10px] font-mono text-ink-faint uppercase">
                          {item.action}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[11px] text-ink-faint truncate font-mono">
                          {item.record_id.substring(0, 8)}…
                        </p>
                        <span className="text-[11px] text-ink-faint">
                          · {relativeTime(item.client_timestamp)}
                        </span>
                        {item.retry_count > 0 && (
                          <span className="text-[11px] text-ink-faint">
                            · {item.retry_count} intentos
                          </span>
                        )}
                      </div>
                      {item.last_error && (
                        <p className="text-[11px] text-red-500 mt-0.5 truncate">
                          {pgErrorToSpanish(item.last_error)}
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${cfg.color} ${cfg.bg}`}>
                      {cfg.label}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {item.status === "abandoned" && (
                        <button
                          type="button"
                          onClick={() => void handleRetryAbandoned(item.id)}
                          disabled={working || !isOnline}
                          title="Reintentar"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-ink-soft transition hover:bg-sky-500/10 hover:text-sky-500 hover:border-sky-500/20 disabled:opacity-40"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDiscard(item.id)}
                        disabled={working}
                        title="Descartar"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-ink-soft transition hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Footer timestamp ── */}
      {lastRefreshAt > 0 && (
        <div className="border-t border-border px-5 py-2">
          <p className="text-[10px] text-ink-faint text-right tabular-nums">
            Actualizado {formatTimestamp(lastRefreshAt)}
          </p>
        </div>
      )}
    </section>
  );
}
