import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  Navigation,
  Heart,
  List,
  Loader2,
  Map as MapIcon,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Video,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { AvailabilityBadge, CoachCard, PopularBadge, VerifiedMark } from '../common/CoachCard';
import { useCoachSignals } from '../../lib/coachSignals';
import { Avatar } from '../ui/Avatar';
import { CoachMap } from '../common/CoachMap';
import type { CoachProfile, CoachingFormat, CoachLevel } from '../../types';
import { calculateDistanceKm, searchPlaces, type PlaceResult } from '../../utils/geo';
import {
  DEFAULT_SEARCH_FILTERS,
  LEVEL_LABELS,
  OBJECTIVE_OPTIONS,
  PATHOLOGY_OPTIONS,
  RADIUS_OPTIONS,
  type SearchFilters,
} from '../../utils/searchFilters';
import { isBookableCoach, isVerifiedCoach, ratingLabel } from '../../utils/coachTrust';

const IN_PERSON: CoachingFormat[] = ['home', 'coach_location', 'outdoor', 'partner_gym', 'corporate'];
const FORMAT_LABELS: Record<CoachingFormat, string> = {
  online: 'Visio',
  home: 'À domicile',
  coach_location: 'Chez le coach',
  outdoor: 'Extérieur',
  partner_gym: 'En salle',
  corporate: 'Entreprise',
};

const minPrice = (c: CoachProfile) => {
  const prices = Object.values(c.formatPrices ?? {}).filter((p): p is number => typeof p === 'number' && p > 0);
  return Math.min(c.hourlyRate, ...(prices.length ? prices : [c.hourlyRate]));
};

type GeoState = 'idle' | 'locating' | 'denied' | 'unavailable' | 'unsupported';

interface Row {
  coach: CoachProfile;
  distanceKm: number | null;
  /** Coach hors rayon mais disponible en visio */
  remoteOnly: boolean;
}

