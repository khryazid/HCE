import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME } from "@/lib/constants/app";
import "../styles/auth.css";

type AuthRouteShellProps = {
  variant: "login" | "register";
  kicker: string;
  title: string;
  lead: string;
  highlights: Array<{
    title: string;
    description: string;
  }>;
  secondaryAction: {
    href: string;
    label: string;
  };
  children: ReactNode;
};

export function AuthRouteShell({
  variant,
  kicker,
  title,
  lead,
  children,
}: AuthRouteShellProps) {
  return (
    <div className="gx-auth">
      <div className="gx-auth-card gx-s">
        <Link href="/" className="gx-auth-brand">
          <span /> {APP_NAME}
        </Link>

        <div className="gx-auth-header">
          <div className="gx-af-kicker">{kicker}</div>
          <h1 className="gx-af-title">{title}</h1>
          <p className="gx-af-sub">{lead}</p>
        </div>

        {children}
      </div>
    </div>
  );
}