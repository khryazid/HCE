"use client";

/**
 * Route: /redesign
 * Preview page for the redesigned Dashboard component.
 * This page bypasses the dashboard layout and auth to render
 * the prototype in isolation.
 */

import DashboardRedesign from "@/redesign/section-01-dashboard";

export default function RedesignPreviewPage() {
  return <DashboardRedesign />;
}
