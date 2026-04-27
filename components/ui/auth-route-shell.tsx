import Link from "next/link";
import type { ReactNode } from "react";

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

const variantStyles = {
  login: {
    shell: "bg-[radial-gradient(circle_at_12%_18%,rgba(0,147,147,.16),transparent_40%),radial-gradient(circle_at_88%_14%,rgba(6,182,212,.16),transparent_36%),linear-gradient(120deg,#f5faf9,#edf3f9)]",
    kicker: "border-cyan-900/20 bg-cyan-50 text-cyan-900",
    panel: "border-cyan-100/90 shadow-cyan-900/10",
    cta: "border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100",
  },
  register: {
    shell: "bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,.14),transparent_40%),radial-gradient(circle_at_90%_15%,rgba(234,88,12,.16),transparent_35%),linear-gradient(130deg,#f8fbf6,#f6f7f3)]",
    kicker: "border-emerald-900/20 bg-emerald-50 text-emerald-900",
    panel: "border-emerald-100/90 shadow-emerald-900/10",
    cta: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  },
} as const;

export function AuthRouteShell({
  variant,
  kicker,
  title,
  lead,
  highlights,
  secondaryAction,
  children,
}: AuthRouteShellProps) {
  const styles = variantStyles[variant];

  return (
    <main className="relative flex flex-1 items-center overflow-hidden px-4 py-10 sm:px-8">
      <div className={`pointer-events-none absolute inset-0 -z-10 ${styles.shell}`} />
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_1fr]">
        <article className={`order-2 rounded-3xl border bg-card/75 p-6 shadow-2xl backdrop-blur sm:p-8 lg:order-1 ${styles.panel}`}>
          <p className={`hce-kicker inline-flex rounded-full border px-4 py-1 ${styles.kicker}`}>
            {kicker}
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-ink sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-xl hce-page-lead sm:text-base">
            {lead}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {highlights.map((highlight) => (
              <div key={highlight.title} className="rounded-2xl border border-border bg-card px-4 py-3">
                <p className="text-sm font-semibold text-ink">{highlight.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{highlight.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={secondaryAction.href} className={`inline-flex rounded-xl border px-4 py-2 text-sm font-semibold transition ${styles.cta}`}>
              {secondaryAction.label}
            </Link>
          </div>
        </article>

        <div className="order-1 lg:order-2">{children}</div>
      </section>
    </main>
  );
}