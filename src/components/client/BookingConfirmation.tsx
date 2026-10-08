import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  CheckCircle, 
  Calendar, 
  Clock, 
  Video, 
  MapPin,
  ArrowRight, 
  Home, 
  ExternalLink,
  MessageSquare,
  Download,
  CalendarPlus,
  Share2
} from 'lucide-react';
import { motion } from 'motion/react';

export const BookingConfirmation: React.FC = () => {
  const { 
    latestConfirmedBooking, 
    navigateTo, 
    setActiveVideoBooking, 
    startChatWithCoach,
    coaches 
  } = useApp();
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  if (!latestConfirmedBooking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#F6F9FA]">
        <h2 className="text-lg font-bold text-slate-800">Réservation confirmée</h2>
        <button
          onClick={() => navigateTo('bookings')}
          className="mt-4 px-5 py-2.5 bg-[#00D664] text-[#0F172A] font-extrabold text-xs rounded-xl"
        >
          Voir mes réservations
        </button>
      </div>
    );
  }

  const b = latestConfirmedBooking;

  const handleAddToCalendar = () => {
    // Generate simple .ics calendar file
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FindMyCoach//FR
BEGIN:VEVENT
SUMMARY:Séance de coaching avec ${b.coachName}
DESCRIPTION:Séance ${b.sessionType.name} FindMyCoach. ${b.meetingLink ? `Lien visio: ${b.meetingLink}` : `Lieu: ${b.coachLocation}`}
DTSTART:${b.date.replace(/-/g, '')}T${b.startTime.replace(':', '')}00
DTEND:${b.date.replace(/-/g, '')}T${b.endTime.replace(':', '')}00
LOCATION:${b.meetingLink || b.coachLocation}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `seance-${b.coachName.toLowerCase().replace(/\s+/g, '-')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCalendarAdded(true);
  };

  return (
    <div className="min-h-screen bg-[#F6F9FA] text-[#0F172A] pb-24 max-w-md mx-auto px-4 pt-8 flex flex-col justify-between">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-5"
      >
        {/* Animated Check Icon */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-[#00D664] text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-[#00D664]/20">
            <CheckCircle className="w-9 h-9 stroke-[2.5]" />
          </div>

          <span className="inline-block px-3 py-1 bg-[#00D664]/15 text-[#008A3E] rounded-full text-xs font-bold uppercase tracking-wider">
            Paiement validé avec succès
          </span>

          <h1 className="text-2xl font-black text-[#0F172A]">
            Réservation confirmée !
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Un email de confirmation et la facture ont été envoyés à votre adresse.
          </p>
        </div>

        {/* Booking Card summary */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <img
              src={b.coachPhoto}
              alt={b.coachName}
              className="w-12 h-12 rounded-xl object-cover border border-slate-200"
            />
            <div>
              <h3 className="font-extrabold text-sm text-[#0F172A]">{b.coachName}</h3>
              <p className="text-xs text-[#008A3E] font-semibold">{b.coachTitle}</p>
              <span className="text-[11px] text-slate-400">Réf : #{b.id.toUpperCase()}</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-700">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-500">
                <Calendar className="w-4 h-4 text-[#00D664]" /> Date
              </span>
              <span className="font-bold text-[#0F172A]">{b.date}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-500">
                <Clock className="w-4 h-4 text-[#00D664]" /> Horaire
              </span>
              <span className="font-bold text-[#0F172A]">{b.startTime} - {b.endTime}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-500">
                {b.sessionType.mode === 'video' ? (
                  <Video className="w-4 h-4 text-[#00D664]" />
                ) : (
                  <MapPin className="w-4 h-4 text-[#00D664]" />
                )} Format
              </span>
              <span className="font-bold text-[#0F172A]">{b.sessionType.name}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-slate-500">Montant total réglé</span>
              <span className="font-extrabold text-[#008A3E] text-sm">
                {b.total.toFixed(2).replace('.', ',')} €
              </span>
            </div>
          </div>

          {b.meetingLink && (
            <div className="p-3 bg-[#00D664]/10 rounded-xl border border-[#00D664]/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-[#008A3E]" />
                <span className="font-bold text-[#0F172A]">Séance en visio HD :</span>
              </div>
              <button
                onClick={() => setActiveVideoBooking(b)}
                className="px-3 py-1.5 bg-[#00D664] text-[#0F172A] rounded-lg font-extrabold hover:bg-[#00B050] transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
              >
                <span>Tester la salle</span>
                <Video className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Quick Utility CTAs (Add to calendar, Contact coach) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleAddToCalendar}
            className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4 text-[#008A3E]" />
            <span>{calendarAdded ? 'Téléchargé !' : 'Ajouter au calendrier'}</span>
          </button>

          <button
            onClick={() => {
              const coach = coaches.find(c => c.id === b.coachId);
              if (coach) {
                startChatWithCoach(coach);
              }
            }}
            className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-[#008A3E]" />
            <span>Message au coach</span>
          </button>
        </div>
      </motion.div>

      {/* Action Navigation */}
      <div className="space-y-2 pt-4">
        <button
          id="btn-goto-my-bookings"
          onClick={() => navigateTo('bookings')}
          className="w-full py-3.5 px-6 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-extrabold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
        >
          <span>Voir mes réservations</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>

        <button
          id="btn-goto-home-after-booking"
          onClick={() => navigateTo('home')}
          className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Retour à l'accueil</span>
        </button>
      </div>
    </div>
  );
};
