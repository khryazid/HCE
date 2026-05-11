import { expect, test } from "@playwright/test";
import { login, E2E_EMAIL, E2E_PASSWORD } from "./helpers/login";

test.describe("Flujo E2E: Billing y Stripe", () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, "Define E2E_EMAIL y E2E_PASSWORD para ejecutar el flujo E2E real.");

  test("deberia redirigir al portal de Stripe al clickear el boton de Suscripcion", async ({ page }) => {
    await login(page);
    // 2. Ir a ajustes
    await page.goto("/ajustes");
    await expect(page.getByRole("heading", { name: "Ajustes y Cuenta" })).toBeVisible();

    // 3. Buscar la seccion de Suscripcion
    await expect(page.getByText("Suscripción")).toBeVisible();

    // 4. Iniciar la promesa de navegacion antes de hacer click (ya que nos llevara a checkout.stripe.com o billing.stripe.com)
    // Usamos waitForNavigation porque la app hara un window.location.href = data.url
    const responsePromise = page.waitForNavigation({ url: /stripe\.com/ });
    
    // El boton puede decir "Actualizar plan", "Suscribirme" o "Gestionar mi plan en Stripe"
    const billingButton = page.getByRole("button", { name: /suscribirme|gestionar|actualizar/i }).first();
    await expect(billingButton).toBeVisible();
    await billingButton.click();

    // 5. Validar que la app redirigio correctamente al dominio de Stripe
    const response = await responsePromise;
    expect(response?.url()).toContain("stripe.com");

    // NOTA: No automatizamos el llenado de la tarjeta de credito de prueba porque las politicas
    // anti-bot de Stripe y los CAPTCHAS a menudo rompen el CI de Playwright. 
    // Llegar al checkout con exito confirma que el backend firmó bien la sesion.
  });
});
