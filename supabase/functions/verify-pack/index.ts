// Vérifie directement auprès de Stripe si un pack a été payé (filet de sécurité si le webhook tarde).
import { admin, corsHeaders, getUser, json, stripe } from '../_shared/common.ts';
import { handlePackCheckout } from '../_shared/packs.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Non connecté' }, 401);
    const { purchase_id } = await req.json();
    const { data: p } = await admin.from('pack_purchases').select('id, client_id, status, checkout_session_id').eq('id', purchase_id).maybeSingle();
    if (!p || p.client_id !== user.id) return json({ error: 'Pack introuvable' }, 404);
    if (p.status !== 'pending' || !p.checkout_session_id) return json({ status: p.status });

    const session = await stripe.checkout.sessions.retrieve(p.checkout_session_id);
    await handlePackCheckout(session);
    const { data: after } = await admin.from('pack_purchases').select('status').eq('id', purchase_id).maybeSingle();
    return json({ status: after?.status ?? 'pending' });
  } catch (err) {
    console.error('verify-pack', err);
    return json({ error: 'Vérification impossible' }, 500);
  }
});
