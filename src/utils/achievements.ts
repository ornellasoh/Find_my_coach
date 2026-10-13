import type { Booking } from '../types';

/** Paliers de séances effectuées : chaque palier atteint débloque un badge. */
export const MILESTONES = [
  { count: 1, name: 'Première séance' },
  { count: 5, name: '5 séances' },
  { count: 10, name: '10 séances' },
  { count: 25, name: '25 séances' },
  { count: 50, name: '50 séances' },
] as const;

export type WeekState = 'done' | 'planned' | 'open';

export interface Achievements {
  /** Séances effectuées (statut « terminée »). */
  completed: number;
  /** Semaines consécutives (lundi → dimanche) avec au moins une séance effectuée. */
  streak: number;
  /** Semaine en cours : séance effectuée, séance réservée, ou rien de prévu. */
  week: WeekState;
  /** Prochain palier à atteindre (absent une fois le dernier badge obtenu). */
  next?: { count: number; name: string; remaining: number; percent: number };
  badges: { count: number; name: string; earned: boolean }[];
}

const mondayOf = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const weekKey = (d: Date) => {
  const m = mondayOf(d);
  return `${m.getFullYear()}-${m.getMonth() + 1}-${m.getDate()}`;
};
const dayOf = (b: Booking) => new Date(`${b.date}T12:00:00`);

/** Série, paliers et badges du client, calculés uniquement à partir de ses vraies réservations. */
export function clientAchievements(bookings: Booking[], clientId?: string, now = new Date()): Achievements {
  const mine = bookings.filter((b) => b.clientId === clientId);
  const done = mine.filter((b) => b.bookingStatus === 'completed');
  const weeks = new Set(done.map((b) => weekKey(dayOf(b))));
  const thisWeek = weekKey(now);
  // Séance réservée « cette semaine » : aujourd'hui ou plus tard (une séance passée non clôturée ne compte pas)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const week: WeekState = weeks.has(thisWeek)
    ? 'done'
    : mine.some((b) => b.bookingStatus === 'confirmed' && weekKey(dayOf(b)) === thisWeek && dayOf(b) >= today)
      ? 'planned'
      : 'open';

  // La série reste en vie pendant la semaine en cours tant que la semaine précédente compte
  const cursor = mondayOf(now);
  if (week !== 'done') cursor.setDate(cursor.getDate() - 7);
  let streak = 0;
  while (weeks.has(weekKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }

  const completed = done.length;
  const target = MILESTONES.find((m) => m.count > completed);
  const previous = [...MILESTONES].reverse().find((m) => m.count <= completed)?.count ?? 0;
  return {
    completed,
    streak,
    week,
    next: target && {
      count: target.count,
      name: target.name,
      remaining: target.count - completed,
      percent: Math.round(((completed - previous) / (target.count - previous)) * 100),
    },
    badges: MILESTONES.map((m) => ({ ...m, earned: completed >= m.count })),
  };
}
