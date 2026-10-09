// Notifications push via Firebase Cloud Messaging (HTTP v1) — Android et iPhone.
// Secret requis : FCM_SERVICE_ACCOUNT = contenu JSON du compte de service Firebase.
// Sans ce secret, les push sont simplement ignorées (les emails et notifications in-app continuent).

interface ServiceAccount { project_id: string; client_email: string; private_key: string }

let cached: { token: string; exp: number } | null = null;

const b64url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

function serviceAccount(): ServiceAccount | null {
  const raw = Deno.env.get('FCM_SERVICE_ACCOUNT');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { console.error('FCM_SERVICE_ACCOUNT invalide'); return null; }
}

async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp > now + 60) return cached.token;
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${b64url(sig)}` }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Jeton FCM refusé : ${JSON.stringify(json)}`);
  cached = { token: json.access_token, exp: now + (json.expires_in ?? 3600) };
  return cached.token;
}

export const pushEnabled = () => !!Deno.env.get('FCM_SERVICE_ACCOUNT');

/** Envoie une notification à une liste de jetons ; renvoie les jetons devenus invalides (à supprimer). */
export async function sendPush(tokens: string[], title: string, body: string, data: Record<string, string> = {}): Promise<string[]> {
  const sa = serviceAccount();
  if (!sa || !tokens.length) return [];
  const token = await accessToken(sa);
  const dead: string[] = [];
  await Promise.all(tokens.map(async (t) => {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: t,
          notification: { title, body },
          data,
          android: { priority: 'high', notification: { color: '#00D664', sound: 'default', channel_id: 'fmc_default' } },
          apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        },
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 404 || txt.includes('UNREGISTERED') || txt.includes('INVALID_ARGUMENT')) dead.push(t);
      else console.error('FCM', res.status, txt);
    }
  }));
  return dead;
}
