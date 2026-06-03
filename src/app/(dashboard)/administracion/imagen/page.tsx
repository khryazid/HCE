import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import { ImagenAdminClient } from "./page.client";

export const metadata: Metadata = {
  title: `Admin Imagenología | ${APP_NAME}`,
};

export default function ImagenAdminPage() {
  return <ImagenAdminClient />;
}
