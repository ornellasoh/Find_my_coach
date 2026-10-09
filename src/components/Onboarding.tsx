import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Award,
  CalendarCheck,
  TrendingUp,
  ArrowRight,
  ChevronLeft,
  Search,
  Briefcase,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { motion } from 'motion/react';
import { LogoIcon } from './common/Logo';
import { PrimaryButton } from './ui/fmc';
import { CITY_PRESETS } from '../utils/geo';

type Role = 'client' | 'coach';
type Step = 'welcome' | 'register' | 'login';

const inputCls =
  'w-full h-[52px] px-4 bg-white dark:bg-slate-900 text-[15px] rounded-2xl border border-fmc-line dark:border-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-fmc-green/50 focus:border-fmc-green transition';

const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <label className="block">
    <span className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</span>
    {children}
    {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
  </label>
);

/** Choix Client / Coach (cartes larges, adaptées téléphone et tablette). */
const RoleToggle: React.FC<{ role: Role; onChange: (r: Role) => void }> = ({ role, onChange }) => (
  <div className="grid grid-cols-2 gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-fmc-line dark:border-slate-800">
    {(['client', 'coach'] as Role[]).map((r) => (
      <button
        key={r}
        type="button"
        onClick={() => onChange(r)}
        className={`h-11 rounded-xl text-sm font-semibold transition cursor-pointer ${
          role === r ? 'bg-fmc-green text-fmc-navy' : 'text-slate-500'
        }`}
      >
        {r === 'client' ? 'Client' : 'Coach'}
      </button>
    ))}
  </div>
);

