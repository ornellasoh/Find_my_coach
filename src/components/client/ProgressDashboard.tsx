import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TrendingUp, Timer, ArrowUp, ChevronRight, Check, Sparkles, CalendarCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { Card, Screen, SectionHeader } from '../ui/fmc';

// Indice d'activité des 7 derniers jours (démo)
const WEEK = [
  { label: 'L', value: 42 },
  { label: 'M', value: 55 },
  { label: 'M', value: 50 },
  { label: 'J', value: 72 },
  { label: 'V', value: 64 },
  { label: 'S', value: 85 },
  { label: 'D', value: 95 },
];

// Séances par mois (démo)
const MONTHS = [
  { label: 'Mai', value: 5 },
  { label: 'Juin', value: 8 },
  { label: 'Juil', value: 6 },
  { label: 'Août', value: 10 },
  { label: 'Sept', value: 7 },
  { label: 'Oct', value: 9 },
];

/** Courbe lissée (Catmull-Rom → Bézier) pour le graphique de performance. */
const smoothPath = (pts: { x: number; y: number }[]) =>
  pts.reduce((d, p, i, a) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const p0 = a[i - 2] || a[i - 1];
    const p1 = a[i - 1];
    const p3 = a[i + 1] || p;
    const c1 = { x: p1.x + (p.x - p0.x) / 6, y: p1.y + (p.y - p0.y) / 6 };
    const c2 = { x: p.x - (p3.x - p1.x) / 6, y: p.y - (p3.y - p1.y) / 6 };
    return `${d} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p.x} ${p.y}`;
  }, '');

const ProgressRing: React.FC<{ percent: number }> = ({ percent }) => {
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <span className="w-14 h-14 rounded-2xl bg-fmc-dark flex items-center justify-center shrink-0">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="#00D664"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, percent) / 100)}
        />
      </svg>
    </span>
  );
};

