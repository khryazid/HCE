import { ProfessionalProfileForm } from "@/components/ui/professional-profile-form";
import { SyncQueuePanel } from "@/components/ui/sync-queue-panel";

export default function AjustesPage() {
  return (
    <div className="space-y-8">
      <ProfessionalProfileForm
        kicker="Ajustes"
        title="Perfil, membrete y respaldo"
        lead="Centraliza los datos profesionales, el logo de PDF y el backup de la clave de cifrado en una sola pantalla."
        submitLabel="Guardar ajustes"
      />
      <section className="hce-surface">
        <h2 className="text-lg font-semibold text-ink mb-4">Estado de Sincronización</h2>
        <SyncQueuePanel />
      </section>
    </div>
  );
}
