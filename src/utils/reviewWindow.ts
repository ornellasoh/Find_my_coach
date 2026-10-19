import type { Booking } from '../types';

/** Délai pour laisser un avis : 7 jours après la fin de la séance (le serveur refuse au-delà). */
export const REVIEW_WINDOW_DAYS = 7;

export function reviewDeadline(b: Pick<Booking, 'date' | 'startTime' | 'endTime'>): Date {
  const end = new Date(`${b.date}T${b.endTime || b.startTime || '23:59'}:00`);
  return new Date(end.getTime() + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

/** Le client peut encore laisser un avis sur cette séance. */
export function canLeaveReview(b: Booking, now = new Date()): boolean {
  return b.bookingStatus === 'completed' && !b.hasReview && now < reviewDeadline(b);
}
