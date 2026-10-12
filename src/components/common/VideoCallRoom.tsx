import React from 'react';
import { Avatar } from '../ui/Avatar';
import { motion } from 'motion/react';
import { Calendar, ChevronRight, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Booking } from '../../types';
import { formatDateFr } from '../ui/fmc';
import { SessionAccess, useSessionDetails } from './SessionAccess';

interface VideoCallRoomProps {
  booking: Booking | null;
  onClose: () => void;
}

/**
 * Accès rapide à une séance (remplace l'ancienne visio simulée) :
 * lien externe Meet / Zoom / Teams, consignes et lieu. Aucune caméra ni micro dans l'app.
 */
export const VideoCallRoom: React.FC<VideoCallRoomProps> = ({ booking, onClose }) => {
  const { currentUser, openBookingDetail } = useApp();
  const { details, setDetails, loading, error } = useSessionDetails(booking);
  if (!booking) return null;
  const isCoach = currentUser?.id !== booking.clientId && currentUser?.role !== 'client';
  const partnerName = isCoach ? booking.clientName : booking.coachName;
  const partnerPhoto = isCoach ? booking.clientAvatar : booking.coachPhoto;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Accès à la séance"
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[28px] px-5 pt-4 pb-[calc(1.25rem+var(--sab))] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Accès à la séance</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <Avatar src={partnerPhoto} name={partnerName} className="w-12 h-12 rounded-2xl" />
          <div className="min-w-0">
            <p className="font-semibold truncate">{partnerName}</p>
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> {formatDateFr(booking.date)} • {booking.startTime}–{booking.endTime}
            </p>
            <p className="text-xs text-slate-500">{booking.sessionType?.name}</p>
          </div>
        </div>

        <SessionAccess
          booking={booking}
          isCoach={isCoach}
          details={details}
          loading={loading}
          error={error}
          onSaved={setDetails}
          compact
        />

        <button
          type="button"
          onClick={() => {
            onClose();
            openBookingDetail(booking.id);
          }}
          className="mt-4 w-full min-h-11 rounded-2xl bg-slate-50 dark:bg-slate-800 px-4 text-sm font-semibold flex items-center justify-between cursor-pointer"
        >
          Détail de la réservation <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>
    </motion.div>
  );
};
