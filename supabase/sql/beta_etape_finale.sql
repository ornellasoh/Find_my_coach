-- Find My Coach — bêta, dernière étape (à coller dans Supabase → SQL Editor → Run)
-- Sauvegarde faite le 12 oct. : backup.profiles_20261012, backup.coaches_20261012, backup.push_tokens_20261012

create or replace function public.admin_revoke(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs.' using errcode = '42501'; end if;
  if (select count(*) from public.admin_users) <= 1 and exists (select 1 from public.admin_users where user_id = p_user_id) then
    raise exception 'Impossible de retirer le dernier administrateur.' using errcode = 'P0001';
  end if;
  delete from public.admin_users where user_id = p_user_id;
end;
$$;

create or replace function public.unregister_push_token(p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.push_tokens where token = p_token and user_id = auth.uid()::text;
end;
$$;

revoke execute on function public.admin_revoke(uuid) from public, anon;
grant execute on function public.admin_revoke(uuid) to authenticated;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.unregister_push_token(text) to authenticated;

-- Photos générées automatiquement → initiales ; note 5,0 sans avis → « Nouveau »
update public.coaches set data = data || jsonb_build_object('photo', '')
where data ->> 'photo' ~* 'ui-avatars\.com';
update public.coaches set data = data || jsonb_build_object('rating', 0)
where user_id ~ '^[0-9a-f-]{36}$' and coalesce((data ->> 'reviewCount')::int, 0) = 0
  and coalesce((data ->> 'rating')::numeric, 0) <> 0;

-- Premier administrateur : remplacer l'email par celui de TON compte, puis exécuter
-- insert into public.admin_users (user_id, note)
-- select id, 'premier admin' from auth.users where email = 'ton.email@exemple.fr'
-- on conflict do nothing;
