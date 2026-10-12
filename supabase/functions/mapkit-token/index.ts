// Jeton Apple Plans (MapKit JS) pour la carte de l'app : signé ici, la clé privée ne quitte jamais le serveur.
// Secrets : MAPKIT_PRIVATE_KEY (contenu du fichier .p8), et au besoin MAPKIT_KEY_ID / MAPKIT_TEAM_ID.
// Sans clé (ou en cas d'erreur), l'app revient toute seule à la carte OpenStreetMap.
const KEY_ID = Deno.env.get('MAPKIT_KEY_ID') ?? 'DT5X5Z7P3Z';
const TEAM_ID = Deno.env.get('MAPKIT_TEAM_ID') ?? '242FTWP9T9';
const TTL_SECONDS = 30 * 60;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const b64url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

let keyPromise: Promise<CryptoKey> | null = null;
function signingKey(): Promise<CryptoKey> {
  const pem = Deno.env.get('MAPKIT_PRIVATE_KEY');
  if (!pem) return Promise.reject(new Error('MAPKIT_PRIVATE_KEY manquant'));
  // Accepte le .p8 collé tel quel, ou sur une ligne avec des « \n »
  const body = pem.replace(/\\n/g, '\n').replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  keyPromise ??= crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  return keyPromise;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const key = await signingKey();
    const now = Math.floor(Date.now() / 1000);
    const head = b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }));
    const payload = b64url(JSON.stringify({ iss: TEAM_ID, iat: now, exp: now + TTL_SECONDS }));
    const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${head}.${payload}`));
    return json({ token: `${head}.${payload}.${b64url(signature)}`, expiresIn: TTL_SECONDS });
  } catch (err) {
    keyPromise = null;
    console.error('mapkit-token', err);
    return json({ error: 'Carte Apple Plans non configurée.' }, 503);
  }
});
