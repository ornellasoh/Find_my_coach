// Vérifie directement auprès de Stripe si une réservation a été payée
// (filet de sécurité si le webhook arrive en retard ou n'arrive pas).
import { admin, corsHeaders, getUser, json, stripe } from '../_shared/common.ts';
import { confirmPaidSession } from '../_shared/confirm.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Non connecté' }, 401);
    const { booking_id } = await req.json();
    const { data: row } = await admin.from('bookings').select('id, client_id, status').eq('id', booking_id).maybeSingle();
    if (!row || row.client_id !== user.id) return json({ error: 'Réservation introuvable' }, 404);
    if (row.status !== 'pending') return json({ status: row.status });

    const { data: pays } = await admin.from('payments').select('id').eq('booking_id', booking_id).eq('status', 'pending');
    for (const p of pays ?? []) {
      const session = await stripe.checkout.sessions.retrieve(p.id);
      if (await confirmPaidSession(session)) return json({ status: 'confirmed' });
    }
    return json({ status: 'pending' });
  } catch (err) {
    console.error('verify-payment', err);
    return json({ error: 'Vérification impossible' }, 500);
  }
});
