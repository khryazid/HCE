import { ProfessionalProfileForm } from "@/components/ui/professional-profile-form";

export default function AjustesPage() {
  return (
    <ProfessionalProfileForm
      kicker="Ajustes"
      title="Perfil, membrete y respaldo"
      lead="Centraliza los datos profesionales, el logo de PDF y el backup de la clave de cifrado en una sola pantalla."
      submitLabel="Guardar ajustes"
    />
  );
}
