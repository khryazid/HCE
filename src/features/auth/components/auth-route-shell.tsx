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
      
      {/* LEFT */}
      <div className="gx-auth-left">
        <Link href="/" className="gx-auth-brand">
          <span /> {APP_NAME}
        </Link>

        <div className="gx-auth-form-wrap">
          <div className="gx-s gx-s1">
            <div className="gx-af-kicker">{kicker}</div>
            <h1 className="gx-af-title">{title}</h1>
            <p className="gx-af-sub">{lead}</p>
            {children}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="gx-auth-right">
        <div className="gx-ar-bg" />
        <div className="gx-ar-noise" />
        <div className="gx-ar-content gx-s gx-s2">
          <div className="gx-ar-quote">
            &quot;Desde que usamos Glyphix, registrar la historia clínica dejó de ser una carga para volver a ser una herramienta de diagnóstico. Ahorramos 2 horas al día.&quot;
          </div>
          <div className="gx-ar-author">Dr. Andrés Mejía</div>
          <div className="gx-ar-role">Cardiólogo · Medellín, Colombia</div>
        </div>
      </div>

    </div>
  );
}