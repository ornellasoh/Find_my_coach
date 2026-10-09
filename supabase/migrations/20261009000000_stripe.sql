-- Find My Coach — paiements Stripe (Connect) + une seule fiche coach par compte

create unique index if not exists coaches_user_unique on public.coaches(user_id);

-- Comptes Stripe Connect des coachs (écrits uniquement par les fonctions serveur)
create table if not exists public.stripe_accounts (
  coach_id          text primary key references public.coaches(id) on delete cascade,
  account_id        text not null unique,
  charges_enabled   boolean not null default false,
  payouts_enabled   boolean not null default false,
  details_submitted boolean not null default false,
  updated_at        timestamptz not null default now()
);
alter table public.stripe_accounts enable row level security;
create policy stripe_accounts_select on public.stripe_accounts for select to authenticated
  using (exists (select 1 from public.coaches c where c.id = coach_id and (c.user_id = auth.uid()::text or public.is_admin())));

-- Paiements (écrits uniquement par les fonctions serveur / webhook Stripe)
create table if not exists public.payments (
  id                text primary key,            -- id de la session Stripe Checkout
  booking_id        text not null,
  client_id         text not null,
  coach_id          text not null,
  amount_total      integer not null,            -- centimes
  application_fee   integer not null default 0,  -- commission Find My Coach, centimes
  currency          text not null default 'eur',
  status            text not null default 'pending', -- pending | paid | expired | refunded
  payment_intent_id text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists payments_booking_idx on public.payments(booking_id);
alter table public.payments enable row level security;
create policy payments_select on public.payments for select to authenticated
  using (client_id = auth.uid()::text
         or exists (select 1 from public.coaches c where c.id = coach_id and c.user_id = auth.uid()::text)
         or public.is_admin());

-- Une réservation en attente de paiement ne bloque le créneau que 30 minutes
create or replace view public.booked_slots with (security_invoker = false) as
  select availability_id, coach_id, date from public.bookings
  where availability_id is not null
    and (status in ('confirmed','completed') or (status = 'pending' and created_at > now() - interval '30 minutes'));
