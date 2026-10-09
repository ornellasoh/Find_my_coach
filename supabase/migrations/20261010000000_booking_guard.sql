-- Find My Coach — protection des réservations
-- Seul le serveur (fonctions Stripe) peut confirmer un paiement ou annuler une séance payée.
-- Les utilisateurs peuvent : créer une réservation « en attente », annuler une réservation non payée,
-- et le coach peut marquer une séance comme terminée.

create or replace function public.guard_booking()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  -- Fonctions serveur (service_role), console SQL (pas de jeton) et administrateurs : pas de restriction
  if jwt_role = 'service_role' or auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.data := new.data || jsonb_build_object('bookingStatus', 'pending', 'paymentStatus', 'pending');
    return new;
  end if;

  -- UPDATE : champs non modifiables par l'app
  new.client_id := old.client_id;
  new.coach_id := old.coach_id;
  new.data := new.data || jsonb_build_object(
    'paymentStatus', old.data -> 'paymentStatus',
    'total', old.data -> 'total',
    'clientId', old.data -> 'clientId',
    'coachId', old.data -> 'coachId'
  );

  if new.status is distinct from old.status then
    if old.status = 'pending' and new.status = 'cancelled' then
      null; -- abandon d'une réservation non payée
    elsif old.status = 'confirmed' and new.status = 'completed' and old.coach_user_id = auth.uid()::text then
      null; -- le coach clôture la séance
    else
      raise exception 'Action non autorisée sur cette réservation.' using errcode = 'P0001';
    end if;
  end if;

  new.data := new.data || jsonb_build_object('bookingStatus', new.status);
  return new;
end;
$$;

create or replace trigger bookings_guard before insert or update on public.bookings
  for each row execute function public.guard_booking();

-- Le coach destinataire est déduit de la fiche ; un coach ne peut pas se réserver lui-même
create or replace function public.set_booking_coach_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select user_id into new.coach_user_id from public.coaches where id = new.coach_id;
  if new.coach_user_id is not null and new.coach_user_id = new.client_id then
    raise exception 'Vous ne pouvez pas réserver une séance avec vous-même.' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
