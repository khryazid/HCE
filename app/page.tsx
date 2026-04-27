import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex flex-1 items-center overflow-hidden px-4 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(0,147,147,.16),transparent_40%),radial-gradient(circle_at_88%_14%,rgba(6,182,212,.16),transparent_36%),linear-gradient(120deg,#f5faf9,#edf3f9)]" />
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_1fr]">
        <article className="order-2 rounded-3xl border border-cyan-100/90 bg-card/75 p-6 shadow-2xl shadow-cyan-900/10 backdrop-blur sm:p-8 lg:order-1">
          <p className="hce-kicker inline-flex rounded-full border border-cyan-900/20 bg-cyan-50 px-4 py-1 text-cyan-900">
            Glyph · Portal de Acceso
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-ink sm:text-5xl">
            Accede o crea tu cuenta para empezar a trabajar con historia clinica multiespecialidad.
          </h1>
          <p className="mt-4 max-w-xl hce-page-lead sm:text-base">
            El acceso esta dividido en dos rutas claras: iniciar sesion para retomar tu entorno
            y registro para configurar tu tenant profesional desde cero.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card px-4 py-3">
              <p className="text-sm font-semibold text-ink">Iniciar sesion</p>
              <p className="mt-1 text-sm text-ink-soft">Retoma pacientes, consultas y sincronizacion en /login.</p>
            </div>
            <div className="rounded-2xl border border-border bg-card px-4 py-3">
              <p className="text-sm font-semibold text-ink">Crear cuenta</p>
              <p className="mt-1 text-sm text-ink-soft">Define tu perfil profesional en /registro.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
            >
              Ir a iniciar sesion
            </Link>
            <Link
              href="/registro"
              className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50"
            >
              Ir a registro
            </Link>
          </div>
        </article>

        <aside className="order-1 rounded-3xl border border-cyan-100/90 bg-card/80 p-6 shadow-2xl shadow-cyan-900/10 backdrop-blur sm:p-8 lg:order-2">
          <div className="space-y-4">
            <p className="hce-kicker inline-flex rounded-full border border-cyan-900/20 bg-cyan-50 px-4 py-1 text-cyan-900">
              Acceso guiado
            </p>
            <h2 className="text-xl font-semibold text-ink">Un punto de entrada, dos rutas claras</h2>
            <p className="text-sm text-ink-soft">
              Si ya tienes una cuenta, usa el login. Si estás empezando, crea tu perfil y deja listo el tenant.
            </p>
          </div>
          <div className="mt-6 space-y-3">
            <Link
              href="/login"
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-4 text-sm font-medium text-ink transition hover:bg-slate-50"
            >
              <span>Entrar con mi cuenta</span>
              <span className="text-ink-soft">→</span>
            </Link>
            <Link
              href="/registro"
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-4 text-sm font-medium text-ink transition hover:bg-slate-50"
            >
              <span>Crear cuenta nueva</span>
              <span className="text-ink-soft">→</span>
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}

