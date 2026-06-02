import { isSameDay, parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import type { Database } from "@/types/supabase.types";

type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

function initials(name: string | null) {
  if (!name) return "—";
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function avClass(s: string) {
  return s === "completed" ? "gx-av-done" : s === "scheduled" ? "gx-av-up" : "gx-av-free";
}

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
    <section>
      <div className="gx-sh">
        <h2 className="gx-st">Agenda del día</h2>
        <span className="gx-sc">{completed} de {total} completadas</span>
      </div>
      <div className="gx-tl">
        {todayAppointments.length === 0 ? (
          <div className="text-sm text-ink-soft italic py-4">No tienes citas programadas para hoy.</div>
        ) : (
          todayAppointments.map((app) => {
            const start = parseISO(app.start_time);
            const isPast = start.getTime() < today.getTime() && app.status === "scheduled";
            const isCompleted = app.status === "completed";
            const isNext = !isPast && !isCompleted; // Idealmente el más cercano
            
            // Custom avatar class logic
            let sClass = "up";
            if (isCompleted) sClass = "done";
            if (isPast && !isCompleted) sClass = "active"; // Highlight past but not completed as active/overdue

            return (
              <div key={app.id} className={`gx-tl-slot ${sClass === "active" ? "gx-tl-active" : ""}`}>
                <span className="gx-tl-time">{format(start, "HH:mm")}</span>
                <div className="gx-tl-body">
                  <div className={`gx-av ${avClass(app.status)}`}>{initials(app.patient_name)}</div>
                  <div className="gx-tl-info">
                    <div className={`gx-tl-name${isCompleted ? " gx-tl-name-done" : ""}`}>
                      {app.patient_name || "Disponible"}
                    </div>
                    {app.notes && <div className="gx-tl-reason">{app.notes}</div>}
                  </div>
                  {app.consultation_type && (
                    <span className="gx-tl-tag gx-tag-ctrl">{app.consultation_type}</span>
                  )}
                  {app.status === "scheduled" && (
                    <Link 
                      href={`/consultas?appointmentId=${app.id}&patientName=${encodeURIComponent(app.patient_name || "")}${app.patient_document ? `&patientDoc=${encodeURIComponent(app.patient_document)}` : ""}${app.patient_birth_date ? `&patientBirth=${encodeURIComponent(app.patient_birth_date)}` : ""}`}
                      className="ml-2 text-xs font-semibold text-accent hover:underline shrink-0"
                    >
                      Iniciar
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
