-- Find My Coach — temps de réponse du coach et « Populaire cette semaine » (19 oct. 2026)
-- Calculés par le serveur toutes les heures dans coach_signals (lisible par tous, modifiable par personne depuis l'app ;
-- le nombre de réservations n'y est pas publié).
--   • temps de réponse : médiane, sur 60 jours, du délai entre le premier message d'un client (qui attend une réponse)
--     et la réponse du coach ; un message resté plus de 48 h sans réponse compte pour 72 h ; au moins 3 messages ;
--   • populaire : au moins 3 réservations (non annulées ni refusées) créées ces 7 derniers jours,
--     parmi les 5 coachs les plus réservés de la semaine.

create table if not exists public.coach_signals (
  coach_id          text primary key references public.coaches(id) on delete cascade,
  response_minutes  integer,          -- null : pas assez de messages pour l'afficher
  popular           boolean not null default false,
  updated_at        timestamptz not null default now()
);
alter table public.coach_signals enable row level security;
drop policy if exists coach_signals_select on public.coach_signals;
create policy coach_signals_select on public.coach_signals for select to anon, authenticated using (true);

create or replace function public.fmc_refresh_coach_signals()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with cu as (
    select id as coach_id, user_id from public.coaches where user_id ~ '^[0-9a-f-]{36}$'
  ),
  -- Messages échangés avec chaque coach (60 jours), avec l'expéditeur du message précédent de la conversation
  m as (
    select cu.coach_id, cu.user_id as coach_user,
           case when msg.sender_id = cu.user_id then msg.recipient_id else msg.sender_id end as client,
           msg.sender_id, msg.created_at,
           lag(msg.sender_id) over (partition by cu.coach_id,
             case when msg.sender_id = cu.user_id then msg.recipient_id else msg.sender_id end order by msg.created_at) as prev_sender
    from public.messages msg
    join cu on cu.user_id in (msg.sender_id, msg.recipient_id)
    where msg.created_at > now() - interval '60 days' and msg.sender_id <> msg.recipient_id
  ),
  -- Un client commence à attendre : son message suit un message du coach (ou ouvre la conversation)
  waits as (
    select w.coach_id, w.created_at,
           (select min(r.created_at) from m r
             where r.coach_id = w.coach_id and r.client = w.client and r.sender_id = w.coach_user and r.created_at > w.created_at) as replied_at
    from m w
    where w.sender_id = w.client and (w.prev_sender is null or w.prev_sender = w.coach_user)
  ),
  delays as (
    select coach_id,
           case when replied_at is not null then extract(epoch from replied_at - created_at) / 60
                when created_at < now() - interval '48 hours' then 72 * 60 end as minutes
    from waits
  ),
  resp as (
    select coach_id, round(percentile_cont(0.5) within group (order by minutes))::int as response_minutes
    from delays where minutes is not null
    group by coach_id having count(*) >= 3
  ),
  week as (
    select b.coach_id, count(*)::int as bookings_week
    from public.bookings b
    where b.status not in ('cancelled', 'rejected')
      and (b.data ->> 'createdAt') ~ '^\d{4}-\d{2}-\d{2}T'
      and (b.data ->> 'createdAt')::timestamptz > now() - interval '7 days'
    group by b.coach_id
  ),
  ranked as (
    select coach_id, bookings_week, rank() over (order by bookings_week desc) as rk from week
  ),
  allc as (
    select c.id as coach_id, r.response_minutes,
           coalesce(k.bookings_week >= 3 and k.rk <= 5, false) as popular
    from public.coaches c
    left join resp r on r.coach_id = c.id
    left join ranked k on k.coach_id = c.id
  )
  insert into public.coach_signals as s (coach_id, response_minutes, popular, updated_at)
  select coach_id, response_minutes, popular, now() from allc
  on conflict (coach_id) do update set
    response_minutes = excluded.response_minutes,
    popular = excluded.popular,
    updated_at = now();
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.fmc_refresh_coach_signals() from public, anon, authenticated;

do $$ begin perform cron.unschedule('fmc-coach-signals'); exception when others then null; end $$;
select cron.schedule('fmc-coach-signals', '7 * * * *', $$select public.fmc_refresh_coach_signals()$$);

select public.fmc_refresh_coach_signals();
