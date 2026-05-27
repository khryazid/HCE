"use client";

import { useState } from "react";
import { Settings, User, FormInput, CreditCard, Users, Settings2, Laptop } from "lucide-react";
import { ProfessionalProfileForm } from "@/features/dashboard/components/professional-profile-form";
import { SyncQueuePanel } from "@/features/sync/components/sync-queue-panel";
import { ErrorLogPanel } from "@/components/ui/error-log-panel";
import { BillingPortalPanel } from "@/features/billing/components/billing-portal-panel";
import { PushNotificationToggle } from "@/features/dashboard/components/push-notification-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { TeamPanel } from "@/features/dashboard/components/team-panel";
import { PaymentSettingsPanel } from "@/features/dashboard/components/payment-settings-panel";
import { ClinicalFormBuilderPanel } from "@/features/dashboard/components/clinical-form-builder-panel";

type TabId = "perfil" | "consultas" | "facturacion" | "equipo" | "avanzado";

export function AjustesClient() {
  const [activeTab, setActiveTab] = useState<TabId>("perfil");

  const tabs = [
    { id: "perfil", label: "Perfil Profesional", icon: <User className="w-4 h-4" /> },
    { id: "consultas", label: "Constructor de Consultas", icon: <FormInput className="w-4 h-4" /> },
    { id: "facturacion", label: "Pagos y Facturación", icon: <CreditCard className="w-4 h-4" /> },
    { id: "equipo", label: "Equipo Clínico", icon: <Users className="w-4 h-4" /> },
    { id: "avanzado", label: "Avanzado y Sistema", icon: <Settings2 className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto w-full hce-page">
      {/* Sidebar */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="sticky top-24">
          <div className="mb-6 px-3">
            <h1 className="text-2xl font-bold text-ink tracking-tight mb-1">Ajustes</h1>
            <p className="text-sm text-ink-soft">Configura tu espacio clínico</p>
          </div>
          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabId)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-ink-soft hover:bg-bg-soft hover:text-ink"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 pb-24">
        {activeTab === "perfil" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ProfessionalProfileForm
              kicker="Onboarding"
              title="Tu Perfil Profesional"
              lead="Estos datos aparecerán en los PDFs de tus historias clínicas."
              submitLabel="Guardar Perfil"
            />
          </div>
        )}

        {activeTab === "consultas" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-ink mb-2">Constructor Clínico (Rompecabezas)</h2>
              <p className="text-sm text-ink-soft">Personaliza el formulario de consulta ocultando los módulos que no necesitas para hacer tu flujo más ágil.</p>
            </div>
            <ClinicalFormBuilderPanel />
          </div>
        )}

        {activeTab === "facturacion" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-12">
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-ink mb-2">Suscripción</h2>
                <p className="text-sm text-ink-soft">Gestiona tu plan activo de Glyphix y tu método de pago.</p>
              </div>
              <BillingPortalPanel />
            </div>
            
            <div className="pt-8 border-t border-border">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-ink mb-2">Métodos de Cobro</h2>
                <p className="text-sm text-ink-soft">Configura tus datos bancarios y Zelle para recibir pagos de tus pacientes.</p>
              </div>
              <PaymentSettingsPanel />
            </div>
          </div>
        )}

        {activeTab === "equipo" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-ink mb-2">Equipo Clínico</h2>
              <p className="text-sm text-ink-soft">Gestiona el acceso de doctores asociados y asistentes a tu clínica.</p>
            </div>
            <TeamPanel />
          </div>
        )}

        {activeTab === "avanzado" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-10">
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-ink mb-2">Dispositivo y Apariencia</h2>
                <p className="text-sm text-ink-soft">Preferencias locales de tu dispositivo actual.</p>
              </div>
              <div className="flex items-center gap-4 bg-bg-elevated p-6 rounded-xl border border-border">
                <Laptop className="w-5 h-5 text-ink-soft" />
                <div className="flex-1">
                  <h3 className="font-semibold text-ink">Tema Visual</h3>
                  <p className="text-sm text-ink-soft">Alterna entre modo claro y oscuro.</p>
                </div>
                <ThemeToggle />
              </div>
            </div>

            <div className="pt-8 border-t border-border space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-ink mb-2">Notificaciones</h2>
                <p className="text-sm text-ink-soft">Mantente al tanto de recordatorios y actualizaciones.</p>
              </div>
              <PushNotificationToggle />
            </div>

            <div className="pt-8 border-t border-border space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-ink mb-2">Sincronización y Logs</h2>
                <p className="text-sm text-ink-soft">Herramientas de diagnóstico de la cola offline.</p>
              </div>
              <SyncQueuePanel />
              <ErrorLogPanel />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
