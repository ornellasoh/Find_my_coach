import type { CoachingFormat, CoachLevel } from '../types';

export type RadiusKm = 5 | 10 | 20 | 50;
export const RADIUS_OPTIONS: RadiusKm[] = [5, 10, 20, 50];

/** Filtres de recherche, conservés dans l'app (retour depuis une fiche coach sans tout perdre). */
export interface SearchFilters {
  /** Point de recherche : ville / code postal saisi, ou position GPS ponctuelle (jamais suivie en continu) */
  center: { latitude: number; longitude: number } | null;
  centerLabel: string | null;
  centerSource: 'city' | 'gps' | null;
  radiusKm: RadiusKm;
  /** Mode de séance : 'any' | 'online' (visio) | 'in_person' (présentiel) */
  mode: 'any' | 'online' | 'in_person';
  formats: CoachingFormat[];
  maxPrice: number | null;
  objective: string | null;
  level: CoachLevel | null;
  /** Disponibilité réelle (créneaux libres) dans les N prochains jours */
  availabilityDays: 0 | 3 | 7 | 14;
  onlyVerified: boolean;
  minRating: number;
  sortBy: 'relevance' | 'distance' | 'price' | 'rating';
  viewMode: 'list' | 'map';
}

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  center: null,
  centerLabel: null,
  centerSource: null,
  radiusKm: 20,
  mode: 'any',
  formats: [],
  maxPrice: null,
  objective: null,
  level: null,
  availabilityDays: 0,
  onlyVerified: false,
  minRating: 0,
  sortBy: 'relevance',
  viewMode: 'list',
};

export const LEVEL_LABELS: Record<CoachLevel, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
};

/** Objectifs proposés (le coach coche les siens dans son profil). */
export const OBJECTIVE_OPTIONS = [
  'Perte de poids',
  'Prise de muscle',
  'Remise en forme',
  'Préparation sportive',
  'Mobilité & souplesse',
  'Bien-être & stress',
  'Nutrition',
  'Rééducation douce',
  'Confiance en soi',
  'Carrière & business',
];

export const AUDIENCE_OPTIONS = ['Adultes', 'Seniors', 'Adolescents', 'Femmes enceintes / post-partum', 'Sportifs confirmés', 'Entreprises'];
