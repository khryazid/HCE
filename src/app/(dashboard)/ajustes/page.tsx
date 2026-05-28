import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";
import { AjustesClient } from "./ajustes-client";

export const metadata: Metadata = {
  title: `Ajustes | ${APP_NAME}`,
};

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const isOnboarding = resolvedParams?.onboarding === "true";
  
  return <AjustesClient isOnboarding={isOnboarding} />;
}
