"use client";

import { useTenant } from "@/lib/supabase/tenant-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  roleHasRouteAccess,
  hasRequiredPermissions,
  getDashboardForRole,
} from "@/lib/guards/route-guard";
import type { OrgRole } from "@/lib/supabase/profile";

/**
 * Frontend route guard component.
 * Wraps protected pages to enforce RBAC on the client side.
 * 
 * This is a secondary guard — the middleware handles the primary check.
 * This component provides a better UX by redirecting immediately if
 * the user's role changes or they navigate to a restricted page.
 *
 * Usage:
 *   <RoleGuard allowedRoles={["owner", "doctor"]}>
 *     <PatientsList />
 *   </RoleGuard>
 *
 * Or without specifying roles (uses the route-guard map):
 *   <RoleGuard>{children}</RoleGuard>
 */
export function RoleGuard({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: OrgRole[];
}) {
  const { tenant, loading } = useTenant();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || !tenant) return;

    const role = tenant.role;

    // If specific roles are listed, check against those
    if (allowedRoles && !allowedRoles.includes(role)) {
      router.replace(getDashboardForRole(role));
      return;
    }

    // Otherwise, use the route access map
    if (!roleHasRouteAccess(role, pathname)) {
      router.replace(getDashboardForRole(role));
      return;
    }

    // Check custom permissions (e.g. assistant viewing patients)
    if (!hasRequiredPermissions(role, pathname, tenant.custom_permissions)) {
      router.replace(getDashboardForRole(role));
      return;
    }
  }, [loading, tenant, pathname, router, allowedRoles]);

  // While loading, render nothing (the layout shows a loading state)
  if (loading) return null;

  // If no tenant or not active, the TenantProvider will handle redirect
  if (!tenant || !tenant.is_active) return null;

  return <>{children}</>;
}
