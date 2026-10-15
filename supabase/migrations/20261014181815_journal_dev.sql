-- Journal de travail lu par l'assistant « Kouadio » pour le récap du soir.
create table if not exists public.journal_dev (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  resume      text not null,          -- ce qui a été fait, en français simple
  statut      text not null default 'fait'
              check (statut in ('fait', 'en_cours', 'non_envoye', 'decision', 'a_faire_ornella')),
  details     text                    -- facultatif : fichiers, fonctions, migrations
);
alter table public.journal_dev enable row level security;
-- Aucune policy : la table n'est lisible ni modifiable depuis l'app,
-- seulement par le service (outils Supabase / migrations).
