import type { Metadata } from "next";
import Link from "next/link";
import {
  Brain,
  FileText,
  WifiOff,
  ShieldCheck,
  Stethoscope,
  Clock,
  Check,
  ArrowRight,
  Zap,
} from "lucide-react";

/* ─── SEO ────────────────────────────────────────────────────────────────── */
export const metadata: Metadata = {
  title: "Glyph — Historia Clínica Electrónica para médicos modernos",
  description:
    "Software médico SaaS con historia clínica multiespecialidad, sugerencias CIE-10 por IA, trabajo offline y generación de PDF clínico. Diseñado para médicos independientes y consultorios.",
  keywords: [
    "historia clínica electrónica",
    "software médico",
    "HCE",
    "CIE-10 IA",
    "consultorio médico",
    "receta médica PDF",
    "offline médico",
    "expediente clínico digital",
  ],
  openGraph: {
    title: "Glyph — Historia Clínica Electrónica",
    description:
      "Motor clínico offline-first con IA integrada. Pacientes ilimitados, PDF profesional y sincronización automática.",
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "Glyph — Historia Clínica Electrónica",
    description:
      "Software médico con IA, trabajo offline y PDF clínico. Prueba gratis.",
  },
  alternates: {
    canonical: "/",
  },
};

/* ─── Data ───────────────────────────────────────────────────────────────── */
const stats = [
  { value: "∞", label: "Pacientes registrados" },
  { value: "CIE-10", label: "Codificación con IA" },
  { value: "100%", label: "Funciona offline" },
  { value: "< 2s", label: "Tiempo de carga" },
];



