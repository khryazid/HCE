"use client";

import { Check } from "lucide-react";

type Step = {
  number: number;
  label: string;
};

type Props = {
  steps: Step[];
  currentStep: number; // 1-based
};

export function WizardStepper({ steps, currentStep }: Props) {
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="relative mb-6 flex w-full max-w-sm flex-col items-center">
      {/* Barra de progreso */}
      <div className="absolute top-3 left-0 flex h-0.5 w-full items-center px-4">
        <div className="h-full w-full bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="relative z-10 flex w-full justify-between">
        {steps.map((step, index) => {
          const isDone   = step.number < currentStep;
          const isActive = step.number === currentStep;

          return (
            <div key={step.number} className="flex flex-col items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-200 ${
                  isDone
                    ? "bg-accent text-white"
                    : isActive
                      ? "border-2 border-accent bg-accent/10 text-accent"
                      : "border border-border bg-card text-ink-soft"
                }`}
              >
                {isDone ? (
                  <Check className="h-3 w-3" />
                ) : (
                  step.number
                )}
              </div>

              {/* Label — solo visible en sm+ */}
              <span
                className={`hidden sm:block text-[10px] font-medium transition-colors ${
                  isActive ? "text-accent" : isDone ? "text-ink" : "text-ink-soft/50"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
