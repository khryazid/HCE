export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
          Modo offline
        </p>
        <h1 className="mt-3 text-2xl font-bold text-amber-950 sm:text-3xl">
          Sin conexion por ahora
        </h1>
        <p className="mt-4 text-sm leading-7 text-amber-900">
          Puedes seguir trabajando. Los cambios se guardan localmente y se
          sincronizaran cuando vuelva la conexion.
        </p>
      </section>
    </main>
  );
}
