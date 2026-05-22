import "server-only";

/**
 * env.ts — Validación de variables de entorno en startup
 *
 * Este módulo se importa en rutas de servidor (API routes, Server Components).
 * Si una variable requerida falta, lanza un error descriptivo en build/runtime
 * antes de que el usuario llegue a activar la feature afectada.
 *
 * Uso:
 *   import { serverEnv } from "@/lib/env";
 *   const key = serverEnv.STRIPE_SECRET_KEY;
 *
 * Variables NEXT_PUBLIC_* no se validan aquí porque Next.js ya las compila
 * en el bundle del cliente — si faltan, el build falla con un error de Next.js.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `[HCE:env] Variable de entorno requerida no configurada: ${name}\n` +
        `  → Revisa tu .env.local (desarrollo) o las Environment Variables de Vercel (producción).\n` +
        `  → Consulta .env.example para el formato esperado.`,
    );
  }
  return value.trim();
}

function optionalEnv(name: string, fallback = ""): string {
  return process.env[name]?.trim() ?? fallback;
}

/**
 * Variables de servidor — NUNCA exponer en el cliente (sin prefijo NEXT_PUBLIC_).
 * Se validan en el primer uso (lazy), no al importar el módulo.
 */
export const serverEnv = {
  // ── Supabase (servidor) ────────────────────────────────────────────────────
  get SUPABASE_SERVICE_ROLE_KEY() {
    return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  },

  // ── Stripe ─────────────────────────────────────────────────────────────────
  get STRIPE_SECRET_KEY() {
    return requireEnv("STRIPE_SECRET_KEY");
  },
  get STRIPE_WEBHOOK_SECRET() {
    return requireEnv("STRIPE_WEBHOOK_SECRET");
  },

  // ── Gemini IA ──────────────────────────────────────────────────────────────
  get GEMINI_API_KEY() {
    return requireEnv("GEMINI_API_KEY");
  },
  get GEMINI_MODEL() {
    return optionalEnv("GEMINI_MODEL", "gemini-2.0-flash");
  },

  // ── Web Push / VAPID ───────────────────────────────────────────────────────
  get VAPID_PRIVATE_KEY() {
    return requireEnv("VAPID_PRIVATE_KEY");
  },
  get VAPID_MAILTO() {
    return requireEnv("VAPID_MAILTO");
  },

  // ── Admin Panel ────────────────────────────────────────────────────────────
  get ADMIN_EMAIL() {
    return requireEnv("ADMIN_EMAIL");
  },

  // ── Push Notifications (cron jobs / webhooks) ──────────────────────────────
  get PUSH_SEND_SECRET() {
    return requireEnv("PUSH_SEND_SECRET");
  },

  // ── Resend (email) ───────────────────────────────────────────────────────────
  // HAL-10: Estas variables no estaban en serverEnv — un deploy sin ellas
  // pasaba el build y fallaía silenciosamente al primer cron/email.
  get RESEND_API_KEY() {
    return requireEnv("RESEND_API_KEY");
  },
  get RESEND_EMAIL_SECRET() {
    return requireEnv("RESEND_EMAIL_SECRET");
  },

  // ── App URL ────────────────────────────────────────────────────────────────
  get NEXT_PUBLIC_SITE_URL() {
    return requireEnv("NEXT_PUBLIC_SITE_URL");
  },
} as const;
