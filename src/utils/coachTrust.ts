import type { CoachProfile } from '../types';
import { LEVEL_LABELS } from './searchFilters';

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
    { key: 'photo', label: 'Photo de profil', done: !!c.photo && !/unsplash\.com\/photo-1534528741775/.test(c.photo) },
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
