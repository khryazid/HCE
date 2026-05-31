import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Database } from "@/types/supabase.types";
import { lastAgendaRealtimeEventAt } from "./use-agenda-realtime";

type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];

/** Sync-3.3: ms de supresión del polling tras un evento Realtime. */
const REALTIME_POLL_SUPPRESSION_MS = 20_000;


import { usePaymentConfig } from "@/lib/use-payment-config";
import { useTenant } from "@/lib/supabase/tenant-context";

export function useAgenda() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const { tenant } = useTenant();

  // Obtener configuración de pagos del médico
  const { data: config = { methods: [], consultationTypes: [] } } = usePaymentConfig(tenant?.clinic_id);

  // Obtener citas
  // refetchInterval → polling cada 30s como respaldo si Realtime no está activo.
  // Sync-3.3: Si Realtime acaba de invalidar la query, la función devuelve false
  //           para suprimir el siguiente tick de polling (evita doble-fetch).
  //           Pasados 20s, vuelve al ciclo normal de 30s.
  const { data: appointments = [], isLoading, refetch } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data;
    },
    refetchInterval: () => {
      // Sync-3.3: suprimir el poll si Realtime actualizó hace menos de 20s
      const msSinceRealtime = Date.now() - lastAgendaRealtimeEventAt.current;
      if (msSinceRealtime < REALTIME_POLL_SUPPRESSION_MS) return false;
      return 30_000;
    },
    refetchOnWindowFocus: true,    // refresca al volver a la pestaña
    staleTime: 15_000,             // considera los datos frescos por 15s
  });

  // Crear cita
  const createMutation = useMutation({
    mutationFn: async (input: AppointmentInsert) => {
      const { data, error } = await supabase
        .from("appointments")
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  // Actualizar cita
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<AppointmentInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("appointments")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  // Eliminar cita
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  return {
    appointments,
    config,
    isLoading,
    refetch,
    createAppointment: createMutation.mutateAsync,
    updateAppointment: updateMutation.mutateAsync,
    deleteAppointment: deleteMutation.mutateAsync,
  };
}
