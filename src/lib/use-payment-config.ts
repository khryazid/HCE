import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";

export function usePaymentConfig(doctorId?: string) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ["payment_config", doctorId],
    queryFn: async () => {
      let targetDoctorId = doctorId;

      if (!targetDoctorId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { methods: [], consultationTypes: [] };
        targetDoctorId = user.id;
      }

      const { data } = await supabase
        .from("profiles")
        .select("payment_config")
        .eq("doctor_id", targetDoctorId)
        .maybeSingle();
        
      const conf = (data?.payment_config as Record<string, unknown>) || {};
      let methods = [{ name: "Efectivo", details: "" }, { name: "Transferencia", details: "" }];
      let consultationTypes: { name: string; price: number; duration?: number }[] = [{ name: "Consulta General", price: 40, duration: 60 }];

      if (conf.methods && Array.isArray(conf.methods)) {
        methods = conf.methods.map((m: unknown) => typeof m === "string" ? { name: m, details: "" } : m as { name: string; details: string });
      }
      if (conf.consultationTypes && Array.isArray(conf.consultationTypes)) {
        consultationTypes = conf.consultationTypes.map((c: unknown) => typeof c === "string" ? { name: c, price: 0, duration: 60 } : c as { name: string; price: number; duration?: number });
      }

      return { methods, consultationTypes };
    },
  });
}
