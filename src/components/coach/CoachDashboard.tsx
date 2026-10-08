import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  Star, 
  TrendingUp, 
  Video, 
  UserCheck, 
  Plus, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Users,
  Wallet,
  Settings,
  Sparkles,
  Award,
  ArrowUpRight,
  Phone,
  MessageSquare,
  FileCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from '../common/Logo';

export const CoachDashboard: React.FC = () => {
  const { 
    currentUser, 
    coaches, 
    bookings, 
    availabilities, 
    reviews, 
    payouts,
    coachClients,
    navigateTo, 
    completeBooking,
    setActiveVideoBooking,
    setActiveChatPartner
  } = useApp();

  // Find coach profile for current user
  const coachProfile = coaches.find(c => c.userId === currentUser?.id) || coaches[0];
  const coachBookings = bookings.filter(b => b.coachId === coachProfile?.id);
  const upcomingBookings = coachBookings.filter(b => b.bookingStatus === 'confirmed');
  const completedBookings = coachBookings.filter(b => b.bookingStatus === 'completed');

  // Next imminent booking
  const nextImminentBooking = upcomingBookings[0] || null;

  // Compute coach revenue
  const totalGross = completedBookings.reduce((acc, b) => acc + b.price, 0);
  const netEarnings = totalGross * 0.85; // 85% net
  const pendingPayouts = payouts.filter(p => p.coachId === coachProfile?.id && p.status === 'pending');
  const pendingAmount = pendingPayouts.reduce((acc, p) => acc + p.netAmount, 0);

  const coachAvailabilities = availabilities.filter(a => a.coachId === coachProfile?.id);
  const openSlotsCount = coachAvailabilities.filter(a => !a.isBooked).length;
  const coachReviews = reviews.filter(r => r.coachId === coachProfile?.id);

  return (
    <div className="min-h-screen bg-[#F6F9FA] text-[#0F172A] pb-28 max-w-md mx-auto px-4 pt-3">
      {/* Top Brand Bar */}
      <div className="flex items-center justify-between pb-3 pt-1 border-b border-slate-200/60 mb-3">
        <Logo size="sm" showTagline={false} />
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 bg-[#00D664]/15 text-[#008A3E] text-[10px] font-black rounded-full uppercase tracking-wider border border-[#00D664]/30 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />
            Coach Pro
          </span>
        </div>
      </div>

      {/* Coach Info Header */}
      <div className="flex items-center justify-between py-1 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={coachProfile?.photo || currentUser?.avatar}
              alt="Coach Avatar"
              className="w-13 h-13 rounded-2xl object-cover border-2 border-[#00D664]/50 shadow-xs"
            />
            {coachProfile?.verificationStatus === 'verified' && (
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#00D664] text-[#0F172A] rounded-full flex items-center justify-center text-[10px] shadow-xs">
                ✓
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                Espace Coach
              </span>
              {coachProfile?.isElite && (
                <span className="bg-[#0F172A] text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-md">
                  Élite
                </span>
              )}
            </div>
            <h1 className="text-lg font-black text-[#0F172A] leading-tight">{coachProfile?.name}</h1>
            <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">
              {coachProfile?.title}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigateTo('coach_profile_edit')}
          className="p-2.5 bg-white text-slate-700 border border-slate-200 rounded-2xl hover:bg-slate-50 transition cursor-pointer shadow-xs"
          title="Paramètres du profil"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* 4 Quick KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div 
          onClick={() => navigateTo('coach_financials')}
          className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs hover:border-[#00D664] transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-bold">Gains Nets</span>
            <Wallet className="w-4 h-4 text-[#00B050]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-[#0F172A]">{netEarnings.toFixed(0)} €</div>
            <span className="text-[10px] text-[#008A3E] font-bold">
              +{pendingAmount > 0 ? `${pendingAmount.toFixed(0)}€ en attente` : '100% à jour'}
            </span>
          </div>
        </div>

        <div 
          onClick={() => navigateTo('coach_bookings')}
          className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs hover:border-[#00D664] transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-bold">Séances Confirmées</span>
            <Calendar className="w-4 h-4 text-[#00B050]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-[#0F172A]">{upcomingBookings.length}</div>
            <span className="text-[10px] text-slate-400 font-medium">
              {completedBookings.length} séance{completedBookings.length > 1 ? 's' : ''} terminées
            </span>
          </div>
        </div>

        <div 
          onClick={() => navigateTo('coach_clients')}
          className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs hover:border-[#00D664] transition cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-bold">Mes Clients</span>
            <Users className="w-4 h-4 text-[#00B050]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-[#0F172A]">{coachClients.length}</div>
            <span className="text-[10px] text-slate-400 font-medium">Fiches suivies</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-bold">Note moyenne</span>
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-[#0F172A]">
              {coachProfile?.rating.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/5</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {coachReviews.length} avis certifié{coachReviews.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Next Imminent Session Card (Action P0) */}
      {nextImminentBooking && (
        <div className="bg-linear-to-br from-[#0F172A] to-[#1E293B] text-white rounded-3xl p-4 shadow-md mb-4 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2.5 py-0.5 bg-[#00D664] text-[#0F172A] rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F172A] animate-ping" />
              Prochaine séance
            </span>
            <span className="text-xs text-slate-300 font-bold">
              {nextImminentBooking.date === new Date().toISOString().split('T')[0] ? 'Aujourd’hui' : nextImminentBooking.date}
            </span>
          </div>

          <div className="flex items-center gap-3 my-2">
            <img
              src={nextImminentBooking.clientAvatar}
              alt={nextImminentBooking.clientName}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-white/20"
            />
            <div>
              <h3 className="font-extrabold text-base text-white">{nextImminentBooking.clientName}</h3>
              <p className="text-xs text-slate-300">
                {nextImminentBooking.sessionType.name} ({nextImminentBooking.startTime} - {nextImminentBooking.endTime})
              </p>
              {nextImminentBooking.format === 'home' && nextImminentBooking.clientAddress && (
                <p className="text-[11px] text-[#00FD83] flex items-center gap-1 mt-0.5 truncate max-w-[220px]">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {nextImminentBooking.clientAddress}
                </p>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10 flex-wrap">
            <button
              onClick={() => setActiveChatPartner({
                id: nextImminentBooking.clientId,
                name: nextImminentBooking.clientName,
                avatar: nextImminentBooking.clientAvatar,
                role: 'client',
                title: 'Client FMC'
              })}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
              title="Discuter avec le client"
            >
              <MessageSquare className="w-4 h-4 text-[#00FD83]" />
            </button>

            {nextImminentBooking.meetingLink && nextImminentBooking.format === 'online' ? (
              <button
                onClick={() => setActiveVideoBooking(nextImminentBooking)}
                className="flex-1 py-2.5 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
              >
                <Video className="w-4 h-4 stroke-[2.5]" />
                <span>Démarrer Visio HD</span>
              </button>
            ) : nextImminentBooking.clientAddress ? (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(nextImminentBooking.clientAddress)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <MapPin className="w-4 h-4 stroke-[2.5]" />
                <span>Itinéraire GPS</span>
              </a>
            ) : (
              <button
                onClick={() => completeBooking(nextImminentBooking.id)}
                className="flex-1 py-2.5 bg-[#00D664] text-[#0F172A] font-black rounded-xl text-xs transition"
              >
                Marquer comme terminée
              </button>
            )}

            <button
              onClick={() => completeBooking(nextImminentBooking.id)}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Terminer
            </button>
          </div>
        </div>
      )}

      {/* Featured AI Agent for Coach Card */}
      <div 
        onClick={() => navigateTo('coach_ai_agent')}
        className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-3xl p-4 shadow-md mb-4 cursor-pointer hover:border-[#00D664] border border-slate-700 transition active:scale-98 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 -mt-2 -mr-2 w-32 h-32 bg-[#00D664]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="px-2.5 py-0.5 bg-[#00D664]/20 text-[#00FD83] border border-[#00D664]/30 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#00FD83]" />
            Copilote IA Gemini
          </span>
          <span className="text-[11px] font-black text-[#00FD83] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Lancer <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>

        <h3 className="text-base font-black text-white">Agent IA de Préparation & Nutrition</h3>
        <p className="text-xs text-slate-300 mt-0.5 font-medium leading-relaxed">
          Générez des cycles d'exercices personnalisés, calculez les cibles métaboliques et débriefez vos séances.
        </p>

        <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-white/10 text-[10px] font-bold text-slate-200 flex-wrap">
          <span className="px-2 py-0.5 bg-white/10 rounded-md flex items-center gap-1">🏋️ Cycles personnalisés</span>
          <span className="px-2 py-0.5 bg-white/10 rounded-md flex items-center gap-1">🥗 Calculateur TMB & DEJ</span>
          <span className="px-2 py-0.5 bg-white/10 rounded-md flex items-center gap-1">💬 Relances 1-clic</span>
        </div>
      </div>

      {/* Business Tool Modules */}
      <div className="space-y-2.5 mb-5">
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider px-1">
          Outils de gestion
        </h2>

        {/* Agent IA & Programmation */}
        <div
          onClick={() => navigateTo('coach_ai_agent')}
          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-[#00D664] transition cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-[#0F172A]">Agent IA & Programmation</h3>
                <span className="px-1.5 py-0.2 bg-[#00D664]/20 text-[#008A3E] text-[9px] font-black rounded-md">
                  Gemini
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Génération de séances, macros TMB & relances 1-clic
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Planning & Dispos */}
        <div
          onClick={() => navigateTo('coach_availabilities')}
          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-[#00D664] transition cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#008A3E] flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0F172A]">Planning & Créneaux</h3>
              <p className="text-xs text-slate-500">
                {openSlotsCount} créneaux ouverts • Récurrence hebdo
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Fiches Clients CRM */}
        <div
          onClick={() => navigateTo('coach_clients')}
          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-[#00D664] transition cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0F172A]">Suivi & Fiches Clients</h3>
              <p className="text-xs text-slate-500">
                Notes de séance, historique, objectifs et coordonnées
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Revenus & Versements */}
        <div
          onClick={() => navigateTo('coach_financials')}
          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-[#00D664] transition cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0F172A]">Revenus & Versements SEPA</h3>
              <p className="text-xs text-slate-500">
                Commission 15% transparente • Historique virements
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Formats, Zones & Certifications */}
        <div
          onClick={() => navigateTo('coach_profile_edit')}
          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-[#00D664] transition cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[#0F172A]">Tarifs, Formats & Diplômes</h3>
              <p className="text-xs text-slate-500">
                Domicile, rayon {coachProfile?.interventionRadiusKm || 15}km, packs & documents
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Recent Reviews received */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#0F172A]">Derniers avis clients</h2>
          <span className="text-xs font-bold text-slate-400">{coachReviews.length} avis</span>
        </div>

        {coachReviews.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">Aucun avis pour l'instant.</p>
        ) : (
          coachReviews.slice(0, 2).map((r) => (
            <div key={r.id} className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0F172A]">{r.clientName}</span>
                <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                  <Star className="w-3 h-3 fill-current" />
                  <span>{r.rating}</span>
                </div>
              </div>
              <p className="text-slate-600 leading-snug">"{r.comment}"</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
