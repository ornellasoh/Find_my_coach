-- Find My Coach — statistiques du lien d'un coach (bio Instagram, TikTok, WhatsApp…) — 12 oct. 2026
--  • « visit »  : une personne a ouvert le lien du coach (page de redirection vers l'app) ;
--  • « signup » : un nouveau compte a été créé puis a ouvert l'app avec le lien de ce coach.
-- Table sans accès direct : tout passe par les fonctions ci-dessous.

create table if not exists public.coach_link_events (
  id          bigint generated always as identity primary key,
  coach_id    text not null references public.coaches(id) on delete cascade,
  kind        text not null check (kind in ('visit', 'signup')),
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists coach_link_events_coach_idx on public.coach_link_events(coach_id, kind, created_at);
-- Un compte n'est attribué qu'à un seul coach
create unique index if not exists coach_link_events_signup_uniq on public.coach_link_events(user_id) where kind = 'signup';
alter table public.coach_link_events enable row level security;
revoke all on public.coach_link_events from anon, authenticated;

-- Visite du lien : compte la visite et renvoie la fiche publique (pour la page de redirection).
create or replace function public.coach_link_visit(p_ref text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  v := public.public_coach(p_ref);
  if v is null then return null; end if;
  insert into public.coach_link_events (coach_id, kind) values (v ->> 'id', 'visit');
  return v;
end;
$$;
revoke execute on function public.coach_link_visit(text) from public;
grant execute on function public.coach_link_visit(text) to anon, authenticated;

-- Inscription via le lien : appelée par l'app quand une personne connectée arrive par le lien d'un coach.
-- Comptée une seule fois, uniquement pour un compte récent (7 jours) qui n'est pas celui du coach.
create or replace function public.coach_link_signup(p_ref text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_coach text; v_n int;
begin
  if auth.uid() is null then return false; end if;
  select c.id into v_coach from public.coaches c
  where c.is_active and (c.id = p_ref or c.data ->> 'slug' = lower(trim(p_ref)))
    and c.user_id is distinct from auth.uid()::text
  limit 1;
  if v_coach is null then return false; end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid()::text and p.created_at > now() - interval '7 days') then
    return false;
  end if;
  insert into public.coach_link_events (coach_id, kind, user_id) values (v_coach, 'signup', auth.uid())
  on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;
revoke execute on function public.coach_link_signup(text) from public, anon;
grant execute on function public.coach_link_signup(text) to authenticated;

-- Statistiques du lien pour le coach connecté.
create or replace function public.coach_link_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'visits',    count(*) filter (where e.kind = 'visit'),
    'visits30',  count(*) filter (where e.kind = 'visit' and e.created_at > now() - interval '30 days'),
    'signups',   count(*) filter (where e.kind = 'signup'),
    'signups30', count(*) filter (where e.kind = 'signup' and e.created_at > now() - interval '30 days')
  )
  from public.coach_link_events e
  join public.coaches c on c.id = e.coach_id
  where c.user_id = auth.uid()::text;
$$;
revoke execute on function public.coach_link_stats() from public, anon;
grant execute on function public.coach_link_stats() to authenticated;

-- Bêta par email : la personne a laissé son email sur la page du lien d'un coach (beta_testers.source = 'coach:<id>'),
-- a reçu l'app par email, puis crée son compte avec la même adresse. Au premier passage, on attribue le compte
-- au coach et on renvoie son identifiant pour que l'app ouvre directement sa fiche. Sinon : null.
create or replace function public.coach_link_from_invite()
returns text language plpgsql security definer set search_path = public, auth as $$
declare v_ref text;
begin
  if auth.uid() is null then return null; end if;
  select substring(b.source from 7) into v_ref
  from public.beta_testers b
  join auth.users u on lower(u.email) = lower(b.email)
  where u.id = auth.uid() and u.email_confirmed_at is not null and b.source like 'coach:%'
  limit 1;
  if v_ref is null or not public.coach_link_signup(v_ref) then return null; end if;
  return (select c.id from public.coaches c where c.id = v_ref or c.data ->> 'slug' = lower(trim(v_ref)) limit 1);
end;
$$;
revoke execute on function public.coach_link_from_invite() from public, anon;
grant execute on function public.coach_link_from_invite() to authenticated;
