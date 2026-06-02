import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";

interface DoctorWithSettings {
  id: string;
  role: string;
  doctor_id: string;
  doctor_settings: {
    receptionist_enabled: boolean;
    vacation_mode: boolean;
    vacation_redirect_member_id: string | null;
  }[] | null;
  profiles: {
    full_name: string;
    specialty: string[];
  } | null;
}

/**
 * Fetch doctors in the organization that have receptionist_enabled = true.
 * Used by /recepcion dashboard to show which doctors' agendas are visible.
 */
export function useReceptionistDoctors(organizationId: string) {
  return useQuery({
    queryKey: ["receptionist-doctors", organizationId],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      
      // Get all doctor/owner members with their doctor_settings
      const { data, error } = await supabase
        .from("clinic_members")
        .select(`
          id,
          role,
          doctor_id,
          doctor_settings (
            receptionist_enabled,
            vacation_mode,
            vacation_redirect_member_id
          )
        `)
        .eq("clinic_id", organizationId)
        .in("role", ["owner", "doctor"])
        .eq("is_active", true);

      if (error) throw error;

      // Now fetch profiles for these doctors
      const doctorIds = (data ?? []).map((m) => m.doctor_id);
      if (doctorIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("doctor_id, full_name, specialty")
        .in("doctor_id", doctorIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.doctor_id, p])
      );

      return (data ?? [])
        .map((member) => ({
          ...member,
          profiles: profileMap.get(member.doctor_id) ?? null,
          // Flatten doctor_settings (it's an array from the join, take first)
          settings: Array.isArray(member.doctor_settings)
            ? member.doctor_settings[0] ?? null
            : null,
        }))
        .filter((m) => m.settings?.receptionist_enabled === true);
    },
    enabled: !!organizationId,
  });
}

/**
 * Fetch appointments for a specific doctor, for the receptionist view.
 */
export function useDoctorAppointments(clinicId: string, doctorId: string | null) {
  return useQuery({
    queryKey: ["receptionist-appointments", clinicId, doctorId],
    queryFn: async () => {
      if (!doctorId) return [];
      const supabase = getSupabaseClient();

      // Get today's start and end
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("doctor_id", doctorId)
        .gte("start_time", today.toISOString())
        .lt("start_time", tomorrow.toISOString())
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clinicId && !!doctorId,
    refetchInterval: 30_000, // Auto-refresh every 30s for live agenda
  });
}
