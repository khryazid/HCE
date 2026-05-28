"use client";

import { useState, useEffect } from "react";
import { updateTenantUIPreferences } from "@/lib/supabase/profile";
import { useTenant } from "@/lib/supabase/tenant-context";
import { Check, Loader2 } from "lucide-react";

type PreferenceItem = {
  key: string;
  label: string;
  description: string;
  category: "Anamnesis" | "Examen Físico" | "Revisión por Sistemas" | "Plan y Tratamiento";
};

// NOTA: Los keys son "hide_X" porque por defecto todo es visible (undefined = false = visible).
// Para la interfaz, los mostramos como "Mostrar X" para que sea más intuitivo, invirtiendo el booleano.
const PREFERENCES: PreferenceItem[] = [
  // Anamnesis
  { key: "hide_family_history", label: "Antecedentes Familiares", description: "Enfermedades hereditarias y contexto familiar.", category: "Anamnesis" },
  { key: "hide_personal_history", label: "Antecedentes Personales", description: "Patológicos, quirúrgicos y alergias.", category: "Anamnesis" },
  { key: "hide_habits", label: "Hábitos Psicosociales", description: "Tabaco, alcohol, drogas y estilo de vida.", category: "Anamnesis" },
  { key: "hide_female_history", label: "Antecedentes Gineco-obstétricos", description: "Específico para pacientes mujeres.", category: "Anamnesis" },
  { key: "hide_pediatric_history", label: "Antecedentes Pediátricos", description: "Perinatales, vacunas y desarrollo. Se activa al seleccionar pediatría.", category: "Anamnesis" },
  
  // Revisión por Sistemas
  { key: "hide_review_of_systems", label: "Módulo Completo de Revisión", description: "Oculta toda la revisión por sistemas si no la utilizas.", category: "Revisión por Sistemas" },
  
  // Examen Físico
  { key: "hide_vital_signs", label: "Signos Vitales y Antropometría", description: "Tensión arterial, frecuencia cardíaca, peso, talla.", category: "Examen Físico" },
  { key: "hide_physical_exam", label: "Examen Físico Regional", description: "Cabeza, cuello, tórax, abdomen, etc.", category: "Examen Físico" },
  
  // Plan y Tratamiento
  { key: "hide_medical_orders", label: "Órdenes Intrahospitalarias", description: "Dieta, cuidados de enfermería y medidas generales.", category: "Plan y Tratamiento" },
  { key: "hide_paraclinicals", label: "Órdenes de Laboratorio e Imagen", description: "Solicitudes de paraclínicos adicionales.", category: "Plan y Tratamiento" },
  { key: "hide_prognosis", label: "Pronóstico Vital y Funcional", description: "Evaluación de pronóstico a corto/largo plazo.", category: "Plan y Tratamiento" },
];

export function ClinicalFormBuilderPanel() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (tenant) {
      setPreferences((tenant.ui_preferences as Record<string, boolean>) || {});
    }
  }, [tenant]);

  async function handleSave() {
    if (!tenant) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateTenantUIPreferences(tenant.doctor_id, preferences);
      setMessage({ type: "success", text: "Preferencias guardadas exitosamente. El Wizard Clínico se ha actualizado." });
      // Limpiar mensaje después de 3s
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Error al guardar las preferencias." });
    } finally {
      setSaving(false);
    }
  }

  function togglePreference(key: string) {
    setPreferences(prev => {
      const next = { ...prev };
      // Invertir valor (si no existe es false/undefined, así que hide pasa a ser true)
      next[key] = !prev[key];
      return next;
    });
  }

  if (tenantLoading) {
    return <div className="p-4 text-sm text-ink-soft animate-pulse">Cargando constructor clínico...</div>;
  }

  if (!tenant) {
    return <div className="p-4 text-sm text-red-600">No se pudo cargar la información del usuario.</div>;
  }

  const categories = Array.from(new Set(PREFERENCES.map(p => p.category)));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-soft max-w-2xl">
            Desactiva los módulos que no utilices en tu especialidad para hacer el formulario de consulta mucho más rápido y enfocado. 
            Los módulos desactivados no se imprimirán en el PDF final a menos que tengan información precargada.
          </p>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="hce-btn-primary whitespace-nowrap min-w-[140px] justify-center"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Cambios"}
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {message.type === "success" && <Check className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {categories.map(category => (
          <div key={category} className="space-y-3 p-4 rounded-2xl border border-border bg-card">
            <h3 className="font-bold text-ink border-b border-border pb-2">{category}</h3>
            <div className="space-y-3">
              {PREFERENCES.filter(p => p.category === category).map(pref => {
                // Recordar: ui_preferences guarda "hide_X" = true. 
                // Así que "isVisible" es !preferences[pref.key]
                const isVisible = preferences[pref.key] !== true;
                
                return (
                  <label key={pref.key} className="flex items-start gap-3 cursor-pointer group">
                    <div className="mt-0.5 relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={isVisible}
                        onChange={() => togglePreference(pref.key)}
                      />
                      <div className="w-5 h-5 rounded-md border-2 border-border bg-card transition-colors peer-checked:bg-teal-600 peer-checked:border-teal-600 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-600/50 group-hover:border-teal-500"></div>
                      <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" strokeWidth={3} />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <p className={`text-sm font-semibold transition-colors ${isVisible ? "text-ink" : "text-ink-soft line-through opacity-70"}`}>
                        {pref.label}
                      </p>
                      <p className="text-xs text-ink-soft leading-relaxed">
                        {pref.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
