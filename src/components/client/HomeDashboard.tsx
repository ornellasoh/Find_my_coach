import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Dumbbell,
  HeartPulse,
  Utensils,
  Briefcase,
  Brain,
  TrendingUp,
  Clock,
  Video,
  MessageSquare,
  ChevronRight,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';
import { motion } from 'motion/react';
import { CoachFeatureCard } from '../common/CoachCard';
import { Chip, Screen, SearchField, SectionHeader, formatDateFr } from '../ui/fmc';

const getCategoryIcon = (slug: string) => {
  const cls = 'w-4 h-4';
  switch (slug) {
    case 'fitness': return <Dumbbell className={cls} />;
    case 'nutrition': return <Utensils className={cls} />;
    case 'bien-etre': return <HeartPulse className={cls} />;
    case 'business': return <Briefcase className={cls} />;
    case 'mindset': return <Brain className={cls} />;
    case 'carriere': return <TrendingUp className={cls} />;
    default: return <Dumbbell className={cls} />;
  }
};

export const HomeDashboard: React.FC = () => {
  const {
    coaches,
    categories,
    navigateTo,
    currentUser,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    bookings,
    setActiveVideoBooking,
    startChatWithCoach,
  } = useApp();

  const nextBooking = bookings.find(
    (b) => b.clientId === (currentUser?.id || 'user-client-1') && b.bookingStatus === 'confirmed'
  );

  const activeCoaches = coaches.filter((c) => c.isActive);
  const selectedCat = categories.find((cat) => cat.slug === selectedCategory);

  const featuredCoaches = activeCoaches
    .filter((c) => !selectedCat || c.category === selectedCat.name || c.specialties.includes(selectedCat.name))
    .sort((a, b) => Number(b.isElite) - Number(a.isElite) || b.rating - a.rating)
    .slice(0, 3);

  return (
    <Screen>
      {/* En-tête */}
      <header className="flex items-start justify-between gap-4 pt-2 mb-6">
        <h1 className="text-[32px] leading-[1.1] font-medium tracking-tight">
          Trouvez votre
          <span className="block font-bold text-fmc-green-ink">Coach Idéal</span>
        </h1>
        <button
          id="btn-header-avatar"
          onClick={() => navigateTo('profile')}
          aria-label="Mon profil"
          className="shrink-0 p-[3px] rounded-full bg-fmc-green cursor-pointer active:scale-95 transition"
        >
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
            alt="Profil"
            className="w-14 h-14 rounded-full object-cover border-[3px] border-fmc-bg dark:border-[#0B0F19]"
          />
        </button>
      </header>

      <SearchField
        id="input-home-search"
        icon={<Search className="w-5 h-5" />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') navigateTo('search');
        }}
        placeholder="Rechercher par nom ou spécialité…"
        className="mb-6"
      />

      {/* Prochaine séance */}
      {nextBooking && (
        <motion.section
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-7 rounded-[28px] bg-fmc-dark text-white p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-fmc-green">Prochaine séance</span>
            <button
              onClick={() => navigateTo('bookings')}
              className="text-sm font-semibold text-white/70 flex items-center gap-0.5 cursor-pointer"
            >
              Gérer <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <img src={nextBooking.coachPhoto} alt={nextBooking.coachName} className="w-12 h-12 rounded-2xl object-cover" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{nextBooking.coachName}</p>
              <p className="text-sm text-white/60 flex items-center gap-1.5 tabular-nums whitespace-nowrap">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {formatDateFr(nextBooking.date)} • {nextBooking.startTime}
              </p>
            </div>
            <button
              aria-label="Message au coach"
              onClick={() => {
                const coach = coaches.find((c) => c.id === nextBooking.coachId);
                if (coach) startChatWithCoach(coach);
              }}
              className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center cursor-pointer"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              aria-label="Rejoindre la visio"
              onClick={() => setActiveVideoBooking(nextBooking)}
              className="w-11 h-11 rounded-full bg-fmc-green text-fmc-navy flex items-center justify-center cursor-pointer"
            >
              <Video className="w-5 h-5" />
            </button>
          </div>
        </motion.section>
      )}

      {/* Catégories */}
      <SectionHeader title="Catégories" />
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1 mb-7">
        <Chip
          id="cat-pill-all"
          active={selectedCategory === null}
          icon={<LayoutGrid className="w-4 h-4" />}
          onClick={() => setSelectedCategory(null)}
          className="rounded-full"
        >
          Tous
        </Chip>
        {categories.map((cat) => (
          <Chip
            key={cat.id}
            id={`cat-pill-${cat.slug}`}
            active={selectedCategory === cat.slug}
            icon={getCategoryIcon(cat.slug)}
            onClick={() => setSelectedCategory(selectedCategory === cat.slug ? null : cat.slug)}
            className="rounded-full"
          >
            {cat.name}
          </Chip>
        ))}
      </div>

      {/* Coachs vedettes */}
      <SectionHeader
        title="Coachs Vedettes"
        action="Voir tout"
        onAction={() => navigateTo('search')}
      />
      <div className="space-y-5 mb-8">
        {featuredCoaches.map((coach) => (
          <CoachFeatureCard key={coach.id} coach={coach} />
        ))}
        {featuredCoaches.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">Aucun coach dans cette catégorie pour le moment.</p>
        )}
      </div>

      {/* Bannière progression */}
      <button
        id="btn-home-progress"
        onClick={() => navigateTo('progress')}
        className="w-full text-left rounded-[28px] p-6 bg-linear-to-br from-[#00E676] via-fmc-green to-[#00A85A] text-white flex items-center gap-4 shadow-[0_12px_32px_rgba(0,214,100,0.30)] cursor-pointer active:scale-[0.99] transition"
      >
        <div className="flex-1">
          <p className="font-bold text-base">Suivez vos progrès</p>
          <p className="text-sm text-white/90 mt-1 leading-snug">
            Objectifs, séances et statistiques : votre évolution en temps réel.
          </p>
        </div>
        <span className="w-12 h-12 rounded-full bg-white text-fmc-green-ink flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </span>
      </button>
    </Screen>
  );
};
