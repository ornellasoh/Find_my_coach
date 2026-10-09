// Annule une réservation et rembourse automatiquement via Stripe.
// Client : annulation gratuite jusqu'à CLIENT_CANCEL_HOURS avant la séance.
// Coach / admin : annulation possible à tout moment, toujours remboursée intégralement.
import { admin, corsHeaders, getUser, json, notify, stripe } from '../_shared/common.ts';
import { setBooking } from '../_shared/confirm.ts';

const CLIENT_CANCEL_HOURS = 24;

/** Heures restantes avant la séance (date + heure exprimées à l'heure de Paris). */
function hoursBefore(date: string, startTime: string): number {
  const parisNow = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date()).replace(' ', 'T');
  const session = Date.parse(`${date}T${startTime || '00:00'}:00Z`);
  const now = Date.parse(`${parisNow}:00Z`);
  return (session - now) / 3_600_000;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Non connecté' }, 401);
    const { booking_id } = await req.json();

    const { data: row } = await admin.from('bookings').select('*').eq('id', booking_id).maybeSingle();
    if (!row) return json({ error: 'Réservation introuvable' }, 404);
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const isAdmin = profile?.role === 'admin';
    const isClient = row.client_id === user.id;
    const isCoach = row.coach_user_id === user.id;
    if (!isAdmin && !isClient && !isCoach) return json({ error: 'Réservation introuvable' }, 404);

    const b = row.data ?? {};
    const by = isCoach ? 'coach' : isClient ? 'client' : 'admin';

    // Réservation pas encore payée : on l'abandonne simplement
    if (row.status === 'pending') {
      const { data: pays } = await admin.from('payments').select('id').eq('booking_id', booking_id).eq('status', 'pending');
      for (const p of pays ?? []) {
        try { await stripe.checkout.sessions.expire(p.id); } catch { /* déjà expirée */ }
        await admin.from('payments').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', p.id);
      }
      await setBooking(booking_id, 'cancelled', { bookingStatus: 'cancelled', paymentStatus: 'failed', cancelledBy: by });
      return json({ status: 'cancelled', refunded: false });
    }
    if (row.status !== 'confirmed') return json({ error: 'Cette séance ne peut plus être annulée.' }, 409);

    if (by === 'client' && hoursBefore(b.date, b.startTime) < CLIENT_CANCEL_HOURS) {
      return json({
        error: `L'annulation en ligne est possible jusqu'à ${CLIENT_CANCEL_HOURS} h avant la séance. Contactez votre coach via la messagerie.`,
      }, 409);
    }

    // Remboursement Stripe (si la séance a été payée par carte)
    let refundedAmount = 0;
    const { data: pay } = await admin.from('payments').select('*').eq('booking_id', booking_id).eq('status', 'paid').maybeSingle();
    if (pay?.payment_intent_id) {
      const pi = await stripe.paymentIntents.retrieve(pay.payment_intent_id);
      const toCoach = !!pi.transfer_data?.destination;
      const refund = await stripe.refunds.create(
        {
          payment_intent: pay.payment_intent_id,
          reason: 'requested_by_customer',
          // Paiement reversé au coach : on récupère sa part et la commission Find My Coach
          ...(toCoach ? { reverse_transfer: true, refund_application_fee: true } : {}),
          metadata: { booking_id, cancelled_by: by },
        },
        { idempotencyKey: `refund-${booking_id}` },
      );
      refundedAmount = refund.amount;
      await admin.from('payments').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('id', pay.id);
    }

    await setBooking(booking_id, 'cancelled', {
      bookingStatus: 'cancelled',
      paymentStatus: pay ? 'refunded' : b.paymentStatus,
      cancelledBy: by,
      cancelledAt: new Date().toISOString(),
    });

    const when = `le ${b.date} à ${b.startTime}`;
    const refundText = refundedAmount ? ` Vous êtes remboursé de ${(refundedAmount / 100).toFixed(2).replace('.', ',')} € sur votre carte (sous 5 à 10 jours).` : '';
    if (by !== 'client') {
      await notify(row.client_id, 'booking_cancelled', 'Séance annulée',
        `Votre séance avec ${b.coachName ?? 'votre coach'} ${when} a été annulée.${refundText}`, booking_id);
    } else {
      await notify(row.client_id, 'booking_cancelled', 'Annulation confirmée', `Votre séance ${when} est annulée.${refundText}`, booking_id);
    }
    if (by !== 'coach') {
      await notify(row.coach_user_id, 'booking_cancelled', 'Séance annulée',
        `${b.clientName ?? 'Votre client'} a annulé la séance ${when}. Le créneau est de nouveau disponible.`, booking_id);
    }

    return json({ status: 'cancelled', refunded: refundedAmount > 0, amount: refundedAmount / 100 });
  } catch (err) {
    console.error('cancel-booking', err);
    return json({ error: "L'annulation a échoué. Réessayez ou contactez contact@findmycoach.io." }, 500);
  }
});
