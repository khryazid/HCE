"use client";

/**
 * Reusable skeleton primitives for loading states.
 * Use these to compose page-specific loading layouts.
 */

function shimmerClass() {
  return "animate-pulse rounded-xl bg-slate-200";
}

export function SkeletonLine({ width = "100%", height = "0.875rem" }: { width?: string; height?: string }) {
  return <div className={shimmerClass()} style={{ width, height }} />;
}

export function SkeletonBlock({ height = "5rem" }: { height?: string }) {
  return <div className={shimmerClass()} style={{ height, width: "100%" }} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <SkeletonLine width="40%" height="1rem" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? "60%" : "90%"} />
      ))}
    </div>
  );
}

/* ── Page-specific skeletons ─────────────────────────────── */

export function DashboardSkeleton() {
  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-4">
        <SkeletonLine width="8rem" height="0.75rem" />
        <SkeletonLine width="16rem" height="1.75rem" />
        <SkeletonLine width="24rem" />
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <SkeletonLine width="60%" height="0.65rem" />
            <SkeletonLine width="3rem" height="1.5rem" />
          </div>
        ))}
      </div>

      {/* Activity */}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <SkeletonLine width="10rem" height="0.875rem" />
          {[1, 2, 3].map((i) => (
            <SkeletonBlock key={i} height="4.5rem" />
          ))}
        </div>
        <SkeletonCard lines={4} />
      </div>
    </section>
  );
}

export function ConsultasSkeleton() {
  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <SkeletonLine width="14rem" height="1.5rem" />
          <SkeletonLine width="22rem" />
        </div>
        <SkeletonLine width="8rem" height="2.5rem" />
      </div>

      {/* Wizard placeholder */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <SkeletonLine width="8rem" height="1rem" />
        <SkeletonBlock height="3rem" />
        <SkeletonBlock height="6rem" />
        <div className="flex gap-2">
          <SkeletonLine width="5rem" height="2.25rem" />
          <SkeletonLine width="5rem" height="2.25rem" />
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <SkeletonLine width="14rem" height="1rem" />
        <SkeletonBlock height="3rem" />
        {[1, 2].map((i) => (
          <SkeletonBlock key={i} height="5rem" />
        ))}
      </div>
    </section>
  );
}

export function PacientesSkeleton() {
  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 space-y-3">
        <SkeletonLine width="10rem" height="0.65rem" />
        <SkeletonLine width="10rem" height="1.75rem" />
        <SkeletonLine width="24rem" />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <SkeletonLine width="60%" height="0.65rem" />
            <SkeletonLine width="3rem" height="1.5rem" />
          </div>
        ))}
      </div>

      {/* Grid: sidebar + content */}
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 space-y-3">
          <SkeletonLine width="6rem" height="1rem" />
          <SkeletonBlock height="2.5rem" />
          {[1, 2, 3].map((i) => (
            <SkeletonBlock key={i} height="4rem" />
          ))}
        </div>
        <div className="space-y-6">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={5} />
        </div>
      </div>
    </section>
  );
}
