-- Find My Coach — inscriptions des bêta-testeurs depuis findmycoach.io (12 oct. 2026)
-- Parcours : email sur le site → email de validation → liens d'installation (APK Android, TestFlight iPhone) + tutoriel.
-- Table accessible uniquement par le serveur (fonction beta-signup) ; lecture réservée aux administrateurs.

create table if not exists public.beta_testers (
  id               uuid primary key default gen_random_uuid(),
  email            text not null unique
                   check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  first_name       text check (first_name is null or char_length(first_name) <= 60),
  platform         text check (platform is null or platform in ('android', 'ios')),
  token            uuid not null default gen_random_uuid(),
  source           text check (source is null or char_length(source) <= 60),
  created_at       timestamptz not null default now(),
  confirm_sent_at  timestamptz,
  confirmed_at     timestamptz,
  links_sent_at    timestamptz
);
alter table public.beta_testers enable row level security;
revoke all on public.beta_testers from anon;
grant select on public.beta_testers to authenticated;
create policy beta_testers_admin_read on public.beta_testers for select to authenticated using (public.is_admin());

-- Liens envoyés aux testeurs (modifiables par un admin, sans redéployer)
insert into public.app_settings (key, value) values
  ('beta_apk_url', to_jsonb('https://seftoygihefwohrioojo.supabase.co/storage/v1/object/public/downloads/findmycoach-latest.apk'::text)),
  ('beta_testflight_url', 'null'::jsonb)
on conflict (key) do nothing;
