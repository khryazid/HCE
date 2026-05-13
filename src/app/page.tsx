import LandingClient from "./landing-client";
import { getPublicPricing } from "@/lib/config";

export const dynamic = "force-dynamic"; // We want the pricing to update without redeploying

export default async function Page() {
  const pricing = await getPublicPricing();

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Glyph Motor Clínico",
    "operatingSystem": "Web, Windows, macOS, iOS, Android",
    "applicationCategory": "HealthApplication",
    "offers": {
      "@type": "Offer",
      "price": pricing.proPrice.toString(),
      "priceCurrency": "USD"
    },
    "description": "Historia clínica electrónica multiespecialidad con IA, trabajo offline y sincronización automática. Diseñado para médicos modernos.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "89"
    }
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
