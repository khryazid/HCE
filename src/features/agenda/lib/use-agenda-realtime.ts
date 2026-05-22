/**
 * use-agenda-realtime.ts — Sync-3.3 + Sync-3.4
 *
 * Supabase Realtime subscription for the appointments table.
 * Any INSERT / UPDATE / DELETE from any session (assistant, another device)
 * auto-refreshes the calendar without a page reload.
 *
 * Sync-3.4: usa realtimeChannelManager para no duplicar canales en re-mounts.
 * Sync-3.3: exporta lastAgendaRealtimeEventAt para que use-agenda.ts pueda
 *           suprimir el polling de 30s durante los 20s posteriores a un evento
 *           Realtime (evita doble-fetch innecesario).
 *
 * F-13: Fix — filtro cambiado de doctor_id a clinic_id para capturar eventos
 * de citas creadas por asistentes u otros doctores de la misma clínica.
 * La canal key también usa clinic_id para no duplicar canales entre doctores
 * de la misma clínica que montan el componente en sesiones diferentes.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TenantProfile } from "@/lib/supabase/profile";
import { realtimeChannelManager } from "@/lib/supabase/realtime-channel-manager";

/**
 * Sync-3.3: Timestamp del último evento Realtime recibido.
 * Compartido como ref mutable fuera del componente para que
 * use-agenda.ts pueda leerlo sin prop drilling.
 */
export const lastAgendaRealtimeEventAt = { current: 0 };

export function useAgendaRealtime(tenant: TenantProfile | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenant?.clinic_id) return;

    const clinicId = tenant.clinic_id;
    // F-13: clave por clinic_id — todos los doctores de la misma clínica
    // comparten el canal, reduciendo conexiones Realtime concurrentes.
    const key = `appointments:clinic:${clinicId}`;

    realtimeChannelManager.acquire(key, (ch) =>
      ch
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "appointments",
            // F-13: filtrar por clinic_id en lugar de doctor_id para capturar
            // citas de asistentes y otros doctores de la misma clínica.
            filter: `clinic_id=eq.${clinicId}`,
          },
          () => {
            // Sync-3.3: registrar timestamp para suprimir el próximo tick de polling
            lastAgendaRealtimeEventAt.current = Date.now();
            queryClient.invalidateQueries({ queryKey: ["appointments"] });
          },
        )
        .subscribe()
    );

    return () => {
      realtimeChannelManager.release(key);
    };
  }, [tenant?.clinic_id, queryClient]);
}
