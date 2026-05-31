/**
 * src/lib/api/guards.ts
 *
 * M-16: Validación de Origin header para endpoints sensibles.
 * A-13: Schemas Zod reutilizables para los endpoints de API.
 * HAL-08: Comparación de secretos con timingSafeEqual (resistente a timing attacks).
 */

import { timingSafeEqual, createHash } from "crypto";
import { z } from "zod";

// ── M-16: Validación de Origin ────────────────────────────────────────────────

/**
 * Verifica que el header Origin de la request proviene del mismo dominio
 * que la app. Rechaza requests de orígenes externos (CSRF) para endpoints
 * que mutan estado (checkout, push/subscribe).
 *
 * Retorna true si el origen es válido o si es una request server-to-server
 * (sin Origin header, ej. cron jobs).
 */
export function isValidOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");

  // Server-to-server requests (cron, webhooks firmados) no envían Origin — permitir
  if (!origin) return true;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  // Permitir localhost en desarrollo
  if (process.env.NODE_ENV === "development") {
    if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
      return true;
    }
  }

  if (!siteUrl) {
    // Si no hay SITE_URL configurado, rechazar por seguridad
    console.warn("[isValidOrigin] NEXT_PUBLIC_SITE_URL no configurado — rechazando request de:", origin);
    return false;
  }

  try {
    const allowedHost = new URL(siteUrl).host;
    const requestHost  = new URL(origin).host;
    return allowedHost === requestHost;
  } catch {
    return false;
  }
}

// ── HAL-08: Comparación de secretos resistente a timing attacks ───────────────

/**
 * Compara dos secretos en tiempo constante para prevenir timing attacks.
 * Usar en lugar de `===` para comparar headers x-push-secret, x-email-secret, etc.
 */
export function isSecretValid(incoming: string | null, expected: string): boolean {
  if (!incoming) return false;
  try {
    const a = createHash("sha256").update(incoming).digest();
    const b = createHash("sha256").update(expected).digest();
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ── A-13: Schemas Zod para endpoints de API ───────────────────────────────────

/** POST /api/clinic/invite */
export const inviteBodySchema = z.object({
  email:     z.string().email("Email inválido"),
  role:      z.enum(
    ["doctor", "assistant", "clinic_admin", "receptionist", "lab", "imaging", "surgery"],
    { message: "Rol inválido" }
  ),
  clinic_id: z.string().uuid("clinic_id debe ser un UUID válido"),
  password:  z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
});

/** POST /api/push/subscribe */
export const pushSubscribeBodySchema = z.object({
  endpoint:  z.string().url("endpoint debe ser una URL válida"),
  clinic_id: z.string().uuid().optional(),
  keys: z.object({
    p256dh: z.string().min(1, "p256dh requerido"),
    auth:   z.string().min(1, "auth requerido"),
  }),
});

/** DELETE /api/push/subscribe */
export const pushUnsubscribeBodySchema = z.object({
  endpoint: z.string().url("endpoint debe ser una URL válida"),
});

/** POST /api/push/send */
export const pushSendBodySchema = z.object({
  title:            z.string().max(100).nullable().optional(),
  body:             z.string().max(500).nullable().optional(),
  target_doctor_id: z.string().uuid().nullable().optional(),
  url:              z.string().max(500).nullable().optional(),
});

/** POST /api/email/followup — HAL-03 */
export const emailFollowupBodySchema = z.object({
  target_doctor_id: z.string().uuid("target_doctor_id debe ser un UUID válido"),
  doctor_email:     z.string().email("doctor_email debe ser un email válido"),
  doctor_name:      z.string().max(200).optional(),
  due_count:        z.number().int().min(0).max(9999).optional(),
});

/** POST /api/email/trial-ending — HAL-03 */
export const emailTrialEndingBodySchema = z.object({
  target_doctor_id: z.string().uuid("target_doctor_id debe ser un UUID válido"),
  doctor_email:     z.string().email("doctor_email debe ser un email válido"),
  doctor_name:      z.string().max(200).optional(),
  days_left:        z.number().int().min(0).max(365).optional(),
});
