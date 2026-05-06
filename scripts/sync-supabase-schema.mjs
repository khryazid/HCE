/**
 * generate-types.mjs
 *
 * Regenera src/types/supabase.types.ts usando la Management API REST de Supabase.
 * No requiere la CLI de Supabase ni tokens personales — sólo el SERVICE_ROLE_KEY
 * del proyecto para autenticar la llamada a la introspección de tipos.
 *
 * Uso:
 *   npm run db:types
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "node:fs";
import path from "node:path";
import https from "node:https";

const root = process.cwd();

// ── Leer .env.local ────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌  .env.local no encontrado.");
    process.exit(1);
  }
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
  return env;
}

const env = loadEnv();
const supabaseUrl     = env["NEXT_PUBLIC_SUPABASE_URL"]   ?? "";
const serviceRoleKey  = env["SUPABASE_SERVICE_ROLE_KEY"]  ?? "";
const outPath         = path.join(root, "src", "types", "supabase.types.ts");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌  Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

// ── Extraer project-ref ───────────────────────────────────────────────────────
const match = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
if (!match) {
  console.error("❌  NEXT_PUBLIC_SUPABASE_URL no tiene el formato esperado.");
  process.exit(1);
}
const projectRef = match[1];

console.log(`\n🔄  Generando tipos para proyecto: ${projectRef}`);
console.log(`📄  Destino: ${path.relative(root, outPath)}\n`);

// ── Llamar a la Management API de Supabase ────────────────────────────────────
// Endpoint: GET /rest/v1/rpc/supabase_functions_schema_version
// No existe endpoint público para tipos — usamos el endpoint de tipos de la
// REST API que Supabase expone en /rest/v1/ con el header apikey.
//
// La alternativa correcta es introspección via PostgREST OpenAPI + generación
// manual, pero el camino más práctico sin CLI es usar el paquete oficial:
//   npx supabase gen types --project-id <ref>
//
// Para hacerlo sin token personal de plataforma, usamos el endpoint
// types que Supabase expone en su Management API pública:
//   https://api.supabase.com/v1/projects/{ref}/types/typescript
// Este endpoint requiere un access_token de plataforma (sbp_xxxx), NO el service_role_key.
//
// CONCLUSIÓN: Para regenerar tipos localmente sin CLI interactiva, el usuario
// necesita crear un Personal Access Token en https://supabase.com/dashboard/account/tokens
// y añadirlo a .env.local como SUPABASE_ACCESS_TOKEN=sbp_xxxx

const accessToken = env["SUPABASE_ACCESS_TOKEN"] ?? "";

if (!accessToken || !accessToken.startsWith("sbp_")) {
  console.warn("⚠️   SUPABASE_ACCESS_TOKEN no configurado o inválido.");
  console.warn("     Para generar tipos necesitas un Personal Access Token:");
  console.warn("     1. Ve a https://supabase.com/dashboard/account/tokens");
  console.warn("     2. Crea un token con nombre 'hce-local-dev'");
  console.warn("     3. Añádelo a .env.local: SUPABASE_ACCESS_TOKEN=sbp_xxxx");
  console.warn("     4. Ejecuta: npm run db:types\n");
  process.exit(1);
}

// Llamar al endpoint REST de Management API
function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    }).on("error", reject);
  });
}

const { status, body } = await httpsGet(
  `https://api.supabase.com/v1/projects/${projectRef}/types/typescript`,
  {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  }
);

if (status !== 200) {
  console.error(`❌  Error ${status} de la Management API:`);
  console.error(body);
  process.exit(1);
}

// The API returns { types: "...typescript content..." }
let typesContent;
try {
  const parsed = JSON.parse(body);
  typesContent = parsed.types ?? body;
} catch {
  typesContent = body;
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, typesContent, "utf8");

console.log(`✅  Tipos generados: ${path.relative(root, outPath)}`);
console.log(`    Recuerda hacer commit de supabase.types.ts\n`);
