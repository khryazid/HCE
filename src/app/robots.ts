import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://app.glyphmedico.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard/", "/ajustes/", "/agenda/", "/consultas/", "/pacientes/", "/tratamientos/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
