import React from 'react';
import { ratingLabel } from '../../utils/coachTrust';
import { Avatar } from '../ui/Avatar';
import { isRealCoach, isVerifiedCoach } from '../../utils/coachTrust';
import { CoachProfile } from '../../types';
import { useApp } from '../../context/AppContext';
import { MapPin, ArrowRight, Calendar, Heart, Star, BadgeCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { calculateDistanceKm, formatDistance } from '../../utils/geo';

interface CoachCardProps {
  coach: CoachProfile;
  userLocation?: { latitude: number; longitude: number } | null;
  onBookDirect?: (coachId: string) => void;
  /** Mention affichée sous la localisation (ex. « Hors rayon — disponible en visio ») */
  note?: string;
  /** Badge de disponibilité, affiché seulement si c'est vrai (« Dispo demain »…) */
  availability?: string;
  /** Prix le plus bas proposé (tous formats confondus) */
  fromPrice?: number;
}

/** Badge « Coach vérifié », avec son explication pour les lecteurs d'écran et au survol. */
export const VerifiedMark: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <BadgeCheck role="img" aria-label="Coach vérifié : identité et diplômes contrôlés par Find My Coach" className={`${className} shrink-0 text-[#007A3D] dark:text-fmc-green`} strokeWidth={2.4}>
    <title>Coach vérifié : identité et diplômes contrôlés par Find My Coach</title>
  </BadgeCheck>
);

/** Badge vert « Dispo … ». */
export const AvailabilityBadge: React.FC<{ label: string }> = ({ label }) => (
  <span className="h-6 px-2.5 rounded-full bg-[#E6FBEF] dark:bg-fmc-green/15 text-[#007A3D] dark:text-fmc-green text-[11px] font-semibold inline-flex items-center gap-1 whitespace-nowrap">
    <span className="w-1.5 h-1.5 rounded-full bg-fmc-green" aria-hidden="true" />
    {label}
  </span>
);

/**
 * Carte coach en liste (écran Rechercher).
 * Ordre de lecture : qui (photo, nom, vérifié) → confiance (note, avis) → adéquation (spécialités, lieu)
 * → décision (prix, bouton), séparée du reste par un trait.
 */
export const CoachCard: React.FC<CoachCardProps> = ({ coach, userLocation, note, availability, fromPrice }) => {
  const { navigateTo, isFavorite, toggleFavorite, selectCoachForBooking } = useApp();
  const favorite = isFavorite(coach.id);

  const openProfile = () => {
    selectCoachForBooking(coach);
    navigateTo('coach_profile', { coachId: coach.id });
  };

  const distanceKm =
    userLocation && coach.latitude && coach.longitude
      ? calculateDistanceKm(userLocation.latitude, userLocation.longitude, coach.latitude, coach.longitude)
      : null;
  const online = coach.isOnlineCoaching || (coach.formats ?? []).includes('online');
  const place = coach.city ? `${coach.city}${online ? ' & En ligne' : ''}` : online ? 'En ligne' : coach.location;
  const tags = (coach.specialties?.length ? coach.specialties : [coach.category]).filter(Boolean).slice(0, 3);

  return (
    <article
      id={`coach-card-${coach.id}`}
      onClick={openProfile}
      className="apple-press bg-white dark:bg-slate-900 rounded-3xl border border-fmc-line/80 dark:border-slate-800 p-3 cursor-pointer"
    >
      <div className="flex gap-3">
        <Avatar src={coach.photo} name={coach.name} className="w-24 h-[116px] rounded-2xl bg-slate-100 shrink-0" />

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-start justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="text-base font-bold leading-5 truncate">{coach.name}</h3>
              {isVerifiedCoach(coach) && <VerifiedMark />}
            </div>
            <button
              type="button"
              id={`btn-fav-${coach.id}`}
              aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              aria-pressed={favorite}
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(coach.id);
              }}
              className="apple-press w-11 h-11 -mt-2.5 -mr-2 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Heart className={`w-5 h-5 ${favorite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
            </button>
          </div>

          <p className="text-[13px] leading-[18px] tabular-nums -mt-1.5">
            <Star className="w-3.5 h-3.5 inline -mt-0.5 fill-amber-400 text-amber-400" aria-hidden="true" />{' '}
            <b>{ratingLabel(coach)}</b>
            {coach.reviewCount > 0 && <span className="text-slate-500"> ({coach.reviewCount} avis)</span>}
          </p>

          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-1 mt-2" aria-label="Spécialités">
              {tags.map((t) => (
                <li key={t} className="h-6 px-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold inline-flex items-center max-w-full truncate">
                  {t}
                </li>
              ))}
            </ul>
          )}

          <p className="text-[13px] leading-[18px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5 min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {place}
              {distanceKm !== null && <> · {distanceKm < 1 ? 'moins de 1 km' : `≈ ${formatDistance(distanceKm)}`}</>}
            </span>
          </p>
          {note && <p className="text-[12px] font-semibold text-[#007A3D] dark:text-fmc-green mt-1">{note}</p>}
        </div>
      </div>

      <div className="h-px bg-fmc-line dark:bg-slate-800 my-3" />

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          {availability && <AvailabilityBadge label={availability} />}
          <p className={`text-[13px] text-slate-500 dark:text-slate-400 ${availability ? 'mt-1' : ''}`}>
            Séance dès <span className="text-[17px] font-bold text-fmc-navy dark:text-white tabular-nums">{fromPrice ?? coach.hourlyRate} €</span>/h
          </p>
        </div>
        <button
          type="button"
          id={`btn-view-profile-${coach.id}`}
          onClick={(e) => {
            e.stopPropagation();
            openProfile();
          }}
          className="apple-press h-11 px-4 rounded-full bg-fmc-green text-fmc-navy text-[13px] font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
        >
          Voir le profil
          <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </article>
  );
};

