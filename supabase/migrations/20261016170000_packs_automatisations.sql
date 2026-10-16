-- Find My Coach — automatisations des packs de séances (16 oct. 2026)
-- Toutes les notifications passent par fmc_notify : dans l'app, en push et par email (types listés dans EMAIL_TYPES).
--   • 3 jours avant chaque mensualité : rappel au client (montant, date) ;
--   • 14 jours avant la fin de validité, s'il reste des séances : rappel au client ;
--   • plus qu'une séance dans le pack : proposition d'en reprendre un ;
--   • dernière mensualité payée : « Pack entièrement réglé » (envoyé par le webhook Stripe).

alter table public.pack_purchases add column if not exists next_payment_at timestamptz;
alter table public.pack_purchases add column if not exists installment_reminder_for timestamptz;
alter table public.pack_purchases add column if not exists expiry_reminder_sent_at timestamptz;
alter table public.pack_purchases add column if not exists fully_paid_at timestamptz;

-- ---------- Rappels quotidiens ----------
create or replace function public.fmc_pack_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0; v_left integer;
begin
  -- Prochaine mensualité dans les 3 jours (une seule fois par échéance)
  for r in
    select * from public.pack_purchases
    where status = 'active' and next_payment_at is not null
      and next_payment_at between now() and now() + interval '3 days'
      and installment_reminder_for is distinct from next_payment_at
    for update skip locked
  loop
    update public.pack_purchases set installment_reminder_for = r.next_payment_at where id = r.id;
    perform public.fmc_notify(r.client_id, 'pack_installment_reminder', 'Prochaine mensualité de votre pack',
      'Le ' || to_char(r.next_payment_at at time zone 'Europe/Paris', 'DD/MM') || ', '
      || replace(to_char(r.installment_amount / 100.0, 'FM999990.00'), '.', ',') || ' € seront prélevés pour votre pack « '
      || coalesce(r.pack ->> 'name', '') || ' ». Vérifiez que votre carte est toujours valable.');
    n := n + 1;
  end loop;

  -- Fin de validité dans 14 jours avec des séances restantes (une seule fois)
  for r in
    select * from public.pack_purchases
    where status in ('active', 'past_due') and expiry_reminder_sent_at is null
      and expires_at between now() and now() + interval '14 days'
    for update skip locked
  loop
    v_left := r.sessions_total - public.fmc_pack_used(r.id);
    update public.pack_purchases set expiry_reminder_sent_at = now() where id = r.id;
    if v_left > 0 then
      perform public.fmc_notify(r.client_id, 'pack_expiring', 'Votre pack expire bientôt',
        'Il vous reste ' || v_left || ' séance(s) dans votre pack « ' || coalesce(r.pack ->> 'name', '') || ' », valable jusqu''au '
        || to_char(r.expires_at at time zone 'Europe/Paris', 'DD/MM/YYYY') || '. Réservez vos créneaux pour ne pas les perdre.');
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;
revoke all on function public.fmc_pack_reminders() from public, anon, authenticated;

do $$ begin perform cron.unschedule('fmc-pack-reminders'); exception when others then null; end $$;
select cron.schedule('fmc-pack-reminders', '0 8 * * *', $$select public.fmc_pack_reminders()$$);

-- ---------- Réservation avec un pack : prévenir quand il ne reste qu'une séance ----------
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
  if v_left - 1 = 1 then
    perform public.fmc_notify(v_b.client_id, 'pack_last_session', 'Dernière séance de votre pack',
      'Il ne reste plus qu''une séance dans votre pack « ' || coalesce(v_p.pack ->> 'name', '') || ' ». '
      || 'Pensez à en reprendre un depuis la fiche de ' || coalesce(v_b.data ->> 'coachName', 'votre coach') || ' pour continuer.');
  end if;

  return (select data from public.bookings where id = p_booking_id);
end;
$$;
revoke execute on function public.fmc_book_with_pack(text, text) from public, anon;
grant execute on function public.fmc_book_with_pack(text, text) to authenticated;
