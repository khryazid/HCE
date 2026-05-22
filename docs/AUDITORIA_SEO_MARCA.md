# Auditoría SEO, Identidad de Marca y PWA — Glyphix
**Fecha:** 2026-05-22 · **Stack:** Next.js 16 App Router · React 19 · Tailwind CSS v4 · next-pwa · Supabase  
**Estado final:** ✅ **100% completado en código** · TypeScript `EXIT: 0`

---

## Resumen ejecutivo

| Área | Estado |
|------|--------|
| Identidad de marca (`APP_NAME`, `APP_URL`) | ✅ Centralizado y consistente |
| `manifest.json` — nombre, MIME, theme_color, íconos | ✅ Corregido |
| Dashboard privado sin `noindex` | ✅ Corregido |
| Emails transaccionales (Resend) | ✅ Usaba APP_NAME (sin cambios) |
| Push notifications — título "HCE" | ✅ Corregido → APP_NAME |
| Admin page title "HCE" | ✅ Corregido → APP_NAME |
| Landing — "Glyph" sin "ix" en texto visible | ✅ Corregido → APP_NAME |
| `sitemap.xml` | ✅ Completo con /privacidad y /terminos |
| `robots.txt` | ✅ Correcto (sin cambios) |
| Canonical URLs — todas las páginas públicas | ✅ Completo |
| hreflang | ✅ Corregido (eliminado `/en` inexistente) |
| `og-image.png` → WebP | ✅ 390 KB → **21.8 KB** (−94%) |
| Íconos PWA generados | ✅ 192, 512, maskable, apple-touch |
| JSON-LD structured data | ✅ Enriquecido |
| Titles en todas las páginas del dashboard | ✅ Completo |
| `.env.vercel.example` + checklist migración | ✅ Documentado |
| Bug Zod v4 en `clinic/members` | ✅ Corregido |

---

## Hallazgos y fixes implementados

### 1. Identidad de marca

#### SEO-01 — `public/manifest.json` · 🔴 CRÍTICO → ✅ RESUELTO

**Problema:** `name: "HCE Multiespecialidad"`, `short_name: "HCE"`, `type: "image/svg+xml"` (incorrecto para un .png), `theme_color: "#0e766e"` (verde teal desincronizado del design system de cobre).

