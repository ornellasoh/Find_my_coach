// Ajout d'un testeur Android au groupe Google lié au test fermé Google Play (API Cloud Identity Groups).
// Secrets : BETA_ANDROID_GROUP (adresse du groupe, ex. beta-android@findmycoach.io) et le compte de service
// GOOGLE_GROUPS_SA, ou à défaut celui de Firebase (FMC_SERVICE_ACCOUNT). Ce compte de service doit être
// « Gestionnaire » du groupe, et le groupe doit accepter les membres extérieurs à l'organisation.

const b64url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const pemToDer = (pem: string) =>
  Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0));

const API = 'https://cloudidentity.googleapis.com/v1';
let cache: { token: string; exp: number } | null = null;
let groupName: string | null = null;

export const betaGroupEmail = () => Deno.env.get('BETA_ANDROID_GROUP')?.trim() || null;

async function accessToken(): Promise<string> {
  const raw = Deno.env.get('GOOGLE_GROUPS_SA') ?? Deno.env.get('FMC_SERVICE_ACCOUNT') ?? Deno.env.get('FCM_SERVICE_ACCOUNT');
  if (!raw) throw new Error('compte de service Google absent');
  const sa = JSON.parse(raw) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  if (cache && cache.exp > now + 60) return cache.token;
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-identity.groups',
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
  if (!json.access_token) throw new Error(`jeton Google refusé (${json.error ?? res.status})`);
  cache = { token: json.access_token, exp: now + (json.expires_in ?? 3600) };
  return cache.token;
}

const apiError = async (res: Response) => {
  const txt = await res.text();
  try { return JSON.parse(txt).error?.message ?? txt; } catch { return txt; }
};

/** Vérifie la configuration ; renvoie l'adresse du groupe ou lève une erreur lisible. */
export async function checkBetaGroup(): Promise<string> {
  const group = betaGroupEmail();
  if (!group) throw new Error('secret BETA_ANDROID_GROUP absent');
  if (groupName) return group;
  const res = await fetch(`${API}/groups:lookup?groupKey.id=${encodeURIComponent(group)}`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
  });
  if (!res.ok) throw new Error(`groupe ${group} introuvable ou inaccessible : ${await apiError(res)}`);
  groupName = (await res.json()).name;
  return group;
}

/** Ajoute l'adresse au groupe (sans erreur si elle y est déjà). */
export async function addToBetaGroup(email: string): Promise<void> {
  await checkBetaGroup();
  const res = await fetch(`${API}/${groupName}/memberships`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferredMemberKey: { id: email }, roles: [{ name: 'MEMBER' }] }),
  });
  if (res.ok || res.status === 409) return;
  throw new Error(await apiError(res));
}
