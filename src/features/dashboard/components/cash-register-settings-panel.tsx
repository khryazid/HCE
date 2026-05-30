"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Check, Clock, DollarSign, ToggleLeft, ToggleRight } from "lucide-react";

type CashRegisterSettings = {
  auto_open: boolean;
  auto_open_time: string;
  default_initial_amount: number;
};

export function CashRegisterSettingsPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<CashRegisterSettings>({
    auto_open: false,
    auto_open_time: "08:00",
    default_initial_amount: 0,
  });

  const supabase = getSupabaseClient();

  useEffect(() => {
    async function fetchConfig() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("ui_preferences")
        .eq("doctor_id", user.id)
        .maybeSingle();

      if (!error && data?.ui_preferences) {
        const prefs = data.ui_preferences as Record<string, unknown>;
        if (prefs.cash_register_settings) {
          setSettings(prefs.cash_register_settings as CashRegisterSettings);
        }
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

      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("ui_preferences")
        .eq("doctor_id", user.id)
        .single();

      const newPrefs = {
        ...(currentProfile?.ui_preferences as Record<string, unknown> || {}),
        cash_register_settings: settings,
      };

      const { error } = await supabase
        .from("profiles")
        .update({ ui_preferences: newPrefs })
        .eq("doctor_id", user.id);

      if (error) throw error;
      toast.success("Ajustes de caja guardados correctamente");
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
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-center justify-between bg-bg-soft/50 p-4 rounded-xl border border-border/50">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-ink flex items-center gap-1.5 cursor-pointer" onClick={() => setSettings(s => ({ ...s, auto_open: !s.auto_open }))}>
            Apertura Automática / Precargada
          </label>
          <p className="text-xs text-ink-soft">Al activar esto, el turno de caja intentará iniciar solo con estos parámetros predeterminados al entrar al módulo.</p>
        </div>
        <button
          type="button"
          onClick={() => setSettings(s => ({ ...s, auto_open: !s.auto_open }))}
          className={`text-2xl transition-colors ${settings.auto_open ? "text-accent" : "text-ink-soft opacity-50"}`}
        >
          {settings.auto_open ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
        </button>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-300 ${settings.auto_open ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-ink-soft flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Hora de Apertura
          </label>
          <input
            type="time"
            className="w-full bg-bg-soft border border-border px-3 py-2 text-sm rounded-md focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            value={settings.auto_open_time}
            onChange={(e) => setSettings(s => ({ ...s, auto_open_time: e.target.value }))}
            required={settings.auto_open}
          />
          <p className="text-[10px] text-ink-soft mt-1">A partir de esta hora el sistema asume que el turno del día debe iniciar.</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-ink-soft flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Monto Inicial Predeterminado
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft font-bold">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full bg-bg-soft border border-border pl-8 pr-3 py-2 text-sm rounded-md focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-medium"
              value={settings.default_initial_amount}
              onChange={(e) => setSettings(s => ({ ...s, default_initial_amount: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
              required={settings.auto_open}
            />
          </div>
          <p className="text-[10px] text-ink-soft mt-1">Monto de base que siempre se dejará en la caja al iniciar.</p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isSaving}
          className="hce-btn-primary gap-2 h-9"
        >
          {isSaving ? "Guardando..." : <><Check className="h-4 w-4" /> Guardar Ajustes de Caja</>}
        </button>
      </div>
    </form>
  );
}
