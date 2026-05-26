-- ============================================================
-- Migración 002: Notificaciones de Agenda (Flujo Asistente-Médico)
-- Fecha: 2026-05-26
-- ============================================================
-- 
-- CAMBIOS:
--   1. Reemplaza la función `notify_appointment_change` para:
--      - No notificar si el propio médico hizo el cambio (auth.uid() = doctor_id).
--      - Incluir hora (UTC), tipo de consulta y notas opcionales.
--      - Diferenciar mensajes entre Creada, Modificada y Eliminada.
--      - Usar `get_config_secret` para leer el secreto de envío de forma segura.
--
-- NOTA: El trigger `on_appointment_change` ya existe y está acoplado
-- a esta función, por lo que el reemplazo de la función (CREATE OR REPLACE)
-- aplica los cambios automáticamente a los futuros eventos.
-- ============================================================

create or replace function public.notify_appointment_change()
returns trigger as $$
declare
  app_url text;
  push_secret text;
  doc_id uuid;
  pat_name text;
  msg_title text;
  msg_body text;
  v_time_str text;
  v_type text;
  v_reason text;
  v_actor uuid := auth.uid();
begin
  -- Leer configuración (usando get_config_secret para cifrado)
  select value into app_url from public.app_config where key = 'site_url' limit 1;
  push_secret := public.get_config_secret('push_send_secret');
  
  if app_url is null or push_secret is null then
    return null;
  end if;

  -- Para DELETE usamos OLD, para INSERT/UPDATE usamos NEW
  doc_id := coalesce(NEW.doctor_id, OLD.doctor_id);

  -- Filtro: Si la acción la hizo el propio doctor de la cita, no enviar notificación push
  if v_actor = doc_id then
    return null;
  end if;

  if TG_OP = 'INSERT' or TG_OP = 'UPDATE' then
    pat_name := NEW.patient_name;
    v_time_str := to_char(NEW.start_time AT TIME ZONE 'UTC', 'HH24:MI');
    v_type := coalesce(NEW.consultation_type, 'consulta');
    v_reason := coalesce(NEW.notes, '');

    if TG_OP = 'INSERT' then
      msg_title := 'Nueva Cita Agendada';
      msg_body := 'Paciente: ' || pat_name || ' | Hora: ' || v_time_str || ' | Tipo: ' || v_type;
    else
      msg_title := 'Cita Modificada';
      msg_body := 'Cambios en cita de ' || pat_name || ' | Hora: ' || v_time_str || ' | Tipo: ' || v_type;
    end if;

    if v_reason <> '' then
      msg_body := msg_body || '. Motivo: ' || v_reason;
    end if;

  elsif TG_OP = 'DELETE' then
    pat_name := OLD.patient_name;
    v_time_str := to_char(OLD.start_time AT TIME ZONE 'UTC', 'HH24:MI');
    msg_title := 'Cita Eliminada';
    msg_body := 'Se canceló la cita de ' || pat_name || ' a las ' || v_time_str;
  end if;

  -- Enviar push vía pg_net
  perform net.http_post(
    url := app_url || '/api/push/send',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', push_secret),
    body := jsonb_build_object(
      'title', msg_title,
      'body', msg_body,
      'url', '/agenda',
      'target_doctor_id', doc_id
    )
  );

  return null;
end;
$$ language plpgsql security definer;
