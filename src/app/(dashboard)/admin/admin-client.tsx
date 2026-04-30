"use client";

import { useState } from "react";
import { type AdminUserRecord, setSubscriptionStatus } from "@/features/admin/actions";
import { toast } from "react-hot-toast";

export function AdminPanelClient({ initialUsers }: { initialUsers: AdminUserRecord[] }) {
  const [users, setUsers] = useState<AdminUserRecord[]>(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      setLoadingId(userId);
      await setSubscriptionStatus(userId, newStatus);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_status: newStatus } : u));
      toast.success("Suscripción actualizada correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar suscripción");
    } finally {
      setLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Activo</span>;
      case "lifetime":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Lifetime</span>;
      case "inactive":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Inactivo</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{status || "None"}</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-[#1a1f26] rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-bg-soft text-ink-soft border-b border-border">
            <tr>
              <th className="px-6 py-4 font-semibold">Doctor</th>
              <th className="px-6 py-4 font-semibold">Email</th>
              <th className="px-6 py-4 font-semibold">Fecha Registro</th>
              <th className="px-6 py-4 font-semibold">Estado Actual</th>
              <th className="px-6 py-4 font-semibold text-right">Acciones (Cambiar Plan)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-bg-soft/50 transition-colors">
                <td className="px-6 py-4 font-medium text-ink">
                  {user.full_name}
                </td>
                <td className="px-6 py-4 text-ink-soft">
                  {user.email}
                </td>
                <td className="px-6 py-4 text-ink-soft">
                  {new Date(user.created_at).toLocaleDateString("es-ES")}
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(user.subscription_status)}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <select 
                    disabled={loadingId === user.id}
                    className="hce-input text-xs py-1 px-2 w-auto inline-block bg-transparent"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleStatusChange(user.id, e.target.value);
                      }
                    }}
                  >
                    <option value="" disabled>Seleccionar acción...</option>
                    <option value="active">Activar Normal (Active)</option>
                    <option value="lifetime">Dar Lifetime Especial</option>
                    <option value="inactive">Marcar Inactivo</option>
                  </select>
                  {loadingId === user.id && <span className="text-teal-600 animate-pulse text-xs">...</span>}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-ink-soft">
                  No se encontraron usuarios registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
