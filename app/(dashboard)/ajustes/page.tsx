import { ProfessionalProfileForm } from "@/components/ui/professional-profile-form";
import { SyncQueuePanel } from "@/components/ui/sync-queue-panel";
import { ErrorLogPanel } from "@/components/ui/error-log-panel";

export default function AjustesPage() {
  return (
    <div className="space-y-8">
      <ProfessionalProfileForm
        kicker="Ajustes"
        title="Perfil, membrete y respaldo"
        lead="Centraliza los datos profesionales, el logo de PDF y el backup de la clave de cifrado en una sola pantalla."
        submitLabel="Guardar ajustes"
      />
      <section className="hce-surface space-y-4">
        <h2 className="text-lg font-semibold text-ink">Estado del Sistema</h2>
        <ErrorLogPanel />
        <SyncQueuePanel />
      </section>
    </div>
  );
}
