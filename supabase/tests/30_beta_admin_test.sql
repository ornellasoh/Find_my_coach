-- Tests bêta : administrateurs, profils, statistiques, jetons push (base locale jetable uniquement)
\set ON_ERROR_STOP on
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  if uid is null then
    perform set_config('role', 'postgres', false);
    perform set_config('request.jwt.claims', '', false);
  else
    perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
    perform set_config('role', 'authenticated', false);
  end if;
end $$;
create or replace function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, false);
  perform set_config('role', 'anon', false);
end $$;
create or replace function pg_temp.expect_error(sql text, fragment text) returns void language plpgsql as $$
begin
  begin execute sql;
  exception when others then
    if position(fragment in sqlerrm) = 0 then raise exception 'ÉCHEC : erreur inattendue pour [%] : % (attendu : %)', sql, sqlerrm, fragment; end if;
    raise notice 'ok — refusé : %', fragment; return;
  end;
  raise exception 'ÉCHEC : [%] aurait dû être refusé (%).', sql, fragment;
end $$;
create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'ÉCHEC : %', label; end if;
  raise notice 'ok — %', label;
end $$;

select pg_temp.as_user(null);
-- Inscriptions (le déclencheur crée le profil)
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ornella@test.fr', '{"name":"Ornella So","role":"client"}'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'lucie@test.fr',   '{"full_name":"Lucie Dupont","avatar_url":"https://lh3.googleusercontent.com/x","role":"coach"}'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'admin@test.fr',   '{"name":"Admin Test"}');
select pg_temp.check((select name = 'Ornella So' and role = 'client' and avatar is null from profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'inscription : profil créé avec le prénom saisi, sans photo imposée');
select pg_temp.check((select name = 'Lucie Dupont' and role = 'coach' and avatar is null from profiles where id = 'aaaaaaaa-0000-0000-0000-000000000002'), 'Google/Apple : nom repris, photo du fournisseur non imposée, rôle coach');

-- Profil manquant (cas réel d'un compte créé avant le déclencheur) → réparation par l'utilisateur lui-même
delete from profiles where id = 'aaaaaaaa-0000-0000-0000-000000000003';
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000003');
select (public.ensure_my_profile()).id;
select pg_temp.as_user(null);
select pg_temp.check((select count(*) = 1 from profiles where id = 'aaaaaaaa-0000-0000-0000-000000000003' and name = 'Admin Test'), 'profil manquant recréé par ensure_my_profile (une seule ligne)');
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000003');
select (public.ensure_my_profile()).id;
select pg_temp.as_user(null);
select pg_temp.check((select count(*) = 1 from profiles where id = 'aaaaaaaa-0000-0000-0000-000000000003'), 'pas de doublon si on répare deux fois');

-- Premier administrateur : uniquement en console SQL (rôle service)
insert into admin_users (user_id, note) values ('aaaaaaaa-0000-0000-0000-000000000003', 'premier admin (test)');

-- Utilisateur ordinaire
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check((select public.is_admin() = false), 'compte ordinaire : is_admin() = faux');
select pg_temp.check((select count(*) = 0 from admin_users), 'compte ordinaire : ne voit pas la liste des administrateurs');
select pg_temp.expect_error($$insert into admin_users (user_id) values ('aaaaaaaa-0000-0000-0000-000000000001')$$, 'row-level security');
select pg_temp.expect_error($$select public.admin_grant('ornella@test.fr')$$, 'administrateurs');
select pg_temp.expect_error($$select public.admin_stats()$$, 'administrateurs');
select pg_temp.expect_error($$select public.admin_revoke('aaaaaaaa-0000-0000-0000-000000000003')$$, 'administrateurs');
select pg_temp.expect_error($$update profiles set role = 'admin' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 'Rôle non autorisé');
update admin_users set note = 'piratage';
delete from admin_users;
select pg_temp.as_user(null);
select pg_temp.check((select count(*) = 1 and min(note) = 'premier admin (test)' from admin_users), 'compte ordinaire : ne peut ni modifier ni supprimer un administrateur');
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select pg_temp.check((select count(*) = 1 from profiles), 'compte ordinaire : ne lit que son propre profil (emails des autres protégés)');
update profiles set email = 'vol@test.fr', name = 'Ornella So' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.check((select email = 'ornella@test.fr' from profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'l''email du profil suit le compte Auth');
update profiles set role = 'coach' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.check((select role = 'coach' from profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'client → coach autorisé (devenir coach)');
select pg_temp.expect_error($$update profiles set role = 'client' where id = 'aaaaaaaa-0000-0000-0000-000000000001'$$, 'non autorisé');
update profiles set name = 'Pirate' where id = 'aaaaaaaa-0000-0000-0000-000000000002';
select pg_temp.as_user(null);
select pg_temp.check((select name = 'Lucie Dupont' from profiles where id = 'aaaaaaaa-0000-0000-0000-000000000002'), 'un utilisateur ne modifie pas le profil d''un autre');

-- Visiteur non connecté
select pg_temp.as_anon();
select pg_temp.expect_error($$select public.admin_stats()$$, 'permission denied');
select pg_temp.check((select count(*) = 0 from profiles), 'visiteur : aucun profil lisible');
select pg_temp.as_user(null);

-- Administrateur
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000003');
select pg_temp.check((select public.is_admin()), 'administrateur : is_admin() = vrai');
select pg_temp.check((select (public.admin_stats() ->> 'users_total')::int = 3), 'administrateur : statistiques réelles (3 comptes)');
select pg_temp.check((select count(*) = 3 from profiles), 'administrateur : voit les profils');
select public.admin_grant('lucie@test.fr', 'test');
select pg_temp.check((select count(*) = 2 from admin_users), 'administrateur : ajoute un administrateur par email');
select public.admin_revoke('aaaaaaaa-0000-0000-0000-000000000002');
select pg_temp.expect_error($$select public.admin_revoke('aaaaaaaa-0000-0000-0000-000000000003')$$, 'dernier administrateur');
select pg_temp.expect_error($$update profiles set role = 'admin' where id = 'aaaaaaaa-0000-0000-0000-000000000002'$$, 'Rôle non autorisé');

-- Jetons push : changement de compte sur le même téléphone
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select public.register_push_token('tok-tablette', 'android');
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000002');
select pg_temp.expect_error($$insert into push_tokens (token, user_id) values ('tok-tablette', 'aaaaaaaa-0000-0000-0000-000000000002') on conflict (token) do update set user_id = excluded.user_id$$, 'row-level security');
select public.register_push_token('tok-tablette', 'android');
select pg_temp.as_user(null);
select pg_temp.check((select user_id = 'aaaaaaaa-0000-0000-0000-000000000002' and count(*) over () = 1 from push_tokens where token = 'tok-tablette'), 'jeton réattribué au compte connecté (l''ancien compte ne reçoit plus rien)');
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
select public.unregister_push_token('tok-tablette');
select pg_temp.as_user(null);
select pg_temp.check((select count(*) = 1 from push_tokens where token = 'tok-tablette'), 'un autre compte ne peut pas désinscrire ce téléphone');
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000002');
select public.unregister_push_token('tok-tablette');
select pg_temp.as_user(null);
select pg_temp.check((select count(*) = 0 from push_tokens where token = 'tok-tablette'), 'déconnexion : jeton supprimé');

\echo '== Tous les tests bêta (admin, profils, push) sont passés'
