import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { supabase } from './supabase';

/**
 * Notifications push (Android / iPhone) via Firebase Cloud Messaging.
 * Activées seulement si VITE_PUSH_ENABLED=true (il faut d'abord ajouter google-services.json
 * pour Android et la clé APNs pour iPhone, sinon l'app planterait au démarrage).
 * Nécessite le paquet @capacitor/push-notifications côté natif.
 */

interface PushToken { value: string }
interface PushAction { notification: { data?: Record<string, string> } }
interface PushPlugin {
  requestPermissions(): Promise<{ receive: string }>;
  checkPermissions(): Promise<{ receive: string }>;
  register(): Promise<void>;
  createChannel(channel: { id: string; name: string; description?: string; importance?: number; visibility?: number; lightColor?: string; vibration?: boolean }): Promise<void>;
  addListener(event: 'registration', cb: (t: PushToken) => void): Promise<PluginListenerHandle>;
  addListener(event: 'registrationError', cb: (e: unknown) => void): Promise<PluginListenerHandle>;
  addListener(event: 'pushNotificationActionPerformed', cb: (a: PushAction) => void): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

const PushNotifications = registerPlugin<PushPlugin>('PushNotifications');

export const pushAvailable = () =>
  Capacitor.isNativePlatform() && import.meta.env.VITE_PUSH_ENABLED === 'true' && Capacitor.isPluginAvailable('PushNotifications');

const TOKEN_KEY = 'fmc_push_token';
let currentToken: string | null = (() => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
})();

export type PushStatus = 'unavailable' | 'denied' | 'registered' | 'error' | 'pending';
let lastStatus: PushStatus = 'pending';
let lastError = '';
/** État de l'inscription push sur cet appareil (affiché dans les préférences de notification). */
export const pushStatus = () => ({ status: pushAvailable() ? lastStatus : ('unavailable' as PushStatus), error: lastError });

/** Enregistre le jeton pour le compte connecté (un jeton = un seul compte : le dernier connecté). */
async function saveToken(value: string) {
  currentToken = value;
  try { localStorage.setItem(TOKEN_KEY, value); } catch { /* ignore */ }
  const { error } = await supabase!.rpc('register_push_token', { p_token: value, p_platform: Capacitor.getPlatform() });
  if (error) {
    lastStatus = 'error';
    lastError = error.message;
    console.warn('[push] jeton non enregistré', error.message);
  } else {
    lastStatus = 'registered';
    lastError = '';
  }
}

/** Inscrit le téléphone aux notifications push et enregistre son jeton pour l'utilisateur connecté. */
export async function registerPush(userId: string, onOpen?: (data: Record<string, string>) => void) {
  if (!pushAvailable() || !supabase) return;
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') {
      lastStatus = 'denied';
      return;
    }

    await PushNotifications.removeAllListeners();
    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: 'fmc_default',
        name: 'Find My Coach',
        description: 'Réservations, rappels et messages',
        importance: 4,
        visibility: 1,
        lightColor: '#00D664',
        vibration: true,
      });
    }
    void userId; // le serveur rattache le jeton au compte de la session (jamais à un id fourni par l'app)
    await PushNotifications.addListener('registration', ({ value }) => saveToken(value));
    await PushNotifications.addListener('registrationError', (e) => {
      lastStatus = 'error';
      lastError = String((e as { error?: string })?.error ?? e);
      console.warn('[push] inscription impossible', e);
    });
    await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => onOpen?.(notification.data ?? {}));
    await PushNotifications.register();
  } catch (err) {
    lastStatus = 'error';
    lastError = (err as Error)?.message ?? String(err);
    console.warn('[push] indisponible', err);
  }
}

/** À la déconnexion : ce téléphone ne reçoit plus les notifications du compte. */
export async function unregisterPush() {
  if (!supabase || !currentToken) return;
  try {
    await supabase.rpc('unregister_push_token', { p_token: currentToken });
  } catch { /* hors connexion : le jeton sera réattribué au prochain compte connecté */ }
  currentToken = null;
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

export interface PushTestResult {
  inApp: boolean;
  devices: number;
  config: { android: boolean; ios: boolean };
  results: { platform: string; ok: boolean; error?: string }[];
  note?: string;
  error?: string;
}

/** Envoie une notification de test à SES propres appareils uniquement (fonction serveur send-test-push). */
export async function sendTestPush(): Promise<PushTestResult> {
  if (!supabase) throw new Error('Indisponible en mode démo.');
  const { data, error } = await supabase.functions.invoke('send-test-push', { body: {} });
  if (error) {
    let message = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) message = (await ctx.json()).error || message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return data as PushTestResult;
}

/** Préférences de notification (emails / push) du compte. */
export async function fetchNotificationPrefs(userId: string) {
  if (!supabase) return { email: true, push: true };
  const { data } = await supabase.from('profiles').select('notify_email, notify_push').eq('id', userId).maybeSingle();
  return { email: data?.notify_email !== false, push: data?.notify_push !== false };
}

export async function saveNotificationPrefs(userId: string, prefs: { email?: boolean; push?: boolean }) {
  if (!supabase) return;
  const patch: Record<string, boolean> = {};
  if (prefs.email !== undefined) patch.notify_email = prefs.email;
  if (prefs.push !== undefined) patch.notify_push = prefs.push;
  await supabase.from('profiles').update(patch).eq('id', userId);
}
