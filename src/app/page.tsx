import LandingClient from "./landing-client";
import { getPublicPricing } from "@/lib/config";

export const dynamic = "force-dynamic"; // We want the pricing to update without redeploying

export default async function Page() {
  const pricing = await getPublicPricing();
  return <LandingClient proPrice={pricing.proPrice} clinicPrice={pricing.clinicPrice} />;
}
