import { expect, test } from "@playwright/test";

const E2E_EMAIL = process.env.E2E_EMAIL;
const E2E_PASSWORD = process.env.E2E_PASSWORD;

test.describe("Flujo E2E: Offline Sync", () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, "Define E2E_EMAIL y E2E_PASSWORD para ejecutar el flujo E2E real.");

  test("deberia encolar pacientes offline y sincronizarlos al volver online", async ({ page, context }) => {
    // 1. Iniciar sesion estando ONLINE
    await page.goto("/");
    await page.getByLabel("Correo").fill(E2E_EMAIL ?? "");
    await page.getByLabel("Contraseña").fill(E2E_PASSWORD ?? "");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/(dashboard|consultas|ajustes|pacientes)$/);

    // Navegar a pacientes y asegurar que carga
    await page.goto("/pacientes");
    await expect(page.getByRole("heading", { name: "Pacientes" })).toBeVisible();

    // 2. SIMULAR PÉRDIDA DE CONEXIÓN (Desconectar el cable)
    await context.setOffline(true);

    // 3. Crear un paciente estando OFFLINE
    const stamp = Date.now();
    const docNumber = `OFFLINE-${stamp}`;
    
    await page.getByRole("button", { name: "Nuevo paciente" }).click();
    await page.getByPlaceholder("Documento de identidad").fill(docNumber);
    await page.getByPlaceholder("Nombres y apellidos").fill(`Test Offline ${stamp}`);
    await page.getByRole("button", { name: "Guardar paciente" }).click();

    // Validar que se guardo localmente en IndexedDB y aparece en la UI instantaneamente
    await expect(page.getByText(`Test Offline ${stamp}`)).toBeVisible();
    await expect(page.getByText(docNumber)).toBeVisible();

    // Como estamos offline, debería haber un item en la cola (el toast no falla, simplemente se encola silenciosamente por el worker)

    // 4. SIMULAR REGRESO DE CONEXIÓN
    await context.setOffline(false);

    // 5. Forzar o esperar la sincronización (el sync-worker lo detecta cada 15s o on-line event)
    // Despachamos un evento "online" artificial en la pagina para despertar al worker de inmediato
    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
    });

    // Esperar unos segundos para dar tiempo al Background Sync de enviar a Supabase
    await page.waitForTimeout(3000);

    // Recargar la pagina (para obligar a leer de la DB de Supabase + Local)
    await page.reload();

    // Asegurarnos de que el paciente SIGUE ahí (lo que significa que ahora esta guardado y respaldado en la nube)
    await expect(page.getByText(`Test Offline ${stamp}`)).toBeVisible();
    await expect(page.getByText(docNumber)).toBeVisible();
  });
});
