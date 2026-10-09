import React, { useEffect, useState } from 'react';
import { fetchNotificationPrefs, saveNotificationPrefs } from '../../lib/push';
import { isSupabaseEnabled } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { Bell, CheckCheck, X, Calendar, MessageSquare, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/** Affiche « à l'instant », « il y a 5 min », « hier 14:30 »… pour les dates ISO ; sinon le texte tel quel. */
function formatWhen(value: string): string {
  const t = Date.parse(value);
  if (!value || Number.isNaN(t) || !/\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  const diff = (Date.now() - t) / 60000;
  if (diff < 1) return "à l'instant";
  if (diff < 60) return `il y a ${Math.floor(diff)} min`;
  const d = new Date(t);
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (diff < 24 * 60 && new Date().getDate() === d.getDate()) return time;
  if (diff < 48 * 60) return `hier ${time}`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export const NotificationDrawer: React.FC = () => {
  const { 
    isNotificationDrawerOpen, 
    setIsNotificationDrawerOpen, 
    notifications, 
    currentUser, 
    markNotificationAsRead, 
    markAllNotificationsAsRead,
    navigateTo
  } = useApp();

  const [prefs, setPrefs] = useState<{ email: boolean; push: boolean } | null>(null);
  useEffect(() => {
    if (isNotificationDrawerOpen && currentUser && isSupabaseEnabled) {
      fetchNotificationPrefs(currentUser.id).then(setPrefs).catch(() => setPrefs(null));
    }
  }, [isNotificationDrawerOpen, currentUser]);

  const togglePref = (key: 'email' | 'push') => {
    if (!prefs || !currentUser) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    saveNotificationPrefs(currentUser.id, { [key]: next[key] }).catch(() => setPrefs(prefs));
  };

  if (!isNotificationDrawerOpen) return null;

  const userNotifications = currentUser 
    ? notifications.filter(n => n.userId === currentUser.id)
    : [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsNotificationDrawerOpen(false)}
          className="absolute inset-0"
        />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-[#F6F9FA]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#00D664]/15 flex items-center justify-center text-[#008A3E]">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-[#0F172A] text-base">Notifications</h3>
            </div>
            <div className="flex items-center gap-2">
              {userNotifications.some(n => !n.read) && (
                <button
                  id="btn-mark-all-read"
                  onClick={markAllNotificationsAsRead}
                  className="text-xs text-[#008A3E] font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Tout lire
                </button>
              )}
              <button
                id="btn-close-notifications"
                onClick={() => setIsNotificationDrawerOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-white">
            {userNotifications.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold text-slate-700">Aucune notification</p>
                <p className="text-xs text-slate-400 mt-0.5">Vous serez alerté lors de vos prochaines séances.</p>
              </div>
            ) : (
              userNotifications.map((notif) => (
                <div
                  key={notif.id}
                  id={`notif-${notif.id}`}
                  onClick={() => {
                    markNotificationAsRead(notif.id);
                    if (notif.relatedBookingId) {
                      setIsNotificationDrawerOpen(false);
                      if (currentUser?.role === 'coach') {
                        navigateTo('coach_bookings');
                      } else {
                        navigateTo('bookings');
                      }
                    }
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    notif.read 
                      ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' 
                      : 'bg-[#00D664]/5 border-[#00D664]/40 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      notif.type === 'booking_confirmed' || notif.type === 'new_booking'
                        ? 'bg-[#00D664]/15 text-[#008A3E]'
                        : notif.type === 'new_review'
                        ? 'bg-amber-100 text-amber-600'
                        : notif.type === 'booking_cancelled'
                        ? 'bg-rose-100 text-rose-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {notif.type.includes('booking') ? (
                        <Calendar className="w-3.5 h-3.5" />
                      ) : notif.type.includes('review') ? (
                        <MessageSquare className="w-3.5 h-3.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-[#0F172A] truncate">{notif.title}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">{formatWhen(notif.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-snug">{notif.message}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Préférences */}
          {prefs && (
            <div className="border-t border-slate-200 bg-[#F6F9FA] p-4 pb-[calc(1rem+var(--sab,0px))] space-y-2">
              <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Recevoir aussi</p>
              {([
                ['push', 'Notifications sur le téléphone', 'Réservations, messages, rappels'],
                ['email', 'Emails', 'Confirmations, annulations, rappel la veille'],
              ] as const).map(([key, label, hint]) => (
                <button
                  key={key}
                  type="button"
                  role="switch"
                  aria-checked={prefs[key]}
                  onClick={() => togglePref(key)}
                  className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <span>
                    <span className="block text-sm font-bold text-[#0F172A]">{label}</span>
                    <span className="block text-[11px] text-slate-500">{hint}</span>
                  </span>
                  <span className={`w-11 h-6 rounded-full p-0.5 transition shrink-0 ${prefs[key] ? 'bg-[#00D664]' : 'bg-slate-300'}`}>
                    <span className={`block w-5 h-5 rounded-full bg-white shadow transition ${prefs[key] ? 'translate-x-5' : ''}`} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
