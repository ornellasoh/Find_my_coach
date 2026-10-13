-- Find My Coach — clôture automatique des séances et profil des bêta-testeurs (13 oct. 2026)

-- ---------- Clôture automatique ----------
-- Une séance confirmée et payée passe à « effectuée » 2 h après son heure de fin (heure de Paris) si le coach
-- ne l'a pas clôturée lui-même. Sans cela, la demande d'avis (fmc_review_requests) ne part jamais.
-- Une séance avec un signalement en cours reste « confirmée » : c'est à l'équipe de trancher.
create or replace function public.fmc_auto_complete()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with due as (
    select b.id
    from public.bookings b
    where b.status = 'confirmed'
      and b.date <= current_date
      and b.data ->> 'paymentStatus' = 'paid'
      and (b.data ->> 'endTime') ~ '^\d{2}:\d{2}$'
      and ((b.date::text || ' ' || (b.data ->> 'endTime'))::timestamp at time zone 'Europe/Paris') + interval '2 hours' <= now()
      and not exists (
        select 1 from public.booking_issues i
        where i.booking_id = b.id and i.status in ('open', 'in_progress'))
    order by b.date
    limit 200
    for update of b skip locked
  )
  update public.bookings b
     set status = 'completed',
         data = b.data || jsonb_build_object('autoCompletedAt', now())
    from due
   where b.id = due.id;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.fmc_auto_complete() from public, anon, authenticated;

-- La clôture passe juste avant la demande d'avis, dans la même tâche planifiée.
select cron.schedule('fmc-review-requests', '*/15 * * * *',
  $$select public.fmc_auto_complete(); select public.fmc_review_requests()$$);

-- ---------- Bêta-testeurs : client ou coach ----------
-- Choix fait dans le formulaire de findmycoach.io (« Je cherche un coach » / « Je suis coach »).
alter table public.beta_testers
  add column if not exists role text check (role is null or role in ('client', 'coach'));