export const ProgressDashboard: React.FC = () => {
  const { goals, updateGoalProgress, bookings, currentUser, navigateTo } = useApp();
  const [activeGoalToUpdate, setActiveGoalToUpdate] = useState<string | null>(null);
  const [newValueInput, setNewValueInput] = useState<number>(0);

  const firstName = currentUser?.name?.split(' ')[0] || 'Alex';
  const initials = (currentUser?.name || 'Alex Rivers')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const completedCount = bookings.filter((b) => b.clientId === currentUser?.id && b.bookingStatus === 'completed').length;
  const upcomingCount = bookings.filter((b) => b.clientId === currentUser?.id && b.bookingStatus === 'confirmed').length;
  const totalHours = completedCount + 8;

  // Géométrie du graphique
  const W = 300;
  const H = 150;
  const max = 100;
  const pts = WEEK.map((d, i) => ({ x: 6 + (i * (W - 12)) / (WEEK.length - 1), y: H - 8 - (d.value / max) * (H - 30) }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;
  const growth = (((WEEK[6].value - WEEK[0].value) / WEEK[0].value) * 100) / 8; // indice hebdo lissé
  const monthMax = Math.max(...MONTHS.map((m) => m.value));

  const handleUpdate = (goalId: string) => {
    updateGoalProgress(goalId, newValueInput);
    setActiveGoalToUpdate(null);
  };

  return (
    <Screen>
      <header className="flex items-start justify-between gap-4 pt-2 mb-6">
        <div>
          <h1 className="text-[32px] leading-tight font-semibold tracking-tight">Votre Progression</h1>
          <p className="text-base text-slate-500 mt-1">Continuez ainsi, {firstName} !</p>
        </div>
        <button
          onClick={() => navigateTo('profile')}
          aria-label="Mon profil"
          className="w-14 h-14 rounded-full border-2 border-fmc-green flex items-center justify-center text-lg font-medium shrink-0 cursor-pointer"
        >
          {initials}
        </button>
      </header>

      {/* Indice de performance */}
      <Card className="p-6 mb-4 shadow-[0_10px_40px_rgba(0,214,100,0.12)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Indice de Performance</h2>
            <p className="text-xs text-slate-500 mt-0.5">Croissance de l'activité hebdomadaire</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-fmc-dark text-fmc-green text-sm font-semibold tabular-nums">
            +{growth.toFixed(1).replace('.', ',')}%
          </span>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-6" role="img" aria-label="Activité des 7 derniers jours">
          <defs>
            <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00D664" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#00D664" stopOpacity="0.12" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#perfFill)" />
          <path d={line} fill="none" stroke="#00D664" strokeWidth="3" strokeLinecap="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="5" fill="#00D664" />
          ))}
        </svg>
        <div className="flex justify-between text-xs text-slate-500 mt-2 px-0.5">
          {WEEK.map((d, i) => (
            <span key={i} className="w-3 text-center">{d.label}</span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6 text-sm">
          <span className="text-fmc-navy dark:text-slate-300">7 derniers jours</span>
          <button
            onClick={() => navigateTo('workout_programs')}
            className="flex items-center gap-1.5 font-semibold text-fmc-green-ink cursor-pointer"
          >
            <TrendingUp className="w-4 h-4" />
            Voir mes programmes
          </button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="p-5">
          <span className="text-sm text-slate-500 flex items-center gap-1.5">
            <Timer className="w-4 h-4 text-fmc-green-ink" /> Entraînement
          </span>
          <span className="text-[28px] font-medium tabular-nums block mt-1">{totalHours} h</span>
          <span className="text-xs font-semibold text-fmc-green-ink flex items-center gap-1">
            <ArrowUp className="w-3.5 h-3.5" /> 8 %
          </span>
        </Card>
        <Card className="p-5">
          <span className="text-sm text-slate-500 flex items-center gap-1.5">
            <CalendarCheck className="w-4 h-4 text-fmc-green-ink" /> Séances
          </span>
          <span className="text-[28px] font-medium tabular-nums block mt-1">{completedCount + 8}</span>
          <span className="text-xs font-semibold text-fmc-green-ink">
            {upcomingCount} à venir
          </span>
        </Card>
      </div>

      {/* Objectifs */}
      <SectionHeader title="Objectifs Actifs" className="[&_h2]:text-2xl" />
      <div className="space-y-3 mb-8">
        {goals.map((goal) => {
          const isEditing = activeGoalToUpdate === goal.id;
          return (
            <Card key={goal.id} className="p-4">
              <button
                type="button"
                onClick={() => {
                  setActiveGoalToUpdate(isEditing ? null : goal.id);
                  setNewValueInput(goal.currentValue);
                }}
                className="w-full flex items-center gap-4 text-left cursor-pointer"
              >
                <ProgressRing percent={goal.percentage} />
                <span className="flex-1 min-w-0">
                  <span className="font-semibold block truncate">{goal.title}</span>
                  <span className="text-xs text-slate-500 block mt-0.5 tabular-nums">
                    Actuel : {goal.currentValue} {goal.unit} • Objectif : {goal.targetValue} {goal.unit}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-lg font-semibold text-fmc-green-ink tabular-nums">{goal.percentage}%</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition ${isEditing ? 'rotate-90' : ''}`} />
                </span>
              </button>

              {isEditing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2 mt-4 pt-4 border-t border-fmc-line/80 dark:border-slate-800"
                >
                  <label className="text-sm text-slate-500 flex-1">Nouvelle valeur ({goal.unit})</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={newValueInput}
                    onChange={(e) => setNewValueInput(Number(e.target.value))}
                    className="w-24 h-11 px-3 bg-fmc-bg dark:bg-slate-800 rounded-xl text-center font-semibold focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
                  />
                  <button
                    onClick={() => handleUpdate(goal.id)}
                    aria-label="Enregistrer"
                    className="w-11 h-11 rounded-xl bg-fmc-green text-fmc-navy flex items-center justify-center cursor-pointer"
                  >
                    <Check className="w-5 h-5" strokeWidth={3} />
                  </button>
                </motion.div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Régularité */}
      <Card className="p-6 mb-8">
        <h2 className="text-lg font-semibold mb-6">Régularité des séances</h2>
        <div className="flex items-end justify-around h-40">
          {MONTHS.map((m, i) => (
            <div key={m.label} className="flex flex-col items-center gap-2 h-full justify-end">
              <span className="text-xs font-semibold tabular-nums text-slate-500">{m.value}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(m.value / monthMax) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="w-8 rounded-t-md bg-fmc-green max-h-[110px]"
                style={{ height: `${(m.value / monthMax) * 110}px` }}
              />
              <span className="text-xs text-slate-500">{m.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Coach IA */}
      <button
        onClick={() => navigateTo('workout_programs')}
        className="w-full text-left rounded-[28px] p-6 bg-linear-to-br from-black via-fmc-dark to-[#00B050] text-white flex items-center gap-4 cursor-pointer active:scale-[0.99] transition"
      >
        <div className="flex-1">
          <p className="font-semibold text-lg">Programmes Coach IA</p>
          <p className="text-sm text-white/75 mt-1 leading-snug">
            Vos plans d'entraînement et de récupération personnalisés.
          </p>
          <span className="inline-block mt-4 px-4 py-2 rounded-full bg-fmc-green text-fmc-navy text-sm font-bold">
            Voir mes programmes
          </span>
        </div>
        <Sparkles className="w-10 h-10 text-fmc-green shrink-0" />
      </button>
    </Screen>
  );
};
