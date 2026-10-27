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
const PROVIDER_NAME: Record<OAuthProvider, string> = { google: 'Google', apple: 'Apple' };

/** Connexion Google/Apple en cours dans le navigateur (null : aucune). */
let pendingProvider: OAuthProvider | null = null;

/** Erreurs de connexion Google/Apple à afficher à l'écran (navigateur fermé, connexion expirée…). */
type OAuthErrorListener = (message: string) => void;
const errorListeners = new Set<OAuthErrorListener>();

export function onOAuthError(listener: OAuthErrorListener): () => void {
  errorListeners.add(listener);
  return () => { errorListeners.delete(listener); };
}

function failPending(message: string) {
  pendingProvider = null;
  errorListeners.forEach((l) => l(message));
}

function oauthErrorFr(provider: OAuthProvider | null, code: string | null, description: string | null): string {
  const name = provider ? PROVIDER_NAME[provider] : 'Google ou Apple';
  const text = `${code || ''} ${description || ''}`.toLowerCase();
  if (text.includes('expired') || text.includes('bad_oauth_state')) return `La connexion avec ${name} a expiré. Réessayez.`;
  if (text.includes('access_denied') || text.includes('cancel')) return `Connexion avec ${name} annulée.`;
  return `La connexion avec ${name} n'a pas abouti. Réessayez.`;
}

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
  // Plein écran : en « popover » sans taille, l'iPad affiche une fenêtre vide (refus App Store, build 28)
  if (native && data?.url) {
    pendingProvider = provider;
    await Browser.open({ url: data.url, presentationStyle: 'fullscreen' });
  }
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
    const provider = pendingProvider;
    pendingProvider = null;
    Browser.close().catch(() => {});
    const parsed = new URL(url.replace('#', '?'));
    const p = parsed.searchParams;
    const code = p.get('code');
    const access_token = p.get('access_token');
    const refresh_token = p.get('refresh_token');
    const errorCode = p.get('error_code') || p.get('error');
    if (errorCode) {
      failPending(oauthErrorFr(provider, errorCode, p.get('error_description')));
      return;
    }
    if (p.get('type') === 'recovery') markPasswordRecovery();
    let error: { message: string } | null = null;
    if (access_token && refresh_token) {
      ({ error } = await supabase!.auth.setSession({ access_token, refresh_token }));
    } else if (code) {
      ({ error } = await supabase!.auth.exchangeCodeForSession(code));
    }
    if (error && provider) failPending(oauthErrorFr(provider, null, error.message));
  });

  // Navigateur fermé sans retour dans l'app (« OK », retour arrière, ou connexion expirée renvoyée
  // vers le site) : on prévient au lieu de laisser l'écran sans réponse.
  // Petit délai : sur Android, la fermeture peut arriver juste avant le lien de retour.
  Browser.addListener('browserFinished', () => {
    const provider = pendingProvider;
    if (!provider) return;
    setTimeout(() => {
      if (pendingProvider === provider) failPending(oauthErrorFr(provider, null, null));
    }, 1000);
  });
}
