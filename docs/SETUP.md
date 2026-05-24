# Guía de Setup y Onboarding — Glyphix HCE

Bienvenido al equipo de desarrollo de Glyphix. Esta guía detalla el proceso de configuración local para trabajar en el proyecto.

## 1. Prerrequisitos

Asegúrate de contar con las siguientes herramientas en tu entorno local:
- **Node.js** (v20 o superior) - Recomendamos usar `nvm` o `fnm`.
- **NPM** (incluido con Node.js).
- **Supabase CLI** (para interactuar con el schema y migraciones, si corresponde).

## 2. Clonación y Variables de Entorno

1. Clona el repositorio:
   ```bash
   git clone https://github.com/khryazid/HCE.git
   cd HCE
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Crea tu archivo de entorno:
   ```bash
   cp .env.local.example .env.local
   ```
   > ⚠️ **Atención:** Revisa `.env.local.example` para saber qué variables necesitas pedir al líder técnico o configurar en tu dashboard local de Supabase/Stripe/Resend.

## 3. Comandos Vitales para el Día a Día

El proyecto cuenta con comandos estrictos definidos en `package.json`:

- **Servidor de desarrollo:**
  ```bash
  npm run dev
  ```
  > 🔴 **CRÍTICO:** Nunca uses `--turbo` (`next dev --turbo`). El plugin `next-pwa` y el Sync Worker tienen incompatibilidades conocidas con Turbopack. El comando `npm run dev` inyecta automáticamente `--webpack` para prevenir errores de compilación del Service Worker.

- **Verificación de tipos:**
  ```bash
  npm run typecheck
  ```
  Asegúrate de ejecutarlo frecuentemente. El CI fallará ante cualquier error de TypeScript.

- **Regenerar tipos de Supabase:**
  ```bash
  npm run db:types
  ```
  Ejecuta esto *siempre* que el archivo `000_production_full_schema.sql` haya sido modificado. **Nunca** modifiques `src/types/supabase.types.ts` manualmente.

## 4. Arquitectura y Reglas del Proyecto

Glyphix es un SaaS multi-tenant complejo con arquitectura **Offline-First**. 
Antes de escribir cualquier línea de código, estás **obligado** a leer:

1. **`DEVELOPMENT_RULES.md`**: Define convenciones de git, nombres de archivos, estructura vertical (Vertical Slice), y reglas de TypeScript de estricto cumplimiento.
2. **Documentación de Arquitectura (`docs/architecture/`)**: 
   - Aprende por qué usamos `proxy.ts` en lugar de `middleware.ts`.
   - Entiende cómo el IndexedDB interactúa con el Sync Worker.

Cualquier PR que no cumpla con lo anterior será rechazado durante el Code Review. ¡Mucho éxito construyendo!
