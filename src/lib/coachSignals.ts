import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/** Indicateurs calculés par le serveur toutes les heures (table coach_signals). */
export interface CoachSignal {
  /** Délai de réponse habituel en minutes (null : pas assez de messages pour l'afficher) */
  responseMinutes: number | null;
  /** « Populaire cette semaine » */
  popular: boolean;
}

let cache: Map<string, CoachSignal> | null = null;
let pending: Promise<Map<string, CoachSignal>> | null = null;
const EMPTY = new Map<string, CoachSignal>();

function load(): Promise<Map<string, CoachSignal>> {
  if (!supabase) return Promise.resolve(EMPTY);
  pending ??= (async () => {
    const { data } = await supabase.from('coach_signals').select('coach_id, response_minutes, popular');
    const map = new Map<string, CoachSignal>();
    for (const r of data ?? []) map.set(r.coach_id, { responseMinutes: r.response_minutes, popular: !!r.popular });
    cache = map;
    return map;
  })().catch(() => {
    pending = null; // nouvel essai au prochain affichage
    return EMPTY;
  });
  return pending;
}

/** Indicateurs de tous les coachs, chargés une fois par session. */
export function useCoachSignals(): Map<string, CoachSignal> {
  const [signals, setSignals] = useState(cache ?? EMPTY);
  useEffect(() => {
    if (cache) return;
    let alive = true;
    load().then((m) => alive && setSignals(m));
    return () => {
      alive = false;
    };
  }, []);
  return signals;
}

/** « Répond en moins d'1 h », « Répond en 3 h », « Répond en 1 à 2 jours » ; rien au-delà de 2 jours. */
export function responseLabel(minutes: number | null | undefined): string | null {
  if (minutes == null) return null;
  if (minutes < 60) return 'Répond en moins d’1 h';
  if (minutes < 24 * 60) return `Répond en ${Math.ceil(minutes / 60)} h`;
  if (minutes <= 48 * 60) return 'Répond en 1 à 2 jours';
  return null;
}
