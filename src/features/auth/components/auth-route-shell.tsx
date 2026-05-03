import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Check } from "lucide-react";

type AuthRouteShellProps = {
  variant: "login" | "register";
  kicker: string;
  title: string;
  lead: string;
  highlights: Array<{
    title: string;
    description: string;
  }>;
  secondaryAction: {
    href: string;
    label: string;
  };
  children: ReactNode;
};

export function AuthRouteShell({
  variant,
  kicker,
  title,
  lead,
  highlights,
  secondaryAction,
  children,
}: AuthRouteShellProps) {
  const isLogin = variant === "login";

  return (
    <div className="flex min-h-screen flex-col">

      {/* ── Navbar ── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-bg/80 backdrop-blur-md">
        <nav
          className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6"
          aria-label="Navegación"
        >
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-ink-soft transition hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al inicio
          </Link>
          <span className="text-base font-bold tracking-tight text-ink">
            Glyph<span className="ml-1 text-accent">·</span>
          </span>
          <Link
            href={secondaryAction.href}
            className="text-sm font-semibold text-accent transition hover:opacity-80"
          >
            {secondaryAction.label}
          </Link>
        </nav>
      </header>

      {/* ── Background ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: isLogin
            ? "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(15,118,110,0.12) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 80% 70%, rgba(13,148,136,0.08) 0%, transparent 60%), var(--bg)"
            : "radial-gradient(ellipse 70% 60% at 80% 20%, rgba(15,118,110,0.14) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 10% 80%, rgba(13,148,136,0.08) 0%, transparent 60%), var(--bg)",
        }}
      />
      {/* Ambient orb */}
      <div
        aria-hidden
        className="pointer-events-none fixed -z-10 rounded-full opacity-25 blur-3xl"
        style={{
          width: 320,
          height: 320,
          top: isLogin ? "15%" : "55%",
          left: isLogin ? "5%" : "65%",
          background: "radial-gradient(circle, #0f766e 0%, transparent 70%)",
        }}
      />

      {/* ── Main layout ── */}
      <main className="flex flex-1 items-center px-4 pb-12 pt-24 sm:px-6">
        <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_480px] lg:items-center">

          {/* ── Left: info panel ── */}
          <section
            className="order-2 lg:order-1 flex flex-col gap-8"
            aria-label="Información del producto"
          >
            {/* Headline */}
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent">
                {kicker}
              </p>
              <h1 className="max-w-lg text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-md text-base leading-7 text-ink-soft">
                {lead}
              </p>
            </div>

            {/* Bento highlight cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              {highlights.map((h) => (
                <div
                  key={h.title}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, rgba(15,118,110,0.08) 0%, transparent 70%)",
                    }}
                  />
                  <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-accent/10">
                    <Check className="h-3.5 w-3.5 text-accent" aria-hidden />
                  </div>
                  <p className="text-sm font-bold text-ink">{h.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{h.description}</p>
                </div>
              ))}
            </div>

            {/* Switch link */}
            <p className="text-sm text-ink-soft">
              {isLogin ? "¿No tienes cuenta aún?" : "¿Ya tienes cuenta?"}{" "}
              <Link
                href={secondaryAction.href}
                className="font-semibold text-accent underline-offset-4 hover:underline"
              >
                {secondaryAction.label}
              </Link>
            </p>
          </section>

          {/* ── Right: form card ── */}
          <div className="order-1 lg:order-2">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}