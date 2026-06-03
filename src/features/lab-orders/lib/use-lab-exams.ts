import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";

export interface LabExam {
  id: string;
  clinic_id: string;
  category: string;
  name: string;
  default_price: number;
}

export function useLabExams(clinicId: string) {
  return useQuery({
    queryKey: ["lab-exams", clinicId],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase as any)
        .from("lab_exams")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("category")
        .order("name");

      if (error) throw error;
      return data as LabExam[];
    },
    enabled: !!clinicId,
  });
}

export function useCreateLabExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (exam: Omit<LabExam, "id">) => {
      const supabase = getSupabaseClient();
      const { data, error } = await (supabase as any)
        .from("lab_exams")
        .insert(exam)
        .select()
        .single();
      
      if (error) throw error;
      return data as LabExam;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lab-exams", data.clinic_id] });
    }
  });
}

export function useDeleteLabExam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, clinicId }: { id: string, clinicId: string }) => {
      const supabase = getSupabaseClient();
      const { error } = await (supabase as any)
        .from("lab_exams")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: (_, { clinicId }) => {
      queryClient.invalidateQueries({ queryKey: ["lab-exams", clinicId] });
    }
  });
}
