import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  Crosshair,
  List,
  Loader2,
  Map as MapIcon,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Video,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Chip, IconButton, ScreenHeader, SearchField } from '../ui/fmc';
import { CoachCard } from '../common/CoachCard';
import { CoachMap } from '../common/CoachMap';
import type { CoachProfile, CoachingFormat, CoachLevel } from '../../types';
import { calculateDistanceKm, searchPlaces, type PlaceResult } from '../../utils/geo';
import {
  DEFAULT_SEARCH_FILTERS,
  LEVEL_LABELS,
  OBJECTIVE_OPTIONS,
  RADIUS_OPTIONS,
  type SearchFilters,
} from '../../utils/searchFilters';
import { isBookableCoach, isVerifiedCoach } from '../../utils/coachTrust';

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
        const hay = [c.name, c.title, c.category, c.city, ...(c.specialties ?? []), ...(c.objectives ?? [])].join(' ').toLowerCase();
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
      return b.coach.rating - a.coach.rating;
    });
    return out;
  }, [coaches, categories, searchQuery, selectedCategory, f, freeSlotsByCoach]);

  const activeCount =
    (f.maxPrice !== null ? 1 : 0) +
    (f.minRating > 0 ? 1 : 0) +
    (f.onlyVerified ? 1 : 0) +
    (f.objective ? 1 : 0) +
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

  return (
    <div className="min-h-screen bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 pb-36 max-w-md mx-auto px-5 pt-4">
      <ScreenHeader
        title="Trouvez votre coach"
        onBack={goBack}
        right={
          <IconButton id="btn-toggle-filters" onClick={() => setShowFilters(true)} aria-label="Filtres" className="relative">
            <SlidersHorizontal className="w-5 h-5" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-fmc-green text-fmc-navy text-[11px] font-bold rounded-full flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </IconButton>
        }
      />

      {/* Nom / spécialité */}
      <div className="relative mb-3">
        <SearchField
          id="input-coach-search"
          icon={<Search className="w-5 h-5" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Nom, discipline, objectif…"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} aria-label="Effacer" className="absolute inset-y-0 right-1 w-11 flex items-center justify-center text-slate-400 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Lieu : ville / code postal ou « Autour de moi » */}
      <div className="relative mb-3">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400 pointer-events-none">
              <MapPin className="w-5 h-5" />
            </span>
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
              className="w-full h-12 pl-10 pr-9 bg-white dark:bg-slate-900 rounded-2xl text-sm placeholder:text-slate-400 shadow-[0_1px_3px_rgba(15,23,42,0.05)] focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
            />
            {(placeText || f.center) && (
              <button onClick={clearPlace} aria-label="Effacer le lieu" className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 cursor-pointer">
                {placesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-5 h-5" />}
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={locateMe}
            disabled={geoState === 'locating'}
            className={`h-12 px-2.5 rounded-2xl text-[13px] font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition ${
              f.centerSource === 'gps' ? 'bg-fmc-green text-fmc-navy' : 'bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-800'
            }`}
          >
            {geoState === 'locating' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
            Autour de moi
          </button>
        </div>

        {places.length > 0 && (
          <ul className="absolute z-30 left-0 right-0 mt-1 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-fmc-line dark:border-slate-800 overflow-hidden">
            {places.map((p) => (
              <li key={`${p.label}-${p.latitude}`}>
                <button type="button" onClick={() => choosePlace(p)} className="w-full min-h-12 px-4 text-left text-[15px] hover:bg-fmc-bg dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer">
                  <MapPin className="w-4 h-4 text-fmc-green-ink shrink-0" /> {p.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {placesError && <p className="text-sm text-slate-500 mb-3">{placesError}</p>}
      {geoState === 'denied' && (
        <div className="mb-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-sm text-amber-800 dark:text-amber-200">
          Localisation refusée. Saisissez une ville ou un code postal, ou autorisez la position dans les réglages du téléphone.
          <button onClick={() => placeInputRef.current?.focus()} className="block mt-2 font-semibold underline cursor-pointer">Saisir une ville</button>
        </div>
      )}
      {(geoState === 'unavailable' || geoState === 'unsupported') && (
        <div className="mb-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-sm text-amber-800 dark:text-amber-200">
          {geoState === 'unsupported' ? 'La localisation n’est pas disponible sur cet appareil.' : 'Position introuvable pour le moment.'} Saisissez une ville ou un code postal.
          {geoState === 'unavailable' && (
            <button onClick={locateMe} className="block mt-2 font-semibold underline cursor-pointer">Réessayer</button>
          )}
        </div>
      )}

      {/* Rayon */}
      {f.center && f.mode !== 'online' && (
        <div className="flex items-center justify-between mb-3 text-sm gap-2">
          <span className="text-slate-500 font-medium">Rayon</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Rayon de recherche">
            {RADIUS_OPTIONS.map((km) => (
              <button
                key={km}
                role="radio"
                aria-checked={f.radiusKm === km}
                onClick={() => set({ radiusKm: km })}
                className={`h-11 min-w-12 px-3 rounded-full text-sm font-semibold transition cursor-pointer ${
                  f.radiusKm === km ? 'bg-fmc-navy text-white dark:bg-white dark:text-fmc-navy' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-fmc-line dark:border-slate-800'
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtres rapides */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1 mb-4">
        <Chip active={f.mode === 'online'} icon={<Video className="w-4 h-4" />} onClick={() => set({ mode: f.mode === 'online' ? 'any' : 'online' })}>
          Visio
        </Chip>
        <Chip active={f.mode === 'in_person'} icon={<MapPin className="w-4 h-4" />} onClick={() => set({ mode: f.mode === 'in_person' ? 'any' : 'in_person' })}>
          Présentiel
        </Chip>
        <Chip active={f.availabilityDays === 7} icon={<Calendar className="w-4 h-4" />} onClick={() => set({ availabilityDays: f.availabilityDays === 7 ? 0 : 7 })}>
          Dispo cette semaine
        </Chip>
        {categories.map((cat) => (
          <Chip key={cat.id} active={selectedCategory === cat.slug} onClick={() => setSelectedCategory(selectedCategory === cat.slug ? null : cat.slug)}>
            {cat.name}
          </Chip>
        ))}
      </div>

      {/* Résultats + vue */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-sm text-slate-500" aria-live="polite">
          {rows.length === 0
            ? 'Aucun coach'
            : f.center && f.mode !== 'online'
            ? `${nearCount} à moins de ${f.radiusKm} km${remoteCount ? ` · ${remoteCount} en visio` : ''}`
            : `${rows.length} coach${rows.length > 1 ? 's' : ''}`}
        </p>
        <div className="flex bg-white dark:bg-slate-900 rounded-full p-1 border border-fmc-line dark:border-slate-800">
          <button onClick={() => set({ viewMode: 'list' })} aria-label="Liste" className={`w-11 h-9 rounded-full flex items-center justify-center cursor-pointer ${f.viewMode === 'list' ? 'bg-fmc-green text-fmc-navy' : 'text-slate-500'}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => set({ viewMode: 'map' })} aria-label="Carte" className={`w-11 h-9 rounded-full flex items-center justify-center cursor-pointer ${f.viewMode === 'map' ? 'bg-fmc-green text-fmc-navy' : 'text-slate-500'}`}>
            <MapIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      {f.center && rows.some((r) => r.distanceKm !== null) && (
        <p className="text-xs text-slate-400 mb-3">Distances estimées à vol d'oiseau depuis {f.centerSource === 'gps' ? 'votre position' : f.centerLabel}. Les adresses exactes ne sont jamais affichées.</p>
      )}

      {rows.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-fmc-line/80 dark:border-slate-800 p-6 text-center">
          <p className="font-semibold">Aucun coach ne correspond</p>
          <p className="text-sm text-slate-500 mt-1">
            {f.center && f.mode === 'in_person' ? 'Élargissez le rayon ou essayez la visio.' : 'Retirez un filtre ou élargissez la zone.'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {f.center && f.radiusKm < 50 && (
              <button onClick={() => set({ radiusKm: 50 })} className="min-h-11 px-4 rounded-full bg-fmc-green text-fmc-navy text-sm font-bold cursor-pointer">
                Élargir à 50 km
              </button>
            )}
            {f.mode === 'in_person' && (
              <button onClick={() => set({ mode: 'online' })} className="min-h-11 px-4 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-bold cursor-pointer">
                Voir les coachs en visio
              </button>
            )}
            <button onClick={resetAll} className="min-h-11 px-4 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-bold flex items-center gap-1.5 cursor-pointer">
              <RotateCcw className="w-4 h-4" /> Tout réinitialiser
            </button>
          </div>
        </div>
      ) : f.viewMode === 'map' ? (
        <div className="rounded-[28px] overflow-hidden border border-fmc-line/80 dark:border-slate-800">
          <CoachMap
            coaches={rows.filter((r) => !r.remoteOnly).map((r) => r.coach)}
            userLocation={f.center}
            radiusKm={f.center && f.mode !== 'online' ? f.radiusKm : undefined}
            height="calc(100vh - 360px)"
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
        <div className="space-y-4">
          {rows.map((r, i) => (
            <React.Fragment key={r.coach.id}>
              {r.remoteOnly && (i === 0 || !rows[i - 1].remoteOnly) && (
                <h3 className="text-sm font-semibold text-slate-500 pt-2 flex items-center gap-1.5">
                  <Video className="w-4 h-4" /> Disponibles en visio, partout
                </h3>
              )}
              <CoachCard
                coach={r.coach}
                userLocation={r.remoteOnly ? null : f.center}
                note={r.remoteOnly ? 'Hors rayon — séances en visio' : f.availabilityDays ? `${freeSlotsByCoach.get(r.coach.id)} créneau(x) libre(s)` : undefined}
              />
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Feuille de filtres */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setShowFilters(false)}>
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Filtres"
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[28px] px-5 pt-4 pb-[calc(1.25rem+var(--sab))] max-h-[88vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Filtres</h2>
                <button onClick={() => setShowFilters(false)} aria-label="Fermer" className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <FilterGroup title="Objectif">
                {OBJECTIVE_OPTIONS.map((o) => (
                  <Pill key={o} active={f.objective === o} onClick={() => set({ objective: f.objective === o ? null : o })}>{o}</Pill>
                ))}
              </FilterGroup>

              <FilterGroup title="Niveau">
                {(Object.keys(LEVEL_LABELS) as CoachLevel[]).map((l) => (
                  <Pill key={l} active={f.level === l} onClick={() => set({ level: f.level === l ? null : l })}>{LEVEL_LABELS[l]}</Pill>
                ))}
              </FilterGroup>

              <FilterGroup title="Mode de séance">
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

              <FilterGroup title={`Budget par séance${f.maxPrice !== null ? ` : jusqu'à ${f.maxPrice} €` : ''}`}>
                {[30, 50, 70, 100].map((p) => (
                  <Pill key={p} active={f.maxPrice === p} onClick={() => set({ maxPrice: f.maxPrice === p ? null : p })}>≤ {p} €</Pill>
                ))}
              </FilterGroup>

              <FilterGroup title="Disponibilité réelle">
                {([0, 3, 7, 14] as const).map((d) => (
                  <Pill key={d} active={f.availabilityDays === d} onClick={() => set({ availabilityDays: d })}>
                    {d === 0 ? 'Peu importe' : `Créneau libre sous ${d} j`}
                  </Pill>
                ))}
              </FilterGroup>

              <FilterGroup title="Confiance">
                <Pill active={f.onlyVerified} onClick={() => set({ onlyVerified: !f.onlyVerified })}>Profils vérifiés</Pill>
                <Pill active={f.minRating >= 4.5} onClick={() => set({ minRating: f.minRating >= 4.5 ? 0 : 4.5 })}>Note 4,5+</Pill>
              </FilterGroup>

              <FilterGroup title="Trier par">
                {(['relevance', 'distance', 'price', 'rating'] as const).map((s) => (
                  <Pill key={s} active={f.sortBy === s} disabled={s === 'distance' && !f.center} onClick={() => set({ sortBy: s })}>
                    {s === 'relevance' ? 'Pertinence' : s === 'distance' ? 'Distance' : s === 'price' ? 'Prix' : 'Note'}
                  </Pill>
                ))}
              </FilterGroup>

              <div className="flex gap-2 mt-2">
                <button onClick={resetAll} className="flex-1 min-h-12 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer">Réinitialiser</button>
                <button onClick={() => setShowFilters(false)} className="flex-1 min-h-12 rounded-full bg-fmc-green text-fmc-navy font-bold cursor-pointer">
                  Voir {rows.length} coach{rows.length > 1 ? 's' : ''}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FilterGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-5">
    <h3 className="text-sm font-semibold mb-2">{title}</h3>
    <div className="flex flex-wrap gap-2">{children}</div>
  </section>
);

const Pill: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }> = ({ active, className = '', children, ...props }) => (
  <button
    type="button"
    {...props}
    aria-pressed={!!active}
    className={`min-h-11 px-3.5 rounded-full text-sm font-semibold border transition cursor-pointer disabled:opacity-40 ${
      active ? 'bg-fmc-green border-fmc-green text-fmc-navy' : 'border-fmc-line dark:border-slate-700'
    } ${className}`}
  >
    {children}
  </button>
);