const testimonials = [
  {
    quote:
      "Reduje el tiempo de documentación de cada consulta a menos de 3 minutos. El wizard me guía sin que tenga que pensar en el formato.",
    author: "Dr. Alejandro M.",
    role: "Médico general, consultorio independiente",
  },
  {
    quote:
      "Lo que más valoro es que funciona aunque se vaya el internet. No perdo ninguna consulta nunca más.",
    author: "Dra. Carolina V.",
    role: "Pediatra",
  },
];

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <>
      {/* Skip to content for a11y */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
      >
        Ir al contenido
      </a>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-bg/80 backdrop-blur-md">
        <nav
          className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6"
          aria-label="Navegación principal"
        >
          <span className="text-base font-bold tracking-tight text-ink">
            Glyph
            <span className="ml-1.5 text-accent">·</span>
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-ink-soft transition hover:text-ink sm:block"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="hce-btn-primary px-4 py-2 text-sm"
            >
              Empezar gratis
            </Link>
          </div>
        </nav>
      </header>

      <main id="main-content" className="flex flex-col overflow-x-hidden">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section
          className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16 text-center sm:pt-32"
          aria-label="Sección principal"
        >
          {/* Background layers */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(15,118,110,0.18) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(15,118,110,0.08) 0%, transparent 60%)",
            }}
          />
          {/* Animated orbs */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[8%] top-[18%] h-64 w-64 -z-10 rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, #0f766e 0%, transparent 70%)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-[10%] bottom-[20%] h-48 w-48 -z-10 rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, #0d9488 0%, transparent 70%)" }}
          />

          {/* Kicker */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent">
            <Zap className="h-3.5 w-3.5" aria-hidden />
            Software Médico · Ahora disponible
          </div>

          {/* Headline */}
          <h1 className="max-w-4xl text-5xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-7xl">
            El motor clínico para{" "}
            <span
              className="text-transparent"
              style={{
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                backgroundImage: "linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #0f766e 100%)",
              }}
            >
              médicos modernos
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft sm:text-xl">
            Historia clínica multiespecialidad, sincronización offline-first y
            sugerencias CIE-10 con IA. Documentá cada consulta en menos de 3
            minutos — desde cualquier lugar.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/registro"
              className="hce-btn-primary group flex items-center gap-2 px-8 py-3.5 text-base"
            >
              Empezar gratis
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
            <Link
              href="#features"
              className="hce-btn-secondary px-8 py-3.5 text-base"
            >
              Ver funciones
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-8 text-sm text-ink-soft">
            Sin tarjeta de crédito &nbsp;·&nbsp; Configuración en 2 minutos
          </p>
        </section>

        {/* ── Stats Bar ───────────────────────────────────────────────────── */}
        <section
          aria-label="Métricas clave"
          className="border-y border-border bg-bg-soft/60 py-10"
        >
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 sm:px-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <span className="text-3xl font-extrabold text-ink sm:text-4xl">
                  {s.value}
                </span>
                <span className="text-center text-sm text-ink-soft">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features bento grid ─────────────────────────────────────────── */}
        <section
          id="features"
          className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32"
          aria-labelledby="features-heading"
        >
          <div className="mb-16 max-w-2xl">
            <p className="hce-kicker mb-3 text-accent">Funcionalidades</p>
            <h2
              id="features-heading"
              className="text-4xl font-bold tracking-tight text-ink sm:text-5xl"
            >
              Diseñado para el consultorio real
            </h2>
            <p className="mt-4 text-lg text-ink-soft">
              No es un formulario digital. Es un flujo clínico completo que se
              adapta a tu especialidad.
            </p>
          </div>

          {/* Bento grid */}
          <div className="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Large card — wizard */}
            <article
              className="group relative col-span-1 row-span-2 flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm transition hover:shadow-md sm:col-span-2 lg:col-span-1"
              aria-labelledby="feat-wizard"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(15,118,110,0.08) 0%, transparent 70%)",
                }}
              />
              <Stethoscope
                className="h-10 w-10 text-accent"
                aria-hidden
              />
              <div>
                <h3
                  id="feat-wizard"
                  className="mt-6 text-2xl font-bold text-ink"
                >
                  Wizard de consulta inteligente
                </h3>
                <p className="mt-3 text-ink-soft">
                  Flujo guiado por pasos que se adapta al modo{" "}
                  <strong className="font-semibold text-ink">Consulta Completa</strong> o{" "}
                  <strong className="font-semibold text-ink">Seguimiento Clínico</strong>. Auto-scroll
                  a errores, máscara de fecha, bullets automáticos y selector de
                  estado del paciente al cerrar.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-accent">
                <Clock className="h-4 w-4" aria-hidden />
                Consultas documentadas en &lt; 3 min
              </div>
            </article>

            {/* AI */}
            <article
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
              aria-labelledby="feat-ai"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(circle at 70% 20%, rgba(15,118,110,0.10) 0%, transparent 70%)",
                }}
              />
              <Brain className="h-8 w-8 text-accent" aria-hidden />
              <div>
                <h3 id="feat-ai" className="mt-4 text-xl font-bold text-ink">
                  CIE-10 asistido por IA
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Sugerencias de diagnóstico en tiempo real con Gemini. Sin
                  catálogo local — siempre actualizado y contextualizado a tu
                  especialidad.
                </p>
              </div>
            </article>

            {/* Offline */}
            <article
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
              aria-labelledby="feat-offline"
            >
              <WifiOff className="h-8 w-8 text-accent" aria-hidden />
              <div>
                <h3
                  id="feat-offline"
                  className="mt-4 text-xl font-bold text-ink"
                >
                  Funciona sin internet
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Guarda cada consulta localmente con cifrado AES y sincroniza
                  de forma automática al volver la conexión. Sin pérdida de
                  datos.
                </p>
              </div>
            </article>

            {/* PDF */}
            <article
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
              aria-labelledby="feat-pdf"
            >
              <FileText className="h-8 w-8 text-accent" aria-hidden />
              <div>
                <h3 id="feat-pdf" className="mt-4 text-xl font-bold text-ink">
                  PDF clínico multipágina
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Genera historia completa + receta + hoja del paciente.
                  Con membrete profesional personalizable y firma.
                </p>
              </div>
            </article>

            {/* Security */}
            <article
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
              aria-labelledby="feat-security"
            >
              <ShieldCheck className="h-8 w-8 text-accent" aria-hidden />
              <div>
                <h3
                  id="feat-security"
                  className="mt-4 text-xl font-bold text-ink"
                >
                  Seguridad y privacidad
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Aislamiento multi-tenant con RLS en base de datos. PHI cifrado
                  en dispositivo. Auditoría completa de accesos.
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* ── Testimonials ────────────────────────────────────────────────── */}
        <section
          aria-labelledby="testimonials-heading"
          className="border-y border-border bg-bg-soft/40 py-24"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <p className="hce-kicker mb-3 text-accent">Testimonios</p>
              <h2
                id="testimonials-heading"
                className="text-3xl font-bold tracking-tight text-ink sm:text-4xl"
              >
                Lo que dicen los médicos
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {testimonials.map((t) => (
                <blockquote
                  key={t.author}
                  className="flex flex-col justify-between rounded-3xl border border-border bg-card p-8 shadow-sm"
                >
                  <p className="text-base leading-8 text-ink-soft">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <footer className="mt-6">
                    <p className="font-semibold text-ink">{t.author}</p>
                    <p className="text-sm text-ink-soft">{t.role}</p>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ─────────────────────────────────────────────────────── */}
        <section
          id="pricing"
          className="mx-auto w-full max-w-5xl px-4 py-24 sm:px-6 sm:py-32"
          aria-labelledby="pricing-heading"
        >
          <div className="mb-16 text-center">
            <p className="hce-kicker mb-3 text-accent">Precios</p>
            <h2
              id="pricing-heading"
              className="text-4xl font-bold tracking-tight text-ink sm:text-5xl"
            >
              Planes simples, sin sorpresas
            </h2>
            <p className="mt-4 text-lg text-ink-soft">
              Empieza gratis. Escala cuando lo necesites.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Plan Pro — Featured */}
            <article
              className="relative flex flex-col rounded-3xl border-2 border-accent bg-card p-8 shadow-lg"
              aria-labelledby="plan-pro"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-accent px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  Más popular
                </span>
              </div>
              <h3 id="plan-pro" className="text-xl font-bold text-ink">
                Profesional Independiente
              </h3>
              <p className="mt-2 text-sm text-ink-soft">
                Para médicos con consultorio propio.
              </p>
              <p className="mt-6 flex items-baseline gap-x-2">
                <span className="text-5xl font-extrabold tracking-tight text-ink">
                  $29
                </span>
                <span className="text-sm font-semibold text-ink-soft">/mes</span>
              </p>
              <ul className="mt-8 flex flex-col gap-3 text-sm text-ink-soft">
                {[
                  "Pacientes y consultas ilimitados",
                  "Seguimientos clínicos",
                  "Plantillas de tratamiento",
                  "Sugerencias CIE-10 con IA",
                  "PDF clínico profesional",
                  "Sync offline automático",
                  "Soporte por email",
                ].map((f) => (
                  <li key={f} className="flex gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-10">
                <Link
                  href="/registro?plan=pro"
                  className="hce-btn-primary block w-full py-3.5 text-center text-base"
                >
                  Comenzar prueba gratis
                </Link>
              </div>
            </article>

            {/* Plan Clínica — Coming soon */}
            <article
              className="flex flex-col rounded-3xl border border-border bg-card p-8 opacity-70"
              aria-labelledby="plan-clinica"
            >
              <h3 id="plan-clinica" className="text-xl font-bold text-ink">
                Clínica
              </h3>
              <p className="mt-2 text-sm text-ink-soft">
                Para centros con múltiples doctores y asistentes.
              </p>
              <p className="mt-6 flex items-baseline gap-x-2">
                <span className="text-5xl font-extrabold tracking-tight text-ink-soft">
                  $99
                </span>
                <span className="text-sm font-semibold text-ink-soft">/mes</span>
              </p>
              <ul className="mt-8 flex flex-col gap-3 text-sm text-ink-soft">
                {[
                  "Todo lo del plan Profesional",
                  "Múltiples doctores",
                  "Roles de asistente",
                  "Reportes consolidados",
                  "Soporte prioritario",
                ].map((f) => (
                  <li key={f} className="flex gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-10">
                <button
                  disabled
                  aria-disabled="true"
                  className="hce-btn-secondary block w-full cursor-not-allowed py-3.5 text-center text-base opacity-50"
                >
                  Próximamente
                </button>
              </div>
            </article>
          </div>
        </section>

        {/* ── CTA Banner ──────────────────────────────────────────────────── */}
        <section
          aria-labelledby="cta-heading"
          className="relative mx-4 mb-16 overflow-hidden rounded-3xl sm:mx-6"
          style={{
            background:
              "linear-gradient(135deg, #0f766e 0%, #0d9488 40%, #134e4a 100%)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 80% at 80% 50%, rgba(255,255,255,0.08) 0%, transparent 70%)",
            }}
          />
          <div className="relative mx-auto max-w-4xl px-8 py-20 text-center">
            <h2
              id="cta-heading"
              className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl"
            >
              Digitaliza tu consultorio.
              <br />
              Empieza hoy, gratis.
            </h2>
            <p className="mt-4 text-lg text-white/80">
              Únete a los médicos que ya reducen el tiempo de documentación y
              nunca pierden una consulta.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/registro"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-accent transition hover:bg-white/90"
              >
                Crear cuenta gratis
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="border-t border-border py-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
            <p className="text-sm font-semibold text-ink">
              Glyph <span className="text-accent">·</span> Motor Clínico
            </p>
            <nav aria-label="Links del pie de página">
              <ul className="flex flex-wrap gap-6 text-sm text-ink-soft">
                <li>
                  <Link href="/login" className="hover:text-ink transition-colors">
                    Iniciar sesión
                  </Link>
                </li>
                <li>
                  <Link href="/registro" className="hover:text-ink transition-colors">
                    Registro
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-ink transition-colors">
                    Precios
                  </Link>
                </li>
              </ul>
            </nav>
            <p className="text-xs text-ink-soft">
              © {new Date().getFullYear()} Glyph. Todos los derechos reservados.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
