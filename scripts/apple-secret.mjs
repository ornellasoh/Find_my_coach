#!/usr/bin/env node
// Fabrique le « Secret Key » demandé par Supabase → Authentication → Providers → Apple, à partir du fichier .p8.
// Le secret est copié dans le presse-papiers (jamais affiché) et expire au bout de 6 mois : relancer alors ce script.
// Usage : node scripts/apple-secret.mjs <chemin/AuthKey_XXXXXXXXXX.p8> <Services ID> [Key ID] [Team ID]
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { execSync } from 'node:child_process';

const [file, servicesId, keyArg, teamId = '242FTWP9T9'] = process.argv.slice(2);
if (!file || !servicesId) {
  console.error('Usage : node scripts/apple-secret.mjs <chemin/AuthKey_XXXXXXXXXX.p8> <Services ID> [Key ID] [Team ID]');
  process.exit(1);
}
const keyId = keyArg ?? basename(file).match(/^AuthKey_([A-Z0-9]{10})\.p8$/)?.[1];
if (!keyId) {
  console.error('Key ID introuvable dans le nom du fichier : ajoutez-le après le Services ID.');
  process.exit(1);
}

const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const exp = now + 180 * 86_400; // Apple : 6 mois au maximum
const data = `${b64({ alg: 'ES256', kid: keyId })}.${b64({ iss: teamId, iat: now, exp, aud: 'https://appleid.apple.com', sub: servicesId })}`;
const signature = sign('sha256', Buffer.from(data), { key: createPrivateKey(readFileSync(file)), dsaEncoding: 'ieee-p1363' });
const jwt = `${data}.${signature.toString('base64url')}`;

const until = new Date(exp * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
try {
  execSync('pbcopy', { input: jwt });
  console.log(`✅ Secret copié dans le presse-papiers (Services ID ${servicesId}, clé ${keyId}, équipe ${teamId}).`);
} catch {
  console.log(jwt);
}
console.log(`Collez-le dans Supabase → Apple → Secret Key. Valable jusqu'au ${until}.`);