export const CoachSearch: React.FC = () => {
  const {
    coaches,
    categories,
    availabilities,
    goBack,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    searchFilters: f,
    setSearchFilters,
  } = useApp();
  const signals = useCoachSignals();

  const set = (patch: Partial<SearchFilters>) => setSearchFilters((prev) => ({ ...prev, ...patch }));

  const [showFilters, setShowFilters] = useState(false);
  const [geoState, setGeoState] = useState<GeoState>('idle');
  const [placeText, setPlaceText] = useState(f.centerSource === 'city' ? f.centerLabel ?? '' : '');
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const placeInputRef = useRef<HTMLInputElement | null>(null);

  // Suggestions de villes / codes postaux (sans GPS)
  useEffect(() => {
    const q = placeText.trim();
    if (q.length < 2 || (f.centerSource === 'city' && q === f.centerLabel)) {
      setPlaces([]);
      setPlacesError(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setPlacesLoading(true);
      setPlacesError(null);
      try {
        const res = await searchPlaces(q, ctrl.signal);
        setPlaces(res);
        if (!res.length) setPlacesError('Aucune ville trouvée. Vérifiez l’orthographe ou essayez un code postal à 5 chiffres.');
      } catch {
        /* recherche annulée */
      } finally {
        setPlacesLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [placeText, f.centerSource, f.centerLabel]);

  const choosePlace = (p: PlaceResult) => {
    set({ center: { latitude: p.latitude, longitude: p.longitude }, centerLabel: p.label, centerSource: 'city' });
    setPlaceText(p.label);
    setPlaces([]);
    setGeoState('idle');
  };

  /** Position demandée uniquement au clic, une seule fois (pas de suivi). */
  const locateMe = () => {
    if (!('geolocation' in navigator)) {
      setGeoState('unsupported');
      return;
    }
    setGeoState('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set({
          center: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          centerLabel: 'Autour de moi',
          centerSource: 'gps',
        });
        setPlaceText('');
        setGeoState('idle');
      },
      (err) => setGeoState(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { timeout: 10000, maximumAge: 5 * 60 * 1000, enableHighAccuracy: false },
    );
  };

  const clearPlace = () => {
    set({ center: null, centerLabel: null, centerSource: null });
    setPlaceText('');
    setPlaces([]);
    setGeoState('idle');
  };

  // Créneaux réellement libres par coach dans les N prochains jours
  const freeSlotsByCoach = useMemo(() => {
    const map = new Map<string, number>();
    if (!f.availabilityDays) return map;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const limit = new Date(now.getTime() + f.availabilityDays * 86_400_000).toISOString().slice(0, 10);
    for (const s of availabilities) {
      if (s.isBooked || s.date < today || s.date > limit) continue;
      if (new Date(`${s.date}T${s.startTime}:00`).getTime() < now.getTime()) continue;
      map.set(s.coachId, (map.get(s.coachId) ?? 0) + 1);
    }
    return map;
  }, [availabilities, f.availabilityDays]);

  const rows: Row[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cat = categories.find((c) => c.slug === selectedCategory);
    const out: Row[] = [];
    for (const c of coaches) {
      if (!isBookableCoach(c)) continue;
      if (q) {
        const hay = [c.name, c.title, c.category, c.city, ...(c.specialties ?? []), ...(c.objectives ?? []), ...(c.pathologies ?? [])].join(' ').toLowerCase();
        if (!hay.includes(q)) continue;
      }
      if (cat && c.category !== cat.name && !c.specialties.some((s) => s.toLowerCase() === cat.name.toLowerCase())) continue;
      if (f.maxPrice !== null && minPrice(c) > f.maxPrice) continue;
      if (c.rating < f.minRating) continue;
      if (f.onlyVerified && !isVerifiedCoach(c)) continue;
      if (f.objective) {
        const o = f.objective.toLowerCase();
        const ok = (c.objectives ?? []).some((x) => x.toLowerCase() === o) || c.specialties.some((s) => s.toLowerCase().includes(o.split(' ')[0]));
        if (!ok) continue;
      }
      if (f.pathology && !(c.pathologies ?? []).includes(f.pathology)) continue;
      if (f.level && !(c.levels ?? []).includes(f.level)) continue;
      const offersOnline = (c.formats ?? []).includes('online') || c.isOnlineCoaching;
      const offersInPerson = (c.formats ?? []).some((x) => IN_PERSON.includes(x));
      if (f.mode === 'online' && !offersOnline) continue;
      if (f.mode === 'in_person' && !offersInPerson) continue;
      if (f.formats.length && !f.formats.some((x) => c.formats?.includes(x))) continue;
      if (f.availabilityDays && !freeSlotsByCoach.get(c.id)) continue;

      let distanceKm: number | null = null;
      let remoteOnly = false;
      if (f.center && c.latitude && c.longitude) {
        distanceKm = calculateDistanceKm(f.center.latitude, f.center.longitude, c.latitude, c.longitude);
      }
      if (f.center && f.mode !== 'online') {
        let inRadius = distanceKm !== null && distanceKm <= f.radiusKm && offersInPerson;
        // « À domicile » demandé seul : le client doit être dans la zone de déplacement du coach
        if (inRadius && f.formats.length === 1 && f.formats[0] === 'home' && c.interventionRadiusKm > 0) {
          inRadius = distanceKm! <= c.interventionRadiusKm;
        }
        if (!inRadius) {
          // La visio reste proposée quel que soit le rayon (sauf si « présentiel » est demandé)
          if (offersOnline && f.mode === 'any' && !f.formats.some((x) => IN_PERSON.includes(x))) remoteOnly = true;
          else continue;
        }
      }
      out.push({ coach: c, distanceKm, remoteOnly });
    }
    out.sort((a, b) => {
      if (a.remoteOnly !== b.remoteOnly) return a.remoteOnly ? 1 : -1;
      if (f.sortBy === 'distance' && a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
      if (f.sortBy === 'price') return minPrice(a.coach) - minPrice(b.coach);
      if (f.sortBy === 'rating') return b.coach.rating - a.coach.rating;
      if (f.center && a.distanceKm !== null && b.distanceKm !== null && Math.abs(a.distanceKm - b.distanceKm) > 2) return a.distanceKm - b.distanceKm;
      if (isVerifiedCoach(a.coach) !== isVerifiedCoach(b.coach)) return isVerifiedCoach(a.coach) ? -1 : 1;
      const popA = !!signals.get(a.coach.id)?.popular;
      const popB = !!signals.get(b.coach.id)?.popular;
      if (f.sortBy === 'relevance' && popA !== popB) return popA ? -1 : 1;
      return b.coach.rating - a.coach.rating;
    });
    return out;
  }, [coaches, categories, searchQuery, selectedCategory, f, freeSlotsByCoach, signals]);

  const activeCount =
    (f.maxPrice !== null ? 1 : 0) +
    (f.minRating > 0 ? 1 : 0) +
    (f.onlyVerified ? 1 : 0) +
    (f.objective ? 1 : 0) +
    (f.pathology ? 1 : 0) +
    (f.level ? 1 : 0) +
    (f.mode !== 'any' ? 1 : 0) +
    f.formats.length +
    (f.availabilityDays ? 1 : 0);

  const resetAll = () => {
    setSearchFilters({ ...DEFAULT_SEARCH_FILTERS, viewMode: f.viewMode });
    setSelectedCategory(null);
    setSearchQuery('');
    setPlaceText('');
    setGeoState('idle');
  };

  const nearCount = rows.filter((r) => !r.remoteOnly).length;
  const remoteCount = rows.length - nearCount;

  // Prochain créneau libre de chaque coach dans les 7 jours : badge « Dispo … » (affiché seulement si c'est vrai)
  const availabilityByCoach = useMemo(() => {
    const now = new Date();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const today = iso(now);
    const tomorrow = iso(new Date(now.getTime() + 86_400_000));
    const limit = iso(new Date(now.getTime() + 7 * 86_400_000));
    const first = new Map<string, string>();
    for (const s of availabilities) {
      if (s.isBooked || s.date < today || s.date > limit) continue;
      if (new Date(`${s.date}T${s.startTime}:00`).getTime() < now.getTime()) continue;
      const prev = first.get(s.coachId);
      if (!prev || s.date < prev) first.set(s.coachId, s.date);
    }
    const labels = new Map<string, string>();
    first.forEach((d, id) => labels.set(id, d === today ? "Dispo aujourd'hui" : d === tomorrow ? 'Dispo demain' : 'Dispo cette semaine'));
    return labels;
  }, [availabilities]);

  // « Recommandés pour vous » : seulement sans recherche ni filtre, les 3 profils les plus sûrs et les mieux notés
  const recommended = useMemo(() => {
    if (searchQuery.trim() || selectedCategory || activeCount > 0) return [];
    const score = (r: Row) =>
      (isVerifiedCoach(r.coach) ? 2 : 0) + r.coach.rating * Math.log10(10 + r.coach.reviewCount) + (availabilityByCoach.has(r.coach.id) ? 1 : 0) + (signals.get(r.coach.id)?.popular ? 1 : 0);
    const pool = rows.filter((r) => !r.remoteOnly);
    return pool.length >= 4 ? [...pool].sort((a, b) => score(b) - score(a)).slice(0, 3) : [];
  }, [rows, searchQuery, selectedCategory, activeCount, availabilityByCoach, signals]);
  const [showWhy, setShowWhy] = useState(false);

  const SORT_LABELS: Record<SearchFilters['sortBy'], string> = {
    relevance: 'Pertinence',
    distance: 'Distance',
    price: 'Prix croissant',
    rating: 'Mieux notés',
  };

  // Puces : un filtre actif passe en foncé, avec une croix pour l'enlever en un geste
  const quickChips: { key: string; label: string; active: boolean; toggle: () => void }[] = [
    { key: 'week', label: 'Dispo cette semaine', active: f.availabilityDays === 7, toggle: () => set({ availabilityDays: f.availabilityDays === 7 ? 0 : 7 }) },
    { key: 'online', label: 'Visio', active: f.mode === 'online', toggle: () => set({ mode: f.mode === 'online' ? 'any' : 'online' }) },
    { key: 'in_person', label: 'Présentiel', active: f.mode === 'in_person', toggle: () => set({ mode: f.mode === 'in_person' ? 'any' : 'in_person' }) },
    ...categories.map((cat) => ({
      key: cat.id,
      label: cat.name,
      active: selectedCategory === cat.slug,
      toggle: () => setSelectedCategory(selectedCategory === cat.slug ? null : cat.slug),
    })),
  ];

  const countLabel =
    rows.length === 0
      ? 'Aucun coach'
      : f.center && f.mode !== 'online'
      ? `${nearCount} à moins de ${f.radiusKm} km${remoteCount ? ` · ${remoteCount} en visio` : ''}`
      : `${rows.length} coach${rows.length > 1 ? 's' : ''}`;

  return (
    <div className="min-h-screen bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 pb-36 max-w-md mx-auto">
      {/* ===== En-tête collant : titre, recherche, lieu, puces. Reste visible au défilement. ===== */}
      <div className="fmc-header-glass sticky top-0 z-20">
        <header className="h-14 px-2 flex items-center justify-between">
          <button type="button" onClick={goBack} aria-label="Retour" className="apple-press w-11 h-11 rounded-full flex items-center justify-center cursor-pointer">
            <ChevronLeft className="w-6 h-6" strokeWidth={2.2} />
          </button>
          <h1 className="text-[17px] font-bold">Trouvez votre coach</h1>
          <button
            type="button"
            id="btn-toggle-filters"
            onClick={() => setShowFilters(true)}
            aria-label={activeCount > 0 ? `Tous les filtres, ${activeCount} actif${activeCount > 1 ? 's' : ''}` : 'Tous les filtres'}
            className="apple-press relative w-11 h-11 rounded-full flex items-center justify-center cursor-pointer"
          >
            <SlidersHorizontal className="w-6 h-6" />
            {activeCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-fmc-green ring-2 ring-fmc-bg dark:ring-[#0B0F19]" />}
          </button>
        </header>

        <div className="px-4 pb-3 space-y-2">
          {/* Nom, discipline, objectif — avec des exemples qui défilent quand le champ est vide */}
          <label className="relative block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" aria-hidden="true" />
            <input
              id="input-coach-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Rechercher un coach : nom, discipline ou objectif"
              autoComplete="off"
              className="w-full h-12 pl-11 pr-11 rounded-2xl bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-800 shadow-sm text-[15px] focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
            />
            {!searchQuery && (
              <span aria-hidden="true" className="absolute left-11 right-11 top-1/2 -translate-y-1/2 text-[15px] text-slate-500 pointer-events-none truncate">
                <span className="fmc-rotation">
                  <span>Yoga à Lyon</span>
                  <span>Coach sportif pour débutants</span>
                  <span>Préparation marathon</span>
                </span>
              </span>
            )}
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} aria-label="Effacer la recherche" className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            )}
          </label>

          {/* Lieu : ville / code postal ou « Autour de moi » */}
          <div className="relative">
            <div className="flex gap-2">
              <label className="relative flex-1">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" aria-hidden="true" />
                <input
                  ref={placeInputRef}
                  id="input-place-search"
                  type="search"
                  inputMode="search"
                  autoComplete="off"
                  value={f.centerSource === 'gps' ? 'Autour de moi' : placeText}
                  onFocus={() => f.centerSource === 'gps' && clearPlace()}
                  onChange={(e) => setPlaceText(e.target.value)}
                  placeholder="Ville ou code postal"
                  aria-label="Ville ou code postal"
                  className="w-full h-11 pl-11 pr-10 rounded-2xl bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-800 text-[15px] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
                />
                {(placeText || f.center) && (
                  <button type="button" onClick={clearPlace} aria-label="Effacer le lieu" className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 cursor-pointer">
                    {placesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-5 h-5" />}
                  </button>
                )}
              </label>
              <button
                type="button"
                onClick={locateMe}
                disabled={geoState === 'locating'}
                aria-pressed={f.centerSource === 'gps'}
                aria-label="Autour de moi"
                title="Autour de moi"
                className={`apple-press w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer ${
                  f.centerSource === 'gps' ? 'bg-fmc-navy text-white dark:bg-white dark:text-fmc-navy' : 'bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-800 text-[#007A3D] dark:text-fmc-green'
                }`}
              >
                {geoState === 'locating' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
              </button>
            </div>

            {places.length > 0 && (
              <ul className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-fmc-line dark:border-slate-800 overflow-hidden">
                {places.map((p) => (
                  <li key={`${p.label}-${p.latitude}`}>
                    <button type="button" onClick={() => choosePlace(p)} className="w-full min-h-12 px-4 text-left text-[15px] active:bg-fmc-bg dark:active:bg-slate-800 flex items-center gap-2 cursor-pointer">
                      <MapPin className="w-4 h-4 text-[#007A3D] dark:text-fmc-green shrink-0" /> {p.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Puces de filtre, défilement horizontal */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-2" role="group" aria-label="Filtres rapides">
          {quickChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.toggle}
              aria-pressed={c.active}
              className="apple-press h-11 shrink-0 flex items-center cursor-pointer"
            >
              <span
                className={`h-9 px-3.5 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${
                  c.active ? 'bg-fmc-navy text-white dark:bg-white dark:text-fmc-navy' : 'bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-800'
                }`}
              >
                {c.label}
                {c.active && <X className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />}
              </span>
            </button>
          ))}
          <button type="button" onClick={() => setShowFilters(true)} className="apple-press h-11 shrink-0 flex items-center cursor-pointer">
            <span className="h-9 px-3.5 rounded-full bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-800 text-[13px] font-semibold inline-flex items-center whitespace-nowrap">
              Tous les filtres
            </span>
          </button>
        </div>
        <div className="h-px bg-fmc-line dark:bg-slate-800" />
      </div>

      <div className="px-4">
        {placesError && <p className="text-sm text-slate-500 mt-3">{placesError}</p>}
        {geoState === 'denied' && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-sm text-amber-800 dark:text-amber-200">
            Localisation refusée. Saisissez une ville ou un code postal, ou autorisez la position dans les réglages du téléphone.
            <button onClick={() => placeInputRef.current?.focus()} className="block mt-2 font-semibold underline cursor-pointer">Saisir une ville</button>
          </div>
        )}
        {(geoState === 'unavailable' || geoState === 'unsupported') && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-sm text-amber-800 dark:text-amber-200">
            {geoState === 'unsupported' ? 'La localisation n’est pas disponible sur cet appareil.' : 'Position introuvable pour le moment.'} Saisissez une ville ou un code postal.
            {geoState === 'unavailable' && (
              <button onClick={locateMe} className="block mt-2 font-semibold underline cursor-pointer">Réessayer</button>
            )}
          </div>
        )}

        {/* Rayon autour du lieu choisi */}
        {f.center && f.mode !== 'online' && (
          <div className="flex items-center justify-between mt-3 text-sm gap-2">
            <span className="text-slate-500 font-medium">Rayon</span>
            <div className="flex gap-1.5" role="radiogroup" aria-label="Rayon de recherche">
              {RADIUS_OPTIONS.map((km) => (
                <button
                  key={km}
                  role="radio"
                  aria-checked={f.radiusKm === km}
                  onClick={() => set({ radiusKm: km })}
                  className={`apple-press h-11 min-w-12 px-3 rounded-full text-sm font-semibold cursor-pointer ${
                    f.radiusKm === km ? 'bg-fmc-navy text-white dark:bg-white dark:text-fmc-navy' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-fmc-line dark:border-slate-800'
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== Recommandés pour vous : carrousel sur fond vert voile ===== */}
      {recommended.length > 0 && f.viewMode === 'list' && (
        <section className="mt-4 bg-[#F2FDF6] dark:bg-fmc-green/5 py-4 border-y border-[#E6FBEF] dark:border-fmc-green/10" aria-labelledby="reco-titre">
          <div className="px-4 flex items-baseline justify-between">
            <h2 id="reco-titre" className="text-[17px] font-bold">Recommandés pour vous</h2>
            <button type="button" onClick={() => setShowWhy((v) => !v)} aria-expanded={showWhy} className="h-11 -my-3 px-1 text-[13px] font-semibold text-[#007A3D] dark:text-fmc-green cursor-pointer">
              Pourquoi ?
            </button>
          </div>
          {showWhy && (
            <p className="px-4 mt-1 text-[13px] text-slate-600 dark:text-slate-300">
              Profils vérifiés d'abord, puis la note et le nombre d'avis, les coachs qui ont un créneau libre cette semaine et ceux qui sont les plus réservés en ce moment.
            </p>
          )}
          <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar px-4 snap-x snap-mandatory">
            {recommended.map((r) => (
              <RecommendedCard
                key={r.coach.id}
                coach={r.coach}
                distanceKm={r.distanceKm}
                availability={availabilityByCoach.get(r.coach.id)}
                fromPrice={minPrice(r.coach)}
              />
            ))}
          </div>
        </section>
      )}

      <div className="px-4">
        {/* Compteur + tri (menu natif) + liste / carte */}
        <div className="mt-4 mb-2 flex items-center justify-between gap-2">
          <p className="text-[13px] min-w-0" aria-live="polite">
            <b className="tabular-nums">{countLabel}</b>
            {rows.length > 0 && f.centerLabel && f.mode !== 'online' && (
              <span className="text-slate-500"> · {f.centerSource === 'gps' ? 'autour de vous' : f.centerLabel}</span>
            )}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <label className="apple-press relative h-11 px-2 inline-flex items-center gap-1 text-[13px] font-semibold cursor-pointer">
              <ArrowUpDown className="w-4 h-4" aria-hidden="true" />
              {SORT_LABELS[f.sortBy]}
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
              <select
                value={f.sortBy}
                onChange={(e) => set({ sortBy: e.target.value as SearchFilters['sortBy'] })}
                aria-label={`Trier par : ${SORT_LABELS[f.sortBy]}`}
                className="absolute inset-0 opacity-0 cursor-pointer"
              >
                {(Object.keys(SORT_LABELS) as SearchFilters['sortBy'][]).map((s) => (
                  <option key={s} value={s} disabled={s === 'distance' && !f.center}>
                    {SORT_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex bg-white dark:bg-slate-900 rounded-full p-0.5 border border-fmc-line dark:border-slate-800" role="group" aria-label="Affichage">
              <button onClick={() => set({ viewMode: 'list' })} aria-label="Liste" aria-pressed={f.viewMode === 'list'} className={`w-10 h-9 rounded-full flex items-center justify-center cursor-pointer ${f.viewMode === 'list' ? 'bg-fmc-navy text-white dark:bg-white dark:text-fmc-navy' : 'text-slate-500'}`}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => set({ viewMode: 'map' })} aria-label="Carte" aria-pressed={f.viewMode === 'map'} className={`w-10 h-9 rounded-full flex items-center justify-center cursor-pointer ${f.viewMode === 'map' ? 'bg-fmc-navy text-white dark:bg-white dark:text-fmc-navy' : 'text-slate-500'}`}>
                <MapIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {f.center && rows.some((r) => r.distanceKm !== null) && (
          <p className="text-[12px] text-slate-500 mb-3">Distances à vol d'oiseau. Les adresses exactes ne sont jamais affichées.</p>
        )}

        {rows.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-fmc-line/80 dark:border-slate-800 p-6 text-center">
            <p className="font-semibold">Aucun coach ne correspond</p>
            <p className="text-sm text-slate-500 mt-1">
              {f.center && f.mode === 'in_person' ? 'Élargissez le rayon ou essayez la visio.' : 'Retirez un filtre ou élargissez la zone.'}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {f.center && f.radiusKm < 50 && (
                <button onClick={() => set({ radiusKm: 50 })} className="apple-press min-h-11 px-4 rounded-full bg-fmc-green text-fmc-navy text-sm font-bold cursor-pointer">
                  Élargir à 50 km
                </button>
              )}
              {f.mode === 'in_person' && (
                <button onClick={() => set({ mode: 'online' })} className="apple-press min-h-11 px-4 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-bold cursor-pointer">
                  Voir les coachs en visio
                </button>
              )}
              <button onClick={resetAll} className="apple-press min-h-11 px-4 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-bold flex items-center gap-1.5 cursor-pointer">
                <RotateCcw className="w-4 h-4" /> Tout réinitialiser
              </button>
            </div>
          </div>
        ) : f.viewMode === 'map' ? (
          <div className="rounded-3xl overflow-hidden border border-fmc-line/80 dark:border-slate-800">
            <CoachMap
              coaches={rows.filter((r) => !r.remoteOnly).map((r) => r.coach)}
              userLocation={f.center}
              radiusKm={f.center && f.mode !== 'online' ? f.radiusKm : undefined}
              height="max(380px, calc(100dvh - 450px))"
              fromPrice={minPrice}
              availability={availabilityByCoach}
              onSearchThisArea={(center) =>
                set({ center: { latitude: center.lat, longitude: center.lng }, centerLabel: 'Zone de la carte', centerSource: 'city' })
              }
            />
            {remoteCount > 0 && (
              <button onClick={() => set({ viewMode: 'list' })} className="w-full min-h-11 text-sm font-semibold bg-white dark:bg-slate-900 cursor-pointer">
                + {remoteCount} coach{remoteCount > 1 ? 's' : ''} disponible{remoteCount > 1 ? 's' : ''} en visio (liste)
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r, i) => (
              <React.Fragment key={r.coach.id}>
                {r.remoteOnly && (i === 0 || !rows[i - 1].remoteOnly) && (
                  <h3 className="text-[13px] font-semibold text-slate-500 pt-2 flex items-center gap-1.5">
                    <Video className="w-4 h-4" /> Disponibles en visio, partout
                  </h3>
                )}
                <CoachCard
                  coach={r.coach}
                  userLocation={r.remoteOnly ? null : f.center}
                  availability={availabilityByCoach.get(r.coach.id)}
                  fromPrice={minPrice(r.coach)}
                  note={r.remoteOnly ? 'Hors rayon — séances en visio' : f.availabilityDays ? `${freeSlotsByCoach.get(r.coach.id)} créneau(x) libre(s)` : undefined}
                />
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* ===== Feuille « Tous les filtres » =====
           Monte depuis le bas avec un ressort sans rebond ; se ferme en la glissant vers le bas
           (la vitesse du geste compte : un petit coup sec suffit). */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center"
            onClick={() => setShowFilters(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.8 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 600) setShowFilters(false);
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Filtres"
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[28px] max-h-[90vh] flex flex-col"
            >
              <div className="pt-2 flex justify-center cursor-grab" aria-hidden="true">
                <span className="w-9 h-[5px] rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>
              <div className="h-14 px-2 flex items-center justify-between shrink-0">
                <button type="button" onClick={resetAll} className="h-11 px-3 text-[15px] font-semibold text-[#007A3D] dark:text-fmc-green cursor-pointer">
                  Effacer
                </button>
                <h2 className="text-[17px] font-bold">Filtres</h2>
                <button type="button" onClick={() => setShowFilters(false)} aria-label="Fermer" className="apple-press w-11 h-11 rounded-full flex items-center justify-center cursor-pointer">
                  <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <X className="w-4 h-4" strokeWidth={2.5} />
                  </span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-2" onPointerDownCapture={(e) => e.stopPropagation()}>
                <FilterGroup title="Disponibilité réelle">
                  {([0, 3, 7, 14] as const).map((d) => (
                    <Pill key={d} active={f.availabilityDays === d} onClick={() => set({ availabilityDays: d })}>
                      {d === 0 ? 'Peu importe' : d === 7 ? 'Cette semaine' : `Sous ${d} jours`}
                    </Pill>
                  ))}
                </FilterGroup>

                <FilterGroup title="Objectif">
                  {OBJECTIVE_OPTIONS.map((o) => (
                    <Pill key={o} active={f.objective === o} onClick={() => set({ objective: f.objective === o ? null : o })}>{o}</Pill>
                  ))}
                </FilterGroup>

                <FilterGroup title="Pathologie accompagnée">
                  {PATHOLOGY_OPTIONS.map((o) => (
                    <Pill key={o} active={f.pathology === o} onClick={() => set({ pathology: f.pathology === o ? null : o })}>{o}</Pill>
                  ))}
                </FilterGroup>

                <FilterGroup title="Niveau">
                  {(Object.keys(LEVEL_LABELS) as CoachLevel[]).map((l) => (
                    <Pill key={l} active={f.level === l} onClick={() => set({ level: f.level === l ? null : l })}>{LEVEL_LABELS[l]}</Pill>
                  ))}
                </FilterGroup>

                <FilterGroup title="Format">
                  {(['any', 'online', 'in_person'] as const).map((m) => (
                    <Pill key={m} active={f.mode === m} onClick={() => set({ mode: m })}>
                      {m === 'any' ? 'Tous' : m === 'online' ? 'Visio' : 'Présentiel'}
                    </Pill>
                  ))}
                </FilterGroup>
                {f.mode !== 'online' && (
                  <FilterGroup title="Lieu de la séance">
                    {IN_PERSON.map((fmt) => (
                      <Pill
                        key={fmt}
                        active={f.formats.includes(fmt)}
                        onClick={() => set({ formats: f.formats.includes(fmt) ? f.formats.filter((x) => x !== fmt) : [...f.formats, fmt] })}
                      >
                        {FORMAT_LABELS[fmt]}
                      </Pill>
                    ))}
                  </FilterGroup>
                )}

                <FilterGroup title="Budget par séance" value={f.maxPrice !== null ? `jusqu'à ${f.maxPrice} €` : undefined}>
                  {[30, 50, 70, 100].map((p) => (
                    <Pill key={p} active={f.maxPrice === p} onClick={() => set({ maxPrice: f.maxPrice === p ? null : p })}>≤ {p} €</Pill>
                  ))}
                </FilterGroup>

                <FilterGroup title="Avis">
                  <Pill active={f.minRating === 0} onClick={() => set({ minRating: 0 })}>Tous</Pill>
                  <Pill active={f.minRating === 4} onClick={() => set({ minRating: 4 })}>4,0 et +</Pill>
                  <Pill active={f.minRating === 4.5} onClick={() => set({ minRating: 4.5 })}>4,5 et +</Pill>
                </FilterGroup>

                <section className="mb-4">
                  <ToggleRow label="Coachs vérifiés uniquement" checked={f.onlyVerified} onChange={(v) => set({ onlyVerified: v })} />
                </section>
              </div>

              {/* Action principale : le nombre de résultats évite de valider « à l'aveugle » */}
              <div className="border-t border-fmc-line dark:border-slate-800 px-4 pt-3 pb-[calc(1rem+var(--sab))] shrink-0">
                <button type="button" onClick={() => setShowFilters(false)} className="apple-press w-full h-12 rounded-full bg-fmc-green text-fmc-navy text-[15px] font-bold tabular-nums cursor-pointer">
                  {rows.length === 0 ? 'Aucun coach' : `Afficher ${rows.length} coach${rows.length > 1 ? 's' : ''}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Carte « Recommandés pour vous » : grande photo, pour se démarquer de la liste. */
const RecommendedCard: React.FC<{ coach: CoachProfile; distanceKm: number | null; availability?: string; fromPrice: number }> = ({
  coach,
  distanceKm,
  availability,
  fromPrice,
}) => {
  const { navigateTo, selectCoachForBooking, isFavorite, toggleFavorite } = useApp();
  const favorite = isFavorite(coach.id);
  const popular = useCoachSignals().get(coach.id)?.popular;
  const open = () => {
    selectCoachForBooking(coach);
    navigateTo('coach_profile', { coachId: coach.id });
  };
  return (
    <article onClick={open} className="apple-press snap-start shrink-0 w-[270px] bg-white dark:bg-slate-900 rounded-3xl p-2 border border-fmc-line dark:border-slate-800 shadow-sm cursor-pointer">
      <div className="relative h-[150px] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
        <Avatar src={coach.coverPhoto || coach.photo} name={coach.name} className="w-full h-full text-4xl" />
        {popular ? (
          <PopularBadge className="absolute top-2.5 left-2.5" />
        ) : distanceKm !== null && distanceKm <= 5 && (
          <span className="absolute top-2.5 left-2.5 h-6 px-2.5 rounded-full bg-white/90 backdrop-blur-md text-fmc-navy text-[11px] font-semibold inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
            Près de chez vous
          </span>
        )}
        <button
          type="button"
          aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          aria-pressed={favorite}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(coach.id);
          }}
          className="apple-press absolute top-1 right-1 w-11 h-11 flex items-center justify-center cursor-pointer"
        >
          <span className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center">
            <Heart className={`w-4 h-4 ${favorite ? 'fill-rose-500 text-rose-500' : 'text-fmc-navy'}`} />
          </span>
        </button>
      </div>
      <div className="px-2 pt-3 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="text-base font-bold leading-5 truncate">{coach.name}</h3>
          {isVerifiedCoach(coach) && <VerifiedMark />}
        </div>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
          {[coach.category || coach.specialties?.[0], coach.city].filter(Boolean).join(' · ')} ·{' '}
          <span className="text-fmc-navy dark:text-white font-semibold tabular-nums">
            <Star className="w-3.5 h-3.5 inline -mt-0.5 fill-amber-400 text-amber-400" aria-hidden="true" /> {ratingLabel(coach)}
          </span>
          {coach.reviewCount > 0 && <span className="tabular-nums"> ({coach.reviewCount})</span>}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            dès <span className="text-[17px] font-bold text-fmc-navy dark:text-white tabular-nums">{fromPrice} €</span>/h
          </p>
          {availability && <AvailabilityBadge label={availability} />}
        </div>
      </div>
    </article>
  );
};

const FilterGroup: React.FC<{ title: string; value?: string; children: React.ReactNode }> = ({ title, value, children }) => (
  <section className="mb-6">
    <div className="flex items-baseline justify-between mb-2.5">
      <h3 className="text-[17px] font-bold">{title}</h3>
      {value && <span className="text-[13px] font-semibold tabular-nums">{value}</span>}
    </div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </section>
);

/** Choix d'une feuille de filtres : inactif = contour, actif = foncé (même code que les puces de l'écran). */
const Pill: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }> = ({ active, className = '', children, ...props }) => (
  <button
    type="button"
    {...props}
    aria-pressed={!!active}
    className={`apple-press min-h-11 px-3.5 rounded-full text-[13px] font-semibold border cursor-pointer disabled:opacity-40 ${
      active ? 'bg-fmc-navy border-fmc-navy text-white dark:bg-white dark:border-white dark:text-fmc-navy' : 'bg-white dark:bg-slate-900 border-fmc-line dark:border-slate-700'
    } ${className}`}
  >
    {children}
  </button>
);

/** Interrupteur au style iOS. */
const ToggleRow: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
  <label className="min-h-12 flex items-center justify-between gap-3 text-[15px] cursor-pointer">
    {label}
    <span className="relative shrink-0">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="block w-[51px] h-[31px] rounded-full bg-slate-200 dark:bg-slate-700 peer-checked:bg-fmc-green transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-fmc-green/50" />
      <span className="absolute left-[2px] top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
    </span>
  </label>
);
