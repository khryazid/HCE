import { createClient } from "@supabase/supabase-js";

// Uses service_role to bypass RLS and read app_config.
// Only returns safe public configuration keys.
export async function getPublicPricing() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { proPrice: 29, clinicPrice: 99 }; // fallback
  }
  
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data } = await admin
    .from("app_config")
    .select("key, value")
    .in("key", ["plan_pro_price", "plan_clinic_price"]);

  let proPrice = 29;
  let clinicPrice = 99;

  if (data) {
    for (const row of data) {
      if (row.key === "plan_pro_price") proPrice = parseInt(row.value, 10);
      if (row.key === "plan_clinic_price") clinicPrice = parseInt(row.value, 10);
    }
  }

  return { proPrice, clinicPrice };
}
