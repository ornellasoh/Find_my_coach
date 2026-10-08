import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Plus, 
  Trash2, 
  Dumbbell, 
  Sparkles, 
  Check, 
  Calendar, 
  Clock, 
  Target 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkoutProgram, WorkoutSessionDay, WorkoutExercise, CoachClientSummary } from '../../types';

interface CreateProgramModalProps {
  client: CoachClientSummary | null;
  onClose: () => void;
}

export const CreateProgramModal: React.FC<CreateProgramModalProps> = ({ client, onClose }) => {
  const { currentUser, coaches, addWorkoutProgram } = useApp();
  const coach = coaches.find((c) => c.userId === currentUser?.id) || coaches[0];

  const [title, setTitle] = useState('Programme Personnalisé');
  const [objective, setObjective] = useState('Renforcement musculaire & Endurance');
  const [difficulty, setDifficulty] = useState<'Débutant' | 'Intermédiaire' | 'Avancé'>('Intermédiaire');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [notes, setNotes] = useState('À exécuter 2 à 3 fois par semaine.');

  const [sessions, setSessions] = useState<WorkoutSessionDay[]>([
    {
      id: 'sess-' + Date.now() + '-1',
      dayNumber: 1,
      title: 'Séance 1 : Renforcement & Mobilité',
      description: 'Activation musculaire et travail des points faibles.',
      durationMinutes: 45,
      exercises: [
        {
          id: 'ex-1',
          name: 'Squat au poids du corps ou kettlebell',
          sets: 4,
          reps: '12-15 reps',
          restSeconds: 60,
          targetMuscle: 'Jambes & Fessiers',
          notes: 'Garder le dos droit et aligner genoux et orteils.'
        },
        {
          id: 'ex-2',
          name: 'Gainage planche ventrale',
          sets: 3,
          reps: '45 secondes',
          restSeconds: 45,
          targetMuscle: 'Abdominaux profonds',
          notes: 'Contracter les fessiers et aspirer le nombril.'
        }
      ]
    }
  ]);

  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);

  const addExerciseToCurrentSession = () => {
    setSessions((prev) => {
      const updated = [...prev];
      const cur = updated[selectedSessionIndex];
      if (!cur) return prev;
      cur.exercises.push({
        id: 'ex-' + Date.now(),
        name: 'Nouvel exercice',
        sets: 3,
        reps: '10-12 reps',
        restSeconds: 60,
        targetMuscle: 'Full body'
      });
      return updated;
    });
  };

  const removeExercise = (exIndex: number) => {
    setSessions((prev) => {
      const updated = [...prev];
      const cur = updated[selectedSessionIndex];
      if (!cur) return prev;
      cur.exercises = cur.exercises.filter((_, i) => i !== exIndex);
      return updated;
    });
  };

  const updateExercise = (exIndex: number, fields: Partial<WorkoutExercise>) => {
    setSessions((prev) => {
      const updated = [...prev];
      const cur = updated[selectedSessionIndex];
      if (!cur) return prev;
      cur.exercises[exIndex] = { ...cur.exercises[exIndex], ...fields };
      return updated;
    });
  };

  const addNewSession = () => {
    const newDayNum = sessions.length + 1;
    const newSession: WorkoutSessionDay = {
      id: 'sess-' + Date.now() + '-' + newDayNum,
      dayNumber: newDayNum,
      title: `Séance ${newDayNum} : Haut du corps & Cardio`,
      description: 'Endurance de force et tonicité.',
      durationMinutes: 40,
      exercises: [
        {
          id: 'ex-' + Date.now(),
          name: 'Pompes ou Dips',
          sets: 3,
          reps: '10-12 reps',
          restSeconds: 60,
          targetMuscle: 'Pectoraux / Triceps'
        }
      ]
    };
    setSessions([...sessions, newSession]);
    setSelectedSessionIndex(sessions.length);
  };

  const handleSave = () => {
    if (!client) return;
    const newProgram: WorkoutProgram = {
      id: 'prog-' + Date.now(),
      coachId: coach.id,
      coachName: coach.name,
      coachAvatar: coach.photo,
      clientId: client.clientId,
      clientName: client.clientName,
      title,
      objective,
      difficulty,
      durationWeeks,
      assignedAt: new Date().toISOString().split('T')[0],
      status: 'active',
      notes,
      sessions
    };

    addWorkoutProgram(newProgram);
    onClose();
  };

  if (!client) return null;

  const currentSession = sessions[selectedSessionIndex] || sessions[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#00D664]/15 text-[#008A3E] dark:text-[#00D664] flex items-center justify-center">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Nouveau Programme pour {client.clientName}
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Générateur de fiche d'entraînement sur-mesure
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-4 text-xs">
          {/* General Information */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-700/50">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Titre du programme
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-xs focus:outline-hidden focus:border-[#00D664]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Niveau
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-xs"
                >
                  <option value="Débutant">Débutant</option>
                  <option value="Intermédiaire">Intermédiaire</option>
                  <option value="Avancé">Avancé</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Durée (semaines)
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Objectif & Consignes du Coach
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Hydratation constante, bien respecter les temps de repos..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs"
              />
            </div>
          </div>

          {/* Sessions Management */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-slate-900 dark:text-white">
                Séances du programme ({sessions.length})
              </span>
              <button
                onClick={addNewSession}
                className="px-2.5 py-1 bg-[#00D664]/15 hover:bg-[#00D664]/25 text-[#008A3E] dark:text-[#00D664] rounded-lg font-black text-[11px] flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une séance</span>
              </button>
            </div>

            {/* Session Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mb-3">
              {sessions.map((sess, idx) => (
                <button
                  key={sess.id}
                  onClick={() => setSelectedSessionIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
                    selectedSessionIndex === idx
                      ? 'bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A]'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Jour {sess.dayNumber}
                </button>
              ))}
            </div>

            {/* Current Session Exercise Builder */}
            {currentSession && (
              <div className="space-y-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <input
                    type="text"
                    value={currentSession.title}
                    onChange={(e) => {
                      const updated = [...sessions];
                      updated[selectedSessionIndex].title = e.target.value;
                      setSessions(updated);
                    }}
                    className="w-full font-black text-xs text-slate-900 dark:text-white bg-transparent border-b border-slate-200 dark:border-slate-700 pb-1 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-2.5">
                  {currentSession.exercises.map((ex, exIdx) => (
                    <div
                      key={ex.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={ex.name}
                          placeholder="Nom de l'exercice"
                          onChange={(e) => updateExercise(exIdx, { name: e.target.value })}
                          className="font-bold text-xs text-slate-900 dark:text-white bg-transparent flex-1 focus:outline-hidden"
                        />
                        {currentSession.exercises.length > 1 && (
                          <button
                            onClick={() => removeExercise(exIdx)}
                            className="text-slate-400 hover:text-rose-500 transition cursor-pointer p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Séries</span>
                          <input
                            type="number"
                            min={1}
                            value={ex.sets}
                            onChange={(e) => updateExercise(exIdx, { sets: Number(e.target.value) })}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Répétitions</span>
                          <input
                            type="text"
                            value={ex.reps}
                            onChange={(e) => updateExercise(exIdx, { reps: e.target.value })}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Repos (sec)</span>
                          <input
                            type="number"
                            value={ex.restSeconds}
                            onChange={(e) => updateExercise(exIdx, { restSeconds: Number(e.target.value) })}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addExerciseToCurrentSession}
                  className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#00D664] text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#008A3E]" />
                  <span>Ajouter un exercice à cette séance</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs cursor-pointer transition"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Assigner au client</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
