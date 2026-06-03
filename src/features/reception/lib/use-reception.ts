import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

// ═══════════════════════════════════════════════════════════════
// MUTATIONS — Appointment management for receptionists
// ═══════════════════════════════════════════════════════════════

interface CreateAppointmentInput {
  clinic_id: string;
  doctor_id: string;
  patient_id?: string;
  patient_name: string;
  patient_phone?: string;
  patient_document?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  consultation_type?: string;
  notes?: string;
  created_by_member_id?: string;
}

/**
 * Create an appointment from the receptionist view.
 * Checks vacation mode — if the target doctor is on vacation and has a
 * redirect configured, the appointment is created for the redirect doctor instead.
 * 
 * Returns { data, redirected, redirectedTo } so the UI can notify.
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAppointmentInput & { organizationId?: string }) => {
      const supabase = getSupabaseClient();

      let targetDoctorId = input.doctor_id;
      let redirected = false;
      let redirectedToName: string | null = null;

      // ── Vacation mode check ──
      // Look up doctor_settings for the target doctor
      if (input.organizationId) {
        try {
          const { data: memberData } = await supabase
            .from("clinic_members")
            .select("id, doctor_id")
            .eq("clinic_id", input.organizationId)
            .eq("doctor_id", input.doctor_id)
            .eq("is_active", true)
            .maybeSingle();

          if (memberData) {
            const { data: settings } = await (supabase as any)
              .from("doctor_settings")
              .select("vacation_mode, vacation_redirect_member_id")
              .eq("member_id", memberData.id)
              .maybeSingle();

            if (settings?.vacation_mode && settings?.vacation_redirect_member_id) {
              // Find the redirect doctor's auth user_id
              const { data: redirectMember } = await supabase
                .from("clinic_members")
                .select("doctor_id")
                .eq("id", settings.vacation_redirect_member_id)
                .eq("is_active", true)
                .maybeSingle();

              if (redirectMember) {
                targetDoctorId = redirectMember.doctor_id;
                redirected = true;

                // Get the redirect doctor's name for UI notification
                const { data: redirectProfile } = await supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("doctor_id", redirectMember.doctor_id)
                  .maybeSingle();

                redirectedToName = redirectProfile?.full_name ?? null;
              }
            }
          }
        } catch {
          // If vacation check fails, proceed with original doctor
        }
      }

      // Compute end_time from start_time + duration
      const durationMs = (input.duration_minutes ?? 30) * 60 * 1000;
      const startDate = new Date(input.start_time);
      const computedEndTime = input.end_time ?? new Date(startDate.getTime() + durationMs).toISOString();

      const { data, error } = await (supabase as any)
        .from("appointments")
        .insert({
          clinic_id: input.clinic_id,
          doctor_id: targetDoctorId, // May be redirected
          patient_id: input.patient_id,
          patient_name: input.patient_name,
          patient_phone: input.patient_phone ?? null,
          patient_document: input.patient_document ?? null,
          start_time: input.start_time,
          end_time: computedEndTime,
          duration_minutes: input.duration_minutes ?? 30,
          consultation_type: input.consultation_type ?? "consulta",
          notes: redirected
            ? `${input.notes ?? ""}\n[Redirigida por modo vacaciones de Dr. original]`.trim()
            : (input.notes ?? null),
          status: "scheduled",
          created_by_member_id: input.created_by_member_id ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, redirected, redirectedToName };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["receptionist-appointments", variables.clinic_id],
      });
    },
  });
}

/**
 * Update an existing appointment's status or details.
 */
export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        status?: string;
        notes?: string;
        start_time?: string;
        end_time?: string;
        patient_name?: string;
        patient_phone?: string;
      };
    }) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptionist-appointments"] });
    },
  });
}

/**
 * Cancel an appointment from the receptionist view.
 */
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptionist-appointments"] });
    },
  });
}
