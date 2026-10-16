import React, { useState } from 'react';
import { isSupabaseEnabled } from '../../lib/supabase';
import { Avatar } from '../ui/Avatar';
import { useApp } from '../../context/AppContext';
import { ScreenHeader, formatEuro, formatDateFr } from '../ui/fmc';
import { coachNet } from '../../utils/payout';
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
    cancelBooking,
    goBack,
    setActiveVideoBooking,
    openBookingDetail,
    setActiveChatPartner
  } = useApp();

  const coach = coaches.find(c => c.userId === currentUser?.id) || (isSupabaseEnabled ? undefined : coaches[0]);
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
    <div className="min-h-screen bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 pb-32 max-w-md mx-auto px-5 pt-4">
      <ScreenHeader title="Mes séances" onBack={goBack} />

      {/* Filter Tabs */}
      <div className="flex bg-white border border-slate-200 p-1 rounded-2xl mb-4 text-xs font-bold shadow-2xs">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
            filter === 'all' ? 'bg-fmc-green text-fmc-navy shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Toutes ({coachBookings.length})
        </button>
        <button
          onClick={() => setFilter('confirmed')}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
            filter === 'confirmed' ? 'bg-fmc-green text-fmc-navy shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          À venir ({coachBookings.filter(b => b.bookingStatus === 'confirmed').length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
            filter === 'completed' ? 'bg-fmc-green text-fmc-navy shadow-xs' : 'text-slate-500 hover:text-slate-900'
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
              notice.ok ? 'bg-fmc-green/10 border-[#00D664]/30 text-[#008A3E]' : 'bg-rose-50 border-rose-200 text-rose-600'
            }`}
          >
            {notice.text}
          </div>
        )}

        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-fmc-navy text-sm">Aucune séance dans cette vue</h3>
            <p className="text-xs text-slate-500 mt-1">Les séances que vos clients réservent avec vous apparaîtront ici.</p>
            <p className="text-[11px] text-slate-400 mt-2">Les séances que vous avez réservées vous-même auprès d'un coach sont dans l'espace client (« Explorer l'app comme un client »).</p>
          </div>
        ) : (
          filteredBookings.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={b.clientAvatar} name={b.clientName} className="w-11 h-11 rounded-2xl border border-slate-200" />
                  <div>
                    <h3 className="font-bold text-fmc-navy text-sm">{b.clientName}</h3>
                    <p className="text-xs text-slate-500">{b.clientEmail}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-[#008A3E] block">
                    +{formatEuro(coachNet(b))}
                  </span>
                  <span className="text-[10px] text-slate-400">net coach</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-2.5 space-y-1.5 text-xs border border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-[#008A3E]" />
                    <span>{formatDateFr(b.date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <Clock className="w-3.5 h-3.5 text-[#008A3E]" />
                    <span>{b.startTime} - {b.endTime}</span>
                  </div>
                </div>


                {b.notes && (
                  <div className="flex items-start gap-1 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>"{b.notes}"</span>
                  </div>
                )}

                <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200 flex items-center justify-between">
                  <span>Format : {b.sessionType.name}</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                    b.bookingStatus === 'confirmed' ? 'bg-fmc-green/15 text-[#008A3E] border border-[#00D664]/30' :
                    b.bookingStatus === 'completed' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}>
                    {b.bookingStatus === 'confirmed' ? 'Confirmée' : b.bookingStatus === 'completed' ? 'Terminée' : 'Annulée'}
                  </span>
                </div>
              </div>

              {b.bookingStatus === 'confirmed' && (
                <div className="space-y-2 pt-0.5">
                  {/* Action principale en pleine largeur, puis les actions secondaires ; « Annuler » reste discret */}
                  <button
                    onClick={() => setActiveVideoBooking(b)}
                    className="apple-press w-full h-11 bg-fmc-green text-fmc-navy font-bold rounded-full text-[15px] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {b.format === 'online' ? <Video className="w-4 h-4" strokeWidth={2.5} /> : <MapPin className="w-4 h-4" strokeWidth={2.5} />}
                    {b.format === 'online' ? 'Lien de la séance' : 'Lieu et itinéraire'}
                  </button>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setActiveChatPartner({ id: b.clientId, name: b.clientName, avatar: b.clientAvatar, role: 'client', title: 'Client' })}
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
                      onClick={() => handleCoachCancel(b.id)}
                      disabled={busyId === b.id}
                      className="apple-press h-11 rounded-full text-[13px] font-semibold text-rose-600 dark:text-rose-400 cursor-pointer disabled:opacity-60"
                    >
                      {busyId === b.id ? '…' : 'Annuler'}
                    </button>
                  </div>
                </div>
              )}

              {b.bookingStatus !== 'confirmed' && (
                <button
                  onClick={() => openBookingDetail(b.id)}
                  className="apple-press w-full h-11 rounded-full bg-slate-100 dark:bg-slate-800 text-[15px] font-semibold cursor-pointer"
                >
                  {b.bookingStatus === 'completed' ? 'Compte rendu et détails' : 'Voir le détail'}
                </button>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
