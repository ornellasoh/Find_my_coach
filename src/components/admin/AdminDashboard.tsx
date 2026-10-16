import { AdminCampaign } from './AdminCampaign';
import { AdminTeam } from './AdminTeam';
import { AdminBeta } from './AdminBeta';
import React, { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { ThemePicker } from '../common/ThemePicker';
import { useApp } from '../../context/AppContext';
import { Chip, ScreenHeader, formatEuro, formatDateFr } from '../ui/fmc';
import { 
  Shield, 
  Users, 
  DollarSign, 
  Star, 
  EyeOff, 
  Eye, 
  CheckCircle, 
  AlertTriangle, 
  ArrowLeft, 
  RefreshCw,
  Award
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { AdminIssues, AdminVerifications } from './AdminModeration';
import { AdminStatsCards } from './AdminStatsCards';

export const AdminDashboard: React.FC = () => {
  const { 
    coaches, 
    bookings, 
    reviews, 
    toggleReviewVisibility, 
    toggleCoachActiveStatus, 
    resetAllData, 
    goBack,
    isOnline,
    logout,
    loginAs
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'coaches' | 'reviews' | 'bookings' | 'verif' | 'issues' | 'campaign' | 'team' | 'beta'>('overview');


  return (
    <div className="min-h-screen bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 pb-32 max-w-md mx-auto px-5 pt-4">
      <ScreenHeader
        title="Administration"
        onBack={goBack}
        right={
          isOnline ? undefined : (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Réinitialiser toutes les données de test aux valeurs par défaut ?')) resetAllData();
              }}
              aria-label="Réinitialiser les données de test"
              className="apple-press w-11 h-11 rounded-full flex items-center justify-center text-rose-500 cursor-pointer"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )
        }
      />

      {/* Chiffres réels (serveur), jamais estimés */}
      <AdminStatsCards localBookings={bookings} localCoaches={coaches} />

      {/* Rubriques : puces qui défilent (même code que l'écran Rechercher) */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 mb-4" role="tablist" aria-label="Rubriques">
        {([
          ['coaches', `Coachs (${coaches.length})`],
          ['reviews', `Avis (${reviews.length})`],
          ['bookings', `Réservations (${bookings.length})`],
          ['verif', 'Vérifications'],
          ['issues', 'Signalements'],
          ['beta', 'Bêta-testeurs'],
          ['campaign', 'Campagne'],
          ['team', 'Équipe'],
        ] as const).map(([id, label]) => (
          <Chip key={id} role="tab" aria-selected={activeTab === id} active={activeTab === id} onClick={() => setActiveTab(id)}>
            {label}
          </Chip>
        ))}
      </div>

      {activeTab === 'verif' && <AdminVerifications />}
      {activeTab === 'issues' && <AdminIssues />}
      {activeTab === 'campaign' && <AdminCampaign />}
      {activeTab === 'beta' && (isOnline ? <AdminBeta /> : <p className="text-sm text-slate-500 mb-6">Disponible en ligne uniquement.</p>)}
      {activeTab === 'team' && (isOnline ? <AdminTeam /> : <p className="text-sm text-slate-500 mb-6">Disponible en ligne uniquement.</p>)}

      {/* Tab: Coaches Moderation */}
      {activeTab === 'coaches' && (
        <div className="space-y-3">
          {coaches.map((coach) => (
            <div key={coach.id} className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar src={coach.photo} name={coach.name} className="w-12 h-12 rounded-xl border border-slate-200" />
                <div>
                  <h3 className="font-bold text-fmc-navy text-sm">{coach.name}</h3>
                  <p className="text-xs text-slate-500">{coach.title} • {coach.hourlyRate}€/h</p>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{coach.reviewCount ? `${coach.rating} (${coach.reviewCount} avis)` : 'Aucun avis'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => toggleCoachActiveStatus(coach.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  coach.isActive
                    ? 'bg-fmc-green/15 text-[#008A3E] border border-[#00D664]/30 hover:bg-fmc-green/25'
                    : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                {coach.isActive ? 'Actif' : 'Suspendu'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Reviews Moderation */}
      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {reviews.map((rev) => (
            <div key={rev.id} className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-fmc-navy text-xs">{rev.clientName}</span>
                  <span className="text-[10px] text-slate-400 ml-2">Note: {rev.rating}/5</span>
                </div>

                <button
                  onClick={() => toggleReviewVisibility(rev.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                    rev.isHidden 
                      ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                      : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {rev.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{rev.isHidden ? 'Masqué' : 'Visible'}</span>
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed italic">
                "{rev.comment}"
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Bookings Flow */}
      {activeTab === 'bookings' && (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-fmc-line/80 dark:border-slate-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-fmc-navy">{b.clientName} → {b.coachName}</span>
                <span className="font-bold text-[#008A3E]">{formatEuro(b.total)}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {formatDateFr(b.date)} ({b.startTime}–{b.endTime}) • {b.sessionType.name}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                <span>Réf: #{b.id}</span>
                <span className="font-semibold text-slate-700">{b.bookingStatus}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compte */}
      <div className="mt-6 space-y-2">
        <ThemePicker className="mb-2" />
        <button
          type="button"
          onClick={() => loginAs('client')}
          className="w-full h-12 rounded-full border border-slate-200 bg-white text-slate-700 font-semibold text-sm cursor-pointer"
        >
          Explorer l'app comme un client
        </button>
        <button
          id="btn-logout-pro"
          type="button"
          onClick={logout}
          className="w-full h-12 rounded-full border border-rose-300 text-rose-500 font-semibold text-sm cursor-pointer"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
};
