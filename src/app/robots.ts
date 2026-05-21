import { MetadataRoute } from "next";
import { APP_URL } from "@/lib/constants/app";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || APP_URL;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard/", "/ajustes/", "/agenda/", "/consultas/", "/pacientes/", "/tratamientos/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
