-- Find My Coach — v1 « séances » :
--   lien de visio externe + consignes, adresse exacte réservée aux participants,
--   protection contre les doubles réservations, report de séance accepté par l'autre partie,
--   compte rendu de séance, signalement de problème, documents de vérification privés.
-- Migration idempotente : aucune donnée n'est supprimée (les informations sensibles sont déplacées
-- vers des tables privées avant d'être retirées des fiches publiques).

-- ---------------------------------------------------------------------------
-- 0. Outils communs
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists welcome_sent_at timestamptz;

insert into public.app_settings (key, value) values ('reschedule_min_hours', '24'::jsonb)
  on conflict (key) do nothing;

-- Appel « de confiance » : fonctions serveur (service_role), console SQL, ou fonction RPC de la base
-- qui a explicitement activé fmc.trusted pour la transaction en cours.
create or replace function public.fmc_trusted()
returns boolean language sql stable set search_path = public as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role'
      or auth.uid() is null
      or coalesce(current_setting('fmc.trusted', true), '') = 'on';
$$;

-- Début d'une séance (date + heure exprimées à l'heure de Paris)
create or replace function public.fmc_session_start(p_date date, p_start text)
returns timestamptz language sql stable as $$
  select (p_date + coalesce(nullif(p_start, ''), '00:00')::time) at time zone 'Europe/Paris';
$$;

-- Recopie dans `target` les clés `keys` telles qu'elles sont dans `source` (et les retire si absentes)
create or replace function public.fmc_keep(target jsonb, source jsonb, keys text[])
returns jsonb language plpgsql immutable as $$
declare k text;
begin
  foreach k in array keys loop
    if source ? k then target := target || jsonb_build_object(k, source -> k);
    else target := target - k;
    end if;
  end loop;
  return target;
end;
$$;

