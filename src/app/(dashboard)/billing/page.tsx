import type { Metadata } from "next";
import BillingView from "@/features/billing/components/billing-view";
import { getPublicPricing } from "@/lib/config";
import { APP_NAME } from "@/lib/constants/app";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: `Facturación | ${APP_NAME}`,
};

export default async function BillingPage() {
  const pricing = await getPublicPricing();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("doctor_id", user.id)
    .single();

  let isAdmin = true; // Por defecto true si no tiene clínica (onboarding/solo practice)
  if (profile?.clinic_id) {
    const { data: ownerRow } = await supabase
      .from("profiles")
      .select("doctor_id")
      .eq("clinic_id", profile.clinic_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: memberRow } = await supabase
      .from("clinic_members")
      .select("role")
      .eq("clinic_id", profile.clinic_id)
      .eq("doctor_id", user.id)
      .maybeSingle();

    isAdmin = (ownerRow?.doctor_id === user.id) || (memberRow?.role === "owner") || (memberRow?.role === "clinic_admin");
  }

  return <BillingView proPrice={pricing.proPrice} isAdmin={isAdmin} />;
}
