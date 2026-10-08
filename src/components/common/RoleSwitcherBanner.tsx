import React from 'react';
import { useApp } from '../../context/AppContext';
import { UserCheck, Shield, Briefcase, RefreshCw, Bell, User, Sun, Moon } from 'lucide-react';
import { LogoIcon } from './Logo';
import { Capacitor } from '@capacitor/core';

export const RoleSwitcherBanner: React.FC = () => {
  const { 
    currentUser, 
    loginAs, 
    resetAllData, 
    currentScreen, 
    navigateTo, 
    unreadNotificationsCount,
    setIsNotificationDrawerOpen,
    isDarkMode,
    toggleDarkMode
  } = useApp();

  // Barre de démo/QA : affichée sur le web uniquement, pas dans l'app iPhone/Android
  if (Capacitor.isNativePlatform()) return null;

  return (
    <div id="role-switcher-banner" className="bg-[#004022] text-white text-xs border-b border-[#055B33] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 z-50 sticky top-0 shadow-sm">
      <div className="flex items-center gap-2 font-medium">
        <LogoIcon size={18} variant="dark" />
        <span className="font-extrabold text-white text-[11px] tracking-tight">
          Find My Coach
        </span>
        <span className="text-slate-400 text-[10px] hidden sm:inline">•</span>
        <span className="font-medium text-slate-300 text-[11px]">
          {currentUser ? `${currentUser.name} (${currentUser.role === 'client' ? 'Client' : currentUser.role === 'coach' ? 'Coach' : 'Admin'})` : 'Visiteur'}
        </span>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <button
          id="btn-switch-client"
          onClick={() => loginAs('client')}
          className={`px-2 py-1 rounded-md transition flex items-center gap-1 text-[11px] ${
            currentUser?.role === 'client' 
              ? 'bg-[#00D664] text-[#0F172A] font-bold shadow-sm' 
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Se connecter en tant qu'Alex Rivers (Client)"
        >
          <User className="w-3.5 h-3.5" />
          <span>Alex</span>
        </button>

        <button
          id="btn-switch-coach"
          onClick={() => loginAs('coach')}
          className={`px-2 py-1 rounded-md transition flex items-center gap-1 text-[11px] ${
            currentUser?.role === 'coach' 
              ? 'bg-[#00D664] text-[#0F172A] font-bold shadow-sm' 
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Se connecter en tant que Marcus Thorne (Coach)"
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Marcus</span>
        </button>

        <button
          id="btn-switch-admin"
          onClick={() => loginAs('admin')}
          className={`px-2 py-1 rounded-md transition flex items-center gap-1 text-[11px] ${
            currentUser?.role === 'admin' 
              ? 'bg-[#00D664] text-[#0F172A] font-bold shadow-sm' 
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Se connecter en tant qu'Admin"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Admin</span>
        </button>

        <button
          id="btn-switch-onboarding"
          onClick={() => navigateTo('onboarding')}
          className={`px-2 py-1 rounded-md transition flex items-center gap-1 text-[11px] ${
            currentScreen === 'onboarding'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Voir l'onboarding initial"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Intro</span>
        </button>

        {currentUser && (
          <button
            id="btn-open-notifications-banner"
            onClick={() => setIsNotificationDrawerOpen(true)}
            className="p-1.5 text-slate-300 hover:text-white relative rounded-md hover:bg-slate-800 transition"
            title="Notifications in-app"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#00D664] rounded-full ring-2 ring-[#0F172A]" />
            )}
          </button>
        )}

        <button
          id="btn-toggle-dark-mode"
          onClick={toggleDarkMode}
          className="p-1.5 text-amber-300 hover:text-white rounded-md hover:bg-slate-800 transition ml-0.5 cursor-pointer"
          title={isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre (Dark Mode)'}
        >
          {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        <button
          id="btn-reset-demo"
          onClick={() => {
            if (window.confirm('Réinitialiser toutes les données de démo (coachs, réservations, avis) ?')) {
              resetAllData();
            }
          }}
          className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition ml-0.5"
          title="Réinitialiser les données de démo"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
