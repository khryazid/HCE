import LandingClient from "./landing-client";
import { getPublicPricing } from "@/lib/config";

export const revalidate = 3600; // ISR: Revalidate pricing every hour without forcing dynamic rendering

export default async function Page() {
  const pricing = await getPublicPricing();

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Glyphix",
    "operatingSystem": "Web, Windows, macOS, iOS, Android",
    "applicationCategory": "HealthApplication",
    "offers": {
      "@type": "Offer",
      "price": pricing.proPrice.toString(),
      "priceCurrency": "USD"
    },
    "description": "Historia clínica electrónica multiespecialidad con IA, trabajo offline y sincronización automática. Diseñado para médicos modernos.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <LandingClient proPrice={pricing.proPrice} clinicPrice={pricing.clinicPrice} />
    </>
  );
}
