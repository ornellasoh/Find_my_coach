-- Compte client de test pour les vérificateurs Apple et Google (demo.apple@findmycoach.io) :
-- une séance passée avec un coach de démonstration (coach-1, sans vrai compte), et son compte rendu.
-- Rien n'est rattaché à un vrai coach : pas de revenus, pas de statistiques, pas de notification.
-- L'avis est laissé vide pour que le vérificateur puisse tester « Laisser un avis ».
-- Sans effet si le compte n'existe pas ; peut être rejouée sans doublon.

do $$
declare
  v_client uuid;
  v_name text;
  v_coach jsonb;
begin
  select id into v_client from auth.users where lower(email) = 'demo.apple@findmycoach.io';
  if v_client is null then
    raise notice 'Compte demo.apple@findmycoach.io absent : rien à faire.';
    return;
  end if;

  select coalesce(nullif(trim(name), ''), 'Client démo') into v_name from public.profiles where id::text = v_client::text;
  select data into v_coach from public.coaches where id = 'coach-1';
  if v_coach is null then
    raise notice 'Coach de démonstration coach-1 absent : rien à faire.';
    return;
  end if;

  insert into public.bookings (id, client_id, coach_id, availability_id, status, date, data, created_at)
  values (
    'bk-demo-verification-1',
    v_client::text,
    'coach-1',
    'slot-demo-verification-1',
    'completed',
    date '2026-10-09',
    jsonb_build_object(
      'id', 'bk-demo-verification-1',
      'clientId', v_client::text,
      'clientName', coalesce(v_name, 'Client démo'),
      'clientEmail', 'demo.apple@findmycoach.io',
      'clientAvatar', '',
      'coachId', 'coach-1',
      'coachName', v_coach ->> 'name',
      'coachTitle', v_coach ->> 'title',
      'coachPhoto', v_coach ->> 'photo',
      'availabilityId', 'slot-demo-verification-1',
      'date', '2026-10-09',
      'startTime', '10:00',
      'endTime', '11:00',
      'format', 'online',
      'sessionType', jsonb_build_object(
        'id', 'session-video', 'mode', 'video', 'name', 'Consultation Visio HD', 'format', 'online',
        'platform', 'Visio FindMyCoach (Lien sécurisé)',
        'description', 'Séance 100% personnalisée en visio haute définition avec analyse en direct',
        'durationMinutes', 60, 'priceMultiplier', 1
      ),
      'price', 85, 'serviceFee', 4.5, 'taxes', 2.13, 'travelFee', 0, 'total', 91.63,
      'paymentMethod', 'Carte bancaire (Stripe)',
      'paymentStatus', 'paid',
      'bookingStatus', 'completed',
      'hasReview', false,
      'reminder24Sent', true,
      'reminder1hSent', true,
      'createdAt', '2026-10-05T09:00:00.000Z'
    ),
    timestamptz '2026-10-05 09:00:00+00'
  )
  on conflict (id) do nothing;

  insert into public.session_reports (booking_id, coach_user_id, client_id, summary, next_actions, created_at, updated_at)
  values (
    'bk-demo-verification-1',
    'user-coach-1',
    v_client::text,
    'Bilan de départ : mobilité des hanches et des épaules, gainage et squat au poids du corps. Bonne posture générale, légère raideur des épaules à travailler.',
    '3 fois par semaine : 10 minutes de mobilité le matin et 3 séries de 30 secondes de gainage. Prochaine séance : renforcement du haut du corps.',
    timestamptz '2026-10-09 11:15:00+00',
    timestamptz '2026-10-09 11:15:00+00'
  )
  on conflict (booking_id) do nothing;
end $$;
