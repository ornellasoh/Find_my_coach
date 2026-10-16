-- Find My Coach — packs de séances, payés en 1, 3 ou 5 fois (16 oct. 2026)
--
-- Le coach décrit ses packs dans sa fiche (`coaches.data.packs`). Le client en achète un par Stripe :
--   • 1 fois  : paiement unique (Stripe Checkout, mode « payment ») ;
--   • 3 ou 5 fois : échéancier mensuel (Stripe Checkout, mode « subscription ») arrêté après la dernière échéance.
-- Le risque d'impayé est porté par le coach (choix d'Ornella du 16 oct. 2026).
-- Chaque réservation confirmée avec le pack consomme une séance ; une annulation la rend.

-- ---------- Packs achetés ----------
create table if not exists public.pack_purchases (
  id                     text primary key,
  client_id              text not null,
  coach_id               text not null references public.coaches(id) on delete restrict,
  coach_user_id          text,
  pack                   jsonb not null,            -- copie du pack au moment de l'achat (nom, séances, prix, format, validité)
  sessions_total         integer not null check (sessions_total between 1 and 100),
  installments           integer not null check (installments in (1, 3, 5)),
  installment_amount     integer not null,          -- centimes, par échéance
  amount_total           integer not null,          -- centimes, installments × installment_amount
  application_fee        integer not null default 0,-- commission Find My Coach, centimes (sur le total)
  status                 text not null default 'pending'
                         check (status in ('pending', 'active', 'past_due', 'unpaid', 'cancelled', 'expired')),
  checkout_session_id    text unique,
  stripe_subscription_id text unique,
  payment_intent_id      text,
  activated_at           timestamptz,
  expires_at             timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists pack_purchases_client_idx on public.pack_purchases(client_id);
create index if not exists pack_purchases_coach_user_idx on public.pack_purchases(coach_user_id);

-- Échéances payées (une ligne par paiement Stripe : idempotent même si Stripe renvoie l'événement)
create table if not exists public.pack_installments (
  stripe_id   text primary key,                     -- facture (échéancier) ou paiement (1 fois)
  purchase_id text not null references public.pack_purchases(id) on delete cascade,
  amount      integer not null,
  paid_at     timestamptz not null default now()
);
create index if not exists pack_installments_purchase_idx on public.pack_installments(purchase_id);

alter table public.pack_purchases enable row level security;
alter table public.pack_installments enable row level security;

-- Lecture : le client, le coach concerné et les administrateurs. Écriture : uniquement le serveur.
drop policy if exists pack_purchases_select on public.pack_purchases;
create policy pack_purchases_select on public.pack_purchases for select to authenticated
  using (client_id = auth.uid()::text or coach_user_id = auth.uid()::text or public.is_admin());
drop policy if exists pack_installments_select on public.pack_installments;
create policy pack_installments_select on public.pack_installments for select to authenticated
  using (exists (select 1 from public.pack_purchases p where p.id = purchase_id
                 and (p.client_id = auth.uid()::text or p.coach_user_id = auth.uid()::text or public.is_admin())));
revoke insert, update, delete on public.pack_purchases, public.pack_installments from anon, authenticated;
grant select on public.pack_purchases, public.pack_installments to authenticated;

-- ---------- Réservations payées avec un pack ----------
alter table public.bookings add column if not exists pack_purchase_id text references public.pack_purchases(id);
create index if not exists bookings_pack_idx on public.bookings(pack_purchase_id) where pack_purchase_id is not null;

-- L'app ne peut ni poser ni retirer le pack d'une réservation (seule fmc_book_with_pack le fait).
create or replace function public.guard_booking_pack()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.fmc_trusted() or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.pack_purchase_id := null;
  else
    new.pack_purchase_id := old.pack_purchase_id;
  end if;
  return new;
end;
$$;
drop trigger if exists bookings_guard_pack on public.bookings;
create trigger bookings_guard_pack before insert or update on public.bookings
  for each row execute function public.guard_booking_pack();
revoke execute on function public.guard_booking_pack() from public, anon, authenticated;

-- Séances consommées : réservations confirmées ou effectuées avec ce pack
create or replace function public.fmc_pack_used(p_purchase_id text)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.bookings
  where pack_purchase_id = p_purchase_id and status in ('confirmed', 'completed');
$$;
revoke execute on function public.fmc_pack_used(text) from public, anon, authenticated;

-- ---------- Mes packs (client) / packs vendus (coach) ----------
create or replace function public.fmc_pack_balances()
returns table (
  id text, client_id text, client_name text, coach_id text, coach_name text, pack jsonb,
  sessions_total integer, sessions_used integer, installments integer, installments_paid integer,
  installment_amount integer, amount_total integer, application_fee integer,
  status text, activated_at timestamptz, expires_at timestamptz, created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select p.id, p.client_id, coalesce(pr.name, ''), p.coach_id, coalesce(c.data ->> 'name', ''), p.pack,
         p.sessions_total, public.fmc_pack_used(p.id),
         p.installments, (select count(*)::int from public.pack_installments i where i.purchase_id = p.id),
         p.installment_amount, p.amount_total, p.application_fee,
         case when p.status in ('active', 'past_due') and p.expires_at < now() then 'expired' else p.status end,
         p.activated_at, p.expires_at, p.created_at
  from public.pack_purchases p
  left join public.profiles pr on pr.id = p.client_id
  left join public.coaches c on c.id = p.coach_id
  where p.status <> 'pending'
    and (p.client_id = auth.uid()::text or p.coach_user_id = auth.uid()::text)
  order by p.created_at desc;
$$;
revoke execute on function public.fmc_pack_balances() from public, anon;
grant execute on function public.fmc_pack_balances() to authenticated;

-- ---------- Réserver une séance avec un pack ----------
-- La réservation « en attente » a été créée par l'app (créneau vérifié par guard_booking).
-- Ici : contrôle du pack (propriétaire, coach, format, validité, séances restantes, paiements à jour), puis confirmation.
create or replace function public.fmc_book_with_pack(p_booking_id text, p_purchase_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_b public.bookings%rowtype;
  v_p public.pack_purchases%rowtype;
  v_format text;
  v_pack_format text;
  v_unit numeric;
  v_left integer;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;

  -- Verrou sur le pack : deux réservations simultanées ne peuvent pas utiliser la dernière séance
  select * into v_p from public.pack_purchases where id = p_purchase_id for update;
  if not found or v_p.client_id <> auth.uid()::text then raise exception 'Pack introuvable.'; end if;

  select * into v_b from public.bookings where id = p_booking_id for update;
  if not found or v_b.client_id <> auth.uid()::text then raise exception 'Réservation introuvable.'; end if;
  if v_b.status <> 'pending' then raise exception 'Cette réservation est déjà traitée.'; end if;
  if v_b.coach_id <> v_p.coach_id then raise exception 'Ce pack est valable uniquement avec son coach.'; end if;

  if v_p.status = 'past_due' then
    raise exception 'Une échéance de votre pack n’a pas pu être prélevée. Mettez votre paiement à jour pour réserver.';
  end if;
  if v_p.status <> 'active' then raise exception 'Ce pack n’est pas utilisable.'; end if;
  if v_p.expires_at is not null and public.fmc_session_start(v_b.date, v_b.data ->> 'startTime') > v_p.expires_at then
    raise exception 'La séance tombe après la fin de validité de votre pack (%).', to_char(v_p.expires_at at time zone 'Europe/Paris', 'DD/MM/YYYY');
  end if;

  v_format := coalesce(v_b.data ->> 'format', v_b.data -> 'sessionType' ->> 'format');
  v_pack_format := nullif(v_p.pack ->> 'format', '');
  if v_pack_format is not null and v_pack_format <> 'any' and v_format is distinct from v_pack_format then
    raise exception 'Ce pack n’est pas valable pour ce type de séance.';
  end if;

  v_left := v_p.sessions_total - public.fmc_pack_used(v_p.id);
  if v_left <= 0 then raise exception 'Toutes les séances de ce pack ont été utilisées.'; end if;

  if public.fmc_booking_conflict(p_booking_id, false) then
    raise exception 'Ce créneau vient d’être réservé. Choisissez un autre horaire.';
  end if;

  -- Valeur d'une séance du pack (pour le suivi des revenus du coach) ; rien n'est débité ici.
  v_unit := round((v_p.amount_total::numeric / 100) / v_p.sessions_total, 2);

  perform set_config('fmc.trusted', 'on', true);
  update public.bookings set
    status = 'confirmed',
    pack_purchase_id = v_p.id,
    data = data || jsonb_build_object(
      'bookingStatus', 'confirmed', 'paymentStatus', 'paid',
      'paymentMethod', 'Pack « ' || coalesce(v_p.pack ->> 'name', 'séances') || ' »',
      'packPurchaseId', v_p.id,
      'price', v_unit, 'serviceFee', 0, 'taxes', 0, 'travelFee', 0, 'total', v_unit)
  where id = p_booking_id;
  perform set_config('fmc.trusted', '', true);

  perform public.fmc_notify(v_b.client_id, 'booking_confirmed', 'Réservation confirmée',
    'Votre séance avec ' || coalesce(v_b.data ->> 'coachName', 'votre coach') || ' le ' || to_char(v_b.date, 'DD/MM')
    || ' à ' || coalesce(v_b.data ->> 'startTime', '') || ' est confirmée. Il vous reste ' || (v_left - 1) || ' séance(s) dans votre pack.',
    p_booking_id);
  perform public.fmc_notify(v_b.coach_user_id, 'new_booking', 'Nouvelle réservation (pack)',
    coalesce(v_b.data ->> 'clientName', 'Un client') || ' a réservé une séance le ' || to_char(v_b.date, 'DD/MM')
    || ' à ' || coalesce(v_b.data ->> 'startTime', '') || ' avec son pack.',
    p_booking_id);

  return (select data from public.bookings where id = p_booking_id);
end;
$$;
revoke execute on function public.fmc_book_with_pack(text, text) from public, anon;
grant execute on function public.fmc_book_with_pack(text, text) to authenticated;
