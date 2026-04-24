"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
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
                specialty: specialties[0],
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
          : "No se pudo completar la autenticacion.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl rounded-3xl border border-cyan-100/90 bg-white/90 p-6 shadow-2xl shadow-cyan-900/10 backdrop-blur sm:p-8">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
          Glyph
        </p>
        <h1 className="text-2xl font-semibold leading-tight text-slate-900">
          {isSignUp ? "Crear cuenta" : "Iniciar sesion"}
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          {isSignUp
            ? "Registra tu cuenta y define tu perfil de especialidades para comenzar."
            : "Ingresa con tu cuenta para continuar con tu flujo clinico."}
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2 text-sm font-medium text-slate-700">
          <span>Correo</span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-cyan-500 transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((current) => ({ ...current, email: undefined }));
            }}
            placeholder="tu-correo@empresa.com"
            required
          />
          {fieldErrors.email ? (
            <p className="text-xs text-red-700">{fieldErrors.email}</p>
          ) : null}
        </label>

        {isSignUp ? (
          <>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>Nombre completo</span>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-cyan-500 transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  setFieldErrors((current) => ({ ...current, fullName: undefined }));
                }}
                placeholder="Nombre y apellido"
                required
              />
              {fieldErrors.fullName ? (
                <p className="text-xs text-red-700">{fieldErrors.fullName}</p>
              ) : null}
            </label>

            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>Especialidades</span>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-cyan-500 transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2"
                type="text"
                value={specialtySearch}
                onChange={(event) => setSpecialtySearch(event.target.value)}
                placeholder="Buscar especialidad..."
              />
              {specialties.length > 0 ? (
                <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-2">
                  <p className="mb-2 text-xs font-semibold text-cyan-900">
                    Seleccionadas ({specialties.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {specialties.map((entry) => (
                      <button
                        key={`selected-${entry}`}
                        type="button"
                        onClick={() => toggleSpecialty(entry)}
                        className="rounded-full border border-cyan-300 bg-white px-3 py-1 text-xs font-semibold text-cyan-900 transition hover:bg-cyan-100"
                      >
                        {entry} ×
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Selecciona una o varias especialidades.</p>
              )}

              <div className="max-h-44 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                {filteredSpecialties.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {filteredSpecialties.map((entry) => {
                      const checked = specialties.includes(entry);

                      return (
                        <button
                          key={entry}
                          type="button"
                          onClick={() => toggleSpecialty(entry)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            checked
                              ? "border-cyan-400 bg-cyan-600 text-white"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {entry}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="px-2 py-3 text-xs text-slate-500">
                    No hay coincidencias para tu busqueda.
                  </p>
                )}
              </div>
              {fieldErrors.specialties ? (
                <p className="text-xs text-red-700">{fieldErrors.specialties}</p>
              ) : null}
            </label>

            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              El espacio de clinica se crea automaticamente para ti durante el registro.
            </p>
          </>
        ) : null}

        <label className="block space-y-2 text-sm font-medium text-slate-700">
          <span>Contraseña</span>
          <div className="flex gap-2">
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-cyan-500 transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2"
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
            <button
              type="button"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          {fieldErrors.password ? (
            <p className="text-xs text-red-700">{fieldErrors.password}</p>
          ) : null}
        </label>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Procesando..."
            : isSignUp
              ? "Crear cuenta"
              : "Entrar"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
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
