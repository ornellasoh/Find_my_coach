-- Bêta Android par le test interne Google Play (remplace le lien APK dans les emails).
insert into public.app_settings (key, value)
values ('beta_play_url', to_jsonb('https://play.google.com/apps/internaltest/4701585327093607820'::text))
on conflict (key) do update set value = excluded.value;

-- Envoi unique du lien Play aux testeurs Android déjà inscrits (fonction beta-play-invite)
alter table public.beta_testers add column if not exists play_invited_at timestamptz;
