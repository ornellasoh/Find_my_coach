-- Connexion Google / Apple : nom et photo repris du fournisseur à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := case when meta->>'role' = 'coach' then 'coach' else 'client' end;
begin
  insert into public.profiles (id, role, name, email, avatar, data)
  values (
    new.id::text,
    r,
    coalesce(nullif(meta->>'name', ''), nullif(meta->>'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, ''),
    coalesce(meta->>'avatar', meta->>'avatar_url', meta->>'picture'),
    jsonb_build_object(
      'city', coalesce(meta->>'city', 'Paris'),
      'phone', meta->>'phone',
      'category', meta->>'category',
      'latitude', (meta->>'latitude')::float8,
      'longitude', (meta->>'longitude')::float8,
      'memberSince', to_char(now(), 'YYYY'),
      'status', 'active'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Fonctions de déclencheur : non appelables via l'API
revoke execute on function public.guard_booking() from public, anon, authenticated;
revoke execute on function public.on_message_push() from public, anon, authenticated;
revoke execute on function public.set_booking_coach_user() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;

-- Réglages de l'app (ex. masquer les coachs de démonstration au lancement)
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy app_settings_read on public.app_settings for select to anon, authenticated using (true);
create policy app_settings_admin_write on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
insert into public.app_settings (key, value) values ('show_demo_coaches', 'true'::jsonb)
  on conflict (key) do nothing;
