import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import { AjustesClient } from "./ajustes-client";

export const metadata: Metadata = {
  title: `Ajustes | ${APP_NAME}`,
};

export default function AjustesPage() {
  return <AjustesClient />;
}
