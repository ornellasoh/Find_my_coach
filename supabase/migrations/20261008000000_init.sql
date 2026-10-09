-- =====================================================================
-- Find My Coach — schéma initial Supabase
-- Chaque table garde l'objet complet de l'app dans `data` (jsonb)
-- + quelques colonnes utilisées pour les filtres et la sécurité (RLS).
-- Les identifiants sont en texte pour accepter aussi les données de démo.
-- =====================================================================

-- ---------- Profils (1 ligne par compte) ----------
create table if not exists public.profiles (
  id          text primary key,                         -- = auth.users.id
  role        text not null default 'client' check (role in ('client','coach','admin')),
  name        text not null default '',
  email       text not null default '',
  avatar      text,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Administrateur ?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid()::text and role = 'admin');
$$;

-- Création automatique du profil à l'inscription (métadonnées envoyées par l'app)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := case when meta->>'role' = 'coach' then 'coach' else 'client' end;  -- jamais 'admin' à l'inscription
begin
  insert into public.profiles (id, role, name, email, avatar, data)
  values (
    new.id::text,
    r,
    coalesce(meta->>'name', split_part(new.email, '@', 1)),
    new.email,
    meta->>'avatar',
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Coachs ----------
create table if not exists public.coaches (
  id          text primary key,
  user_id     text,                                     -- profil propriétaire (null/texte libre pour les coachs de démo)
  is_active   boolean not null default true,
  city        text,
  category    text,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
create index if not exists coaches_user_idx on public.coaches(user_id);

-- ---------- Créneaux ----------
create table if not exists public.availabilities (
  id          text primary key,
  coach_id    text not null references public.coaches(id) on delete cascade,
  date        date not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
create index if not exists availabilities_coach_date_idx on public.availabilities(coach_id, date);

-- ---------- Réservations ----------
create table if not exists public.bookings (
  id              text primary key,
  client_id       text not null,
  coach_id        text not null,
  coach_user_id   text,
  availability_id text,
  status          text not null default 'confirmed',
  date            date,
  data            jsonb not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists bookings_client_idx on public.bookings(client_id);
create index if not exists bookings_coach_user_idx on public.bookings(coach_user_id);
create index if not exists bookings_coach_idx on public.bookings(coach_id);

-- Le coach destinataire est toujours déduit de la fiche coach (non modifiable par le client)
create or replace function public.set_booking_coach_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select user_id into new.coach_user_id from public.coaches where id = new.coach_id;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists bookings_set_coach_user on public.bookings;
create trigger bookings_set_coach_user before insert or update on public.bookings
  for each row execute function public.set_booking_coach_user();

-- Créneaux déjà pris (sans données personnelles) : visible par tous pour griser les horaires
create or replace view public.booked_slots
with (security_invoker = false) as
  select availability_id, coach_id, date
  from public.bookings
  where status in ('pending','confirmed','completed') and availability_id is not null;

-- ---------- Avis ----------
create table if not exists public.reviews (
  id          text primary key,
  coach_id    text not null,
  client_id   text not null,
  booking_id  text,
  is_hidden   boolean not null default false,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists reviews_coach_idx on public.reviews(coach_id);

-- ---------- Favoris ----------
create table if not exists public.favorites (
  id          text primary key,
  user_id     text not null,
  coach_id    text not null,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  unique (user_id, coach_id)
);

-- ---------- Notifications ----------
create table if not exists public.notifications (
  id          text primary key,
  user_id     text not null,
  read        boolean not null default false,
  data        jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id);

-- ---------- Objectifs ----------
create table if not exists public.goals (
  id          text primary key,
  user_id     text not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------- Programmes d'entraînement ----------
create table if not exists public.workout_programs (
  id             text primary key,
  client_id      text not null,
  coach_id       text,
  coach_user_id  text,
  data           jsonb not null,
  updated_at     timestamptz not null default now()
);

-- ---------- Messagerie ----------
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     text not null,
  recipient_id  text not null,
  text          text not null check (char_length(text) between 1 and 4000),
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists messages_pair_idx on public.messages(sender_id, recipient_id, created_at);

-- =====================================================================
-- Sécurité (Row Level Security)
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.coaches           enable row level security;
alter table public.availabilities    enable row level security;
alter table public.bookings          enable row level security;
alter table public.reviews           enable row level security;
alter table public.favorites         enable row level security;
alter table public.notifications     enable row level security;
alter table public.goals             enable row level security;
alter table public.workout_programs  enable row level security;
alter table public.messages          enable row level security;

-- Profils : chacun lit/modifie le sien ; nom + avatar visibles par les utilisateurs connectés (messagerie)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()::text or public.is_admin())
  with check (id = auth.uid()::text or public.is_admin());

-- Un utilisateur ne peut pas changer son propre rôle (seul un admin le peut)
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    -- un client peut devenir coach, jamais admin
    if not (old.role = 'client' and new.role = 'coach') then
      raise exception 'Changement de rôle non autorisé';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Coachs : publics en lecture (actifs), écriture par le propriétaire ou l'admin
drop policy if exists coaches_select on public.coaches;
create policy coaches_select on public.coaches for select to anon, authenticated
  using (is_active or user_id = auth.uid()::text or public.is_admin());
drop policy if exists coaches_write on public.coaches;
create policy coaches_write on public.coaches for all to authenticated
  using (user_id = auth.uid()::text or public.is_admin())
  with check (user_id = auth.uid()::text or public.is_admin());

-- Créneaux : publics en lecture, écriture par le coach propriétaire
drop policy if exists availabilities_select on public.availabilities;
create policy availabilities_select on public.availabilities for select to anon, authenticated using (true);
drop policy if exists availabilities_write on public.availabilities;
create policy availabilities_write on public.availabilities for all to authenticated
  using (exists (select 1 from public.coaches c where c.id = coach_id and (c.user_id = auth.uid()::text or public.is_admin())))
  with check (exists (select 1 from public.coaches c where c.id = coach_id and (c.user_id = auth.uid()::text or public.is_admin())));

-- Réservations : visibles par le client, le coach concerné et l'admin
drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings for select to authenticated
  using (client_id = auth.uid()::text or coach_user_id = auth.uid()::text or public.is_admin());
drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings for insert to authenticated
  with check (client_id = auth.uid()::text);
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings for update to authenticated
  using (client_id = auth.uid()::text or coach_user_id = auth.uid()::text or public.is_admin())
  with check (client_id = auth.uid()::text or coach_user_id = auth.uid()::text or public.is_admin());

grant select on public.booked_slots to anon, authenticated;

-- Avis : publics (non masqués), écrits par le client de la séance
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select to anon, authenticated
  using (not is_hidden or client_id = auth.uid()::text or public.is_admin());
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated
  with check (client_id = auth.uid()::text);
drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update to authenticated
  using (client_id = auth.uid()::text or public.is_admin());

-- Favoris, objectifs : privés
drop policy if exists favorites_all on public.favorites;
create policy favorites_all on public.favorites for all to authenticated
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
drop policy if exists goals_all on public.goals;
create policy goals_all on public.goals for all to authenticated
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

-- Notifications : lecture/modif par le destinataire ; tout utilisateur connecté peut en envoyer
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid()::text);
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert to authenticated with check (true);
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()::text);
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid()::text);

-- Programmes : client et coach concernés
drop policy if exists programs_all on public.workout_programs;
create policy programs_all on public.workout_programs for all to authenticated
  using (client_id = auth.uid()::text or coach_user_id = auth.uid()::text)
  with check (client_id = auth.uid()::text or coach_user_id = auth.uid()::text);

-- Messages : expéditeur et destinataire uniquement
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (sender_id = auth.uid()::text or recipient_id = auth.uid()::text);
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid()::text);
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update to authenticated
  using (recipient_id = auth.uid()::text);

-- Temps réel pour la messagerie et les notifications
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when others then null; end $$;

-- ---------- Stockage des photos (avatars, photos de coach, documents) ----------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "documents owner" on storage.objects;
create policy "documents owner" on storage.objects for all to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()))
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
