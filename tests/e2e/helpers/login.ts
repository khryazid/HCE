import type { Page } from "@playwright/test";

const E2E_EMAIL = process.env.E2E_EMAIL ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";

/**
 * Shared login helper for E2E tests.
 * Navigates to the root, fills in credentials and waits for the dashboard.
 * Handles the onboarding redirect (/ajustes) by filling minimum required fields.
 */
export async function login(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Correo").fill(E2E_EMAIL);
  await page.getByLabel("Contraseña").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(dashboard|consultas|ajustes|pacientes|tratamientos)$/, {
    timeout: 15_000,
  });

  // Handle first-time onboarding redirect
  if (page.url().includes("/ajustes")) {
    await page.getByLabel("Titulo profesional").fill("Dr. E2E Test");
    await page.getByLabel("Numero de licencia profesional").fill(`E2E-${Date.now()}`);
    await page.getByLabel("Anos de experiencia").fill("5");
    await page.getByLabel("Telefono principal").fill("0999999999");
    await page.getByLabel("Direccion profesional").fill("Calle E2E 123");
    await page.getByLabel("Nombre para firma y membrete").fill("Dr. E2E Test");
    await page.getByLabel("Especialidades para membrete PDF").fill("Medicina general");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await page.waitForURL(/\/(dashboard|consultas|pacientes|tratamientos)$/, {
      timeout: 10_000,
    });
  }
}

export { E2E_EMAIL, E2E_PASSWORD };
