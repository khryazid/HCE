import { RecoverPasswordForm } from "@/features/auth/components/recover-password-form";
import { AuthRouteShell } from "@/features/auth/components/auth-route-shell";

export const metadata = {
  title: "Recuperar contraseña | Glyphix",
  description: "Recupera el acceso a tu cuenta de Glyphix.",
};

export default function RecoverPasswordPage() {
  return (
    <AuthRouteShell
      variant="login"
      kicker="Recuperación"
      title="Restablece tu acceso a Glyphix"
      lead="Si olvidaste tu contraseña, no te preocupes. Te enviaremos un enlace mágico seguro para que puedas elegir una nueva."
      highlights={[
        {
          title: "Proceso seguro",
          description: "Usamos enlaces de un solo uso que expiran rápidamente para proteger tu cuenta médica.",
        },
        {
          title: "Acceso inmediato",
          description: "Recupera tu cuenta en segundos y continúa gestionando tu clínica.",
        },
      ]}
      secondaryAction={{
        href: "/login",
        label: "Iniciar sesión",
      }}
    >
      <RecoverPasswordForm />
    </AuthRouteShell>
  );
}
