-- Find My Coach — délai de 7 jours pour laisser un avis, avec une relance (19 oct. 2026)
--   • demande d'avis 2 h après la séance (inchangé, fmc_review_requests) ;
--   • relance 5 jours après la séance, s'il n'y a toujours pas d'avis (« plus que 2 jours ») ;
--   • passé 7 jours après la fin de la séance, le serveur refuse l'avis.

alter table public.bookings add column if not exists review_reminder_sent_at timestamptz;

-- Fin du délai pour laisser un avis : fin de la séance (heure de Paris) + 7 jours.
create or replace function public.fmc_review_deadline(p_date date, p_end text, p_start text)
returns timestamptz language sql stable set search_path = public as $$
  select public.fmc_session_start(
    p_date,
    case when p_end ~ '^\d{2}:\d{2}$' then p_end when p_start ~ '^\d{2}:\d{2}$' then p_start else '23:59' end
  ) + interval '7 days';
$$;

-- ---------- Contrôle des avis : séance effectuée, et moins de 7 jours après ----------
create or replace function public.fmc_review_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_b public.bookings%rowtype;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select * into v_b from public.bookings b
    where b.id = new.booking_id
      and b.client_id = new.client_id
      and b.coach_id = new.coach_id
      and b.status = 'completed';
    if not found then
      raise exception 'Un avis ne peut être laissé qu’après une séance effectuée avec ce coach.';
    end if;
    if now() > public.fmc_review_deadline(v_b.date, v_b.data ->> 'endTime', v_b.data ->> 'startTime') then
      raise exception 'Le délai de 7 jours pour laisser un avis sur cette séance est dépassé.';
    end if;
    new.coach_reply := null;
    new.coach_reply_at := null;
  else
    -- Le client peut modifier son avis, mais pas la réponse du coach ni à quel coach ou séance il se rapporte.
    if new.coach_reply is distinct from old.coach_reply
       or new.coach_reply_at is distinct from old.coach_reply_at
       or new.coach_id is distinct from old.coach_id
       or new.booking_id is distinct from old.booking_id
       or new.client_id is distinct from old.client_id then
      if coalesce(current_setting('fmc.coach_reply', true), '') <> 'on' then
        raise exception 'Modification non autorisée.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- ---------- Relance : plus que 2 jours pour laisser un avis ----------
create or replace function public.fmc_review_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  for r in
    select b.id, b.client_id, b.data ->> 'coachName' as coach_name,
           public.fmc_review_deadline(b.date, b.data ->> 'endTime', b.data ->> 'startTime') as deadline
    from public.bookings b
    where b.status = 'completed'
      and b.review_request_sent_at is not null
      and b.review_reminder_sent_at is null
      and b.date >= current_date - 8
      and public.fmc_review_deadline(b.date, b.data ->> 'endTime', b.data ->> 'startTime') - interval '2 days' <= now()
      and public.fmc_review_deadline(b.date, b.data ->> 'endTime', b.data ->> 'startTime') > now() + interval '1 hour'
      and not exists (select 1 from public.reviews v where v.booking_id = b.id)
    order by b.date
    limit 100
    for update of b skip locked
  loop
    update public.bookings set review_reminder_sent_at = now() where id = r.id;
    perform public.fmc_notify(
      r.client_id, 'review_reminder', 'Plus que 2 jours pour donner votre avis',
      'Votre avis sur la séance avec ' || coalesce(nullif(r.coach_name, ''), 'votre coach')
      || ' peut être laissé jusqu''au ' || to_char(r.deadline at time zone 'Europe/Paris', 'DD/MM') || '. 30 secondes suffisent.',
      r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.fmc_review_reminders() from public, anon, authenticated;

-- Même tâche planifiée que la clôture automatique et la demande d'avis.
do $$ begin perform cron.unschedule('fmc-review-requests'); exception when others then null; end $$;
select cron.schedule('fmc-review-requests', '*/15 * * * *',
  $$select public.fmc_auto_complete(); select public.fmc_review_requests(); select public.fmc_review_reminders()$$);
