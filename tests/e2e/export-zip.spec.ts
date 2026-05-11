import { expect, test } from "@playwright/test";
import { login, E2E_EMAIL, E2E_PASSWORD } from "./helpers/login";

test.describe("Flujo E2E: Exportación ZIP de historia clínica", () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, "Define E2E_EMAIL y E2E_PASSWORD para ejecutar.");

  test("el botón Exportar ZIP está visible en el historial del paciente", async ({ page }) => {
    await login(page);
    await page.goto("/pacientes");

    await expect(page.getByRole("heading", { name: /pacientes/i })).toBeVisible();

    // Seleccionar el primer paciente con historial
    const firstCard = page.locator("[data-testid='patient-card']").first();
    if ((await firstCard.count()) === 0) {
      test.skip(true, "No hay pacientes — crear uno primero.");
      return;
    }

    await firstCard.click();

    // El botón de exportación debe aparecer en el historial
    const exportBtn = page.getByRole("button", { name: /exportar zip/i });
    await expect(exportBtn).toBeVisible({ timeout: 5_000 });
  });

  test("descarga el ZIP al hacer click en Exportar ZIP", async ({ page }) => {
    await login(page);
    await page.goto("/pacientes");

    await expect(page.getByRole("heading", { name: /pacientes/i })).toBeVisible();

    const firstCard = page.locator("[data-testid='patient-card']").first();
    if ((await firstCard.count()) === 0) {
      test.skip(true, "No hay pacientes disponibles.");
      return;
    }

    await firstCard.click();

    const exportBtn = page.getByRole("button", { name: /exportar zip/i });
    await expect(exportBtn).toBeVisible({ timeout: 5_000 });

    // Si no hay registros el botón está disabled
    const isDisabled = await exportBtn.isDisabled();
    if (isDisabled) {
      test.skip(true, "Paciente sin consultas — ZIP no disponible.");
      return;
    }

    // Escuchar el evento de descarga
    const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
    await exportBtn.click();

    // Debe mostrar la barra de progreso mientras genera
    await expect(page.getByRole("progressbar")).toBeVisible({ timeout: 3_000 });

    // Esperar la descarga
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/i);

    // El estado de éxito "ZIP descargado" debe aparecer
    await expect(page.getByText(/zip descargado/i)).toBeVisible({ timeout: 30_000 });
  });

  test("el botón está deshabilitado si el paciente no tiene consultas", async ({ page }) => {
    await login(page);

    // Crear un paciente nuevo (sin consultas)
    await page.goto("/pacientes");
    const stamp = Date.now();
    await page.getByRole("button", { name: /nuevo paciente/i }).click();
    await page.getByPlaceholder(/documento de identidad/i).fill(`ZIP-${stamp}`);
    await page.getByPlaceholder(/nombres y apellidos/i).fill(`Paciente Sin Consultas ${stamp}`);
    await page.getByRole("button", { name: /guardar paciente/i }).click();

    // Buscar y seleccionar el paciente recién creado
    await page.getByText(`Paciente Sin Consultas ${stamp}`).click();

    // El botón debe estar disabled (sin registros)
    const exportBtn = page.getByRole("button", { name: /exportar zip/i });
    await expect(exportBtn).toBeVisible({ timeout: 5_000 });
    await expect(exportBtn).toBeDisabled();
  });
});
