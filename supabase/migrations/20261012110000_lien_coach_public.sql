-- Find My Coach — fiche publique d'un coach pour le site (lien en bio Instagram) — 12 oct. 2026
-- Lecture seule, accessible sans compte, uniquement les informations déjà publiques de la fiche
-- (jamais l'adresse exacte, l'email, le téléphone ou les justificatifs).

create or replace function public.public_coach(p_ref text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', c.id,
    'slug', c.data ->> 'slug',
    'name', c.data ->> 'name',
    'title', c.data ->> 'title',
    'photo', nullif(c.data ->> 'photo', ''),
    'bio', c.data ->> 'bio',
    'city', c.data ->> 'city',
    'zone', c.data ->> 'interventionZone',
    'specialties', coalesce(c.data -> 'specialties', '[]'::jsonb),
    'formats', coalesce(c.data -> 'formats', '[]'::jsonb),
    'hourlyRate', nullif(c.data ->> 'hourlyRate', '')::numeric,
    'rating', coalesce(nullif(c.data ->> 'rating', '')::numeric, 0),
    'reviewCount', coalesce(nullif(c.data ->> 'reviewCount', '')::int, 0),
    'verified', (c.data ->> 'verificationStatus') = 'verified',
    'experienceYears', coalesce(nullif(c.data ->> 'experienceYears', '')::int, 0),
    'freeSlots', (
      select count(*) from public.availabilities a
      where a.coach_id = c.id and a.date >= current_date
        and not exists (select 1 from public.booked_slots b where b.availability_id = a.id)
    ),
    'appLink', 'io.findmycoach.app://coach/' || c.id
  )
  from public.coaches c
  where c.is_active
    and c.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (c.id = p_ref or c.data ->> 'slug' = lower(trim(p_ref)))
  limit 1;
$$;

revoke execute on function public.public_coach(text) from public;
grant execute on function public.public_coach(text) to anon, authenticated;
