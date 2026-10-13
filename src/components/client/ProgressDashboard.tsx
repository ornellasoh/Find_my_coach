import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Timer, ChevronRight, Check, CalendarCheck, Plus, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { Card, Screen, SectionHeader } from '../ui/fmc';
import { Avatar } from '../ui/Avatar';

const MONTH_LABELS = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

const ProgressRing: React.FC<{ percent: number }> = ({ percent }) => {
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <span className="w-14 h-14 rounded-2xl bg-fmc-dark flex items-center justify-center shrink-0">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90" aria-hidden="true">
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
          strokeDashoffset={c * (1 - Math.min(100, Math.max(0, percent)) / 100)}
        />
      </svg>
    </span>
  );
};

/**
 * Progression du client : uniquement ses vraies séances et ses propres objectifs.
 * Un compte neuf voit 0 séance et un état vide (aucune donnée de démonstration).
 */
export const ProgressDashboard: React.FC = () => {
  const { goals, updateGoalProgress, addGoal, bookings, currentUser, navigateTo } = useApp();
  const [activeGoalToUpdate, setActiveGoalToUpdate] = useState<string | null>(null);
  const [newValueInput, setNewValueInput] = useState<number>(0);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState<number>(10);
  const [goalUnit, setGoalUnit] = useState('séances');
  const [goalError, setGoalError] = useState('');

  const firstName = currentUser?.name?.trim().split(/\s+/)[0] || '';
  const myGoals = goals.filter((g) => g.userId === currentUser?.id);

  const stats = useMemo(() => {
    const mine = bookings.filter((b) => b.clientId === currentUser?.id);
    const completed = mine.filter((b) => b.bookingStatus === 'completed');
    const upcoming = mine.filter((b) => b.bookingStatus === 'confirmed').length;
    const minutes = completed.reduce((s, b) => s + (b.sessionType?.durationMinutes || 60), 0);
    // Séances effectuées sur les 6 derniers mois (mois en cours inclus)
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { key, label: MONTH_LABELS[d.getMonth()], value: completed.filter((b) => b.date.startsWith(key)).length };
    });
    return { completed: completed.length, upcoming, hours: Math.round((minutes / 60) * 10) / 10, months };
  }, [bookings, currentUser?.id]);
  const monthMax = Math.max(1, ...stats.months.map((m) => m.value));

  const handleUpdate = (goalId: string) => {
    updateGoalProgress(goalId, newValueInput);
    setActiveGoalToUpdate(null);
  };

  const createGoal = () => {
    setGoalError('');
    if (!goalTitle.trim()) return setGoalError('Donnez un nom à votre objectif.');
    if (!(goalTarget > 0)) return setGoalError('La valeur cible doit être supérieure à 0.');
    addGoal({ title: goalTitle.trim(), targetValue: goalTarget, unit: goalUnit.trim() || 'unités' });
    setGoalTitle('');
    setShowNewGoal(false);
  };

  return (
    <Screen>
      <header className="flex items-start justify-between gap-4 pt-2 mb-6">
        <div>
          <h1 className="text-[32px] leading-tight font-semibold tracking-tight">Votre progression</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
            {stats.completed > 0 ? `Continuez ainsi${firstName ? `, ${firstName}` : ''} !` : 'Vos séances et objectifs apparaîtront ici.'}
          </p>
        </div>
        <button onClick={() => navigateTo('profile')} aria-label="Mon profil" className="shrink-0 rounded-full cursor-pointer">
          <Avatar src={currentUser?.avatar} name={currentUser?.name} className="w-14 h-14 rounded-full border-2 border-fmc-green" />
        </button>
      </header>

      {/* Chiffres réels */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Timer className="w-4 h-4 text-fmc-green-ink" /> Entraînement
          </span>
          <span className="text-[28px] font-medium tabular-nums block mt-1">
            {String(stats.hours).replace('.', ',')} h
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">séances effectuées</span>
        </Card>
        <Card className="p-5">
          <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CalendarCheck className="w-4 h-4 text-fmc-green-ink" /> Séances
          </span>
          <span className="text-[28px] font-medium tabular-nums block mt-1">{stats.completed}</span>
          <span className="text-xs font-semibold text-fmc-green-ink">{stats.upcoming} à venir</span>
        </Card>
      </div>

      {/* Régularité */}
      <Card className="p-6 mb-8">
        <h2 className="text-lg font-semibold mb-1">Régularité des séances</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Séances effectuées, 6 derniers mois</p>
        {stats.completed === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Aucune séance effectuée pour l'instant.</p>
            <button
              onClick={() => navigateTo('search')}
              className="mt-4 min-h-11 px-5 rounded-full bg-fmc-green text-fmc-navy text-sm font-bold cursor-pointer"
            >
              Trouver un coach
            </button>
          </div>
        ) : (
          <div className="flex items-end justify-around h-40" role="img" aria-label="Séances effectuées par mois">
            {stats.months.map((m, i) => (
              <div key={m.key} className="flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">{m.value}</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(m.value / monthMax) * 110}px` }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className={`w-8 rounded-t-md ${m.value ? 'bg-fmc-green' : 'bg-slate-200 dark:bg-slate-700'}`}
                  style={{ minHeight: 4 }}
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">{m.label}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Objectifs */}
      <SectionHeader
        title="Mes objectifs"
        action={showNewGoal ? undefined : 'Ajouter'}
        onAction={() => setShowNewGoal(true)}
        className="[&_h2]:text-2xl"
      />
      {showNewGoal && (
        <Card className="p-4 mb-3 space-y-3">
          <input
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            maxLength={80}
            placeholder="Ex. Courir 10 km, 12 séances ce trimestre…"
            className="w-full h-12 px-3 rounded-xl bg-fmc-bg dark:bg-slate-800 text-[15px] focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
          />
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={1}
              value={goalTarget}
              onChange={(e) => setGoalTarget(Number(e.target.value))}
              aria-label="Valeur cible"
              className="w-24 h-12 px-3 rounded-xl bg-fmc-bg dark:bg-slate-800 text-center font-semibold focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
            />
            <input
              value={goalUnit}
              onChange={(e) => setGoalUnit(e.target.value)}
              maxLength={20}
              aria-label="Unité"
              className="flex-1 h-12 px-3 rounded-xl bg-fmc-bg dark:bg-slate-800 text-[15px] focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
            />
          </div>
          {goalError && <p className="text-sm text-rose-600">{goalError}</p>}
          <div className="flex gap-2">
            <button onClick={() => setShowNewGoal(false)} className="flex-1 min-h-11 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer">
              Annuler
            </button>
            <button onClick={createGoal} className="flex-1 min-h-11 rounded-full bg-fmc-green text-fmc-navy font-bold cursor-pointer">
              Créer l'objectif
            </button>
          </div>
        </Card>
      )}
      <div className="space-y-3 mb-8">
        {myGoals.length === 0 && !showNewGoal && (
          <Card className="p-6 text-center">
            <Target className="w-8 h-8 text-fmc-green-ink mx-auto mb-2" />
            <p className="font-semibold">Aucun objectif pour l'instant</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Fixez-vous un objectif et suivez vos progrès.</p>
            <button
              onClick={() => setShowNewGoal(true)}
              className="mt-4 min-h-11 px-5 rounded-full bg-fmc-green text-fmc-navy text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Ajouter un objectif
            </button>
          </Card>
        )}
        {myGoals.map((goal) => {
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
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 tabular-nums">
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
                  <label className="text-sm text-slate-500 dark:text-slate-400 flex-1">Nouvelle valeur ({goal.unit})</label>
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
    </Screen>
  );
};
