-- Límite compartido para sugerencias CIE.
-- La verificación se hace por RPC para evitar depender de memoria local del proceso.

begin;

create table if not exists public.api_rate_limits (
  scope text not null,
  identifier uuid not null references auth.users (id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (scope, identifier)
);

alter table public.api_rate_limits enable row level security;

create index if not exists idx_api_rate_limits_scope_updated_at
  on public.api_rate_limits (scope, updated_at desc);

create or replace function public.claim_api_rate_limit(
  p_scope text,
  p_identifier uuid,
  p_window_seconds integer,
  p_max_requests integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if auth.uid() is distinct from p_identifier then
    raise exception 'unauthorized rate limit claim';
  end if;

  loop
    select window_started_at, request_count
      into v_window_started_at, v_request_count
    from public.api_rate_limits
    where scope = p_scope and identifier = p_identifier
    for update;

    if not found then
      insert into public.api_rate_limits (
        scope,
        identifier,
        window_started_at,
        request_count,
        updated_at
      )
      values (
        p_scope,
        p_identifier,
        v_now,
        1,
        v_now
      );

      return false;
    end if;

    if v_now - v_window_started_at >= make_interval(secs => p_window_seconds) then
      update public.api_rate_limits
        set window_started_at = v_now,
            request_count = 1,
            updated_at = v_now
      where scope = p_scope and identifier = p_identifier;

      return false;
    end if;

    update public.api_rate_limits
      set request_count = v_request_count + 1,
          updated_at = v_now
    where scope = p_scope and identifier = p_identifier;

    return v_request_count + 1 > p_max_requests;
  end loop;
end;
$$;

grant execute on function public.claim_api_rate_limit(text, uuid, integer, integer) to authenticated;

commit;