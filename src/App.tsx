/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { RoleSwitcherBanner } from './components/common/RoleSwitcherBanner';
import { BottomNav } from './components/common/BottomNav';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { NewPasswordModal } from './components/common/NewPasswordModal';
import { ReviewModal } from './components/common/ReviewModal';
import { VideoCallRoom } from './components/common/VideoCallRoom';
import { ChatModal } from './components/common/ChatModal';
import { MessagesInbox } from './components/common/MessagesInbox';
import { useCampaignEffects } from './lib/campaign';
import { BookingDetail } from './components/common/BookingDetail';
import { AnimatePresence } from 'motion/react';
import { LogoIcon } from './components/common/Logo';

// Screens
import { Onboarding } from './components/Onboarding';
import { HomeDashboard } from './components/client/HomeDashboard';
import { CoachSearch } from './components/client/CoachSearch';
import { CoachProfileView } from './components/client/CoachProfileView';
import { BookingCalendar } from './components/client/BookingCalendar';
import { CheckoutPayment } from './components/client/CheckoutPayment';
import { BookingConfirmation } from './components/client/BookingConfirmation';
import { ClientBookings } from './components/client/ClientBookings';
import { ProgressDashboard } from './components/client/ProgressDashboard';
import { UserProfileSettings } from './components/client/UserProfileSettings';
import { WorkoutProgramsView } from './components/client/WorkoutProgramsView';

// Coach Screens
import { CoachDashboard } from './components/coach/CoachDashboard';
import { CoachAvailabilityManager } from './components/coach/CoachAvailabilityManager';
import { CoachProfileEditor } from './components/coach/CoachProfileEditor';
import { CoachBookings } from './components/coach/CoachBookings';
import { CoachFinancials } from './components/coach/CoachFinancials';
import { CoachClients } from './components/coach/CoachClients';

// Admin Screen
import { AdminDashboard } from './components/admin/AdminDashboard';

const MainRouter: React.FC = () => {
  useCampaignEffects(); // campagne en cours : logo teinté + icône du téléphone
  const { currentScreen, activeVideoBooking, setActiveVideoBooking, activeChatPartner, setActiveChatPartner, authLoading, isAdmin, loadError, retryLoad, logout } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-fmc-bg dark:bg-[#0B0F19] flex flex-col items-center justify-center gap-6">
        <div className="w-24 h-24 rounded-[28px] bg-fmc-dark flex items-center justify-center shadow-[0_0_50px_rgba(0,214,100,0.4)]">
          <LogoIcon size={54} />
        </div>
        <span className="w-6 h-6 rounded-full border-[3px] border-fmc-green/30 border-t-fmc-green animate-spin" aria-label="Chargement" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 flex flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="w-20 h-20 rounded-[24px] bg-fmc-dark flex items-center justify-center">
          <LogoIcon size={44} />
        </div>
        <p className="text-lg font-semibold">Chargement impossible</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">{loadError}</p>
        <button onClick={retryLoad} className="min-h-12 px-6 rounded-full bg-fmc-green text-fmc-navy font-bold cursor-pointer">
          Réessayer
        </button>
        <button onClick={logout} className="min-h-11 px-6 rounded-full text-sm font-semibold text-slate-500 cursor-pointer">
          Se déconnecter
        </button>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'onboarding':
      case 'auth':
        return <Onboarding />;
      case 'home':
        return <HomeDashboard />;
      case 'search':
        return <CoachSearch />;
      case 'coach_profile':
        return <CoachProfileView />;
      case 'booking_calendar':
        return <BookingCalendar />;
      case 'checkout':
        return <CheckoutPayment />;
      case 'confirmation':
        return <BookingConfirmation />;
      case 'bookings':
        return <ClientBookings />;
      case 'progress':
        return <ProgressDashboard />;
      case 'workout_programs':
        return <WorkoutProgramsView />;
      case 'profile':
        return <UserProfileSettings />;
      case 'coach_dashboard':
        return <CoachDashboard />;
      case 'coach_availabilities':
        return <CoachAvailabilityManager />;
      case 'coach_profile_edit':
        return <CoachProfileEditor />;
      case 'coach_bookings':
        return <CoachBookings />;
      case 'coach_financials':
        return <CoachFinancials />;
      case 'coach_clients':
        return <CoachClients />;
      case 'booking_detail':
        return <BookingDetail />;
      case 'messages':
        return <MessagesInbox />;
      case 'admin_dashboard':
        // Écran réservé : en ligne, `isAdmin` vient du serveur ; les données restent protégées par la base (RLS)
        return isAdmin ? <AdminDashboard /> : <HomeDashboard />;
      default:
        return <HomeDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#EAEFF2] dark:bg-[#060911] text-[#0F172A] dark:text-slate-100 flex flex-col justify-start items-center selection:bg-[#00D664]/30 selection:text-[#00B050] transition-colors duration-200">
      {/* Mobile-first centered frame on wide screens */}
      <div className="w-full max-w-md min-h-screen bg-[#F6F9FA] dark:bg-[#0B0F19] border-x border-slate-200/80 dark:border-slate-800 flex flex-col relative shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
        {/* Top Developer & QA evaluation bar */}
        <RoleSwitcherBanner />

        {/* Dynamic App Content */}
        <main className="flex-1 w-full relative bg-[#F6F9FA] dark:bg-[#0B0F19]">
          {renderScreen()}
        </main>

        {/* Bottom Navigation */}
        <BottomNav />

        {/* Notification Drawer */}
        <NotificationDrawer />
        <NewPasswordModal />

        {/* Review & Rating Modal */}
        <ReviewModal />

        {/* Accès rapide à une séance (lien de visio externe, consignes) */}
        <AnimatePresence>
          {activeVideoBooking && (
            <VideoCallRoom
              booking={activeVideoBooking}
              onClose={() => setActiveVideoBooking(null)}
            />
          )}
        </AnimatePresence>

        {/* Apple iMessage Style Chat Modal */}
        <AnimatePresence>
          {activeChatPartner && (
            <ChatModal
              partner={activeChatPartner}
              onClose={() => setActiveChatPartner(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}
