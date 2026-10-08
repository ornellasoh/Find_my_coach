import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  ArrowLeft, 
  Dumbbell, 
  Salad, 
  MessageSquare, 
  Bot, 
  Send, 
  Check, 
  Copy, 
  ChevronRight, 
  Zap, 
  Calendar, 
  Clock, 
  Flame, 
  RefreshCw, 
  Share2, 
  UserCheck, 
  AlertCircle,
  HelpCircle,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  generateAIWorkoutProgram, 
  calculateClientMacros, 
  generateClientMessage, 
  queryCoachAI,
  GeneratedProgramResult,
  MacroCalculationResult
} from '../../utils/geminiCoachAgent';
import { WorkoutProgram, WorkoutSessionDay, WorkoutExercise } from '../../types';

type ActiveTab = 'program' | 'nutrition' | 'messages' | 'chat';

export const CoachAIAgentView: React.FC = () => {
  const { 
    currentUser, 
    coaches, 
    coachClients, 
    addWorkoutProgram, 
    navigateTo, 
    addNotification, 
    startChatWithClient 
  } = useApp();

  const coach = coaches.find((c) => c.userId === currentUser?.id) || coaches[0];

  const [activeTab, setActiveTab] = useState<ActiveTab>('program');

  // --- TAB 1: Workout Generator State ---
  const [selectedClientId, setSelectedClientId] = useState<string>(coachClients[0]?.id || '');
  const [selectedObjective, setSelectedObjective] = useState<string>('Prise de masse & Force');
  const [selectedLevel, setSelectedLevel] = useState<'Débutant' | 'Intermédiaire' | 'Avancé'>('Intermédiaire');
  const [frequency, setFrequency] = useState<number>(3);
  const [equipment, setEquipment] = useState<string>('Haltères, barre et banc réglable');
  const [injuries, setInjuries] = useState<string>('Légère sensibilité épaule gauche (éviter dips lourds)');
  const [isGeneratingProgram, setIsGeneratingProgram] = useState<boolean>(false);
  const [generatedProgram, setGeneratedProgram] = useState<GeneratedProgramResult | null>(null);
  const [programAssignedSuccess, setProgramAssignedSuccess] = useState<boolean>(false);

  // --- TAB 2: Nutrition State ---
  const [macroGender, setMacroGender] = useState<'homme' | 'femme'>('homme');
  const [macroAge, setMacroAge] = useState<number>(30);
  const [macroWeight, setMacroWeight] = useState<number>(75);
  const [macroHeight, setMacroHeight] = useState<number>(178);
  const [macroActivity, setMacroActivity] = useState<'sedentaire' | 'leger' | 'modere' | 'intense' | 'tres_intense'>('modere');
  const [macroGoal, setMacroGoal] = useState<'perte_gras' | 'maintien' | 'prise_masse' | 'recomposition'>('prise_masse');
  const [macroResult, setMacroResult] = useState<MacroCalculationResult | null>(null);
  const [macroCopied, setMacroCopied] = useState<boolean>(false);

  // --- TAB 3: Message Generator State ---
  const [msgType, setMsgType] = useState<'congrats' | 'followup' | 'soreness' | 'monthly_review'>('congrats');
  const [msgTone, setMsgTone] = useState<'chaleureux' | 'motivant' | 'technique'>('motivant');
  const [generatedMessage, setGeneratedMessage] = useState<string>('');
  const [msgCopied, setMsgCopied] = useState<boolean>(false);

  // --- TAB 4: Free Chat State ---
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Bonjour Coach ${coach?.name?.split(' ')[0] || ''} ! ⚡ Je suis votre copilote IA d'élite. Je peux analyser vos programmations, adapter un mouvement pour une douleur spécifique ou concevoir des protocoles d'entraînement personnalisés. Que souhaitez-vous préparer aujourd'hui ?`,
      time: 'Maintenant'
    }
  ]);
  const [userInput, setUserInput] = useState<string>('');
  const [isAiReplying, setIsAiReplying] = useState<boolean>(false);

  // Get current selected client
  const targetClient = coachClients.find(c => c.id === selectedClientId) || coachClients[0];

  // Action: Generate Program
  const handleGenerateProgram = async () => {
    setIsGeneratingProgram(true);
    setProgramAssignedSuccess(false);

    try {
      const result = await generateAIWorkoutProgram({
        clientName: targetClient?.clientName || 'Client',
        clientId: targetClient?.clientId || 'c1',
        objective: selectedObjective,
        level: selectedLevel,
        frequency,
        equipment,
        injuriesOrNotes: injuries
      });
      setGeneratedProgram(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingProgram(false);
    }
  };

  // Action: Assign generated program to client in database
  const handleAssignProgramToClient = () => {
    if (!generatedProgram || !targetClient) return;

    const newProgram: WorkoutProgram = {
      id: 'prog-ai-' + Date.now(),
      coachId: coach?.id || 'coach-1',
      coachName: coach?.name || 'Mon Coach',
      coachAvatar: coach?.photo || '',
      clientId: targetClient.clientId,
      clientName: targetClient.clientName,
      title: generatedProgram.title,
      objective: generatedProgram.objective,
      difficulty: generatedProgram.difficulty,
      durationWeeks: generatedProgram.durationWeeks,
      assignedAt: new Date().toISOString().split('T')[0],
      status: 'active',
      notes: generatedProgram.notes,
      sessions: generatedProgram.sessions.map((sess, sIdx) => ({
        id: `sess-ai-${Date.now()}-${sIdx}`,
        dayNumber: sIdx + 1,
        title: sess.title,
        description: sess.description,
        durationMinutes: sess.durationMinutes,
        exercises: sess.exercises.map((ex, eIdx) => ({
          id: `ex-ai-${Date.now()}-${sIdx}-${eIdx}`,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
          targetMuscle: ex.targetMuscle,
          completed: false
        }))
      }))
    };

    addWorkoutProgram(newProgram);
    setProgramAssignedSuccess(true);

    addNotification({
      userId: coach?.userId || 'u-coach',
      type: 'system',
      title: 'Programme IA assigné !',
      message: `Le programme « ${generatedProgram.title} » a été activé pour ${targetClient.clientName}.`
    });
  };

  // Action: Compute Nutrition
  const handleCalculateMacros = () => {
    const res = calculateClientMacros({
      clientName: targetClient?.clientName || 'Client',
      gender: macroGender,
      age: Number(macroAge),
      weightKg: Number(macroWeight),
      heightCm: Number(macroHeight),
      activityLevel: macroActivity,
      goal: macroGoal
    });
    setMacroResult(res);
  };

  // Action: Generate Message
  const handleGenerateMessage = () => {
    const msg = generateClientMessage(msgType, targetClient?.clientName || 'Alex', msgTone);
    setGeneratedMessage(msg);
    setMsgCopied(false);
  };

  // Action: Send Free Chat
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || userInput;
    if (!prompt.trim() || isAiReplying) return;

    const userMsgId = 'msg-' + Date.now();
    const newChat = [
      ...chatMessages,
      {
        id: userMsgId,
        sender: 'user' as const,
        text: prompt,
        time: 'À l’instant'
      }
    ];

    setChatMessages(newChat);
    setUserInput('');
    setIsAiReplying(true);

    try {
      const response = await queryCoachAI(
        prompt,
        `Tu es le Copilote IA pour les coachs sportifs sur l'application FindMyCoach. Tu es un expert scientifique de haut niveau en physiologie, biomécanique, programmation athlétique et nutrition sportive. Réponds de façon précise, bien structurée, pratique et actionnable pour un coach professionnel.`
      );

      setChatMessages([
        ...newChat,
        {
          id: 'ai-' + Date.now(),
          sender: 'ai' as const,
          text: response,
          time: 'À l’instant'
        }
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiReplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FA] dark:bg-[#0B0F19] text-[#0F172A] dark:text-slate-100 pb-28 max-w-md mx-auto px-4 pt-3 transition-colors">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 pt-1 border-b border-slate-200/80 dark:border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateTo('coach_dashboard')}
            className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shadow-xs active:scale-95"
            title="Retour au Dashboard"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-black text-[#0F172A] dark:text-white leading-tight">
                Agent IA Coach
              </h1>
              <span className="px-1.5 py-0.2 bg-[#00D664]/15 text-[#008A3E] dark:text-[#00D664] text-[9px] font-black rounded-full border border-[#00D664]/30 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5 stroke-[2.5]" />
                Gemini
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Votre assistant préparation physique & nutrition
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-[10px] font-bold text-[#008A3E] dark:text-[#00D664]">
          <span className="w-2 h-2 rounded-full bg-[#00D664] animate-pulse" />
          Actif
        </div>
      </div>

      {/* Modern 4-Tab Navigation (Apple Segmented Control) */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-2xl mb-4 text-[11px] font-bold">
        <button
          onClick={() => setActiveTab('program')}
          className={`py-2 px-1 rounded-xl flex flex-col items-center gap-0.5 transition cursor-pointer ${
            activeTab === 'program'
              ? 'bg-white dark:bg-slate-700 text-[#0F172A] dark:text-white shadow-xs font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Dumbbell className="w-3.5 h-3.5" />
          <span>Séances</span>
        </button>

        <button
          onClick={() => setActiveTab('nutrition')}
          className={`py-2 px-1 rounded-xl flex flex-col items-center gap-0.5 transition cursor-pointer ${
            activeTab === 'nutrition'
              ? 'bg-white dark:bg-slate-700 text-[#0F172A] dark:text-white shadow-xs font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Salad className="w-3.5 h-3.5" />
          <span>Nutrition</span>
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`py-2 px-1 rounded-xl flex flex-col items-center gap-0.5 transition cursor-pointer ${
            activeTab === 'messages'
              ? 'bg-white dark:bg-slate-700 text-[#0F172A] dark:text-white shadow-xs font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Relances</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`py-2 px-1 rounded-xl flex flex-col items-center gap-0.5 transition cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-white dark:bg-slate-700 text-[#0F172A] dark:text-white shadow-xs font-black'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Copilote</span>
        </button>
      </div>

      {/* Client Quick Picker (Context banner) */}
      {activeTab !== 'chat' && (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 shadow-xs mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={targetClient?.clientAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
              alt={targetClient?.clientName}
              className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-600"
            />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Client ciblé
              </span>
              <span className="font-extrabold text-sm text-[#0F172A] dark:text-white">
                {targetClient?.clientName}
              </span>
            </div>
          </div>

          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="text-xs font-bold bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-[#00D664]"
          >
            {coachClients.map(c => (
              <option key={c.id} value={c.id}>
                {c.clientName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: GENERATEUR DE PROGRAMMES */}
      {/* ============================================================== */}
      {activeTab === 'program' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#008A3E] dark:text-[#00D664] flex items-center justify-center">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-[#0F172A] dark:text-white">
                  Concepteur de Cycle d’Entraînement
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  L'IA structure les séances, séries, répétitions et temps de repos
                </p>
              </div>
            </div>

            {/* Objective */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Objectif de la programmation
              </label>
              <select
                value={selectedObjective}
                onChange={(e) => setSelectedObjective(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium text-slate-800 dark:text-slate-100"
              >
                <option value="Prise de masse & Force">Prise de masse musculaire & Force</option>
                <option value="Perte de gras & Tonification">Perte de masse grasse & Tonification</option>
                <option value="Endurance & Performance Cardio">Endurance, Hyrox & Préparation Running</option>
                <option value="Mobilité & Réduction des douleurs">Mobilité, Posture & Prévention blessures</option>
                <option value="Remise en forme après arrêt">Remise en forme progressive (reprise)</option>
              </select>
            </div>

            {/* Level & Frequency Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Niveau du client
                </label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium text-slate-800 dark:text-slate-100"
                >
                  <option value="Débutant">Débutant (0-6 mois)</option>
                  <option value="Intermédiaire">Intermédiaire (1-2 ans)</option>
                  <option value="Avancé">Avancé (3+ ans)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Fréquence / semaine
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium text-slate-800 dark:text-slate-100"
                >
                  <option value={1}>1 séance / semaine</option>
                  <option value={2}>2 séances / semaine</option>
                  <option value={3}>3 séances / semaine</option>
                  <option value={4}>4 séances / semaine</option>
                </select>
              </div>
            </div>

            {/* Equipment */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Matériel disponible
              </label>
              <input
                type="text"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                placeholder="Ex: Poids du corps, kettlebell 16kg, banc, salle de sport complète..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Constraints */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Contraintes / Sensibilités
              </label>
              <input
                type="text"
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
                placeholder="Ex: Douleur genou gauche, éviter les sauts répétés..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* CTA Button */}
            <button
              onClick={handleGenerateProgram}
              disabled={isGeneratingProgram}
              className="w-full py-3 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-black rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isGeneratingProgram ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Génération par l’IA en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Générer le programme personnalisé</span>
                </>
              )}
            </button>
          </div>

          {/* Generated Result Card */}
          {generatedProgram && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-4 border-2 border-[#00D664]/50 shadow-md space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 bg-[#00D664]/20 text-[#008A3E] dark:text-[#00D664] text-[10px] font-black rounded-full uppercase tracking-wider">
                    Généré par Gemini • 4 semaines
                  </span>
                  <h3 className="text-base font-black text-[#0F172A] dark:text-white mt-1">
                    {generatedProgram.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {generatedProgram.sessions.length} séances par semaine • Niveau {generatedProgram.difficulty}
                  </p>
                </div>
              </div>

              {/* Sessions list */}
              <div className="space-y-3">
                {generatedProgram.sessions.map((sess, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-xs text-[#0F172A] dark:text-white">
                        {sess.title}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {sess.durationMinutes} min
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {sess.exercises.map((ex, exIdx) => (
                        <div key={exIdx} className="p-2 bg-white dark:bg-slate-800 rounded-xl text-[11px] border border-slate-100 dark:border-slate-700 flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {ex.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {ex.targetMuscle} • {ex.notes}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 block text-[11px]">
                              {ex.sets} × {ex.reps}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              Repos: {ex.restSeconds}s
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action: Inject into database */}
              {programAssignedSuccess ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-2xl flex items-center gap-2 text-xs font-bold text-[#008A3E] dark:text-[#00D664]">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Programme assigné avec succès à {targetClient?.clientName} !</span>
                </div>
              ) : (
                <button
                  onClick={handleAssignProgramToClient}
                  className="w-full py-3 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] font-black rounded-2xl text-xs flex items-center justify-center gap-2 transition hover:opacity-90 cursor-pointer active:scale-98 shadow-xs"
                >
                  <Zap className="w-4 h-4 text-[#00D664] fill-current" />
                  <span>⚡ Enregistrer & assigner à {targetClient?.clientName}</span>
                </button>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: NUTRITION & CALCULATEUR METABOLIQUE */}
      {/* ============================================================== */}
      {activeTab === 'nutrition' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Salad className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-[#0F172A] dark:text-white">
                  Calculateur Métabolique & Macros
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Harris-Benedict révisé + cibles en grammes de protéines, glucides, lipides
                </p>
              </div>
            </div>

            {/* Gender and Goal */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Sexe biologique
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setMacroGender('homme')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition ${
                      macroGender === 'homme'
                        ? 'bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white shadow-xs'
                        : 'text-slate-400'
                    }`}
                  >
                    Homme
                  </button>
                  <button
                    type="button"
                    onClick={() => setMacroGender('femme')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition ${
                      macroGender === 'femme'
                        ? 'bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white shadow-xs'
                        : 'text-slate-400'
                    }`}
                  >
                    Femme
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Objectif nutritionnel
                </label>
                <select
                  value={macroGoal}
                  onChange={(e) => setMacroGoal(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-slate-100"
                >
                  <option value="perte_gras">Déficit (Perte de gras)</option>
                  <option value="prise_masse">Surplus (Prise de muscle)</option>
                  <option value="maintien">Maintien énergétique</option>
                  <option value="recomposition">Recomposition corporelle</option>
                </select>
              </div>
            </div>

            {/* Metrics: Poids, Taille, Âge */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Poids (kg)
                </label>
                <input
                  type="number"
                  value={macroWeight}
                  onChange={(e) => setMacroWeight(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-100 text-center"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Taille (cm)
                </label>
                <input
                  type="number"
                  value={macroHeight}
                  onChange={(e) => setMacroHeight(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-100 text-center"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Âge (ans)
                </label>
                <input
                  type="number"
                  value={macroAge}
                  onChange={(e) => setMacroAge(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-100 text-center"
                />
              </div>
            </div>

            {/* Activity Level */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Niveau d'activité global
              </label>
              <select
                value={macroActivity}
                onChange={(e) => setMacroActivity(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-medium text-slate-800 dark:text-slate-100"
              >
                <option value="sedentaire">Sédentaire (travail de bureau, peu de pas)</option>
                <option value="leger">Légèrement actif (1-2 entraînements / semaine)</option>
                <option value="modere">Modérément actif (3-4 entraînements / semaine)</option>
                <option value="intense">Très actif (5-6 entraînements intenses)</option>
                <option value="tres_intense">Athlète professionnel / bi-quotidien</option>
              </select>
            </div>

            <button
              onClick={handleCalculateMacros}
              className="w-full py-3 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-black rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer active:scale-98"
            >
              <Activity className="w-4 h-4" />
              <span>Calculer les besoins nutritionnels</span>
            </button>
          </div>

          {/* Macro Results */}
          {macroResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">
                    Cible Quotidienne
                  </span>
                  <div className="text-2xl font-black text-[#0F172A] dark:text-white">
                    {macroResult.targetCalories} <span className="text-xs font-medium text-slate-400">kcal/jour</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400">TMB : {macroResult.tmb} kcal</span>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    DEJ : {macroResult.dej} kcal
                  </div>
                </div>
              </div>

              {/* 3 Macro Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200/80 dark:border-red-800 text-center">
                  <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">
                    Protéines
                  </span>
                  <div className="text-base font-black text-red-700 dark:text-red-300 mt-0.5">
                    {macroResult.proteinsGrams}g
                  </div>
                  <span className="text-[9px] text-red-500 font-medium">
                    {macroResult.proteinsPercent}% des kcal
                  </span>
                </div>

                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200/80 dark:border-amber-800 text-center">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                    Glucides
                  </span>
                  <div className="text-base font-black text-amber-700 dark:text-amber-300 mt-0.5">
                    {macroResult.carbsGrams}g
                  </div>
                  <span className="text-[9px] text-amber-500 font-medium">
                    {macroResult.carbsPercent}% des kcal
                  </span>
                </div>

                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200/80 dark:border-blue-800 text-center">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                    Lipides
                  </span>
                  <div className="text-base font-black text-blue-700 dark:text-blue-300 mt-0.5">
                    {macroResult.fatsGrams}g
                  </div>
                  <span className="text-[9px] text-blue-500 font-medium">
                    {macroResult.fatsPercent}% des kcal
                  </span>
                </div>
              </div>

              {/* Advice */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 whitespace-pre-line text-slate-700 dark:text-slate-300">
                <span className="font-extrabold text-[#0F172A] dark:text-white block">
                  Recommandations diététiques :
                </span>
                {macroResult.mealPlanAdvice}
              </div>

              {/* Copy Button */}
              <button
                onClick={() => {
                  const text = `Plan Nutritionnel pour ${targetClient?.clientName} :\n- Calories : ${macroResult.targetCalories} kcal/jour\n- Protéines : ${macroResult.proteinsGrams}g\n- Glucides : ${macroResult.carbsGrams}g\n- Lipides : ${macroResult.fatsGrams}g\n- Eau : ${macroResult.waterLiters}L/jour\n\nConseils :\n${macroResult.mealPlanAdvice}`;
                  navigator.clipboard.writeText(text);
                  setMacroCopied(true);
                  setTimeout(() => setMacroCopied(false), 2000);
                }}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {macroCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copié dans le presse-papier !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier le plan pour le client</span>
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: MESSAGES & RELANCES CLIENTS */}
      {/* ============================================================== */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-[#0F172A] dark:text-white">
                  Rédacteur de Messages Professionnels
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gagnez du temps : relances, encouragements et débriefings en 1 clic
                </p>
              </div>
            </div>

            {/* Message Scenario */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Scénario du message
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMsgType('congrats')}
                  className={`p-2.5 rounded-xl text-xs font-bold border text-left transition ${
                    msgType === 'congrats'
                      ? 'border-[#00D664] bg-emerald-50/60 dark:bg-emerald-950/40 text-[#008A3E] dark:text-[#00D664]'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  🔥 Bravo post-séance
                </button>

                <button
                  type="button"
                  onClick={() => setMsgType('followup')}
                  className={`p-2.5 rounded-xl text-xs font-bold border text-left transition ${
                    msgType === 'followup'
                      ? 'border-[#00D664] bg-emerald-50/60 dark:bg-emerald-950/40 text-[#008A3E] dark:text-[#00D664]'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  📅 Relance client inactif
                </button>

                <button
                  type="button"
                  onClick={() => setMsgType('soreness')}
                  className={`p-2.5 rounded-xl text-xs font-bold border text-left transition ${
                    msgType === 'soreness'
                      ? 'border-[#00D664] bg-emerald-50/60 dark:bg-emerald-950/40 text-[#008A3E] dark:text-[#00D664]'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  💡 Conseils courbatures
                </button>

                <button
                  type="button"
                  onClick={() => setMsgType('monthly_review')}
                  className={`p-2.5 rounded-xl text-xs font-bold border text-left transition ${
                    msgType === 'monthly_review'
                      ? 'border-[#00D664] bg-emerald-50/60 dark:bg-emerald-950/40 text-[#008A3E] dark:text-[#00D664]'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  📈 Bilan mensuel & cap
                </button>
              </div>
            </div>

            {/* Tone selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Tonalité
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                <button
                  type="button"
                  onClick={() => setMsgTone('motivant')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition ${
                    msgTone === 'motivant'
                      ? 'bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white shadow-xs'
                      : 'text-slate-400'
                  }`}
                >
                  Motivant 🔥
                </button>
                <button
                  type="button"
                  onClick={() => setMsgTone('chaleureux')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition ${
                    msgTone === 'chaleureux'
                      ? 'bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white shadow-xs'
                      : 'text-slate-400'
                  }`}
                >
                  Chaleureux 💛
                </button>
                <button
                  type="button"
                  onClick={() => setMsgTone('technique')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition ${
                    msgTone === 'technique'
                      ? 'bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white shadow-xs'
                      : 'text-slate-400'
                  }`}
                >
                  Technique 🎯
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerateMessage}
              className="w-full py-3 bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] font-black rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer active:scale-98"
            >
              <Sparkles className="w-4 h-4" />
              <span>Générer le message personnalisé</span>
            </button>
          </div>

          {/* Generated Message display */}
          {generatedMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-500 uppercase">
                  Aperçu pour {targetClient?.clientName}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  Prêt à envoyer
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {generatedMessage}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedMessage);
                    setMsgCopied(true);
                    setTimeout(() => setMsgCopied(false), 2000);
                  }}
                  className="py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {msgCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{msgCopied ? 'Copié !' : 'Copier'}</span>
                </button>

                <button
                  onClick={() => {
                    if (targetClient) {
                      startChatWithClient(targetClient);
                    }
                  }}
                  className="py-2.5 bg-[#0F172A] dark:bg-white text-white dark:text-[#0F172A] font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer hover:opacity-90 active:scale-98"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Ouvrir dans le Chat</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: CHAT LIBRE AVEC LE COPILOTE IA */}
      {/* ============================================================== */}
      {activeTab === 'chat' && (
        <div className="flex flex-col space-y-3">
          {/* Quick Prompts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            <button
              onClick={() => handleSendMessage("Comment adapter le soulevé de terre pour un client ayant une gêne aux lombaires ?")}
              className="shrink-0 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full font-bold text-slate-600 dark:text-slate-300 hover:border-[#00D664] transition cursor-pointer"
            >
              🩹 Adapter pour mal de dos
            </button>
            <button
              onClick={() => handleSendMessage("Propose un protocole HIIT express 20 minutes avec kettlebell")}
              className="shrink-0 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full font-bold text-slate-600 dark:text-slate-300 hover:border-[#00D664] transition cursor-pointer"
            >
              ⏱️ HIIT Kettlebell 20min
            </button>
            <button
              onClick={() => handleSendMessage("Quels sont les meilleurs tests de mobilité pour les chevilles et les hanches ?")}
              className="shrink-0 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full font-bold text-slate-600 dark:text-slate-300 hover:border-[#00D664] transition cursor-pointer"
            >
              🧘 Tests mobilité de hanche
            </button>
          </div>

          {/* Messages list */}
          <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-3 border border-slate-200 dark:border-slate-700 shadow-xs min-h-[380px] max-h-[460px] overflow-y-auto space-y-3">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#00D664] text-[#0F172A] font-bold rounded-tr-xs'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs whitespace-pre-line'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                  {msg.time}
                </span>
              </div>
            ))}

            {isAiReplying && (
              <div className="flex items-center gap-1.5 p-2 bg-slate-100 dark:bg-slate-900 rounded-xl w-fit text-xs text-slate-500">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00D664]" />
                <span className="font-medium text-[11px]">Gemini formule une analyse technique...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Posez une question technique, biomécanique ou nutrition..."
              className="flex-1 bg-transparent border-none text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none px-2"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!userInput.trim() || isAiReplying}
              className="w-9 h-9 rounded-xl bg-[#00D664] hover:bg-[#00B050] text-[#0F172A] flex items-center justify-center transition disabled:opacity-40 cursor-pointer shadow-xs active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
