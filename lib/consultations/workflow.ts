

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


