"use client";

import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { ActivityItem } from "@/features/dashboard/components/types";

type Props = { activity: ActivityItem[] };

export function DashboardActivityFeed({ activity }: Props) {
  return (
    <section>
      <div className="gx-sh">
        <h2 className="gx-st">Pacientes recientes</h2>
      </div>
      
      {activity.length === 0 ? (
        <div className="text-sm text-ink-soft italic">Aún no hay actividad reciente.</div>
      ) : (
        <div className="space-y-0">
          {activity.slice(0, 5).map((item) => {
            let timeStr = "";
            try {
              const date = parseISO(item.date);
              timeStr = formatDistanceToNow(date, { locale: es, addSuffix: false });
              timeStr = timeStr.replace("alrededor de ", "").replace(" minutos", "m").replace(" horas", "h").replace(" días", "d").replace("un día", "1d").replace("una hora", "1h").replace("un minuto", "1m");
            } catch (e) {
              timeStr = "hoy";
            }

            return (
              <Link
                key={item.id}
                href={`/pacientes?id=${item.patientId || item.id}`}
                className="gx-act-item hover:bg-bg-soft/50 transition-colors rounded-sm cursor-pointer px-1"
              >
                <span className="gx-act-time">{timeStr}</span>
                <div>
                  <div className="gx-act-text">
                    <strong>Consulta registrada</strong>
                  </div>
                  <div className="gx-act-sub">
                    {item.fullName} {item.lastVisitReason ? `— ${item.lastVisitReason.slice(0, 30)}${item.lastVisitReason.length > 30 ? "..." : ""}` : ""}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
