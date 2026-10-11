// Confirmation d'un paiement Stripe Checkout (utilisée par le webhook ET par verify-payment).
import type Stripe from 'npm:stripe@17.7.0';
import { admin, notify, stripe } from './common.ts';

export async function setBooking(bookingId: string, status: string, patch: Record<string, unknown>) {
  const { data: row } = await admin.from('bookings').select('*').eq('id', bookingId).maybeSingle();
  if (!row) return null;
  const { error } = await admin.from('bookings').update({ status, data: { ...row.data, ...patch } }).eq('id', bookingId);
  if (error) throw error;
  return row;
}

/**
 * Le créneau a été confirmé pour quelqu'un d'autre pendant le paiement (cas rare) :
 * remboursement intégral automatique, réservation annulée, client prévenu.
 */
async function refundSlotConflict(s: Stripe.Checkout.Session, bookingId: string) {
  const pi = String(s.payment_intent ?? '');
  if (pi) {
    const intent = await stripe.paymentIntents.retrieve(pi);
    const toCoach = !!intent.transfer_data?.destination;
    await stripe.refunds.create(
      {
        payment_intent: pi,
        reason: 'duplicate',
        ...(toCoach ? { reverse_transfer: true, refund_application_fee: true } : {}),
        metadata: { booking_id: bookingId, cause: 'slot_conflict' },
      },
      { idempotencyKey: `refund-conflict-${bookingId}` },
    );
  }
  await admin.from('payments')
    .update({ status: 'refunded', payment_intent_id: pi, updated_at: new Date().toISOString() })
    .eq('id', s.id);
  const row = await setBooking(bookingId, 'cancelled', {
    bookingStatus: 'cancelled', paymentStatus: 'refunded', cancelledBy: 'system', cancelReason: 'slot_conflict',
  });
  if (row) {
    const b = row.data;
    await notify(row.client_id, 'booking_cancelled', 'Créneau indisponible — remboursement',
      `Le créneau du ${b.date} à ${b.startTime} avec ${b.coachName} a été réservé juste avant votre paiement. ` +
      'Vous êtes remboursé intégralement (sous 5 à 10 jours). Choisissez un autre horaire dans l\'app.', bookingId);
  }
}

/** Marque la séance payée + confirmée et prévient client et coach. Sans effet si déjà fait. */
export async function confirmPaidSession(s: Stripe.Checkout.Session): Promise<boolean> {
  if (s.payment_status !== 'paid') return false;
  const bookingId = s.metadata?.booking_id;
  if (!bookingId) return false;
  const { data: pay } = await admin.from('payments').select('status').eq('id', s.id).maybeSingle();
  if (pay?.status === 'paid' || pay?.status === 'refunded') return true; // déjà traité

  // Anti double réservation : le créneau doit encore être libre au moment de confirmer
  const { data: conflict } = await admin.rpc('fmc_booking_conflict', { p_booking_id: bookingId, p_include_pending: false });
  if (conflict === true) {
    await refundSlotConflict(s, bookingId);
    return true;
  }
  await admin
    .from('payments')
    .update({ status: 'paid', payment_intent_id: String(s.payment_intent ?? ''), updated_at: new Date().toISOString() })
    .eq('id', s.id);
  let row;
  try {
    row = await setBooking(bookingId, 'confirmed', {
      bookingStatus: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'Carte bancaire (Stripe)',
      total: (s.amount_total ?? 0) / 100,
    });
  } catch (err) {
    // 23505 = index « une séance confirmée par créneau » : quelqu'un a confirmé le même créneau à l'instant
    if ((err as { code?: string }).code === '23505') {
      await refundSlotConflict(s, bookingId);
      return true;
    }
    throw err;
  }
  if (row) {
    const b = row.data;
    await notify(row.client_id, 'booking_confirmed', 'Réservation confirmée ✅',
      `Votre séance avec ${b.coachName} le ${b.date} à ${b.startTime} est confirmée.`, bookingId);
    await notify(row.coach_user_id, 'new_booking', 'Nouvelle réservation 🎉',
      `${b.clientName} a réservé une séance (${b.sessionType?.name ?? 'séance'}) le ${b.date} à ${b.startTime}.`, bookingId);
  }
  return true;
}
