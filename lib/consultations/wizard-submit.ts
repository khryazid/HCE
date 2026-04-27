import { buildRetryableErrorMessage } from "@/lib/ui/feedback-copy";

export type SubmitConsultationOptions = {
  generatePdf: boolean;
};

export type SubmitConsultationDependencies = {
  validate: () => Record<string, string>;
  setValidationErrors: (errors: Record<string, string>) => void;
  setError: (message: string | null) => void;
  setSaving: (saving: boolean) => void;
  saveConsultation: (options: SubmitConsultationOptions) => Promise<void>;
  onValidationFailed?: () => void;
};

export async function submitConsultationWithValidation(
  options: SubmitConsultationOptions,
  deps: SubmitConsultationDependencies,
) {
  const errors = deps.validate();
  deps.setValidationErrors(errors);

  if (Object.keys(errors).length > 0) {
    deps.setError(
      "Corrige los campos obligatorios marcados en rojo y vuelve a guardar.",
    );
    deps.onValidationFailed?.();
    return;
  }

  deps.setSaving(true);
  deps.setError(null);

  try {
    await deps.saveConsultation(options);
  } catch (submitError) {
    deps.setError(
      submitError instanceof Error
        ? submitError.message
        : buildRetryableErrorMessage("guardar la consulta"),
    );
  } finally {
    deps.setSaving(false);
  }
}