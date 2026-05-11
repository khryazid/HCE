import { expect, test } from "@playwright/test";
import { login, E2E_EMAIL, E2E_PASSWORD } from "./helpers/login";

test.describe("Flujo E2E: login -> consulta -> PDF", () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, "Define E2E_EMAIL y E2E_PASSWORD para ejecutar el flujo E2E real.");

  test("inicia sesion, crea consulta y genera PDF", async ({ page }) => {
    await login(page);
    await page.goto("/consultas");
    await expect(page.getByRole("heading", { name: "Flujo de consulta" })).toBeVisible();

    await page.getByRole("button", { name: "Nueva consulta" }).click();
    await expect(page.getByText("Paso 1 de 4")).toBeVisible();

    const stamp = Date.now();
    await page.getByPlaceholder("Nombre").fill("Paciente");
    await page.getByPlaceholder("Apellido").fill(`E2E${stamp}`);
    await page.getByPlaceholder("Documento de identidad").fill(`E2E-${stamp}`);
    await page.getByRole("button", { name: "Crear paciente" }).click();

    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Paso 2 de 4")).toBeVisible();

    await page.getByPlaceholder("Anamnesis").fill("Dolor de garganta y malestar general de 2 dias.");
    await page.getByPlaceholder("Sintomas").fill("Fiebre leve, odinofagia.");
    await page.getByPlaceholder("Diagnostico").fill("Faringitis aguda");
    await page.getByPlaceholder("Codigos CIE separados por coma").fill("J02.9");

    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Paso 3 de 4")).toBeVisible();

    await page.getByPlaceholder("Tratamiento final (editable)").fill("Paracetamol 500mg cada 8 horas por 3 dias.");

    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText("Paso 4 de 4")).toBeVisible();

    await page.getByRole("button", { name: "Previsualizar PDF" }).click();
    await expect(page.getByRole("heading", { name: "Previsualizacion del PDF" })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Guardar y generar PDF" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename().toLowerCase()).toContain("consulta");

    await expect(
      page.getByText("Consulta guardada con flujo guiado y PDF generado.", {
        exact: false,
      }),
    ).toBeVisible();
  });
});
