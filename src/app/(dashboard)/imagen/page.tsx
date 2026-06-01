import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import { ImagenPageClient } from "./page.client";

export const metadata: Metadata = {
  title: `Imagenología | ${APP_NAME}`,
};

export default function ImagenPage() {
  return <ImagenPageClient />;
}
