import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthRouteShell } from "@/features/auth/components/auth-route-shell";

export const metadata: Metadata = {
  title: "Crear cuenta — Glyph",
  description:
    "Crea tu cuenta en Glyph y empieza a gestionar tu historia clínica electrónica. Configuración en 2 minutos, sin tarjeta de crédito.",
};

export default function RegisterPage() {
  return (
    <AuthRouteShell
      variant="register"
      kicker="Glyph · Registro gratuito"
      title="Digitaliza tu consultorio en menos de 2 minutos."
      lead="Define tus especialidades, configura tu perfil y empieza a registrar consultas desde el primer día. Sin tarjeta de crédito."
      highlights={[
        {
          title: "Perfil por médico",
          description:
            "Especialidades, membrete y datos clínicos listos desde el alta.",
        },
        {
          title: "PDF desde el día uno",
          description:
            "Tus datos quedan configurados para generar recetas y reportes al instante.",
        },
        {
          title: "Funciona offline",
          description:
            "Registra consultas sin internet. La sincronización es automática.",
        },
        {
          title: "Seguro y privado",
          description:
            "PHI cifrado en tu dispositivo. Aislamiento multi-tenant en DB.",
        },
      ]}
      secondaryAction={{ href: "/login", label: "Ya tengo cuenta" }}
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8 text-sm text-ink-soft">
            Cargando formulario...
          </div>
        }
      >
        <AuthForm mode="register" />
      </Suspense>
    </AuthRouteShell>
  );
}
