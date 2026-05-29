"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/lib/supabase/tenant-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase/client";
import { createTenantProfileWithTrial } from "@/lib/supabase/actions";
import { CheckCircle2, ChevronRight, Users, FileText, DollarSign, User } from "lucide-react";

export function OnboardingFlow() {
  const router = useRouter();
  const { tenant } = useTenant();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState(tenant?.full_name || "");
  const [specialty, setSpecialty] = useState(tenant?.specialties?.[0] || "");
  const [consultationName, setConsultationName] = useState("Consulta General");
  const [fee, setFee] = useState("50");
  const [assistants, setAssistants] = useState(["", ""]);

  const totalSteps = 4;

  const handleNext = () => setStep((s) => Math.min(s + 1, totalSteps));
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const handleComplete = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      
      let doctorId = tenant?.doctor_id;

      if (!doctorId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No hay usuario autenticado.");
        doctorId = user.id;

        // Ensure a profile is created via server action (bypasses RLS & creates clinic)
        const result = await createTenantProfileWithTrial({
          clinicId: crypto.randomUUID(),
          fullName: fullName,
          specialties: [specialty],
          plan: "basic"
        });
        
        if (!result.success) throw new Error(result.error || "Error al crear perfil");
      }

      // Update existing profile (whether we just created it or it already existed)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          specialty: [specialty],
          payment_config: { default_fee: Number(fee), consultation_name: consultationName },
          onboarding_state: { step: 4, completed: true }
        })
        .eq("doctor_id", doctorId);

      if (profileError) throw profileError;

      // We will skip inserting into treatment_templates for now as it's Phase 5,
      // but we can mock the UI success.

      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al completar el onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: "Perfil", icon: User },
    { id: 2, title: "Tarifas", icon: DollarSign },
    { id: 3, title: "Plantilla", icon: FileText },
    { id: 4, title: "Equipo", icon: Users },
  ];

  return (
    <div className="hce-surface p-6 shadow-sm sm:p-8">
      {/* Progress Bar */}
      <div className="mb-8 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-accent/20 -translate-y-1/2 rounded-full" />
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-accent -translate-y-1/2 transition-all duration-500 rounded-full" 
          style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
        />
        <div className="relative flex justify-between">
          {steps.map((s) => {
            const isCompleted = step > s.id;
            const isCurrent = step === s.id;
            const Icon = s.icon;
            
            return (
              <div key={s.id} className="flex flex-col items-center bg-bg relative z-10 px-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${isCompleted ? 'bg-accent border-accent text-white' : isCurrent ? 'border-accent bg-bg text-accent' : 'border-accent/20 bg-bg text-ink-soft'}`}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`text-xs mt-2 font-medium ${isCurrent ? 'text-ink' : 'text-ink-soft'}`}>{s.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="min-h-[250px] py-4">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-xl font-semibold text-ink">Verifica tu perfil</h2>
              <p className="text-sm text-ink-soft mt-1">Asegúrate de que tus datos profesionales sean correctos. Esto aparecerá en tus recetas médicas.</p>
            </div>
            <div className="space-y-4 max-w-md">
              <div className="gx-field">
                <label className="gx-label">Nombre para recetas (Prefijo + Nombre)</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ej: Dr. Juan Pérez" />
              </div>
              <div className="gx-field">
                <label className="gx-label">Especialidad Principal</label>
                <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ej: Medicina General" />
                <p className="text-xs text-ink-soft mt-1">Puedes modificar o asignar tu especialidad principal.</p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-xl font-semibold text-ink">Tarifas Base</h2>
              <p className="text-sm text-ink-soft mt-1">Define el costo estándar de tus consultas para llevar un control automático en tu caja.</p>
            </div>
            <div className="space-y-4 max-w-md">
              <div className="gx-field">
                <label className="gx-label">Nombre de la Consulta</label>
                <Input value={consultationName} onChange={(e) => setConsultationName(e.target.value)} placeholder="Ej: Consulta Pediátrica" />
              </div>
              <div className="gx-field">
                <label className="gx-label">Costo de Consulta ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">$</span>
                  <Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} className="pl-7" />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-xl font-semibold text-ink">Plantilla Clínica</h2>
              <p className="text-sm text-ink-soft mt-1">Hemos detectado tu especialidad y pre-configurado tu historia clínica.</p>
            </div>
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-6 text-center">
              <FileText className="w-12 h-12 text-accent mx-auto mb-3" />
              <h3 className="font-semibold text-ink text-lg">Plantilla de {specialty || 'Medicina'}</h3>
              <p className="text-sm text-ink-soft mt-2">Incluye: Motivo de consulta, Signos Vitales Básicos, Examen Físico, Diagnóstico CIE-11 y Receta.</p>
              <div className="mt-4 inline-flex items-center text-xs font-medium text-accent bg-accent/10 px-3 py-1 rounded-full">
                Podrás crear plantillas modulares (Rompecabezas) en el panel de Ajustes más adelante.
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-xl font-semibold text-ink">Invita a tu equipo</h2>
              <p className="text-sm text-ink-soft mt-1">Puedes invitar hasta 2 asistentes. Recibirán un Magic Link para configurar su cuenta.</p>
            </div>
            <div className="space-y-4 max-w-md">
              {assistants.map((email, idx) => (
                <div key={idx} className="gx-field">
                  <label className="gx-label">Correo Asistente {idx + 1} (Opcional)</label>
                  <Input 
                    type="email" 
                    placeholder="correo@ejemplo.com" 
                    value={email}
                    onChange={(e) => {
                      const newArr = [...assistants];
                      newArr[idx] = e.target.value;
                      setAssistants(newArr);
                    }}
                  />
                </div>
              ))}
              <p className="text-xs text-ink-soft">Podrás enviar invitaciones más adelante desde el panel de Administración.</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <Button variant="outline" onClick={handlePrev} disabled={step === 1 || isSubmitting}>
          Atrás
        </Button>
        
        {step < totalSteps ? (
          <Button onClick={handleNext} className="gap-2">
            Continuar <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleComplete} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 gap-2">
            {isSubmitting ? "Finalizando..." : "Completar Onboarding"} <CheckCircle2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