-- Notification créée par la base : ligne in-app + envoi push/email par la fonction notify-dispatch
create or replace function public.fmc_notify(p_user text, p_type text, p_title text, p_message text, p_booking text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_id text := 'notif-' || (extract(epoch from clock_timestamp()) * 1000)::bigint || '-' || substr(md5(random()::text), 1, 6);
begin
  if p_user is null then return; end if;
  insert into public.notifications (id, user_id, read, data) values (
    v_id, p_user, false,
    jsonb_strip_nulls(jsonb_build_object(
      'id', v_id, 'userId', p_user, 'type', p_type, 'title', p_title, 'message', p_message,
      'relatedBookingId', p_booking, 'read', false, 'createdAt', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')))
  );
  begin
    perform public.call_edge('notify-dispatch', jsonb_build_object('notification_id', v_id));
  exception when others then null; -- l'envoi push/email ne doit jamais bloquer l'action
  end;
end;
$$;

-- Créneau déjà pris ? (même créneau, ou chevauchement horaire le même jour chez le même coach)
create or replace function public.fmc_slot_conflict(
  p_coach_id text, p_date date, p_start text, p_end text, p_availability_id text,
  p_exclude_booking text default null, p_include_pending boolean default true, p_client_id text default null
) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.bookings b
    where b.coach_id = p_coach_id
      and b.id is distinct from p_exclude_booking
      and (
        b.status in ('confirmed', 'completed')
        or (p_include_pending and b.status = 'pending' and b.created_at > now() - interval '30 minutes'
            and b.client_id is distinct from p_client_id)
      )
      and (
        (p_availability_id is not null and b.availability_id = p_availability_id)
        or (b.date = p_date and coalesce(p_start, '') <> '' and coalesce(p_end, '') <> ''
            and coalesce(b.data ->> 'startTime', '') < p_end and coalesce(b.data ->> 'endTime', '') > p_start)
      )
  );
$$;

-- Verrou par coach et par jour : sérialise les réservations / reports simultanés
create or replace function public.fmc_lock_slot(p_coach_id text, p_date date)
returns void language sql as $$
  select pg_advisory_xact_lock(hashtext('fmc-slot:' || coalesce(p_coach_id, '') || ':' || coalesce(p_date::text, '')));
$$;

-- ---------------------------------------------------------------------------
-- 1. Données privées des coachs (adresse exacte, coordonnées exactes)
-- ---------------------------------------------------------------------------
create table if not exists public.coach_private (
  coach_id   text primary key references public.coaches(id) on delete cascade deferrable initially deferred,
  address    text,
  latitude   double precision,
  longitude  double precision,
  updated_at timestamptz not null default now()
);
alter table public.coach_private enable row level security;
drop policy if exists coach_private_select on public.coach_private;
create policy coach_private_select on public.coach_private for select to authenticated
  using (exists (select 1 from public.coaches c where c.id = coach_id and c.user_id = auth.uid()::text) or public.is_admin());
-- Pas de politique d'écriture : seul le déclencheur sanitize_coach écrit dans cette table.

-- Documents de vérification (fichiers dans le stockage privé « documents »)
create table if not exists public.coach_documents (
  id             uuid primary key default gen_random_uuid(),
  coach_id       text not null references public.coaches(id) on delete cascade,
  owner_id       text not null,
  type           text not null default 'cert' check (type in ('diploma', 'identity', 'insurance', 'kbis', 'cert')),
  title          text not null check (char_length(title) between 1 and 200),
  file_path      text,
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_feedback text,
  submitted_at   timestamptz not null default now(),
  reviewed_at    timestamptz,
  reviewed_by    text
);
create index if not exists coach_documents_coach_idx on public.coach_documents (coach_id);
alter table public.coach_documents enable row level security;
drop policy if exists coach_documents_select on public.coach_documents;
create policy coach_documents_select on public.coach_documents for select to authenticated
  using (owner_id = auth.uid()::text or public.is_admin());
drop policy if exists coach_documents_insert on public.coach_documents;
create policy coach_documents_insert on public.coach_documents for insert to authenticated
  with check (owner_id = auth.uid()::text
              and exists (select 1 from public.coaches c where c.id = coach_id and c.user_id = auth.uid()::text));
drop policy if exists coach_documents_delete on public.coach_documents;
create policy coach_documents_delete on public.coach_documents for delete to authenticated
  using (owner_id = auth.uid()::text and status = 'pending');
-- Validation : uniquement via admin_review_document()

-- Fiche coach publique : jamais d'adresse exacte ni de documents ; statut « vérifié » réservé à l'admin
create or replace function public.sanitize_coach()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  trusted boolean := public.fmc_trusted() or public.is_admin();
  v_addr text := nullif(trim(coalesce(new.data ->> 'address', '')), '');
  v_lat double precision;
  v_lng double precision;
  v_exact boolean;
begin
  begin
    v_lat := (new.data ->> 'latitude')::double precision;
    v_lng := (new.data ->> 'longitude')::double precision;
  exception when others then v_lat := null; v_lng := null;
  end;
  -- Coordonnées plus précises que la zone publique (≈ 1 km) : on garde la valeur exacte en privé
  v_exact := v_lat is not null and v_lng is not null
             and (v_lat <> round(v_lat::numeric, 2)::double precision or v_lng <> round(v_lng::numeric, 2)::double precision);

  if v_addr is not null or v_exact then
    insert into public.coach_private as p (coach_id, address, latitude, longitude, updated_at)
    values (new.id, v_addr, case when v_exact then v_lat end, case when v_exact then v_lng end, now())
    on conflict (coach_id) do update set
      address   = coalesce(excluded.address, p.address),
      latitude  = coalesce(excluded.latitude, p.latitude),
      longitude = coalesce(excluded.longitude, p.longitude),
      updated_at = now();
  end if;

  new.data := new.data - 'address' - 'verificationDocs';
  if v_lat is not null and v_lng is not null then
    new.data := new.data || jsonb_build_object('latitude', round(v_lat::numeric, 2), 'longitude', round(v_lng::numeric, 2));
  end if;

  if not trusted then
    if tg_op = 'INSERT' then
      new.data := new.data || jsonb_build_object('verificationStatus', 'unverified', 'isElite', false);
    else
      new.data := public.fmc_keep(new.data, old.data, array['verificationStatus', 'isElite']);
      new.user_id := old.user_id;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Reprise des documents existants (stockés jusqu'ici dans la fiche publique) avant le nettoyage
insert into public.coach_documents (coach_id, owner_id, type, title, file_path, status, admin_feedback, submitted_at)
select c.id, coalesce(c.user_id, ''),
       case when d ->> 'type' in ('diploma', 'identity', 'insurance', 'kbis', 'cert') then d ->> 'type' else 'cert' end,
       coalesce(nullif(d ->> 'title', ''), 'Document'),
       d ->> 'fileUrl',
       case when d ->> 'status' in ('pending', 'approved', 'rejected') then d ->> 'status' else 'pending' end,
       d ->> 'adminFeedback',
       coalesce((d ->> 'submittedAt')::timestamptz, now())
from public.coaches c, jsonb_array_elements(case when jsonb_typeof(c.data -> 'verificationDocs') = 'array' then c.data -> 'verificationDocs' else '[]'::jsonb end) d
where not exists (select 1 from public.coach_documents x where x.coach_id = c.id and x.title = coalesce(nullif(d ->> 'title', ''), 'Document'));

drop trigger if exists coaches_sanitize on public.coaches;
create trigger coaches_sanitize before insert or update on public.coaches
  for each row execute function public.sanitize_coach();

-- Nettoyage des fiches existantes (l'adresse et les coordonnées exactes passent dans coach_private)
update public.coaches set data = data
where data ? 'address' or data ? 'verificationDocs'
   or (data ->> 'latitude') ~ '\.\d{3,}' or (data ->> 'longitude') ~ '\.\d{3,}';

-- Dépôt d'un document : la fiche passe « en cours de vérification »
create or replace function public.on_coach_document()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and not (public.fmc_trusted() or public.is_admin()) then
    new.status := 'pending'; new.admin_feedback := null; new.reviewed_at := null; new.reviewed_by := null;
    perform set_config('fmc.trusted', 'on', true);
    update public.coaches set data = data || jsonb_build_object('verificationStatus', 'pending')
      where id = new.coach_id and coalesce(data ->> 'verificationStatus', 'unverified') = 'unverified';
    perform set_config('fmc.trusted', '', true);
  end if;
  return new;
end;
$$;
drop trigger if exists coach_documents_guard on public.coach_documents;
create trigger coach_documents_guard before insert on public.coach_documents
  for each row execute function public.on_coach_document();

create or replace function public.admin_review_document(p_document_id uuid, p_status text, p_feedback text default null)
returns void language plpgsql security definer set search_path = public as $$
declare d public.coach_documents;
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs.' using errcode = '42501'; end if;
  if p_status not in ('approved', 'rejected', 'pending') then raise exception 'Statut invalide.'; end if;
  update public.coach_documents
     set status = p_status, admin_feedback = nullif(trim(coalesce(p_feedback, '')), ''), reviewed_at = now(), reviewed_by = auth.uid()::text
   where id = p_document_id returning * into d;
  if d.id is null then raise exception 'Document introuvable.'; end if;
  perform public.fmc_notify(d.owner_id,
    case when p_status = 'approved' then 'verification_approved' else 'verification_rejected' end,
    case when p_status = 'approved' then 'Document validé' else 'Document à revoir' end,
    case when p_status = 'approved' then 'Votre document « ' || d.title || ' » a été validé.'
         else 'Votre document « ' || d.title || ' » doit être complété' || coalesce(' : ' || nullif(trim(p_feedback), ''), '.') end);
end;
$$;

-- Badge « Vérifié » : uniquement après validation explicite par un admin (au moins un document validé)
create or replace function public.admin_set_coach_verification(p_coach_id text, p_verified boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_owner text;
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs.' using errcode = '42501'; end if;
  if p_verified and not exists (select 1 from public.coach_documents where coach_id = p_coach_id and status = 'approved') then
    raise exception 'Validez au moins un document avant de vérifier ce coach.' using errcode = 'P0001';
  end if;
  update public.coaches
     set data = data || jsonb_build_object('verificationStatus', case when p_verified then 'verified' else 'unverified' end)
   where id = p_coach_id returning user_id into v_owner;
  if p_verified then
    perform public.fmc_notify(v_owner, 'verification_approved', 'Profil vérifié ✓', 'Votre profil affiche désormais le badge « Vérifié ».');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Détails de séance : lien de visio, consignes, lieu exact (participants d'une séance confirmée)
-- ---------------------------------------------------------------------------
create table if not exists public.booking_session_details (
  booking_id        text primary key references public.bookings(id) on delete cascade deferrable initially deferred,
  meeting_url       text check (meeting_url is null or (meeting_url ~ '^https://[^\s<>"]+$' and char_length(meeting_url) <= 500)),
  prep_instructions text check (prep_instructions is null or char_length(prep_instructions) <= 2000),
  session_address   text,
  updated_at        timestamptz not null default now(),
  updated_by        text
);
alter table public.booking_session_details enable row level security;
drop policy if exists session_details_select on public.booking_session_details;
create policy session_details_select on public.booking_session_details for select to authenticated
  using (exists (
    select 1 from public.bookings b
    where b.id = booking_id and b.status in ('confirmed', 'completed')
      and (b.client_id = auth.uid()::text or b.coach_user_id = auth.uid()::text)
  ) or public.is_admin());
-- Écriture uniquement via set_session_details() et les déclencheurs.

-- Le coach ajoute / modifie le lien et les consignes (séance confirmée uniquement)
create or replace function public.set_session_details(p_booking_id text, p_meeting_url text, p_prep_instructions text)
returns public.booking_session_details language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  v_url text := nullif(trim(coalesce(p_meeting_url, '')), '');
  v_prep text := nullif(trim(coalesce(p_prep_instructions, '')), '');
  v_old text;
  r public.booking_session_details;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null or b.coach_user_id is distinct from auth.uid()::text then
    raise exception 'Réservation introuvable.' using errcode = '42501';
  end if;
  if b.status <> 'confirmed' then
    raise exception 'Le lien ne peut être ajouté qu''à une séance confirmée.' using errcode = 'P0001';
  end if;
  if v_url is not null and (v_url !~ '^https://[^\s<>"]+$' or char_length(v_url) > 500) then
    raise exception 'Le lien doit commencer par https:// (Google Meet, Zoom, Teams…).' using errcode = '22023';
  end if;
  if v_prep is not null and char_length(v_prep) > 2000 then
    raise exception 'Consignes trop longues (2000 caractères maximum).' using errcode = '22023';
  end if;

  select meeting_url into v_old from public.booking_session_details where booking_id = p_booking_id;
  insert into public.booking_session_details as d (booking_id, meeting_url, prep_instructions, updated_at, updated_by)
  values (p_booking_id, v_url, v_prep, now(), auth.uid()::text)
  on conflict (booking_id) do update
    set meeting_url = excluded.meeting_url, prep_instructions = excluded.prep_instructions,
        updated_at = now(), updated_by = excluded.updated_by
  returning * into r;

  if v_url is not null and v_url is distinct from v_old then
    perform public.fmc_notify(b.client_id, 'session_link',
      case when v_old is null then 'Lien de séance disponible' else 'Lien de séance modifié' end,
      'Le lien pour votre séance du ' || to_char(b.date, 'DD/MM') || ' à ' || coalesce(b.data ->> 'startTime', '') ||
      ' avec ' || coalesce(b.data ->> 'coachName', 'votre coach') || ' est disponible dans le détail de la réservation.',
      p_booking_id);
  end if;
  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Réservations : garde renforcée + anti double réservation
-- ---------------------------------------------------------------------------
create or replace function public.guard_booking()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  trusted boolean := public.fmc_trusted() or public.is_admin();
  v_addr text;
begin
  if tg_op = 'INSERT' then
    if not trusted then
      new.status := 'pending';
      new.data := new.data || jsonb_build_object('bookingStatus', 'pending', 'paymentStatus', 'pending');
    end if;
    -- Adresse du client (séance à domicile) : réservée aux participants une fois la séance confirmée
    v_addr := nullif(trim(coalesce(new.data ->> 'clientAddress', '')), '');
    new.data := new.data - 'clientAddress' - 'meetingLink';
    if v_addr is not null then
      insert into public.booking_session_details (booking_id, session_address, updated_at)
      values (new.id, v_addr, now())
      on conflict (booking_id) do update set session_address = excluded.session_address, updated_at = now();
    end if;
    -- Créneau encore libre ? (verrou : deux demandes simultanées ne peuvent pas passer toutes les deux)
    if new.status in ('pending', 'confirmed') then
      perform public.fmc_lock_slot(new.coach_id, new.date);
      if public.fmc_slot_conflict(new.coach_id, new.date, new.data ->> 'startTime', new.data ->> 'endTime',
                                  new.availability_id, new.id, true, new.client_id) then
        raise exception 'Ce créneau vient d''être réservé. Choisissez un autre horaire.' using errcode = 'P0001';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE
  new.data := new.data - 'clientAddress' - 'meetingLink';
  if trusted then
    new.data := new.data || jsonb_build_object('bookingStatus', new.status);
    return new;
  end if;

  -- Champs non modifiables par l'app (paiement, prix, horaire : seuls le serveur ou un report accepté les changent)
  new.client_id := old.client_id;
  new.coach_id := old.coach_id;
  new.date := old.date;
  new.availability_id := old.availability_id;
  new.data := public.fmc_keep(new.data, old.data, array[
    'paymentStatus', 'total', 'clientId', 'coachId', 'price', 'serviceFee', 'taxes', 'travelFee',
    'date', 'startTime', 'endTime', 'availabilityId', 'sessionType', 'format',
    'reminder24Sent', 'reminder1hSent', 'linkReminderSent', 'rescheduledAt', 'rescheduleCount'
  ]);

  if new.status is distinct from old.status then
    if old.status = 'pending' and new.status = 'cancelled' then
      null; -- abandon d'une réservation non payée
    elsif old.status = 'confirmed' and new.status = 'completed' and old.coach_user_id = auth.uid()::text then
      null; -- le coach clôture la séance (action manuelle uniquement)
    else
      raise exception 'Action non autorisée sur cette réservation.' using errcode = 'P0001';
    end if;
  end if;

  new.data := new.data || jsonb_build_object('bookingStatus', new.status);
  return new;
end;
$$;

-- Une séance ne peut être confirmée deux fois sur le même créneau (filet de sécurité de la base)
do $$ begin
  create unique index if not exists bookings_one_confirmed_per_slot on public.bookings (availability_id)
    where availability_id is not null and status in ('confirmed', 'completed');
exception when unique_violation then
  raise notice 'Index bookings_one_confirmed_per_slot non créé : des doublons existent déjà, à vérifier.';
end $$;
create index if not exists bookings_coach_date_idx on public.bookings (coach_id, date);
create index if not exists bookings_client_idx on public.bookings (client_id);
create index if not exists bookings_coach_user_idx on public.bookings (coach_user_id);

-- Pour create-checkout et la confirmation de paiement (serveur uniquement)
create or replace function public.fmc_booking_conflict(p_booking_id text, p_include_pending boolean default false)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select public.fmc_slot_conflict(b.coach_id, b.date, b.data ->> 'startTime', b.data ->> 'endTime',
                                    b.availability_id, b.id, p_include_pending, b.client_id)
    from public.bookings b where b.id = p_booking_id), false);
$$;

-- Réservation confirmée : préparation des détails de séance (lieu du coach, consignes par défaut)
create or replace function public.on_booking_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_fmt text; v_coach_addr text; v_prep text;
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    v_fmt := coalesce(new.data ->> 'format', new.data -> 'sessionType' ->> 'format', 'online');
    select address into v_coach_addr from public.coach_private where coach_id = new.coach_id;
    select nullif(trim(coalesce(data ->> 'prepInstructions', '')), '') into v_prep from public.coaches where id = new.coach_id;
    insert into public.booking_session_details as d (booking_id, prep_instructions, session_address, updated_at)
    values (new.id, v_prep, case when v_fmt in ('online', 'home') then null else v_coach_addr end, now())
    on conflict (booking_id) do update set
      prep_instructions = coalesce(d.prep_instructions, excluded.prep_instructions),
      session_address   = coalesce(d.session_address, excluded.session_address);
  end if;
  if new.status in ('cancelled', 'rejected') and old.status is distinct from new.status then
    update public.booking_reschedules set status = 'cancelled', responded_at = now()
     where booking_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Report de séance (accord de l'autre partie, sans nouveau paiement)
-- ---------------------------------------------------------------------------
create table if not exists public.booking_reschedules (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          text not null references public.bookings(id) on delete cascade,
  requested_by        text not null,
  requester_role      text not null check (requester_role in ('client', 'coach')),
  old_date            date not null,
  old_start           text not null,
  old_end             text,
  old_availability_id text,
  new_date            date not null,
  new_start           text not null,
  new_end             text,
  new_availability_id text not null,
  message             text check (message is null or char_length(message) <= 500),
  status              text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at          timestamptz not null default now(),
  responded_at        timestamptz,
  responded_by        text
);
create unique index if not exists booking_reschedules_one_pending on public.booking_reschedules (booking_id) where status = 'pending';
create index if not exists booking_reschedules_booking_idx on public.booking_reschedules (booking_id, created_at desc);
alter table public.booking_reschedules enable row level security;
drop policy if exists booking_reschedules_select on public.booking_reschedules;
create policy booking_reschedules_select on public.booking_reschedules for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id
                 and (b.client_id = auth.uid()::text or b.coach_user_id = auth.uid()::text)) or public.is_admin());
-- Écriture uniquement via propose_reschedule() / respond_reschedule().

drop trigger if exists bookings_status_after on public.bookings;
create trigger bookings_status_after after update of status on public.bookings
  for each row execute function public.on_booking_status();

create or replace function public.fmc_reschedule_min_hours()
returns numeric language sql stable set search_path = public as $$
  select coalesce((select (value #>> '{}')::numeric from public.app_settings where key = 'reschedule_min_hours'), 24);
$$;

create or replace function public.propose_reschedule(p_booking_id text, p_new_availability_id text, p_message text default null)
returns public.booking_reschedules language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  a public.availabilities;
  v_uid text := auth.uid()::text;
  v_role text;
  v_new_start text; v_new_end text;
  r public.booking_reschedules;
  v_min numeric := public.fmc_reschedule_min_hours();
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if b.id is null or v_uid is null or (v_uid <> b.client_id and v_uid is distinct from b.coach_user_id) then
    raise exception 'Réservation introuvable.' using errcode = '42501';
  end if;
  v_role := case when v_uid = b.client_id then 'client' else 'coach' end;
  if b.status <> 'confirmed' then
    raise exception 'Seule une séance confirmée peut être reportée.' using errcode = 'P0001';
  end if;
  -- Règle validée le 11 oct. 2026 : le client jusqu'à 24 h avant la séance, le coach à tout moment
  if v_role = 'client' and public.fmc_session_start(b.date, b.data ->> 'startTime') < now() + make_interval(hours => v_min::int) then
    raise exception 'Un report doit être demandé au moins % h avant la séance. Contactez l''autre participant via la messagerie.', v_min
      using errcode = 'P0001';
  end if;

  -- V1 : même coach, même type de séance, même prix → le nouveau créneau doit être un créneau de ce coach
  select * into a from public.availabilities where id = p_new_availability_id;
  if a.id is null or a.coach_id <> b.coach_id then
    raise exception 'Ce créneau n''est pas proposé par ce coach.' using errcode = 'P0001';
  end if;
  if a.id = b.availability_id then
    raise exception 'Choisissez un créneau différent de l''actuel.' using errcode = 'P0001';
  end if;
  v_new_start := a.data ->> 'startTime';
  v_new_end := a.data ->> 'endTime';
  if public.fmc_session_start(a.date, v_new_start) < now() + interval '2 hours' then
    raise exception 'Ce créneau est trop proche ou déjà passé.' using errcode = 'P0001';
  end if;
  perform public.fmc_lock_slot(b.coach_id, a.date);
  if public.fmc_slot_conflict(b.coach_id, a.date, v_new_start, v_new_end, a.id, b.id, true, null) then
    raise exception 'Ce créneau n''est plus disponible.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.booking_reschedules where booking_id = b.id and status = 'pending') then
    raise exception 'Une demande de report est déjà en attente pour cette séance.' using errcode = 'P0001';
  end if;

  insert into public.booking_reschedules (booking_id, requested_by, requester_role, old_date, old_start, old_end, old_availability_id,
                                          new_date, new_start, new_end, new_availability_id, message)
  values (b.id, v_uid, v_role, b.date, coalesce(b.data ->> 'startTime', ''), b.data ->> 'endTime', b.availability_id,
          a.date, v_new_start, v_new_end, a.id, nullif(trim(coalesce(p_message, '')), ''))
  returning * into r;

  perform public.fmc_notify(case when v_role = 'client' then b.coach_user_id else b.client_id end, 'reschedule_request',
    'Demande de report de séance',
    case when v_role = 'client' then coalesce(b.data ->> 'clientName', 'Votre client') else coalesce(b.data ->> 'coachName', 'Votre coach') end ||
    ' propose de déplacer la séance du ' || to_char(b.date, 'DD/MM') || ' à ' || coalesce(b.data ->> 'startTime', '') ||
    ' au ' || to_char(a.date, 'DD/MM') || ' à ' || v_new_start || '. Répondez depuis le détail de la réservation.',
    b.id);
  return r;
end;
$$;

-- p_action : 'accept' | 'decline' (autre participant) ou 'cancel' (auteur de la demande)
create or replace function public.respond_reschedule(p_request_id uuid, p_action text)
returns public.booking_reschedules language plpgsql security definer set search_path = public as $$
declare
  r public.booking_reschedules;
  b public.bookings;
  v_uid text := auth.uid()::text;
  v_other text;
begin
  select * into r from public.booking_reschedules where id = p_request_id for update;
  if r.id is null then raise exception 'Demande introuvable.' using errcode = '42501'; end if;
  select * into b from public.bookings where id = r.booking_id for update;
  if v_uid is null or (v_uid <> b.client_id and v_uid is distinct from b.coach_user_id) then
    raise exception 'Demande introuvable.' using errcode = '42501';
  end if;
  if r.status <> 'pending' then raise exception 'Cette demande a déjà été traitée.' using errcode = 'P0001'; end if;

  if p_action = 'cancel' then
    if v_uid <> r.requested_by then raise exception 'Seul l''auteur peut retirer sa demande.' using errcode = '42501'; end if;
    update public.booking_reschedules set status = 'cancelled', responded_at = now(), responded_by = v_uid where id = r.id returning * into r;
    return r;
  end if;

  if v_uid = r.requested_by then
    raise exception 'La demande doit être acceptée par l''autre participant.' using errcode = '42501';
  end if;
  v_other := r.requested_by;

  if p_action = 'decline' then
    update public.booking_reschedules set status = 'declined', responded_at = now(), responded_by = v_uid where id = r.id returning * into r;
    perform public.fmc_notify(v_other, 'reschedule_declined', 'Report refusé',
      'Le report de la séance du ' || to_char(r.old_date, 'DD/MM') || ' à ' || r.old_start || ' a été refusé. L''horaire initial est maintenu.', b.id);
    return r;
  end if;

  if p_action <> 'accept' then raise exception 'Action inconnue.'; end if;
  if b.status <> 'confirmed' then raise exception 'Cette séance ne peut plus être reportée.' using errcode = 'P0001'; end if;
  if b.date <> r.old_date or coalesce(b.data ->> 'startTime', '') <> r.old_start then
    raise exception 'L''horaire de la séance a changé depuis la demande.' using errcode = 'P0001';
  end if;
  if public.fmc_session_start(r.new_date, r.new_start) < now() + interval '1 hour' then
    raise exception 'Le créneau proposé est désormais trop proche.' using errcode = 'P0001';
  end if;
  perform public.fmc_lock_slot(b.coach_id, r.new_date);
  if public.fmc_slot_conflict(b.coach_id, r.new_date, r.new_start, r.new_end, r.new_availability_id, b.id, true, null) then
    raise exception 'Ce créneau a été réservé entre-temps. L''horaire initial est maintenu.' using errcode = 'P0001';
  end if;

  perform set_config('fmc.trusted', 'on', true);
  update public.bookings set
    date = r.new_date,
    availability_id = r.new_availability_id,
    data = (data - 'reminder24Sent' - 'reminder1hSent' - 'linkReminderSent') || jsonb_build_object(
      'date', r.new_date::text, 'startTime', r.new_start, 'endTime', r.new_end, 'availabilityId', r.new_availability_id,
      'rescheduledAt', now(), 'rescheduleCount', coalesce((data ->> 'rescheduleCount')::int, 0) + 1)
  where id = b.id;
  perform set_config('fmc.trusted', '', true);

  update public.booking_reschedules set status = 'accepted', responded_at = now(), responded_by = v_uid where id = r.id returning * into r;

  perform public.fmc_notify(b.client_id, 'reschedule_accepted', 'Séance déplacée',
    'Votre séance avec ' || coalesce(b.data ->> 'coachName', 'votre coach') || ' a lieu désormais le ' ||
    to_char(r.new_date, 'DD/MM') || ' à ' || r.new_start || '.', b.id);
  perform public.fmc_notify(b.coach_user_id, 'reschedule_accepted', 'Séance déplacée',
    'La séance avec ' || coalesce(b.data ->> 'clientName', 'votre client') || ' a lieu désormais le ' ||
    to_char(r.new_date, 'DD/MM') || ' à ' || r.new_start || '.', b.id);
  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Compte rendu de séance (après une séance terminée)
-- ---------------------------------------------------------------------------
create table if not exists public.session_reports (
  booking_id    text primary key references public.bookings(id) on delete cascade,
  coach_user_id text not null,
  client_id     text not null,
  summary       text not null check (char_length(summary) between 1 and 3000),
  next_actions  text check (next_actions is null or char_length(next_actions) <= 2000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.session_reports enable row level security;
drop policy if exists session_reports_select on public.session_reports;
create policy session_reports_select on public.session_reports for select to authenticated
  using (client_id = auth.uid()::text or coach_user_id = auth.uid()::text or public.is_admin());

create or replace function public.save_session_report(p_booking_id text, p_summary text, p_next_actions text default null)
returns public.session_reports language plpgsql security definer set search_path = public as $$
declare b public.bookings; r public.session_reports; v_new boolean;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null or b.coach_user_id is distinct from auth.uid()::text then
    raise exception 'Réservation introuvable.' using errcode = '42501';
  end if;
  if b.status <> 'completed' then
    raise exception 'Marquez d''abord la séance comme terminée.' using errcode = 'P0001';
  end if;
  if nullif(trim(coalesce(p_summary, '')), '') is null then
    raise exception 'Le compte rendu est vide.' using errcode = '22023';
  end if;
  v_new := not exists (select 1 from public.session_reports where booking_id = b.id);
  insert into public.session_reports as s (booking_id, coach_user_id, client_id, summary, next_actions)
  values (b.id, b.coach_user_id, b.client_id, trim(p_summary), nullif(trim(coalesce(p_next_actions, '')), ''))
  on conflict (booking_id) do update set summary = excluded.summary, next_actions = excluded.next_actions, updated_at = now()
  returning * into r;
  if v_new then
    perform public.fmc_notify(b.client_id, 'session_report', 'Compte rendu de séance',
      coalesce(b.data ->> 'coachName', 'Votre coach') || ' a partagé le compte rendu de votre séance du ' || to_char(b.date, 'DD/MM') || '.', b.id);
  end if;
  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Signalement d'un problème sur une réservation
-- ---------------------------------------------------------------------------
create table if not exists public.booking_issues (
  id            uuid primary key default gen_random_uuid(),
  booking_id    text not null references public.bookings(id) on delete cascade,
  reporter_id   text not null,
  reporter_role text not null default 'client' check (reporter_role in ('client', 'coach')),
  category      text not null check (category in ('no_show', 'technical', 'behaviour', 'other')),
  description   text check (description is null or char_length(description) <= 2000),
  status        text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'dismissed')),
  admin_note    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists booking_issues_status_idx on public.booking_issues (status, created_at desc);
create index if not exists booking_issues_booking_idx on public.booking_issues (booking_id);
alter table public.booking_issues enable row level security;
drop policy if exists booking_issues_select on public.booking_issues;
create policy booking_issues_select on public.booking_issues for select to authenticated
  using (reporter_id = auth.uid()::text or public.is_admin());
drop policy if exists booking_issues_insert on public.booking_issues;
create policy booking_issues_insert on public.booking_issues for insert to authenticated
  with check (reporter_id = auth.uid()::text and exists (
    select 1 from public.bookings b where b.id = booking_id
      and b.status in ('confirmed', 'completed', 'cancelled')
      and (b.client_id = auth.uid()::text or b.coach_user_id = auth.uid()::text)));
drop policy if exists booking_issues_admin_update on public.booking_issues;
create policy booking_issues_admin_update on public.booking_issues for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.guard_booking_issue()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_admin() then
      new.status := 'open'; new.admin_note := null;
    end if;
    select case when b.coach_user_id = new.reporter_id then 'coach' else 'client' end into new.reporter_role
      from public.bookings b where b.id = new.booking_id;
  else
    new.booking_id := old.booking_id; new.reporter_id := old.reporter_id; new.reporter_role := old.reporter_role;
    new.category := old.category; new.description := old.description; new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists booking_issues_guard on public.booking_issues;
create trigger booking_issues_guard before insert or update on public.booking_issues
  for each row execute function public.guard_booking_issue();

-- ---------------------------------------------------------------------------
-- 7. Reprise des données existantes
-- ---------------------------------------------------------------------------
-- Liens de visio et adresses déjà présents dans les réservations → table privée
insert into public.booking_session_details (booking_id, meeting_url, session_address, updated_at)
select b.id,
       case when (b.data ->> 'meetingLink') ~ '^https://[^\s<>"]+$' and char_length(b.data ->> 'meetingLink') <= 500 then b.data ->> 'meetingLink' end,
       nullif(trim(coalesce(b.data ->> 'clientAddress', '')), ''),
       now()
from public.bookings b
where (b.data ? 'meetingLink' or b.data ? 'clientAddress')
  and not exists (select 1 from public.booking_session_details d where d.booking_id = b.id);
update public.bookings set data = data - 'meetingLink' - 'clientAddress'
where data ? 'meetingLink' or data ? 'clientAddress';

-- ---------------------------------------------------------------------------
-- 8. Droits d'exécution
-- ---------------------------------------------------------------------------
revoke execute on function public.fmc_notify(text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.fmc_slot_conflict(text, date, text, text, text, text, boolean, text) from public, anon, authenticated;
revoke execute on function public.fmc_booking_conflict(text, boolean) from public, anon, authenticated;
grant execute on function public.fmc_booking_conflict(text, boolean) to service_role;
revoke execute on function public.fmc_lock_slot(text, date) from public, anon, authenticated;
revoke execute on function public.sanitize_coach() from public, anon, authenticated;
revoke execute on function public.on_coach_document() from public, anon, authenticated;
revoke execute on function public.on_booking_status() from public, anon, authenticated;
revoke execute on function public.guard_booking_issue() from public, anon, authenticated;
revoke execute on function public.guard_booking() from public, anon, authenticated;

revoke execute on function public.set_session_details(text, text, text) from public, anon;
grant execute on function public.set_session_details(text, text, text) to authenticated;
revoke execute on function public.propose_reschedule(text, text, text) from public, anon;
grant execute on function public.propose_reschedule(text, text, text) to authenticated;
revoke execute on function public.respond_reschedule(uuid, text) from public, anon;
grant execute on function public.respond_reschedule(uuid, text) to authenticated;
revoke execute on function public.save_session_report(text, text, text) from public, anon;
grant execute on function public.save_session_report(text, text, text) to authenticated;
revoke execute on function public.admin_review_document(uuid, text, text) from public, anon;
grant execute on function public.admin_review_document(uuid, text, text) to authenticated;
revoke execute on function public.admin_set_coach_verification(text, boolean) from public, anon;
grant execute on function public.admin_set_coach_verification(text, boolean) to authenticated;

grant select on public.booking_session_details, public.booking_reschedules, public.session_reports,
                public.coach_private, public.coach_documents, public.booking_issues to authenticated;
grant insert, delete on public.coach_documents to authenticated;
grant insert, update on public.booking_issues to authenticated;

-- Temps réel : l'autre participant voit tout de suite une demande de report
do $$ begin
  alter publication supabase_realtime add table public.booking_reschedules;
exception when others then null; end $$;

-- Chemin de recherche figé (recommandation de l'outil de sécurité Supabase)
alter function public.fmc_session_start(date, text) set search_path = public;
alter function public.fmc_keep(jsonb, jsonb, text[]) set search_path = public;
alter function public.fmc_lock_slot(text, date) set search_path = public;
