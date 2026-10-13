// App Store Connect : ajoute un testeur au groupe TestFlight externe (Apple envoie alors l'invitation par email).
// Secrets : ASC_ISSUER_ID, ASC_KEY_ID, ASC_PRIVATE_KEY (contenu du fichier .p8 d'une clé « App Store Connect API »,
// rôle Gestionnaire d'apps). Facultatifs : ASC_BUNDLE_ID (io.findmycoach.app), ASC_BETA_GROUP (nom du groupe).
const API = 'https://api.appstoreconnect.apple.com/v1';
const BUNDLE_ID = Deno.env.get('ASC_BUNDLE_ID') ?? 'io.findmycoach.app';
const GROUP_NAME = Deno.env.get('ASC_BETA_GROUP') ?? '';

const b64url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const appStoreConfigured = () =>
  !!Deno.env.get('ASC_ISSUER_ID') && !!Deno.env.get('ASC_KEY_ID') && !!Deno.env.get('ASC_PRIVATE_KEY');

async function token(): Promise<string> {
  // Accepte le .p8 collé tel quel, ou sur une ligne avec des « \n »
  const body = Deno.env.get('ASC_PRIVATE_KEY')!.replace(/\\n/g, '\n').replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'ES256', kid: Deno.env.get('ASC_KEY_ID'), typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iss: Deno.env.get('ASC_ISSUER_ID'), iat: now, exp: now + 10 * 60, aud: 'appstoreconnect-v1' }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${head}.${payload}`));
  return `${head}.${payload}.${b64url(sig)}`;
}

async function call(jwt: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* réponse non JSON */ }
  return { status: res.status, ok: res.ok, body, detail: (body?.errors?.[0]?.detail ?? body?.errors?.[0]?.title ?? text.slice(0, 200)) as string };
}

/** Groupe TestFlight externe de l'app (celui nommé ASC_BETA_GROUP, sinon le premier). */
async function findGroup(jwt: string): Promise<{ id: string; name: string }> {
  const apps = await call(jwt, `/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&fields[apps]=bundleId&limit=5`);
  if (apps.status === 401 || apps.status === 403) throw new Error(`Clé App Store Connect refusée par Apple (${apps.detail}).`);
  if (!apps.ok) throw new Error(`App Store Connect : ${apps.detail}`);
  const app = (apps.body?.data ?? []).find((a: any) => a.attributes?.bundleId === BUNDLE_ID);
  if (!app) throw new Error(`App ${BUNDLE_ID} introuvable dans App Store Connect.`);
  const groups = await call(jwt, `/betaGroups?filter[app]=${app.id}&filter[isInternalGroup]=false&fields[betaGroups]=name&limit=50`);
  if (!groups.ok) throw new Error(`App Store Connect : ${groups.detail}`);
  const list = (groups.body?.data ?? []) as { id: string; attributes: { name: string } }[];
  const group = GROUP_NAME ? list.find((g) => g.attributes.name.toLowerCase() === GROUP_NAME.toLowerCase()) : list[0];
  if (!group) {
    throw new Error(GROUP_NAME
      ? `Groupe TestFlight « ${GROUP_NAME} » introuvable (groupes externes : ${list.map((g) => g.attributes.name).join(', ') || 'aucun'}).`
      : 'Aucun groupe de testeurs externes : créez-en un dans App Store Connect → TestFlight.');
  }
  return { id: group.id, name: group.attributes.name };
}

/** Vérifie les clés et renvoie le groupe utilisé (diagnostic affiché dans l'administration). */
export async function checkAppStore(): Promise<{ group: string }> {
  const group = await findGroup(await token());
  return { group: group.name };
}

/** Ajoute (ou rattache) le testeur au groupe TestFlight. Sans effet s'il y est déjà. */
export async function addTestFlightTester(email: string, firstName: string | null): Promise<{ group: string }> {
  const jwt = await token();
  const group = await findGroup(jwt);
  const created = await call(jwt, '/betaTesters', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'betaTesters',
        attributes: { email, ...(firstName ? { firstName } : {}) },
        relationships: { betaGroups: { data: [{ type: 'betaGroups', id: group.id }] } },
      },
    }),
  });
  if (created.ok) return { group: group.name };
  if (created.status !== 409) throw new Error(`TestFlight : ${created.detail}`);

  // Déjà connu d'Apple : on le rattache au groupe
  const found = await call(jwt, `/betaTesters?filter[email]=${encodeURIComponent(email)}&fields[betaTesters]=email&limit=1`);
  const testerId = found.body?.data?.[0]?.id;
  if (!testerId) throw new Error(`TestFlight : ${created.detail}`);
  const linked = await call(jwt, `/betaGroups/${group.id}/relationships/betaTesters`, {
    method: 'POST',
    body: JSON.stringify({ data: [{ type: 'betaTesters', id: testerId }] }),
  });
  if (!linked.ok && linked.status !== 409) throw new Error(`TestFlight : ${linked.detail}`);
  return { group: group.name };
}
