import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Heart, 
  Share2, 
  Star, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Video,
  Award,
  Globe,
  Check,
  ChevronRight,
  UserCheck,
  MessageSquare,
  Home as HomeIcon,
  Navigation,
  FileCheck2
} from 'lucide-react';
import { motion } from 'motion/react';
import { PrimaryButton, Rating, SectionHeader, StickyAction, formatDateFr, formatEuro } from '../ui/fmc';

export const CoachProfileView: React.FC = () => {
  const { 
    currentUser,
    selectedCoach, 
    goBack, 
    navigateTo, 
    toggleFavorite, 
    isFavorite, 
    getCoachReviews,
    getCoachAvailabilities,
    startChatWithCoach
  } = useApp();

  const [copied, setCopied] = useState(false);

  if (!selectedCoach) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-fmc-bg">
        <p className="text-sm text-slate-500">Coach introuvable.</p>
        <button onClick={goBack} className="ml-2 text-fmc-green-ink font-semibold">Retour</button>
      </div>
    );
  }

  const coach = selectedCoach;
  const favorited = isFavorite(coach.id);
  const reviews = getCoachReviews(coach.id);
  const availabilities = getCoachAvailabilities(coach.id);
  const availableSlotsCount = availabilities.filter(s => !s.isBooked).length;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${coach.name} — Find My Coach`,
        text: `Découvrez le profil de ${coach.name}, ${coach.title} sur Find My Coach !`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatLabels: Record<string, { title: string; desc: string; icon: React.ReactNode }> = {
    online: { title: 'Visio HD', desc: 'Accessible partout', icon: <Video className="w-4 h-4" /> },
    home: { title: 'À domicile', desc: `Rayon ${coach.interventionRadiusKm || 15} km`, icon: <HomeIcon className="w-4 h-4" /> },
    coach_location: { title: 'Chez le coach', desc: coach.city, icon: <MapPin className="w-4 h-4" /> },
    partner_gym: { title: 'En salle', desc: 'Salle partenaire', icon: <Award className="w-4 h-4" /> },
    outdoor: { title: 'En extérieur', desc: 'Plein air', icon: <Navigation className="w-4 h-4" /> },
    corporate: { title: 'En entreprise', desc: 'Sur devis', icon: <UserCheck className="w-4 h-4" /> },
  };

  const heroButton =
    'w-11 h-11 rounded-full bg-white/70 dark:bg-black/40 backdrop-blur-md text-fmc-navy dark:text-white flex items-center justify-center active:scale-95 transition cursor-pointer';

  return (
    <div className="min-h-screen bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 pb-36 max-w-md mx-auto relative">
      {/* Photo plein cadre */}
      <div className="relative h-[420px] w-full bg-slate-200 dark:bg-slate-900 overflow-hidden">
        <img src={coach.coverPhoto || coach.photo} alt={coach.name} className="w-full h-full object-cover grayscale-[35%]" />
        <div className="absolute inset-0 bg-linear-to-b from-black/10 via-transparent via-45% to-fmc-bg dark:to-[#0B0F19]" />

        <div className="absolute top-4 left-5 right-5 flex items-center justify-between z-10">
          <button id="btn-coach-profile-back" onClick={goBack} aria-label="Retour" className={heroButton}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              id="btn-coach-profile-favorite"
              onClick={() => toggleFavorite(coach.id)}
              aria-label="Favori"
              className={`${heroButton} ${favorited ? '!bg-rose-500 !text-white' : ''}`}
            >
              <Heart className={`w-5 h-5 ${favorited ? 'fill-current' : ''}`} />
            </button>
            <button id="btn-coach-profile-share" onClick={handleShare} aria-label="Partager" className={`${heroButton} relative`}>
              <Share2 className="w-5 h-5" />
              {copied && (
                <span className="absolute top-12 right-0 whitespace-nowrap bg-fmc-navy text-white font-semibold text-xs px-2.5 py-1 rounded-lg">
                  Lien copié !
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="absolute bottom-2 left-5 right-5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-fmc-green text-white text-xs font-bold uppercase tracking-wide rounded-lg">
            {coach.isElite ? 'Coach Élite' : coach.verificationStatus === 'verified' ? 'Coach vérifié' : 'Coach'}
          </span>
          <h1 className="text-[34px] leading-tight font-semibold tracking-tight mt-2">{coach.name}</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
            <Award className="w-5 h-5 text-fmc-green-ink shrink-0" />
            <span className="truncate">{coach.title}</span>
          </p>
        </div>
      </div>

      <div className="px-5 pt-6 space-y-8">
        {/* Chiffres clés */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Note', value: coach.rating.toFixed(1), sub: `${coach.reviewCount} avis` },
            { label: 'Expérience', value: `${coach.experienceYears} ans`, sub: 'Certifié' },
            { label: 'Prix', value: `${coach.hourlyRate} €`, sub: 'par heure' },
          ].map((stat) => (
            <div key={stat.label} className="bg-fmc-dark rounded-2xl px-3 py-3 text-center">
              <span className="text-xs text-white/50 block">{stat.label}</span>
              <span className="text-lg font-semibold text-fmc-green block tabular-nums leading-tight mt-0.5">{stat.value}</span>
              <span className="text-[11px] text-white/40 block">{stat.sub}</span>
            </div>
          ))}
        </div>

        {/* À propos */}
        <section>
          <h2 className="text-xl font-semibold tracking-tight mb-3">À propos de {coach.name.split(' ')[0]}</h2>
          <p className="text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">{coach.bio}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-fmc-green-ink" /> {coach.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-fmc-green-ink" /> {coach.languages.join(', ')}
            </span>
          </div>
        </section>

        {/* Spécialités */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Spécialités</h2>
          <div className="flex flex-wrap gap-2.5">
            {coach.specialties.map((spec) => (
              <span key={spec} className="px-4 py-2 rounded-xl border border-fmc-green text-fmc-green-ink text-sm font-medium">
                {spec}
              </span>
            ))}
          </div>
        </section>

        {/* Formats */}
        {coach.formats && coach.formats.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Formats proposés</h2>
            <div className="grid grid-cols-2 gap-3">
              {coach.formats.map((fmt) => {
                const item = formatLabels[fmt] || { title: fmt, desc: '', icon: <Check className="w-4 h-4" /> };
                return (
                  <div key={fmt} className="bg-white dark:bg-slate-900 rounded-2xl border border-fmc-line/80 dark:border-slate-800 p-3.5 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-fmc-bg dark:bg-slate-800 text-fmc-green-ink flex items-center justify-center shrink-0">{item.icon}</span>
                    <span className="min-w-0">
                      <span className="text-sm font-semibold block leading-tight">{item.title}</span>
                      <span className="text-xs text-slate-500 block truncate">{item.desc}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            {coach.interventionRadiusKm > 0 && (
              <p className="text-sm text-slate-500 mt-3 flex items-start gap-2">
                <Navigation className="w-4 h-4 text-fmc-green-ink shrink-0 mt-0.5" />
                {coach.interventionZone || `Se déplace jusqu'à ${coach.interventionRadiusKm} km autour de ${coach.city}`}
              </p>
            )}
          </section>
        )}

        {/* Certifications */}
        {coach.certifications.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Diplômes vérifiés</h2>
            <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-fmc-line/80 dark:border-slate-800 p-4 space-y-3">
              {coach.certifications.map((cert) => (
                <div key={cert} className="flex items-center gap-3 text-sm">
                  <ShieldCheck className="w-5 h-5 text-fmc-green-ink shrink-0" />
                  <span>{cert}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Disponibilité */}
        <section>
          <SectionHeader
            title="Prochaine disponibilité"
            action="Voir calendrier"
            onAction={() => navigateTo('booking_calendar', { coachId: coach.id })}
          />
          <button
            id="btn-view-calendar-link"
            onClick={() => navigateTo('booking_calendar', { coachId: coach.id })}
            className="w-full text-left bg-white dark:bg-slate-900 rounded-[24px] border border-fmc-line/80 dark:border-slate-800 p-5 flex items-center gap-4 cursor-pointer active:scale-[0.99] transition"
          >
            <Calendar className="w-7 h-7 text-fmc-green-ink shrink-0" />
            <span className="min-w-0">
              <span className="text-base font-medium block">{coach.nextAvailabilitySummary || 'Créneaux ouverts cette semaine'}</span>
              <span className="text-sm text-slate-500 block mt-0.5">
                {availableSlotsCount > 0
                  ? `${availableSlotsCount} créneau${availableSlotsCount > 1 ? 'x' : ''} disponible${availableSlotsCount > 1 ? 's' : ''}`
                  : 'Horaires sur demande'}
              </span>
            </span>
          </button>
          <button
            id="btn-chat-with-coach-profile"
            onClick={() => startChatWithCoach(coach)}
            className="w-full mt-3 h-12 rounded-full border border-fmc-line dark:border-slate-700 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition"
          >
            <MessageSquare className="w-4 h-4 text-fmc-green-ink" />
            Poser une question à {coach.name.split(' ')[0]}
          </button>
        </section>

        {/* Avis */}
        <section>
          <SectionHeader title={`Avis clients${reviews.length ? ` (${reviews.length})` : ''}`} />
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Soyez le premier à laisser un avis après votre séance !</p>
            ) : (
              reviews.map((rev) => (
                <article key={rev.id} className="bg-white dark:bg-slate-900 rounded-[24px] border border-fmc-line/80 dark:border-slate-800 p-5">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-full bg-fmc-green text-white font-semibold text-sm flex items-center justify-center shrink-0">
                        {rev.clientName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{rev.clientName}</p>
                        <p className="text-xs text-slate-500">{formatDateFr(rev.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <Rating value={rev.rating} />
                  </div>
                  <p className="text-[15px] text-slate-500 dark:text-slate-400 leading-relaxed">{rev.comment}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <StickyAction>
        {coach.userId === currentUser?.id ? (
          <PrimaryButton id="btn-edit-own-profile" onClick={() => navigateTo('coach_profile_edit')}>
            C'est votre fiche · Modifier mon profil
          </PrimaryButton>
        ) : (
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <span className="text-2xl font-semibold tabular-nums block leading-tight">{formatEuro(coach.hourlyRate)}</span>
            <span className="text-xs text-slate-500">par séance</span>
          </div>
          <PrimaryButton
            id="btn-reserve-session-bottom"
            gradient
            icon={<Calendar className="w-5 h-5" />}
            onClick={() => navigateTo('booking_calendar', { coachId: coach.id })}
          >
            Réserver la séance
          </PrimaryButton>
        </div>
        )}
      </StickyAction>
    </div>
  );
};
