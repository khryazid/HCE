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

  const hasItems = useMemo(
    () => stats.pending + stats.failed + stats.abandoned + stats.conflicted > 0,
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

  // Reintento individual de un item abandonado — lo re-clasifica a pending
  // con retry_count=0 y fuerza un flush inmediato.
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

  // Elimina todos los items abandonados y sus dependientes huérfanos
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
      aria-label="Estado de sincronizacion"
      className={`px-4 py-3 ${
        hasErrors ? "hce-alert-warning" : "hce-alert-success"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-2 min-w-0 pr-4">
          <p className="font-semibold text-ink">Estado de sincronizacion</p>
          <p className="text-sm text-ink-soft leading-relaxed break-words">
            Pendientes: {stats.pending} · Fallidos: {stats.failed} · Abandonados: {stats.abandoned} · Conflictos: {stats.conflicted}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed break-words">
            Conexion: {isOnline ? "En linea" : "Sin conexion"}
            {lastSync ? ` · Ultima sincronizacion: ${formatTimestamp(lastSync.at)}` : " · Sin sincronizacion registrada"}
          </p>
          {lastSync ? (
            <p className="text-xs text-muted-foreground leading-relaxed break-words">
              Resultado ultimo intento: procesados {lastSync.summary.processed}, exitosos {lastSync.summary.succeeded}, fallidos {lastSync.summary.failed}, conflictos {lastSync.summary.conflicted}
            </p>
          ) : null}
          {lastRefreshAt > 0 ? (
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed break-words">
              Actualizado {formatTimestamp(lastRefreshAt)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {stats.abandoned > 0 && (
            <button
              type="button"
              id="sync-purge-abandoned-btn"
              onClick={() => void handlePurgeAbandoned()}
              disabled={working}
              className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-red-600 disabled:opacity-60 hover:bg-red-500/20 transition"
            >
              Limpiar abandonados ({stats.abandoned})
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="rounded-xl border border-border bg-card/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink hover:bg-card/80 transition"
          >
            {expanded ? "Ocultar cola" : "Ver cola"}
          </button>

        </div>
      </div>

      {error ? (
        <p className="mt-3 hce-alert-error">
          {error}
        </p>
      ) : null}

      {expanded && hasItems ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card/70 backdrop-blur-md">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-ink-soft">No hay elementos en cola.</p>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <article key={item.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-ink">
                        {item.action.toUpperCase()} · {item.table_name}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          item.status === "abandoned"
                            ? "bg-red-100 text-red-700"
                            : item.status === "conflicted"
                              ? "bg-amber-100 text-amber-700"
                              : item.status === "failed"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-ink-soft">{item.record_id}</p>
                    <p className="text-xs text-ink-soft/80">
                      {formatTimestamp(item.client_timestamp)} · intentos {item.retry_count}
                    </p>
                    {item.last_error ? (
                      <p className="text-xs text-red-500">{item.last_error}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {item.status === "abandoned" ? (
                      <button
                        type="button"
                        onClick={() => void handleRetryAbandoned(item.id)}
                        disabled={working || !isOnline}
                        className="rounded-xl border border-sky-300/40 bg-sky-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-sky-700 disabled:opacity-60 hover:bg-sky-500/20 transition"
                      >
                        Reintentar
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleDiscard(item.id)}
                      disabled={working}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-red-600 disabled:opacity-60 hover:bg-red-500/20 transition"
                    >
                      Descartar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {expanded && !hasItems ? (
        <div className="mt-4 rounded-xl border border-border bg-card/70 p-4 text-sm text-ink-soft backdrop-blur-md">
          No hay elementos pendientes en la cola.
        </div>
      ) : null}
    </section>
  );
}
