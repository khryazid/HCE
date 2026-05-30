import type { Metadata } from "next";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants/app";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  LogOut,
  Shield,
} from "lucide-react";

export const metadata: Metadata = {
  title: `${APP_NAME} — Administración de Plataforma`,
  robots: { index: false, follow: false },
};

/**
 * Platform Admin Layout
 *
 * Guard: Only users with is_platform_admin=true can access /platform/*.
 * The middleware also checks this, but this layout provides a server-side
 * double-check plus the admin-specific navigation chrome.
 */
export default async function PlatformLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Server-side guard: verify platform admin status
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_platform_admin, full_name")
    .eq("doctor_id", user.id)
    .maybeSingle();

  if (!profileData || !profileData.is_platform_admin) {
    redirect("/dashboard");
  }

  const adminName = profileData?.full_name || "Admin";

  const navItems = [
    { href: "/platform/panel", label: "Dashboard", icon: LayoutDashboard },
    { href: "/platform/organizations", label: "Organizaciones", icon: Building2 },
    { href: "/platform/users", label: "Usuarios", icon: Users },
    { href: "/platform/subscriptions", label: "Suscripciones", icon: CreditCard },
  ];

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-border">
          <Shield className="w-6 h-6 text-accent" />
          <div>
            <p className="font-display text-sm font-bold tracking-tight text-ink">
              {APP_NAME}
            </p>
            <p className="text-xs text-ink-faint uppercase tracking-wider font-semibold">
              Plataforma
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-soft hover:bg-bg-soft hover:text-ink transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Admin info */}
        <div className="px-4 py-4 border-t border-border">
          <p className="text-xs text-ink-faint truncate">{adminName}</p>
          <Link
            href="/login"
            className="flex items-center gap-2 mt-2 text-xs text-ink-soft hover:text-ink transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Cerrar sesión
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto w-full max-w-[1440px]">{children}</div>
      </main>
    </div>
  );
}
