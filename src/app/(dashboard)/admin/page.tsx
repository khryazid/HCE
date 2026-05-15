import { redirect } from "next/navigation";
import { Suspense } from "react";
import { verifySuperAdmin, getAllUsersWithProfiles, getAbandonedSyncItems } from "@/features/admin/actions";
import { AdminPanelClient } from "./admin-client";

import { getPublicPricing } from "@/lib/config";

export const metadata = {
  title: "Admin Panel | HCE",
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Guard – non-admin users get silently redirected
  try {
    await verifySuperAdmin();
  } catch {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            🛡️ Super Admin Panel
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Gestión de usuarios y suscripciones — acceso exclusivo.
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center p-16 text-ink-soft">
            <span className="animate-pulse">Cargando usuarios...</span>
          </div>
        }
      >
        <AdminDataLayer searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminDataLayer({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const limit = 50;

  const [{ users, stats, totalItems, totalPages }, abandonedItems, pricing] = await Promise.all([
    getAllUsersWithProfiles(page, limit),
    getAbandonedSyncItems(),
    getPublicPricing()
  ]);
  return <AdminPanelClient 
    initialUsers={users} 
    stats={stats} 
    abandonedItems={abandonedItems} 
    pricing={pricing}
    currentPage={page}
    totalPages={totalPages}
    totalItems={totalItems}
  />;
}
