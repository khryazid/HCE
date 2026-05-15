-- 004_enforce_subscription_rls.sql
-- Enforce subscription expiration check in RLS write policies

CREATE OR REPLACE FUNCTION has_active_subscription(c_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sub_status TEXT;
  sub_expires TIMESTAMPTZ;
BEGIN
  -- Obtener el estado del plan principal de la clinica (del owner o del primer perfil)
  SELECT subscription_status, subscription_expires_at INTO sub_status, sub_expires
  FROM public.profiles
  WHERE clinic_id = c_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF sub_status = 'lifetime' THEN
    RETURN TRUE;
  END IF;

  IF sub_status IN ('active', 'trialing') THEN
    IF sub_expires IS NULL OR sub_expires > now() THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- Actualizar politicas de escritura para verificar suscripcion

-- patients
DROP POLICY IF EXISTS "patients_tenant_write" ON public.patients;
CREATE POLICY "patients_tenant_write"
  ON public.patients FOR ALL TO authenticated
  USING (
    (exists (select 1 from public.profiles p where p.doctor_id = auth.uid() and p.clinic_id = public.patients.clinic_id)
     or public.is_clinic_member(public.patients.clinic_id))
    AND has_active_subscription(public.patients.clinic_id)
  )
  WITH CHECK (
    (exists (select 1 from public.profiles p where p.doctor_id = auth.uid() and p.clinic_id = public.patients.clinic_id)
     or public.is_clinic_member(public.patients.clinic_id))
    AND has_active_subscription(public.patients.clinic_id)
  );

-- clinical_records
DROP POLICY IF EXISTS "records_tenant_write" ON public.clinical_records;
CREATE POLICY "records_tenant_write"
  ON public.clinical_records FOR ALL TO authenticated
  USING (
    (exists (select 1 from public.profiles p where p.doctor_id = auth.uid() and p.clinic_id = public.clinical_records.clinic_id)
     or public.is_clinic_member(public.clinical_records.clinic_id))
    AND has_active_subscription(public.clinical_records.clinic_id)
  )
  WITH CHECK (
    (exists (select 1 from public.profiles p where p.doctor_id = auth.uid() and p.clinic_id = public.clinical_records.clinic_id)
     or public.is_clinic_member(public.clinical_records.clinic_id))
    AND has_active_subscription(public.clinical_records.clinic_id)
  );

-- appointments
DROP POLICY IF EXISTS "appointments_tenant_write" ON public.appointments;
CREATE POLICY "appointments_tenant_write"
  ON public.appointments FOR ALL TO authenticated
  USING (
    (exists (select 1 from public.profiles p where p.doctor_id = auth.uid() and p.clinic_id = public.appointments.clinic_id)
     or public.is_clinic_member(public.appointments.clinic_id))
    AND has_active_subscription(public.appointments.clinic_id)
  )
  WITH CHECK (
    (exists (select 1 from public.profiles p where p.doctor_id = auth.uid() and p.clinic_id = public.appointments.clinic_id)
     or public.is_clinic_member(public.appointments.clinic_id))
    AND has_active_subscription(public.appointments.clinic_id)
  );
