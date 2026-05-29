"use client";

import { useTenant } from "@/lib/supabase/tenant-context";
import { updateTenantUIPreferences } from "@/lib/supabase/profile";
import { useState, useEffect } from "react";
import { Shield, Printer, Building } from "lucide-react";

export function ProfileSectionAccessControls() {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  
  // Toggles state
  const [allowAssistantPrint, setAllowAssistantPrint] = useState(false);
  const [allowCentralReception, setAllowCentralReception] = useState(false);

  useEffect(() => {
    if (tenant?.ui_preferences) {
      setAllowAssistantPrint(tenant.ui_preferences.allow_assistant_print === true);
      setAllowCentralReception(tenant.ui_preferences.allow_central_reception === true);
    }
  }, [tenant]);

  // Si no es admin/titular, no puede ver estos controles
  if (tenant?.role !== "admin" && tenant?.role !== "doctor") return null;

  const handleTogglePrint = async () => {
    if (!tenant) return;
    const newValue = !allowAssistantPrint;
    setAllowAssistantPrint(newValue);
    setLoading(true);
    try {
      await updateTenantUIPreferences(tenant.doctor_id, {
        ...(tenant.ui_preferences as Record<string, boolean>),
        allow_assistant_print: newValue
      });
    } catch (e) {
      setAllowAssistantPrint(!newValue); // rollback
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReception = async () => {
    if (!tenant) return;
    const newValue = !allowCentralReception;
    setAllowCentralReception(newValue);
    setLoading(true);
    try {
      await updateTenantUIPreferences(tenant.doctor_id, {
        ...(tenant.ui_preferences as Record<string, boolean>),
        allow_central_reception: newValue
      });
    } catch (e) {
      setAllowCentralReception(!newValue); // rollback
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-ink">Privacidad y Accesos</h3>
          <p className="text-sm text-ink-soft">Configura qué puede ver o hacer tu equipo dentro de tu consultorio.</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Toggle Impresión */}
        <div className="flex items-start justify-between rounded-lg border border-border bg-bg-soft p-4">
          <div className="flex gap-3">
            <Printer className="mt-0.5 h-5 w-5 text-ink-soft" />
            <div>
              <p className="font-medium text-ink">Impresión de Recetas por Asistentes</p>
              <p className="text-xs text-ink-soft mt-1 max-w-[280px] sm:max-w-md">
                Permite a los asistentes generar e imprimir PDFs de las recetas y órdenes de laboratorio usando tu membrete y firma.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={handleTogglePrint}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
              allowAssistantPrint ? 'bg-accent' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={allowAssistantPrint}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                allowAssistantPrint ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Toggle Recepción Central (Solo si es plan de clínica, pero para ahora lo mostramos) */}
        {tenant.plan === "clinic" && (
          <div className="flex items-start justify-between rounded-lg border border-border bg-bg-soft p-4">
            <div className="flex gap-3">
              <Building className="mt-0.5 h-5 w-5 text-ink-soft" />
              <div>
                <p className="font-medium text-ink">Recepción Central</p>
                <p className="text-xs text-ink-soft mt-1 max-w-[280px] sm:max-w-md">
                  Permite que la recepción global de la clínica vea tus horarios y te agende pacientes directamente.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleToggleReception}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                allowCentralReception ? 'bg-accent' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={allowCentralReception}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  allowCentralReception ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
