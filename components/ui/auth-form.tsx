"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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

type FormErrors = {
  email?: string;
  password?: string;
  fullName?: string;
  specialties?: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string) {
  return UUID_PATTERN.test(value.trim());
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [clinicId, setClinicId] = useState(() => createClinicId());
  const [specialtySearch, setSpecialtySearch] = useState("");
  const isSignUp = mode === "register";
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (mode !== "login") {
      return;
    }

    const registered = searchParams.get("registered");
    if (registered !== "1") {
      return;
    }

    const registeredEmail = searchParams.get("email");
    if (registeredEmail) {
      setEmail((current) => current || registeredEmail);
    }

    setMessage(
      "Cuenta creada. Si no puedes iniciar de inmediato, revisa tu correo (bandeja de entrada y spam) para confirmar la cuenta.",
    );
  }, [mode, searchParams]);

  const filteredSpecialties = MEDICAL_SPECIALTIES.filter((entry) =>
    entry.toLowerCase().includes(specialtySearch.trim().toLowerCase()),
  );

  function toggleSpecialty(entry: string) {
    setSpecialties((current) => {
      if (current.includes(entry)) {
        return current.filter((item) => item !== entry);
      }

      return [...current, entry];
    });
    setFieldErrors((current) => ({ ...current, specialties: undefined }));
  }

  function validateFields() {
    const nextErrors: FormErrors = {};

    if (!email.trim()) {
      nextErrors.email = "El correo es obligatorio.";
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      nextErrors.email = "Ingresa un correo valido.";
    }

    if (!password || password.length < 6) {
      nextErrors.password = "La contraseña debe tener al menos 6 caracteres.";
    }

    if (isSignUp) {
      if (!fullName.trim()) {
        nextErrors.fullName = "El nombre completo es obligatorio.";
      }

      if (specialties.length === 0) {
        nextErrors.specialties = "Selecciona al menos una especialidad.";
      }
    }

    return nextErrors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setFieldErrors({});

    const nextErrors = validateFields();
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const normalizedClinicId = isValidUuid(clinicId)
        ? clinicId.trim()
        : createClinicId();

      if (normalizedClinicId !== clinicId) {
        setClinicId(normalizedClinicId);
      }

      if (isSignUp) {
        if (!fullName.trim()) {
          throw new Error("El nombre completo es obligatorio.");
        }

        if (specialties.length === 0) {
          throw new Error("Debes seleccionar al menos una especialidad.");
        }
      }

      const action = isSignUp
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName.trim(),
                // 'specialties' es el array completo; 'specialty' (singular)
                // se omite para evitar inconsistencias con el array canónico.
                specialties,
                clinic_id: normalizedClinicId,
              },
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });

      if (action.error) {
        throw action.error;
      }

      if (isSignUp) {
        if (action.data.user && action.data.session) {
          await ensureTenantProfile({
            userId: action.data.user.id,
            clinicId: normalizedClinicId,
            fullName: fullName.trim(),
            specialties,
          });
          router.replace("/dashboard");
          return;
        }

        setMessage(
          "Cuenta creada. Revisa tu correo (bandeja de entrada y spam) para confirmar la cuenta y luego inicia sesion. El perfil tenant se completara automaticamente con los datos registrados.",
        );
        const nextEmail = encodeURIComponent(email.trim());
        router.replace(`/?registered=1&email=${nextEmail}`);
        return;
      } else {
        if (action.data.user) {
          await bootstrapTenantProfileFromMetadata(
            action.data.user.id,
            action.data.user.user_metadata,
          );
        }

        router.replace("/dashboard");
      }
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "No se pudo completar la autenticacion. Verifica tus credenciales e intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl rounded-3xl border border-cyan-100/90 bg-card/90 p-6 shadow-2xl shadow-cyan-900/10 backdrop-blur sm:p-8">
      <div className="space-y-3">
        <p className="hce-kicker text-cyan-700">
          Glyph
        </p>
        <h1 className="hce-page-title text-2xl sm:text-2xl">
          {isSignUp ? "Crear cuenta" : "Iniciar sesion"}
        </h1>
        <p className="hce-page-lead text-ink-soft">
          {isSignUp
            ? "Registra tu cuenta y define tu perfil de especialidades para comenzar."
            : "Ingresa con tu cuenta para continuar con tu flujo clinico."}
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2 text-sm font-medium text-ink-soft">
          <span>Correo</span>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((current) => ({ ...current, email: undefined }));
            }}
            placeholder="tu-correo@empresa.com"
            required
            aria-invalid={fieldErrors.email ? "true" : undefined}
            aria-describedby={fieldErrors.email ? "field-error-email" : undefined}
          />
          {fieldErrors.email ? (
            <p id="field-error-email" className="text-xs text-red-700" role="alert">{fieldErrors.email}</p>
          ) : null}
        </label>

        {isSignUp ? (
          <>
            <label className="block space-y-2 text-sm font-medium text-ink-soft">
              <span>Nombre completo</span>
              <Input
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  setFieldErrors((current) => ({ ...current, fullName: undefined }));
                }}
                placeholder="Nombre y apellido"
                required
                aria-invalid={fieldErrors.fullName ? "true" : undefined}
                aria-describedby={fieldErrors.fullName ? "field-error-fullname" : undefined}
              />
              {fieldErrors.fullName ? (
                <p id="field-error-fullname" className="text-xs text-red-700" role="alert">{fieldErrors.fullName}</p>
              ) : null}
            </label>

            <fieldset
              aria-describedby={fieldErrors.specialties ? "field-error-specialties" : undefined}
              className="space-y-2"
            >
              <legend className="text-sm font-medium text-ink-soft">Especialidades</legend>

              <Input
                type="text"
                value={specialtySearch}
                onChange={(event) => setSpecialtySearch(event.target.value)}
                placeholder="Buscar especialidad..."
                aria-label="Buscar especialidad"
              />

              {specialties.length > 0 ? (
                <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-2">
                  <p className="mb-2 text-xs font-semibold text-cyan-900">
                    Seleccionadas ({specialties.length})
                  </p>
                  <div className="flex flex-wrap gap-2" role="list" aria-label="Especialidades seleccionadas">
                    {specialties.map((entry) => (
                      <button
                        key={`selected-${entry}`}
                        type="button"
                        role="listitem"
                        onClick={() => toggleSpecialty(entry)}
                        className="rounded-full border border-cyan-300 bg-card px-3 py-1 text-xs font-semibold text-cyan-900 transition hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                        aria-label={`Quitar ${entry}`}
                      >
                        {entry} ×
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-ink-soft">Selecciona una o varias especialidades.</p>
              )}

              <div
                className="max-h-44 overflow-auto rounded-xl border border-border bg-bg-soft p-2"
                role="listbox"
                aria-label="Lista de especialidades disponibles"
                aria-multiselectable="true"
              >
                {filteredSpecialties.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {filteredSpecialties.map((entry) => {
                      const checked = specialties.includes(entry);
                      return (
                        <button
                          key={entry}
                          type="button"
                          role="option"
                          aria-selected={checked}
                          onClick={() => toggleSpecialty(entry)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                            checked
                              ? "border-cyan-400 bg-cyan-600 text-white"
                              : "border-border bg-card text-ink-soft hover:bg-bg-soft"
                          }`}
                        >
                          {entry}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="px-2 py-3 text-xs text-ink-soft">
                    No hay coincidencias para tu busqueda.
                  </p>
                )}
              </div>

              {fieldErrors.specialties ? (
                <p id="field-error-specialties" className="text-xs text-red-700" role="alert">
                  {fieldErrors.specialties}
                </p>
              ) : null}
            </fieldset>

            <p className="rounded-xl border border-border bg-bg-soft px-3 py-2 text-xs text-ink-soft">
              El espacio de clinica se crea automaticamente para ti durante el registro.
            </p>
          </>
        ) : null}

        <label className="block space-y-2 text-sm font-medium text-ink-soft">
          <span>Contraseña</span>
          <div className="flex gap-2">
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setFieldErrors((current) => ({ ...current, password: undefined }));
              }}
              placeholder="Minimo 6 caracteres"
              required
              minLength={6}
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
          {fieldErrors.password ? (
            <p className="text-xs text-red-700">{fieldErrors.password}</p>
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
          disabled={loading}
          className="w-full justify-center px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          aria-busy={loading}
        >
          {loading
            ? "Procesando..."
            : isSignUp
              ? "Crear cuenta"
              : "Entrar"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-soft">
        {isSignUp ? "Ya tienes cuenta?" : "Aun no tienes cuenta?"}{" "}
        <Link
          href={isSignUp ? "/" : "/registro"}
          className="font-semibold text-cyan-700 underline-offset-4 hover:underline"
        >
          {isSignUp ? "Inicia sesion" : "Crear cuenta"}
        </Link>
      </p>
    </section>
  );
}
