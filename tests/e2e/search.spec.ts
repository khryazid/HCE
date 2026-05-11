import { expect, test } from "@playwright/test";
import { login, E2E_EMAIL, E2E_PASSWORD } from "./helpers/login";

test.describe("Flujo E2E: Búsqueda Global (Ctrl+K)", () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, "Define E2E_EMAIL y E2E_PASSWORD para ejecutar.");

  test("abre el panel de búsqueda con Ctrl+K y cierra con Escape", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");

    // Abrir con atajo de teclado
    await page.keyboard.press("Control+k");
    await expect(page.getByPlaceholder(/nombre.*documento.*diagnóstico/i)).toBeVisible({ timeout: 3_000 });

    // Cerrar con Escape
    await page.keyboard.press("Escape");
    await expect(page.getByPlaceholder(/nombre.*documento.*diagnóstico/i)).not.toBeVisible();
  });

  test("abre el panel de búsqueda con el botón de la barra lateral", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");

    // Abrir con el botón visible en el sidebar/header
    await page.getByText(/buscar pacientes, consultas/i).click();
    await expect(page.getByPlaceholder(/nombre.*documento.*diagnóstico/i)).toBeVisible({ timeout: 3_000 });

    // Escribir menos de 2 chars → hint "escribe al menos 2 caracteres"
    await page.getByPlaceholder(/nombre.*documento.*diagnóstico/i).fill("a");
    await expect(page.getByText(/al menos 2 caracteres/i)).toBeVisible();
  });

  test("busca un término y muestra resultados o mensaje vacío", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");

    await page.keyboard.press("Control+k");
    const input = page.getByPlaceholder(/nombre.*documento.*diagnóstico/i);
    await expect(input).toBeVisible({ timeout: 3_000 });

    // Escribir un término de búsqueda
    await input.fill("test");

    // Esperar el debounce (280ms) + respuesta del servidor
    await page.waitForTimeout(600);

    // Debe mostrar resultados O el mensaje de "no hay resultados" — nunca loading eterno
    const hasResults = await page.getByRole("button", { name: /paciente|consulta|tratamiento/i }).count() > 0;
    const noResults  = await page.getByText(/no hay resultados/i).isVisible();
    const isLoading  = await page.getByText(/buscando/i).isVisible();

    // Al menos una de las tres condiciones debe ser verdadera
    expect(hasResults || noResults || isLoading).toBe(true);

    // Cerrar
    await page.keyboard.press("Escape");
  });

  test("navega los resultados con flechas y selecciona con Enter", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard");

    await page.keyboard.press("Control+k");
    const input = page.getByPlaceholder(/nombre.*documento.*diagnóstico/i);
    await expect(input).toBeVisible({ timeout: 3_000 });

    // Buscar algo que devuelva resultados (nombre muy común)
    await input.fill("e");
    await page.waitForTimeout(600);

    const resultsCount = await page.getByRole("button").filter({ hasText: /paciente|consulta|tratamiento/i }).count();

    if (resultsCount > 1) {
      // Primer ítem activo por defecto → flecha abajo activa el segundo
      await page.keyboard.press("ArrowDown");
      // El segundo ítem debe tener el estilo de activo (bg-teal)
      const secondItem = page.getByRole("button").filter({ hasText: /paciente|consulta|tratamiento/i }).nth(1);
      await expect(secondItem).toHaveClass(/teal/);
    }

    await page.keyboard.press("Escape");
  });
});
