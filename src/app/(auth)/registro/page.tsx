import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthRouteShell } from "@/features/auth/components/auth-route-shell";
import { APP_NAME } from "@/lib/constants/app";

export const metadata: Metadata = {
  title: `Crear cuenta — ${APP_NAME}`,
  description:
    `Crea tu cuenta en ${APP_NAME} y empieza a gestionar tu historia clínica electrónica. Configuración en 2 minutos.`,
  alternates: { canonical: "/registro" },
};

export default function RegisterPage() {
  return (
    <AuthRouteShell
      variant="register"
      kicker={`${APP_NAME} · Crear cuenta`}
      title="Digitaliza tu práctica médica en menos de 2 minutos."
      lead="Configura tu cuenta, elige tu plan y empieza a registrar pacientes desde el primer día."
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
