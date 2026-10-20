import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from './supabase';
import type { Booking, CoachingFormat, PackBalance, PackInstallments, SessionPack } from '../types';

/**
 * Packs de séances : achat (Stripe, en 1, 3 ou 5 fois), séances restantes, réservation avec un pack.
 * Même principe que lib/payments.ts : page Stripe dans le navigateur intégré (mobile) ou le même onglet (web).
 */

const isNative = () => Capacitor.isNativePlatform();

export const PACK_INSTALLMENT_CHOICES: PackInstallments[] = [1, 3, 5];
export const PACK_VALIDITY_CHOICES = [1, 2, 3, 6, 12];

/** Montant d'une mensualité (identique au calcul du serveur : arrondi au centime). */
export const installmentAmount = (pack: Pick<SessionPack, 'totalPrice'>, n: number) =>
  Math.round((pack.totalPrice * 100) / n) / 100;

/** Le pack couvre-t-il ce type de séance ? */
export const packCoversFormat = (format: CoachingFormat | 'any' | undefined, sessionFormat?: string) =>
  !format || format === 'any' || format === sessionFormat;

async function errorMessage(error: { message: string; context?: Response }) {
  try {
    if (error.context) return (await error.context.json()).error || error.message;
  } catch {
    /* ignore */
  }
  return error.message;
}

export async function startPackCheckout(coachId: string, packId: string, installments: PackInstallments, onClose?: (purchaseId: string) => void) {
  if (!supabase) throw new Error('Achat indisponible en mode démo.');
  const { data, error } = await supabase.functions.invoke('create-pack-checkout', {
    body: {
      coach_id: coachId,
      pack_id: packId,
      installments,
      return_url: isNative() ? undefined : `${window.location.origin}${window.location.pathname}`,
    },
  });
  if (error) throw new Error(await errorMessage(error as { message: string; context?: Response }));
  if (data?.error) throw new Error(data.error);
  const { url, purchase_id } = data as { url: string; purchase_id: string };
  if (isNative()) {
    const handle = await Browser.addListener('browserFinished', () => {
      handle.remove();
      onClose?.(purchase_id);
    });
    await Browser.open({ url, presentationStyle: 'fullscreen' });
  } else {
    window.location.href = url;
  }
}

/** Attend l'activation du pack (webhook ou vérification directe auprès de Stripe), ~20 s au plus. */
export async function waitForPack(purchaseId: string, tries = 10): Promise<string> {
  let status = 'pending';
  for (let i = 0; i < tries; i++) {
    if (!supabase) return status;
    const { data } = await supabase.functions.invoke('verify-pack', { body: { purchase_id: purchaseId } });
    status = (data as { status?: string })?.status ?? status;
    if (status !== 'pending') return status;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return status;
}

interface BalanceRow {
  id: string; client_id: string; client_name: string; coach_id: string; coach_name: string;
  pack: PackBalance['pack']; sessions_total: number; sessions_used: number; installments: PackInstallments;
  installments_paid: number; installment_amount: number; amount_total: number; application_fee: number;
  status: PackBalance['status']; activated_at: string | null; expires_at: string | null; created_at: string;
}

/** Packs du client connecté, ou packs vendus si c'est un coach. */
export async function fetchPackBalances(): Promise<PackBalance[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('fmc_pack_balances');
  if (error) {
    console.warn('[packs]', error.message);
    return [];
  }
  return ((data ?? []) as BalanceRow[]).map((r) => ({
    id: r.id,
    clientId: r.client_id,
    clientName: r.client_name,
    coachId: r.coach_id,
    coachName: r.coach_name,
    pack: r.pack,
    sessionsTotal: r.sessions_total,
    sessionsUsed: r.sessions_used,
    installments: r.installments,
    installmentsPaid: r.installments_paid,
    installmentAmount: r.installment_amount / 100,
    amountTotal: r.amount_total / 100,
    applicationFee: r.application_fee / 100,
    status: r.status,
    activatedAt: r.activated_at,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  }));
}

/** Confirme une réservation « en attente » en utilisant une séance du pack (aucun paiement). */
export async function bookWithPack(bookingId: string, purchaseId: string): Promise<Booking> {
  if (!supabase) throw new Error('Indisponible en mode démo.');
  const { data, error } = await supabase.rpc('fmc_book_with_pack', { p_booking_id: bookingId, p_purchase_id: purchaseId });
  if (error) throw new Error(error.message);
  return data as Booking;
}

export const sessionsLeft = (b: PackBalance) => Math.max(0, b.sessionsTotal - b.sessionsUsed);
export const isUsablePack = (b: PackBalance) => b.status === 'active' && sessionsLeft(b) > 0;
