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

let currentToken: string | null = null;

/** Inscrit le téléphone aux notifications push et enregistre son jeton pour l'utilisateur connecté. */
export async function registerPush(userId: string, onOpen?: (data: Record<string, string>) => void) {
  if (!pushAvailable() || !supabase) return;
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return;

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
    await PushNotifications.addListener('registration', async ({ value }) => {
      currentToken = value;
      await supabase!.from('push_tokens').upsert({
        token: value,
        user_id: userId,
        platform: Capacitor.getPlatform(),
        updated_at: new Date().toISOString(),
      });
    });
    await PushNotifications.addListener('registrationError', (e) => console.warn('[push] inscription impossible', e));
    await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => onOpen?.(notification.data ?? {}));
    await PushNotifications.register();
  } catch (err) {
    console.warn('[push] indisponible', err);
  }
}

/** À la déconnexion : ce téléphone ne reçoit plus les notifications du compte. */
export async function unregisterPush() {
  if (!supabase || !currentToken) return;
  await supabase.from('push_tokens').delete().eq('token', currentToken);
  currentToken = null;
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
