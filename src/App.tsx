/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { RoleSwitcherBanner } from './components/common/RoleSwitcherBanner';
import { BottomNav } from './components/common/BottomNav';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { ReviewModal } from './components/common/ReviewModal';
import { VideoCallRoom } from './components/common/VideoCallRoom';
import { ChatModal } from './components/common/ChatModal';
import { AnimatePresence } from 'motion/react';

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
import { CoachAIAgentView } from './components/coach/CoachAIAgentView';

// Admin Screen
import { AdminDashboard } from './components/admin/AdminDashboard';

const MainRouter: React.FC = () => {
  const { currentScreen, activeVideoBooking, setActiveVideoBooking, activeChatPartner, setActiveChatPartner } = useApp();

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
      case 'coach_ai_agent':
        return <CoachAIAgentView />;
      case 'admin_dashboard':
        return <AdminDashboard />;
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

        {/* Review & Rating Modal */}
        <ReviewModal />

        {/* Apple Video Call Room */}
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
