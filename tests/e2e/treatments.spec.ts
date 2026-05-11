import { expect, test } from "@playwright/test";
import { login, E2E_EMAIL, E2E_PASSWORD } from "./helpers/login";

test.describe("Flujo E2E: Plantillas de Tratamiento", () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, "Define E2E_EMAIL y E2E_PASSWORD para ejecutar.");

  test("crea una plantilla, la edita y verifica el historial de versiones", async ({ page }) => {
    await login(page);
    await page.goto("/tratamientos");

    await expect(page.getByRole("heading", { name: /tratamiento/i })).toBeVisible();

    // ── Crear nueva plantilla ─────────────────────────────────────────────────
    const stamp = Date.now();
    const templateTitle = `Test E2E ${stamp}`;
    const triggerWord  = `e2etrigger${stamp}`;

    await page.getByRole("button", { name: /nueva plantilla/i }).click();

    await page.getByLabel(/título/i).fill(templateTitle);
    await page.getByLabel(/palabra clave/i).fill(triggerWord);
    await page.getByLabel(/contenido/i).fill("Tratamiento inicial E2E — versión 1.");

    await page.getByRole("button", { name: /guardar/i }).click();

    // Plantilla debe aparecer en la lista
    await expect(page.getByText(templateTitle)).toBeVisible();

    // ── Editar la plantilla (crea versión 2) ─────────────────────────────────
    await page.getByText(templateTitle).click();
    await page.getByLabel(/contenido/i).fill("Tratamiento actualizado E2E — versión 2.");
    await page.getByRole("button", { name: /guardar/i }).click();

    await expect(page.getByText(/guardado/i)).toBeVisible({ timeout: 5_000 });

    // ── Verificar historial de versiones ─────────────────────────────────────
    // El botón "Historial (N)" solo aparece cuando hay más de 1 versión
    const historialBtn = page.getByRole("button", { name: /historial/i });
    await expect(historialBtn).toBeVisible({ timeout: 5_000 });
    await historialBtn.click();

    // El modal de historial debe mostrarse
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/versión 1/i)).toBeVisible();

    // Restaurar versión anterior
    await page.getByRole("button", { name: /restaurar/i }).first().click();

    // El contenido debe volver a la v1
    await expect(page.getByLabel(/contenido/i)).toContainText("versión 1");

    // Cerrar modal
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("filtra plantillas por palabra clave en el buscador local", async ({ page }) => {
    await login(page);
    await page.goto("/tratamientos");

    await expect(page.getByRole("heading", { name: /tratamiento/i })).toBeVisible();

    // Escribir en el buscador algo que no existe → no results
    await page.getByPlaceholder(/buscar/i).fill("xyzw_no_existe_99999");
    await expect(page.getByText(/no hay plantillas/i)).toBeVisible({ timeout: 3_000 });

    // Limpiar búsqueda → vuelven a aparecer resultados (si hay plantillas)
    await page.getByPlaceholder(/buscar/i).clear();
  });
});
