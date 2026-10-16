import React from 'react';
import { Capacitor } from '@capacitor/core';
import { useApp, type AppScreen as Screen } from '../../context/AppContext';
import { useUnreadMessages } from '../../lib/unread';
import {
  Home,
  Search,
  Calendar,
  User,
  LayoutDashboard,
  Users,
  Settings,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
  screen: Screen;
  /** Écrans qui allument aussi cet onglet */
  also?: Screen[];
  badge?: number;
  /** Pastille rouge (messages non lus) plutôt que verte */
  alert?: boolean;
}

/** Android suit Material 3 (barre pleine largeur) ; iPhone et web suivent iOS 26 (capsule flottante). */
const isAndroid = Capacitor.getPlatform() === 'android';

export const BottomNav: React.FC = () => {
  const { currentScreen, navigateTo, currentUser, bookings, coaches } = useApp();

  const role = currentUser?.role || 'client';
  const unreadMessages = useUnreadMessages(currentUser?.id);

  // Pas de barre sur l'accueil, la connexion et le tunnel de réservation
  if (['onboarding', 'auth', 'coach_profile', 'booking_calendar', 'checkout', 'confirmation'].includes(currentScreen)) {
    return null;
  }

  // Séances confirmées à venir : pastille de l'onglet Réservations / Planning
  const myCoachId = coaches.find((c) => c.userId === currentUser?.id)?.id;
  const upcoming = bookings.filter(
    (b) => (role === 'coach' ? b.coachId === myCoachId : b.clientId === currentUser?.id) && b.bookingStatus === 'confirmed',
  ).length;

  const messages: Tab = { id: role === 'coach' ? 'nav-coach-messages' : 'nav-messages', label: 'Messages', icon: MessageSquare, screen: 'messages', badge: unreadMessages, alert: true };
  const tabs: Tab[] =
    role === 'coach'
      ? [
          { id: 'nav-coach-dashboard', label: 'Accueil', icon: LayoutDashboard, screen: 'coach_dashboard', also: ['coach_stats'] },
          { id: 'nav-coach-bookings', label: 'Planning', icon: Calendar, screen: 'coach_bookings', also: ['coach_availabilities'], badge: upcoming },
          messages,
          { id: 'nav-coach-clients', label: 'Clients', icon: Users, screen: 'coach_clients' },
          // 5 onglets au plus (recommandation Apple) : les revenus se consultent depuis le Profil et l'Accueil
          { id: 'nav-coach-profile-edit', label: 'Profil', icon: Settings, screen: 'coach_profile_edit', also: ['coach_financials'] },
        ]
      : [
          { id: 'nav-home', label: 'Accueil', icon: Home, screen: 'home' },
          { id: 'nav-explorer', label: 'Rechercher', icon: Search, screen: 'search' },
          { id: 'nav-reservations', label: 'Réservations', icon: Calendar, screen: 'bookings', badge: upcoming },
          messages,
          { id: 'nav-profile', label: 'Profil', icon: User, screen: 'profile' },
        ];

  const isActive = (t: Tab) => currentScreen === t.screen || !!t.also?.includes(currentScreen);

  const badge = (t: Tab) =>
    t.badge && t.badge > 0 ? (
      <span
        className={`absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold tabular-nums flex items-center justify-center ${
          t.alert ? 'bg-rose-500 text-white' : 'bg-fmc-green text-fmc-navy'
        }`}
      >
        {t.badge > 99 ? '99+' : t.badge}
        <span className="sr-only">
          {t.alert ? ` message${t.badge > 1 ? 's' : ''} non lu${t.badge > 1 ? 's' : ''}` : ` séance${t.badge > 1 ? 's' : ''} à venir`}
        </span>
      </span>
    ) : null;

  const navId = role === 'coach' ? 'coach-bottom-navigation' : 'client-bottom-navigation';

  // ---------- Android : barre de navigation Material 3 ----------
  if (isAndroid) {
    return (
      <nav id={navId} aria-label="Navigation principale" className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-[#EEF2F5] dark:bg-[#151B27] pt-3 pb-[calc(0.75rem+var(--sab))]">
        <ul className="flex">
          {tabs.map((t) => {
            const active = isActive(t);
            const Icon = t.icon;
            return (
              <li key={t.id} className="flex-1 min-w-0">
                <button
                  id={t.id}
                  type="button"
                  onClick={() => navigateTo(t.screen)}
                  aria-current={active ? 'page' : undefined}
                  className="w-full flex flex-col items-center gap-1 cursor-pointer"
                >
                  <span className={`relative w-14 h-8 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-[#C8F5DC] dark:bg-fmc-green/25 text-fmc-green-ink dark:text-fmc-green' : 'text-slate-600 dark:text-slate-400'}`}>
                    <span className="relative">
                      <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
                      {badge(t)}
                    </span>
                  </span>
                  <span className={`text-[12px] leading-4 tracking-tight truncate max-w-full ${active ? 'font-bold text-fmc-navy dark:text-white' : 'font-semibold text-slate-600 dark:text-slate-400'}`}>{t.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  // ---------- iPhone et web : capsule flottante translucide (iOS 26) ----------
  return (
    <>
      {/* Fondu en bas de l'écran : sépare le contenu de la barre sans trait */}
      <div aria-hidden="true" className="fmc-tabbar-fade fixed bottom-0 left-0 right-0 max-w-md mx-auto h-[calc(6.5rem+var(--sab))] z-30 pointer-events-none" />
      <nav
        id={navId}
        aria-label="Navigation principale"
        className="fmc-tabbar fixed left-2 right-2 bottom-[calc(0.5rem+var(--sab))] max-w-[calc(28rem-1rem)] mx-auto h-16 rounded-full z-40 px-1.5"
      >
        <ul className="flex h-full">
          {tabs.map((t) => {
            const active = isActive(t);
            const Icon = t.icon;
            return (
              <li key={t.id} className="flex-1 min-w-0 flex">
                <button
                  id={t.id}
                  type="button"
                  onClick={() => navigateTo(t.screen)}
                  aria-current={active ? 'page' : undefined}
                  className={`apple-press flex-1 min-w-0 my-1.5 rounded-full flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                    active ? 'bg-fmc-green/15 dark:bg-fmc-green/20 text-[#007A3D] dark:text-fmc-green' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className="relative">
                    <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
                    {badge(t)}
                  </span>
                  <span className={`text-[10px] leading-[13px] truncate max-w-full px-0.5 ${active ? 'font-bold' : 'font-semibold'}`}>{t.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};
