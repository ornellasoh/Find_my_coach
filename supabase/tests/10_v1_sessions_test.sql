-- Tests de la migration v1 (droits d'accès, conflits de créneaux, reports, comptes rendus, signalements).
-- À lancer sur une base de TEST uniquement : supabase/tests/run_local.sh
\set ON_ERROR_STOP on
\set QUIET on

-- Acteurs
--   client A  11111111-…   client B  22222222-…   coach C  33333333-…   intrus X  44444444-…   admin  55555555-…
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@test'), ('22222222-2222-2222-2222-222222222222', 'b@test'),
  ('33333333-3333-3333-3333-333333333333', 'c@test'), ('44444444-4444-4444-4444-444444444444', 'x@test'),
  ('55555555-5555-5555-5555-555555555555', 'admin@test')
on conflict do nothing;
alter table public.profiles disable trigger profiles_protect_role;
update public.profiles set role = 'coach' where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set role = 'admin' where id = '55555555-5555-5555-5555-555555555555';
alter table public.profiles enable trigger profiles_protect_role;
-- Droits administrateur : table protégée admin_users (migration bêta) ; ignoré si la table n'existe pas encore
do $$ begin
  execute 'insert into public.admin_users (user_id) values (''55555555-5555-5555-5555-555555555555'') on conflict do nothing';
exception when undefined_table then null; end $$;

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

create or replace function pg_temp.expect_error(sql text, fragment text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    if position(fragment in sqlerrm) = 0 then
      raise exception 'ÉCHEC : erreur inattendue pour [%] : % (attendu : %)', sql, sqlerrm, fragment;
    end if;
    raise notice 'ok — refusé : %', fragment;
    return;
  end;
  raise exception 'ÉCHEC : [%] aurait dû être refusé (%).', sql, fragment;
end $$;

create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'ÉCHEC : %', label; end if;
  raise notice 'ok — %', label;
end $$;

-- Dates de test (toujours dans le futur)
create temp table t as select (current_date + 5) as d1, (current_date + 6) as d2, (current_date - 1) as soon;
grant select on t to authenticated;

-- ---------------------------------------------------------------- 1. Fiche coach : adresse exacte privée
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
insert into public.coaches (id, user_id, is_active, city, data) values ('coach-c', '33333333-3333-3333-3333-333333333333', true, 'Poitiers',
  '{"id":"coach-c","name":"Coach C","address":"12 rue Secrète, 86000 Poitiers","latitude":46.583123,"longitude":0.345678,
    "verificationStatus":"verified","isElite":true,"hourlyRate":50,"prepInstructions":"Tapis + bouteille d''eau",
    "verificationDocs":[{"id":"d1","title":"Diplôme","type":"diploma","status":"approved"}]}');
select pg_temp.as_user(null);
select pg_temp.check((select not (data ? 'address') from coaches where id = 'coach-c'), 'adresse exacte retirée de la fiche publique');
select pg_temp.check((select (data->>'latitude')::numeric = 46.58 from coaches where id = 'coach-c'), 'coordonnées publiques arrondies (~1 km)');
select pg_temp.check((select address = '12 rue Secrète, 86000 Poitiers' and latitude = 46.583123 from coach_private where coach_id = 'coach-c'), 'adresse exacte conservée en privé');
select pg_temp.check((select data->>'verificationStatus' = 'unverified' and data->>'isElite' = 'false' from coaches where id = 'coach-c'), 'un coach ne peut pas s''auto-déclarer vérifié/élite');
select pg_temp.check((select not (data ? 'verificationDocs') from coaches where id = 'coach-c'), 'documents retirés de la fiche publique');

-- Le coach met à jour sa fiche (coordonnées déjà arrondies renvoyées par l'app) : l'exact reste en privé
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
update public.coaches set data = data || '{"latitude":46.58,"longitude":0.35,"verificationStatus":"verified","bio":"x"}' where id = 'coach-c';
select pg_temp.as_user(null);
select pg_temp.check((select latitude = 46.583123 from coach_private where coach_id = 'coach-c'), 'coordonnées exactes non écrasées par la valeur arrondie');
select pg_temp.check((select data->>'verificationStatus' = 'unverified' from coaches where id = 'coach-c'), 'statut vérifié toujours protégé en mise à jour');

select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
select pg_temp.check((select count(*) = 0 from coach_private), 'un autre utilisateur ne lit pas l''adresse privée du coach');
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.check((select count(*) = 1 from coach_private), 'le coach lit sa propre adresse privée');

-- Documents : privés, validation par l'admin, badge uniquement par l'admin
insert into public.coach_documents (coach_id, owner_id, type, title, file_path, status)
  values ('coach-c', '33333333-3333-3333-3333-333333333333', 'diploma', 'BPJEPS', '33333333-3333-3333-3333-333333333333/bpjeps.pdf', 'approved');
select pg_temp.as_user(null);
select pg_temp.check((select status = 'pending' from coach_documents where title = 'BPJEPS'), 'un document déposé reste « en attente » (pas d''auto-validation)');
select pg_temp.check((select data->>'verificationStatus' = 'pending' from coaches where id = 'coach-c'), 'fiche passée « en cours de vérification »');
select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
select pg_temp.check((select count(*) = 0 from coach_documents), 'les documents ne sont pas visibles par les autres utilisateurs');
select pg_temp.expect_error($$select public.admin_set_coach_verification('coach-c', true)$$, 'administrateurs');
select pg_temp.as_user('55555555-5555-5555-5555-555555555555');
select pg_temp.expect_error($$select public.admin_set_coach_verification('coach-c', true)$$, 'au moins un document');
select public.admin_review_document((select id from coach_documents where title = 'BPJEPS'), 'approved', null);
select public.admin_set_coach_verification('coach-c', true);
select pg_temp.as_user(null);
select pg_temp.check((select data->>'verificationStatus' = 'verified' from coaches where id = 'coach-c'), 'badge « Vérifié » après validation admin');

-- Créneaux du coach
insert into public.availabilities (id, coach_id, date, data)
select 'slot-1', 'coach-c', d1, jsonb_build_object('id','slot-1','coachId','coach-c','date',d1::text,'startTime','10:00','endTime','11:00') from t union all
select 'slot-2', 'coach-c', d1, jsonb_build_object('id','slot-2','coachId','coach-c','date',d1::text,'startTime','10:30','endTime','11:30') from t union all
select 'slot-3', 'coach-c', d2, jsonb_build_object('id','slot-3','coachId','coach-c','date',d2::text,'startTime','14:00','endTime','15:00') from t union all
select 'slot-4', 'coach-c', d2, jsonb_build_object('id','slot-4','coachId','coach-c','date',d2::text,'startTime','16:00','endTime','17:00') from t union all
select 'slot-soon', 'coach-c', soon, jsonb_build_object('id','slot-soon','coachId','coach-c','date',soon::text,'startTime','09:00','endTime','10:00') from t;

-- ---------------------------------------------------------------- 2. Réservations et conflits
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
insert into public.bookings (id, client_id, coach_id, availability_id, status, date, data)
select 'bk-a', '11111111-1111-1111-1111-111111111111', 'coach-c', 'slot-1', 'confirmed', d1,
  jsonb_build_object('id','bk-a','clientId','11111111-1111-1111-1111-111111111111','coachId','coach-c','clientName','Alice','coachName','Coach C',
    'date',d1::text,'startTime','10:00','endTime','11:00','format','home','clientAddress','5 allée Privée, Poitiers',
    'meetingLink','https://faux.example','price',57.5,'total',63.44,'paymentStatus','paid','bookingStatus','confirmed') from t;
select pg_temp.as_user(null);
select pg_temp.check((select status = 'pending' and data->>'paymentStatus' = 'pending' from bookings where id = 'bk-a'), 'le client ne peut pas créer une réservation déjà payée');
select pg_temp.check((select not (data ? 'clientAddress') and not (data ? 'meetingLink') from bookings where id = 'bk-a'), 'adresse client et lien retirés des données de réservation');
select pg_temp.check((select session_address = '5 allée Privée, Poitiers' from booking_session_details where booking_id = 'bk-a'), 'adresse client conservée dans les détails privés');

-- Le coach ne voit pas l'adresse tant que la séance n'est pas confirmée
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.check((select count(*) = 0 from booking_session_details where booking_id = 'bk-a'), 'adresse invisible tant que la réservation est en attente');

-- Client B : même créneau → refusé ; créneau qui chevauche → refusé
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.expect_error($$insert into public.bookings (id, client_id, coach_id, availability_id, status, date, data)
  select 'bk-b1', '22222222-2222-2222-2222-222222222222', 'coach-c', 'slot-1', 'pending', d1,
  jsonb_build_object('startTime','10:00','endTime','11:00') from t$$, 'vient d''être réservé');
select pg_temp.expect_error($$insert into public.bookings (id, client_id, coach_id, availability_id, status, date, data)
  select 'bk-b2', '22222222-2222-2222-2222-222222222222', 'coach-c', 'slot-2', 'pending', d1,
  jsonb_build_object('startTime','10:30','endTime','11:30') from t$$, 'vient d''être réservé');

-- Le client A peut relancer sa propre réservation du même créneau (paiement abandonné puis repris)
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
insert into public.bookings (id, client_id, coach_id, availability_id, status, date, data)
select 'bk-a-retry', '11111111-1111-1111-1111-111111111111', 'coach-c', 'slot-1', 'pending', d1,
  jsonb_build_object('startTime','10:00','endTime','11:00') from t;
select pg_temp.check(true, 'le même client peut relancer sa réservation en attente');

-- Paiement confirmé par le serveur (service_role)
select pg_temp.as_user(null);
update public.bookings set status = 'confirmed', data = data || '{"paymentStatus":"paid","bookingStatus":"confirmed"}' where id = 'bk-a';
select pg_temp.check((select prep_instructions = 'Tapis + bouteille d''eau' from booking_session_details where booking_id = 'bk-a'), 'consignes par défaut du coach copiées à la confirmation');
select pg_temp.check(public.fmc_booking_conflict('bk-a-retry', false), 'le serveur détecte le conflit avant d''encaisser un 2e paiement');
select pg_temp.expect_error($$update public.bookings set status = 'confirmed' where id = 'bk-a-retry'$$, 'bookings_one_confirmed_per_slot');
update public.bookings set status = 'cancelled' where id = 'bk-a-retry';

-- Le client ne peut pas modifier l'horaire, le prix ni le statut de paiement
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
update public.bookings set date = date + 1, availability_id = 'slot-3',
  data = data || '{"startTime":"06:00","price":1,"total":1,"paymentStatus":"refunded","hasReview":true}' where id = 'bk-a';
select pg_temp.as_user(null);
select pg_temp.check((select availability_id = 'slot-1' and data->>'startTime' = '10:00' and (data->>'price')::numeric = 57.5
                        and data->>'paymentStatus' = 'paid' and data->>'hasReview' = 'true' from bookings where id = 'bk-a'),
  'horaire, prix et paiement protégés ; champs libres (avis) acceptés');
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.expect_error($$update public.bookings set status = 'completed' where id = 'bk-a'$$, 'non autorisée');

-- ---------------------------------------------------------------- 3. Lien de visio et consignes
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.expect_error($$select public.set_session_details('bk-a', 'https://meet.google.com/abc', null)$$, 'introuvable');
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.expect_error($$select public.set_session_details('bk-a', 'http://zoom.us/j/1', null)$$, 'https://');
select pg_temp.expect_error($$select public.set_session_details('bk-a', 'javascript:alert(1)', null)$$, 'https://');
select public.set_session_details('bk-a', 'https://meet.google.com/abc-defg-hij', 'Tenue de sport, tapis, 2 m² dégagés');
select pg_temp.as_user(null);
select pg_temp.check((select count(*) = 1 from notifications where user_id = '11111111-1111-1111-1111-111111111111' and data->>'type' = 'session_link'), 'client notifié de l''ajout du lien');
select pg_temp.check((select count(*) >= 1 from net.calls), 'envoi push/email déclenché (notify-dispatch)');
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select public.set_session_details('bk-a', 'https://meet.google.com/abc-defg-hij', 'Tenue de sport');
select pg_temp.as_user(null);
select pg_temp.check((select count(*) = 1 from notifications where user_id = '11111111-1111-1111-1111-111111111111' and data->>'type' = 'session_link'), 'pas de nouvelle notification si seul le texte des consignes change');
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select public.set_session_details('bk-a', 'https://zoom.us/j/999', 'Tenue de sport');
select pg_temp.as_user(null);
select pg_temp.check((select count(*) = 2 from notifications where user_id = '11111111-1111-1111-1111-111111111111' and data->>'type' = 'session_link'), 'client notifié du changement de lien');

select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.check((select meeting_url = 'https://zoom.us/j/999' and session_address is not null from booking_session_details where booking_id = 'bk-a'), 'le client de la séance confirmée lit le lien et le lieu');
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.check((select count(*) = 0 from booking_session_details), 'un autre client ne lit ni lien ni adresse');
select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
select pg_temp.check((select count(*) = 0 from booking_session_details), 'un intrus ne lit ni lien ni adresse');
select pg_temp.expect_error($$insert into public.booking_session_details (booking_id, meeting_url) values ('bk-a', 'https://evil.example')$$, 'row-level security');

-- ---------------------------------------------------------------- 4. Report de séance
-- Client B réserve slot-4 (confirmé) pour tester les conflits de report
select pg_temp.as_user(null);
insert into public.bookings (id, client_id, coach_id, availability_id, status, date, data)
select 'bk-b', '22222222-2222-2222-2222-222222222222', 'coach-c', 'slot-4', 'confirmed', d2,
  jsonb_build_object('clientName','Bob','coachName','Coach C','date',d2::text,'startTime','16:00','endTime','17:00','format','online') from t;

select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
select pg_temp.expect_error($$select public.propose_reschedule('bk-a', 'slot-3', null)$$, 'introuvable');
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.expect_error($$select public.propose_reschedule('bk-a', 'slot-4', null)$$, 'plus disponible');
select pg_temp.expect_error($$select public.propose_reschedule('bk-a', 'slot-soon', null)$$, 'trop proche');
select public.propose_reschedule('bk-a', 'slot-3', 'Empêchement pro');
select pg_temp.expect_error($$select public.propose_reschedule('bk-a', 'slot-3', null)$$, 'déjà en attente');
select pg_temp.as_user(null);
select pg_temp.check((select date = (select d1 from t) and availability_id = 'slot-1' from bookings where id = 'bk-a'), 'l''horaire initial est conservé tant que la demande n''est pas acceptée');
select pg_temp.check((select count(*) = 1 from notifications where user_id = '33333333-3333-3333-3333-333333333333' and data->>'type' = 'reschedule_request'), 'coach notifié de la demande');

select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.expect_error($$select public.respond_reschedule((select id from booking_reschedules where booking_id = 'bk-a' and status = 'pending'), 'accept')$$, 'autre participant');
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.check((select count(*) = 0 from booking_reschedules), 'un autre client ne voit pas la demande');

select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select public.respond_reschedule((select id from booking_reschedules where booking_id = 'bk-a' and status = 'pending'), 'accept');
select pg_temp.as_user(null);
select pg_temp.check((select date = (select d2 from t) and availability_id = 'slot-3' and data->>'startTime' = '14:00'
                        and (data->>'price')::numeric = 57.5 and status = 'confirmed' and not (data ? 'reminder24Sent')
                        from bookings where id = 'bk-a'), 'report accepté : nouvel horaire, même prix, rappels réinitialisés');
select pg_temp.check((select count(*) = 2 from notifications where data->>'type' = 'reschedule_accepted'), 'les deux participants sont notifiés');
select pg_temp.check((select old_availability_id = 'slot-1' and status = 'accepted' from booking_reschedules where booking_id = 'bk-a'), 'historique du report conservé');
select pg_temp.check((select meeting_url = 'https://zoom.us/j/999' from booking_session_details where booking_id = 'bk-a'), 'le lien de séance est conservé après report');

-- Refus : l'horaire ne change pas
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select public.propose_reschedule('bk-a', 'slot-1', null);
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select public.respond_reschedule((select id from booking_reschedules where booking_id = 'bk-a' and status = 'pending'), 'decline');
select pg_temp.as_user(null);
select pg_temp.check((select availability_id = 'slot-3' from bookings where id = 'bk-a'), 'report refusé : horaire inchangé');

-- Créneau pris entre la demande et l'acceptation
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select public.propose_reschedule('bk-b', 'slot-1', null);
select pg_temp.as_user(null);
insert into public.bookings (id, client_id, coach_id, availability_id, status, date, data)
select 'bk-x', '44444444-4444-4444-4444-444444444444', 'coach-c', 'slot-1', 'confirmed', d1,
  jsonb_build_object('date',d1::text,'startTime','10:00','endTime','11:00') from t;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.expect_error($$select public.respond_reschedule((select id from booking_reschedules where booking_id = 'bk-b' and status = 'pending'), 'accept')$$, 'réservé entre-temps');
select pg_temp.as_user(null);
select pg_temp.check((select availability_id = 'slot-4' from bookings where id = 'bk-b'), 'conflit à l''acceptation : horaire initial maintenu');

-- Moins de 24 h avant la séance : report refusé (règle d'annulation existante)
insert into public.bookings (id, client_id, coach_id, availability_id, status, date, data)
select 'bk-soon', '11111111-1111-1111-1111-111111111111', 'coach-c', 'slot-soon', 'confirmed', current_date,
  jsonb_build_object('date',current_date::text,'startTime',to_char((now() at time zone 'Europe/Paris') + interval '3 hours','HH24:MI'),'endTime','23:59') from t;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.expect_error($$select public.propose_reschedule('bk-soon', 'slot-3', null)$$, 'au moins 24 h');
select pg_temp.as_user(null);
insert into public.availabilities (id, coach_id, date, data)
select 'slot-5', 'coach-c', d2, jsonb_build_object('id','slot-5','coachId','coach-c','date',d2::text,'startTime','18:00','endTime','19:00') from t;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select public.propose_reschedule('bk-soon', 'slot-5', 'Imprévu côté coach');
select pg_temp.as_user(null);
select pg_temp.check((select count(*) = 1 from booking_reschedules where booking_id = 'bk-soon' and requester_role = 'coach'), 'le coach peut proposer un report à moins de 24 h');

-- ---------------------------------------------------------------- 5. Compte rendu
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.expect_error($$select public.save_session_report('bk-a', 'Bonne séance', null)$$, 'terminée');
update public.bookings set status = 'completed' where id = 'bk-a';
select public.save_session_report('bk-a', 'Bonne séance, gainage à travailler.', '3x30 s de gainage par jour');
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.check((select summary like 'Bonne séance%' from session_reports where booking_id = 'bk-a'), 'le client lit le compte rendu');
select pg_temp.expect_error($$select public.save_session_report('bk-a', 'faux', null)$$, 'introuvable');
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.check((select count(*) = 0 from session_reports), 'compte rendu invisible pour les autres');
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.check((select count(*) = 1 from booking_session_details where booking_id = 'bk-a'), 'détails toujours visibles après la séance');

-- ---------------------------------------------------------------- 6. Signalement
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
insert into public.booking_issues (booking_id, reporter_id, category, description, status) values ('bk-a', '11111111-1111-1111-1111-111111111111', 'technical', 'Lien ne marchait pas', 'resolved');
select pg_temp.check((select status = 'open' and reporter_role = 'client' from booking_issues), 'signalement créé « ouvert »');
select pg_temp.expect_error($$insert into public.booking_issues (booking_id, reporter_id, category) values ('bk-b', '11111111-1111-1111-1111-111111111111', 'other')$$, 'row-level security');
update public.booking_issues set status = 'resolved';
select pg_temp.as_user(null);
select pg_temp.check((select status = 'open' from booking_issues), 'seul un admin change le statut du signalement');
select pg_temp.as_user('55555555-5555-5555-5555-555555555555');
update public.booking_issues set status = 'in_progress', admin_note = 'Contacté le coach';
select pg_temp.as_user(null);
select pg_temp.check((select status = 'in_progress' from booking_issues), 'l''admin suit le traitement');

-- ---------------------------------------------------------------- 7. Annulation
update public.bookings set status = 'cancelled' where id = 'bk-b';
select pg_temp.check((select count(*) = 0 from booking_reschedules where booking_id = 'bk-b' and status = 'pending'), 'annulation : demandes de report en attente closes');
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.check((select count(*) = 0 from booking_session_details where booking_id = 'bk-b'), 'séance annulée : lien et lieu ne sont plus visibles');

select pg_temp.as_user(null);
\echo '== Tous les tests SQL v1 sont passés'
