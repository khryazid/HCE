"use client";

/**
 * components/ui/empty-state.tsx
 *
 * Componente reutilizable de estado vacío con icono SVG, título,
 * descripción opcional y CTA opcional. Reemplaza los inline
 * "<p className='text-ink-soft'>No hay datos...</p>" dispersos.
 */

type EmptyStateProps = {
  /** Icono SVG a renderizar en el centro. Por defecto: folder vacío. */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Tamaño del área: "sm" = compacto, "md" = normal (default), "lg" = página completa */
  size?: "sm" | "md" | "lg";
};

const PADDING: Record<NonNullable<EmptyStateProps["size"]>, string> = {
  sm: "py-6 px-4",
  md: "py-12 px-6",
  lg: "py-20 px-8",
};

const ICON_SIZE: Record<NonNullable<EmptyStateProps["size"]>, string> = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

export function EmptyStateIconPatients() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function EmptyStateIconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function EmptyStateIconConsultations() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}



// ─── Component ────────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = "md",
}: EmptyStateProps) {
  const padding = PADDING[size];
  const iconSize = ICON_SIZE[size];

  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-4 text-center ${padding}`}
    >
      {icon ? (
        <div
          className={`${iconSize} rounded-2xl bg-bg-soft p-2 text-ink-soft flex items-center justify-center`}
        >
          <span className="h-full w-full">{icon}</span>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description ? (
          <p className="max-w-xs text-xs text-ink-soft">{description}</p>
        ) : null}
      </div>

      {action ? <div>{action}</div> : null}
    </div>
  );
}


