import React, { useEffect, useRef, useState } from 'react';
import { ratingLabel } from '../../utils/coachTrust';
import { Avatar } from '../ui/Avatar';
import { AvailabilityBadge, PopularBadge, VerifiedMark } from './CoachCard';
import { isVerifiedCoach } from '../../utils/coachTrust';
import { createAppleEngine, createLeafletEngine, loadMapKit, type MapEngine } from '../../lib/mapEngines';
import { CoachProfile } from '../../types';
import { calculateDistanceKm, formatDistance } from '../../utils/geo';
import { Star, Crosshair, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCoachSignals } from '../../lib/coachSignals';
import { useApp } from '../../context/AppContext';

interface CoachMapProps {
  coaches: CoachProfile[];
  userLocation: { latitude: number; longitude: number } | null;
  selectedCoachId?: string | null;
  onSelectCoach?: (coach: CoachProfile) => void;
  onSearchThisArea?: (center: { lat: number; lng: number }, radiusKm: number) => void;
  className?: string;
  height?: string;
  /** Rayon de recherche affiché autour du point choisi (km) */
  radiusKm?: number;
  /** Prix le plus bas proposé par chaque coach (« dès … ») */
  fromPrice?: (coach: CoachProfile) => number;
  /** Badge de disponibilité réelle par coach (« Dispo demain »…) */
  availability?: Map<string, string>;
}

