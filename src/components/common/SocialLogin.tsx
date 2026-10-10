import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { signInWithProvider, type OAuthProvider } from '../../lib/oauth';

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true" fill="currentColor">
    <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.75 2.21 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.08 2.67-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.33-3.56zM14.18 6.13c.61-.74 1.02-1.76.91-2.78-.88.04-1.94.59-2.57 1.32-.56.65-1.06 1.69-.93 2.69.98.08 1.98-.5 2.59-1.23z" />
  </svg>
);

/** Boutons « Continuer avec Apple / Google » + séparateur « ou ». */
export const SocialLogin: React.FC<{ role?: 'client' | 'coach'; onError?: (msg: string) => void }> = ({ role, onError }) => {
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const isAndroid = Capacitor.getPlatform() === 'android';

  const go = async (provider: OAuthProvider) => {
    setBusy(provider);
    const res = await signInWithProvider(provider, role);
    setBusy(null);
    if (res.error) onError?.(res.error);
  };

  const apple = (
    <button
      key="apple"
      id="btn-oauth-apple"
      type="button"
      onClick={() => go('apple')}
      disabled={!!busy}
      className="w-full h-14 rounded-full bg-black dark:bg-white text-white dark:text-black font-semibold text-[15px] flex items-center justify-center gap-2.5 active:scale-[0.98] transition cursor-pointer disabled:opacity-60"
    >
      <AppleIcon />
      {busy === 'apple' ? 'Ouverture…' : 'Continuer avec Apple'}
    </button>
  );
  const google = (
    <button
      key="google"
      id="btn-oauth-google"
      type="button"
      onClick={() => go('google')}
      disabled={!!busy}
      className="w-full h-14 rounded-full bg-white dark:bg-[#151B27] border border-slate-300 dark:border-slate-600 text-[#1F1F1F] dark:text-white font-semibold text-[15px] flex items-center justify-center gap-2.5 active:scale-[0.98] transition cursor-pointer disabled:opacity-60"
    >
      <GoogleIcon />
      {busy === 'google' ? 'Ouverture…' : 'Continuer avec Google'}
    </button>
  );

  return (
    <div className="space-y-3">
      {isAndroid ? [google, apple] : [apple, google]}
      <div className="flex items-center gap-3 py-2">
        <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">ou avec votre email</span>
        <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
};
