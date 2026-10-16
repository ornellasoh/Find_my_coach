-- Find My Coach — avis vérifiés par le serveur et réponse du coach (16 oct. 2026)

-- ---------- Avis : seulement pour une vraie séance effectuée ----------
-- Jusqu'ici, le serveur vérifiait seulement que l'auteur était la personne connectée.
-- Désormais : la séance existe, appartient à ce client et à ce coach, est « effectuée », et n'a pas déjà un avis.
-- Les insertions faites par le service (migrations, comptes de démonstration) ne passent pas par ce contrôle.
create unique index if not exists reviews_booking_uniq on public.reviews(booking_id) where booking_id is not null;

-- Réponse du coach : colonnes dédiées, que seul fmc_reply_to_review peut remplir.
alter table public.reviews add column if not exists coach_reply text;
alter table public.reviews add column if not exists coach_reply_at timestamptz;

create or replace function public.fmc_review_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.bookings b
      where b.id = new.booking_id
        and b.client_id = new.client_id
        and b.coach_id = new.coach_id
        and b.status = 'completed'
    ) then
      raise exception 'Un avis ne peut être laissé qu’après une séance effectuée avec ce coach.';
    end if;
    new.coach_reply := null;
    new.coach_reply_at := null;
  else
    -- Le client peut modifier son avis, mais pas la réponse du coach ni à quel coach ou séance il se rapporte.
    if new.coach_reply is distinct from old.coach_reply
       or new.coach_reply_at is distinct from old.coach_reply_at
       or new.coach_id is distinct from old.coach_id
       or new.booking_id is distinct from old.booking_id
       or new.client_id is distinct from old.client_id then
      if coalesce(current_setting('fmc.coach_reply', true), '') <> 'on' then
        raise exception 'Modification non autorisée.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- ---------- Réponse du coach ----------
-- Une seule réponse publique par avis, écrite par le coach concerné. Le coach ne note pas ses clients.

drop trigger if exists fmc_review_guard on public.reviews;
create trigger fmc_review_guard before insert or update on public.reviews
  for each row execute function public.fmc_review_guard();

create or replace function public.fmc_reply_to_review(p_review_id text, p_reply text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_review public.reviews%rowtype; v_reply text := btrim(coalesce(p_reply, '')); v_at timestamptz := now();
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if length(v_reply) = 0 then raise exception 'La réponse est vide.'; end if;
  if length(v_reply) > 1000 then raise exception 'La réponse dépasse 1 000 caractères.'; end if;

  select * into v_review from public.reviews where id = p_review_id for update;
  if not found then raise exception 'Avis introuvable.'; end if;
  if not exists (select 1 from public.coaches c where c.id = v_review.coach_id and c.user_id = auth.uid()::text) then
    raise exception 'Seul le coach concerné peut répondre à cet avis.';
  end if;
  if v_review.coach_reply is not null then raise exception 'Vous avez déjà répondu à cet avis.'; end if;

  perform set_config('fmc.coach_reply', 'on', true);
  update public.reviews set coach_reply = v_reply, coach_reply_at = v_at where id = p_review_id;

  perform public.fmc_notify(
    v_review.client_id, 'review_reply', 'Votre coach a répondu à votre avis',
    left(v_reply, 120), v_review.booking_id);
  return v_at;
end;
$$;
revoke all on function public.fmc_reply_to_review(text, text) from public, anon;
grant execute on function public.fmc_reply_to_review(text, text) to authenticated;
