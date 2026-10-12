-- Find My Coach — campagnes marketing (Octobre Rose, Noël…) pilotées depuis l'admin (12 oct. 2026)
--  • réglage app_settings « campaign » : bannière, message, couleur, photo, logo teinté, icône de l'app ;
--  • stockage public « campaigns » pour les photos, écriture réservée aux administrateurs.

insert into public.app_settings (key, value) values
  ('campaign', '{"active": false}'::jsonb)
on conflict (key) do nothing;

insert into storage.buckets (id, name, public)
values ('campaigns', 'campaigns', true)
on conflict (id) do nothing;

create policy "campaigns public read" on storage.objects for select
  using (bucket_id = 'campaigns');
create policy "campaigns admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'campaigns' and public.is_admin());
create policy "campaigns admin update" on storage.objects for update to authenticated
  using (bucket_id = 'campaigns' and public.is_admin());
