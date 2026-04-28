/**
 * lib/observability/usage-tracker.ts
 *
 * Sistema ultra-ligero para rastrear el uso de funcionalidades clave.
 * Guarda contadores en localStorage para no requerir un backend.
 * Permite tomar decisiones de UX basadas en qué herramientas se usan más.
 */

const USAGE_KEY = "hce:ui-usage-metrics";

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
    const raw = window.localStorage.getItem(USAGE_KEY);
    const metrics: Record<string, number> = raw ? JSON.parse(raw) : {};

    metrics[action] = (metrics[action] ?? 0) + 1;
    window.localStorage.setItem(USAGE_KEY, JSON.stringify(metrics));
  } catch {
    // Si falla el almacenamiento local (e.g. modo incógnito estricto), ignoramos silenciosamente
  }
}

export function getUsageMetrics(): Record<string, number> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(USAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