export const Onboarding: React.FC = () => {
  const { loginAs, registerUser, loginWithPassword, resetPassword, categories, isOnline } = useApp();
  const [step, setStep] = useState<Step>('welcome');
  const [role, setRole] = useState<Role>('client');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [city, setCity] = useState('Paris');
  const [category, setCategory] = useState(categories[0]?.name || 'Sport & Fitness');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const startRegister = (r: Role) => {
    setRole(r);
    setError('');
    setInfo('');
    setStep('register');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!name.trim() || !email.trim()) return setError('Indiquez votre nom et votre email.');
    if (password.length < 6) return setError('Le mot de passe doit contenir au moins 6 caractères.');
    if (!acceptTerms) return setError("Merci d'accepter les conditions d'utilisation.");
    setBusy(true);
    const res = await registerUser(name.trim(), email.trim(), role, {
      password,
      city,
      phone: phone.trim() || undefined,
      category: role === 'coach' ? category : undefined,
    });
    setBusy(false);
    if (res.error) return setError(res.error);
    if (res.needsConfirmation) {
      setInfo(res.info || 'Vérifiez votre boîte mail pour confirmer votre compte.');
      setPassword('');
      setStep('login');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isOnline) {
      // Mode démo : ouvre le compte de démonstration du rôle choisi
      loginAs(role);
      return;
    }
    if (!email.trim() || !password) return setError('Indiquez votre email et votre mot de passe.');
    setBusy(true);
    const res = await loginWithPassword(email, password);
    setBusy(false);
    if (res.error) setError(res.error);
  };

  const handleForgotPassword = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) return setError("Saisissez d'abord votre email ci-dessus.");
    setBusy(true);
    const res = await resetPassword(email);
    setBusy(false);
    if (res.error) setError(res.error);
    else setInfo(res.info || 'Email envoyé.');
  };

  const Back = () => (
    <button
      type="button"
      onClick={() => {
        setError('');
        setInfo('');
        setStep('welcome');
      }}
      aria-label="Retour"
      className="w-11 h-11 -ml-2 flex items-center justify-center cursor-pointer"
    >
      <ChevronLeft className="w-7 h-7" />
    </button>
  );

  return (
    <div className="min-h-screen bg-fmc-bg dark:bg-[#0B0F19] text-fmc-navy dark:text-slate-100 relative overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(0,214,100,0.14),transparent_65%)]" />

      <div className="relative min-h-screen max-w-md md:max-w-lg mx-auto flex flex-col px-6 pt-6 pb-[calc(1.5rem+var(--sab))]">
        {step === 'welcome' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col">
            <div className="text-center pt-6">
              <div className="mx-auto w-[112px] h-[112px] rounded-[32px] bg-fmc-dark flex items-center justify-center shadow-[0_0_60px_rgba(0,214,100,0.45)]">
                <LogoIcon size={64} />
              </div>
              <h1 className="text-[40px] leading-none font-semibold tracking-tight mt-8">FindMyCoach</h1>
              <p className="text-lg text-slate-500 mt-3">Votre coach, partout et tout le temps</p>
            </div>

            <div className="space-y-6 my-auto py-10 px-1">
              {[
                { icon: <Award className="w-6 h-6" />, title: 'Mentors experts', text: 'Coachs certifiés en fitness, nutrition, mindset, carrière et business.' },
                { icon: <CalendarCheck className="w-6 h-6" />, title: 'Réservation flexible', text: 'Des séances adaptées à votre emploi du temps, en visio ou en présentiel.' },
                { icon: <TrendingUp className="w-6 h-6" />, title: 'Suivi de progression', text: 'Visualisez votre évolution et atteignez vos objectifs.' },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-5">
                  <span className="w-12 h-12 rounded-full bg-white dark:bg-slate-900 border border-fmc-line dark:border-slate-800 text-fmc-green-ink flex items-center justify-center shrink-0">
                    {f.icon}
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold">{f.title}</h2>
                    <p className="text-[15px] text-slate-500 leading-snug mt-0.5">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-center text-sm font-medium text-slate-500 mb-1">Créer mon compte</p>
              <PrimaryButton id="btn-register-client" onClick={() => startRegister('client')} icon={<Search className="w-5 h-5" />}>
                Je cherche un coach
              </PrimaryButton>
              <button
                id="btn-register-coach"
                type="button"
                onClick={() => startRegister('coach')}
                className="w-full h-14 rounded-full bg-fmc-dark text-white font-bold text-[15px] flex items-center justify-center gap-2.5 active:scale-[0.98] transition cursor-pointer"
              >
                <Briefcase className="w-5 h-5 text-fmc-green" />
                Je suis coach
              </button>
              <button
                id="btn-onboarding-login"
                type="button"
                onClick={() => {
                  setError('');
                  setInfo('');
                  setStep('login');
                }}
                className="w-full h-12 text-base font-semibold text-fmc-green-ink cursor-pointer"
              >
                J'ai déjà un compte · Se connecter
              </button>
            </div>
          </motion.div>
        )}

        {step === 'register' && (
          <motion.form
            key="register"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleRegister}
            className="flex-1 flex flex-col"
          >
            <Back />
            <div className="mt-2 mb-6">
              <span className="inline-block px-3 py-1 rounded-full bg-fmc-green/15 text-fmc-green-ink text-xs font-bold uppercase tracking-wide">
                {role === 'client' ? 'Espace client' : 'Espace coach'}
              </span>
              <h1 className="text-[30px] font-semibold tracking-tight mt-3 leading-tight">
                {role === 'client' ? 'Trouvez votre coach idéal' : 'Développez votre activité'}
              </h1>
              <p className="text-[15px] text-slate-500 mt-2">
                {role === 'client'
                  ? 'Créez votre compte en quelques secondes pour réserver vos séances.'
                  : 'Publiez votre profil, vos disponibilités et recevez des réservations.'}
              </p>
            </div>

            <div className="mb-5">
              <RoleToggle role={role} onChange={setRole} />
            </div>

            <div className="space-y-4">
              <Field label="Nom complet">
                <input id="input-auth-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Dupont" autoComplete="name" />
              </Field>
              <Field label="Email">
                <input id="input-auth-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@email.com" autoComplete="email" inputMode="email" />
              </Field>
              <Field label="Téléphone (optionnel)">
                <input type="tel" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" autoComplete="tel" inputMode="tel" />
              </Field>
              <Field label="Ville">
                <select className={`${inputCls} appearance-none`} value={city} onChange={(e) => setCity(e.target.value)}>
                  {CITY_PRESETS.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </Field>
              {role === 'coach' && (
                <Field label="Votre univers de coaching" hint="Vous pourrez détailler vos spécialités, tarifs et diplômes juste après.">
                  <select className={`${inputCls} appearance-none`} value={category} onChange={(e) => setCategory(e.target.value)}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Mot de passe" hint="6 caractères minimum">
                <div className="relative">
                  <input
                    id="input-auth-password"
                    type={showPassword ? 'text' : 'password'}
                    className={`${inputCls} pr-12`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </Field>

              <button type="button" onClick={() => setAcceptTerms((v) => !v)} className="flex items-start gap-3 text-left pt-1 cursor-pointer">
                <span className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition ${acceptTerms ? 'bg-fmc-green border-fmc-green' : 'border-slate-300'}`}>
                  {acceptTerms && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </span>
                <span className="text-sm text-slate-500">
                  J'accepte les conditions d'utilisation et la politique de confidentialité de Find My Coach.
                </span>
              </button>
            </div>

            {error && <p className="text-sm text-rose-500 font-medium mt-4">{error}</p>}

            <div className="mt-auto pt-8 space-y-2">
              <PrimaryButton type="submit" disabled={busy} icon={<ArrowRight className="w-5 h-5" />}>
                {busy ? 'Création du compte…' : role === 'client' ? 'Créer mon compte' : 'Créer mon profil coach'}
              </PrimaryButton>
              <button type="button" onClick={() => setStep('login')} className="w-full h-12 text-sm font-semibold text-slate-500 cursor-pointer">
                Déjà inscrit ? <span className="text-fmc-green-ink">Se connecter</span>
              </button>
            </div>
          </motion.form>
        )}

        {step === 'login' && (
          <motion.form
            key="login"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleLogin}
            className="flex-1 flex flex-col"
          >
            <Back />
            <div className="mt-2 mb-6">
              <h1 className="text-[30px] font-semibold tracking-tight leading-tight">Bon retour !</h1>
              <p className="text-[15px] text-slate-500 mt-2">Connectez-vous à votre espace.</p>
            </div>

            {!isOnline && (
              <div className="mb-5">
                <RoleToggle role={role} onChange={setRole} />
              </div>
            )}

            {info && (
              <p className="mb-4 p-4 rounded-2xl bg-fmc-green/10 text-sm text-fmc-navy dark:text-slate-100">{info}</p>
            )}

            <div className="space-y-4">
              <Field label="Email">
                <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@email.com" autoComplete="email" inputMode="email" />
              </Field>
              <Field label="Mot de passe">
                <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
              </Field>
              {isOnline && (
                <button type="button" onClick={handleForgotPassword} disabled={busy} className="text-sm font-semibold text-fmc-green-ink cursor-pointer">
                  Mot de passe oublié ?
                </button>
              )}
            </div>

            {error && <p className="text-sm text-rose-500 font-medium mt-4">{error}</p>}

            <div className="mt-auto pt-8 space-y-2">
              <PrimaryButton type="submit" disabled={busy} icon={<ArrowRight className="w-5 h-5" />}>
                {busy ? 'Connexion…' : 'Se connecter'}
              </PrimaryButton>
              <button type="button" onClick={() => startRegister(role)} className="w-full h-12 text-sm font-semibold text-slate-500 cursor-pointer">
                Pas encore de compte ? <span className="text-fmc-green-ink">S'inscrire</span>
              </button>
              {!isOnline && (
                <p className="text-xs text-center text-slate-400">
                  Version de démonstration : la connexion ouvre le compte démo {role === 'client' ? 'client' : 'coach'}.
                </p>
              )}
            </div>
          </motion.form>
        )}
      </div>
    </div>
  );
};
