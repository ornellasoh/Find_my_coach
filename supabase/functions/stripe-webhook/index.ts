// Reçoit les événements Stripe (paiement réussi, expiré, remboursé, compte coach mis à jour).
import Stripe from 'npm:stripe@17.7.0';
import { admin, notify, stripe } from '../_shared/common.ts';
import { confirmPaidSession, setBooking } from '../_shared/confirm.ts';

const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();
  // Deux points de réception possibles : compte plateforme et comptes connectés (coachs)
  const secrets = [Deno.env.get('STRIPE_WEBHOOK_SECRET'), Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET')].filter(Boolean) as string[];
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature ?? '', secret, undefined, cryptoProvider);
      break;
    } catch {
      /* essaie le secret suivant */
    }
  }
  if (!event) {
    console.error('Signature Stripe invalide');
    return new Response('Signature invalide', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        await confirmPaidSession(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const bookingId = s.metadata?.booking_id;
        await admin.from('payments').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', s.id);
        if (bookingId) {
          const { data: row } = await admin.from('bookings').select('status').eq('id', bookingId).maybeSingle();
          if (row?.status === 'pending') {
            await setBooking(bookingId, 'cancelled', { bookingStatus: 'cancelled', paymentStatus: 'failed' });
          }
        }
        break;
      }
      case 'charge.refunded': {
        const c = event.data.object as Stripe.Charge;
        const pi = String(c.payment_intent ?? '');
        const { data: pay } = await admin.from('payments').select('*').eq('payment_intent_id', pi).maybeSingle();
        if (pay) {
          await admin.from('payments').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('id', pay.id);
          await setBooking(pay.booking_id, 'cancelled', { bookingStatus: 'cancelled', paymentStatus: 'refunded' });
          await notify(pay.client_id, 'booking_cancelled', 'Remboursement effectué', 'Votre séance a été remboursée sur votre carte.', pay.booking_id);
        }
        break;
      }
      case 'account.updated': {
        const a = event.data.object as Stripe.Account;
        await admin
          .from('stripe_accounts')
          .update({
            charges_enabled: a.charges_enabled,
            payouts_enabled: a.payouts_enabled,
            details_submitted: a.details_submitted,
            updated_at: new Date().toISOString(),
          })
          .eq('account_id', a.id);
        break;
      }
    }
  } catch (err) {
    console.error('Erreur de traitement', event.type, err);
    return new Response('Erreur', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
