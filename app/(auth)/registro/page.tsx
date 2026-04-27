import { Suspense } from "react";
import { AuthForm } from "@/components/ui/auth-form";
import { AuthRouteShell } from "@/components/ui/auth-route-shell";

export default function RegisterPage() {
  return (
    <AuthRouteShell
      variant="register"
      kicker="Glyph · Registro"
      title="Crea tu cuenta y deja listo tu entorno clinico desde el inicio."
      lead="Registra tus especialidades, define tu tenant y prepara el flujo para onboarding profesional, consultas y documentacion posterior."
      highlights={[
        {
          title: "Perfil por medico",
          description: "Las especialidades se definen desde el alta de cuenta.",
        },
        {
          title: "Base para PDF",
          description: "Los datos quedan listos para membrete y reportes clinicos.",
        },
      ]}
      secondaryAction={{ href: "/login", label: "Ya tengo cuenta" }}
    >
      <Suspense fallback={<div className="flex items-center justify-center p-8 text-sm text-ink-soft">Cargando formulario...</div>}>
        <AuthForm mode="register" />
      </Suspense>
    </AuthRouteShell>
  );
}

