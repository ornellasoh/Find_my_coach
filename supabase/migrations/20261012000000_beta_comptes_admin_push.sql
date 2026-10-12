-- Find My Coach — préparation bêta (12 oct. 2026)
--   1. Administrateurs : table protégée admin_users (liée à auth.users), plus aucun rôle « admin » dans profiles
--   2. Profils : lecture limitée (soi-même + admin), réparation sûre d'un profil manquant, plus de photo imposée
--   3. Statistiques administrateur calculées par la base (refusées aux non-admins)
--   4. Notifications push : un jeton = un seul compte (changement de compte sur le même téléphone)
-- Migration idempotente, sans suppression de données.

-- ---------------------------------------------------------------------------
-- 1. Administrateurs
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid,
  note       text
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon;
grant select on public.admin_users to authenticated;
drop policy if exists admin_users_select on public.admin_users;
-- Un utilisateur ordinaire ne voit au plus que SA propre ligne (donc rien) ; un admin voit la liste.
create policy admin_users_select on public.admin_users for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
-- Aucune politique d'écriture : ajout / retrait uniquement via la console SQL (service) ou admin_grant / admin_revoke.

-- Reprise d'éventuels anciens administrateurs (rôle « admin » dans profiles) avant de retirer ce rôle
insert into public.admin_users (user_id, note)
select p.id::uuid, 'repris de profiles.role = admin'
from public.profiles p
where p.role = 'admin' and p.id ~ '^[0-9a-f-]{36}$' and exists (select 1 from auth.users u where u.id::text = p.id)
on conflict (user_id) do nothing;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users a where a.user_id = auth.uid());
$$;

-- Le rôle applicatif d'un profil est « client » ou « coach ». Seul passage autorisé à l'utilisateur : client → coach.
-- Un admin peut corriger client ↔ coach. Personne ne peut écrire « admin » via l'API.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  service boolean := coalesce(auth.jwt() ->> 'role', '') = 'service_role' or auth.uid() is null;
begin
  if not service then
    new.id := old.id;
    new.email := old.email;            -- l'email suit le compte Auth, pas l'app
    new.created_at := old.created_at;
    if new.role is distinct from old.role then
      if new.role not in ('client', 'coach') then
        raise exception 'Rôle non autorisé.' using errcode = '42501';
      end if;
      if not (public.is_admin() or (old.role = 'client' and new.role = 'coach')) then
        raise exception 'Changement de rôle non autorisé' using errcode = '42501';
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Plus aucun profil « admin » : les droits sont dans admin_users
update public.profiles set role = 'client' where role = 'admin';

-- Ajout / retrait d'un administrateur par un administrateur existant (le premier se fait en console SQL)
create or replace function public.admin_grant(p_email text, p_note text default null)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs.' using errcode = '42501'; end if;
  select id into v_id from auth.users where lower(email) = lower(trim(p_email)) and email_confirmed_at is not null;
  if v_id is null then raise exception 'Aucun compte confirmé avec cet email.' using errcode = 'P0001'; end if;
  insert into public.admin_users (user_id, granted_by, note) values (v_id, auth.uid(), p_note)
  on conflict (user_id) do nothing;
  return v_id;
end;
$$;

create or replace function public.admin_revoke(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs.' using errcode = '42501'; end if;
  if (select count(*) from public.admin_users) <= 1 and exists (select 1 from public.admin_users where user_id = p_user_id) then
    raise exception 'Impossible de retirer le dernier administrateur.' using errcode = 'P0001';
  end if;
  delete from public.admin_users where user_id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Profils
-- ---------------------------------------------------------------------------
-- Lecture : son propre profil, ou tous pour un admin (les autres écrans utilisent les noms des réservations).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid()::text or public.is_admin());

