import type { Booking } from '../types';

/** Mêmes taux que le serveur (supabase/functions/_shared/common.ts). */
export const COMMISSION_RATE = 0.15;
export const TRAVEL_STRIPE_RATE = 0.015;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Montant net reversé au coach : séance − 15 %, + frais de déplacement − frais Stripe correspondants. */
export function coachNet(b: Pick<Booking, 'price' | 'travelFee'>): number {
  const travel = b.travelFee ?? 0;
  return r2(b.price * (1 - COMMISSION_RATE) + travel - travel * TRAVEL_STRIPE_RATE);
}
