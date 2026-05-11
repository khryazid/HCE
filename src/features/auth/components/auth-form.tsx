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
  ensureTenantProfile,
} from "@/lib/supabase/profile";
import { MEDICAL_SPECIALTIES } from "@/lib/constants/medical-specialties";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
};

const loginSchema = z.object({
  email: z.string().min(1, "El correo es obligatorio.").email("Ingresa un correo valido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  fullName: z.string().optional(),
  specialties: z.array(z.string()).optional(),
});

const registerSchema = loginSchema.extend({
  fullName: z.string().min(1, "El nombre completo es obligatorio."),
  specialties: z.array(z.string()).min(1, "Selecciona al menos una especialidad."),
  plan: z.enum(["basic", "clinic"]).default("basic"),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(isSignUp ? registerSchema : loginSchema) as any,
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      specialties: [],
      plan: "basic",
    },
  });

  const [clinicId, setClinicId] = useState(() => createClinicId());
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpecialtyDropdownOpen, setIsSpecialtyDropdownOpen] = useState(false);
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
              data: {
                full_name: data.fullName?.trim(),
                specialties: data.specialties,
                clinic_id: normalizedClinicId,
                plan: data.plan,
              },
            },
          })
        : await supabase.auth.signInWithPassword({ email: data.email, password: data.password });

      if (action.error) {
        throw action.error;
      }

      if (isSignUp) {
        if (action.data.user && action.data.session) {
          await ensureTenantProfile({
            userId: action.data.user.id,
            clinicId: normalizedClinicId,
            fullName: data.fullName?.trim() || "",
            specialties: data.specialties || [],
            plan: data.plan as "basic" | "clinic",
          });
          router.replace("/dashboard");
          return;
        }

        setMessage(
          "Cuenta creada. Revisa tu correo (bandeja de entrada y spam) para confirmar la cuenta y luego inicia sesion. El perfil tenant se completara automaticamente con los datos registrados."
        );
        const nextEmail = encodeURIComponent(data.email.trim());
        router.replace(`/?registered=1&email=${nextEmail}`);
        return;
      } else {
        if (action.data.user) {
          await bootstrapTenantProfileFromMetadata(
            action.data.user.id,
            action.data.user.user_metadata
          );
        }
        router.replace("/dashboard");
      }
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "No se pudo completar la autenticacion. Verifica tus credenciales e intenta de nuevo."
      );
    }
  }

  return (
    <section
      className="mx-auto w-full max-w-xl rounded-3xl border border-border bg-card/90 p-6 shadow-2xl backdrop-blur-sm sm:p-8"
      aria-label={isSignUp ? "Formulario de registro" : "Formulario de inicio de sesión"}
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Glyph</p>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">
          {isSignUp ? "Crear cuenta" : "Iniciar sesión"}
        </h2>
        <p className="text-sm leading-6 text-ink-soft">
          {isSignUp
            ? "Registra tu cuenta y define tu perfil de especialidades para comenzar."
            : "Ingresa con tu cuenta para continuar con tu flujo clínico."}
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <label className="block space-y-2 text-sm font-medium text-ink-soft">
          <span>Correo</span>
          <Input
            type="email"
            autoComplete="email"
            placeholder="tu-correo@empresa.com"
            {...register("email")}
            aria-invalid={errors.email ? "true" : undefined}
            aria-describedby={errors.email ? "field-error-email" : undefined}
          />
          {errors.email ? (
            <p id="field-error-email" className="text-xs text-red-700" role="alert">
              {errors.email.message}
            </p>
          ) : null}
        </label>

        {isSignUp ? (
          <>
            <label className="block space-y-2 text-sm font-medium text-ink-soft">
              <span>Nombre completo</span>
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
            </label>

            <fieldset
              aria-describedby={errors.specialties ? "field-error-specialties" : undefined}
              className="space-y-2 relative"
              ref={dropdownRef}
            >
              <legend className="text-sm font-medium text-ink-soft">Especialidades</legend>

              <div
                className="flex flex-wrap items-center gap-2 rounded-xl border border-field-border bg-field p-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all"
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
                  aria-label="Buscar especialidad"
                />
              </div>

              {isSpecialtyDropdownOpen && (
                <div className="absolute left-0 top-full z-10 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-card shadow-xl p-1 animate-in fade-in zoom-in-95">
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
                              className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-bg-soft focus:bg-bg-soft focus:outline-none"
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

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-ink-soft">Selecciona tu Plan</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm transition-colors focus:outline-none ${
                    watch("plan") === "basic"
                      ? "border-accent bg-accent/5 ring-1 ring-accent"
                      : "border-border bg-card hover:bg-bg-soft"
                  }`}
                >
                  <input type="radio" value="basic" {...register("plan")} className="sr-only" />
                  <div className="flex w-full flex-col">
                    <span className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">Básico</span>
                    </span>
                    <span className="mt-1 flex items-center text-xs text-ink-soft">
                      Hasta 2 Asistentes.
                    </span>
                  </div>
                </label>
                <label
                  className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm transition-colors focus:outline-none ${
                    watch("plan") === "clinic"
                      ? "border-accent bg-accent/5 ring-1 ring-accent"
                      : "border-border bg-card hover:bg-bg-soft"
                  }`}
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

            <p className="rounded-xl border border-border bg-bg-soft px-3 py-2 text-xs text-ink-soft">
              El espacio de clínica se crea automáticamente para ti durante el registro.
            </p>
          </>
        ) : null}

        <label className="block space-y-2 text-sm font-medium text-ink-soft">
          <span>Contraseña</span>
          <div className="flex gap-2">
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder="Minimo 6 caracteres"
              {...register("password")}
            />
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-2 text-xs font-semibold text-ink-soft"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </Button>
          </div>
          {errors.password ? (
            <p className="text-xs text-red-700">{errors.password.message}</p>
          ) : null}
        </label>

        {error ? (
          <p className="hce-alert-error" role="alert">{error}</p>
        ) : null}

        {message ? (
          <p className="hce-alert-success" role="status">{message}</p>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="hce-btn-primary w-full justify-center py-3 text-sm font-semibold disabled:cursor-not-allowed"
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "Procesando..." : isSignUp ? "Crear cuenta" : "Entrar"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-soft">
        {isSignUp ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
        <Link
          href={isSignUp ? "/login" : "/registro"}
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          {isSignUp ? "Inicia sesión" : "Crear cuenta"}
        </Link>
      </p>
    </section>
  );
}