-- Création du profil à l'inscription : nom fourni (ou nom du fournisseur Google/Apple), rôle client/coach,
-- et AUCUNE photo imposée (la photo du fournisseur n'est pas reprise automatiquement : initiales par défaut).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := case when meta->>'role' = 'coach' then 'coach' else 'client' end;
  v_name text := nullif(trim(coalesce(meta->>'name', meta->>'full_name', meta->>'given_name', '')), '');
begin
  insert into public.profiles (id, role, name, email, avatar, data)
  values (
    new.id::text,
    r,
    coalesce(v_name, ''),
    coalesce(new.email, ''),
    nullif(meta->>'avatar', ''),           -- photo explicitement envoyée par l'app uniquement
    jsonb_strip_nulls(jsonb_build_object(
      'city', nullif(meta->>'city', ''),
      'phone', nullif(meta->>'phone', ''),
      'category', nullif(meta->>'category', ''),
      'latitude', (meta->>'latitude')::float8,
      'longitude', (meta->>'longitude')::float8,
      'memberSince', to_char(now(), 'YYYY'),
      'status', 'active'
    ))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Réparation sûre : recrée UNIQUEMENT le profil manquant de l'utilisateur connecté, à partir de son compte Auth.
create or replace function public.ensure_my_profile()
returns public.profiles language plpgsql security definer set search_path = public, auth as $$
declare
  u auth.users;
  p public.profiles;
  meta jsonb;
begin
  if auth.uid() is null then raise exception 'Non connecté.' using errcode = '42501'; end if;
  select * into p from public.profiles where id = auth.uid()::text;
  if p.id is not null then return p; end if;
  select * into u from auth.users where id = auth.uid();
  meta := coalesce(u.raw_user_meta_data, '{}'::jsonb);
  insert into public.profiles (id, role, name, email, avatar, data)
  values (
    u.id::text,
    case when meta->>'role' = 'coach' then 'coach' else 'client' end,
    coalesce(nullif(trim(coalesce(meta->>'name', meta->>'full_name', '')), ''), ''),
    coalesce(u.email, ''),
    nullif(meta->>'avatar', ''),
    jsonb_build_object('memberSince', to_char(coalesce(u.created_at, now()), 'YYYY'), 'status', 'active', 'repairedAt', now())
  )
  on conflict (id) do nothing
  returning * into p;
  if p.id is null then select * into p from public.profiles where id = auth.uid()::text; end if;
  return p;
end;
$$;

-- Réparation des comptes existants : un profil pour chaque compte Auth qui n'en a pas (aucune suppression)
insert into public.profiles (id, role, name, email, avatar, data)
select u.id::text,
       case when u.raw_user_meta_data->>'role' = 'coach' then 'coach' else 'client' end,
       coalesce(nullif(trim(coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name', '')), ''), ''),
       coalesce(u.email, ''),
       null,
       jsonb_build_object('memberSince', to_char(u.created_at, 'YYYY'), 'status', 'active', 'repairedAt', now())
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id::text)
on conflict (id) do nothing;

-- Photos générées automatiquement (ui-avatars) : retirées des profils et fiches → initiales dans l'app
update public.profiles set avatar = null where avatar ~* 'ui-avatars\.com';
update public.coaches set data = data || jsonb_build_object('photo', '')
where data ->> 'photo' ~* 'ui-avatars\.com';

-- Note « 5,0 » sans aucun avis sur les vrais comptes coach : remise à zéro (aucun avis = « Nouveau » dans l'app)
update public.coaches set data = data || jsonb_build_object('rating', 0)
where user_id ~ '^[0-9a-f-]{36}$' and coalesce((data ->> 'reviewCount')::int, 0) = 0
  and coalesce((data ->> 'rating')::numeric, 0) <> 0;

-- ---------------------------------------------------------------------------
-- 3. Statistiques administrateur
-- ---------------------------------------------------------------------------
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare r jsonb;
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs.' using errcode = '42501'; end if;
  select jsonb_build_object(
    'users_total', (select count(*) from auth.users),
    'clients', (select count(*) from public.profiles where role = 'client'),
    'coaches', (select count(*) from public.profiles where role = 'coach'),
    'new_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'unconfirmed_emails', (select count(*) from auth.users where email_confirmed_at is null),
    'coach_profiles_live', (select count(*) from public.coaches c where c.is_active and c.user_id ~ '^[0-9a-f-]{36}$'
                              and coalesce((c.data ->> 'hourlyRate')::numeric, 0) > 0),
    'bookings_pending', (select count(*) from public.bookings where status = 'pending'),
    'bookings_confirmed', (select count(*) from public.bookings where status = 'confirmed'),
    'bookings_completed', (select count(*) from public.bookings where status = 'completed'),
    'bookings_cancelled', (select count(*) from public.bookings where status in ('cancelled', 'rejected')),
    'paid_eur', coalesce((select sum(amount_total) from public.payments where status = 'paid'), 0) / 100.0,
    'platform_fees_eur', coalesce((select sum(application_fee) from public.payments where status = 'paid'), 0) / 100.0,
    'refunded_eur', coalesce((select sum(amount_total) from public.payments where status = 'refunded'), 0) / 100.0
  ) into r;
  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Notifications push : jeton rattaché au compte actuellement connecté sur le téléphone
-- ---------------------------------------------------------------------------
create or replace function public.register_push_token(p_token text, p_platform text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Non connecté.' using errcode = '42501'; end if;
  if coalesce(trim(p_token), '') = '' or char_length(p_token) > 4096 then raise exception 'Jeton invalide.'; end if;
  -- Le même téléphone ne peut recevoir les notifications que d'un seul compte : le dernier connecté
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (p_token, auth.uid()::text, left(coalesce(p_platform, ''), 20), now())
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

create or replace function public.unregister_push_token(p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.push_tokens where token = p_token and user_id = auth.uid()::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Droits d'exécution
-- ---------------------------------------------------------------------------
revoke execute on function public.protect_profile_role() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.admin_grant(text, text) from public, anon;
grant execute on function public.admin_grant(text, text) to authenticated;
revoke execute on function public.admin_revoke(uuid) from public, anon;
grant execute on function public.admin_revoke(uuid) to authenticated;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;
revoke execute on function public.ensure_my_profile() from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;
revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.unregister_push_token(text) to authenticated;
grant execute on function public.is_admin() to authenticated;
