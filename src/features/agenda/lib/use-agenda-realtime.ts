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
    if (!tenant?.doctor_id) return;

    const doctorId = tenant.doctor_id;
    const key = `appointments:doctor:${doctorId}`;

    realtimeChannelManager.acquire(key, (ch) =>
      ch
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "appointments",
            filter: `doctor_id=eq.${doctorId}`,
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
  }, [tenant?.doctor_id, queryClient]);
}
