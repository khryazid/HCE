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
import { CashRegisterSettingsPanel } from "@/features/dashboard/components/cash-register-settings-panel";
import { useTenant } from "@/lib/supabase/tenant-context";

type TabId = "perfil" | "consultas" | "facturacion" | "equipo" | "avanzado";

export function AjustesClient({ isOnboarding = false }: { isOnboarding?: boolean }) {
  const { tenant } = useTenant();

  const defaultTabs = [
    { id: "perfil", label: "Perfil Profesional", icon: <User className="w-4 h-4" /> },
    { id: "consultas", label: "Constructor de Consultas", icon: <FormInput className="w-4 h-4" /> },
    { id: "facturacion", label: "Pagos y Facturación", icon: <CreditCard className="w-4 h-4" /> },
    { id: "equipo", label: "Equipo Clínico", icon: <Users className="w-4 h-4" /> },
    { id: "avanzado", label: "Avanzado y Sistema", icon: <Settings2 className="w-4 h-4" /> },
  ];

  const tabs = defaultTabs;
  const [activeTab, setActiveTab] = useState<string>(tabs[0].id);

  const currentTabIndex = tabs.findIndex(t => t.id === activeTab);
  
  const handleNextStep = () => {
    if (currentTabIndex < tabs.length - 1) {
      setActiveTab(tabs[currentTabIndex + 1].id as TabId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFinishWizard = async () => {
    // Marcar el wizard como completado en supabase
    const { getSupabaseClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseClient();
    await supabase.auth.updateUser({
      data: { wizard_completed: true }
    });
    window.location.href = "/dashboard";
  };

  return (
    <div className={`flex flex-col gap-8 w-full hce-page ${isOnboarding ? "max-w-3xl mx-auto bg-bg absolute inset-0 z-50 pt-12 px-6" : "lg:flex-row"}`}>
      
      {isOnboarding && (
        <div className="mb-8 border-b border-border pb-6">
          <h1 className="text-3xl font-bold text-ink tracking-tight mb-2">Configuración Inicial</h1>
          <p className="text-ink-soft">Completa estos pasos para empezar a usar Glyphix.</p>
          <div className="flex items-center gap-2 mt-6">
            {tabs.map((tab, idx) => (
              <div key={tab.id} className="flex-1">
                <div className={`h-2 rounded-full ${idx <= currentTabIndex ? "bg-accent" : "bg-bg-elevated"}`} />
                <p className={`text-xs mt-2 font-medium ${idx === currentTabIndex ? "text-accent" : "text-ink-soft"}`}>
                  Paso {idx + 1}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sidebar de navegación (Solo si NO es onboarding) */}
      {!isOnboarding && (
        <aside className="lg:w-64 shrink-0">
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
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 pb-24">
        {activeTab === "perfil" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ProfessionalProfileForm
              kicker={isOnboarding ? "Paso 1 de 5" : "Perfil"}
              title="Tu Perfil Profesional"
              lead="Estos datos aparecerán en los PDFs de tus historias clínicas."
              submitLabel={isOnboarding ? "Guardar y Continuar" : "Guardar Perfil"}
              onSuccess={isOnboarding ? handleNextStep : undefined}
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
            
            {isOnboarding && (
              <div className="mt-8 pt-6 border-t border-border flex justify-end">
                <button onClick={handleNextStep} className="bg-accent text-white px-6 py-2 rounded-lg font-medium hover:bg-accent-hover transition-colors shadow-sm">
                  Continuar
                </button>
              </div>
            )}
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

            <div className="pt-8 border-t border-border">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-ink mb-2">Automatización de Caja</h2>
                <p className="text-sm text-ink-soft">Configura horarios y montos predeterminados para la apertura del turno de caja diario.</p>
              </div>
              <CashRegisterSettingsPanel />
            </div>

            {isOnboarding && (
              <div className="mt-8 pt-6 border-t border-border flex justify-end gap-3">
                <button onClick={handleNextStep} className="text-ink-soft px-6 py-2 rounded-lg font-medium hover:bg-bg-soft transition-colors">
                  Omitir por ahora
                </button>
                <button onClick={handleNextStep} className="bg-accent text-white px-6 py-2 rounded-lg font-medium hover:bg-accent-hover transition-colors shadow-sm">
                  Continuar
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "equipo" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-ink mb-2">Equipo Clínico</h2>
              <p className="text-sm text-ink-soft">Gestiona el acceso de doctores asociados y asistentes a tu clínica.</p>
            </div>
            <TeamPanel />

            {isOnboarding && (
              <div className="mt-8 pt-6 border-t border-border flex justify-end gap-3">
                <button onClick={handleNextStep} className="text-ink-soft px-6 py-2 rounded-lg font-medium hover:bg-bg-soft transition-colors">
                  Omitir por ahora
                </button>
                <button onClick={handleNextStep} className="bg-accent text-white px-6 py-2 rounded-lg font-medium hover:bg-accent-hover transition-colors shadow-sm">
                  Continuar
                </button>
              </div>
            )}
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

            <div className="pt-8 pb-32 sm:pb-8 border-t border-border space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-ink mb-2">Sincronización y Logs</h2>
                <p className="text-sm text-ink-soft">Herramientas de diagnóstico de la cola offline.</p>
              </div>
              <SyncQueuePanel />
              <ErrorLogPanel />
            </div>

            {isOnboarding && (
              <div className="mt-8 pt-6 border-t border-border flex justify-end">
                <button onClick={handleFinishWizard} className="bg-ink text-bg px-8 py-3 rounded-xl font-bold hover:bg-ink-light transition-colors shadow-sm">
                  Finalizar Setup y entrar al Dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
