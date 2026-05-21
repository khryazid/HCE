/**
 * lib/observability/usage-tracker.ts
 *
 * Sistema ultra-ligero para rastrear el uso de funcionalidades clave.
 * Guarda contadores en localStorage para no requerir un backend.
 * Permite tomar decisiones de UX basadas en qué herramientas se usan más.
 *
 * B-03: Rotación mensual automática — el key incluye YYYY-MM para que los
 * contadores se reinicien cada mes y no crezcan indefinidamente en localStorage.
 */

// B-03: Key mensual — "hce:ui-usage-metrics:2026-05" → auto-rotación
function getMonthlyKey(): string {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `hce:ui-usage-metrics:${ym}`;
}

// Limpiar entradas de meses anteriores (máx 1 mes de historial)
function pruneOldKeys() {
  try {
    const currentKey = getMonthlyKey();
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith("hce:ui-usage-metrics:") && key !== currentKey) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Si falla, no bloqueamos nada
  }
}

export type UsageMetricAction =
  | "consultation:start"
  | "consultation:save"
  | "patient:create"
  | "patient:search"
  | "pdf:generate"
  | "followup:create"
  | "dashboard:filter_followups";

export function trackUsage(action: UsageMetricAction) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const key = getMonthlyKey();
    const raw = window.localStorage.getItem(key);
    const metrics: Record<string, number> = raw ? JSON.parse(raw) : {};

    metrics[action] = (metrics[action] ?? 0) + 1;
    window.localStorage.setItem(key, JSON.stringify(metrics));

    // B-03: Limpiar meses viejos en background (1/20 llamadas para no penalizar cada acción)
    if (Math.random() < 0.05) pruneOldKeys();
  } catch {
    // Si falla el almacenamiento local (e.g. modo incógnito estricto), ignoramos silenciosamente
  }
}

export function getUsageMetrics(): Record<string, number> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(getMonthlyKey());
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
