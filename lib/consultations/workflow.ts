import { formatDateTime } from "@/lib/ui/format-date";

export function normalizeCommaValues(input: string) {
  return input
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function ensureWizardStep(currentStep: number) {
  if (currentStep < 1) {
    return 1;
  }

  if (currentStep > 4) {
    return 4;
  }

  return currentStep;
}

/**
 * formatConsultationTimestamp: usa el utilitario centralizado.
 * @deprecated Usar formatDateTime de @/lib/ui/format-date directamente.
 */
export function formatConsultationTimestamp(value: string): string {
  return formatDateTime(value);
}