export const CoachMap: React.FC<CoachMapProps> = ({
  coaches,
  userLocation,
  selectedCoachId,
  onSelectCoach,
  onSearchThisArea,
  className = '',
  height = 'calc(100vh - 240px)',
  radiusKm,
  fromPrice = (c) => c.hourlyRate,
  availability,
}) => {
  const { navigateTo, selectCoachForBooking } = useApp();
  const signals = useCoachSignals();
  const railRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // Apple Plans si disponible, sinon OpenStreetMap (voir src/lib/mapEngines.ts)
  const [engine, setEngine] = useState<MapEngine | null>(null);
  const userPoint = userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null;

  const [activeCoach, setActiveCoach] = useState<CoachProfile | null>(() => {
    if (selectedCoachId) {
      return coaches.find((c) => c.id === selectedCoachId) || null;
    }
    return null;
  });

  const [showSearchAreaBtn, setShowSearchAreaBtn] = useState(false);
  const [mapCenterState, setMapCenterState] = useState<{ lat: number; lng: number } | null>(null);

  // Création de la carte : on tente Apple Plans, et on bascule sur OpenStreetMap au moindre échec
  useEffect(() => {
    let alive = true;
    let created: MapEngine | null = null;
    const start = (factory: typeof createAppleEngine) => {
      if (!alive || !mapContainerRef.current) return;
      created = factory(mapContainerRef.current, {
        center: userPoint ?? { lat: 48.8566, lng: 2.3522 }, // Paris par défaut
        hasUser: !!userPoint,
        onMoveEnd: (center) => {
          setMapCenterState(center);
          setShowSearchAreaBtn(true);
        },
      });
      setEngine(created);
    };
    loadMapKit().then(
      () => {
        try { start(createAppleEngine); } catch (err) {
          console.warn('Apple Plans indisponible, carte de secours', err);
          if (mapContainerRef.current) mapContainerRef.current.innerHTML = '';
          start(createLeafletEngine);
        }
      },
      () => start(createLeafletEngine),
    );
    return () => {
      alive = false;
      created?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Position de l'utilisateur et rayon de recherche
  useEffect(() => {
    engine?.setUser(userPoint);
    engine?.setCircle(userPoint, radiusKm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, userLocation?.latitude, userLocation?.longitude, radiusKm]);

  const located = coaches.filter((c) => c.latitude && c.longitude);

  const selectCoach = (coach: CoachProfile, pan: boolean) => {
    setActiveCoach(coach);
    if (onSelectCoach) onSelectCoach(coach);
    // Décalé vers le haut : le repère reste visible au-dessus du carrousel
    if (pan) engine?.panTo({ lat: coach.latitude, lng: coach.longitude }, 70);
  };

  // Repères : « dès 65 € », point vert si dispo dans les 2 jours, flèche ambre si populaire cette semaine
  useEffect(() => {
    if (!engine) return;
    engine.setPins(
      located.map((coach) => {
        const isSelected = activeCoach?.id === coach.id;
        const soon = /aujourd|demain/.test(availability?.get(coach.id) ?? '');
        const popular = signals.get(coach.id)?.popular;
        return {
          id: coach.id,
          lat: coach.latitude,
          lng: coach.longitude,
          selected: isSelected,
          html: `
        <div style="position:relative;width:0;height:0">
          <div class="absolute left-0 bottom-0 -translate-x-1/2 flex flex-col items-center cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-110' : ''}" style="z-index:${isSelected ? 50 : 1}">
            <div class="relative flex items-center gap-1 h-8 pl-2.5 pr-3 rounded-full shadow-md whitespace-nowrap text-[12px] font-bold tabular-nums border ${
              isSelected ? 'bg-[#00D664] text-[#0F172A] border-[#00B050]' : 'bg-white text-[#0F172A] border-black/10'
            }">
              ${popular ? `<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${isSelected ? '#0F172A' : '#B45309'}" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>` : ''}
              <span class="font-medium ${isSelected ? 'text-[#0F172A]/70' : 'text-slate-500'}">dès</span>
              <span>${fromPrice(coach)} €</span>
              ${soon ? `<span class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${isSelected ? 'bg-white border-[#00B050]' : 'bg-[#00D664] border-white'}"></span>` : ''}
            </div>
            <div class="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent ${isSelected ? 'border-t-[#00D664]' : 'border-t-white'}"></div>
          </div>
        </div>`,
        };
      }),
      (id) => {
        const coach = coaches.find((c) => c.id === id);
        if (!coach) return;
        selectCoach(coach, true);
        // Le carrousel suit le repère touché
        const card = railRef.current?.querySelector<HTMLElement>(`[data-coach-id="${id}"]`);
        card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      },
    );

    // Cadre tous les coachs (et l'utilisateur) tant qu'aucun coach n'est sélectionné
    if (located.length > 0 && !activeCoach) {
      engine.fit([...located.map((c) => ({ lat: c.latitude, lng: c.longitude })), ...(userPoint ? [userPoint] : [])]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, coaches, activeCoach, signals, availability]);

  // Carrousel : la carte arrêtée au centre sélectionne son coach et recentre la carte
  const settleTimer = useRef<number | undefined>(undefined);
  const onRailScroll = () => {
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      const rail = railRef.current;
      if (!rail) return;
      const mid = rail.getBoundingClientRect().left + rail.clientWidth / 2;
      let best: HTMLElement | null = null;
      let bestDist = Infinity;
      rail.querySelectorAll<HTMLElement>('[data-coach-id]').forEach((el) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestDist) { bestDist = d; best = el; }
      });
      const id = (best as HTMLElement | null)?.dataset.coachId;
      const coach = id ? located.find((c) => c.id === id) : undefined;
      if (coach && coach.id !== activeCoach?.id) selectCoach(coach, true);
    }, 120);
  };

  const handleRecenterUser = () => {
    if (engine && userPoint) engine.flyTo(userPoint);
  };

  const handleSearchThisAreaClick = () => {
    if (!engine) return;
    setShowSearchAreaBtn(false);
    if (onSearchThisArea) onSearchThisArea(engine.center(), Math.max(2, Math.round(engine.radiusKm())));
  };

  const control = 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-fmc-navy dark:text-white shadow-md border border-black/5 dark:border-white/10';

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-10 bg-slate-100 dark:bg-slate-800" />

      {/* Rechercher dans la zone affichée */}
      <AnimatePresence>
        {showSearchAreaBtn && onSearchThisArea && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-20"
          >
            <button
              type="button"
              onClick={handleSearchThisAreaClick}
              className={`apple-press h-11 px-4 rounded-full text-[13px] font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${control}`}
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              Rechercher dans cette zone
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ma position, zoom */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        {userLocation && (
          <button type="button" onClick={handleRecenterUser} aria-label="Revenir à ma position" className={`apple-press w-11 h-11 rounded-full flex items-center justify-center cursor-pointer ${control}`}>
            <Crosshair className="w-4 h-4" />
          </button>
        )}
        <div className={`flex flex-col rounded-full overflow-hidden ${control}`}>
          <button type="button" onClick={() => engine?.zoom(1)} aria-label="Zoomer" className="w-11 h-11 flex items-center justify-center text-lg font-semibold cursor-pointer">+</button>
          <div className="h-px mx-2.5 bg-black/10 dark:bg-white/10" />
          <button type="button" onClick={() => engine?.zoom(-1)} aria-label="Dézoomer" className="w-11 h-11 flex items-center justify-center text-lg font-semibold cursor-pointer">−</button>
        </div>
      </div>

      {/* Carrousel des coachs, synchronisé avec les repères */}
      {located.length > 0 && (
        <div
          ref={railRef}
          onScroll={onRailScroll}
          aria-label="Coachs sur la carte"
          className="absolute bottom-3 inset-x-0 z-20 flex gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory px-6 scroll-px-6"
        >
          {located.map((coach) => (
            <MapCoachCard
              key={coach.id}
              coach={coach}
              active={activeCoach?.id === coach.id}
              fromPrice={fromPrice(coach)}
              availability={availability?.get(coach.id)}
              popular={!!signals.get(coach.id)?.popular}
              distanceKm={userLocation ? calculateDistanceKm(userLocation.latitude, userLocation.longitude, coach.latitude, coach.longitude) : null}
              onOpen={() => {
                selectCoachForBooking(coach);
                navigateTo('coach_profile', { coachId: coach.id });
              }}
              onBook={() => {
                selectCoachForBooking(coach);
                navigateTo('booking_calendar', { coachId: coach.id });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/** Carte compacte du carrousel (même style que la liste : photo, nom, note, badges, prix). */
const MapCoachCard: React.FC<{
  coach: CoachProfile;
  active: boolean;
  fromPrice: number;
  availability?: string;
  popular: boolean;
  distanceKm: number | null;
  onOpen: () => void;
  onBook: () => void;
}> = ({ coach, active, fromPrice, availability, popular, distanceKm, onOpen, onBook }) => (
  <article
    data-coach-id={coach.id}
    onClick={onOpen}
    className={`apple-press snap-center shrink-0 w-[calc(100%-24px)] max-w-[340px] bg-white dark:bg-slate-900 rounded-3xl p-3 shadow-xl cursor-pointer border transition-colors ${
      active ? 'border-fmc-green' : 'border-black/5 dark:border-white/10'
    }`}
  >
    <div className="flex gap-3">
      <Avatar src={coach.photo} name={coach.name} className="w-16 h-16 rounded-2xl bg-slate-100 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="text-[15px] font-bold leading-5 truncate">{coach.name}</h3>
          {isVerifiedCoach(coach) && <VerifiedMark />}
        </div>
        <p className="text-[13px] leading-[18px] text-slate-500 dark:text-slate-400 truncate tabular-nums">
          <Star className="w-3.5 h-3.5 inline -mt-0.5 fill-amber-400 text-amber-400" aria-hidden="true" />{' '}
          <b className="text-fmc-navy dark:text-white">{ratingLabel(coach)}</b>
          {coach.reviewCount > 0 && <> ({coach.reviewCount})</>}
          {coach.city && <> · {coach.city}</>}
          {distanceKm !== null && <> · {distanceKm < 1 ? 'moins de 1 km' : `≈ ${formatDistance(distanceKm)}`}</>}
        </p>
        {(popular || availability) && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {popular && <PopularBadge />}
            {availability && <AvailabilityBadge label={availability} />}
          </div>
        )}
      </div>
    </div>
    <div className="flex items-center justify-between gap-2 mt-2.5">
      <p className="text-[13px] text-slate-500 dark:text-slate-400">
        dès <span className="text-[17px] font-bold text-fmc-navy dark:text-white tabular-nums">{fromPrice} €</span>/h
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onBook();
        }}
        className="apple-press h-11 px-4 rounded-full bg-fmc-green text-fmc-navy text-[13px] font-bold whitespace-nowrap cursor-pointer"
      >
        Réserver
      </button>
    </div>
  </article>
);
