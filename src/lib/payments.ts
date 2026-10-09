import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from './supabase';

/**
 * Paiements Stripe (via les fonctions Supabase create-checkout / connect-onboarding).
 * Sur le web : redirection dans le même onglet puis retour sur l'app (?payment=…).
 * Sur iPhone/Android : ouverture dans le navigateur intégré, l'app vérifie le paiement à la fermeture.
 */

const isNative = () => Capacitor.isNativePlatform();
const webReturnUrl = () => `${window.location.origin}${window.location.pathname}`;

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Paiement indisponible en mode démo.');
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // Message renvoyé par la fonction, si disponible
    let message = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) message = (await ctx.json()).error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

/** Ouvre une page Stripe ; sur mobile, `onClose` est appelé à la fermeture du navigateur intégré. */
async function openStripePage(url: string, onClose?: () => void) {
  if (isNative()) {
    const handle = await Browser.addListener('browserFinished', () => {
      handle.remove();
      onClose?.();
    });
    await Browser.open({ url, presentationStyle: 'popover' });
  } else {
    window.location.href = url;
  }
}

export async function startCheckout(bookingId: string, promoCode: string | undefined, onClose?: () => void) {
  const { url } = await invoke<{ url: string }>('create-checkout', {
    booking_id: bookingId,
    promo_code: promoCode || undefined,
    return_url: isNative() ? undefined : webReturnUrl(),
  });
  await openStripePage(url, onClose);
}

export async function openCoachStripe(onClose?: () => void) {
  const { url } = await invoke<{ url: string; status: string }>('connect-onboarding', {
    return_url: isNative() ? undefined : webReturnUrl(),
  });
  await openStripePage(url, onClose);
}

export interface StripeAccountStatus {
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
}

export async function fetchStripeStatus(coachId: string): Promise<StripeAccountStatus | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('stripe_accounts')
    .select('charges_enabled, payouts_enabled, details_submitted')
    .eq('coach_id', coachId)
    .maybeSingle();
  return (data as StripeAccountStatus) ?? null;
}

/** Lit l'état d'une réservation (mis à jour par le webhook Stripe). */
export async function fetchBooking<T>(bookingId: string): Promise<T | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('bookings').select('data').eq('id', bookingId).maybeSingle();
  return (data?.data as T) ?? null;
}

/** Demande au serveur de vérifier le paiement directement auprès de Stripe (filet si le webhook tarde). */
export async function verifyPayment(bookingId: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.functions.invoke('verify-payment', { body: { booking_id: bookingId } });
    return (data as { status?: string })?.status ?? null;
  } catch {
    return null;
  }
}

/** Attend la confirmation du paiement (webhook ou vérification directe) pendant ~20 s. */
export async function waitForPayment<T extends { paymentStatus: string; bookingStatus: string }>(
  bookingId: string,
  tries = 10
): Promise<T | null> {
  for (let i = 0; i < tries; i++) {
    const b = await fetchBooking<T>(bookingId);
    if (b && (b.paymentStatus === 'paid' || b.bookingStatus === 'cancelled')) return b;
    await verifyPayment(bookingId);
    await new Promise((r) => setTimeout(r, 2000));
  }
  return fetchBooking<T>(bookingId);
}

export interface CancelResult {
  refunded: boolean;
  amount?: number;
}

/** Annule une séance côté serveur (remboursement Stripe automatique si elle a été payée). */
export async function cancelBookingRemote(bookingId: string): Promise<CancelResult> {
  const res = await invoke<{ status: string; refunded: boolean; amount?: number }>('cancel-booking', { booking_id: bookingId });
  return { refunded: !!res.refunded, amount: res.amount };
}
