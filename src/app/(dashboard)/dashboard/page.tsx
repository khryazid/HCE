import type { Metadata } from "next";
import DashboardView from "@/features/dashboard/components/dashboard-view";
import { APP_NAME } from "@/lib/constants/app";

export const metadata: Metadata = {
  title: `Inicio | ${APP_NAME}`,
};

export default function DashboardPage() {
  return <DashboardView />;
}
