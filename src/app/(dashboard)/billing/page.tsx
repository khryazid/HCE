import type { Metadata } from "next";
import BillingView from "@/features/billing/components/BillingView";
import { getPublicPricing } from "@/lib/config";
import { APP_NAME } from "@/lib/constants/app";

export const metadata: Metadata = {
  title: `Facturación | ${APP_NAME}`,
};

export default async function BillingPage() {
  const pricing = await getPublicPricing();
  return <BillingView proPrice={pricing.proPrice} />;
}
