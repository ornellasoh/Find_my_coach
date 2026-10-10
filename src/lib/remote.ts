import { useEffect, useRef } from 'react';
import { supabase } from './supabase';
import type {
  AvailabilitySlot,
  Booking,
  CoachProfile,
  Favorite,
  Goal,
  Notification,
  Review,
  User,
  WorkoutProgram,
} from '../types';

/**
 * Couche de synchronisation avec Supabase.
 * Chaque collection de l'app est stockée dans une table (objet complet dans `data` + colonnes de filtre).
 */

type RowMapper<T> = (item: T) => Record<string, unknown>;

export const MAPPERS = {
  coaches: ((c: CoachProfile) => ({
    id: c.id,
    user_id: c.userId,
    is_active: c.isActive,
    city: c.city,
    category: c.category,
    data: c,
  })) as RowMapper<CoachProfile>,
  availabilities: ((a: AvailabilitySlot) => ({ id: a.id, coach_id: a.coachId, date: a.date, data: a })) as RowMapper<AvailabilitySlot>,
  bookings: ((b: Booking) => ({
    id: b.id,
    client_id: b.clientId,
    coach_id: b.coachId,
    availability_id: b.availabilityId,
    status: b.bookingStatus,
    date: b.date,
    data: b,
  })) as RowMapper<Booking>,
  reviews: ((r: Review) => ({
    id: r.id,
    coach_id: r.coachId,
    client_id: r.clientId,
    booking_id: r.bookingId,
    is_hidden: !!r.isHidden,
    data: r,
  })) as RowMapper<Review>,
  favorites: ((f: Favorite) => ({ id: f.id, user_id: f.userId, coach_id: f.coachId, data: f })) as RowMapper<Favorite>,
  notifications: ((n: Notification) => ({ id: n.id, user_id: n.userId, read: n.read, data: n })) as RowMapper<Notification>,
  goals: ((g: Goal) => ({ id: g.id, user_id: g.userId, data: g })) as RowMapper<Goal>,
  workout_programs: ((p: WorkoutProgram) => ({
    id: p.id,
    client_id: p.clientId,
    coach_id: p.coachId,
    data: p,
  })) as RowMapper<WorkoutProgram>,
};

export type RemoteTable = keyof typeof MAPPERS;

const rowsToData = <T>(rows: { data: T }[] | null): T[] => (rows || []).map((r) => r.data);

export interface RemoteSnapshot {
  coaches: CoachProfile[];
  availabilities: AvailabilitySlot[];
  bookedSlotIds: string[];
  bookings: Booking[];
  reviews: Review[];
  favorites: Favorite[];
  notifications: Notification[];
  goals: Goal[];
  workoutPrograms: WorkoutProgram[];
}

/** Charge toutes les données visibles par l'utilisateur connecté (les règles RLS filtrent côté serveur). */
export async function fetchSnapshot(): Promise<RemoteSnapshot> {
  if (!supabase) throw new Error('Supabase non configuré');
  const today = new Date();
  today.setDate(today.getDate() - 1);
  const fromDate = today.toISOString().slice(0, 10);

  const [coaches, availabilities, booked, bookings, reviews, favorites, notifications, goals, programs, settings] = await Promise.all([
    supabase.from('coaches').select('data'),
    supabase.from('availabilities').select('data').gte('date', fromDate).limit(5000),
    supabase.from('booked_slots').select('availability_id').gte('date', fromDate).limit(5000),
    supabase.from('bookings').select('data').order('created_at', { ascending: false }).limit(500),
    supabase.from('reviews').select('data').order('created_at', { ascending: false }).limit(1000),
    supabase.from('favorites').select('data'),
    supabase.from('notifications').select('data').order('created_at', { ascending: false }).limit(100),
    supabase.from('goals').select('data'),
    supabase.from('workout_programs').select('data'),
    supabase.from('app_settings').select('key, value'),
  ]);

  const firstError = [coaches, availabilities, booked, bookings, reviews, favorites, notifications, goals, programs].find((r) => r.error);
  if (firstError?.error) throw firstError.error;

  // Coachs de démonstration : masqués au lancement (réglage « show_demo_coaches » dans app_settings)
  const showDemo = ((settings.data || []) as { key: string; value: unknown }[]).find((r) => r.key === 'show_demo_coaches')?.value !== false;
  const isRealAccount = (id?: string) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const allCoaches = rowsToData(coaches.data as { data: CoachProfile }[]);

  return {
    coaches: showDemo ? allCoaches : allCoaches.filter((c) => isRealAccount(c.userId)),
    availabilities: rowsToData(availabilities.data as { data: AvailabilitySlot }[]),
    bookedSlotIds: ((booked.data || []) as { availability_id: string }[]).map((r) => r.availability_id),
    bookings: rowsToData(bookings.data as { data: Booking }[]),
    reviews: rowsToData(reviews.data as { data: Review }[]),
    favorites: rowsToData(favorites.data as { data: Favorite }[]),
    notifications: rowsToData(notifications.data as { data: Notification }[]),
    goals: rowsToData(goals.data as { data: Goal }[]),
    workoutPrograms: rowsToData(programs.data as { data: WorkoutProgram }[]),
  };
}

