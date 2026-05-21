# Guía de Pruebas E2E y Regresión Visual (Playwright) 🎭

Esta guía detalla cómo ejecutar y mantener la suite de pruebas End-to-End (E2E) de la aplicación, las cuales simulan a un usuario real navegando y haciendo clic en tu aplicación.

## 1. Requisitos Previos

Antes de correr las pruebas, Playwright necesita saber qué usuario de prueba usar para iniciar sesión y en qué dirección está corriendo tu servidor.

1. Asegúrate de tener tu servidor local encendido en una terminal:
   ```bash
   npm run dev
   ```
2. Revisa tu archivo `.env.local` y asegúrate de tener configurado un usuario de pruebas (que debe existir en tu Supabase local o de Staging):
   ```env
   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000
   E2E_EMAIL=medico_de_prueba@glyphix.app
   E2E_PASSWORD=tu_contraseña_segura
   ```
3. Si es la primera vez que vas a usar Playwright en tu computadora, instala los navegadores necesarios ejecutando:
   ```bash
   npx playwright install --with-deps
   ```

## 2. Ejecutar las Pruebas

Playwright te ofrece varias formas de correr las pruebas, dependiendo de lo que estés buscando:

- **Modo Silencioso (Headless):** Ejecuta todas las pruebas en el fondo de forma súper rápida. Útil para verificar que no rompiste nada antes de subir código.
  ```bash
  npx playwright test
  ```

- **Modo Interactivo (UI Mode):** Abre una ventana espectacular donde puedes ver paso a paso qué está haciendo el robot, inspeccionar los clics, el estado de la red y ver grabaciones de los fallos. ¡Súper recomendado para depurar!
  ```bash
  npx playwright test --ui
  ```

- **Ejecutar un solo archivo:** Si solo quieres probar el flujo de inicio de sesión:
  ```bash
  npx playwright test tests/e2e/auth.spec.ts
  ```

## 3. Pruebas de Regresión Visual (Screenshots) 📸

Una de las pruebas más críticas que configuramos es la **Regresión Visual**. Esto significa que Playwright le toma una "foto" a tu aplicación (por ejemplo, a la Landing Page) y la compara pixel por pixel con una foto base. Si un botón se movió, un color cambió o el modo oscuro falló, la prueba fallará.

**¿Qué pasa si rediseñas la página a propósito y quieres que la prueba apruebe?**
Cuando hagas un cambio intencional en el diseño (ej. cambiaste el color de fondo), la prueba fallará porque ya no coincide con la foto vieja. Para decirle a Playwright "esta es la nueva versión oficial", debes actualizar las fotos base ejecutando:

```bash
npx playwright test --update-snapshots
```

*Importante: Nunca corras este comando si la prueba falló por un bug. Solo úsalo cuando el cambio visual fue planeado por ti.*

## 4. Estructura de Carpetas

- **`tests/e2e/`**: Aquí viven todos los archivos `.spec.ts` que contienen el código de los flujos de prueba.
- **`tests/e2e/__snapshots__/`**: Aquí se guardan las fotos base de la regresión visual (¡Estas fotos SI se deben subir a GitHub!).
- **`playwright-report/`**: Carpeta temporal que se genera cuando falla una prueba. Contiene un reporte en HTML para que veas qué falló. Está ignorada en Git.

## 5. Pruebas Unitarias vs E2E

No confundas Playwright con Vitest:
- Usa **Playwright (E2E)** para probar flujos completos (ej. "El usuario se loguea, va a ajustes, cambia el modo oscuro, y se guarda en localStorage").
- Usa **Vitest (Unit tests)** para probar lógica matemática, funciones de formateo, y generación de PDFs (ej. `npx vitest run`).
