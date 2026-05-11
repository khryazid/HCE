import { expect, test } from "@playwright/test";

/**
 * Dark mode toggle tests — no auth required.
 * These tests verify that the ThemeToggle component correctly
 * applies data-theme to <html> and that CSS variables switch.
 */
test.describe("Flujo E2E: Dark Mode / Theme Toggle", () => {
  test("la landing page carga sin flash de tema incorrecto", async ({ page }) => {
    // Simular que el usuario guardó preferencia dark en localStorage
    await page.addInitScript(() => {
      localStorage.setItem("hce:theme", "dark");
    });

    await page.goto("/");

    // El script anti-flash debe haber aplicado data-theme="dark" antes del render
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "dark");
  });

  test("el toggle en Ajustes cambia a modo oscuro y persiste en localStorage", async ({ page, context }) => {
    // Empezar sin preferencia guardada (sistema)
    await context.clearCookies();

    await page.goto("/ajustes");

    // Si redirige al login, saltar (requiere auth)
    if (page.url().includes("/login") || page.url() === "/") {
      test.skip(true, "Requiere sesión — usar E2E_EMAIL/E2E_PASSWORD");
      return;
    }

    // Buscar el toggle de tema
    const darkBtn = page.getByRole("button", { name: /oscuro/i });
    await expect(darkBtn).toBeVisible({ timeout: 5_000 });
    await darkBtn.click();

    // El atributo data-theme en <html> debe cambiar inmediatamente
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // El valor debe persistir en localStorage
    const stored = await page.evaluate(() => localStorage.getItem("hce:theme"));
    expect(stored).toBe("dark");

    // Recargar y verificar que el tema se restaura sin flash
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("el toggle 'Sistema' elimina data-theme y delega al media query", async ({ page, context }) => {
    // Arrancar con dark guardado
    await page.addInitScript(() => {
      localStorage.setItem("hce:theme", "dark");
    });

    await page.goto("/ajustes");

    if (page.url().includes("/login") || page.url() === "/") {
      test.skip(true, "Requiere sesión — usar E2E_EMAIL/E2E_PASSWORD");
      return;
    }

    const sistemaBtn = page.getByRole("button", { name: /sistema/i });
    await expect(sistemaBtn).toBeVisible({ timeout: 5_000 });
    await sistemaBtn.click();

    // Con "sistema" seleccionado, data-theme debe eliminarse del <html>
    const theme = await page.locator("html").getAttribute("data-theme");
    expect(theme).toBeNull();

    // localStorage debe estar limpio
    const stored = await page.evaluate(() => localStorage.getItem("hce:theme"));
    expect(stored).toBeNull();
  });

  test("el toggle 'Claro' fuerza modo claro aunque el sistema sea oscuro", async ({ page }) => {
    // Emular sistema dark + localStorage vacío
    await page.emulateMedia({ colorScheme: "dark" });

    await page.goto("/ajustes");

    if (page.url().includes("/login") || page.url() === "/") {
      test.skip(true, "Requiere sesión — usar E2E_EMAIL/E2E_PASSWORD");
      return;
    }

    const claroBtn = page.getByRole("button", { name: /claro/i });
    await expect(claroBtn).toBeVisible({ timeout: 5_000 });
    await claroBtn.click();

    // data-theme="light" debe sobreponerse al sistema dark
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    const stored = await page.evaluate(() => localStorage.getItem("hce:theme"));
    expect(stored).toBe("light");
  });
});
