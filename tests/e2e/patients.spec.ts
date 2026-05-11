import { expect, test } from "@playwright/test";
import { login, E2E_EMAIL, E2E_PASSWORD } from "./helpers/login";

test.describe("Flujo E2E: Gestión de Pacientes", () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, "Define E2E_EMAIL y E2E_PASSWORD para ejecutar.");

  test("crea un paciente nuevo y aparece en la lista", async ({ page }) => {
    await login(page);
    await page.goto("/pacientes");

    await expect(page.getByRole("heading", { name: /pacientes/i })).toBeVisible();

    const stamp      = Date.now();
    const fullName   = `E2E Paciente ${stamp}`;
    const docNumber  = `E2E-${stamp}`;

    // Abrir formulario de nuevo paciente
    await page.getByRole("button", { name: /nuevo paciente/i }).click();

    await page.getByPlaceholder(/documento de identidad/i).fill(docNumber);
    await page.getByPlaceholder(/nombres y apellidos/i).fill(fullName);

    // Fecha de nacimiento (opcional — si el campo existe)
    const birthField = page.getByPlaceholder(/fecha.*nacimiento/i);
    if (await birthField.isVisible()) {
      await birthField.fill("1990-05-15");
    }

    await page.getByRole("button", { name: /guardar paciente/i }).click();

    // El paciente debe aparecer en la lista
    await expect(page.getByText(fullName)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(docNumber)).toBeVisible({ timeout: 3_000 });
  });

  test("busca un paciente por nombre en la lista", async ({ page }) => {
    await login(page);
    await page.goto("/pacientes");

    await expect(page.getByRole("heading", { name: /pacientes/i })).toBeVisible();

    // Buscar algo que no existe → lista vacía o mensaje de no resultados
    const searchInput = page.getByPlaceholder(/buscar/i).first();
    await searchInput.fill("xyzw_paciente_inexistente_99999");
    await page.waitForTimeout(400);

    // La lista debe estar vacía o mostrar un mensaje
    const noResults = page.getByText(/no.*paciente|sin resultados|no hay/i);
    const emptyList = page.locator("[data-testid='patient-list'] > *");

    const hasNoResultsMsg  = await noResults.isVisible();
    const listIsEmpty      = (await emptyList.count()) === 0;

    expect(hasNoResultsMsg || listIsEmpty).toBe(true);
  });

  test("filtra pacientes por estado: en-seguimiento", async ({ page }) => {
    await login(page);
    await page.goto("/pacientes");

    await expect(page.getByRole("heading", { name: /pacientes/i })).toBeVisible();

    // Buscar el filtro de estado
    const filtroSeguimiento = page.getByRole("button", { name: /seguimiento/i });

    if (await filtroSeguimiento.isVisible()) {
      await filtroSeguimiento.click();

      // Después del filtro, todos los pacientes visibles deben tener ese estado
      // (o la lista puede estar vacía si no hay ninguno en ese estado)
      await page.waitForTimeout(300);

      const cards = page.locator("[data-testid='patient-card']");
      const count = await cards.count();

      if (count > 0) {
        // El primer card debe mostrar el badge de estado "en-seguimiento"
        await expect(cards.first().getByText(/seguimiento/i)).toBeVisible();
      }
    }
  });

  test("seleccionar un paciente lo establece como contexto clínico", async ({ page }) => {
    await login(page);
    await page.goto("/pacientes");

    await expect(page.getByRole("heading", { name: /pacientes/i })).toBeVisible();

    const firstPatient = page.locator("[data-testid='patient-card']").first();

    // Solo si hay pacientes
    if ((await firstPatient.count()) > 0) {
      const patientName = await firstPatient.textContent();
      await firstPatient.click();

      // Navegar a consultas — el paciente debe estar pre-seleccionado
      await page.goto("/consultas");
      await expect(page.getByText(patientName ?? "")).toBeVisible({ timeout: 5_000 });
    }
  });
});
