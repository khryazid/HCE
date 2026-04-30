import Link from "next/link";
import { Check } from "lucide-react";

export default function Home() {
  return (
    <main className="relative flex flex-col items-center overflow-x-hidden pt-16 pb-24 sm:pt-24 sm:pb-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(15,118,110,.10),transparent_40%),radial-gradient(circle_at_88%_14%,rgba(15,118,110,.10),transparent_36%)]" />
      
      {/* Hero Section */}
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 text-center sm:px-8">
        <p className="hce-kicker inline-flex rounded-full border border-accent/20 bg-accent/10 px-4 py-1 text-accent">
          Glyph · Software Médico
        </p>
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-ink sm:text-6xl">
          El motor clínico para médicos y consultorios modernos
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-soft sm:text-xl">
          Historia clínica multiespecialidad, sincronización offline-first y diseño pensado para que pases menos tiempo escribiendo y más tiempo con tus pacientes.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="#pricing"
            className="hce-btn-primary px-8 py-3 text-base"
          >
            Ver Planes
          </Link>
          <Link
            href="/login"
            className="hce-btn-secondary px-8 py-3 text-base"
          >
            Iniciar Sesión
          </Link>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="mx-auto mt-24 w-full max-w-5xl px-4 sm:mt-32 sm:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Planes simples para cada necesidad
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Empieza a usar Glyph hoy. Cancela cuando quieras.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:gap-12">
          {/* Plan Pro */}
          <div className="relative flex flex-col hce-surface border-accent/20">
            <h3 className="text-xl font-semibold text-ink">Profesional Independiente</h3>
            <p className="mt-2 text-sm text-ink-soft">Perfecto para doctores con consultorio propio.</p>
            <p className="mt-6 flex items-baseline gap-x-2">
              <span className="text-4xl font-bold tracking-tight text-ink">$29</span>
              <span className="text-sm font-semibold leading-6 text-ink-soft">/mes</span>
            </p>
            <ul className="mt-8 flex flex-col gap-4 text-sm text-ink-soft">
              <li className="flex gap-x-3"><Check className="h-5 w-5 text-accent" /> Pacientes ilimitados</li>
              <li className="flex gap-x-3"><Check className="h-5 w-5 text-accent" /> Consultas ilimitadas</li>
              <li className="flex gap-x-3"><Check className="h-5 w-5 text-accent" /> Plantillas de tratamiento</li>
              <li className="flex gap-x-3"><Check className="h-5 w-5 text-accent" /> Sugerencias CIE automatizadas</li>
              <li className="flex gap-x-3"><Check className="h-5 w-5 text-accent" /> Generación de recetas en PDF</li>
            </ul>
            <div className="mt-auto pt-8">
              <Link
                href="/registro?plan=pro"
                className="w-full hce-btn-primary py-3 text-center"
              >
                Comenzar prueba gratis
              </Link>
            </div>
          </div>

          {/* Plan Clinica */}
          <div className="relative flex flex-col hce-surface opacity-80 hover:opacity-100 transition-opacity">
            <h3 className="text-xl font-semibold text-ink">Clínica (Próximamente)</h3>
            <p className="mt-2 text-sm text-ink-soft">Para centros médicos con múltiples doctores y asistentes.</p>
            <p className="mt-6 flex items-baseline gap-x-2">
              <span className="text-4xl font-bold tracking-tight text-ink-soft">$99</span>
              <span className="text-sm font-semibold leading-6 text-ink-soft">/mes</span>
            </p>
            <ul className="mt-8 flex flex-col gap-4 text-sm text-ink-soft opacity-70">
              <li className="flex gap-x-3"><Check className="h-5 w-5" /> Todo lo del plan Profesional</li>
              <li className="flex gap-x-3"><Check className="h-5 w-5" /> Múltiples doctores</li>
              <li className="flex gap-x-3"><Check className="h-5 w-5" /> Roles de asistente</li>
              <li className="flex gap-x-3"><Check className="h-5 w-5" /> Reportes consolidados</li>
            </ul>
            <div className="mt-auto pt-8">
              <button
                disabled
                className="w-full hce-btn-secondary py-3 text-center opacity-50"
              >
                En desarrollo
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
