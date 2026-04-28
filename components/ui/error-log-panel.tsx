"use client";

/**
 * components/ui/error-log-panel.tsx
 *
 * Panel compacto de errores recientes del sistema.
 * Solo visible si hay errores en el log — se colapsa automáticamente cuando no hay.
 * Proporciona observabilidad básica al médico sin requerir herramientas de devtools.
 */

import { useState } from "react";
import { useErrorLog } from "@/lib/observability/use-error-log";
import { formatDateTime } from "@/lib/ui/format-date";

const SOURCE_LABELS: Record<string, string> = {
  sync: "Sincronización",
  api: "API",
  crypto: "Cifrado",
  db: "Base de datos",
  auth: "Autenticación",
  unknown: "Desconocido",
};

const SEVERITY_STYLES: Record<string, string> = {
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-red-50 text-red-700 border-red-200",
  critical: "bg-red-100 text-red-900 border-red-400 font-semibold",
};

const SEVERITY_BADGE: Record<string, string> = {
  warn: "bg-amber-100 text-amber-800",
  error: "bg-red-100 text-red-800",
  critical: "bg-red-200 text-red-900",
};

export function ErrorLogPanel() {
  const { errors, errorCount, hasErrors, clearErrors } = useErrorLog();
  const [expanded, setExpanded] = useState(false);

  if (!hasErrors) return null;

  return (
    <section
      role="alert"
      aria-live="polite"
      className="rounded-2xl border border-red-300 bg-red-50/80 px-4 py-3 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Indicador pulsante */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <p className="text-sm font-semibold text-red-800">
            {errorCount} {errorCount === 1 ? "error" : "errores"} detectado{errorCount === 1 ? "" : "s"}
          </p>
          <span className="text-xs text-red-600/70">
            (últimos {errors.length} eventos)
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg border border-red-300 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50"
          >
            {expanded ? "Ocultar" : "Ver detalle"}
          </button>
          <button
            type="button"
            onClick={clearErrors}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-red-500 hover:text-red-700 transition"
            title="Limpiar log de errores"
          >
            Limpiar
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
          {errors
            .slice()
            .reverse()
            .map((entry) => (
              <div
                key={entry.id}
                className={`rounded-xl border px-3 py-2.5 text-xs ${SEVERITY_STYLES[entry.severity] ?? SEVERITY_STYLES.error}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SEVERITY_BADGE[entry.severity] ?? SEVERITY_BADGE.error}`}
                  >
                    {entry.severity}
                  </span>
                  <span className="font-medium">
                    {SOURCE_LABELS[entry.source] ?? entry.source}
                  </span>
                  <span className="ml-auto text-[10px] opacity-60">
                    {formatDateTime(entry.timestamp)}
                  </span>
                </div>
                <p className="font-mono text-[11px] opacity-80">{entry.context}</p>
                <p className="mt-0.5">{entry.message}</p>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
