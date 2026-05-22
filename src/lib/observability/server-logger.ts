/**
 * lib/observability/server-logger.ts
 *
 * HAL-11: Logger estructurado de servidor.
 *
 * Emite líneas JSON a stdout — Vercel las captura y las indexa en sus logs.
 * En desarrollo emite texto legible por humanos.
 *
 * Uso:
 *   import { serverLog } from "@/lib/observability/server-logger";
 *
 *   // Con Request-ID heredado del middleware:
 *   const log = serverLog.withRequestId(req.headers.get("x-request-id") ?? "");
 *   log.info("stripe:webhook", "evento procesado", { eventId: event.id });
 *   log.error("stripe:webhook", "fallo al actualizar perfil", { error, customerId });
 *
 * Niveles:
 *   log.debug() — solo en desarrollo
 *   log.info()  — operaciones normales
 *   log.warn()  — situaciones inesperadas pero manejadas
 *   log.error() — errores que requieren atención
 *   log.critical() — errores que requieren acción inmediata (alerta)
 */

type LogLevel = "debug" | "info" | "warn" | "error" | "critical";

export interface ServerLogEntry {
  level: LogLevel;
  context: string;
  message: string;
  requestId?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

const IS_DEV = process.env.NODE_ENV === "development";

function emit(entry: ServerLogEntry): void {
  if (IS_DEV) {
    const prefix = `[HCE:${entry.level.toUpperCase()}][${entry.context}]`;
    const reqId = entry.requestId ? ` (req:${entry.requestId.slice(0, 8)})` : "";
    const method = entry.level === "error" || entry.level === "critical"
      ? console.error
      : entry.level === "warn"
        ? console.warn
        : console.log;
    method(`${prefix}${reqId} ${entry.message}`, entry.data ?? "");
    return;
  }

  // Producción: JSON en una sola línea para Vercel Logs
  console.log(JSON.stringify(entry));
}

function createEntry(
  level: LogLevel,
  context: string,
  message: string,
  data?: Record<string, unknown>,
  requestId?: string,
): ServerLogEntry {
  return {
    level,
    context,
    message,
    requestId: requestId || undefined,
    timestamp: new Date().toISOString(),
    data,
  };
}

// ─── API pública base ─────────────────────────────────────────────────────────

export const serverLog = {
  debug(context: string, message: string, data?: Record<string, unknown>): void {
    if (!IS_DEV) return; // debug solo en desarrollo
    emit(createEntry("debug", context, message, data));
  },

  info(context: string, message: string, data?: Record<string, unknown>): void {
    emit(createEntry("info", context, message, data));
  },

  warn(context: string, message: string, data?: Record<string, unknown>): void {
    emit(createEntry("warn", context, message, data));
  },

  error(context: string, message: string, data?: Record<string, unknown>): void {
    emit(createEntry("error", context, message, data));
  },

  critical(context: string, message: string, data?: Record<string, unknown>): void {
    emit(createEntry("critical", context, message, data));
  },

  /**
   * Crea un logger acotado a un Request-ID específico.
   * Todos los mensajes emitidos incluirán el requestId para trazabilidad.
   *
   * Uso en API Route:
   *   const log = serverLog.withRequestId(req.headers.get("x-request-id") ?? "");
   */
  withRequestId(requestId: string) {
    return {
      debug: (ctx: string, msg: string, data?: Record<string, unknown>) => {
        if (!IS_DEV) return;
        emit(createEntry("debug", ctx, msg, data, requestId));
      },
      info: (ctx: string, msg: string, data?: Record<string, unknown>) =>
        emit(createEntry("info", ctx, msg, data, requestId)),
      warn: (ctx: string, msg: string, data?: Record<string, unknown>) =>
        emit(createEntry("warn", ctx, msg, data, requestId)),
      error: (ctx: string, msg: string, data?: Record<string, unknown>) =>
        emit(createEntry("error", ctx, msg, data, requestId)),
      critical: (ctx: string, msg: string, data?: Record<string, unknown>) =>
        emit(createEntry("critical", ctx, msg, data, requestId)),
    };
  },
};

/**
 * Extrae o genera un Request-ID desde los headers de la request.
 * El middleware de Next.js inyecta "x-request-id" en cada request de API.
 */
export function getRequestId(req: Request): string {
  return req.headers.get("x-request-id") ?? `gen-${Date.now().toString(36)}`;
}
