import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/ui/auth-form";

export default function Home() {
  return (
    <main className="relative flex flex-1 items-center overflow-hidden px-4 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(0,147,147,.16),transparent_40%),radial-gradient(circle_at_88%_14%,rgba(6,182,212,.16),transparent_36%),linear-gradient(120deg,#f5faf9,#edf3f9)]" />
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_1fr]">
        <article className="order-2 rounded-3xl border border-white/80 bg-card/75 p-6 shadow-2xl shadow-cyan-900/10 backdrop-blur sm:p-8 lg:order-1">
          <p className="hce-kicker inline-flex rounded-full border border-cyan-900/20 bg-cyan-50 px-4 py-1 text-cyan-900">
            Glyph · Portal de Acceso
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-ink sm:text-5xl">
            Bienvenido a Glyph: acceso seguro para tu operacion clinica diaria.
          </h1>
          <p className="mt-4 max-w-xl hce-page-lead sm:text-base">
            Entra con tu cuenta para continuar con consultas, pacientes y seguimiento.
            Todo en un entorno offline-first con sincronizacion y aislamiento por tenant.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card px-4 py-3">
              <p className="text-sm font-semibold text-ink">Acceso unico</p>
              <p className="mt-1 text-sm text-ink-soft">Inicia sesion y retoma tu flujo clinico sin friccion.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3">
              <p className="text-sm font-semibold text-ink">Seguridad tenant</p>
              <p className="mt-1 text-sm text-ink-soft">Datos segregados por medico y clinica con RLS.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/registro"
              className="inline-flex rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
            >
              Crear cuenta
            </Link>
          </div>
        </article>

        <div className="order-1 lg:order-2">
          <Suspense fallback={<div className="flex items-center justify-center p-8 text-sm text-ink-soft">Cargando formulario...</div>}>
            <AuthForm mode="login" />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

