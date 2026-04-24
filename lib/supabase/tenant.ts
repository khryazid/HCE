export type TenantContext = {
  doctorId: string;
  clinicId: string;
};

export function assertTenantContext(context: TenantContext) {
  if (!context.doctorId || !context.clinicId) {
    throw new Error("Tenant context is required.");
  }
}
