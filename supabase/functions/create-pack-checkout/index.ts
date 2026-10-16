// Crée la page de paiement Stripe d'un pack de séances : en 1 fois, ou en 3 / 5 mensualités (échéancier).
import { admin, COMMISSION_RATE, corsHeaders, getUser, json, RETURN_PAGE, safeReturnBase, stripe } from '../_shared/common.ts';
import { PACK_INSTALLMENTS, PACK_VALIDITY_MONTHS } from '../_shared/packs.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Non connecté' }, 401);

    const { coach_id, pack_id, installments, return_url } = await req.json();
    const n = Number(installments);
    if (!(PACK_INSTALLMENTS as readonly number[]).includes(n)) return json({ error: 'Nombre de mensualités invalide' }, 400);

    const { data: coachRow } = await admin.from('coaches').select('id, user_id, is_active, data').eq('id', coach_id).maybeSingle();
    if (!coachRow || coachRow.is_active === false) return json({ error: 'Coach introuvable' }, 404);
    if (coachRow.user_id === user.id) return json({ error: 'Vous ne pouvez pas acheter votre propre pack.' }, 400);

    // Le prix vient de la fiche du coach (jamais de l'app)
    // deno-lint-ignore no-explicit-any
    const pack = (coachRow.data?.packs ?? []).find((p: any) => p?.id === pack_id && p?.active !== false);
    if (!pack) return json({ error: 'Ce pack n’est plus proposé.' }, 404);
    const allowed: number[] = Array.isArray(pack.installments) && pack.installments.length ? pack.installments : [1];
    if (!allowed.includes(n)) return json({ error: `Ce pack ne se paie pas en ${n} fois.` }, 400);

    const sessions = Math.round(Number(pack.sessionsCount));
    const total = Math.round(Number(pack.totalPrice) * 100);
    if (!(sessions >= 2 && sessions <= 100) || !(total >= 100)) return json({ error: 'Pack mal configuré' }, 400);
    const validityMonths = (PACK_VALIDITY_MONTHS as readonly number[]).includes(Number(pack.validityMonths)) ? Number(pack.validityMonths) : 6;

    // Mensualités égales (arrondies au centime) : le total réellement payé est installment × n
    const installment = Math.round(total / n);
    const amountTotal = installment * n;
    const fee = Math.round(amountTotal * COMMISSION_RATE);

    const { data: acct } = await admin.from('stripe_accounts').select('*').eq('coach_id', coach_id).maybeSingle();
    const destination = acct?.charges_enabled ? acct.account_id : null;
    if (n > 1 && !destination) return json({ error: 'Le paiement en plusieurs fois n’est pas encore disponible avec ce coach.' }, 409);

    const purchaseId = `pk-${crypto.randomUUID()}`;
    const snapshot = {
      id: pack.id, name: String(pack.name ?? 'Pack de séances').slice(0, 80), sessionsCount: sessions,
      totalPrice: amountTotal / 100, format: pack.format ?? 'any', validityMonths,
    };

    const base = safeReturnBase(return_url);
    const successUrl = base ? `${base}?pack=success&purchase=${purchaseId}` : `${RETURN_PAGE}?status=success`;
    const cancelUrl = base ? `${base}?pack=cancelled&purchase=${purchaseId}` : `${RETURN_PAGE}?status=cancelled`;
    const metadata = { pack_purchase_id: purchaseId, client_id: user.id, coach_id };
    const name = `${snapshot.name} — ${sessions} séances avec ${coachRow.data?.name ?? 'votre coach'}`;
    const euros = (c: number) => (c / 100).toFixed(2).replace('.', ',') + ' €';

    // deno-lint-ignore no-explicit-any
    const common: any = {
      locale: 'fr',
      customer_email: user.email ?? undefined,
      metadata,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      success_url: successUrl,
      cancel_url: cancelUrl,
      managed_payments: { enabled: false },
    };

    const session = n === 1
      ? await stripe.checkout.sessions.create({
          ...common,
          mode: 'payment',
          line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: amountTotal, product_data: { name, description: `Valable ${validityMonths} mois — Find My Coach` } } }],
          payment_intent_data: {
            metadata,
            description: `Find My Coach — pack ${purchaseId}`,
            ...(destination ? { application_fee_amount: fee, transfer_data: { destination } } : {}),
          },
        })
      : await stripe.checkout.sessions.create({
          ...common,
          mode: 'subscription',
          line_items: [{
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: installment,
              recurring: { interval: 'month' },
              product_data: { name: `${name} (paiement en ${n} fois)` },
            },
          }],
          subscription_data: {
            metadata,
            description: `Find My Coach — pack ${purchaseId} : ${n} mensualités de ${euros(installment)}`,
            application_fee_percent: COMMISSION_RATE * 100,
            transfer_data: { destination },
          },
          custom_text: {
            submit: { message: `Vous payez ${euros(installment)} aujourd'hui, puis ${euros(installment)} chaque mois pendant ${n - 1} mois (total ${euros(amountTotal)}). Les prélèvements s'arrêtent automatiquement ensuite.` },
          },
        });

    const { error } = await admin.from('pack_purchases').insert({
      id: purchaseId,
      client_id: user.id,
      coach_id,
      coach_user_id: coachRow.user_id,
      pack: snapshot,
      sessions_total: sessions,
      installments: n,
      installment_amount: installment,
      amount_total: amountTotal,
      application_fee: destination ? fee : amountTotal,
      status: 'pending',
      checkout_session_id: session.id,
    });
    if (error) throw error;

    return json({ url: session.url, purchase_id: purchaseId });
  } catch (err) {
    console.error('create-pack-checkout', err);
    return json({ error: (err as Error).message ?? 'Erreur de paiement' }, 500);
  }
});
