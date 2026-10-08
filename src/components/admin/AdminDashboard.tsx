import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
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

export const AdminDashboard: React.FC = () => {
  const { 
    coaches, 
    bookings, 
    reviews, 
    toggleReviewVisibility, 
    toggleCoachActiveStatus, 
    resetAllData, 
    goBack 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'coaches' | 'reviews' | 'bookings'>('overview');

  // Metrics
  const totalVolume = bookings.reduce((sum, b) => sum + (b.bookingStatus !== 'cancelled' ? b.total : 0), 0);
  const platformRevenue = totalVolume * 0.15; // 15% platform commission
  const completedCount = bookings.filter(b => b.bookingStatus === 'completed').length;
  const activeCoachesCount = coaches.filter(c => c.isActive).length;

  return (
    <div className="min-h-screen bg-[#F6F9FA] text-[#0F172A] pb-28 max-w-md mx-auto px-4 pt-3">
      {/* Top Brand Bar */}
      <div className="flex items-center justify-between pb-3 pt-1 border-b border-slate-200/60 mb-3">
        <Logo size="sm" showTagline={false} />
        <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-black rounded-full uppercase tracking-wider">
          Supervision
        </span>
      </div>

      {/* Navigation Header */}
      <div className="flex items-center justify-between py-1 mb-3">
        <button
          onClick={goBack}
          className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <h1 className="text-base font-extrabold text-[#0F172A]">Panneau d'Administration</h1>

        <button
          onClick={() => {
            if (window.confirm('Réinitialiser toutes les données de test aux valeurs par défaut ?')) resetAllData();
          }}
          className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-rose-500 shadow-xs hover:bg-rose-50 transition cursor-pointer"
          title="Réinitialiser"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-400 block font-medium">GMV Total Transigé</span>
          <span className="text-lg font-black text-[#008A3E] block mt-0.5">{totalVolume.toFixed(2)} €</span>
          <span className="text-[10px] text-slate-400">sur {bookings.length} réservations</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-400 block font-medium">Commissions FMC</span>
          <span className="text-lg font-black text-amber-500 block mt-0.5">{platformRevenue.toFixed(2)} €</span>
          <span className="text-[10px] text-slate-400">15% commission nette</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-400 block font-medium">Coachs Référencés</span>
          <span className="text-lg font-black text-[#0F172A] block mt-0.5">{activeCoachesCount} / {coaches.length}</span>
          <span className="text-[10px] text-[#008A3E] font-bold">100% profils certifiés</span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-400 block font-medium">Séances Terminées</span>
          <span className="text-lg font-black text-[#0F172A] block mt-0.5">{completedCount}</span>
          <span className="text-[10px] text-slate-400">Taux complétion 92%</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border border-slate-200 p-1 rounded-2xl mb-4 text-xs font-extrabold shadow-2xs">
        <button
          onClick={() => setActiveTab('coaches')}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
            activeTab === 'coaches' ? 'bg-[#00D664] text-[#0F172A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Coachs ({coaches.length})
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
            activeTab === 'reviews' ? 'bg-[#00D664] text-[#0F172A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Avis ({reviews.length})
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
            activeTab === 'bookings' ? 'bg-[#00D664] text-[#0F172A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Flux ({bookings.length})
        </button>
      </div>

      {/* Tab: Coaches Moderation */}
      {activeTab === 'coaches' && (
        <div className="space-y-3">
          {coaches.map((coach) => (
            <div key={coach.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={coach.photo}
                  alt={coach.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <h3 className="font-extrabold text-[#0F172A] text-sm">{coach.name}</h3>
                  <p className="text-xs text-slate-500">{coach.title} • {coach.hourlyRate}€/h</p>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{coach.rating} ({coach.reviewCount} avis)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => toggleCoachActiveStatus(coach.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  coach.isActive
                    ? 'bg-[#00D664]/15 text-[#008A3E] border border-[#00D664]/30 hover:bg-[#00D664]/25'
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
            <div key={rev.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#0F172A] text-xs">{rev.clientName}</span>
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
            <div key={b.id} className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0F172A]">{b.clientName} ➔ {b.coachName}</span>
                <span className="font-extrabold text-[#008A3E]">{b.total.toFixed(2)} €</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {b.date} ({b.startTime} - {b.endTime}) • {b.sessionType.name}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                <span>Réf: #{b.id}</span>
                <span className="font-bold uppercase text-slate-700">{b.bookingStatus}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
