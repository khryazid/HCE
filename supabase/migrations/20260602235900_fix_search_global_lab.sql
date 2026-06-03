-- Migration to fix search_global for laboratory and non-doctor roles.
-- search_global was querying `public.profiles`, which excludes laboratory staff (they only exist in clinic_members).

begin;

create or replace function public.search_global(p_query text)
  returns table (
    kind       text,
    id         uuid,
    title      text,
    subtitle   text,
    patient_id uuid,
    updated_at timestamptz,
    rank       real
  )
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_clinic_id uuid;
    v_tsquery   tsquery;
  begin
    -- A-06: Derivar clinic_id desde auth.uid() – usando clinic_members para incluir a TODOS los roles (lab, assistant, etc)
    select clinic_id into v_clinic_id
      from public.clinic_members
     where doctor_id = auth.uid()
       and is_active = true
     order by created_at desc
     limit 1;
  
    if v_clinic_id is null then
      return;
    end if;
  
    -- A-01: websearch_to_tsquery es seguro ante entrada arbitraria
    begin
      v_tsquery := websearch_to_tsquery('spanish', p_query);
    exception when others then
      v_tsquery := null;
    end;
  
    if v_tsquery is null or v_tsquery::text = '' then
      begin
        v_tsquery := plainto_tsquery('spanish', p_query);
      exception when others then
        return;
      end;
    end if;
  
    -- F-21: Fix – verificar que el tsquery tampoco esté vacío tras el fallback.
    if v_tsquery is null or v_tsquery::text = '' then
      return;
    end if;
  
    -- Pacientes
    return query
      select
        'patient'::text                                     as kind,
        p.id,
        p.full_name::text                                   as title,
        coalesce(p.document_number, 'Sin documento')::text  as subtitle,
        p.id                                                as patient_id,
        p.updated_at,
        ts_rank(
          to_tsvector('spanish',
            coalesce(p.full_name,'')       || ' ' ||
            coalesce(p.document_number,'')),
          v_tsquery
        )::real                                             as rank
      from public.patients p
     where p.clinic_id = v_clinic_id
       and to_tsvector('spanish',
             coalesce(p.full_name,'')       || ' ' ||
             coalesce(p.document_number,'')
           ) @@ v_tsquery
     order by rank desc
     limit 20;
  
    -- Consultas
    return query
      select
        'consultation'::text                                               as kind,
        cr.id,
        coalesce(cr.chief_complaint, 'Sin motivo')::text                  as title,
        to_char(cr.created_at at time zone 'America/Guayaquil',
                'DD/MM/YYYY')::text                                        as subtitle,
        cr.patient_id,
        cr.updated_at,
        ts_rank(
          to_tsvector('spanish', coalesce(cr.chief_complaint,'')),
          v_tsquery
        )::real                                                            as rank
      from public.clinical_records cr
      join public.patients p on p.id = cr.patient_id
     where cr.clinic_id = v_clinic_id
       and to_tsvector('spanish', coalesce(cr.chief_complaint,'')) @@ v_tsquery
     order by rank desc
     limit 20;
  
  end;
  $$;

commit;
