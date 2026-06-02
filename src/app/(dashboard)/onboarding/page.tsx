import { Metadata } from "next";
import { OnboardingFlow } from "@/features/onboarding/components/onboarding-flow";

export const metadata: Metadata = {
  title: "Configuración Inicial — Glyphix",
};

export default function OnboardingPage() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center bg-bg overflow-y-auto">
      <div className="w-full max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Bienvenido a Glyphix</h1>
          <p className="mt-2 text-ink-soft">Vamos a configurar tu entorno clínico en 4 sencillos pasos.</p>
        </div>
        <OnboardingFlow />
      </div>
    </div>
  );
}
