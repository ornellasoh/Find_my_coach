import React, { useMemo } from 'react';
import { Award, ChevronRight, Flame, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { clientAchievements } from '../../utils/achievements';
import { Card, SectionHeader } from '../ui/fmc';

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

/** Accueil client : série de semaines et prochain badge, avec un raccourci pour réserver. */
export const StreakCard: React.FC = () => {
  const { bookings, currentUser, navigateTo } = useApp();
  const a = useMemo(() => clientAchievements(bookings, currentUser?.id), [bookings, currentUser?.id]);

  const title = a.completed === 0 ? 'Votre premier badge vous attend' : a.streak > 0 ? `Série de ${plural(a.streak, 'semaine')}` : 'Relancez votre série';
  const status =
    a.completed === 0
      ? 'Il se débloque dès votre première séance.'
      : a.week === 'done'
        ? 'Séance faite cette semaine, bravo !'
        : a.week === 'planned'
          ? 'Séance réservée cette semaine : votre série continue.'
          : a.streak > 0
            ? 'Réservez avant dimanche pour garder votre série.'
            : 'Une séance cette semaine suffit pour repartir.';

  return (
    <Card className="p-5 mb-7">
      <button
        type="button"
        onClick={() => navigateTo('progress')}
        aria-label="Voir mes badges"
        className="w-full text-left flex items-center gap-4 cursor-pointer active:opacity-70 transition"
      >
        <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${a.streak > 0 ? 'bg-amber-500/15 text-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
          <Flame className="w-6 h-6" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[17px] font-semibold leading-tight">{title}</span>
          <span className="block text-sm text-slate-500 dark:text-slate-400 mt-0.5">{status}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
      </button>

      {a.next && (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400 truncate">Prochain badge : {a.next.name}</span>
            <span className="font-semibold tabular-nums shrink-0">{a.completed} / {a.next.count}</span>
          </div>
          <div
            className="h-2 mt-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={a.next.count}
            aria-valuenow={a.completed}
            aria-label={`Encore ${plural(a.next.remaining, 'séance')} avant le badge ${a.next.name}`}
          >
            <div className="h-full rounded-full bg-fmc-green transition-all" style={{ width: `${a.next.percent}%` }} />
          </div>
        </div>
      )}

      {a.week === 'open' && (
        <button
          type="button"
          onClick={() => navigateTo('search')}
          className="w-full h-12 mt-4 rounded-full bg-fmc-green text-fmc-navy text-[15px] font-semibold cursor-pointer active:scale-[0.98] transition"
        >
          {a.completed === 0 ? 'Réserver ma première séance' : 'Réserver cette semaine'}
        </button>
      )}
    </Card>
  );
};

/** Écran de progression : série en cours et badges obtenus ou à débloquer. */
export const BadgesSection: React.FC = () => {
  const { bookings, currentUser } = useApp();
  const a = useMemo(() => clientAchievements(bookings, currentUser?.id), [bookings, currentUser?.id]);
  const earned = a.badges.filter((b) => b.earned).length;

  return (
    <section className="mb-8">
      <SectionHeader title="Mes badges" />
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${a.streak > 0 ? 'bg-amber-500/15 text-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
            <Flame className="w-6 h-6" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[17px] font-semibold leading-tight tabular-nums">
              {a.streak > 0 ? `Série de ${plural(a.streak, 'semaine')}` : 'Aucune série en cours'}
            </span>
            <span className="block text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Une séance par semaine fait grandir votre série.
            </span>
          </span>
          <span className="text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400 shrink-0">{earned} / {a.badges.length}</span>
        </div>

        <ul className="grid grid-cols-3 gap-x-3 gap-y-5 mt-6">
          {a.badges.map((b) => (
            <li key={b.count} className="flex flex-col items-center text-center gap-2">
              <span
                className={`relative w-16 h-16 rounded-full flex items-center justify-center ${
                  b.earned ? 'bg-fmc-green text-fmc-navy' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                {b.earned ? <Award className="w-7 h-7" /> : <Lock className="w-5 h-5" />}
              </span>
              <span className={`text-xs leading-tight ${b.earned ? 'font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                {b.name}
                <span className="sr-only">{b.earned ? ' — obtenu' : ' — à débloquer'}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
};
