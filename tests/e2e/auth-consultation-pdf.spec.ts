import { expect, test } from "@playwright/test";

const E2E_EMAIL = process.env.E2E_EMAIL;
const E2E_PASSWORD = process.env.E2E_PASSWORD;

test.describe("Flujo E2E: login -> consulta -> PDF", () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, "Define E2E_EMAIL y E2E_PASSWORD para ejecutar el flujo E2E real.");

  test("inicia sesion, crea consulta y genera PDF", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("Correo").fill(E2E_EMAIL ?? "");
    await page.getByLabel("Contraseña").fill(E2E_PASSWORD ?? "");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/(dashboard|consultas|ajustes)$/);

    if (page.url().includes("/ajustes")) {
      await page.getByLabel("Titulo profesional").fill("Dr. E2E");
      await page.getByLabel("Numero de licencia profesional").fill(`E2E-${Date.now()}`);
      await page.getByLabel("Anos de experiencia").fill("5");
      await page.getByLabel("Telefono principal").fill("0999999999");
      await page.getByLabel("Direccion profesional").fill("Direccion E2E 123");
      await page.getByLabel("Nombre para firma y membrete").fill("Dr. E2E");
      await page.getByLabel("Especialidades para membrete PDF").fill("Medicina general");
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      await expect(page.getByText("Perfil actualizado correctamente", { exact: false })).toBeVisible();
    }

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
