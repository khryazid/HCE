import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/features/auth/components/auth-form";
import { AuthRouteShell } from "@/features/auth/components/auth-route-shell";

export const metadata: Metadata = {
  title: "Iniciar sesión — Glyph",
  description:
    "Accede a tu espacio clínico en Glyph. Historia clínica electrónica, consultas y sincronización offline-first para médicos.",
};

export default function LoginPage() {
  return (
    <AuthRouteShell
      variant="login"
      kicker="Glyph · Inicio de sesión"
      title="Vuelve a tu espacio clínico y retoma donde lo dejaste."
      lead="Accede a tus pacientes, consultas y seguimientos. Todo sincronizado, incluso si trabajaste sin conexión."
      highlights={[
        {
          title: "Acceso inmediato",
          description:
            "Entra y recupera tu flujo clínico sin pantallas intermedias.",
        },
        {
          title: "Datos sincronizados",
          description:
            "Retomas datos locales y la cola de sync desde la misma sesión.",
        },
      ]}
      secondaryAction={{ href: "/registro", label: "Crear una cuenta" }}
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8 text-sm text-ink-soft">
            Cargando formulario...
          </div>
        }
      >
        <AuthForm mode="login" />
      </Suspense>
    </AuthRouteShell>
  );
}
