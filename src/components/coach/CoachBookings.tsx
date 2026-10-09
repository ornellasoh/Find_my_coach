import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Video, 
  CheckCircle2, 
  DollarSign, 
  User, 
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  MessageSquare
} from 'lucide-react';
import { motion } from 'motion/react';

export const CoachBookings: React.FC = () => {
  const { 
    currentUser, 
    coaches, 
    bookings, 
    completeBooking, 
    cancelBooking,
    goBack,
    setActiveVideoBooking,
    setActiveChatPartner
  } = useApp();

  const coach = coaches.find(c => c.userId === currentUser?.id) || coaches[0];
  const coachBookings = bookings.filter(b => b.coachId === coach?.id);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const handleCoachCancel = async (bookingId: string) => {
    if (busyId) return;
    if (!window.confirm('Annuler cette séance ? Votre client sera prévenu et remboursé intégralement.')) return;
    setBusyId(bookingId);
    setNotice(null);
    try {
      await cancelBooking(bookingId);
      setNotice({ ok: true, text: 'Séance annulée. Le client est prévenu et remboursé.' });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "L'annulation a échoué." });
    } finally {
      setBusyId(null);
    }
  };

  const [filter, setFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');

  const filteredBookings = coachBookings.filter(b => {
    if (filter === 'all') return true;
    return b.bookingStatus === filter;
  });

  return (
    <div className="min-h-screen bg-[#F6F9FA] text-[#0F172A] pb-28 max-w-md mx-auto px-4 pt-3">
      {/* Header */}
      <div className="flex items-center justify-between py-2 mb-3">
        <button
          onClick={goBack}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-base font-extrabold text-[#0F172A]">Séances & Planning Clients</h1>

        <div className="w-10" />
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-white border border-slate-200 p-1 rounded-2xl mb-4 text-xs font-extrabold shadow-2xs">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
            filter === 'all' ? 'bg-[#00D664] text-[#0F172A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Toutes ({coachBookings.length})
        </button>
        <button
          onClick={() => setFilter('confirmed')}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
            filter === 'confirmed' ? 'bg-[#00D664] text-[#0F172A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          À venir ({coachBookings.filter(b => b.bookingStatus === 'confirmed').length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
            filter === 'completed' ? 'bg-[#00D664] text-[#0F172A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Passées ({coachBookings.filter(b => b.bookingStatus === 'completed').length})
        </button>
      </div>

      {/* Bookings List */}
      <div className="space-y-3.5">
        {notice && (
          <div
            className={`p-3 rounded-2xl text-xs font-semibold border ${
              notice.ok ? 'bg-[#00D664]/10 border-[#00D664]/30 text-[#008A3E]' : 'bg-rose-50 border-rose-200 text-rose-600'
            }`}
          >
            {notice.text}
          </div>
        )}

        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-extrabold text-[#0F172A] text-sm">Aucune séance dans cette vue</h3>
            <p className="text-xs text-slate-500 mt-1">Les séances que vos clients réservent avec vous apparaîtront ici.</p>
            <p className="text-[11px] text-slate-400 mt-2">Les séances que vous avez réservées vous-même auprès d'un coach sont dans l'espace client (« Explorer l'app comme un client »).</p>
          </div>
        ) : (
          filteredBookings.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={b.clientAvatar}
                    alt={b.clientName}
                    className="w-11 h-11 rounded-2xl object-cover border border-slate-200"
                  />
                  <div>
                    <h3 className="font-extrabold text-[#0F172A] text-sm">{b.clientName}</h3>
                    <p className="text-xs text-slate-500">{b.clientEmail}</p>
                    <span className="text-[10px] text-slate-400">Réf : #{b.id.toUpperCase()}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-extrabold text-[#008A3E] block">
                    +{(b.price * 0.85).toFixed(2)} €
                  </span>
                  <span className="text-[10px] text-slate-400">net coach</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-2.5 space-y-1.5 text-xs border border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-[#008A3E]" />
                    <span>{b.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#008A3E]" />
                    <span>{b.startTime} - {b.endTime}</span>
                  </div>
                </div>

                {b.clientAddress && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-700 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">{b.clientAddress}</span>
                  </div>
                )}

                {b.notes && (
                  <div className="flex items-start gap-1 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>"{b.notes}"</span>
                  </div>
                )}

                <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200 flex items-center justify-between">
                  <span>Format : {b.sessionType.name}</span>
                  <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] uppercase ${
                    b.bookingStatus === 'confirmed' ? 'bg-[#00D664]/15 text-[#008A3E] border border-[#00D664]/30' :
                    b.bookingStatus === 'completed' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}>
                    {b.bookingStatus === 'confirmed' ? 'Confirmée' : b.bookingStatus === 'completed' ? 'Terminée' : 'Annulée'}
                  </span>
                </div>
              </div>

              {b.bookingStatus === 'confirmed' && (
                <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                  <button
                    onClick={() => setActiveChatPartner({
                      id: b.clientId,
                      name: b.clientName,
                      avatar: b.clientAvatar,
                      role: 'client',
                      title: `Client FMC`
                    })}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1"
                    title="Envoyer un message au client"
                  >
                    <MessageSquare className="w-4 h-4 text-[#008A3E]" />
                  </button>

                  {b.meetingLink && b.format === 'online' ? (
                    <button
                      onClick={() => setActiveVideoBooking(b)}
                      className="flex-1 py-2 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
                    >
                      <Video className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Ouvrir la Visio HD</span>
                    </button>
                  ) : b.clientAddress ? (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(b.clientAddress)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Itinéraire GPS</span>
                    </a>
                  ) : null}

                  <button
                    onClick={() => handleCoachCancel(b.id)}
                    disabled={busyId === b.id}
                    className="py-2 px-3 bg-white hover:bg-rose-50 text-rose-500 font-bold rounded-xl text-xs border border-rose-200 transition cursor-pointer disabled:opacity-60"
                  >
                    {busyId === b.id ? '…' : 'Annuler'}
                  </button>

                  <button
                    onClick={() => completeBooking(b.id)}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-200 transition cursor-pointer"
                  >
                    Valider la séance
                  </button>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
