// Crée une session de paiement Stripe Checkout pour une réservation en attente.
import { admin, computePrice, corsHeaders, getUser, json, RETURN_PAGE, safeReturnBase, stripe } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Non connecté' }, 401);

    const { booking_id, return_url, promo_code } = await req.json();
    const { data: row } = await admin.from('bookings').select('*').eq('id', booking_id).maybeSingle();
    if (!row || row.client_id !== user.id) return json({ error: 'Réservation introuvable' }, 404);
    if (row.status !== 'pending') return json({ error: 'Cette réservation est déjà traitée' }, 409);

    const booking = row.data;
    const { data: coachRow } = await admin.from('coaches').select('id, data').eq('id', row.coach_id).maybeSingle();
    if (!coachRow) return json({ error: 'Coach introuvable' }, 404);

    const price = computePrice(coachRow.data, booking.sessionType, promo_code);
    const amount = Math.round(price.total * 100);
    const fee = Math.round(price.platformFee * 100);
    if (amount < 50) return json({ error: 'Montant invalide' }, 400);

    // Reversement automatique au coach si son compte Stripe est actif
    const { data: acct } = await admin.from('stripe_accounts').select('*').eq('coach_id', row.coach_id).maybeSingle();
    const destination = acct?.charges_enabled ? acct.account_id : null;

    const base = safeReturnBase(return_url);
    const successUrl = base ? `${base}?payment=success&booking=${booking_id}` : `${RETURN_PAGE}?status=success`;
    const cancelUrl = base ? `${base}?payment=cancelled&booking=${booking_id}` : `${RETURN_PAGE}?status=cancelled`;

    const metadata = { booking_id, client_id: user.id, coach_id: row.coach_id };
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'fr',
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: amount,
            product_data: {
              name: `${booking.sessionType?.name ?? 'Séance'} avec ${coachRow.data.name}`,
              description: `${booking.date} à ${booking.startTime} — Find My Coach`,
            },
          },
        },
      ],
      metadata,
      payment_intent_data: {
        metadata,
        description: `Find My Coach — réservation ${booking_id}`,
        ...(destination ? { application_fee_amount: Math.min(fee, amount), transfer_data: { destination } } : {}),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Find My Coach est une place de marché (Stripe Connect) : on n'utilise pas « Managed Payments »
      managed_payments: { enabled: false },
    // deno-lint-ignore no-explicit-any
    } as any);

    await admin.from('payments').upsert({
      id: session.id,
      booking_id,
      client_id: user.id,
      coach_id: row.coach_id,
      amount_total: amount,
      application_fee: destination ? Math.min(fee, amount) : amount,
      status: 'pending',
    });

    // Le prix enregistré est celui calculé par le serveur
    await admin
      .from('bookings')
      .update({ data: { ...booking, price: price.basePrice, taxes: price.taxes, total: price.total, paymentMethod: 'Carte bancaire (Stripe)' } })
      .eq('id', booking_id);

    return json({ url: session.url, total: price.total });
  } catch (err) {
    console.error(err);
    return json({ error: (err as Error).message ?? 'Erreur de paiement' }, 500);
  }
});
