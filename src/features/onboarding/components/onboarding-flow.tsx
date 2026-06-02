"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/lib/supabase/tenant-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase/client";
import { createTenantProfileWithTrial } from "@/lib/supabase/actions";
import { CheckCircle2, ChevronRight, DollarSign, User, Upload, X, FileText, Users } from "lucide-react";
import { MEDICAL_SPECIALTIES } from "@/lib/constants/medical-specialties";

export function OnboardingFlow() {
  const router = useRouter();
  const { tenant } = useTenant();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Perfil (Identidad, Contacto, PDF)
  const [fullName, setFullName] = useState(tenant?.full_name || "");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [professionalTitle, setProfessionalTitle] = useState("Dr. / Dra.");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [experienceYears, setExperienceYears] = useState("0");
  const [signatureName, setSignatureName] = useState("");
  const [mainPhone, setMainPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [publicEmail, setPublicEmail] = useState("");
  const [address, setAddress] = useState("");
  const [pdfSpecialtyInput, setPdfSpecialtyInput] = useState("");
  const [isSpecialtyDropdownOpen, setIsSpecialtyDropdownOpen] = useState(false);
  const filteredSpecialties = MEDICAL_SPECIALTIES.filter((entry) =>
    entry.toLowerCase().includes(pdfSpecialtyInput.trim().toLowerCase())
  );

  // Step 2: Métodos de Cobro
  const [consultationTypes, setConsultationTypes] = useState([{ name: "Consulta General", price: 50, duration: 60 }]);
  const [paymentMethods, setPaymentMethods] = useState([
    { name: "Efectivo", details: "" },
    { name: "Transferencia", details: "" }
  ]);

  // Step 3: Plantillas
  const [templateSections, setTemplateSections] = useState({
    vital_signs: true,
    family_history: false,
    personal_history: false,
    habits: false,
    female_history: false,
    pediatric_history: false,
    review_of_systems: false,
    physical_exam: true,
    diagnosis: true,
    treatment_plan: true,
    medical_orders: true,
    paraclinicals: false
  });

  // Step 4: Equipo
  const [assistants, setAssistants] = useState(["", ""]);

  // Sync state when tenant profile loads or fallback to user_metadata
  useEffect(() => {
    async function loadDefaults() {
      if (tenant) {
        setFullName(prev => prev || tenant.full_name || "");
        if (tenant.specialties && tenant.specialties.length > 0) {
          setSpecialties(tenant.specialties);
        }
      } else {
        // Fallback to auth metadata if profile hasn't been created yet
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata) {
          setFullName(prev => prev || user.user_metadata.full_name || "");
          const metaSpecialties = user.user_metadata.specialties;
          if (Array.isArray(metaSpecialties) && metaSpecialties.length > 0) {
            setSpecialties(metaSpecialties);
          }
        }
      }
    }
    loadDefaults();
  }, [tenant]);

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

        const plan = user.user_metadata?.plan || "basic";
        const clinicName = user.user_metadata?.clinic_name || undefined;
        const metaClinicId = user.user_metadata?.clinic_id;
        const finalClinicId = typeof metaClinicId === "string" && metaClinicId.length > 0 ? metaClinicId : crypto.randomUUID();

        // Ensure a profile is created via server action (bypasses RLS & creates clinic)
        const result = await createTenantProfileWithTrial({
          clinicId: finalClinicId,
          fullName: fullName,
          clinicName: clinicName,
          specialties: specialties.length > 0 ? specialties : ["Medicina General"],
          plan: plan
        });
        
        if (!result.success) throw new Error(result.error || "Error al crear perfil");
      }

      const ui_preferences = {
        professional_title: professionalTitle,
        license_number: licenseNumber,
        experience_years: experienceYears,
        signature_name: signatureName,
        main_phone: mainPhone,
        secondary_phone: secondaryPhone,
        public_email: publicEmail,
        address: address,
        pdf_specialties: specialties,
        // Almacenamos qué secciones NO quieren ver
        hide_vital_signs: !templateSections.vital_signs,
        hide_family_history: !templateSections.family_history,
        hide_personal_history: !templateSections.personal_history,
        hide_habits: !templateSections.habits,
        hide_female_history: !templateSections.female_history,
        hide_pediatric_history: !templateSections.pediatric_history,
        hide_review_of_systems: !templateSections.review_of_systems,
        hide_physical_exam: !templateSections.physical_exam,
        hide_diagnosis: !templateSections.diagnosis,
        hide_treatment_plan: !templateSections.treatment_plan,
        hide_medical_orders: !templateSections.medical_orders,
        hide_paraclinicals: !templateSections.paraclinicals,
      };

      // Update existing profile (whether we just created it or it already existed)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          specialty: specialties,
          ui_preferences,
          payment_config: { 
            consultationTypes, 
            methods: paymentMethods
          },
          onboarding_state: { step: 4, completed: true }
        })
        .eq("doctor_id", doctorId);

      if (profileError) {
        console.error("Profile update error:", profileError);
        throw new Error(profileError.message || "Error al actualizar el perfil.");
      }

      // Sync legacy metadata and letterhead so settings page works correctly
      try {
        const { saveOnboardingProfile } = await import("@/lib/supabase/onboarding");
        await saveOnboardingProfile({
          professional_title: professionalTitle,
          license_number: licenseNumber,
          years_experience: Number(experienceYears) || 0,
          primary_phone: mainPhone,
          secondary_phone: secondaryPhone,
          professional_address: address,
          public_contact_email: publicEmail,
          signature_name: signatureName,
        });

        const clinicId = tenant?.clinic_id || (await supabase.auth.getUser()).data.user?.user_metadata?.clinic_id;
        if (clinicId && doctorId) {
          const { saveLetterheadSettings } = await import("@/features/dashboard/lib/letterhead");
          await saveLetterheadSettings(doctorId, clinicId, {
            doctor_name: signatureName,
            professional_title: professionalTitle,
            specialties: specialties.join(", "),
            address: address,
            phone_primary: mainPhone,
            phone_secondary: secondaryPhone,
            contact_email: publicEmail,
            logo_data_url: "",
            signature_data_url: "",
          });
        }
      } catch (syncError) {
        console.warn("Could not sync metadata/letterhead:", syncError);
      }

      // Hard redirect to force a full reload of the TenantContext and DB hooks
      window.location.href = "/dashboard";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al completar el onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: "Perfil", icon: User },
    { id: 2, title: "Cobro", icon: DollarSign },
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
              <div key={s.id} className="flex flex-col items-center bg-card relative z-10 px-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${isCompleted ? 'bg-accent border-accent text-white' : isCurrent ? 'border-accent bg-card text-accent' : 'border-accent/20 bg-card text-ink-soft'}`}>
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
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 max-w-4xl">
            <div>
              <h2 className="text-xl font-bold text-ink">Tu Perfil Profesional</h2>
              <p className="text-sm text-ink-soft mt-1">Estos datos aparecerán en los PDFs de tus historias clínicas y recetas.</p>
            </div>
            
            <div className="space-y-6">
              {/* Identidad Profesional */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="bg-bg-soft px-4 py-3 border-b border-border">
                  <h3 className="font-semibold text-sm text-ink">Identidad Profesional</h3>
                </div>
                <div className="p-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink-soft">Título profesional</label>
                    <select
                      value={professionalTitle}
                      onChange={(e) => setProfessionalTitle(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm text-ink"
                    >
                      <option value="Dr.">Dr. (Doctor)</option>
                      <option value="Dra.">Dra. (Doctora)</option>
                      <option value="Lic.">Lic. (Licenciado/a)</option>
                      <option value="Mgtr.">Mgtr. (Magíster)</option>
                      <option value="Ph.D.">Ph.D. (Doctorado)</option>
                      <option value="">Sin título</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink-soft">Número de licencia profesional</label>
                    <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="Ej: 123456" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink-soft">Años de experiencia</label>
                    <Input type="number" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink-soft">Nombre para firma y membrete</label>
                    <Input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder={fullName || "Ej: Dr. Juan Pérez"} />
                  </div>
                </div>
              </div>

              {/* Contacto y Ubicación */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="bg-bg-soft px-4 py-3 border-b border-border">
                  <h3 className="font-semibold text-sm text-ink">Contacto y Ubicación</h3>
                </div>
                <div className="p-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink-soft">Teléfono principal</label>
                    <Input value={mainPhone} onChange={(e) => setMainPhone(e.target.value)} placeholder="+1 234 567 890" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink-soft">Teléfono secundario (opcional)</label>
                    <Input value={secondaryPhone} onChange={(e) => setSecondaryPhone(e.target.value)} placeholder="" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink-soft">Correo público de contacto (opcional)</label>
                    <Input value={publicEmail} onChange={(e) => setPublicEmail(e.target.value)} placeholder="dr.juan@email.com" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink-soft">Dirección profesional</label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ej: Clínica Centro, Consultorio 10" />
                  </div>
                </div>
              </div>

              {/* Configuración PDF */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="bg-bg-soft px-4 py-3 border-b border-border">
                  <h3 className="font-semibold text-sm text-ink">Configuración de Documentos (PDF)</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-ink-soft">Especialidades para membrete PDF</label>
                    <div className="relative">
                      <div
                        className="flex h-auto w-full flex-wrap items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm min-h-[40px] cursor-text focus-within:ring-1 focus-within:ring-ring"
                        onClick={() => setIsSpecialtyDropdownOpen(true)}
                      >
                        {specialties.map((spec, i) => (
                          <div key={i} className="flex items-center gap-1 bg-accent/10 text-accent px-2 py-1 rounded-md text-xs font-medium">
                            {spec}
                            <button 
                              type="button" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSpecialties(specialties.filter((_, idx) => idx !== i));
                              }} 
                              className="hover:bg-accent/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <input
                          type="text"
                          value={pdfSpecialtyInput}
                          onChange={(e) => {
                            setPdfSpecialtyInput(e.target.value);
                            setIsSpecialtyDropdownOpen(true);
                          }}
                          onFocus={() => setIsSpecialtyDropdownOpen(true)}
                          placeholder={specialties.length === 0 ? "Buscar y seleccionar..." : ""}
                          className="flex-1 bg-transparent px-1 py-0 outline-none placeholder:text-muted-foreground min-w-[120px] text-sm text-ink"
                        />
                      </div>
                      
                      {isSpecialtyDropdownOpen && (
                        <div className="absolute top-full left-0 w-full z-10 mt-1 max-h-[220px] overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg">
                          {filteredSpecialties.filter((s) => !specialties.includes(s)).length > 0 ? (
                            <ul role="listbox" className="flex flex-col gap-0.5">
                              {filteredSpecialties
                                .filter((s) => !specialties.includes(s))
                                .map((entry) => (
                                  <li key={entry}>
                                    <button
                                      type="button"
                                      role="option"
                                      aria-selected={false}
                                      onClick={() => {
                                        setSpecialties([...specialties, entry]);
                                        setPdfSpecialtyInput("");
                                        setIsSpecialtyDropdownOpen(false);
                                      }}
                                      className="flex w-full cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm text-ink hover:bg-bg-soft"
                                    >
                                      {entry}
                                    </button>
                                  </li>
                                ))}
                            </ul>
                          ) : (
                            <div className="px-3 py-2 text-sm text-ink-soft">
                              {pdfSpecialtyInput ? "No se encontraron coincidencias" : "Todas las opciones seleccionadas"}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 mt-4">
                    <div className="border border-dashed border-border rounded-lg p-4 bg-bg-soft/50 space-y-2">
                      <p className="text-xs font-semibold text-ink">Logo profesional para PDF</p>
                      <p className="text-[10px] text-ink-soft">Se guarda en este navegador, sin enviarse a Supabase.</p>
                      <label className="cursor-pointer flex items-center justify-center gap-2 border border-border bg-card rounded-md p-2 text-xs font-medium text-ink-soft hover:bg-bg-soft transition-colors mt-2">
                        <Upload className="h-3 w-3" /> Subir Logo
                        <input type="file" className="hidden" accept="image/*" />
                      </label>
                    </div>
                    <div className="border border-dashed border-border rounded-lg p-4 bg-bg-soft/50 space-y-2">
                      <p className="text-xs font-semibold text-ink">Firma profesional para PDF</p>
                      <p className="text-[10px] text-ink-soft">Dibuja tu firma en papel blanco, tómale foto y súbela.</p>
                      <label className="cursor-pointer flex items-center justify-center gap-2 border border-border bg-card rounded-md p-2 text-xs font-medium text-ink-soft hover:bg-bg-soft transition-colors mt-2">
                        <Upload className="h-3 w-3" /> Subir Firma
                        <input type="file" className="hidden" accept="image/*" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 max-w-4xl">
            <div>
              <h2 className="text-xl font-bold text-ink">Métodos de Cobro</h2>
              <p className="text-sm text-ink-soft mt-1">Configura tus servicios, datos bancarios y Zelle para recibir pagos.</p>
            </div>
            
            <div className="space-y-6">
              {/* Tipos de Consulta */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="bg-bg-soft px-4 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-accent" />
                    <h3 className="font-semibold text-sm text-ink">Tipos de Consulta</h3>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs bg-card"
                    onClick={() => setConsultationTypes([...consultationTypes, { name: "", price: 0, duration: 60 }])}
                  >
                    + Agregar Tipo
                  </Button>
                </div>
                <div className="p-4 space-y-3">
                  {consultationTypes.map((ctype, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-end gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">Nombre del Servicio</label>
                        <Input 
                          value={ctype.name} 
                          onChange={(e) => {
                            const copy = [...consultationTypes];
                            copy[i].name = e.target.value;
                            setConsultationTypes(copy);
                          }} 
                          placeholder="Ej: Consulta General" 
                        />
                      </div>
                      <div className="w-full sm:w-28 space-y-1.5">
                        <label className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">Precio ($)</label>
                        <Input 
                          type="number" 
                          value={ctype.price} 
                          onChange={(e) => {
                            const copy = [...consultationTypes];
                            copy[i].price = parseFloat(e.target.value) || 0;
                            setConsultationTypes(copy);
                          }} 
                        />
                      </div>
                      <div className="w-full sm:w-28 space-y-1.5">
                        <label className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">Duración (Min)</label>
                        <Input 
                          type="number" 
                          value={ctype.duration} 
                          onChange={(e) => {
                            const copy = [...consultationTypes];
                            copy[i].duration = parseInt(e.target.value) || 0;
                            setConsultationTypes(copy);
                          }} 
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        className="text-red-500 hover:bg-red-50 p-0 h-9 w-9 shrink-0 sm:mb-0 mb-2"
                        onClick={() => setConsultationTypes(consultationTypes.filter((_, idx) => idx !== i))}
                        disabled={consultationTypes.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Medios de Pago Permitidos */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="bg-bg-soft px-4 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    <h3 className="font-semibold text-sm text-ink">Medios de Pago Permitidos</h3>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs bg-card"
                    onClick={() => setPaymentMethods([...paymentMethods, { name: "", details: "" }])}
                  >
                    + Agregar Medio
                  </Button>
                </div>
                <div className="p-4 space-y-3">
                  {paymentMethods.map((method, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-end gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                      <div className="w-full sm:w-1/3 space-y-1.5">
                        <label className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">Método</label>
                        <Input 
                          value={method.name} 
                          onChange={(e) => {
                            const copy = [...paymentMethods];
                            copy[i].name = e.target.value;
                            setPaymentMethods(copy);
                          }} 
                          placeholder="Ej: Zelle" 
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">Datos / Instrucciones (Opcional)</label>
                        <Input 
                          value={method.details} 
                          onChange={(e) => {
                            const copy = [...paymentMethods];
                            copy[i].details = e.target.value;
                            setPaymentMethods(copy);
                          }} 
                          placeholder="Ej: dr.juan@email.com - Juan Pérez" 
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        className="text-red-500 hover:bg-red-50 p-0 h-9 w-9 shrink-0 sm:mb-0 mb-2"
                        onClick={() => setPaymentMethods(paymentMethods.filter((_, idx) => idx !== i))}
                        disabled={paymentMethods.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 max-w-4xl">
            <div>
              <h2 className="text-xl font-bold text-ink">Plantilla de Historia Clínica</h2>
              <p className="text-sm text-ink-soft mt-1">Selecciona qué bloques deseas que aparezcan por defecto cuando atiendas a un paciente.</p>
            </div>
            
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="bg-bg-soft px-4 py-3 border-b border-border">
                <h3 className="font-semibold text-sm text-ink">Secciones Visibles</h3>
              </div>
              <div className="p-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {Object.entries({
                  vital_signs: "Signos Vitales",
                  physical_exam: "Examen Físico",
                  diagnosis: "Diagnóstico",
                  treatment_plan: "Plan de Tratamiento",
                  medical_orders: "Órdenes Médicas",
                  paraclinicals: "Paraclínicos",
                  family_history: "Antecedentes Familiares",
                  personal_history: "Antecedentes Personales",
                  habits: "Hábitos",
                  female_history: "Antecedentes Ginecológicos",
                  pediatric_history: "Antecedentes Pediátricos",
                  review_of_systems: "Revisión por Sistemas",
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer p-3 border border-border rounded-lg hover:bg-bg-soft transition-colors">
                    <input
                      type="checkbox"
                      checked={templateSections[key as keyof typeof templateSections]}
                      onChange={(e) => setTemplateSections({ ...templateSections, [key]: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                    />
                    <span className="text-sm font-medium text-ink">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <p className="text-xs text-ink-soft bg-accent/10 text-accent px-3 py-1 rounded-full font-medium inline-block">
                Podrás cambiar esto y crear múltiples plantillas más adelante.
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 max-w-4xl">
            <div>
              <h2 className="text-xl font-bold text-ink">Invita a tu equipo</h2>
              <p className="text-sm text-ink-soft mt-1">Puedes invitar hasta 2 asistentes. Recibirán un Magic Link para configurar su cuenta (Opcional).</p>
            </div>
            <div className="space-y-4 max-w-md">
              {assistants.map((email, idx) => (
                <div key={idx} className="gx-field">
                  <label className="gx-label">Correo Asistente {idx + 1}</label>
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
