import { redirect } from "next/navigation";
import { verifySuperAdmin, getAllUsersWithProfiles } from "@/features/admin/actions";
import { AdminPanelClient } from "./admin-client";
import { Suspense } from "react";

export const metadata = {
  title: "Super Admin Panel | HCE",
};

export default async function AdminPage() {
  try {
    await verifySuperAdmin();
  } catch {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Super Admin Panel</h1>
        <p className="text-ink-soft">Gestión de usuarios y suscripciones (acceso restringido).</p>
      </div>
      
      <Suspense fallback={<div className="p-8 text-center text-ink-soft animate-pulse">Cargando usuarios...</div>}>
        <UserListFetcher />
      </Suspense>
    </div>
  );
}

async function UserListFetcher() {
  const users = await getAllUsersWithProfiles();
  return <AdminPanelClient initialUsers={users} />;
}
