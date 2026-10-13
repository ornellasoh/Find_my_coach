-- Find My Coach — validation des bêta-testeurs iPhone et ajout automatique à TestFlight (13 oct. 2026)
-- Parcours : inscription sur le site → adresse confirmée → un administrateur valide dans l'app →
-- la fonction beta-approve ajoute le testeur au groupe TestFlight (App Store Connect), Apple envoie l'invitation.

alter table public.beta_testers
  add column if not exists approved_at            timestamptz,
  add column if not exists approved_by            uuid references auth.users (id) on delete set null,
  add column if not exists rejected_at            timestamptz,
  add column if not exists testflight_invited_at  timestamptz,
  add column if not exists testflight_error       text check (testflight_error is null or char_length(testflight_error) <= 500);

-- Les écritures passent uniquement par le serveur (clé service_role) ; les administrateurs lisent la liste.
create index if not exists beta_testers_created_idx on public.beta_testers (created_at desc);
