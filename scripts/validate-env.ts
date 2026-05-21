#!/usr/bin/env tsx
/**
 * scripts/validate-env.ts — A-17
 *
 * Pre-start hook that eagerly accesses every serverEnv getter.
 * If any required variable is missing it throws immediately with a
 * descriptive message, so the process fails at startup instead of
 * at the first HTTP request that touches that variable.
 *
 * Usage (add to package.json):
 *   "predev":   "tsx scripts/validate-env.ts",
 *   "prebuild": "tsx scripts/validate-env.ts",
 *
 * The script re-implements the validation logic without importing
 * env.ts (which uses "server-only" and would break tsx).
 */

const REQUIRED_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "GEMINI_API_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_MAILTO",
  "ADMIN_EMAIL",
  "PUSH_SEND_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  // Public vars that the Next.js build also checks, but we want early feedback:
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const OPTIONAL_VARS = [
  "RESEND_API_KEY",          // Required in prod, optional in dev
  "RESEND_FROM_EMAIL",
  "RESEND_EMAIL_SECRET",
  "GEMINI_MODEL",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "NEXT_PUBLIC_STRIPE_PRICE_ID",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
] as const;

let missingCount = 0;
const warnings: string[] = [];

console.log("\n🔍 [validate-env] Validando variables de entorno...\n");

for (const name of REQUIRED_VARS) {
  const val = process.env[name];
  if (!val || val.trim() === "") {
    console.error(`  ❌ FALTA (requerida): ${name}`);
    missingCount++;
  } else {
    // Show only first/last 4 chars to confirm it's set without leaking the value
    const masked = val.length > 8
      ? `${val.slice(0, 4)}${"*".repeat(Math.min(val.length - 8, 12))}${val.slice(-4)}`
      : "****";
    console.log(`  ✅ ${name.padEnd(40)} ${masked}`);
  }
}

for (const name of OPTIONAL_VARS) {
  const val = process.env[name];
  if (!val || val.trim() === "") {
    warnings.push(name);
  }
}

if (warnings.length > 0) {
  console.log(`\n  ⚠️  Opcionales no configuradas (pueden ser necesarias en producción):`);
  warnings.forEach((w) => console.log(`     - ${w}`));
}

if (missingCount > 0) {
  console.error(
    `\n❌ [validate-env] ${missingCount} variable(s) requerida(s) no están configuradas.\n` +
    `   → Revisa .env.local (desarrollo) o Vercel Environment Variables (producción).\n` +
    `   → Consulta .env.example para los valores esperados.\n`
  );
  process.exit(1);
}

console.log("\n✅ [validate-env] Todas las variables requeridas están configuradas.\n");
