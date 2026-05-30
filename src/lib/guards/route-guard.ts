/**
 * src/lib/guards/route-guard.ts
 *
 * Central route authorization logic for the RBAC system.
 * Implements the 4-step guard as specified in the project memory:
 *
 *   1. Session valid?         → /login
 *   2. Active org member?     → /sin-plan
 *   3. Role has route access? → redirect to role's dashboard
 *   4. Custom permissions?    → 403
 *
 * Used by both the middleware (server-side) and frontend guards.
 */

import type { OrgRole } from "@/lib/supabase/profile";

// ═══════════════════════════════════════════════════════════════
// ROLE → DEFAULT DASHBOARD MAP
// ═══════════════════════════════════════════════════════════════

export const ROLE_DASHBOARDS: Record<OrgRole, string> = {
  owner:        "/dashboard",
  doctor:       "/dashboard",
  assistant:    "/agenda",
  clinic_admin: "/administracion",
  receptionist: "/recepcion",
  lab:          "/laboratorio",
  imaging:      "/imagen",
  surgery:      "/cirugia",
};

// ═══════════════════════════════════════════════════════════════
// ROUTE ACCESS MAP — which roles can access which route prefixes
// ═══════════════════════════════════════════════════════════════

/**
 * Maps route prefixes to the set of roles that can access them.
 * Order matters — first match wins.
 * If a route prefix is not listed here, it's accessible by all authenticated users.
 */
const ROUTE_ACCESS: Array<{ prefix: string; roles: OrgRole[] }> = [
  // Owner (Plan Individual) routes
  { prefix: "/dashboard",     roles: ["owner", "doctor"] },
  { prefix: "/agenda",        roles: ["owner", "doctor", "assistant"] },
  { prefix: "/pacientes",     roles: ["owner", "doctor", "clinic_admin"] },
  { prefix: "/consultas",     roles: ["owner", "doctor"] },
  { prefix: "/tratamientos",  roles: ["owner", "doctor"] },
  { prefix: "/caja",          roles: ["owner", "doctor", "assistant", "clinic_admin", "lab", "imaging", "surgery"] },
  { prefix: "/ajustes",       roles: ["owner", "doctor", "clinic_admin"] },
  
  // Clinic Admin routes
  { prefix: "/administracion", roles: ["clinic_admin", "owner"] },

  // Receptionist routes
  { prefix: "/recepcion",     roles: ["receptionist"] },

  // Lab routes
  { prefix: "/laboratorio",   roles: ["owner", "doctor", "lab"] },

  // Imaging routes
  { prefix: "/imagen",        roles: ["imaging"] },

  // Surgery routes
  { prefix: "/cirugia",       roles: ["surgery"] },

  // References (inter-clinic referrals)
  { prefix: "/referencias",   roles: ["owner", "doctor"] },

  // Docs/Manual — accessible by all roles
  { prefix: "/docs",          roles: ["owner", "doctor", "assistant", "clinic_admin", "receptionist", "lab", "imaging", "surgery"] },

  // Billing
  { prefix: "/billing",       roles: ["owner", "clinic_admin"] },

  // Onboarding
  { prefix: "/onboarding",    roles: ["owner", "doctor", "assistant", "clinic_admin", "receptionist", "lab", "imaging", "surgery"] },
];

/**
 * Check if a given role has access to a specific route.
 * Returns true if the role is allowed, false otherwise.
 */
export function roleHasRouteAccess(role: OrgRole, pathname: string): boolean {
  // Find the first matching route prefix
  const rule = ROUTE_ACCESS.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/")
  );

  // If no rule exists for this route, allow access (fail open for unlisted routes)
  if (!rule) return true;

  return rule.roles.includes(role);
}

/**
 * Given a role, return the default dashboard path to redirect to.
 */
export function getDashboardForRole(role: OrgRole): string {
  return ROLE_DASHBOARDS[role] || "/dashboard";
}

// ═══════════════════════════════════════════════════════════════
// CUSTOM PERMISSION CHECKS
// ═══════════════════════════════════════════════════════════════

/**
 * Routes that require specific custom_permissions in the JSONB column.
 * Key: route prefix. Value: required permission key.
 */
const PERMISSION_REQUIRED_ROUTES: Array<{
  prefix: string;
  role: OrgRole;
  permission: string;
}> = [
  // Assistants need can_view_patients to access /pacientes
  { prefix: "/pacientes", role: "assistant", permission: "can_view_patients" },
];

/**
 * Check if custom permissions allow access to a route for a given role.
 * Returns true if no extra permission is needed, or if the permission is granted.
 */
export function hasRequiredPermissions(
  role: OrgRole,
  pathname: string,
  customPermissions: Record<string, boolean>
): boolean {
  const rule = PERMISSION_REQUIRED_ROUTES.find(
    (r) =>
      r.role === role &&
      (pathname === r.prefix || pathname.startsWith(r.prefix + "/"))
  );

  if (!rule) return true;

  return customPermissions[rule.permission] === true;
}

// ═══════════════════════════════════════════════════════════════
// FULL 4-STEP GUARD (for use in server components / middleware)
// ═══════════════════════════════════════════════════════════════

export type GuardResult =
  | { allowed: true }
  | { allowed: false; redirect: string; reason: string }
  | { allowed: false; status: 403; reason: string };

/**
 * Executes the 4-step route guard.
 *
 * @param params.hasSession - Whether the user has a valid session
 * @param params.isActive - Whether the org membership is active
 * @param params.subscriptionStatus - The org's subscription status
 * @param params.role - The user's role in the organization
 * @param params.customPermissions - JSONB custom permissions
 * @param params.pathname - The requested route
 * @param params.isPlatformAdmin - Whether the user is a platform admin
 */
export function evaluateRouteGuard(params: {
  hasSession: boolean;
  isActive: boolean;
  subscriptionStatus: string | null | undefined;
  role: OrgRole;
  customPermissions: Record<string, boolean>;
  pathname: string;
  isPlatformAdmin: boolean;
}): GuardResult {
  const { hasSession, isActive, subscriptionStatus, role, customPermissions, pathname, isPlatformAdmin } = params;

  // Platform admin accessing /platform/* routes — always allowed
  if (isPlatformAdmin && pathname.startsWith("/platform")) {
    return { allowed: true };
  }

  // Step 1: Session check
  if (!hasSession) {
    return { allowed: false, redirect: "/login", reason: "No active session" };
  }

  // Platform admin goes directly to /platform/panel
  if (isPlatformAdmin && !pathname.startsWith("/platform")) {
    // Allow platform admin to access regular routes too
    // They might need to view the app
  }

  // Step 2: Active org member + subscription check
  if (!isActive) {
    return { allowed: false, redirect: "/sin-plan", reason: "Organization membership is not active" };
  }

  if (subscriptionStatus === "cancelled" || subscriptionStatus === "canceled") {
    return { allowed: false, redirect: "/sin-plan", reason: "Subscription is cancelled" };
  }

  // Step 3: Role-based route access
  if (!roleHasRouteAccess(role, pathname)) {
    const dashboard = getDashboardForRole(role);
    return {
      allowed: false,
      redirect: dashboard,
      reason: `Role '${role}' does not have access to '${pathname}'`,
    };
  }

  // Step 4: Custom permissions check
  if (!hasRequiredPermissions(role, pathname, customPermissions)) {
    return {
      allowed: false,
      status: 403,
      reason: `Missing required permission for '${pathname}'`,
    };
  }

  return { allowed: true };
}
