create or replace function public.log_audit_event(
  p_clinic_id     uuid,
  p_doctor_id     uuid,
  p_event_type    text,
  p_resource_type text,
  p_resource_id   uuid,
  p_changes       jsonb,
  p_metadata      jsonb default '{}'::jsonb,
  p_client_timestamp bigint default null
)
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare
  v_prev_hash text;
  v_seq       bigint;
  v_new_hash  text;
  v_id        bigint;
begin
  if auth.uid() <> p_doctor_id then
    raise exception 'Unauthorized: cannot create audit log for another user'
      using errcode = '42501';
  end if;

  select entry_hash, sequence_no
    into v_prev_hash, v_seq
  from public.audit_logs
  where clinic_id = p_clinic_id and doctor_id = p_doctor_id
  order by id desc
  limit 1;

  v_prev_hash := coalesce(v_prev_hash, 'genesis');
  v_seq       := coalesce(v_seq, 0) + 1;

  v_new_hash := encode(
    digest(
      convert_to(
        v_prev_hash         || '|' ||
        p_clinic_id::text   || '|' ||
        p_doctor_id::text   || '|' ||
        p_event_type        || '|' ||
        p_resource_type     || '|' ||
        p_resource_id::text || '|' ||
        p_changes::text     || '|' ||
        now()::text,
        'utf8'
      ),
      'sha256'
    ),
    'hex'
  );

  if p_client_timestamp is not null then
    p_metadata := p_metadata || jsonb_build_object('client_timestamp', p_client_timestamp);
  end if;

  insert into public.audit_logs (
    clinic_id, doctor_id, event_type, resource_type, resource_id,
    changes, metadata, previous_hash, entry_hash, sequence_no
  ) values (
    p_clinic_id, p_doctor_id, p_event_type, p_resource_type, p_resource_id,
    p_changes, p_metadata, v_prev_hash, v_new_hash, v_seq
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.log_audit_event_trigger()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_event_type text;
  v_resource_type text;
  v_resource_id uuid;
  v_changes jsonb;
  v_doctor_id uuid;
  v_clinic_id uuid;
begin
  v_resource_type := TG_TABLE_NAME;

  if TG_OP = 'INSERT' then
    v_event_type := 'INSERT';
    v_resource_id := NEW.id;
    v_changes := to_jsonb(NEW);
    v_doctor_id := NEW.doctor_id;
    v_clinic_id := NEW.clinic_id;
  elsif TG_OP = 'UPDATE' then
    v_event_type := 'UPDATE';
    v_resource_id := NEW.id;
    v_changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    v_doctor_id := NEW.doctor_id;
    v_clinic_id := NEW.clinic_id;
  elsif TG_OP = 'DELETE' then
    v_event_type := 'DELETE';
    v_resource_id := OLD.id;
    v_changes := to_jsonb(OLD);
    v_doctor_id := OLD.doctor_id;
    v_clinic_id := OLD.clinic_id;
  end if;

  if v_doctor_id is not null and v_clinic_id is not null then
    insert into public.audit_logs (
      clinic_id, doctor_id, event_type, resource_type, resource_id,
      changes, metadata, previous_hash, entry_hash, sequence_no
    ) values (
      v_clinic_id, v_doctor_id, v_event_type, v_resource_type, v_resource_id,
      v_changes, '{}'::jsonb, 'trigger', 
      encode(digest(v_resource_id::text || now()::text, 'sha256'), 'hex'),
      0
    );
  end if;

  if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end;
$$;
