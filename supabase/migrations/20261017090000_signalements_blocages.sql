-- Find My Coach — signaler et bloquer (règle 1.2 d'Apple sur les contenus publiés par les utilisateurs, 17 oct. 2026)
--   • Bloquer : l'utilisateur bloqué ne peut plus écrire ni réserver auprès de celui qui l'a bloqué.
--   • Signaler : une conversation, un avis ou un utilisateur. Les administrateurs sont prévenus (app, push, email)
--     et traitent le signalement dans Administration → Signalements (sous 24 h, comme Apple le demande).
--   • Filtre : les messages et avis contenant des insultes graves sont refusés par le serveur.

-- ---------- Blocages ----------
create table if not exists public.user_blocks (
  blocker_id text not null,
  blocked_id text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
drop policy if exists user_blocks_select on public.user_blocks;
create policy user_blocks_select on public.user_blocks for select to authenticated using (blocker_id = auth.uid()::text);
drop policy if exists user_blocks_insert on public.user_blocks;
create policy user_blocks_insert on public.user_blocks for insert to authenticated with check (blocker_id = auth.uid()::text);
drop policy if exists user_blocks_delete on public.user_blocks;
create policy user_blocks_delete on public.user_blocks for delete to authenticated using (blocker_id = auth.uid()::text);
grant select, insert, delete on public.user_blocks to authenticated;

-- L'un des deux a-t-il bloqué l'autre ?
create or replace function public.fmc_is_blocked(a text, b text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_blocks
                 where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;
revoke execute on function public.fmc_is_blocked(text, text) from public, anon;
grant execute on function public.fmc_is_blocked(text, text) to authenticated;

-- ---------- Filtre des propos injurieux ----------
create or replace function public.fmc_is_abusive(p_text text)
returns boolean language sql immutable set search_path = public as $$
  select coalesce(lower(p_text), '') ~* (
    '(^|[^[:alpha:]])(' ||
    'connard|connasse|salope|salopard|encul[eé]e?s?|p[eé]d[eé]s?|tapette|nique ta m[eè]re|ntm|fils de pute|' ||
    'pute|batard|bâtard|negro|n[eè]gre|bougnoule|youpin|bicot|sale arabe|sale noir|sale juif|' ||
    'va te faire foutre|je vais te tuer|je vais te buter' ||
    ')([^[:alpha:]]|$)'
  );
$$;

-- Messages : refusés si bloqué ou injurieux
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid()::text and not public.fmc_is_blocked(sender_id, recipient_id));

create or replace function public.fmc_message_filter()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.fmc_is_abusive(new.text) then
    raise exception 'Ce message contient des propos injurieux et n’a pas été envoyé.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists messages_filter on public.messages;
create trigger messages_filter before insert on public.messages for each row execute function public.fmc_message_filter();

-- Avis : refusés si injurieux (le texte est dans data.comment)
create or replace function public.fmc_review_filter()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() and public.fmc_is_abusive(new.data ->> 'comment') then
    raise exception 'Cet avis contient des propos injurieux. Merci de le reformuler.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists reviews_filter on public.reviews;
create trigger reviews_filter before insert or update on public.reviews for each row execute function public.fmc_review_filter();

-- Réservations : impossible de réserver auprès d'un coach qui vous a bloqué (ou que vous avez bloqué)
create or replace function public.fmc_booking_block_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_coach_user text;
begin
  if public.fmc_trusted() or public.is_admin() then return new; end if;
  select user_id into v_coach_user from public.coaches where id = new.coach_id;
  if v_coach_user is not null and public.fmc_is_blocked(new.client_id, v_coach_user) then
    raise exception 'Réservation impossible avec ce coach.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists bookings_block_guard on public.bookings;
create trigger bookings_block_guard before insert on public.bookings for each row execute function public.fmc_booking_block_guard();
revoke execute on function public.fmc_booking_block_guard() from public, anon, authenticated;

-- ---------- Signalements ----------
create table if not exists public.content_reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      text not null,
  target_type      text not null check (target_type in ('conversation', 'review', 'user')),
  target_id        text not null,
  reported_user_id text,
  reason           text not null check (reason in ('harassment', 'inappropriate', 'scam', 'spam', 'other')),
  details          text check (char_length(details) <= 1000),
  snapshot         text,              -- copie du contenu signalé (derniers messages, texte de l'avis)
  status           text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  admin_note       text,
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz,
  resolved_by      text
);
create index if not exists content_reports_status_idx on public.content_reports(status, created_at desc);
alter table public.content_reports enable row level security;
drop policy if exists content_reports_select on public.content_reports;
create policy content_reports_select on public.content_reports for select to authenticated using (public.is_admin());
revoke insert, update, delete on public.content_reports from anon, authenticated;
grant select on public.content_reports to authenticated;

create or replace function public.fmc_report(p_type text, p_target_id text, p_reason text, p_details text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me text := auth.uid()::text;
  v_user text;
  v_snapshot text;
  v_id uuid;
  v_label text;
  a record;
begin
  if v_me is null then raise exception 'Non connecté'; end if;
  if p_reason not in ('harassment', 'inappropriate', 'scam', 'spam', 'other') then raise exception 'Motif invalide.'; end if;

  if p_type = 'conversation' then
    -- p_target_id = l'autre personne de la conversation ; copie des 20 derniers messages échangés
    v_user := p_target_id;
    select string_agg(to_char(m.created_at at time zone 'Europe/Paris', 'DD/MM HH24:MI') || ' — '
                      || case when m.sender_id = v_me then 'Signalant' else 'Signalé' end || ' : ' || m.text, E'\n' order by m.created_at)
      into v_snapshot
      from (select * from public.messages
            where (sender_id = v_me and recipient_id = v_user) or (sender_id = v_user and recipient_id = v_me)
            order by created_at desc limit 20) m;
    if v_snapshot is null then raise exception 'Aucun message à signaler dans cette conversation.'; end if;
  elsif p_type = 'review' then
    select client_id, coalesce(data ->> 'comment', '') into v_user, v_snapshot from public.reviews where id = p_target_id;
    if not found then raise exception 'Avis introuvable.'; end if;
  elsif p_type = 'user' then
    v_user := p_target_id;
  else
    raise exception 'Type de signalement invalide.';
  end if;
  if v_user = v_me then raise exception 'Vous ne pouvez pas vous signaler vous-même.'; end if;

  -- Un même signalement ouvert n'est pas dupliqué
  select id into v_id from public.content_reports
   where reporter_id = v_me and target_type = p_type and target_id = p_target_id and status = 'open';
  if v_id is not null then return v_id; end if;

  insert into public.content_reports (reporter_id, target_type, target_id, reported_user_id, reason, details, snapshot)
  values (v_me, p_type, p_target_id, v_user, p_reason, nullif(left(btrim(coalesce(p_details, '')), 1000), ''), v_snapshot)
  returning id into v_id;

  v_label := case p_type when 'conversation' then 'Conversation signalée' when 'review' then 'Avis signalé' else 'Utilisateur signalé' end;
  for a in select user_id::text as uid from public.admin_users loop
    perform public.fmc_notify(a.uid, 'content_report', v_label,
      'Motif : ' || case p_reason when 'harassment' then 'harcèlement ou insultes' when 'inappropriate' then 'contenu inapproprié'
        when 'scam' then 'arnaque ou paiement hors de l''app' when 'spam' then 'spam' else 'autre' end
      || '. À traiter sous 24 h dans Administration → Signalements.');
  end loop;
  return v_id;
end;
$$;
revoke execute on function public.fmc_report(text, text, text, text) from public, anon;
grant execute on function public.fmc_report(text, text, text, text) to authenticated;

-- Traitement par un administrateur : classer, ou masquer l'avis signalé
create or replace function public.fmc_admin_resolve_report(p_id uuid, p_action text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r public.content_reports%rowtype;
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs.'; end if;
  select * into r from public.content_reports where id = p_id for update;
  if not found then raise exception 'Signalement introuvable.'; end if;
  if p_action = 'hide_review' then
    if r.target_type <> 'review' then raise exception 'Ce signalement ne concerne pas un avis.'; end if;
    update public.reviews set is_hidden = true, data = data || '{"isHidden": true}'::jsonb where id = r.target_id;
  elsif p_action not in ('resolve', 'dismiss') then
    raise exception 'Action invalide.';
  end if;
  update public.content_reports
     set status = case when p_action = 'dismiss' then 'dismissed' else 'resolved' end,
         admin_note = nullif(btrim(coalesce(p_note, '')), ''), resolved_at = now(), resolved_by = auth.uid()::text
   where id = p_id;
  perform public.fmc_notify(r.reporter_id, 'report_handled', 'Signalement traité',
    'Merci : l’équipe Find My Coach a examiné votre signalement et pris les mesures nécessaires.');
end;
$$;
revoke execute on function public.fmc_admin_resolve_report(uuid, text, text) from public, anon;
grant execute on function public.fmc_admin_resolve_report(uuid, text, text) to authenticated;

-- Lecture des signalements par les administrateurs, avec les noms
create or replace function public.fmc_admin_reports()
returns table (id uuid, target_type text, target_id text, reason text, details text, snapshot text, status text,
               created_at timestamptz, reporter_name text, reported_name text, reported_user_id text)
language sql stable security definer set search_path = public as $$
  select r.id, r.target_type, r.target_id, r.reason, r.details, r.snapshot, r.status, r.created_at,
         coalesce(p1.name, ''), coalesce(p2.name, ''), r.reported_user_id
  from public.content_reports r
  left join public.profiles p1 on p1.id = r.reporter_id
  left join public.profiles p2 on p2.id = r.reported_user_id
  where public.is_admin()
  order by (r.status = 'open') desc, r.created_at desc
  limit 200;
$$;
revoke execute on function public.fmc_admin_reports() from public, anon;
grant execute on function public.fmc_admin_reports() to authenticated;
