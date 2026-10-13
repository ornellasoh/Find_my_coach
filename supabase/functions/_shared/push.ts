// Notifications push.
//  - Android : Firebase Cloud Messaging (HTTP v1). Secret : FMC_SERVICE_ACCOUNT (JSON du compte de service Firebase ;
//              l'ancien nom FCM_SERVICE_ACCOUNT est aussi accepté).
//  - iPhone  : Apple Push Notification service (APNs), jeton natif renvoyé par l'app.
//              Secrets : APNS_KEY (contenu du fichier .p8), APNS_KEY_ID, APNS_TEAM_ID,
//              APNS_TOPIC (io.findmycoach.app par défaut), APNS_ENV (« production » par défaut, « sandbox » pour Xcode).
// Sans ces secrets, les push de la plateforme concernée sont ignorées (notifications in-app et emails continuent).

export interface PushTarget { token: string; platform?: string | null }
export interface PushResult { platform: string; ok: boolean; error?: string }

const b64url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const pemToDer = (pem: string) =>
  Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0));

// ---------------------------------------------------------------- Android (FCM)
interface ServiceAccount { project_id: string; client_email: string; private_key: string }
let fcmCache: { token: string; exp: number } | null = null;

const fcmSecret = () => Deno.env.get('FMC_SERVICE_ACCOUNT') ?? Deno.env.get('FCM_SERVICE_ACCOUNT');

function serviceAccount(): ServiceAccount | null {
  const raw = fcmSecret();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { console.error('FMC_SERVICE_ACCOUNT invalide'); return null; }
}

async function fcmAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (fcmCache && fcmCache.exp > now + 60) return fcmCache.token;
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${b64url(sig)}` }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Jeton FCM refusé : ${JSON.stringify(json)}`);
  fcmCache = { token: json.access_token, exp: now + (json.expires_in ?? 3600) };
  return fcmCache.token;
}

async function sendFcm(token: string, title: string, body: string, data: Record<string, string>): Promise<'ok' | 'dead' | string> {
  const sa = serviceAccount();
  if (!sa) {
    return fcmSecret()
      ? 'clé Firebase illisible : collez TOUT le fichier JSON du compte de service (de { à })'
      : 'FCM non configuré (secret FMC_SERVICE_ACCOUNT absent)';
  }
  if (!sa.private_key || !sa.client_email) return 'mauvais fichier Firebase : il faut le JSON « compte de service » (avec private_key)';
  const access = await fcmAccessToken(sa);
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data,
        android: { priority: 'high', notification: { color: '#00D664', sound: 'default', channel_id: 'fmc_default' } },
      },
    }),
  });
  if (res.ok) return 'ok';
  const txt = await res.text();
  if (res.status === 404 || txt.includes('UNREGISTERED')) return 'dead';
  return `FCM ${res.status} : ${txt.slice(0, 200)}`;
}

// ---------------------------------------------------------------- iPhone (APNs)
let apnsCache: { jwt: string; exp: number } | null = null;
const apnsConfigured = () => !!(Deno.env.get('APNS_KEY') && Deno.env.get('APNS_KEY_ID') && Deno.env.get('APNS_TEAM_ID'));

async function apnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (apnsCache && apnsCache.exp > now) return apnsCache.jwt;
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: Deno.env.get('APNS_KEY_ID') }));
  const claims = b64url(JSON.stringify({ iss: Deno.env.get('APNS_TEAM_ID'), iat: now }));
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(Deno.env.get('APNS_KEY')!), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${header}.${claims}`));
  apnsCache = { jwt: `${header}.${claims}.${b64url(sig)}`, exp: now + 45 * 60 }; // Apple : jeton valable 1 h max
  return apnsCache.jwt;
}

async function sendApnsTo(host: string, token: string, title: string, body: string, data: Record<string, string>, badge: number) {
  return fetch(`https://${host}/3/device/${token}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${await apnsJwt()}`,
      'apns-topic': Deno.env.get('APNS_TOPIC') ?? 'io.findmycoach.app',
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ aps: { alert: { title, body }, sound: 'default', badge }, ...data }),
  });
}

async function sendApns(token: string, title: string, body: string, data: Record<string, string>, badge: number): Promise<'ok' | 'dead' | string> {
  if (!apnsConfigured()) return 'APNs non configuré (secrets APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID absents)';
  const sandbox = Deno.env.get('APNS_ENV') === 'sandbox';
  let res = await sendApnsTo(sandbox ? 'api.sandbox.push.apple.com' : 'api.push.apple.com', token, title, body, data, badge);
  if (res.status === 400) {
    const txt = await res.text();
    // Jeton d'une app installée depuis Xcode (environnement de développement) : on réessaie en « sandbox »
    if (!sandbox && txt.includes('BadDeviceToken')) res = await sendApnsTo('api.sandbox.push.apple.com', token, title, body, data, badge);
    else return `APNs 400 : ${txt.slice(0, 200)}`;
  }
  if (res.ok) return 'ok';
  const txt = await res.text();
  if (res.status === 410 || txt.includes('Unregistered')) return 'dead';
  return `APNs ${res.status} : ${txt.slice(0, 200)}`;
}

// ---------------------------------------------------------------- API commune
export const pushEnabled = () => !!fcmSecret() || apnsConfigured();
export const pushConfig = () => ({ android: !!fcmSecret(), ios: apnsConfigured() });

/**
 * Envoie à chaque appareil selon sa plateforme ; renvoie les jetons invalides (à supprimer) et le détail.
 * `badge` : nombre affiché sur l'icône de l'app iPhone (messages et notifications non lus du destinataire).
 */
export async function sendPushDetailed(
  targets: PushTarget[], title: string, body: string, data: Record<string, string> = {}, badge = 1,
): Promise<{ dead: string[]; results: PushResult[] }> {
  const dead: string[] = [];
  const results: PushResult[] = [];
  await Promise.all(targets.map(async ({ token, platform }) => {
    const p = platform === 'ios' ? 'ios' : 'android';
    try {
      const r = p === 'ios' ? await sendApns(token, title, body, data, badge) : await sendFcm(token, title, body, data);
      if (r === 'dead') dead.push(token);
      results.push({ platform: p, ok: r === 'ok', error: r === 'ok' ? undefined : r === 'dead' ? 'jeton expiré (supprimé)' : r });
      if (r !== 'ok' && r !== 'dead') console.error('push', p, r);
    } catch (err) {
      results.push({ platform: p, ok: false, error: (err as Error).message });
      console.error('push', p, err);
    }
  }));
  return { dead, results };
}

/** Compatibilité : renvoie seulement les jetons à supprimer. */
export async function sendPush(targets: PushTarget[], title: string, body: string, data: Record<string, string> = {}, badge = 1): Promise<string[]> {
  return (await sendPushDetailed(targets, title, body, data, badge)).dead;
}
