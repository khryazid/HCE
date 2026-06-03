import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import { ImagenAjustesClient } from "./imagen-ajustes-client";

export const metadata: Metadata = {
  title: `Ajustes de Imagenología | ${APP_NAME}`,
};

export default function ImagenAjustesPage() {
  return <ImagenAjustesClient />;
}
