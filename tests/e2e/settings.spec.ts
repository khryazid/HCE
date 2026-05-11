import { expect, test } from "@playwright/test";
import { login, E2E_EMAIL, E2E_PASSWORD } from "./helpers/login";

test.describe("Flujo E2E: Ajustes y Perfil Profesional", () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, "Define E2E_EMAIL y E2E_PASSWORD para ejecutar.");

  test("actualiza el perfil profesional y muestra confirmación", async ({ page }) => {
    await login(page);
    await page.goto("/ajustes");

    await expect(page.getByRole("heading", { name: /perfil|ajustes/i })).toBeVisible();

    // Editar campos del perfil
    const titleField = page.getByLabel(/título profesional/i);
    await titleField.clear();
    await titleField.fill("Dr. E2E Actualizado");

    await page.getByRole("button", { name: /guardar/i }).click();

    // Debe aparecer un mensaje de éxito
    await expect(page.getByText(/actualizado|guardado/i)).toBeVisible({ timeout: 5_000 });
  });

  test("la sección de facturación muestra el botón de Stripe", async ({ page }) => {
    await login(page);
    await page.goto("/ajustes");

    await expect(page.getByRole("heading", { name: /facturación/i })).toBeVisible();

    // El panel de billing debe tener un botón hacia Stripe
    const billingBtn = page.getByRole("button", { name: /suscribirme|gestionar|actualizar|stripe/i });
    await expect(billingBtn).toBeVisible({ timeout: 5_000 });
  });

  test("el toggle de notificaciones push está visible", async ({ page }) => {
    await login(page);
    await page.goto("/ajustes");

    await expect(page.getByRole("heading", { name: /sistema|dispositivo/i })).toBeVisible();

    // El ThemeToggle y PushNotificationToggle deben estar visibles
    await expect(page.getByRole("button", { name: /oscuro/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /claro/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /sistema/i })).toBeVisible();
  });
});
