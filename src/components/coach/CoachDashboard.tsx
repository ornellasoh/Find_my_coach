import React from 'react';
import { Calendar, ChevronRight, MapPin, MessageSquare, ShieldCheck, Star, Video } from 'lucide-react';
import { CampaignBanner } from '../common/CampaignBanner';
import { isSupabaseEnabled } from '../../lib/supabase';
import { Avatar } from '../ui/Avatar';
import { Card, IconTile, Screen, SectionHeader } from '../ui/fmc';
import { useApp } from '../../context/AppContext';

/** « mar. 13 oct. » (ou « Aujourd'hui » / « Demain ») à partir d'une date AAAA-MM-JJ. */
const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === tomorrow.toDateString()) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
};

/** Accueil du coach : la prochaine séance d'abord, puis l'essentiel en un coup d'œil. */
export const CoachDashboard: React.FC = () => {
  const {
    currentUser,
    coaches,
    bookings,
    availabilities,
    reviews,
    navigateTo,
    openBookingDetail,
    setActiveVideoBooking,
    setActiveChatPartner,
    isAdmin,
  } = useApp();

  const coach = coaches.find((c) => c.userId === currentUser?.id) || (isSupabaseEnabled ? undefined : coaches[0]);
  const coachBookings = bookings.filter((b) => b.coachId === coach?.id);
  const upcoming = coachBookings
    .filter((b) => b.bookingStatus === 'confirmed')
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  const next = upcoming[0] || null;
  // Revenus : séances terminées, commission de 15 % déduite
  const earnings = coachBookings.filter((b) => b.bookingStatus === 'completed').reduce((sum, b) => sum + b.price, 0) * 0.85;
  const openSlots = availabilities.filter((a) => a.coachId === coach?.id && !a.isBooked).length;
  const coachReviews = reviews.filter((r) => r.coachId === coach?.id);
  const firstName = (coach?.name || currentUser?.name || '').split(' ')[0];

  const stats = [
    { label: 'Séances à venir', value: String(upcoming.length), onClick: () => navigateTo('coach_bookings') },
    { label: 'Revenus', value: `${earnings.toFixed(0)} €`, onClick: () => navigateTo('coach_financials') },
    {
      label: 'Note',
      value: coach && coach.reviewCount > 0 ? coach.rating.toFixed(1).replace('.', ',') : '–',
      onClick: undefined,
    },
  ];

  return (
    <Screen>
      <header className="flex items-center gap-3 mb-6">
        <span className="relative shrink-0">
          <Avatar src={coach?.photo || currentUser?.avatar} name={coach?.name || currentUser?.name} className="w-12 h-12 rounded-full" />
          {coach?.verificationStatus === 'verified' && (
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-fmc-green text-fmc-navy border-2 border-fmc-bg dark:border-[#0B0F19] flex items-center justify-center" title="Profil vérifié">
              <ShieldCheck className="w-3 h-3" strokeWidth={2.5} />
            </span>
          )}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-slate-500">Bonjour</p>
          <h1 className="text-2xl font-bold tracking-tight leading-tight truncate">{firstName}</h1>
        </div>
      </header>

      {isAdmin && (
        <button
          type="button"
          onClick={() => navigateTo('admin_dashboard')}
          className="w-full mb-4 p-3.5 rounded-3xl bg-fmc-navy text-white flex items-center gap-3 cursor-pointer active:scale-[0.98] transition text-left"
        >
          <span className="w-11 h-11 rounded-2xl bg-fmc-green text-fmc-navy flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-semibold">Administration</span>
            <span className="block text-xs text-slate-300 truncate">Coachs, vérifications, campagnes</span>
          </span>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
      )}

      <CampaignBanner className="mb-4" />

      {/* Prochaine séance */}
      {next ? (
        <section className="rounded-[28px] bg-fmc-navy text-white p-5 mb-4" aria-label="Prochaine séance">
          <p className="text-sm font-semibold text-fmc-green">
            {dayLabel(next.date)} · <span className="tabular-nums">{next.startTime}</span>
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Avatar src={next.clientAvatar} name={next.clientName} className="w-12 h-12 rounded-full" />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold leading-tight truncate">{next.clientName}</h2>
              <p className="text-sm text-slate-300 truncate">{next.sessionType.name}</p>
            </div>
          </div>
          {next.format === 'home' && next.clientAddress && (
            <p className="text-sm text-slate-300 flex items-center gap-1.5 mt-3">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{next.clientAddress}</span>
            </p>
          )}
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => setActiveVideoBooking(next)}
              className="flex-1 h-12 rounded-full bg-fmc-green text-fmc-navy text-[15px] font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition"
            >
              {next.format === 'online' ? <Video className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
              {next.format === 'online' ? 'Rejoindre la visio' : 'Voir le lieu'}
            </button>
            <button
              type="button"
              aria-label={`Écrire à ${next.clientName}`}
              onClick={() => setActiveChatPartner({ id: next.clientId, name: next.clientName, avatar: next.clientAvatar, role: 'client', title: 'Client' })}
              className="w-12 h-12 shrink-0 rounded-full bg-white/10 flex items-center justify-center cursor-pointer active:scale-95 transition"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
          <button type="button" onClick={() => openBookingDetail(next.id)} className="w-full h-11 mt-1 text-sm font-medium text-slate-300 cursor-pointer">
            Voir le détail de la séance
          </button>
        </section>
      ) : (
        <Card className="p-5 mb-4 text-center">
          <p className="font-semibold">Aucune séance à venir</p>
          <p className="text-sm text-slate-500 mt-1">Ouvrez des créneaux pour que vos clients puissent réserver.</p>
          <button
            type="button"
            onClick={() => navigateTo('coach_availabilities')}
            className="mt-4 h-12 px-6 rounded-full bg-fmc-green text-fmc-navy text-[15px] font-semibold cursor-pointer active:scale-[0.98] transition"
          >
            Ouvrir des créneaux
          </button>
        </Card>
      )}

      {/* L'essentiel */}
      <Card className="grid grid-cols-3 divide-x divide-fmc-line/80 dark:divide-slate-800 mb-4">
        {stats.map((s) => {
          const body = (
            <>
              <span className="block text-xl font-bold tabular-nums">{s.value}</span>
              <span className="block text-xs text-slate-500 mt-0.5">{s.label}</span>
            </>
          );
          return s.onClick ? (
            <button key={s.label} type="button" onClick={s.onClick} className="py-4 px-2 text-center cursor-pointer active:opacity-60 transition">
              {body}
            </button>
          ) : (
            <div key={s.label} className="py-4 px-2 text-center">{body}</div>
          );
        })}
      </Card>

      {/* Mes créneaux */}
      <Card onClick={() => navigateTo('coach_availabilities')} role="button" className="p-3.5 mb-6 flex items-center gap-3 cursor-pointer active:scale-[0.98]">
        <IconTile><Calendar className="w-5 h-5" /></IconTile>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold">Mes créneaux</span>
          <span className="block text-sm text-slate-500 tabular-nums">
            {openSlots > 0 ? `${openSlots} créneau${openSlots > 1 ? 'x' : ''} ouvert${openSlots > 1 ? 's' : ''}` : 'Aucun créneau ouvert'}
          </span>
        </span>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </Card>

      {/* Derniers avis */}
      {coachReviews.length > 0 && (
        <section>
          <SectionHeader title="Derniers avis" />
          <div className="space-y-2.5">
            {coachReviews.slice(0, 2).map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold truncate">{r.clientName}</span>
                  <span className="flex items-center gap-1 text-sm font-semibold tabular-nums shrink-0">
                    <Star className="w-4 h-4 fill-fmc-green text-fmc-green" />
                    {String(r.rating).replace('.', ',')}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-normal mt-1.5">{r.comment}</p>
              </Card>
            ))}
          </div>
        </section>
      )}
    </Screen>
  );
};
