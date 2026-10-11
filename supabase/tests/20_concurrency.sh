#!/usr/bin/env bash
# Deux clients réservent le même créneau au même instant : un seul doit réussir.
# Puis : un report accepté pendant qu'un autre client réserve le créneau visé.
set -uo pipefail
DB=${TEST_DB:-fmc_test}
Q="psql -qtA -d $DB"
claims() { echo "set role authenticated; select set_config('request.jwt.claims', '{\"sub\":\"$1\",\"role\":\"authenticated\"}', false);"; }
A=11111111-1111-1111-1111-111111111111; B=22222222-2222-2222-2222-222222222222; C=33333333-3333-3333-3333-333333333333; X=44444444-4444-4444-4444-444444444444
D=$(date -d '+8 days' +%F); D2=$(date -d '+9 days' +%F)
$Q >/dev/null <<SQL
insert into public.availabilities (id, coach_id, date, data) values
 ('cc-1','coach-c','$D','{"startTime":"08:00","endTime":"09:00"}'),
 ('cc-2','coach-c','$D2','{"startTime":"08:00","endTime":"09:00"}'),
 ('cc-3','coach-c','$D','{"startTime":"18:00","endTime":"19:00"}');
SQL
book() { # $1 user, $2 id, $3 slot, $4 date, $5 start, $6 end
  $Q 2>&1 <<SQL | grep -E "réservé|ERROR" | head -1
$(claims $1)
begin;
insert into public.bookings (id, client_id, coach_id, availability_id, status, date, data)
values ('$2', '$1', 'coach-c', '$3', 'pending', '$4', '{"startTime":"$5","endTime":"$6"}');
select pg_sleep(1.5);
commit;
SQL
}
book $A cc-a cc-1 $D 08:00 09:00 > /tmp/fmc_c1 & book $B cc-b cc-1 $D 08:00 09:00 > /tmp/fmc_c2 & wait
n=$($Q -c "select count(*) from public.bookings where id in ('cc-a','cc-b')")
[ "$n" = "1" ] && echo "ok — réservations simultanées du même créneau : une seule acceptée ($(cat /tmp/fmc_c1 /tmp/fmc_c2 | head -1 | sed 's/.*ERROR: *//'))" || { echo "ÉCHEC — $n réservations créées pour le même créneau"; exit 1; }

# Report accepté pendant qu'un autre client réserve le créneau cible
$Q >/dev/null -c "insert into public.bookings (id, client_id, coach_id, availability_id, status, date, data) values ('cc-r', '$A', 'coach-c', 'cc-2', 'confirmed', '$D2', '{\"startTime\":\"08:00\",\"endTime\":\"09:00\",\"date\":\"$D2\"}')"
$Q >/dev/null <<SQL
$(claims $A)
select public.propose_reschedule('cc-r', 'cc-3', null);
SQL
accept() { $Q 2>&1 <<SQL | grep -E "ERROR" | head -1
$(claims $C)
begin;
select public.respond_reschedule((select id from public.booking_reschedules where booking_id = 'cc-r' and status = 'pending'), 'accept');
select pg_sleep(1.5);
commit;
SQL
}
book $X cc-x cc-3 $D 18:00 19:00 > /tmp/fmc_c3 & accept > /tmp/fmc_c4 & wait
n=$($Q -c "select (select count(*) from public.bookings where id = 'cc-x') + (select count(*) from public.bookings where id = 'cc-r' and availability_id = 'cc-3')")
[ "$n" = "1" ] && echo "ok — report et réservation simultanés sur le même créneau : un seul gagne" || { echo "ÉCHEC — conflit non détecté ($n)"; exit 1; }
echo "== Tests de concurrence passés"
