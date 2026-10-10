import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase, authErrorFr, markPasswordRecovery } from './supabase';

/**
 * Connexion avec Google ou Apple (Supabase Auth).
 * - Web : redirection classique, la session est récupérée au retour (detectSessionInUrl).
 * - iPhone / Android : ouverture dans le navigateur intégré, retour dans l'app par le lien
 *   io.findmycoach.app://auth-callback, puis création de la session.
 */
export type OAuthProvider = 'google' | 'apple';

const NATIVE_REDIRECT = 'io.findmycoach.app://auth-callback';
const PENDING_ROLE_KEY = 'fmc_oauth_role';

export async function signInWithProvider(provider: OAuthProvider, role?: 'client' | 'coach'): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Connexion indisponible en mode démo.' };
  try {
    if (role) localStorage.setItem(PENDING_ROLE_KEY, JSON.stringify({ role, at: Date.now() }));
  } catch { /* ignore */ }

  const native = Capacitor.isNativePlatform();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: native ? NATIVE_REDIRECT : `${window.location.origin}${window.location.pathname}`,
      skipBrowserRedirect: native,
      ...(provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {}),
    },
  });
  if (error) return { error: authErrorFr(error.message) };
  if (native && data?.url) await Browser.open({ url: data.url, presentationStyle: 'popover' });
  return {};
}

/** Rôle choisi avant la connexion Google/Apple (« Je suis coach »), valable 30 minutes. */
export function takePendingRole(): 'client' | 'coach' | null {
  try {
    const raw = localStorage.getItem(PENDING_ROLE_KEY);
    localStorage.removeItem(PENDING_ROLE_KEY);
    if (!raw) return null;
    const { role, at } = JSON.parse(raw);
    return Date.now() - at < 30 * 60 * 1000 ? role : null;
  } catch {
    return null;
  }
}

/** Sur mobile : récupère la session quand le navigateur revient dans l'app. */
export function initOAuthListener() {
  if (!Capacitor.isNativePlatform() || !supabase) return;
  App.addListener('appUrlOpen', async ({ url }) => {
    if (!url.startsWith(NATIVE_REDIRECT)) return;
    Browser.close().catch(() => {});
    const parsed = new URL(url.replace('#', '?'));
    const p = parsed.searchParams;
    const code = p.get('code');
    const access_token = p.get('access_token');
    const refresh_token = p.get('refresh_token');
    if (p.get('type') === 'recovery') markPasswordRecovery();
    if (access_token && refresh_token) {
      await supabase!.auth.setSession({ access_token, refresh_token });
    } else if (code) {
      await supabase!.auth.exchangeCodeForSession(code);
    }
  });
}
