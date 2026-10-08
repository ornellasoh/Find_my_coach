import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
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
    startChatWithCoach,
    coaches
  } = useApp();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Filter bookings for current client
  const clientBookings = currentUser
    ? bookings.filter(b => b.clientId === currentUser.id)
    : bookings;

  const upcomingBookings = clientBookings.filter(b => b.bookingStatus === 'confirmed');
  const completedBookings = clientBookings.filter(b => b.bookingStatus === 'completed');
  const cancelledBookings = clientBookings.filter(b => b.bookingStatus === 'cancelled');

  const currentList = 
    activeTab === 'upcoming' 
      ? upcomingBookings 
      : activeTab === 'completed' 
      ? completedBookings 
      : cancelledBookings;

  const handleCancel = (bookingId: string) => {
    if (window.confirm('Voulez-vous vraiment annuler cette séance ? Le créneau sera libéré et le remboursement intégral sera effectué.')) {
      cancelBooking(bookingId);
      setCancellingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FA] text-[#0F172A] pb-28 max-w-md mx-auto px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between py-2 mb-3">
        <button
          onClick={goBack}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-base font-extrabold text-[#0F172A]">Mes Réservations</h1>

        <div className="w-10" />
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-2xl mb-4 border border-slate-200 shadow-2xs">
        <button
          id="tab-upcoming-bookings"
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition cursor-pointer ${
            activeTab === 'upcoming'
              ? 'bg-[#00D664] text-[#0F172A] shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          À venir ({upcomingBookings.length})
        </button>

        <button
          id="tab-completed-bookings"
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-[#00D664] text-[#0F172A] shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Passées ({completedBookings.length})
        </button>

        <button
          id="tab-cancelled-bookings"
          onClick={() => setActiveTab('cancelled')}
          className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition cursor-pointer ${
            activeTab === 'cancelled'
              ? 'bg-[#00D664] text-[#0F172A] shadow-xs'
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
            <h3 className="font-extrabold text-[#0F172A] text-sm">
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
                className="px-5 py-2.5 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Explorer les coachs
              </button>
            )}
          </div>
        ) : (
          currentList.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3"
            >
              {/* Coach details */}
              <div className="flex items-start justify-between">
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => navigateTo('coach_profile', { coachId: b.coachId })}
                >
                  <img
                    src={b.coachPhoto}
                    alt={b.coachName}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                  />
                  <div>
                    <h3 className="font-extrabold text-[#0F172A] text-sm hover:text-[#008A3E] transition">
                      {b.coachName}
                    </h3>
                    <p className="text-xs text-[#008A3E] font-semibold">{b.coachTitle}</p>
                    <span className="text-[10px] text-slate-400">Réf : #{b.id.toUpperCase()}</span>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  b.bookingStatus === 'confirmed'
                    ? 'bg-[#00D664]/15 text-[#008A3E] border border-[#00D664]/30'
                    : b.bookingStatus === 'completed'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                }`}>
                  {b.bookingStatus === 'confirmed' ? 'Confirmée' : b.bookingStatus === 'completed' ? 'Effectuée' : 'Annulée'}
                </span>
              </div>

              {/* Timing */}
              <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-[#008A3E] shrink-0" />
                  <span>{b.date}</span>
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
                  <span className="font-extrabold text-[#0F172A]">{b.total.toFixed(2).replace('.', ',')} €</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {b.bookingStatus === 'confirmed' && (
                  <>
                    <button
                      onClick={() => {
                        const coach = coaches.find(c => c.id === b.coachId);
                        if (coach) startChatWithCoach(coach);
                      }}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1"
                      title="Envoyer un message"
                    >
                      <MessageSquare className="w-4 h-4 text-[#008A3E]" />
                    </button>

                    <button
                      onClick={() => setActiveVideoBooking(b)}
                      className="flex-1 py-2 px-3 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Rejoindre la visio</span>
                    </button>

                    <button
                      onClick={() => handleCancel(b.id)}
                      className="py-2 px-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition cursor-pointer"
                    >
                      Annuler
                    </button>
                  </>
                )}

                {b.bookingStatus === 'completed' && (
                  <>
                    {!b.hasReview ? (
                      <button
                        onClick={() => setReviewModalBooking(b)}
                        className="flex-1 py-2 px-3 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>Laisser un avis</span>
                      </button>
                    ) : (
                      <div className="flex-1 py-2 px-3 bg-[#00D664]/10 text-[#008A3E] font-bold rounded-xl text-xs text-center flex items-center justify-center gap-1 border border-[#00D664]/20">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Avis déposé</span>
                      </div>
                    )}
                    <button
                      onClick={() => navigateTo('booking_calendar', { coachId: b.coachId })}
                      className="py-2 px-3 bg-slate-100 text-slate-800 font-bold rounded-xl text-xs hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
                    >
                      Reprendre une séance
                    </button>
                  </>
                )}

                {b.bookingStatus === 'cancelled' && (
                  <button
                    onClick={() => navigateTo('booking_calendar', { coachId: b.coachId })}
                    className="w-full py-2.5 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-extrabold rounded-xl text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reprendre un rendez-vous</span>
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
