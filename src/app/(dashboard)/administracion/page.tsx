import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import { ClinicDashboardClient } from "./page.client";

export const metadata: Metadata = {
  title: `Dashboard Clínico | ${APP_NAME}`,
};

export default function ClinicDashboardPage() {
  return <ClinicDashboardClient />;
}
