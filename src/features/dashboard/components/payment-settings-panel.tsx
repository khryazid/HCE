"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Check, Stethoscope, CreditCard } from "lucide-react";

type PaymentMethod = { name: string; details: string };
type ConsultationType = { name: string; price: number };

export function PaymentSettingsPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>([]);

  const supabase = getSupabaseClient();

  useEffect(() => {
    async function fetchConfig() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("payment_config")
        .eq("doctor_id", user.id)
        .maybeSingle();

      if (!error && data?.payment_config) {
        const conf = data.payment_config as Record<string, unknown>;
        if (conf.methods && Array.isArray(conf.methods)) {
          // Backward compatibility or new format
          setMethods(conf.methods.map((m: unknown) => typeof m === "string" ? { name: m, details: "" } : m as PaymentMethod));
        } else {
          setMethods([{ name: "Efectivo", details: "" }, { name: "Transferencia", details: "" }]);
        }

        if (conf.consultationTypes && Array.isArray(conf.consultationTypes)) {
          setConsultationTypes(conf.consultationTypes.map((c: unknown) => typeof c === "string" ? { name: c, price: 0 } : c as ConsultationType));
        } else {
          setConsultationTypes([{ name: "Consulta General", price: 40 }]);
        }
      } else {
        // Defaults
        setMethods([{ name: "Efectivo", details: "" }, { name: "Transferencia", details: "" }]);
        setConsultationTypes([{ name: "Consulta General", price: 40 }]);
      }
      setIsLoading(false);
    }
    fetchConfig();
  }, [supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const newConfig = {
        methods: methods.filter(m => m.name.trim() !== ""),
        consultationTypes: consultationTypes.filter(c => c.name.trim() !== ""),
      };

      const { error } = await supabase
        .from("profiles")
        .update({ payment_config: newConfig })
        .eq("doctor_id", user.id);

      if (error) throw error;
      toast.success("Ajustes guardados correctamente");
    } catch (error: unknown) {
      toast.error("Error al guardar: " + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-bg-soft rounded-2xl"></div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      
      {/* ── Tipos de Consulta ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <Stethoscope className="h-4 w-4 text-teal-600" />
              Tipos de Consulta
            </h3>
            <p className="text-xs text-ink-soft">Configura tus consultas y su precio base. Se autollenará en tu agenda.</p>
          </div>
          <button
            type="button"
            onClick={() => setConsultationTypes([...consultationTypes, { name: "", price: 0 }])}
            className="hce-btn-secondary text-xs h-8 px-3"
          >
            <Plus className="h-3 w-3 mr-1" /> Agregar Tipo
          </button>
        </div>
        
        <div className="space-y-3">
          {consultationTypes.map((ctype, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-3 bg-bg-soft/50 p-3 rounded-xl border border-border/50">
              <div className="flex-1 w-full sm:w-auto space-y-1">
                <label className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">Nombre del Servicio</label>
                <input
                  type="text"
                  placeholder="Ej: Consulta General"
                  className="hce-input bg-card"
                  value={ctype.name}
                  onChange={(e) => {
                    const copy = [...consultationTypes];
                    copy[i].name = e.target.value;
                    setConsultationTypes(copy);
                  }}
                />
              </div>
              <div className="w-full sm:w-32 space-y-1">
                <label className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">Precio ($)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="hce-input bg-card"
                  value={ctype.price}
                  onChange={(e) => {
                    const copy = [...consultationTypes];
                    copy[i].price = parseFloat(e.target.value) || 0;
                    setConsultationTypes(copy);
                  }}
                />
              </div>
              <div className="flex justify-end sm:mt-6">
                <button
                  type="button"
                  onClick={() => setConsultationTypes(consultationTypes.filter((_, idx) => idx !== i))}
                  className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {consultationTypes.length === 0 && (
            <div className="text-sm text-ink-soft p-4 text-center border border-dashed rounded-xl">No hay tipos de consulta.</div>
          )}
        </div>
      </div>

      {/* ── Medios de Pago ── */}
      <div className="space-y-4 pt-6 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-teal-600" />
              Medios de Pago Permitidos
            </h3>
            <p className="text-xs text-ink-soft">Configura los datos de tus cuentas bancarias o Zelle para tenerlos siempre a mano.</p>
          </div>
          <button
            type="button"
            onClick={() => setMethods([...methods, { name: "", details: "" }])}
            className="hce-btn-secondary text-xs h-8 px-3"
          >
            <Plus className="h-3 w-3 mr-1" /> Agregar Medio
          </button>
        </div>

        <div className="space-y-3">
          {methods.map((method, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-3 bg-bg-soft/50 p-3 rounded-xl border border-border/50">
              <div className="w-full sm:w-1/3 space-y-1">
                <label className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">Método</label>
                <input
                  type="text"
                  placeholder="Ej: Transferencia Banco XYZ"
                  className="hce-input bg-card"
                  value={method.name}
                  onChange={(e) => {
                    const copy = [...methods];
                    copy[i].name = e.target.value;
                    setMethods(copy);
                  }}
                />
              </div>
              <div className="w-full sm:flex-1 space-y-1">
                <label className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">Datos / Instrucciones (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Cta Ahorros 123456789 - Juan Perez"
                  className="hce-input bg-card"
                  value={method.details}
                  onChange={(e) => {
                    const copy = [...methods];
                    copy[i].details = e.target.value;
                    setMethods(copy);
                  }}
                />
              </div>
              <div className="flex justify-end sm:mt-6">
                <button
                  type="button"
                  onClick={() => setMethods(methods.filter((_, idx) => idx !== i))}
                  className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {methods.length === 0 && (
            <div className="text-sm text-ink-soft p-4 text-center border border-dashed rounded-xl">No hay medios de pago configurados.</div>
          )}
        </div>
      </div>

      <div className="flex justify-end border-t border-border/50 pt-6 mt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="hce-btn-primary gap-2"
        >
          {isSaving ? "Guardando..." : <><Check className="h-4 w-4" /> Guardar Ajustes</>}
        </button>
      </div>
    </form>
  );
}
