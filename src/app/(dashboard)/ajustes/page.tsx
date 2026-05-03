import { ProfessionalProfileForm } from "@/features/dashboard/components/professional-profile-form";
import { SyncQueuePanel } from "@/features/sync/components/sync-queue-panel";
import { ErrorLogPanel } from "@/components/ui/error-log-panel";
import { BillingPortalPanel } from "@/features/billing/components/billing-portal-panel";
import { PushNotificationToggle } from "@/features/dashboard/components/push-notification-toggle";

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
        <h2 className="text-lg font-semibold text-ink">Facturación</h2>
        <BillingPortalPanel />
      </section>
      <section className="hce-surface space-y-4">
        <h2 className="text-lg font-semibold text-ink">Estado del Sistema y Dispositivos</h2>
        <PushNotificationToggle />
        <ErrorLogPanel />
        <SyncQueuePanel />
      </section>
    </div>
  );
}
