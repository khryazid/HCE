import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Database } from "@/types/supabase.types";
import { lastAgendaRealtimeEventAt } from "./use-agenda-realtime";

type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];

/** Sync-3.3: ms de supresión del polling tras un evento Realtime. */
const REALTIME_POLL_SUPPRESSION_MS = 20_000;


export function useAgenda() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  // Obtener configuración de pagos del médico
  const { data: config = { methods: [], consultationTypes: [] } } = useQuery({
    queryKey: ["payment_config"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { methods: [], consultationTypes: [] };

      const { data } = await supabase
        .from("profiles")
        .select("payment_config")
        .eq("doctor_id", user.id)
        .maybeSingle();
        
      const conf = (data?.payment_config as Record<string, unknown>) || {};
      let methods = [{ name: "Efectivo", details: "" }, { name: "Transferencia", details: "" }];
      let consultationTypes = [{ name: "Consulta General", price: 40 }];

      if (conf.methods && Array.isArray(conf.methods)) {
        methods = conf.methods.map((m: unknown) => typeof m === "string" ? { name: m, details: "" } : m as { name: string; details: string });
      }
      if (conf.consultationTypes && Array.isArray(conf.consultationTypes)) {
        consultationTypes = conf.consultationTypes.map((c: unknown) => typeof c === "string" ? { name: c, price: 0 } : c as { name: string; price: number });
      }

      return { methods, consultationTypes };
    },
  });

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
