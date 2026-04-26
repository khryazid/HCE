import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/ui/auth-form";

export default function RegisterPage() {
  return (
    <main className="relative flex flex-1 items-center overflow-hidden px-4 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,.14),transparent_40%),radial-gradient(circle_at_90%_15%,rgba(234,88,12,.16),transparent_35%),linear-gradient(130deg,#f8fbf6,#f6f7f3)]" />
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_1fr]">
        <article className="rounded-3xl border border-white/80 bg-white/75 p-6 shadow-2xl shadow-emerald-900/10 backdrop-blur sm:p-8">
          <p className="hce-kicker inline-flex rounded-full border border-emerald-900/20 bg-emerald-50 px-4 py-1 text-emerald-900">
            Glyph · Registro
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Crea tu cuenta y activa tu entorno clinico multi-especialidad.
          </h1>
          <p className="mt-4 max-w-xl hce-page-lead sm:text-base">
            Registra tus especialidades, define tu tenant y deja listo el flujo para onboarding
            profesional, consultas y documentacion posterior.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Perfil por medico</p>
              <p className="mt-1 text-sm text-slate-600">Especialidades multiples desde el alta.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Escalable a PDF</p>
              <p className="mt-1 text-sm text-slate-600">Datos listos para membrete y reportes clinicos.</p>
            </div>
          </div>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            Ya tienes cuenta? Iniciar sesion
          </Link>
        </article>

        <Suspense fallback={<div className="flex items-center justify-center p-8 text-sm text-slate-500">Cargando formulario...</div>}>
          <AuthForm mode="register" />
        </Suspense>
      </section>
    </main>
  );
}