/** Carte coach « vedette » avec grande photo (écran Accueil). */
export const CoachFeatureCard: React.FC<{ coach: CoachProfile }> = ({ coach }) => {
  const { navigateTo, selectCoachForBooking, currentUser } = useApp();
  const isOwn = coach.userId === currentUser?.id;

  const openProfile = () => {
    selectCoachForBooking(coach);
    navigateTo('coach_profile', { coachId: coach.id });
  };

  return (
    <motion.article
      id={`coach-feature-${coach.id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={openProfile}
      className="bg-white dark:bg-slate-900 rounded-[28px] border border-fmc-line/70 dark:border-slate-800 overflow-hidden cursor-pointer active:scale-[0.99] transition"
    >
      <div className="relative h-48 bg-fmc-dark">
        <Avatar src={coach.coverPhoto || coach.photo} name={coach.name} className="w-full h-full text-5xl" />
        <div className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-black/45 to-transparent" />
        <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/55 backdrop-blur-md text-white text-sm font-semibold tabular-nums">
          <Star className="w-3.5 h-3.5 fill-fmc-green text-fmc-green" />
          {ratingLabel(coach)}
        </span>
        {coach.isElite && isRealCoach(coach) && (
          <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-fmc-green text-fmc-navy text-[11px] font-bold uppercase tracking-wide">
            Élite
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold leading-tight truncate">{coach.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">{coach.title}</p>
          </div>
          <span className="text-xl font-semibold text-fmc-green-ink tabular-nums shrink-0">{coach.hourlyRate}€/h</span>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openProfile();
            }}
            className="h-11 px-6 rounded-full border border-fmc-navy/70 dark:border-slate-600 text-sm font-semibold cursor-pointer active:scale-95 transition"
          >
            Voir le profil
          </button>
          {!isOwn && (
          <button
            type="button"
            id={`btn-book-now-${coach.id}`}
            aria-label={`Réserver avec ${coach.name}`}
            onClick={(e) => {
              e.stopPropagation();
              selectCoachForBooking(coach);
              navigateTo('booking_calendar', { coachId: coach.id });
            }}
            className="w-11 h-11 rounded-full bg-fmc-green text-white flex items-center justify-center active:scale-95 transition cursor-pointer"
          >
            <Calendar className="w-5 h-5" />
          </button>
          )}
        </div>
      </div>
    </motion.article>
  );
};
