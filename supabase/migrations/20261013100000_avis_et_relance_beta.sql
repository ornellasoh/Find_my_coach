-- Find My Coach — demande d'avis 2 h après la séance et relance des bêta-testeurs non confirmés (13 oct. 2026)

-- ---------- Demande d'avis ----------
-- Colonne dédiée (et non un indicateur dans `data`) : l'app ne peut pas l'effacer, donc jamais de demande en double.
alter table public.bookings add column if not exists review_request_sent_at timestamptz;

-- Séances marquées « effectuée », terminées depuis au moins 2 h (heure de Paris) et sans avis :
-- le client reçoit une notification (app + push) qui ouvre le détail de la séance.
create or replace function public.fmc_review_requests()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  for r in
    select b.id, b.client_id, b.data ->> 'coachName' as coach_name
    from public.bookings b
    where b.status = 'completed'
      and b.review_request_sent_at is null
      and b.date >= current_date - 7
      and (b.data ->> 'endTime') ~ '^\d{2}:\d{2}$'
      and ((b.date::text || ' ' || (b.data ->> 'endTime'))::timestamp at time zone 'Europe/Paris') + interval '2 hours' <= now()
      and not exists (select 1 from public.reviews v where v.booking_id = b.id)
    order by b.date
    limit 100
    for update of b skip locked
  loop
    update public.bookings set review_request_sent_at = now() where id = r.id;
    perform public.fmc_notify(
      r.client_id, 'review_request', 'Comment s’est passée votre séance ? ⭐',
      'Laissez un avis à ' || coalesce(nullif(r.coach_name, ''), 'votre coach') || ' : 30 secondes, et vous aidez les prochains clients à choisir.',
      r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.fmc_review_requests() from public, anon, authenticated;

select cron.schedule('fmc-review-requests', '*/15 * * * *', $$select public.fmc_review_requests()$$);

-- ---------- Relance des bêta-testeurs ----------
-- Une seule relance, 24 h après l'inscription, si l'adresse n'est toujours pas confirmée (fonction beta-remind).
alter table public.beta_testers add column if not exists reminder_sent_at timestamptz;

select cron.schedule('fmc-beta-remind', '0 9 * * *', $$select public.call_edge('beta-remind', '{}'::jsonb)$$);
