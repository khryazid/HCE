# Documentación de Arquitectura — Glyphix HCE

## 1. Arquitectura Offline-First y Sincronización

Glyphix está diseñado para médicos que operan en entornos con conectividad inestable. La aplicación responde en `0ms` (Local-First) y sincroniza a la nube en segundo plano.

### IndexedDB como Fuente Primaria de Verdad
- **IndexedDB** (`src/lib/db/indexeddb.ts`) actúa como la base de datos principal en el cliente.
- En migraciones de versión (`upgrade`), se debe tener especial cuidado de no destruir object stores que contengan datos offline sin respaldar.

### Sync Worker (`src/lib/sync/sync-worker.ts`)
- **Exponential Backoff:** El worker reintenta el envío de operaciones fallidas incrementando el tiempo de espera exponencialmente para no abrumar al backend (rate limits o 5xx).
- **Concurrencia (Web Locks API):** Utiliza `navigator.locks.request("hce-sync-lock")` para asegurar que solo una pestaña controle el worker en todo momento, evitando la duplicación de inserciones (upserts repetidos a Supabase).

### Resolución de Conflictos (Clock Drift)
- Si el servidor tiene datos más recientes (`remoteTime > client_timestamp`), el Worker marca el registro local como `conflicted`.
- Se despacha el evento `APP_EVENT_SYNC_ABANDONED` alertando al médico en la interfaz (`SyncQueuePanel`) para revisión manual.

---

## 2. Proxy SSR vs Middleware Clásico (Next.js 16)

En Next.js 16, la validación tradicional (`middleware.ts`) sufre limitaciones al usarse con `next-pwa` y empaquetadores como Webpack en Edge. 
**El proyecto utiliza `src/proxy.ts` como único interceptor.** No debe existir `src/middleware.ts` en la raíz.

### Funcionamiento de `proxy.ts`
1. **Allowlist de Rutas:** Emplea una estrategia `PUBLIC_PATHS`. Todo lo demás está protegido por defecto.
2. **Inyección de Request ID:** Configura el header `x-request-id` operando sobre `NextResponse.next({ request: { headers } })` compatible con Vercel Edge.
3. **Helper de Supabase:** `src/lib/supabase/middleware.ts` NO es el middleware de Next.js, es solo una función helper invocada por `proxy.ts` para manejar las cookies de Supabase Auth.
