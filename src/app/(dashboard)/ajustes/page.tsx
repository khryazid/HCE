import { ProfessionalProfileForm } from "@/features/dashboard/components/professional-profile-form";
import { SyncQueuePanel } from "@/features/sync/components/sync-queue-panel";
import { ErrorLogPanel } from "@/components/ui/error-log-panel";
import { BillingPortalPanel } from "@/features/billing/components/billing-portal-panel";
import { PushNotificationToggle } from "@/features/dashboard/components/push-notification-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { TeamPanel } from "@/features/dashboard/components/team-panel";
import { PaymentSettingsPanel } from "@/features/dashboard/components/payment-settings-panel";

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
        <div>
          <h2 className="text-lg font-semibold text-ink">Equipo Clínico</h2>
          <p className="text-sm text-muted-foreground">Gestiona el acceso de doctores y asistentes a tu clínica.</p>
        </div>
        <TeamPanel />
      </section>
      <section className="hce-surface space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Métodos de Cobro</h2>
          <p className="text-sm text-muted-foreground">Configura tus datos bancarios y Zelle para recibir pagos de tus pacientes.</p>
        </div>
        <PaymentSettingsPanel />
      </section>
      <section className="hce-surface space-y-6">
        <h2 className="text-lg font-semibold text-ink">Estado del Sistema y Dispositivos</h2>
        <ThemeToggle />
        <div className="border-t border-border pt-4 space-y-4">
          <PushNotificationToggle />
          <ErrorLogPanel />
          <SyncQueuePanel />
        </div>
      </section>
    </div>
  );
}
