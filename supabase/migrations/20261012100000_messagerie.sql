-- Find My Coach — boîte de réception « Messages » (12 oct. 2026)
-- Liste des conversations de l'utilisateur connecté : interlocuteur (nom, photo, rôle), dernier message,
-- nombre de messages non lus. Ne renvoie que les conversations dont l'utilisateur fait partie.

create or replace function public.my_conversations()
returns table (
  partner_id     text,
  partner_name   text,
  partner_avatar text,
  partner_role   text,
  last_text      text,
  last_at        timestamptz,
  last_from_me   boolean,
  unread         int
)
language sql stable security definer set search_path = public as $$
  with mine as (
    select case when m.sender_id = auth.uid()::text then m.recipient_id else m.sender_id end as partner,
           m.sender_id, m.recipient_id, m.text, m.read, m.created_at
    from public.messages m
    where auth.uid() is not null
      and (m.sender_id = auth.uid()::text or m.recipient_id = auth.uid()::text)
  ),
  last_msg as (
    select distinct on (partner) partner, text, created_at, sender_id = auth.uid()::text as from_me
    from mine
    order by partner, created_at desc
  )
  select l.partner,
         coalesce(nullif(trim(p.name), ''), 'Membre Find My Coach'),
         p.avatar,
         p.role,
         l.text,
         l.created_at,
         l.from_me,
         (select count(*)::int from mine x where x.partner = l.partner and x.recipient_id = auth.uid()::text and not x.read)
  from last_msg l
  left join public.profiles p on p.id = l.partner
  order by l.created_at desc
  limit 200;
$$;

revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;
