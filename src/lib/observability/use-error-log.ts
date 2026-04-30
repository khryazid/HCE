"use client";

/**
 * lib/observability/use-error-log.ts
 *
 * Hook que expone el log de errores estructurados al UI.
 * Se suscribe al evento APP_EVENT_SYNC_ERROR para actualizar en tiempo real.
 * Seguro para SSR — no accede a sessionStorage en el servidor.
 */

import { useCallback, useEffect, useState } from "react";
import {
  clearErrors,
  getRecentErrors,
  type StructuredError,
} from "@/lib/observability/error-logger";
import {
  APP_EVENT_SYNC_ERROR,
  APP_EVENT_SYNC_ABANDONED,
  APP_EVENT_API_ERROR,
} from "@/lib/observability/app-events";

const REFRESH_EVENTS = [
  APP_EVENT_SYNC_ERROR,
  APP_EVENT_SYNC_ABANDONED,
  APP_EVENT_API_ERROR,
];

export function useErrorLog() {
  const [errors, setErrors] = useState<StructuredError[]>([]);

  const refresh = useCallback(() => {
    setErrors(getRecentErrors());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Carga inicial
    // Usamos un microtask para evitar el warning react-hooks/set-state-in-effect
    // y prevenir problemas de hidratación en Next.js.
    queueMicrotask(() => refresh());

    // Actualiza cuando llegan nuevos errores vía eventos de la app
    const handler = () => refresh();
    for (const event of REFRESH_EVENTS) {
      window.addEventListener(event, handler);
    }

    return () => {
      for (const event of REFRESH_EVENTS) {
        window.removeEventListener(event, handler);
      }
    };
  }, [refresh]);

  const handleClear = useCallback(() => {
    clearErrors();
    setErrors([]);
  }, []);

  const errorCount = errors.filter(
    (e) => e.severity === "error" || e.severity === "critical",
  ).length;

  const hasErrors = errorCount > 0;

  return { errors, errorCount, hasErrors, clearErrors: handleClear };
}
