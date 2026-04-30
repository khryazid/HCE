import { redirect } from "next/navigation";
import { Suspense } from "react";
import { verifySuperAdmin, getAllUsersWithProfiles } from "@/features/admin/actions";
import { AdminPanelClient } from "./admin-client";

export const metadata = {
  title: "Admin Panel | HCE",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
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
        <AdminDataLayer />
      </Suspense>
    </div>
  );
}

async function AdminDataLayer() {
  const { users, stats } = await getAllUsersWithProfiles();
  return <AdminPanelClient initialUsers={users} stats={stats} />;
}
