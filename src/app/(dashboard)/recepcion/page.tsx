import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import { RecepcionPageClient } from "./page.client";

export const metadata: Metadata = {
  title: `Recepción | ${APP_NAME}`,
};

export default function RecepcionPage() {
  return <RecepcionPageClient />;
}
