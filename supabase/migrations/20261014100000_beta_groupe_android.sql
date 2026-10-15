-- Bêta Android : ajout automatique au groupe Google du test fermé Google Play (fonction beta-signup).
alter table public.beta_testers add column if not exists play_group_added_at timestamptz;
alter table public.beta_testers add column if not exists play_group_error text;
