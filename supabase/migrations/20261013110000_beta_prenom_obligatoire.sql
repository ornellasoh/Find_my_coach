-- Find My Coach — prénom obligatoire pour les bêta-testeurs (13 oct. 2026)
-- Toutes les inscriptions existantes ont déjà un prénom ; la fonction beta-signup refuse désormais les demandes sans prénom.
alter table public.beta_testers alter column first_name set not null;
alter table public.beta_testers drop constraint if exists beta_testers_first_name_check;
alter table public.beta_testers add constraint beta_testers_first_name_check
  check (char_length(btrim(first_name)) between 2 and 60);
