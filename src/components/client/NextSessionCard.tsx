import React from 'react';
import { Avatar } from '../ui/Avatar';
import { motion } from 'motion/react';
import { CalendarX, ChevronRight, Clock, CreditCard, MapPin, MessageSquare, Navigation, Search, Video } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Booking } from '../../types';
import { formatDateFr } from '../ui/fmc';
import { isOnlineBooking, useSessionDetails } from '../common/SessionAccess';
import { directionsUrl, openExternal } from '../../utils/meeting';

const FORMAT_LABEL: Record<string, string> = {
  online: 'En visio',
  home: 'À domicile',
  coach_location: 'Chez le coach',
  outdoor: 'En extérieur',
  corporate: 'En entreprise',
  partner_gym: 'En salle partenaire',
};

const endOf = (b: Booking) => new Date(`${b.date}T${b.endTime || b.startTime || '23:59'}:00`).getTime();
const startOf = (b: Booking) => new Date(`${b.date}T${b.startTime || '00:00'}:00`).getTime();

/** Choisit la séance à mettre en avant (statuts existants : confirmée, en attente de paiement, annulée). */
export function pickNextSession(bookings: Booking[], clientId: string): Booking | null {
  const now = Date.now();
  const mine = bookings.filter((b) => b.clientId === clientId && endOf(b) >= now).sort((a, b) => startOf(a) - startOf(b));
  return (
    mine.find((b) => b.bookingStatus === 'confirmed') ??
    mine.find((b) => b.bookingStatus === 'pending') ??
    mine.find((b) => b.bookingStatus === 'cancelled') ??
    null
  );
}

/** Carte « Ma prochaine séance » de l'accueil client. */
export const NextSessionCard: React.FC = () => {
  const { bookings, currentUser, coaches, navigateTo, openBookingDetail, startChatWithCoach } = useApp();
  const next = currentUser ? pickNextSession(bookings, currentUser.id) : null;
  const { details } = useSessionDetails(next && next.bookingStatus === 'confirmed' ? next : null);

  if (!next) {
    return (
      <section className="mb-7 rounded-[28px] bg-white dark:bg-slate-900 border border-fmc-line/80 dark:border-slate-800 p-5">
        <span className="text-xs font-bold uppercase tracking-wider text-fmc-green-ink">Ma prochaine séance</span>
        <p className="mt-2 font-semibold">Aucune séance prévue</p>
        <p className="text-sm text-slate-500 mt-0.5">Trouvez un coach près de chez vous ou en visio.</p>
        <button
          type="button"
          onClick={() => navigateTo('search')}
          className="mt-4 min-h-11 px-4 rounded-full bg-fmc-green text-fmc-navy font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
        >
          <Search className="w-4 h-4" /> Trouver un coach
        </button>
      </section>
    );
  }

  const coach = coaches.find((c) => c.id === next.coachId);
  const online = isOnlineBooking(next);
  const place = online ? 'En visio' : details?.sessionAddress || next.location || FORMAT_LABEL[next.format] || '';
  const state =
    next.bookingStatus === 'confirmed'
      ? { label: 'Confirmée', cls: 'bg-fmc-green/20 text-fmc-green' }
      : next.bookingStatus === 'pending'
      ? { label: 'En attente de paiement', cls: 'bg-amber-400/20 text-amber-300' }
      : { label: 'Annulée', cls: 'bg-rose-400/20 text-rose-300' };

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-7 rounded-[28px] bg-fmc-dark text-white p-5"
      aria-label="Ma prochaine séance"
    >
      <div className="flex items-center justify-between mb-4 gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-fmc-green">Ma prochaine séance</span>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${state.cls}`}>{state.label}</span>
      </div>

      <div className="flex items-center gap-3">
        <Avatar src={next.coachPhoto} name={next.coachName} className="w-12 h-12 rounded-2xl" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{next.coachName}</p>
          <p className="text-sm text-white/70 flex items-center gap-1.5 tabular-nums">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {formatDateFr(next.date)} • {next.startTime}–{next.endTime}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm text-white/80 flex items-center gap-1.5">
        {online ? <Video className="w-4 h-4 shrink-0 text-fmc-green" /> : <MapPin className="w-4 h-4 shrink-0 text-fmc-green" />}
        <span className="truncate">{next.sessionType?.name}{place ? ` • ${place}` : ''}</span>
      </p>

      {next.bookingStatus === 'confirmed' && details?.prepInstructions && (
        <p className="mt-2 text-sm text-white/70 line-clamp-2">📋 {details.prepInstructions}</p>
      )}

      <div className="mt-4 flex items-center gap-2">
        {next.bookingStatus === 'confirmed' && (
          online ? (
            details?.meetingUrl ? (
              <button
                type="button"
                onClick={() => openExternal(details.meetingUrl!)}
                className="flex-1 min-h-11 rounded-full bg-fmc-green text-fmc-navy font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Video className="w-4 h-4" /> Rejoindre la séance
              </button>
            ) : (
              <p className="flex-1 text-xs text-white/70">Le coach ajoutera le lien avant la séance.</p>
            )
          ) : details?.sessionAddress ? (
            <button
              type="button"
              onClick={() => openExternal(directionsUrl(details.sessionAddress!))}
              className="flex-1 min-h-11 rounded-full bg-fmc-green text-fmc-navy font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Navigation className="w-4 h-4" /> Itinéraire
            </button>
          ) : (
            <span className="flex-1" />
          )
        )}
        {next.bookingStatus === 'pending' && (
          <button
            type="button"
            onClick={() => openBookingDetail(next.id)}
            className="flex-1 min-h-11 rounded-full bg-amber-400 text-fmc-navy font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" /> Finaliser le paiement
          </button>
        )}
        {next.bookingStatus === 'cancelled' && (
          <button
            type="button"
            onClick={() => (coach ? navigateTo('booking_calendar', { coachId: coach.id }) : navigateTo('search'))}
            className="flex-1 min-h-11 rounded-full bg-white/10 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <CalendarX className="w-4 h-4" /> Réserver un autre créneau
          </button>
        )}
        {next.bookingStatus !== 'cancelled' && coach && (
          <button
            type="button"
            aria-label="Conversation avec le coach"
            onClick={() => startChatWithCoach(coach)}
            className="w-11 h-11 shrink-0 rounded-full bg-white/10 flex items-center justify-center cursor-pointer"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        )}
        <button
          type="button"
          aria-label="Détail de la réservation"
          onClick={() => openBookingDetail(next.id)}
          className="w-11 h-11 shrink-0 rounded-full bg-white/10 flex items-center justify-center cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </motion.section>
  );
};
