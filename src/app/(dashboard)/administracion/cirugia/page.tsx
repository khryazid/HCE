import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import { CirugiaAdminClient } from "./page.client";

export const metadata: Metadata = {
  title: `Admin Cirugía | ${APP_NAME}`,
};

export default function CirugiaAdminPage() {
  return <CirugiaAdminClient />;
}
