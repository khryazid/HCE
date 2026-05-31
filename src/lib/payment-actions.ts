"use server";

import { createClient } from "@supabase/supabase-js";

export async function getClinicPaymentConfigAction(clinicId: string) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the owner of the clinic from clinic_members
    const { data: memberData } = await supabaseAdmin
      .from("clinic_members")
      .select("doctor_id")
      .eq("clinic_id", clinicId)
      .eq("role", "owner")
      .maybeSingle();

    let ownerId = memberData?.doctor_id;

    if (!ownerId) {
      // Fallback in case owner is directly in clinics (future-proofing)
      const { data: cData } = await supabaseAdmin
        .from("clinics")
        .select("owner_user_id")
        .eq("id", clinicId)
        .maybeSingle();
      ownerId = cData?.owner_user_id;
    }

    if (!ownerId) {
      return { config: {} };
    }

    // Get the owner's payment config bypassing RLS
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("payment_config")
      .eq("doctor_id", ownerId)
      .maybeSingle();

    return { config: data?.payment_config || {} };
  } catch (error) {
    console.error("Error fetching payment config for clinic:", error);
    return { config: {} };
  }
}
