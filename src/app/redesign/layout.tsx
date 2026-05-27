/**
 * Layout for /redesign routes.
 * Renders children without the dashboard sidebar/auth wrapper.
 */
export default function RedesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
