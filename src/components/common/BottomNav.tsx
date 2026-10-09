import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Home, 
  Compass, 
  Calendar, 
  User, 
  LayoutDashboard, 
  Clock, 
  Wallet, 
  Activity, 
  Users,
  Settings,
  Sparkles
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { currentScreen, navigateTo, currentUser, bookings, coaches } = useApp();

  const role = currentUser?.role || 'client';

  // Do not show bottom nav on splash, checkout, or confirmation screens
  if (['onboarding', 'auth', 'coach_profile', 'booking_calendar', 'checkout', 'confirmation'].includes(currentScreen)) {
    return null;
  }

  // Count active bookings for badge
  const myCoachId = coaches.find(c => c.userId === currentUser?.id)?.id;
  const upcomingBookingsCount = bookings.filter(
    b => (role === 'coach' ? b.coachId === myCoachId : b.clientId === currentUser?.id) && b.bookingStatus === 'confirmed'
  ).length;

  if (role === 'coach') {
    return (
      <nav id="coach-bottom-navigation" className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-fmc-line/70 dark:border-slate-800 z-40 px-2 pt-3 pb-[calc(0.5rem+var(--sab))] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] transition-colors">
        <div className="flex items-center justify-around">
          <button
            id="nav-coach-dashboard"
            onClick={() => navigateTo('coach_dashboard')}
            className={`flex flex-col items-center gap-1 transition-colors relative py-1 px-1.5 ${
              currentScreen === 'coach_dashboard' ? 'text-fmc-green-ink dark:text-fmc-green font-semibold' : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <LayoutDashboard className="w-6 h-6" strokeWidth={2} />
            <span className="text-[11px]">Dashboard</span>
          </button>

          <button
            id="nav-coach-bookings"
            onClick={() => navigateTo('coach_bookings')}
            className={`flex flex-col items-center gap-1 transition-colors relative py-1 px-1.5 ${
              currentScreen === 'coach_bookings' || currentScreen === 'coach_availabilities' ? 'text-fmc-green-ink dark:text-fmc-green font-semibold' : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <div className="relative">
              <Calendar className="w-6 h-6" strokeWidth={2} />
              {upcomingBookingsCount > 0 && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-[#00D664] text-[#0F172A] text-[9px] font-black rounded-full flex items-center justify-center">
                  {upcomingBookingsCount}
                </span>
              )}
            </div>
            <span className="text-[11px]">Planning</span>
            {(currentScreen === 'coach_bookings' || currentScreen === 'coach_availabilities') && (
              <span className="absolute -bottom-1 w-4 h-0.5 bg-[#00D664] rounded-full" />
            )}
          </button>

          <button
            id="nav-coach-ai-agent"
            onClick={() => navigateTo('coach_ai_agent')}
            className={`flex flex-col items-center gap-1 transition-colors relative py-1 px-1.5 ${
              currentScreen === 'coach_ai_agent' ? 'text-fmc-green-ink dark:text-fmc-green font-semibold' : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <div className="relative">
              <Sparkles className="w-5 h-5 stroke-[2.2] text-[#008A3E] dark:text-[#00D664]" />
              <span className="absolute -top-1 -right-1.5 w-2 h-2 bg-[#00D664] rounded-full animate-pulse" />
            </div>
            <span className="text-[10px] tracking-tight font-extrabold text-[#008A3E] dark:text-[#00D664]">Agent IA</span>
          </button>

          <button
            id="nav-coach-clients"
            onClick={() => navigateTo('coach_clients')}
            className={`flex flex-col items-center gap-1 transition-colors relative py-1 px-1.5 ${
              currentScreen === 'coach_clients' ? 'text-fmc-green-ink dark:text-fmc-green font-semibold' : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <Users className="w-6 h-6" strokeWidth={2} />
            <span className="text-[11px]">Clients</span>
          </button>

          <button
            id="nav-coach-financials"
            onClick={() => navigateTo('coach_financials')}
            className={`flex flex-col items-center gap-1 transition-colors relative py-1 px-1.5 ${
              currentScreen === 'coach_financials' ? 'text-fmc-green-ink dark:text-fmc-green font-semibold' : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <Wallet className="w-6 h-6" strokeWidth={2} />
            <span className="text-[11px]">Revenus</span>
          </button>

          <button
            id="nav-coach-profile-edit"
            onClick={() => navigateTo('coach_profile_edit')}
            className={`flex flex-col items-center gap-1 transition-colors relative py-1 px-1.5 ${
              currentScreen === 'coach_profile_edit' ? 'text-fmc-green-ink dark:text-fmc-green font-semibold' : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <Settings className="w-6 h-6" strokeWidth={2} />
            <span className="text-[11px]">Profil</span>
          </button>
        </div>
      </nav>
    );
  }

  // Client Navigation
  return (
    <nav id="client-bottom-navigation" className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-fmc-line/70 dark:border-slate-800 z-40 px-2 pt-3 pb-[calc(0.5rem+var(--sab))] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] transition-colors">
      <div className="flex items-center justify-around">
        <button
          id="nav-home"
          onClick={() => navigateTo('home')}
          className={`flex flex-col items-center gap-1 transition-colors relative py-1 px-2 ${
            currentScreen === 'home' ? 'text-fmc-green-ink dark:text-fmc-green font-semibold' : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <Home className="w-6 h-6" strokeWidth={2} />
          <span className="text-[11px]">Accueil</span>
        </button>

        <button
          id="nav-explorer"
          onClick={() => navigateTo('search')}
          className={`flex flex-col items-center gap-1 transition-colors relative py-1 px-2 ${
            currentScreen === 'search' ? 'text-fmc-green-ink dark:text-fmc-green font-semibold' : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <Compass className="w-6 h-6" strokeWidth={2} />
          <span className="text-[11px]">Explorer</span>
        </button>

        <button
          id="nav-reservations"
          onClick={() => navigateTo('bookings')}
          className={`flex flex-col items-center gap-1 transition-colors relative py-1 px-2 ${
            currentScreen === 'bookings' ? 'text-fmc-green-ink dark:text-fmc-green font-semibold' : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <div className="relative">
            <Calendar className="w-6 h-6" strokeWidth={2} />
            {upcomingBookingsCount > 0 && (
              <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-[#00D664] text-[#0F172A] text-[9px] font-black rounded-full flex items-center justify-center">
                {upcomingBookingsCount}
              </span>
            )}
          </div>
          <span className="text-[11px]">Réservations</span>
        </button>

        <button
          id="nav-progression"
          onClick={() => navigateTo('progress')}
          className={`flex flex-col items-center gap-1 transition-colors relative py-1 px-2 ${
            currentScreen === 'progress' ? 'text-fmc-green-ink dark:text-fmc-green font-semibold' : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <Activity className="w-6 h-6" strokeWidth={2} />
          <span className="text-[11px]">Progression</span>
        </button>

        <button
          id="nav-profile"
          onClick={() => navigateTo('profile')}
          className={`flex flex-col items-center gap-1 transition-colors relative py-1 px-2 ${
            currentScreen === 'profile' ? 'text-fmc-green-ink dark:text-fmc-green font-semibold' : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <User className="w-6 h-6" strokeWidth={2} />
          <span className="text-[11px]">Profil</span>
        </button>
      </div>
    </nav>
  );
};
