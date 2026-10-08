import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Dumbbell, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  ChevronRight, 
  ChevronDown, 
  Sparkles, 
  Award, 
  Flame, 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowLeft,
  User,
  MessageSquare,
  Zap,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkoutProgram, WorkoutSessionDay, WorkoutExercise } from '../../types';

export const WorkoutProgramsView: React.FC = () => {
  const { 
    workoutPrograms, 
    currentUser, 
    toggleExerciseCompleted, 
    toggleSessionCompleted, 
    goBack,
    startChatWithCoach,
    coaches
  } = useApp();

  const clientPrograms = workoutPrograms.filter(
    (p) => p.clientId === currentUser?.id || currentUser?.role === 'admin' || !p.clientId
  );
  const activeProgram = clientPrograms[0] || workoutPrograms[0];

  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    activeProgram?.sessions[0]?.id || ''
  );

  // Active rest timer state
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerMax, setTimerMax] = useState<number>(60);

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds !== null && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  const startTimer = (seconds: number) => {
    setTimerMax(seconds);
    setTimerSeconds(seconds);
    setIsTimerRunning(true);
  };

  const resetTimer = () => {
    setTimerSeconds(timerMax);
    setIsTimerRunning(false);
  };

  if (!activeProgram) {
    return (
      <div className="min-h-screen bg-[#F2F4F7] dark:bg-[#0B0F19] p-4 flex flex-col items-center justify-center text-center">
        <Dumbbell className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
        <h2 className="text-base font-bold text-slate-800 dark:text-white">Aucun programme actif</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
          Votre coach vous assignera votre plan d’entraînement personnalisé dès votre première séance.
        </p>
        <button
          onClick={goBack}
          className="mt-4 px-4 py-2 bg-[#00D664] text-[#0F172A] rounded-xl text-xs font-bold shadow-xs cursor-pointer"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  const selectedSession =
    activeProgram.sessions.find((s) => s.id === selectedSessionId) ||
    activeProgram.sessions[0];

  const totalExercises = activeProgram.sessions.reduce(
    (acc, s) => acc + s.exercises.length,
    0
  );
  const completedExercises = activeProgram.sessions.reduce(
    (acc, s) => acc + s.exercises.filter((e) => e.completed).length,
    0
  );
  const overallProgress = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F2F4F7] dark:bg-[#0B0F19] text-[#0F172A] dark:text-white pb-28 pt-4 px-4 max-w-md mx-auto transition-colors duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          id="btn-back-workout-programs"
          onClick={goBack}
          className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center shadow-xs hover:bg-slate-50 transition cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <span className="text-[10px] font-bold text-[#008A3E] dark:text-[#00D664] uppercase tracking-wider block">
            Plan d'entraînement
          </span>
          <h1 className="text-sm font-black text-slate-900 dark:text-white">
            Programmes & Exercices
          </h1>
        </div>

        <button
          onClick={() => {
            const coach = coaches.find((c) => c.id === activeProgram.coachId);
            if (coach) startChatWithCoach(coach);
          }}
          className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center shadow-xs hover:bg-slate-50 transition cursor-pointer active:scale-95"
          title="Contacter le coach"
        >
          <MessageSquare className="w-4 h-4 text-[#008A3E] dark:text-[#00D664]" />
        </button>
      </div>

      {/* Program Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs mb-4"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <img
              src={activeProgram.coachAvatar}
              alt={activeProgram.coachName}
              className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
            />
            <div>
              <span className="px-2 py-0.5 bg-[#00D664]/15 text-[#008A3E] dark:text-[#00D664] rounded-full text-[10px] font-extrabold uppercase tracking-wide inline-block mb-1">
                {activeProgram.difficulty} • {activeProgram.durationWeeks} Semaines
              </span>
              <h2 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                {activeProgram.title}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Préparé par {activeProgram.coachName}
              </p>
            </div>
          </div>
        </div>

        {activeProgram.notes && (
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-2.5 mb-3 border border-slate-100 dark:border-slate-700/50 flex items-start gap-2">
            <Info className="w-4 h-4 text-[#008A3E] dark:text-[#00D664] shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {activeProgram.notes}
            </p>
          </div>
        )}

        {/* Global Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-600 dark:text-slate-300">Progression globale</span>
            <span className="text-[#008A3E] dark:text-[#00D664] tabular-nums font-black">
              {overallProgress}% ({completedExercises}/{totalExercises} ex.)
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-[#00D664] to-[#00B050] transition-all duration-500 rounded-full"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </motion.div>

      {/* Floating Rest Timer Bar (if active) */}
      <AnimatePresence>
        {timerSeconds !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="sticky top-2 z-30 bg-[#0F172A] dark:bg-slate-800 text-white rounded-2xl p-3 shadow-xl border border-white/15 mb-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#00D664]/20 border border-[#00D664]/40 flex items-center justify-center text-[#00D664]">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-300 block">
                  Chrono Repos
                </span>
                <span className="text-lg font-black text-[#00D664] tabular-nums leading-none">
                  {Math.floor(timerSeconds / 60)
                    .toString()
                    .padStart(2, '0')}
                  :{(timerSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title={isTimerRunning ? 'Pause' : 'Reprendre'}
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                onClick={resetTimer}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Réinitialiser"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setTimerSeconds(null)}
                className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition cursor-pointer ml-1"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sessions Horizontal Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">
        {activeProgram.sessions.map((sess) => {
          const isSelected = sess.id === selectedSessionId;
          const isDone = sess.isCompleted;
          return (
            <button
              key={sess.id}
              onClick={() => setSelectedSessionId(sess.id)}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-2 border ${
                isSelected
                  ? 'bg-[#00D664] text-[#0F172A] border-[#00D664] shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className={`w-4 h-4 ${isSelected ? 'text-[#0F172A]' : 'text-[#008A3E] dark:text-[#00D664]'}`} />
              ) : (
                <Circle className="w-4 h-4 opacity-40" />
              )}
              <span>Jour {sess.dayNumber}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Session Details Card */}
      {selectedSession && (
        <motion.div
          key={selectedSession.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#008A3E] dark:text-[#00D664] uppercase tracking-wider block">
                {selectedSession.durationMinutes} minutes estimées
              </span>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {selectedSession.title}
              </h3>
              {selectedSession.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedSession.description}
                </p>
              )}
            </div>

            <button
              onClick={() => toggleSessionCompleted(activeProgram.id, selectedSession.id)}
              className={`p-2.5 rounded-2xl border transition cursor-pointer active:scale-95 ${
                selectedSession.isCompleted
                  ? 'bg-[#00D664]/20 border-[#00D664] text-[#008A3E] dark:text-[#00D664]'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
              }`}
              title={selectedSession.isCompleted ? 'Marquer comme non fait' : 'Valider toute la séance'}
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
          </div>

          {/* Exercise List */}
          <div className="space-y-2.5">
            {selectedSession.exercises.map((exercise, index) => {
              const isDone = exercise.completed;
              return (
                <motion.div
                  key={exercise.id}
                  whileTap={{ scale: 0.99 }}
                  className={`rounded-2xl p-3.5 border transition duration-150 ${
                    isDone
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        onClick={() =>
                          toggleExerciseCompleted(
                            activeProgram.id,
                            selectedSession.id,
                            exercise.id
                          )
                        }
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition cursor-pointer mt-0.5 shrink-0 ${
                          isDone
                            ? 'bg-[#00D664] text-[#0F172A]'
                            : 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-transparent hover:border-[#00D664]'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {index + 1}. {exercise.name}
                          </span>
                          {exercise.targetMuscle && (
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[9px] font-bold">
                              {exercise.targetMuscle}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {exercise.sets} séries
                          </span>
                          <span>•</span>
                          <span className="font-bold text-[#008A3E] dark:text-[#00D664]">
                            {exercise.reps}
                          </span>
                        </div>

                        {exercise.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                            💡 {exercise.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Rest trigger button */}
                    <button
                      onClick={() => startTimer(exercise.restSeconds)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-[#00D664]/15 dark:bg-slate-800 dark:hover:bg-[#00D664]/20 text-slate-700 dark:text-slate-300 hover:text-[#008A3E] dark:hover:text-[#00D664] rounded-xl text-[10px] font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition cursor-pointer shrink-0 active:scale-95"
                      title="Lancer le chrono de repos"
                    >
                      <Clock className="w-3 h-3" />
                      <span>{exercise.restSeconds}s repos</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};
