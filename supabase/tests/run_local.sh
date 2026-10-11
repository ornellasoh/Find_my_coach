#!/usr/bin/env bash
# Tests SQL de Find My Coach sur une base PostgreSQL LOCALE et jetable (jamais la production).
# Usage : PGHOST=/tmp PGPORT=54329 PGUSER=postgres bash supabase/tests/run_local.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${TEST_DB:-fmc_test}
P="psql -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
$P -d $DB -f supabase/tests/00_supabase_stubs.sql >/dev/null
for f in supabase/migrations/*.sql; do
  sed -e 's/^create extension if not exists pg_net;//' -e 's/^create extension if not exists pg_cron;//' "$f" > /tmp/fmc_mig.sql
  $P -d $DB -f /tmp/fmc_mig.sql >/dev/null 2>&1 || { echo "Migration en échec : $f"; $P -d $DB -f /tmp/fmc_mig.sql; exit 1; }
done
echo "== Migrations appliquées"
psql -qtA -v ON_ERROR_STOP=1 -d $DB -f supabase/tests/10_v1_sessions_test.sql 2>&1 | grep -E "NOTICE:  ok|ÉCHEC|ERROR|==" | sed 's/^.*NOTICE:  //'
TEST_DB=$DB bash supabase/tests/20_concurrency.sh
