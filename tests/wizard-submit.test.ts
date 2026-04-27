import { describe, expect, it, vi } from "vitest";
import { submitConsultationWithValidation } from "@/lib/consultations/wizard-submit";

describe("wizard submit helper", () => {
  it("stops submit and reports validation errors", async () => {
    const setValidationErrors = vi.fn();
    const setError = vi.fn();
    const setSaving = vi.fn();
    const saveConsultation = vi.fn();
    const onValidationFailed = vi.fn();

    await submitConsultationWithValidation(
      { generatePdf: false },
      {
        validate: () => ({ diagnosis: "required" }),
        setValidationErrors,
        setError,
        setSaving,
        saveConsultation,
        onValidationFailed,
      },
    );

    expect(setValidationErrors).toHaveBeenCalledWith({ diagnosis: "required" });
    expect(setError).toHaveBeenCalledWith(
      "Corrige los campos obligatorios marcados en rojo y vuelve a guardar.",
    );
    expect(setSaving).not.toHaveBeenCalled();
    expect(saveConsultation).not.toHaveBeenCalled();
    expect(onValidationFailed).toHaveBeenCalledTimes(1);
  });

  it("executes save and clears saving state on success", async () => {
    const setValidationErrors = vi.fn();
    const setError = vi.fn();
    const setSaving = vi.fn();
    const saveConsultation = vi.fn().mockResolvedValue(undefined);

    await submitConsultationWithValidation(
      { generatePdf: true },
      {
        validate: () => ({}),
        setValidationErrors,
        setError,
        setSaving,
        saveConsultation,
      },
    );

    expect(setValidationErrors).toHaveBeenCalledWith({});
    expect(setSaving).toHaveBeenNthCalledWith(1, true);
    expect(setError).toHaveBeenCalledWith(null);
    expect(saveConsultation).toHaveBeenCalledWith({ generatePdf: true });
    expect(setSaving).toHaveBeenLastCalledWith(false);
  });

  it("uses actionable fallback message on unknown save error", async () => {
    const setValidationErrors = vi.fn();
    const setError = vi.fn();
    const setSaving = vi.fn();
    const saveConsultation = vi.fn().mockRejectedValue("unknown");

    await submitConsultationWithValidation(
      { generatePdf: false },
      {
        validate: () => ({}),
        setValidationErrors,
        setError,
        setSaving,
        saveConsultation,
      },
    );

    expect(setError).toHaveBeenLastCalledWith(
      "No se pudo guardar la consulta. Revisa tu conexion e intenta nuevamente.",
    );
    expect(setSaving).toHaveBeenLastCalledWith(false);
  });
});