import BillingView from "@/features/billing/components/BillingView";
import { getPublicPricing } from "@/lib/config";

export default async function BillingPage() {
  const pricing = await getPublicPricing();
  return <BillingView proPrice={pricing.proPrice} />;
}
