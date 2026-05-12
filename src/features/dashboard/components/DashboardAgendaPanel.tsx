import { isSameDay, parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import type { Database } from "@/types/supabase.types";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

export function DashboardAgendaPanel({
  appointments,
}: {
  appointments: AppointmentRow[];
}) {
  const today = new Date();

  // Filtramos solo las citas de hoy
  const todayAppointments = appointments
    .filter((app) => isSameDay(parseISO(app.start_time), today))
    .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime());

  const completed = todayAppointments.filter((a) => a.status === "completed").length;
  const total = todayAppointments.length;

  return (
    <article
      className="flex h-[420px] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
      aria-label="Agenda del Día"
    >
      <header className="flex items-center justify-between border-b border-border bg-bg-soft/50 p-5">
        <div>
          <h2 className="text-sm font-bold text-ink">Agenda del Día</h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            {total === 0
              ? "Sin citas programadas"
              : `${completed} de ${total} completadas`}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-2">
        {todayAppointments.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-soft text-ink-soft">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-ink">Agenda despejada</p>
            <p className="mt-1 text-xs text-ink-soft">
              No tienes citas programadas para el día de hoy.
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {todayAppointments.map((app) => {
              const start = parseISO(app.start_time);
              const isPast = start.getTime() < today.getTime() && app.status === "scheduled";
              const isCompleted = app.status === "completed";

              return (
                <li
                  key={app.id}
                  className={`flex items-center gap-4 rounded-xl p-3 transition-colors ${
                    isCompleted
                      ? "opacity-60 bg-transparent"
                      : "bg-bg-soft/50 hover:bg-bg-soft"
                  }`}
                >
                  <div className="flex flex-col items-end shrink-0 w-14">
                    <span className="text-sm font-bold text-ink">
                      {format(start, "HH:mm")}
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-ink-soft">
                      {app.consultation_type || "Consulta"}
                    </span>
                  </div>

                  {/* Status Indicator Line */}
                  <div className={`w-1 self-stretch rounded-full ${
                    isCompleted
                      ? "bg-teal-500"
                      : isPast
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`} />

                  <div className="flex-1 min-w-0">
                    <p className={`truncate text-sm font-semibold ${isCompleted ? "line-through text-ink-soft" : "text-ink"}`}>
                      {app.patient_name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        isCompleted 
                          ? "bg-teal-500/10 text-teal-700" 
                          : app.status === "cancelled"
                          ? "bg-red-500/10 text-red-700"
                          : app.status === "no_show"
                          ? "bg-purple-500/10 text-purple-700"
                          : isPast
                          ? "bg-amber-500/10 text-amber-700"
                          : "bg-blue-500/10 text-blue-700"
                      }`}>
                        {app.status === "completed" ? "Atendido" :
                         app.status === "scheduled" ? (isPast ? "Atrasado" : "Pendiente") :
                         app.status === "no_show" ? "No asistió" : "Cancelado"}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
}