/** Profil Supabase → utilisateur de l'app. */
export interface ProfileRow {
  id: string;
  role: User['role'];
  name: string;
  email: string;
  avatar: string | null;
  data: Partial<User> | null;
  created_at: string;
}

export const profileToUser = (p: ProfileRow): User => ({
  createdAt: p.created_at,
  status: 'active',
  ...(p.data || {}),
  id: p.id,
  role: p.role,
  name: p.name,
  email: p.email,
  avatar:
    p.avatar ||
    p.data?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'FMC')}&background=00D664&color=0F172A&bold=true&size=256`,
});

export async function fetchProfile(userId: string): Promise<User | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data ? profileToUser(data as ProfileRow) : null;
}

export async function saveProfile(user: User) {
  if (!supabase) return;
  const { id, role, name, email, avatar, ...rest } = user;
  const { error } = await supabase.from('profiles').update({ role, name, email, avatar, data: rest }).eq('id', id);
  if (error) console.warn('[supabase] profil non enregistré', error.message);
}

/**
 * Synchronise automatiquement une collection avec sa table :
 * tout élément ajouté/modifié (et autorisé par `canWrite`) est enregistré, tout élément supprimé est effacé.
 * Appeler `setBaseline(items)` juste après un chargement pour ne pas renvoyer ce qui vient du serveur.
 */
export function useRemoteSync<T extends { id: string }>(
  table: RemoteTable,
  items: T[],
  enabled: boolean,
  canWrite: (item: NoInfer<T>, isNew: boolean) => boolean
) {
  const baseline = useRef<Map<string, string> | null>(null);
  const canWriteRef = useRef(canWrite);
  canWriteRef.current = canWrite;

  useEffect(() => {
    if (!enabled || !supabase || !baseline.current) return;
    const prev = baseline.current;
    const next = new Map<string, string>();
    const inserts: Record<string, unknown>[] = [];
    const upserts: Record<string, unknown>[] = [];

    for (const item of items) {
      const json = JSON.stringify(item);
      next.set(item.id, json);
      const old = prev.get(item.id);
      if (old !== json && canWriteRef.current(item, old === undefined)) {
        (old === undefined ? inserts : upserts).push((MAPPERS[table] as unknown as RowMapper<T>)(item));
      }
    }
    const deletions: string[] = [];
    prev.forEach((json, id) => {
      if (!next.has(id) && canWriteRef.current(JSON.parse(json) as T, false)) deletions.push(id);
    });
    baseline.current = next;

    if (inserts.length) {
      supabase
        .from(table)
        .insert(inserts)
        .then(({ error }) => error && console.warn(`[supabase] ${table} : ajout refusé`, error.message));
    }
    if (upserts.length) {
      supabase
        .from(table)
        .upsert(upserts)
        .then(({ error }) => error && console.warn(`[supabase] ${table} : enregistrement refusé`, error.message));
    }
    if (deletions.length) {
      supabase
        .from(table)
        .delete()
        .in('id', deletions)
        .then(({ error }) => error && console.warn(`[supabase] ${table} : suppression refusée`, error.message));
    }
  }, [items, enabled, table]);

  return {
    setBaseline: (data: T[]) => {
      baseline.current = new Map(data.map((i) => [i.id, JSON.stringify(i)]));
    },
    reset: () => {
      baseline.current = null;
    },
  };
}
