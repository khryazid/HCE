"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  bootstrapTenantProfileFromMetadata,
  createClinicId,
} from "@/lib/supabase/profile";
import { createTenantProfileWithTrial } from "@/lib/supabase/actions";
import { MEDICAL_SPECIALTIES } from "@/lib/constants/medical-specialties";
import { APP_NAME } from "@/lib/constants/app";
import { getDashboardForRole } from "@/lib/guards/route-guard";
import type { OrgRole } from "@/lib/supabase/profile";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
};

const loginSchema = z.object({
  email: z.string().min(1, "El correo es obligatorio.").email("Ingresa un correo valido."),
  password: z.string().min(1, "La contraseña es obligatoria."),
  fullName: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  plan: z.enum(["basic", "clinic"]).optional(),
  clinicName: z.string().optional(),
  termsAccepted: z.boolean().optional(),
});

const registerSchema = loginSchema.extend({
  fullName: z.string().min(1, "El nombre completo es obligatorio."),
  specialties: z.array(z.string()).optional(),
  password: z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula.")
    .regex(/[0-9]/, "Debe contener al menos un número.")
    .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial."),
  confirmPassword: z.string().min(1, "Confirma tu contraseña."),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Debes aceptar los Términos y Condiciones.",
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
}).refine(data => {
  if (data.plan === "clinic" && (!data.clinicName || data.clinicName.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "El nombre de la clínica es obligatorio para el plan Clínica.",
  path: ["clinicName"],
}).refine(data => {
  if (data.plan === "basic" && (!data.specialties || data.specialties.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Selecciona al menos una especialidad.",
  path: ["specialties"],
});

type AuthFormData = z.infer<typeof registerSchema>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string) {
  return UUID_PATTERN.test(value.trim());
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSignUp = mode === "register";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormData>({
    resolver: zodResolver(isSignUp ? registerSchema : loginSchema) as any,
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      clinicName: "",
      specialties: [],
      plan: "basic",
      termsAccepted: false,
    },
  });

  const [clinicId, setClinicId] = useState(() => createClinicId());
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpecialtyDropdownOpen, setIsSpecialtyDropdownOpen] = useState(false);
  const [isUnverified, setIsUnverified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const dropdownRef = useRef<HTMLFieldSetElement>(null);

  const watchSpecialties = watch("specialties") || [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSpecialtyDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mode !== "login") return;

    const registered = searchParams.get("registered");
    if (registered !== "1") return;

    const registeredEmail = searchParams.get("email");
    if (registeredEmail) {
      setValue("email", registeredEmail);
    }

    setMessage(
      "Cuenta creada. Si no puedes iniciar de inmediato, revisa tu correo (bandeja de entrada y spam) para confirmar la cuenta."
    );
  }, [mode, searchParams, setValue]);

  useEffect(() => {
    let urlError = searchParams.get("error_description") || searchParams.get("error");
    
    if (!urlError && typeof window !== "undefined" && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      urlError = hashParams.get("error_description") || hashParams.get("error");
    }

    if (urlError) {
      let errorMsg = decodeURIComponent(urlError).replace(/\+/g, " ");
      if (errorMsg.includes("Email link is invalid or has expired") || errorMsg.includes("access_denied")) {
        errorMsg = "El enlace de confirmación ha expirado o ya fue utilizado. Si tu cuenta no está verificada, inicia sesión y haz clic en 'Reenviar confirmación'.";
      }
      setError(errorMsg);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }
  }, [searchParams]);

  const filteredSpecialties = MEDICAL_SPECIALTIES.filter((entry) =>
    entry.toLowerCase().includes(specialtySearch.trim().toLowerCase())
  );

  function toggleSpecialty(entry: string) {
    const current = watchSpecialties;
    if (current.includes(entry)) {
      setValue("specialties", current.filter((item) => item !== entry), { shouldValidate: true });
    } else {
      setValue("specialties", [...current, entry], { shouldValidate: true });
    }
  }

  async function onSubmit(data: AuthFormData) {
    setMessage(null);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const normalizedClinicId = isValidUuid(clinicId) ? clinicId.trim() : createClinicId();

      if (normalizedClinicId !== clinicId) {
        setClinicId(normalizedClinicId);
      }

      const action = isSignUp
        ? await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              emailRedirectTo: `${window.location.origin}/api/auth/callback`,
              data: {
                full_name: data.fullName?.trim(),
                specialties: data.specialties,
                clinic_id: normalizedClinicId,
                clinic_name: data.clinicName?.trim(),
                plan: data.plan,
                terms_accepted: true,
              },
            },
          })
        : await supabase.auth.signInWithPassword({ email: data.email, password: data.password });

      if (action.error) {
        if (action.error.message.includes("unexpected response")) {
          // Clear broken session just in case
          await supabase.auth.signOut();
          throw new Error("El servidor bloqueó la solicitud por seguridad (posiblemente excediste el límite de intentos). Por favor, intenta de nuevo en un par de minutos.");
        }
        throw action.error;
      }

      if (isSignUp) {
        if (action.data.user && action.data.session) {
          // A-02: Use Server Action with service_role — prevents client-side trial manipulation.
          const result = await createTenantProfileWithTrial({
            clinicId: normalizedClinicId,
            fullName: data.fullName?.trim() || "",
            clinicName: data.clinicName?.trim(),
            specialties: data.specialties || [],
            plan: data.plan as "basic" | "clinic",
          });
          if (!result.success) {
            setError(result.error);
            return;
          }
          if (result.isPlatformAdmin) {
            router.replace("/platform/panel");
          } else {
            router.replace("/dashboard"); // owner role default
          }
          return;
        }

        setMessage(
          "Cuenta creada. Revisa tu correo (bandeja de entrada y spam) para confirmar la cuenta y luego inicia sesion. El perfil tenant se completara automaticamente con los datos registrados."
        );
        const nextEmail = encodeURIComponent(data.email.trim());
        router.replace(`/login?registered=1&email=${nextEmail}`);
        return;
      } else {
        if (action.data.user) {
          // 1. Check if platform admin first
          const { data: profileData } = await supabase
            .from("profiles")
            .select("is_platform_admin")
            .eq("doctor_id", action.data.user.id)
            .maybeSingle();

          if (profileData?.is_platform_admin) {
            router.replace("/platform/panel");
            return;
          }

          // 2. Normal role-based redirect after login
          const profile = await bootstrapTenantProfileFromMetadata(
            action.data.user.id,
            action.data.user.user_metadata
          );
          const role = (profile?.role || "owner") as OrgRole;
          const dashboard = getDashboardForRole(role);
          router.replace(dashboard);
        } else {
          router.replace("/dashboard");
        }
      }
    } catch (authError) {
      if (authError instanceof Error && authError.message.toLowerCase().includes("email not confirmed")) {
        setIsUnverified(true);
        setError(null);
        return;
      }
      setError(
        authError instanceof Error
          ? authError.message
          : "No se pudo completar la autenticacion. Verifica tus credenciales e intenta de nuevo."
      );
    }
  }

  async function handleResendVerification() {
    setResendLoading(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = getSupabaseClient();
      const email = watch("email");
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: window.location.origin + "/dashboard",
        },
      });
      if (error) throw error;
      setMessage("Se ha reenviado el enlace de confirmación a tu correo. Por favor, revisa tu bandeja de entrada y spam.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al reenviar el correo.");
    } finally {
      setResendLoading(false);
    }
  }

  if (isUnverified) {
    return (
      <div className="text-center space-y-5 animate-in fade-in duration-300">
        <div className="mx-auto w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-ink tracking-tight">Verifica tu correo</h3>
          <p className="text-sm text-ink-soft mt-2 leading-relaxed">
            Por motivos de seguridad y cumplimiento normativo, debes confirmar que eres el dueño de <strong className="text-ink font-semibold">{watch("email")}</strong> antes de acceder al entorno clínico.
          </p>
        </div>

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 text-left">
            {message}
          </div>
        )}
        
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 text-left">
            {error}
          </div>
        )}

        <div className="pt-2 flex flex-col gap-3">
          <Button onClick={handleResendVerification} disabled={resendLoading} className="w-full min-h-[44px]">
            {resendLoading ? "Enviando enlace..." : "Reenviar enlace de confirmación"}
          </Button>
          <button 
            type="button" 
            onClick={() => { setIsUnverified(false); setMessage(null); setError(null); }}
            className="text-sm text-ink-soft hover:text-ink font-medium h-10 transition-colors"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div aria-label={isSignUp ? "Formulario de registro" : "Formulario de inicio de sesión"}>

      <form onSubmit={handleSubmit(onSubmit)}>
        {isSignUp && (
          <>
            <fieldset className="gx-field" style={{marginBottom: 24}}>
              <legend className="gx-label" style={{marginBottom: 8}}>Selecciona tu Plan</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className="relative flex cursor-pointer rounded-xl border p-4 transition-colors focus:outline-none"
                  style={{
                    borderColor: watch("plan") === "basic" ? "var(--accent)" : "var(--border)",
                    background: watch("plan") === "basic" ? "var(--accent-dim)" : "var(--bg)",
                  }}
                >
                  <input type="radio" value="basic" {...register("plan")} className="sr-only" />
                  <div className="flex w-full flex-col">
                    <span className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">Individual</span>
                    </span>
                    <span className="mt-1 flex items-center text-xs text-ink-soft">
                      Hasta 2 Asistentes.
                    </span>
                  </div>
                </label>
                <label
                  className="relative flex cursor-pointer rounded-xl border p-4 transition-colors focus:outline-none"
                  style={{
                    borderColor: watch("plan") === "clinic" ? "var(--accent)" : "var(--border)",
                    background: watch("plan") === "clinic" ? "var(--accent-dim)" : "var(--bg)",
                  }}
                >
                  <input type="radio" value="clinic" {...register("plan")} className="sr-only" />
                  <div className="flex w-full flex-col">
                    <span className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">Clínica</span>
                    </span>
                    <span className="mt-1 flex items-center text-xs text-ink-soft">
                      Múltiples Doctores.
                    </span>
                  </div>
                </label>
              </div>
            </fieldset>

            {watch("plan") === "clinic" && (
              <fieldset className="gx-field" style={{marginBottom: 24}}>
                <legend className="gx-label" style={{marginBottom: 8}}>Nombre de la Clínica</legend>
                <Input
                  {...register("clinicName")}
                  placeholder="Ej. Centro Médico San Juan"
                  aria-invalid={!!errors.clinicName}
                  aria-describedby="field-error-clinicName"
                  className="gx-input"
                  autoComplete="off"
                />
                {errors.clinicName ? (
                  <p id="field-error-clinicName" className="text-xs text-red-700" role="alert" style={{marginTop: 8}}>
                    {errors.clinicName.message}
                  </p>
                ) : null}
              </fieldset>
            )}

            <p style={{fontSize: "0.8125rem", color: "var(--ink-soft)", background: "var(--bg-soft)", padding: "8px 12px", borderRadius: 8, marginBottom: 24}}>
              {watch("plan") === "clinic" ? "Tu espacio de clínica será creado con el nombre que elijas." : "El espacio de clínica se crea automáticamente para ti durante el registro."}
            </p>
          </>
        )}

        <div className="gx-field">
          <label className="gx-label" htmlFor="email-field">Correo Electrónico</label>
          <Input
            id="email-field"
            type="email"
            autoComplete="email"
            placeholder="tu-correo@empresa.com"
            {...register("email")}
            aria-invalid={errors.email ? "true" : undefined}
            aria-describedby={errors.email ? "field-error-email" : undefined}
            className="gx-input"
          />
          {errors.email ? (
            <p id="field-error-email" className="text-xs text-red-700" role="alert">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        {isSignUp ? (
          <>
            <div className="gx-field">
              <label className="gx-label">Nombre completo</label>
              <Input
                type="text"
                autoComplete="name"
                placeholder="Nombre y apellido"
                {...register("fullName")}
                aria-invalid={errors.fullName ? "true" : undefined}
                aria-describedby={errors.fullName ? "field-error-fullname" : undefined}
              />
              {errors.fullName ? (
                <p id="field-error-fullname" className="text-xs text-red-700" role="alert">
                  {errors.fullName.message}
                </p>
              ) : null}
            </div>

            {watch("plan") !== "clinic" && (
              <fieldset
                aria-describedby={errors.specialties ? "field-error-specialties" : undefined}
                className="gx-field relative"
                ref={dropdownRef}
              >
                <legend className="gx-label" style={{marginBottom: 8}}>Especialidades</legend>

                <div
                  className="gx-input"
                  style={{display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "8px 12px", minHeight: 44, cursor: "text"}}
                  onClick={() => setIsSpecialtyDropdownOpen(true)}
                >
                  {watchSpecialties.map((entry) => (
                    <span
                      key={`selected-${entry}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent"
                    >
                      {entry}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSpecialty(entry);
                        }}
                        className="rounded-full p-0.5 hover:bg-accent/20 focus:outline-none transition-colors"
                        aria-label={`Quitar ${entry}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={specialtySearch}
                    onChange={(event) => {
                      setSpecialtySearch(event.target.value);
                      setIsSpecialtyDropdownOpen(true);
                    }}
                    onFocus={() => setIsSpecialtyDropdownOpen(true)}
                    placeholder={watchSpecialties.length === 0 ? "Buscar y seleccionar..." : ""}
                    className="flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-ink-soft/70 min-w-[120px]"
                    style={{border: "none", outline: "none", background: "transparent"}}
                    aria-label="Buscar especialidad"
                  />
                </div>

                {isSpecialtyDropdownOpen && (
                  <div style={{position: "absolute", top: "100%", left: 0, width: "100%", zIndex: 10, marginTop: 4, maxHeight: 220, overflowY: "auto", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "0 12px 32px rgba(0,0,0,0.1)", padding: 4}}>
                    {filteredSpecialties.filter((s) => !watchSpecialties.includes(s)).length > 0 ? (
                      <ul role="listbox" className="flex flex-col gap-0.5">
                        {filteredSpecialties
                          .filter((s) => !watchSpecialties.includes(s))
                          .map((entry) => (
                            <li key={entry}>
                              <button
                                type="button"
                                role="option"
                                aria-selected={false}
                                onClick={() => {
                                  toggleSpecialty(entry);
                                  setSpecialtySearch("");
                                  setIsSpecialtyDropdownOpen(false);
                                }}
                                className="w-full rounded px-3 py-2 text-left text-sm text-ink transition-colors focus:outline-none"
                                style={{background: "transparent"}}
                                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-soft)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                              >
                                {entry}
                              </button>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="px-3 py-4 text-center text-sm text-ink-soft">
                        {specialtySearch ? "No se encontraron coincidencias" : "Todas las opciones seleccionadas"}
                      </p>
                    )}
                  </div>
                )}

                {errors.specialties ? (
                  <p id="field-error-specialties" className="text-xs text-red-700" role="alert">
                    {errors.specialties.message}
                  </p>
                ) : null}
              </fieldset>
            )}

          </>
        ) : null}

        <div className="gx-field">
          <div className="gx-label">
            <label htmlFor="password-field">Contraseña</label>
            {!isSignUp && (
              <Link
                href="/recuperar"
                className="gx-label-link"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            )}
          </div>
          <div style={{position: "relative"}}>
            <Input
              id="password-field"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder={isSignUp ? "Mínimo 8 caracteres, números y especiales" : "Tu contraseña"}
              {...register("password")}
              className="gx-input"
              style={{paddingRight: 80}}
            />
            <button
              type="button"
              style={{position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink-soft)", cursor: "pointer"}}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          {isSignUp && (
            <div className="mt-2 space-y-2">
              <div className="flex gap-1 h-1">
                {[
                  watch("password")?.length >= 8,
                  /[A-Z]/.test(watch("password") || ""),
                  /[0-9]/.test(watch("password") || ""),
                  /[^A-Za-z0-9]/.test(watch("password") || ""),
                ].map((passed, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-colors ${
                      !watch("password")
                        ? "bg-accent/10"
                        : passed
                        ? "bg-emerald-500"
                        : "bg-red-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-ink-soft flex flex-wrap gap-x-3 gap-y-1">
                <span className={watch("password")?.length >= 8 ? "text-emerald-600 font-medium" : ""}>✓ 8 caracteres</span>
                <span className={/[A-Z]/.test(watch("password") || "") ? "text-emerald-600 font-medium" : ""}>✓ 1 mayúscula</span>
                <span className={/[0-9]/.test(watch("password") || "") ? "text-emerald-600 font-medium" : ""}>✓ 1 número</span>
                <span className={/[^A-Za-z0-9]/.test(watch("password") || "") ? "text-emerald-600 font-medium" : ""}>✓ 1 especial</span>
              </p>
            </div>
          )}
          {errors.password ? (
            <p className="text-xs text-red-700 mt-1">{errors.password.message}</p>
          ) : null}
        </div>

        {isSignUp && (
          <div className="gx-field">
            <label className="gx-label" htmlFor="confirmPassword-field">Confirmar Contraseña</label>
            <div style={{position: "relative"}}>
              <Input
                id="confirmPassword-field"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                {...register("confirmPassword")}
                className="gx-input"
              />
            </div>
            {errors.confirmPassword ? (
              <p className="text-xs text-red-700 mt-1">{errors.confirmPassword.message}</p>
            ) : null}
          </div>
        )}

        {isSignUp && (
          <div className="gx-field" style={{ marginTop: 24, marginBottom: 8 }}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <input 
                type="checkbox" 
                id="terms-checkbox" 
                {...register("termsAccepted")}
                style={{ marginTop: 4, accentColor: "var(--accent)", width: 16, height: 16, cursor: "pointer" }}
              />
              <div style={{ fontSize: "0.875rem", color: "var(--ink-soft)", lineHeight: 1.5, flex: 1 }}>
                <label htmlFor="terms-checkbox" style={{ cursor: "pointer" }}>He leído y acepto los </label>
                <a href="/terminos" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }} onClick={(e) => e.stopPropagation()}>Términos y Condiciones</a>
                <label htmlFor="terms-checkbox" style={{ cursor: "pointer" }}> y la Política de Privacidad de {APP_NAME}.</label>
              </div>
            </div>
            {errors.termsAccepted && (
              <p className="text-xs text-red-700 w-full" style={{ marginTop: 4 }}>{errors.termsAccepted.message}</p>
            )}
          </div>
        )}

        {error ? (
          <p className="hce-alert-error" role="alert">{error}</p>
        ) : null}

        {message ? (
          <p className="hce-alert-success" role="status">{message}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="gx-btn-submit"
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "Procesando..." : isSignUp ? "Crear cuenta" : "Iniciar Sesión"}
        </button>
      </form>

      <div className="gx-auth-footer">
        {isSignUp ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
        <Link
          href={isSignUp ? "/login" : "/registro"}
          className="gx-label-link"
        >
          {isSignUp ? "Inicia sesión" : "Regístrate aquí"}
        </Link>
      </div>
    </div>
  );
}
