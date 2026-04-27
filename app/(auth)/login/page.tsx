import { Suspense } from "react";
import { AuthForm } from "@/components/ui/auth-form";
import { AuthRouteShell } from "@/components/ui/auth-route-shell";

export default function LoginPage() {
  return (
    <AuthRouteShell
      variant="login"
      kicker="Glyph · Inicio de sesion"
      title="Vuelve a tu espacio clinico y retoma tu trabajo donde lo dejaste."
      lead="Usa tu cuenta para continuar con pacientes, consultas, seguimiento y sincronizacion offline-first."
      highlights={[
        {
          title: "Acceso unico",
          description: "Entra y recupera tu flujo clinico sin pantallas intermedias.",
        },
        {
          title: "Estado sincronizado",
          description: "Retomas datos locales y la cola de sincronizacion desde la misma sesion.",
        },
      ]}
      secondaryAction={{ href: "/registro", label: "Crear una cuenta" }}
    >
      <Suspense fallback={<div className="flex items-center justify-center p-8 text-sm text-ink-soft">Cargando formulario...</div>}>
        <AuthForm mode="login" />
      </Suspense>
    </AuthRouteShell>
  );
}
