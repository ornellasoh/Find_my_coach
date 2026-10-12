import type { CoachProfile } from '../types';
import { LEVEL_LABELS } from './searchFilters';
import { isSupabaseEnabled } from '../lib/supabase';
import { realPhoto } from './initials';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Compte réel (pas une fiche de démonstration). */
export const isRealCoach = (c: Pick<CoachProfile, 'userId'>) => !!c.userId && UUID.test(c.userId);

/**
 * Badge « Vérifié » : uniquement si un admin a validé le profil (statut protégé côté serveur).
 * Les fiches de démonstration n'affichent jamais ce badge.
 */
export const isVerifiedCoach = (c: Pick<CoachProfile, 'userId' | 'verificationStatus'>) =>
  c.verificationStatus === 'verified' && isRealCoach(c);

/** Zone affichée publiquement : ville / code postal, jamais l'adresse exacte. */
export const approximateZone = (c: Pick<CoachProfile, 'city' | 'postalCode'>) =>
  `${c.city ?? ''}${c.postalCode ? ` (${c.postalCode.slice(0, 2)})` : ''}`;

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

/** Liste d'aide pour compléter le profil coach. */
export function profileChecklist(c: CoachProfile, hasDocument: boolean, hasSlots: boolean): ChecklistItem[] {
  return [
    { key: 'photo', label: 'Photo de profil', done: !!realPhoto(c.photo) },
    { key: 'bio', label: 'Présentation (au moins 120 caractères)', done: (c.bio ?? '').trim().length >= 120 },
    { key: 'methods', label: 'Votre méthode de travail', done: (c.methods ?? '').trim().length >= 40 },
    { key: 'specialties', label: 'Spécialités', done: (c.specialties ?? []).length > 0 },
    { key: 'objectives', label: 'Objectifs accompagnés', done: (c.objectives ?? []).length > 0 },
    { key: 'levels', label: 'Niveaux acceptés', done: (c.levels ?? []).length > 0 },
    { key: 'audiences', label: 'Publics', done: (c.audiences ?? []).length > 0 },
    { key: 'formats', label: 'Formats et tarifs', done: (c.formats ?? []).length > 0 && c.hourlyRate > 0 },
    { key: 'includes', label: 'Ce que comprend une séance', done: (c.sessionIncludes ?? '').trim().length > 0 },
    { key: 'zone', label: 'Ville et zone de déplacement', done: !!c.city && (!c.formats?.includes('home') || c.interventionRadiusKm > 0) },
    { key: 'docs', label: 'Diplôme ou justificatif envoyé (privé)', done: hasDocument },
    { key: 'slots', label: 'Disponibilités ouvertes', done: hasSlots },
  ];
}

export const levelsText = (c: CoachProfile) => (c.levels ?? []).map((l) => LEVEL_LABELS[l]).join(', ');

/** Note affichée : « Nouveau » tant qu'aucun avis n'a été publié (jamais de 5,0 par défaut). */
export const ratingLabel = (c: Pick<CoachProfile, 'rating' | 'reviewCount'>) =>
  c.reviewCount > 0 ? c.rating.toFixed(1).replace('.', ',') : 'Nouveau';

/**
 * Fiche visible dans la recherche et réservable : active, complétée, avec un tarif.
 * En ligne, les profils de démonstration (sans vrai compte) ne sont jamais réservables.
 */
export const isBookableCoach = (c: CoachProfile) =>
  c.isActive && c.hourlyRate > 0 && c.isProfileComplete !== false && (!isSupabaseEnabled || isRealCoach(c));

/** Profil d'exemple affiché en ligne (réglage show_demo_coaches) : lecture seule. */
export const isDemoCoachOnline = (c: Pick<CoachProfile, 'userId'>) => isSupabaseEnabled && !isRealCoach(c);

/** Description de la zone d'intervention, générée automatiquement (ville, rayon, formats). */
export function zoneDescription(c: { city?: string; interventionRadiusKm?: number; formats?: string[] }): string {
  const city = (c.city ?? '').trim();
  const f = c.formats ?? [];
  const r = Number(c.interventionRadiusKm ?? 0);
  const online = f.includes('online');
  const onSite = f.some((x) => x !== 'online');
  if (!onSite) return online ? '100 % en ligne (visio)' : city;
  let txt: string;
  if (f.includes('home') && r > 0 && city) txt = `Se déplace à domicile jusqu'à ${r} km autour de ${city}`;
  else if (city) txt = r > 0 ? `${city} et ${r} km aux alentours` : `Séances à ${city}`;
  else txt = r > 0 ? `Jusqu'à ${r} km` : '';
  return online ? `${txt}${txt ? ' · ' : ''}visio possible` : txt;
}

/** Identifiant lisible du lien public : « ornella-soh-45d1 » (nom sans accents + début de l'identifiant du compte). */
export function coachSlug(c: { name?: string; userId?: string; id: string }): string {
  const base = (c.name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = (c.userId || c.id).replace(/^coach-/, '').replace(/[^a-z0-9]/gi, '').slice(0, 4).toLowerCase();
  return base ? `${base}-${suffix}` : c.id;
}
