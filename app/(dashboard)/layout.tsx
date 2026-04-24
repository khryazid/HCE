import Link from "next/link";
import { LogoutButton } from "@/components/ui/logout-button";
import { DashboardOnboardingGuard } from "@/components/ui/dashboard-onboarding-guard";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 sm:p-6 lg:p-8">
      <div className="mt-4">
        <DashboardOnboardingGuard />
      </div>
      <header className="mt-4 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Navegacion privada
            </p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900">
              Dashboard clinico
            </h1>
          </div>

          <nav className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Inicio
            </Link>
            <Link
              href="/pacientes"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Pacientes
            </Link>
            <Link
              href="/consultas"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Consultas
            </Link>
            <Link
              href="/especialidades"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Especialidades
            </Link>
            <Link
              href="/tratamientos"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Tratamientos
            </Link>
            <Link
              href="/onboarding"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Perfil
            </Link>
            <Link
              href="/ajustes"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Ajustes
            </Link>
          </nav>

          <LogoutButton />
        </div>
      </header>

      <main className="mt-4 flex-1 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
}
