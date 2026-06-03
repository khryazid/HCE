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

const ROLE_DASHBOARDS: Record<OrgRole, string> = {
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
export const ROUTE_ACCESS: Array<{ prefix: string; roles: OrgRole[]; requiresClinicPlan?: boolean }> = [
  // Owner / Doctor routes (Plan Individual + Clínica)
  { prefix: "/dashboard",     roles: ["owner", "doctor"] },
  // receptionist has conditional access via doctor_settings.receptionist_enabled
  { prefix: "/agenda",        roles: ["owner", "doctor", "assistant", "receptionist"] },
  // clinic_admin must NOT access patient data (CLAUDE.md rule)
  // assistant access is conditional on custom_permissions.can_view_patients
  { prefix: "/pacientes",     roles: ["owner", "doctor", "assistant"] },
  { prefix: "/consultas",     roles: ["owner", "doctor"] },
  { prefix: "/tratamientos",  roles: ["owner", "doctor"] },
  { prefix: "/caja",          roles: ["owner", "doctor", "assistant", "receptionist", "clinic_admin", "lab", "imaging", "surgery"] },
  { prefix: "/ajustes",       roles: ["owner", "doctor", "clinic_admin"] },
  
  // Clinic Admin routes — 100% administrative, NO clinical access (Plan Clínica only)
  { prefix: "/administracion", roles: ["clinic_admin", "owner"], requiresClinicPlan: true },

  // Receptionist routes (Plan Clínica only)
  { prefix: "/recepcion",     roles: ["receptionist"], requiresClinicPlan: true },

  // Department routes — each role accesses ONLY their department (Plan Clínica only)
  { prefix: "/laboratorio",   roles: ["lab"], requiresClinicPlan: true },
  { prefix: "/imagen",        roles: ["imaging"], requiresClinicPlan: true },
  { prefix: "/cirugia",       roles: ["surgery"], requiresClinicPlan: true },

  // References (inter-clinic referrals — Plan Clínica only)
  { prefix: "/referencias",   roles: ["owner", "doctor"], requiresClinicPlan: true },

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
function roleHasRouteAccess(role: OrgRole, pathname: string): boolean {
  // Find the first matching route prefix
  const rule = ROUTE_ACCESS.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/")
  );

  // If no rule exists for this route, allow access (fail open for unlisted routes)
  if (!rule) return true;

  return rule.roles.includes(role);
}

/**
 * Check if a route requires Plan Clínica and whether the org has it.
 */
function routeRequiresClinicPlan(pathname: string): boolean {
  const rule = ROUTE_ACCESS.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/")
  );
  return rule?.requiresClinicPlan === true;
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
function hasRequiredPermissions(
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

type GuardResult =
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
 * @param params.planType - The organization's plan type ('individual' | 'clinica')
 */
export function evaluateRouteGuard(params: {
  hasSession: boolean;
  isActive: boolean;
  subscriptionStatus: string | null | undefined;
  role: OrgRole;
  customPermissions: Record<string, boolean>;
  pathname: string;
  isPlatformAdmin: boolean;
  planType?: "individual" | "clinica";
}): GuardResult {
  const { hasSession, isActive, subscriptionStatus, role, customPermissions, pathname, isPlatformAdmin, planType } = params;

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

  // Step 2.5: Plan type check — routes that require Plan Clínica
  if (routeRequiresClinicPlan(pathname) && planType !== "clinica") {
    const dashboard = getDashboardForRole(role);
    return {
      allowed: false,
      redirect: dashboard,
      reason: `Route '${pathname}' requires Plan Clínica but org has plan '${planType ?? "unknown"}'`,
    };
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

export { ROLE_DASHBOARDS };
export type { GuardResult };
