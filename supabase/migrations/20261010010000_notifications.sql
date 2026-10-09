-- Find My Coach — notifications push, emails, rappels
create table if not exists public.push_tokens (
  token       text primary key,
  user_id     text not null,
  platform    text not null default 'android',
  updated_at  timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens(user_id);
alter table public.push_tokens enable row level security;
create policy push_tokens_own_select on public.push_tokens for select to authenticated using (user_id = auth.uid()::text);
create policy push_tokens_own_insert on public.push_tokens for insert to authenticated with check (user_id = auth.uid()::text);
create policy push_tokens_own_update on public.push_tokens for update to authenticated using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
create policy push_tokens_own_delete on public.push_tokens for delete to authenticated using (user_id = auth.uid()::text);

alter table public.profiles add column if not exists notify_email boolean not null default true;
alter table public.profiles add column if not exists notify_push boolean not null default true;

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Secret interne (coffre-fort) pour les appels base -> fonctions
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'fmc_internal_secret') then
    perform vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'fmc_internal_secret', 'Appels internes Find My Coach');
  end if;
end $$;

create or replace function public.internal_secret_ok(s text)
returns boolean language sql security definer set search_path = public, vault as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'fmc_internal_secret' and decrypted_secret = s);
$$;
revoke all on function public.internal_secret_ok(text) from public, anon, authenticated;
grant execute on function public.internal_secret_ok(text) to service_role;

create or replace function public.call_edge(fn text, payload jsonb)
returns bigint language plpgsql security definer set search_path = public, vault, extensions as $$
declare secret text; req_id bigint;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'fmc_internal_secret';
  select net.http_post(
    url := 'https://seftoygihefwohrioojo.supabase.co/functions/v1/' || fn,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', secret),
    body := payload,
    timeout_milliseconds := 10000
  ) into req_id;
  return req_id;
end;
$$;
revoke all on function public.call_edge(text, jsonb) from public, anon, authenticated;

alter table public.messages add column if not exists pushed_at timestamptz;
create or replace function public.on_message_push()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.call_edge('message-push', jsonb_build_object('message_id', new.id));
  return new;
end;
$$;
create or replace trigger messages_push after insert on public.messages
  for each row execute function public.on_message_push();

-- Rappels de séance toutes les 15 minutes
select cron.schedule('fmc-reminders', '*/15 * * * *', $$select public.call_edge('send-reminders', '{}'::jsonb)$$);
