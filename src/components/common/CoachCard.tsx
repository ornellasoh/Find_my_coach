import React from 'react';
import { CoachProfile } from '../../types';
import { useApp } from '../../context/AppContext';
import { MapPin, ArrowRight, Calendar, Heart, Check, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { calculateDistanceKm, formatDistance } from '../../utils/geo';
import { Rating } from '../ui/fmc';

interface CoachCardProps {
  coach: CoachProfile;
  userLocation?: { latitude: number; longitude: number } | null;
  onBookDirect?: (coachId: string) => void;
}

/** Carte coach en liste (écran Recherche). */
export const CoachCard: React.FC<CoachCardProps> = ({ coach, userLocation }) => {
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

  return (
    <motion.article
      id={`coach-card-${coach.id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={openProfile}
      className="bg-white dark:bg-slate-900 rounded-[28px] border border-fmc-line/70 dark:border-slate-800 p-5 shadow-[0_8px_30px_rgba(0,214,100,0.08)] cursor-pointer active:scale-[0.99] transition"
    >
      <div className="flex gap-4">
        <div className="relative shrink-0">
          <img
            src={coach.photo}
            alt={coach.name}
            className="w-[88px] h-[88px] rounded-[22px] object-cover bg-slate-100"
          />
          {coach.verificationStatus === 'verified' && (
            <span
              title="Coach vérifié"
              className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-fmc-green border-[3px] border-white dark:border-slate-900 flex items-center justify-center"
            >
              <Check className="w-3 h-3 text-white" strokeWidth={4} />
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold leading-tight truncate">{coach.name}</h3>
            <Rating value={coach.rating} className="shrink-0 pt-0.5" />
          </div>
          <p className="text-sm font-medium text-fmc-green-ink mt-1 truncate">{coach.title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5 min-w-0">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">{coach.isOnlineCoaching && !coach.city ? 'À distance / En ligne' : coach.location || coach.city}</span>
            {distanceKm !== null && (
              <span className="shrink-0 text-fmc-green-ink font-semibold">· {formatDistance(distanceKm)}</span>
            )}
          </p>
        </div>
      </div>

      <div className="h-px bg-fmc-line/80 dark:bg-slate-800 my-4" />

      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-slate-500 block">Séance dès</span>
          <span className="text-xl font-semibold tabular-nums">
            {coach.hourlyRate} €<span className="text-sm font-medium text-slate-500"> /h</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id={`btn-fav-${coach.id}`}
            aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(coach.id);
            }}
            className={`w-11 h-11 rounded-full border flex items-center justify-center transition cursor-pointer ${
              favorite ? 'bg-rose-50 border-rose-200 text-rose-500' : 'border-fmc-line dark:border-slate-700 text-slate-400'
            }`}
          >
            <Heart className={`w-5 h-5 ${favorite ? 'fill-rose-500' : ''}`} />
          </button>
          <button
            type="button"
            id={`btn-view-profile-${coach.id}`}
            onClick={(e) => {
              e.stopPropagation();
              openProfile();
            }}
            className="h-11 px-5 rounded-full bg-fmc-green text-fmc-navy text-sm font-bold flex items-center gap-2 active:scale-95 transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            Voir le profil
          </button>
        </div>
      </div>
    </motion.article>
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
        <img src={coach.coverPhoto || coach.photo} alt={coach.name} className="w-full h-full object-cover" />
        <div className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-black/45 to-transparent" />
        <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/55 backdrop-blur-md text-white text-sm font-semibold tabular-nums">
          <Star className="w-3.5 h-3.5 fill-fmc-green text-fmc-green" />
          {coach.rating.toFixed(1)}
        </span>
        {coach.isElite && (
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
