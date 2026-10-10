import React, { useState } from 'react';
import { ThemePicker } from '../common/ThemePicker';
import { DeleteAccount } from '../common/DeleteAccount';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Camera, 
  Heart, 
  Calendar, 
  Target, 
  User, 
  Bell, 
  CreditCard, 
  Briefcase, 
  HelpCircle, 
  LogOut, 
  ChevronRight, 
  Check, 
  Shield, 
  Lock,
  Sparkles,
  Moon,
  Sun,
  Dumbbell,
  ChevronLeft,
  UserPen
} from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from '../common/Logo';
import { Card, IconTile, SectionHeader, formatDateFr } from '../ui/fmc';

export const UserProfileSettings: React.FC = () => {
  const { 
    currentUser, 
    updateUserProfile, 
    logout, 
    loginAs, 
    favorites, 
    bookings, 
    goals, 
    navigateTo, 
    goBack,
    setIsNotificationDrawerOpen,
    isDarkMode,
    toggleDarkMode,
    isOnline
  } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || 'Alex Dupont');
  const [email, setEmail] = useState(currentUser?.email || 'alex.dupont@gmail.com');
  const [phone, setPhone] = useState(currentUser?.phone || '+33 6 12 34 56 78');

  const clientBookingsCount = bookings.filter(
    b => b.clientId === currentUser?.id && b.bookingStatus === 'completed'
  ).length;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({ name, email, phone });
    setIsEditing(false);
  };

  const myBookings = bookings.filter((b) => b.clientId === currentUser?.id);
  const pastBookings = myBookings.filter((b) => b.bookingStatus === 'completed').slice(0, 2);
  const coachesCount = new Set(myBookings.map((b) => b.coachId)).size;
  const avgProgress = goals.length
    ? Math.round(goals.reduce((sum, g) => sum + Math.min(100, g.percentage), 0) / goals.length)
    : 0;
  const memberSince = currentUser?.memberSince || (currentUser?.createdAt ? currentUser.createdAt.slice(0, 4) : '2025');

  const Row: React.FC<{
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onClick?: () => void;
    trailing?: React.ReactNode;
    id?: string;
  }> = ({ icon, title, subtitle, onClick, trailing, id }) => (
    <Card id={id} onClick={onClick} className={`p-4 flex items-center gap-4 ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}>
      <IconTile>{icon}</IconTile>
      <span className="flex-1 min-w-0">
        <span className="font-semibold block">{title}</span>
        {subtitle && <span className="text-sm text-slate-500 block truncate">{subtitle}</span>}
      </span>
      {trailing ?? <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />}
    </Card>
  );

  return (
    <div className="min-h-screen bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 pb-32 max-w-md mx-auto relative">
      <div className="absolute inset-x-0 top-0 h-80 bg-linear-to-b from-[#C9F5DE] to-fmc-bg dark:from-[#0F3B26] dark:to-[#0B0F19] pointer-events-none" />

      <div className="relative px-5 pt-4">
        <header className="flex items-center justify-between mb-2">
          <button onClick={goBack} aria-label="Retour" className="w-11 h-11 flex items-center justify-center cursor-pointer">
            <ChevronLeft className="w-7 h-7" />
          </button>
          <button
            onClick={() => setIsEditing(true)}
            aria-label="Modifier le profil"
            className="w-11 h-11 flex items-center justify-center text-fmc-green-ink cursor-pointer"
          >
            <UserPen className="w-6 h-6" />
          </button>
        </header>

        <div className="text-center">
          <button onClick={() => setIsEditing(true)} className="relative inline-block cursor-pointer" aria-label="Modifier la photo">
            <span className="block p-1 rounded-full bg-fmc-green">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                alt={currentUser?.name || 'Avatar'}
                className="w-28 h-28 rounded-full object-cover border-4 border-fmc-dark"
              />
            </span>
            <span className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-white text-fmc-navy flex items-center justify-center shadow">
              <Camera className="w-4 h-4" />
            </span>
          </button>
          <h1 className="text-[34px] font-semibold tracking-tight mt-3">{currentUser?.name || 'Alex Rivers'}</h1>
          <p className="text-base text-slate-500 mt-1">
            {currentUser?.isPremium ? 'Membre Premium' : 'Membre'} depuis {memberSince}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { id: 'btn-profile-bookings', value: clientBookingsCount + 2, label: 'Séances', go: () => navigateTo('bookings') },
            { id: 'btn-profile-coaches', value: coachesCount || favorites.length, label: 'Coachs', go: () => navigateTo('search') },
            { id: 'btn-profile-goals', value: `${avgProgress}%`, label: 'Progression', go: () => navigateTo('progress') },
          ].map((stat) => (
            <Card key={stat.label} id={stat.id} onClick={stat.go} className="py-4 text-center cursor-pointer active:scale-[0.98]">
              <span className="text-2xl font-semibold text-fmc-green-ink tabular-nums block">{stat.value}</span>
              <span className="text-sm text-slate-500">{stat.label}</span>
            </Card>
          ))}
        </div>

        <SectionHeader title="Paramètres du compte" accent className="mt-8" />
        <div className="space-y-3">
          <Row icon={<User className="w-5 h-5" />} title="Informations personnelles" subtitle="Nom, email et téléphone" onClick={() => setIsEditing(true)} />
          <Row icon={<Bell className="w-5 h-5" />} title="Notifications" subtitle="Gérer les alertes et rappels" onClick={() => setIsNotificationDrawerOpen(true)} />
          <Row icon={<Dumbbell className="w-5 h-5" />} title="Mon programme" subtitle="Entraînement personnalisé" onClick={() => navigateTo('workout_programs')} />
          <ThemePicker />
        </div>

        {pastBookings.length > 0 && (
          <>
            <SectionHeader title="Réservations passées" accent action="Voir tout" onAction={() => navigateTo('bookings')} className="mt-8" />
            <div className="space-y-3">
              {pastBookings.map((b) => (
                <Card key={b.id} className="p-4 flex items-center gap-4">
                  <img src={b.coachPhoto} alt={b.coachName} className="w-16 h-16 rounded-2xl object-cover bg-slate-100 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="font-semibold block truncate">{b.coachName}</span>
                    <span className="text-sm text-slate-500 block tabular-nums">
                      {formatDateFr(b.date, { day: '2-digit', month: '2-digit', year: 'numeric' })} • {b.startTime}
                    </span>
                    <span className="text-sm text-slate-500 block truncate">{b.sessionType.name}</span>
                  </span>
                  <span className="self-start px-2.5 py-1 rounded-lg bg-fmc-dark text-fmc-green text-[11px] font-bold uppercase tracking-wide shrink-0">
                    Terminé
                  </span>
                </Card>
              ))}
            </div>
          </>
        )}

        <SectionHeader title="Préférences et sécurité" accent className="mt-8" />
        <div className="space-y-3">
          <Row
            icon={<Briefcase className="w-5 h-5" />}
            title={isOnline && currentUser?.role === 'client' ? 'Devenir coach' : 'Espace coach'}
            subtitle={isOnline && currentUser?.role === 'client' ? 'Proposez vos séances sur Find My Coach' : 'Gérer créneaux, clients et revenus'}
            onClick={() => loginAs('coach')}
          />
          {(!isOnline || currentUser?.role === 'admin') && (
            <Row icon={<Shield className="w-5 h-5" />} title="Administration" subtitle="Accès réservé à l'équipe" onClick={() => loginAs('admin')} />
          )}
          <Row
            icon={<HelpCircle className="w-5 h-5" />}
            title="Centre d'assistance"
            subtitle="contact@findmycoach.io"
            onClick={() => window.open('mailto:contact@findmycoach.io', '_blank')}
          />
        </div>

        <button
          id="btn-logout"
          onClick={logout}
          className="w-full h-14 mt-8 rounded-full border border-rose-300 text-rose-500 font-semibold flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.99] transition"
        >
          <LogOut className="w-5 h-5" />
          Se déconnecter
        </button>
        <DeleteAccount className="mt-2" />

        <div className="py-8 flex flex-col items-center gap-1 opacity-80">
          <Logo size="sm" showTagline={true} />
          <span className="text-xs text-slate-400 mt-1">Version 1.0.0</span>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[28px] p-6 w-full max-w-sm shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-semibold">Informations personnelles</h3>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1.5">Nom complet</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-12 px-4 bg-fmc-bg dark:bg-slate-800 text-[15px] rounded-2xl focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1.5">Adresse email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 px-4 bg-fmc-bg dark:bg-slate-800 text-[15px] rounded-2xl focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1.5">Numéro de téléphone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-12 px-4 bg-fmc-bg dark:bg-slate-800 text-[15px] rounded-2xl focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 h-12 bg-slate-100 dark:bg-slate-800 font-semibold rounded-full text-sm cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 bg-fmc-green text-fmc-navy font-bold rounded-full text-sm cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
