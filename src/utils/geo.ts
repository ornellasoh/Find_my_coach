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

export interface PlaceResult {
  label: string;      // « Poitiers (86000) »
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
}

/** Repli hors connexion : villes préréglées. */
function presetMatches(q: string): PlaceResult[] {
  const s = q.trim().toLowerCase();
  return CITY_PRESETS.filter((c) => c.name.toLowerCase().startsWith(s) || c.postalCode.startsWith(s)).map((c) => ({
    label: `${c.name} (${c.postalCode})`,
    city: c.name,
    postalCode: c.postalCode,
    latitude: c.latitude,
    longitude: c.longitude,
  }));
}

/**
 * Recherche d'une ville ou d'un code postal français (API publique geo.api.gouv.fr, sans clé, sans compte).
 * Seul le texte tapé est envoyé (jamais la position de l'utilisateur). Repli sur les villes préréglées.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const isPostal = /^\d{2,5}$/.test(q);
  if (isPostal && q.length < 5) return presetMatches(q);
  const params = new URLSearchParams({ fields: 'nom,codesPostaux,centre', limit: '6' });
  if (isPostal) params.set('codePostal', q);
  else {
    params.set('nom', q);
    params.set('boost', 'population');
  }
  try {
    const res = await fetch(`https://geo.api.gouv.fr/communes?${params.toString()}`, { signal });
    if (!res.ok) throw new Error(String(res.status));
    const rows = (await res.json()) as { nom: string; codesPostaux?: string[]; centre?: { coordinates: [number, number] } }[];
    const out = rows
      .filter((r) => r.centre?.coordinates)
      .map((r) => {
        const cp = isPostal ? q : r.codesPostaux?.[0] ?? '';
        return {
          label: `${r.nom}${cp ? ` (${cp})` : ''}`,
          city: r.nom,
          postalCode: cp,
          latitude: r.centre!.coordinates[1],
          longitude: r.centre!.coordinates[0],
        };
      });
    return out.length ? out : presetMatches(q);
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    return presetMatches(q);
  }
}
