-- Find My Coach — gestion de l'équipe d'administration depuis l'app (12 oct. 2026)
-- Liste des administrateurs (email, nom, date) — réservée aux administrateurs.
create or replace function public.admin_list()
returns table (user_id uuid, email text, name text, granted_at timestamptz, note text)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs.' using errcode = '42501'; end if;
  return query
    select a.user_id, u.email::text, p.name, a.granted_at, a.note
    from public.admin_users a
    join auth.users u on u.id = a.user_id
    left join public.profiles p on p.id = a.user_id::text
    order by a.granted_at;
end;
$$;
revoke execute on function public.admin_list() from public, anon;
grant execute on function public.admin_list() to authenticated;