**Fix aplicado en** [`public/manifest.json`](file:///c:/Users/Khris/dev/HCE/public/manifest.json):
```json
{
  "name": "Glyphix — Motor Clínico",
  "short_name": "Glyphix",
  "theme_color": "#C4602A",
  "background_color": "#09090B",
  "orientation": "any",
  "id": "/",
  "categories": ["medical", "health", "productivity"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [{ "src": "/og-image.webp", "sizes": "1200x630", "type": "image/webp" }]
}
```

---

#### SEO-02 — Dashboard sin `noindex` · 🔴 CRÍTICO → ✅ RESUELTO

**Problema:** Todas las páginas privadas del dashboard (consultas, pacientes, agenda, tratamientos, ajustes, billing, dashboard) heredaban `robots: { index: true }` del root layout. Google podía indexar estas URLs y generar errores 401/redirect en Search Console.

**Fix aplicado en** [`src/app/(dashboard)/layout.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/(dashboard)/layout.tsx):
```tsx
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
```
Todas las páginas del grupo heredan el noindex automáticamente. Sin repetición por página.

---

#### SEO-03 — "Glyph" (sin "ix") en texto visible de la landing · 🟠 ALTO → ✅ RESUELTO

**Problema:** 3 instancias en [`src/app/landing-client.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/landing-client.tsx):
- `"...y Glyph generará automáticamente..."` (sección Posología)
- `"glyph — consultas offline"` (mock panel)
- `"Glyph corre completamente en tu navegador..."` (sección offline)

**Fix:** Reemplazadas las 3 por `{APP_NAME}` (ya importado en el archivo).

---

#### SEO-04 — Admin Panel title con "HCE" · 🟠 ALTO → ✅ RESUELTO

**Problema:** [`src/app/(dashboard)/admin/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/(dashboard)/admin/page.tsx) tenía `title: "Admin Panel | HCE"`.

**Fix:** `` title: `Admin Panel | ${APP_NAME}` ``

---

#### SEO-05 — Push notification título "HCE" · 🟠 ALTO → ✅ RESUELTO

**Problema:** [`src/app/api/push/send/route.ts`](file:///c:/Users/Khris/dev/HCE/src/app/api/push/send/route.ts) enviaba `title: "Notificación HCE"` al dispositivo del médico.

**Fix:** `` title: title || `Notificación ${APP_NAME}` ``

---

#### Verificado OK (sin cambios necesarios)
- ✅ Emails transaccionales Resend — ya usaban `APP_NAME`
- ✅ Generación de PDFs — usa `letterhead` inyectado del perfil del doctor
- ✅ `src/lib/constants/app.ts` — `APP_NAME = "Glyphix"`, `APP_DOMAIN = "glyphix.app"` centralizados correctamente
- ✅ `next-themes` — en uso activo en `sonner.tsx`, no es dependencia muerta
- ✅ Prefijo `hce:theme` en localStorage — interno, no visible al usuario; cambio causaría breaking change para usuarios existentes

---

### 2. SEO Técnico

#### SEO-06 — Sitemap incompleto · 🟡 MEDIO → ✅ RESUELTO

**Fix aplicado en** [`src/app/sitemap.ts`](file:///c:/Users/Khris/dev/HCE/src/app/sitemap.ts): añadidas `/privacidad` (`priority: 0.3`, `yearly`) y `/terminos` (`priority: 0.3`, `yearly`).

---

#### SEO-07 — Canonicals faltantes en páginas públicas · 🟡 MEDIO → ✅ RESUELTO

Páginas sin canonical propio heredaban el `/` del root layout. Fix aplicado:

| Archivo | Canonical añadido |
|---------|------------------|
| [`(auth)/login/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/(auth)/login/page.tsx) | `"/login"` |
| [`(auth)/registro/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/(auth)/registro/page.tsx) | `"/registro"` |
| [`privacidad/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/privacidad/page.tsx) | `"/privacidad"` |
| [`terminos/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/terminos/page.tsx) | `"/terminos"` |

---

#### SEO-08 — JSON-LD incompleto · 🟡 MEDIO → ✅ RESUELTO

**Fix aplicado en** [`src/app/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/page.tsx):
```json
{
  "name": "Glyphix",
  "url": "https://glyphix.app",
  "image": "https://glyphix.app/og-image.webp",
  "provider": { "@type": "Organization", "name": "Glyphix", "url": "https://glyphix.app" }
}
```

---

#### SEO-13 — hreflang apuntaba a `/en` inexistente · 🟡 MEDIO → ✅ RESUELTO

**Problema:** La app usa locale por cookie (`NEXT_LOCALE`), no por ruta prefijada `/en/...`. El `hreflang: { "en": "/en" }` generaba un `<link rel="alternate">` a una URL que no existe como ruta dedicada.

**Fix en** [`src/app/layout.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/layout.tsx):
```tsx
alternates: {
  canonical: "/",
  languages: { "es": "/", "x-default": "/" },
  // "en" eliminado — locale se gestiona via cookie NEXT_LOCALE, no via path
},
```

---

#### SEO-14 — Dashboard pages sin title propio · 🟡 MEDIO → ✅ RESUELTO

Todas las páginas del dashboard mostraban el título genérico del root layout en la pestaña del navegador. Fix aplicado:

| Página | Title |
|--------|-------|
| [`/dashboard`](file:///c:/Users/Khris/dev/HCE/src/app/(dashboard)/dashboard/page.tsx) | `Inicio \| Glyphix` |
| [`/consultas`](file:///c:/Users/Khris/dev/HCE/src/app/(dashboard)/consultas/page.tsx) | `Consultas \| Glyphix` |
| [`/pacientes`](file:///c:/Users/Khris/dev/HCE/src/app/(dashboard)/pacientes/page.tsx) | `Pacientes \| Glyphix` |
| [`/tratamientos`](file:///c:/Users/Khris/dev/HCE/src/app/(dashboard)/tratamientos/page.tsx) | `Tratamientos \| Glyphix` |
| [`/ajustes`](file:///c:/Users/Khris/dev/HCE/src/app/(dashboard)/ajustes/page.tsx) | `Ajustes \| Glyphix` |
| [`/billing`](file:///c:/Users/Khris/dev/HCE/src/app/(dashboard)/billing/page.tsx) | `Facturación \| Glyphix` |

> [!NOTE]
> `/agenda` ya tenía `` title: `Agenda | ${APP_NAME}` `` antes de la auditoría. ✅

---

#### Verificado OK (sin cambios)
- ✅ `robots.ts` — deniega correctamente `/api/`, `/dashboard/`, `/ajustes/`, etc.
- ✅ Ambos leen `NEXT_PUBLIC_SITE_URL` de env, sin hardcoding de dominio
- ✅ Titles y descriptions en todas las páginas públicas son únicos y bien escritos

---

### 3. Core Web Vitals

#### Verificado OK
- ✅ `font-display: swap` en Space Grotesk y Outfit — sin render-blocking
- ✅ Script anti-flash dark mode — inline síncrono correcto, `try/catch` apropiado
- ✅ `jsPDF` — importado con `await import(...)` (lazy loading), no en el critical path
- ✅ No hay `<img>` tags directas en landing ni dashboard — sin riesgo de CLS

#### Observación registrada (no crítica)
- 🟡 La landing page usa `"use client"` en `LandingClient` — el hero no es Server-renderable. LCP puede sufrir en conexiones lentas. Requiere refactor mayor (extraer hero como RSC), fuera del scope de esta auditoría.

---

### 4. PWA e Imágenes

#### SEO-10 — `og-image.png` pesaba 390 KB · 🟠 ALTO → ✅ RESUELTO

Convertida con `sharp` (incluido en Next.js):

| Archivo | Tamaño | Uso |
|---------|--------|-----|
| `og-image.png` | 390.7 KB | Conservado como fallback |
| **`og-image.webp`** | **21.8 KB** | OG, Twitter Card, JSON-LD, manifest screenshot |

Referencias actualizadas en: `layout.tsx` (openGraph + twitter), `page.tsx` (JSON-LD), `manifest.json` (screenshots).

---

#### SEO-11/12 — Íconos PWA generados correctamente · 🔴 CRÍTICO → ✅ RESUELTO

Generados con `sharp` desde el `icon.png` original:

| Archivo | Tamaño | Propósito |
|---------|--------|-----------|
| `public/icons/icon-192.png` | 36 KB | manifest `any` 192×192 |
| `public/icons/icon-512.png` | 156 KB | manifest `any` 512×512 |
| `public/icons/icon-512-maskable.png` | 127 KB | manifest `maskable` — fondo cobre `#C4602A`, 10% safe area |
| `public/apple-touch-icon.png` | 32 KB | iOS PWA home screen (180×180) |

Todos los archivos verificados en disco. Rutas consistentes entre `manifest.json` y `layout.tsx`.

---

### 5. Migración de dominio (glyphmed.app → glyphix.app)

#### SEO-09 — Variables de entorno con dominio antiguo · 🔴 CRÍTICO → ✅ RESUELTO

**Fix aplicado en** [`.env.vercel.example`](file:///c:/Users/Khris/dev/HCE/.env.vercel.example): todas las variables actualizadas a `glyphix.app` + checklist de migración de 9 pasos documentado en el header del archivo.

**Checklist de migración (acciones manuales — al adquirir glyphix.app):**

| # | Servicio | Acción |
|---|---------|--------|
| 1 | Vercel | `NEXT_PUBLIC_SITE_URL` → `https://glyphix.app` |
| 2 | Vercel | Dominio primario → `glyphix.app` |
| 3 | Vercel | `glyphmed.app` como alias con redirect 301 |
| 4 | Supabase | Auth > URL Configuration > Site URL → `https://glyphix.app` |
| 5 | Supabase | Auth > Redirect URLs → `https://glyphix.app/**` |
| 6 | Stripe | Webhook endpoint → `https://glyphix.app/api/webhooks/stripe` |
| 7 | Stripe | Billing portal redirect URLs |
| 8 | Resend | Verificar dominio `glyphix.app`, actualizar `RESEND_FROM_EMAIL` |
| 9 | Resend | Actualizar `VAPID_MAILTO` y `ADMIN_EMAIL` |

> [!IMPORTANT]
> El código fuente **no requiere ningún cambio adicional** para la migración. Todo usa las constantes de `src/lib/constants/app.ts` o variables de entorno. Solo son cambios en dashboards externos.

> [!NOTE]
> Las claves VAPID son criptográficas — **no están vinculadas al dominio** y no necesitan regenerarse.

---

### Bonus — Bug pre-existente corregido

#### Zod v4 en `clinic/members/[id]/route.ts` · ✅ CORREGIDO

**Problema:** API de Zod v4 cambió `errorMap` → `error`, y `z.enum` requiere array `as const`. Causaba error de TypeScript en producción.

**Fix:**
```ts
// Antes (Zod v3)
z.enum(["admin", "doctor", "assistant"], {
  errorMap: () => ({ message: "..." })
})

// Después (Zod v4)
z.enum(["admin", "doctor", "assistant"] as const, {
  error: () => "..."
})
```

---

## Cobertura de metadata — tabla completa

| Ruta | Title | Description | Canonical | robots |
|------|-------|-------------|-----------|--------|
| `/` | ✅ `Glyphix — Motor Clínico` | ✅ | ✅ `/` | index: true |
| `/login` | ✅ `Iniciar sesión — Glyphix` | ✅ | ✅ `/login` | heredado |
| `/registro` | ✅ `Crear cuenta — Glyphix` | ✅ | ✅ `/registro` | heredado |
| `/privacidad` | ✅ `Política de Privacidad — Glyphix` | ✅ | ✅ `/privacidad` | heredado |
| `/terminos` | ✅ `Términos y Condiciones — Glyphix` | ✅ | ✅ `/terminos` | heredado |
| `(dashboard)/*` | ✅ único por página | — | — | ✅ `index: false` |
| `/dashboard` | ✅ `Inicio \| Glyphix` | — | — | noindex |
| `/agenda` | ✅ `Agenda \| Glyphix` | — | — | noindex |
| `/consultas` | ✅ `Consultas \| Glyphix` | — | — | noindex |
| `/pacientes` | ✅ `Pacientes \| Glyphix` | — | — | noindex |
| `/tratamientos` | ✅ `Tratamientos \| Glyphix` | — | — | noindex |
| `/ajustes` | ✅ `Ajustes \| Glyphix` | — | — | noindex |
| `/billing` | ✅ `Facturación \| Glyphix` | — | — | noindex |
| `/admin` | ✅ `Admin Panel \| Glyphix` | — | — | ✅ `index: false` |

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| [`public/manifest.json`](file:///c:/Users/Khris/dev/HCE/public/manifest.json) | Nombre, MIME, theme_color, íconos reales, screenshot WebP |
| [`public/og-image.webp`](file:///c:/Users/Khris/dev/HCE/public/og-image.webp) | **NUEVO** — 21.8 KB (generado desde og-image.png) |
| [`public/apple-touch-icon.png`](file:///c:/Users/Khris/dev/HCE/public/apple-touch-icon.png) | **NUEVO** — 180×180px para iOS |
| [`public/icons/icon-192.png`](file:///c:/Users/Khris/dev/HCE/public/icons/icon-192.png) | **NUEVO** — 192×192px |
| [`public/icons/icon-512.png`](file:///c:/Users/Khris/dev/HCE/public/icons/icon-512.png) | **NUEVO** — 512×512px |
| [`public/icons/icon-512-maskable.png`](file:///c:/Users/Khris/dev/HCE/public/icons/icon-512-maskable.png) | **NUEVO** — 512×512px, fondo cobre, safe area 10% |
| [`src/app/layout.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/layout.tsx) | OG→WebP, apple-touch-icon, íconos rutas reales, hreflang, keywords |
| [`src/app/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/page.tsx) | JSON-LD: url, image WebP, provider, APP_NAME |
| [`src/app/sitemap.ts`](file:///c:/Users/Khris/dev/HCE/src/app/sitemap.ts) | +/privacidad, +/terminos |
| [`src/app/(dashboard)/layout.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/(dashboard)/layout.tsx) | `robots: { index: false }` para todo el grupo |
| [`src/app/(dashboard)/dashboard/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/(dashboard)/dashboard/page.tsx) | Title `Inicio \| Glyphix` |
| [`src/app/(dashboard)/consultas/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/(dashboard)/consultas/page.tsx) | Title `Consultas \| Glyphix` |
| [`src/app/(dashboard)/pacientes/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/(dashboard)/pacientes/page.tsx) | Title `Pacientes \| Glyphix` |
| [`src/app/(dashboard)/tratamientos/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/(dashboard)/tratamientos/page.tsx) | Title `Tratamientos \| Glyphix` |
| [`src/app/(dashboard)/ajustes/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/(dashboard)/ajustes/page.tsx) | Title `Ajustes \| Glyphix` |
| [`src/app/(dashboard)/billing/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/(dashboard)/billing/page.tsx) | Title `Facturación \| Glyphix` |
| [`src/app/(dashboard)/admin/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/(dashboard)/admin/page.tsx) | Title usa APP_NAME (eliminado "HCE") |
| [`src/app/(auth)/login/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/(auth)/login/page.tsx) | Canonical `/login` |
| [`src/app/(auth)/registro/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/(auth)/registro/page.tsx) | Canonical `/registro` |
| [`src/app/privacidad/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/privacidad/page.tsx) | Canonical `/privacidad` |
| [`src/app/terminos/page.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/terminos/page.tsx) | Canonical `/terminos` |
| [`src/app/api/push/send/route.ts`](file:///c:/Users/Khris/dev/HCE/src/app/api/push/send/route.ts) | `"Notificación HCE"` → `APP_NAME` |
| [`src/app/api/clinic/members/[id]/route.ts`](file:///c:/Users/Khris/dev/HCE/src/app/api/clinic/members/[id]/route.ts) | Bug Zod v4: `errorMap` → `error`, `as const` |
| [`src/app/landing-client.tsx`](file:///c:/Users/Khris/dev/HCE/src/app/landing-client.tsx) | 3× "Glyph" → `{APP_NAME}` |
| [`.env.vercel.example`](file:///c:/Users/Khris/dev/HCE/.env.vercel.example) | Dominio → `glyphix.app`, checklist migración documentado |
| [`docs/BACKLOG.md`](file:///c:/Users/Khris/dev/HCE/docs/BACKLOG.md) | SEO-01 a SEO-14 registrados como completados |
