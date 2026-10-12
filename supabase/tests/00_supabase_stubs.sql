-- Simulacre minimal de l'environnement Supabase pour tester les migrations en local
-- (rôles, auth.uid(), stockage, coffre-fort, pg_net, pg_cron). NE PAS appliquer en production.
do $$ begin
  create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

create extension if not exists pgcrypto;
create schema if not exists extensions;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text, raw_user_meta_data jsonb, raw_app_meta_data jsonb, created_at timestamptz default now(), email_confirmed_at timestamptz default now(), last_sign_in_at timestamptz);
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$
  select auth.jwt() ->> 'role' $$;

create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select string_to_array(name, '/') $$;

create schema if not exists vault;
create table if not exists vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text, description text);
create or replace view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault.secrets;
create or replace function vault.create_secret(s text, n text, d text default null) returns uuid language sql as $$
  insert into vault.secrets(name, secret, description) values (n, s, d) returning id $$;

create schema if not exists net;
create table if not exists net.calls (id bigserial primary key, url text, body jsonb, at timestamptz default now());
create or replace function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds int default 1000)
returns bigint language sql as $$ insert into net.calls(url, body) values (url, body) returning id $$;

create schema if not exists cron;
create or replace function cron.schedule(name text, sched text, cmd text) returns bigint language sql as $$ select 1::bigint $$;

do $$ begin create publication supabase_realtime; exception when duplicate_object then null; end $$;

grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
grant all on storage.objects to authenticated;
