import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

/**
 * Client Supabase. Activé uniquement si VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définis
 * (fichier .env.local pour le web, .env.mobile pour l'app, variables GitHub pour l'APK).
 * Sans ces variables, l'app fonctionne en mode démo (données locales).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Sur le web : récupère la session après le clic sur le lien de confirmation / réinitialisation
          detectSessionInUrl: !Capacitor.isNativePlatform(),
          storage: window.localStorage,
        },
      })
    : null;

export const isSupabaseEnabled = supabase !== null;

/** Lien de retour des emails d'authentification. */
const NATIVE_CALLBACK = 'io.findmycoach.app://auth-callback';
export function authRedirect(kind: 'signup' | 'recovery'): string {
  if (Capacitor.isNativePlatform()) {
    // Confirmation : page du site (fonctionne aussi si l'email est ouvert sur un ordinateur)
    // Mot de passe oublié : retour direct dans l'app pour choisir le nouveau mot de passe
    return kind === 'signup' ? 'https://findmycoach.io/auth/confirmation' : NATIVE_CALLBACK;
  }
  return `${window.location.origin}${window.location.pathname}`;
}

/** Réinitialisation du mot de passe : l'écran « nouveau mot de passe » s'affiche au retour. */
export const RECOVERY_FLAG = 'fmc_password_recovery';
export function markPasswordRecovery() {
  try { sessionStorage.setItem(RECOVERY_FLAG, '1'); } catch { /* ignore */ }
  window.dispatchEvent(new Event('fmc:password-recovery'));
}
supabase?.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') markPasswordRecovery();
});

/** Traduit les erreurs Supabase Auth les plus courantes en français. */
export const authErrorFr = (message?: string): string => {
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (m.includes('email not confirmed')) return 'Confirmez d’abord votre email (lien reçu par mail).';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Un compte existe déjà avec cet email.';
  if (m.includes('password should be at least')) return 'Le mot de passe doit contenir au moins 6 caractères.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives, réessayez dans quelques minutes.';
  if (m.includes('invalid email') || m.includes('unable to validate email')) return 'Adresse email invalide.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Connexion impossible. Vérifiez votre réseau.';
  return message || 'Une erreur est survenue.';
};
