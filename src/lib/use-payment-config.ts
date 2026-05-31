import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";

export function usePaymentConfig(clinicId?: string) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ["payment_config", clinicId],
    queryFn: async () => {
      let targetClinicId = clinicId;

      if (!targetClinicId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { methods: [], consultationTypes: [] };
        
        const { data: pData } = await supabase.from("profiles").select("clinic_id").eq("doctor_id", user.id).maybeSingle();
        targetClinicId = pData?.clinic_id;
      }

      if (!targetClinicId) return { methods: [], consultationTypes: [] };

      const { data: cData } = await supabase.from("clinics").select("owner_user_id").eq("id", targetClinicId).maybeSingle();
      if (!cData?.owner_user_id) return { methods: [], consultationTypes: [] };

      const { data } = await supabase
        .from("profiles")
        .select("payment_config")
        .eq("doctor_id", cData.owner_user_id)
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
