import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { supabase, authErrorFr, RECOVERY_FLAG } from '../../lib/supabase';

/** Affiché après un clic sur « Mot de passe oublié » dans l'email : choix du nouveau mot de passe. */
export const NewPasswordModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const check = () => {
      try { if (sessionStorage.getItem(RECOVERY_FLAG)) setOpen(true); } catch { /* ignore */ }
    };
    check();
    window.addEventListener('fmc:password-recovery', check);
    return () => window.removeEventListener('fmc:password-recovery', check);
  }, []);

  const close = () => {
    try { sessionStorage.removeItem(RECOVERY_FLAG); } catch { /* ignore */ }
    setOpen(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Le mot de passe doit contenir au moins 6 caractères.');
    if (password !== confirm) return setError('Les deux mots de passe ne correspondent pas.');
    if (!supabase) return;
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(authErrorFr(err.message));
    setDone(true);
    setTimeout(close, 1500);
  };

  if (!open) return null;
  const input = 'w-full h-12 px-4 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#0B0F19] text-[#0F172A] dark:text-white focus:outline-none focus:border-[#00D664]';

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <form
        onSubmit={save}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-password-title"
        className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#151B27] p-6 shadow-2xl pb-[calc(1.5rem+var(--sab,0px))]"
      >
        <div className="w-12 h-12 rounded-2xl bg-[#00D664]/15 text-[#008A3E] dark:text-[#2BE07E] flex items-center justify-center mb-4">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 id="new-password-title" className="text-lg font-extrabold text-[#0F172A] dark:text-white">
          {done ? 'Mot de passe modifié ✅' : 'Choisissez un nouveau mot de passe'}
        </h2>
        {!done && (
          <>
            <div className="mt-4 space-y-3">
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  autoComplete="new-password"
                  className={`${input} pr-12`}
                />
                <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Masquer' : 'Afficher'} className="absolute inset-y-0 right-3 flex items-center text-slate-400 cursor-pointer">
                  {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <input
                type={show ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirmer le mot de passe"
                autoComplete="new-password"
                className={input}
              />
            </div>
            {error && <p className="mt-3 text-sm text-rose-500 font-semibold">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={close} className="h-12 rounded-full border border-slate-300 dark:border-slate-600 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                Plus tard
              </button>
              <button type="submit" disabled={busy} className="h-12 rounded-full bg-[#00D664] text-[#0F172A] font-bold disabled:opacity-60 cursor-pointer">
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};
