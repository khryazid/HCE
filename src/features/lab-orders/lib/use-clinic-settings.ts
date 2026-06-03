import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";

export interface ClinicSettings {
  clinic_id: string;
  lab_letterhead_url: string | null;
  lab_footer_text: string | null;
  imaging_letterhead_url?: string | null;
  imaging_footer_text?: string | null;
}

export function useClinicSettings(clinicId: string) {
  return useQuery({
    queryKey: ["clinic-settings", clinicId],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase as any)
        .from("clinic_settings")
        .select("*")
        .eq("clinic_id", clinicId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data as ClinicSettings | null;
    },
    enabled: !!clinicId,
  });
}

export function useUpdateClinicSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: ClinicSettings) => {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase as any)
        .from("clinic_settings")
        .upsert(settings)
        .select()
        .single();
      
      if (error) throw error;
      return data as ClinicSettings;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clinic-settings", data.clinic_id] });
    }
  });
}
