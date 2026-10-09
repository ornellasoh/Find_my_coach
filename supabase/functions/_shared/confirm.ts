// Confirmation d'un paiement Stripe Checkout (utilisée par le webhook ET par verify-payment).
import type Stripe from 'npm:stripe@17.7.0';
import { admin, notify } from './common.ts';

export async function setBooking(bookingId: string, status: string, patch: Record<string, unknown>) {
  const { data: row } = await admin.from('bookings').select('*').eq('id', bookingId).maybeSingle();
  if (!row) return null;
  await admin.from('bookings').update({ status, data: { ...row.data, ...patch } }).eq('id', bookingId);
  return row;
}

/** Marque la séance payée + confirmée et prévient client et coach. Sans effet si déjà fait. */
export async function confirmPaidSession(s: Stripe.Checkout.Session): Promise<boolean> {
  if (s.payment_status !== 'paid') return false;
  const bookingId = s.metadata?.booking_id;
  if (!bookingId) return false;
  const { data: pay } = await admin.from('payments').select('status').eq('id', s.id).maybeSingle();
  if (pay?.status === 'paid') return true; // déjà traité
  await admin
    .from('payments')
    .update({ status: 'paid', payment_intent_id: String(s.payment_intent ?? ''), updated_at: new Date().toISOString() })
    .eq('id', s.id);
  const row = await setBooking(bookingId, 'confirmed', {
    bookingStatus: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'Carte bancaire (Stripe)',
    total: (s.amount_total ?? 0) / 100,
  });
  if (row) {
    const b = row.data;
    await notify(row.client_id, 'booking_confirmed', 'Réservation confirmée ✅',
      `Votre séance avec ${b.coachName} le ${b.date} à ${b.startTime} est confirmée.`, bookingId);
    await notify(row.coach_user_id, 'new_booking', 'Nouvelle réservation 🎉',
      `${b.clientName} a réservé une séance (${b.sessionType?.name ?? 'séance'}) le ${b.date} à ${b.startTime}.`, bookingId);
  }
  return true;
}
