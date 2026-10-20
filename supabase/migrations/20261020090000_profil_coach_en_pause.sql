-- Find My Coach — « client d'abord » : le profil coach se met en pause et se réactive (20 oct. 2026)
--   • tout compte reste client ; « devenir coach » ajoute un profil coach (un seul par compte, index coaches_user_unique) ;
--   • le compte peut repasser de coach à client : son profil coach est alors masqué (is_active = false, pausedByOwner) ;
--   • en redevenant coach, le profil mis en pause par son propriétaire est réactivé (pas celui masqué par un admin) ;
--   • le serveur refuse une nouvelle réservation chez un coach masqué.

create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  service boolean := coalesce(auth.jwt() ->> 'role', '') = 'service_role' or auth.uid() is null;
begin
  if not service then
    new.id := old.id;
    new.email := old.email;            -- l'email suit le compte Auth, pas l'app
    new.created_at := old.created_at;
    if new.role is distinct from old.role then
      if new.role not in ('client', 'coach') then
        raise exception 'Rôle non autorisé.' using errcode = '42501';
      end if;
      if not (public.is_admin() or (old.role in ('client', 'coach') and new.role in ('client', 'coach'))) then
        raise exception 'Changement de rôle non autorisé' using errcode = '42501';
      end if;
    end if;
  end if;

  -- Pause et réactivation du profil coach
  if new.role is distinct from old.role then
    perform set_config('fmc.trusted', 'on', true);
    if old.role = 'coach' and new.role = 'client' then
      update public.coaches
        set is_active = false, data = data || jsonb_build_object('isActive', false, 'pausedByOwner', true)
        where user_id = new.id::text;
    elsif old.role = 'client' and new.role = 'coach' then
      update public.coaches
        set is_active = true, data = (data - 'pausedByOwner') || jsonb_build_object('isActive', true)
        where user_id = new.id::text and coalesce((data ->> 'pausedByOwner')::boolean, false);
    end if;
    perform set_config('fmc.trusted', '', true);
  end if;

  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;

-- Le propriétaire ne peut pas réactiver lui-même une fiche masquée par un admin (ni la masquer en contournant la pause)
create or replace function public.fmc_coach_active_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.fmc_trusted() or public.is_admin() then
    return new;
  end if;
  -- La marque de pause n'est posée ou retirée que par le serveur (l'app renvoie la fiche sans elle)
  new.data := public.fmc_keep(new.data, old.data, array['pausedByOwner']);
  if new.is_active and not old.is_active then
    -- Réactivation directe par l'app : seulement un profil mis en pause par son propriétaire, redevenu coach
    if not exists (select 1 from public.profiles p where p.id::text = new.user_id and p.role = 'coach')
       or not coalesce((old.data ->> 'pausedByOwner')::boolean, false) then
      new.is_active := false;
      new.data := new.data || jsonb_build_object('isActive', false);
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.fmc_coach_active_guard() from public, anon, authenticated;
drop trigger if exists fmc_coach_active_guard on public.coaches;
create trigger fmc_coach_active_guard before update on public.coaches
  for each row execute function public.fmc_coach_active_guard();

-- Pas de nouvelle réservation chez un coach masqué
create or replace function public.fmc_booking_coach_active()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.fmc_trusted() or public.is_admin() then
    return new;
  end if;
  if not exists (select 1 from public.coaches c where c.id = new.coach_id and c.is_active) then
    raise exception 'Ce coach ne prend pas de nouvelles réservations pour le moment.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.fmc_booking_coach_active() from public, anon, authenticated;
drop trigger if exists fmc_booking_coach_active on public.bookings;
create trigger fmc_booking_coach_active before insert on public.bookings
  for each row execute function public.fmc_booking_coach_active();
