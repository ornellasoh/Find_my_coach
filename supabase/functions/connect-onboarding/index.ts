// Ouvre l'inscription Stripe Connect d'un coach (ou son tableau de bord Stripe s'il est déjà inscrit).
import { admin, corsHeaders, getUser, json, RETURN_PAGE, safeReturnBase, stripe } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Non connecté' }, 401);
    const { return_url } = await req.json().catch(() => ({}));

    const { data: coach } = await admin.from('coaches').select('id, data').eq('user_id', user.id).maybeSingle();
    if (!coach) return json({ error: 'Aucune fiche coach pour ce compte' }, 404);

    let { data: acct } = await admin.from('stripe_accounts').select('*').eq('coach_id', coach.id).maybeSingle();

    if (!acct) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'FR',
        email: user.email ?? undefined,
        business_type: 'individual',
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_profile: { product_description: 'Séances de coaching via Find My Coach', mcc: '7997' },
        metadata: { coach_id: coach.id, user_id: user.id },
      });
      const { data } = await admin
        .from('stripe_accounts')
        .insert({ coach_id: coach.id, account_id: account.id })
        .select()
        .single();
      acct = data;
    } else {
      // Rafraîchit le statut
      const account = await stripe.accounts.retrieve(acct.account_id);
      await admin
        .from('stripe_accounts')
        .update({
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          updated_at: new Date().toISOString(),
        })
        .eq('coach_id', coach.id);
      if (account.details_submitted) {
        const login = await stripe.accounts.createLoginLink(acct.account_id);
        return json({ url: login.url, status: account.charges_enabled ? 'active' : 'pending' });
      }
    }

    const base = safeReturnBase(return_url);
    const link = await stripe.accountLinks.create({
      account: acct!.account_id,
      type: 'account_onboarding',
      refresh_url: base ? `${base}?stripe=refresh` : `${RETURN_PAGE}?status=connect`,
      return_url: base ? `${base}?stripe=done` : `${RETURN_PAGE}?status=connect`,
    });
    return json({ url: link.url, status: 'onboarding' });
  } catch (err) {
    console.error(err);
    return json({ error: (err as Error).message ?? 'Erreur Stripe' }, 500);
  }
});
