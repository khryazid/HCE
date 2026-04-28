/**
 * lib/observability/error-logger.ts
 *
 * Logger estructurado en memoria con ring-buffer de eventos de error.
 * Diseño offline-first: sin dependencias externas, sin servidor.
 * Los errores se almacenan en sessionStorage para sobrevivir recargas suaves
 * pero no entre sesiones distintas (sin riesgo de acumulación de PHI).
 *
 * API pública:
 *   logSyncError(context, message, detail?)
 *   logApiError(context, message, detail?)
 *   getRecentErrors()
 *   clearErrors()
 */

type ErrorSeverity = "warn" | "error" | "critical";

type ErrorSource = "sync" | "api" | "crypto" | "db" | "auth" | "unknown";

export type StructuredError = {
  id: string;
  source: ErrorSource;
  severity: ErrorSeverity;
  context: string;
  message: string;
  detail?: Record<string, unknown>;
  timestamp: number;
};

const MAX_ERRORS = 50;
const STORAGE_KEY = "hce:error-log";

// ─── Ring buffer en memoria ────────────────────────────────────────────────────

let inMemoryErrors: StructuredError[] = [];

function loadFromSession(): StructuredError[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as StructuredError[];
  } catch {
    return [];
  }
}

function persistToSession(errors: StructuredError[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
  } catch {
    // sessionStorage lleno — no bloquear
  }
}

function appendError(entry: StructuredError): void {
  // Carga los errores actuales si el buffer en memoria está vacío (recarga de página)
  if (inMemoryErrors.length === 0) {
    inMemoryErrors = loadFromSession();
  }

  inMemoryErrors = [...inMemoryErrors, entry].slice(-MAX_ERRORS);
  persistToSession(inMemoryErrors);

  // También emite al consola para devtools durante desarrollo
  if (entry.severity === "critical" || entry.severity === "error") {
    console.error(`[HCE:${entry.source}] ${entry.context}: ${entry.message}`, entry.detail ?? "");
  } else {
    console.warn(`[HCE:${entry.source}] ${entry.context}: ${entry.message}`, entry.detail ?? "");
  }
}

// ─── API pública ───────────────────────────────────────────────────────────────

export function logSyncError(
  context: string,
  message: string,
  detail?: Record<string, unknown>,
  severity: ErrorSeverity = "error",
): void {
  appendError({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    source: "sync",
    severity,
    context,
    message,
    detail,
    timestamp: Date.now(),
  });
}

export function logApiError(
  context: string,
  message: string,
  detail?: Record<string, unknown>,
  severity: ErrorSeverity = "warn",
): void {
  appendError({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    source: "api",
    severity,
    context,
    message,
    detail,
    timestamp: Date.now(),
  });
}

function logDbError(
  context: string,
  message: string,
  detail?: Record<string, unknown>,
): void {
  appendError({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    source: "db",
    severity: "error",
    context,
    message,
    detail,
    timestamp: Date.now(),
  });
}

export function getRecentErrors(): StructuredError[] {
  if (inMemoryErrors.length === 0) {
    inMemoryErrors = loadFromSession();
  }
  return [...inMemoryErrors];
}

function getUnseenErrorCount(): number {
  return getRecentErrors().filter((e) => e.severity === "error" || e.severity === "critical").length;
}

export function clearErrors(): void {
  inMemoryErrors = [];
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}
