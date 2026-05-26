import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";
import { AuthRouteShell } from "@/features/auth/components/auth-route-shell";

export const metadata = {
  title: "Actualizar contraseña | Glyphix",
  description: "Actualiza tu contraseña de Glyphix.",
};

export default function UpdatePasswordPage() {
  return (
    <AuthRouteShell
      variant="login"
      kicker="Seguridad"
      title="Establece tu nueva contraseña"
      lead="Crea una contraseña segura (mínimo 6 caracteres). Te recomendamos usar una combinación de letras y números que no uses en otros sitios."
      highlights={[
        {
          title: "Encriptación de extremo a extremo",
          description: "Nadie en Glyphix, ni siquiera nuestro equipo, puede ver tu contraseña. Se almacena con un hash seguro.",
        },
        {
          title: "Inicio automático",
          description: "Una vez que guardes tu nueva contraseña, te llevaremos directo a tu clínica virtual.",
        },
      ]}
      secondaryAction={{
        href: "/dashboard",
        label: "Ir al Dashboard",
      }}
    >
      <UpdatePasswordForm />
    </AuthRouteShell>
  );
}
