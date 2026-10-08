/**
 * Geospatial utilities for Find My Coach
 * Haversine formula, location resolver & city presets
 */

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface CityPreset {
  name: string;
  postalCode: string;
  latitude: number;
  longitude: number;
}

export const CITY_PRESETS: CityPreset[] = [
  { name: 'Paris', postalCode: '75001', latitude: 48.8566, longitude: 2.3522 },
  { name: 'Poitiers', postalCode: '86000', latitude: 46.5802, longitude: 0.3404 },
  { name: 'Lyon', postalCode: '69001', latitude: 45.7640, longitude: 4.8357 },
  { name: 'Bordeaux', postalCode: '33000', latitude: 44.8378, longitude: -0.5792 },
  { name: 'Lille', postalCode: '59000', latitude: 50.6292, longitude: 3.0573 },
  { name: 'Nantes', postalCode: '44000', latitude: 47.2184, longitude: -1.5536 },
  { name: 'Marseille', postalCode: '13001', latitude: 43.2965, longitude: 5.3698 },
  { name: 'Toulouse', postalCode: '31000', latitude: 43.6047, longitude: 1.4442 },
  { name: 'Nice', postalCode: '06000', latitude: 43.7102, longitude: 7.2620 },
  { name: 'Strasbourg', postalCode: '67000', latitude: 48.5734, longitude: 7.7521 }
];

/**
 * Calcule la distance orthodromique (en kilomètres) entre deux coordonnées GPS via la formule de Haversine
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371; // Rayon moyen de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

/**
 * Formate une distance pour l'affichage utilisateur (ex: "850 m" ou "3,4 km")
 */
export function formatDistance(km: number | undefined | null): string {
  if (km === undefined || km === null || isNaN(km)) return '';
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/**
 * Recherche une ville parmi les présets ou effectue une correspondance approximative
 */
export function findCityByName(query: string): CityPreset | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return CITY_PRESETS.find(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.postalCode.startsWith(q) ||
      q.includes(c.name.toLowerCase())
  );
}
