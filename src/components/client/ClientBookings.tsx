import React, { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { useApp } from '../../context/AppContext';
import { ScreenHeader, formatEuro, formatDateFr } from '../ui/fmc';
import { 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  Star, 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  MessageSquare,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  RotateCcw
} from 'lucide-react';
import { motion } from 'motion/react';
import { Booking } from '../../types';

export const ClientBookings: React.FC = () => {
  const { 
    bookings, 
    currentUser, 
    cancelBooking, 
    setReviewModalBooking, 
    navigateTo, 
    goBack,
    setActiveVideoBooking,
    openBookingDetail,
    startChatWithCoach,
    coaches
  } = useApp();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Filter bookings for current client
  const clientBookings = currentUser
    ? bookings.filter(b => b.clientId === currentUser.id)
    : bookings;

  const upcomingBookings = clientBookings.filter(b => b.bookingStatus === 'confirmed' || b.bookingStatus === 'pending');
  const completedBookings = clientBookings.filter(b => b.bookingStatus === 'completed');
  const cancelledBookings = clientBookings.filter(b => b.bookingStatus === 'cancelled');

  const currentList = 
    activeTab === 'upcoming' 
      ? upcomingBookings 
      : activeTab === 'completed' 
      ? completedBookings 
      : cancelledBookings;

  const [cancelMessage, setCancelMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const handleCancel = async (bookingId: string) => {
    if (cancellingId) return;
    if (!window.confirm("Annuler cette séance ? Le créneau sera libéré et vous serez remboursé intégralement (annulation gratuite jusqu'à 24 h avant).")) return;
    setCancellingId(bookingId);
    setCancelMessage(null);
    try {
      const res = await cancelBooking(bookingId);
      setCancelMessage({
        ok: true,
        text: res.refunded
          ? `Séance annulée. Remboursement de ${(res.amount ?? 0).toFixed(2).replace('.', ',')} € en cours sur votre carte (5 à 10 jours).`
          : 'Séance annulée.',
      });
      setActiveTab('cancelled');
    } catch (err) {
      setCancelMessage({ ok: false, text: err instanceof Error ? err.message : "L'annulation a échoué." });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 pb-32 max-w-md mx-auto px-5 pt-4">
      <ScreenHeader title="Mes réservations" onBack={goBack} />

      {cancelMessage && (
        <div
          className={`mb-3 p-3 rounded-2xl text-xs font-semibold border ${
            cancelMessage.ok ? 'bg-fmc-green/10 border-[#00D664]/30 text-[#008A3E]' : 'bg-rose-50 border-rose-200 text-rose-600'
          }`}
        >
          {cancelMessage.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl mb-4 border border-slate-200 shadow-2xs">
        <button
          id="tab-upcoming-bookings"
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'upcoming'
              ? 'bg-fmc-green text-fmc-navy shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          À venir ({upcomingBookings.length})
        </button>

        <button
          id="tab-completed-bookings"
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-fmc-green text-fmc-navy shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Passées ({completedBookings.length})
        </button>

        <button
          id="tab-cancelled-bookings"
          onClick={() => setActiveTab('cancelled')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeTab === 'cancelled'
              ? 'bg-fmc-green text-fmc-navy shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Annulées ({cancelledBookings.length})
        </button>
      </div>

      {/* Bookings List */}
      <div className="space-y-3.5">
        {currentList.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-fmc-navy text-sm">
              {activeTab === 'upcoming' ? 'Aucune séance à venir' : 'Aucune réservation dans cet onglet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {activeTab === 'upcoming' 
                ? 'Trouvez votre mentor idéal et planifiez votre premier entraînement dès maintenant.'
                : 'Vos séances passées ou archivées apparaîtront ici.'}
            </p>
            {activeTab === 'upcoming' && (
              <button
                onClick={() => navigateTo('search')}
                className="apple-press h-11 px-6 bg-fmc-green text-fmc-navy font-bold text-[15px] rounded-full cursor-pointer"
              >
                Trouver un coach
              </button>
            )}
          </div>
        ) : (
          currentList.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800 space-y-3"
            >
              {/* Coach details */}
              <div className="flex items-start justify-between">
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => navigateTo('coach_profile', { coachId: b.coachId })}
                >
                  <Avatar src={b.coachPhoto} name={b.coachName} className="w-12 h-12 rounded-xl border border-slate-200" />
                  <div>
                    <h3 className="font-bold text-fmc-navy text-sm hover:text-[#008A3E] transition">
                      {b.coachName}
                    </h3>
                    <p className="text-xs text-[#008A3E] font-semibold">{b.coachTitle}</p>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  b.bookingStatus === 'pending'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : b.bookingStatus === 'confirmed'
                    ? 'bg-fmc-green/15 text-[#008A3E] border border-[#00D664]/30'
                    : b.bookingStatus === 'completed'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                }`}>
                  {b.bookingStatus === 'pending' ? 'Paiement en attente' : b.bookingStatus === 'confirmed' ? 'Confirmée' : b.bookingStatus === 'completed' ? 'Effectuée' : 'Annulée'}
                </span>
              </div>

              {/* Timing */}
              <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-[#008A3E] shrink-0" />
                  <span>{formatDateFr(b.date)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#008A3E] shrink-0" />
                  <span>{b.startTime} - {b.endTime}</span>
                </div>
                <div className="col-span-2 flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200">
                  <div className="flex items-center gap-1">
                    {b.sessionType.mode === 'video' ? (
                      <Video className="w-3.5 h-3.5 text-[#008A3E] shrink-0" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5 text-[#008A3E] shrink-0" />
                    )}
                    <span className="text-[11px] font-semibold">{b.sessionType.name} ({b.sessionType.durationMinutes} min)</span>
                  </div>
                  <span className="font-bold text-fmc-navy">{formatEuro(b.total)}</span>
                </div>
              </div>

              {/* Actions : la principale en pleine largeur, les secondaires en dessous ; « Annuler » reste discret */}
              <div className="space-y-2 pt-1">
                {b.bookingStatus === 'confirmed' && (
                  <>
                    <button
                      onClick={() => setActiveVideoBooking(b)}
                      className="apple-press w-full h-11 bg-fmc-green text-fmc-navy font-bold rounded-full text-[15px] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {b.format === 'online' ? <Video className="w-4 h-4" strokeWidth={2.5} /> : <MapPin className="w-4 h-4" strokeWidth={2.5} />}
                      {b.format === 'online' ? 'Rejoindre la séance' : 'Lieu et itinéraire'}
                    </button>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          const coach = coaches.find((c) => c.id === b.coachId);
                          if (coach) startChatWithCoach(coach);
                        }}
                        className="apple-press h-11 rounded-full bg-slate-100 dark:bg-slate-800 text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" /> Message
                      </button>
                      <button
                        onClick={() => openBookingDetail(b.id)}
                        className="apple-press h-11 rounded-full bg-slate-100 dark:bg-slate-800 text-[13px] font-semibold cursor-pointer"
                      >
                        Détails
                      </button>
                      <button
                        onClick={() => handleCancel(b.id)}
                        disabled={cancellingId === b.id}
                        className="apple-press h-11 rounded-full text-[13px] font-semibold text-rose-600 dark:text-rose-400 cursor-pointer disabled:opacity-60"
                      >
                        {cancellingId === b.id ? 'Annulation…' : 'Annuler'}
                      </button>
                    </div>
                  </>
                )}

                {b.bookingStatus === 'pending' && (
                  <button
                    onClick={() => openBookingDetail(b.id)}
                    className="apple-press w-full h-11 bg-amber-400 text-fmc-navy font-bold rounded-full text-[15px] cursor-pointer"
                  >
                    Finaliser le paiement
                  </button>
                )}

                {b.bookingStatus === 'completed' && (
                  <>
                    {!b.hasReview ? (
                      <button
                        onClick={() => setReviewModalBooking(b)}
                        className="apple-press w-full h-11 bg-fmc-green text-fmc-navy font-bold rounded-full text-[15px] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Star className="w-4 h-4 fill-current" /> Laisser un avis
                      </button>
                    ) : (
                      <p className="h-11 rounded-full bg-[#E6FBEF] dark:bg-fmc-green/15 text-[#007A3D] dark:text-fmc-green text-[15px] font-semibold flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-4 h-4" /> Avis publié
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openBookingDetail(b.id)}
                        className="apple-press h-11 rounded-full bg-slate-100 dark:bg-slate-800 text-[13px] font-semibold cursor-pointer"
                      >
                        Compte rendu
                      </button>
                      <button
                        onClick={() => navigateTo('booking_calendar', { coachId: b.coachId })}
                        className="apple-press h-11 rounded-full bg-slate-100 dark:bg-slate-800 text-[13px] font-semibold cursor-pointer"
                      >
                        Réserver à nouveau
                      </button>
                    </div>
                  </>
                )}

                {b.bookingStatus === 'cancelled' && (
                  <button
                    onClick={() => navigateTo('booking_calendar', { coachId: b.coachId })}
                    className="apple-press w-full h-11 bg-fmc-green text-fmc-navy font-bold rounded-full text-[15px] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Réserver à nouveau
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
