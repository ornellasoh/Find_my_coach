import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

/**
 * Suppression définitive du compte (exigée par l'App Store et Google Play).
 * Le serveur refuse s'il reste des séances à venir.
 */
export const DeleteAccount: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { logout } = useApp();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    if (busy) return;
    setOpen(false);
    setTyped('');
    setError('');
  };

  const confirmDelete = async () => {
    setBusy(true);
    setError('');
    try {
      if (supabase) {
        const { data, error: err } = await supabase.functions.invoke('delete-account', { body: { confirm: 'SUPPRIMER' } });
        if (err) {
          let message = "La suppression a échoué. Réessayez ou écrivez-nous à contact@findmycoach.io.";
          try {
            const ctx = (err as { context?: Response }).context;
            if (ctx) message = (await ctx.json()).error || message;
          } catch { /* ignore */ }
          throw new Error(message);
        }
        if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      }
      try { localStorage.clear(); } catch { /* ignore */ }
      setOpen(false);
      logout();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'La suppression a échoué.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        id="btn-delete-account"
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full py-3 text-sm font-semibold text-slate-400 hover:text-rose-500 flex items-center justify-center gap-2 cursor-pointer ${className}`}
      >
        <Trash2 className="w-4 h-4" />
        Supprimer mon compte
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#151B27] p-6 shadow-2xl pb-[calc(1.5rem+var(--sab,0px))]"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/15 text-rose-500 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button type="button" onClick={close} aria-label="Fermer" className="p-1 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 id="delete-account-title" className="text-lg font-extrabold text-[#0F172A] dark:text-white">
              Supprimer définitivement votre compte ?
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300 list-disc pl-5">
              <li>Votre profil, vos photos, messages, favoris et objectifs seront effacés.</li>
              <li>Si vous êtes coach, votre fiche et vos créneaux disparaîtront.</li>
              <li>Les factures des séances passées sont conservées de façon anonyme (obligation légale).</li>
              <li>Cette action est irréversible.</li>
            </ul>
            <label className="block mt-5 text-xs font-bold text-slate-500 dark:text-slate-400">
              Pour confirmer, tapez <span className="text-rose-500">SUPPRIMER</span>
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              className="mt-1.5 w-full h-12 px-4 rounded-2xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#0B0F19] text-[#0F172A] dark:text-white font-semibold tracking-wider focus:outline-none focus:border-rose-400"
            />
            {error && <p className="mt-3 text-sm text-rose-500 font-semibold">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={close} disabled={busy} className="h-12 rounded-full border border-slate-300 dark:border-slate-600 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                Annuler
              </button>
              <button
                id="btn-confirm-delete-account"
                type="button"
                onClick={confirmDelete}
                disabled={busy || typed.trim().toUpperCase() !== 'SUPPRIMER'}
                className="h-12 rounded-full bg-rose-500 text-white font-semibold disabled:opacity-40 cursor-pointer"
              >
                {busy ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
