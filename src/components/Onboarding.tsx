import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Award, CalendarCheck, TrendingUp, ArrowRight, User, Briefcase, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { LogoIcon } from './common/Logo';
import { PrimaryButton } from './ui/fmc';

export const Onboarding: React.FC = () => {
  const { navigateTo, loginAs, registerUser } = useApp();
  const [step, setStep] = useState<'splash' | 'role_select' | 'auth'>('splash');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<'client' | 'coach'>('client');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleQuickDemoClient = () => {
    loginAs('client');
  };

  const handleQuickDemoCoach = () => {
    loginAs('coach');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    registerUser(name, email, selectedRole);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginAs(selectedRole);
  };

  return (
    <div className="min-h-screen bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 flex flex-col justify-between px-6 pt-6 pb-[calc(1.5rem+var(--sab))] max-w-md mx-auto relative overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full bg-[radial-gradient(circle,rgba(0,214,100,0.14),transparent_65%)]" />
      {step === 'splash' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col py-4 relative z-10"
        >
          <div className="text-center pt-6">
            <div className="mx-auto w-[120px] h-[120px] rounded-[34px] bg-fmc-dark flex items-center justify-center shadow-[0_0_60px_rgba(0,214,100,0.45)]">
              <LogoIcon size={68} />
            </div>
            <h1 className="text-[44px] leading-none font-semibold tracking-tight mt-10">FindMyCoach</h1>
            <p className="text-lg text-slate-500 mt-3">Votre coach, partout et tout le temps</p>
          </div>

          <div className="space-y-7 my-auto py-10 px-2">
            {[
              { icon: <Award className="w-6 h-6" />, title: 'Mentors experts', text: 'Des coachs certifiés en fitness, nutrition, mindset, carrière et business.' },
              { icon: <CalendarCheck className="w-6 h-6" />, title: 'Réservation flexible', text: 'Planifiez des séances individuelles adaptées à votre emploi du temps.' },
              { icon: <TrendingUp className="w-6 h-6" />, title: 'Suivi de progression', text: 'Visualisez votre évolution et atteignez vos objectifs.' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-5">
                <span className="w-12 h-12 rounded-full bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-800 text-fmc-green-ink flex items-center justify-center shrink-0 shadow-xs">
                  {f.icon}
                </span>
                <div>
                  <h2 className="text-lg font-semibold">{f.title}</h2>
                  <p className="text-[15px] text-slate-500 leading-snug mt-0.5">{f.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <PrimaryButton id="btn-onboarding-start" onClick={() => setStep('role_select')} icon={<ArrowRight className="w-5 h-5" />}>
              Commencer
            </PrimaryButton>
            <button
              id="btn-onboarding-login"
              onClick={() => {
                setAuthMode('login');
                setStep('auth');
              }}
              className="w-full h-12 text-base font-semibold text-fmc-green-ink cursor-pointer"
            >
              Se connecter
            </button>
            <p className="text-xs text-center text-slate-500 pt-2">
              En continuant, vous acceptez nos Conditions d'utilisation
            </p>
          </div>
        </motion.div>
      )}

      {step === 'role_select' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex flex-col justify-between py-4 relative z-10"
        >
          <div>
            <button
              onClick={() => setStep('splash')}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 mb-4 flex items-center gap-1"
            >
              ← Retour
            </button>

            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#00D664]/15 text-[#00B050] rounded-full text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Bienvenue sur FindMyCoach
              </span>
              <h2 className="text-[28px] font-semibold tracking-tight">Quel est votre profil ?</h2>
              <p className="text-xs text-slate-500 mt-1">Choisissez votre espace pour continuer</p>
            </div>

            <div className="space-y-3.5">
              <button
                id="btn-select-client-role"
                onClick={() => {
                  setSelectedRole('client');
                  setAuthMode('register');
                  setStep('auth');
                }}
                className={`w-full p-4 rounded-[24px] border-2 text-left transition flex items-center gap-3.5 cursor-pointer bg-white dark:bg-slate-900 ${
                  selectedRole === 'client'
                    ? 'border-[#00D664] shadow-md shadow-[#00D664]/10 ring-1 ring-[#00D664]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#00D664]/15 text-[#00B050] flex items-center justify-center shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[#0F172A] text-sm">Je recherche un coach</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Trouvez un mentor d'élite, réservez des séances et atteignez vos objectifs.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                id="btn-select-coach-role"
                onClick={() => {
                  setSelectedRole('coach');
                  setAuthMode('register');
                  setStep('auth');
                }}
                className={`w-full p-4 rounded-[24px] border-2 text-left transition flex items-center gap-3.5 cursor-pointer bg-white dark:bg-slate-900 ${
                  selectedRole === 'coach'
                    ? 'border-[#00D664] shadow-md shadow-[#00D664]/10 ring-1 ring-[#00D664]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[#0F172A] text-sm">Je suis coach professionnel</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Publiez vos disponibilités, trouvez de nouveaux clients et suivez vos revenus.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="pt-6">
            <div className="p-4 bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-800 rounded-[24px] text-center space-y-3">
              <p className="text-xs text-slate-500 font-semibold">Accès rapide démonstration :</p>
              <div className="flex gap-2">
                <button
                  onClick={handleQuickDemoClient}
                  className="flex-1 h-11 bg-fmc-bg dark:bg-slate-800 text-sm font-semibold rounded-full transition cursor-pointer"
                >
                  Démo Client (Alex)
                </button>
                <button
                  onClick={handleQuickDemoCoach}
                  className="flex-1 h-11 bg-fmc-bg dark:bg-slate-800 text-sm font-semibold rounded-full transition cursor-pointer"
                >
                  Démo Coach (Marcus)
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {step === 'auth' && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex flex-col justify-between py-4 relative z-10"
        >
          <div>
            <button
              onClick={() => setStep('role_select')}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 mb-3 flex items-center gap-1"
            >
              ← Retour
            </button>

            <div className="text-center mb-5">
              <span className="inline-block px-3 py-1 bg-[#00D664]/15 text-[#00B050] rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                {selectedRole === 'client' ? 'Espace Client' : 'Espace Coach Pro'}
              </span>
              <h2 className="text-[28px] font-semibold tracking-tight">
                {authMode === 'register' ? 'Créer un compte' : 'Connexion'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {authMode === 'register' 
                  ? 'Rejoignez FindMyCoach en quelques secondes'
                  : 'Accédez à votre espace et à vos séances'}
              </p>
            </div>

            <form onSubmit={authMode === 'register' ? handleRegister : handleLogin} className="space-y-3">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nom complet</label>
                  <input
                    id="input-auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Dupont"
                    className="w-full h-12 px-4 bg-white dark:bg-slate-900 text-[15px] rounded-2xl border border-fmc-line dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adresse email</label>
                <input
                  id="input-auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.rivers@gmail.com"
                  className="w-full h-12 px-4 bg-white dark:bg-slate-900 text-[15px] rounded-2xl border border-fmc-line dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mot de passe</label>
                <input
                  id="input-auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 bg-white dark:bg-slate-900 text-[15px] rounded-2xl border border-fmc-line dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-fmc-green/50"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-14 bg-fmc-green text-fmc-navy font-bold rounded-full transition shadow-[0_10px_30px_rgba(0,214,100,0.25)] text-[15px] cursor-pointer active:scale-[0.98]"
                >
                  {authMode === 'register' ? "S'inscrire et continuer" : 'Se connecter'}
                </button>
              </div>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-xs font-bold text-slate-600 hover:text-[#00B050]"
              >
                {authMode === 'register' 
                  ? 'Déjà un compte ? Se connecter'
                  : "Pas encore de compte ? S'inscrire"}
              </button>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={() => loginAs(selectedRole)}
              className="w-full h-12 bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-full transition cursor-pointer"
            >
              Connexion rapide avec compte démo ({selectedRole})
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
