/**
 * Initiales d'un nom pour l'avatar par défaut.
 * « Ornella So » → « OS », « Lucie Dupont » → « LD », « Ornella » → « O »,
 * « jean-pierre martin » → « JM », « Élodie » → « É », nom vide → « ».
 */
export function initialsOf(name?: string | null): string {
  const words = String(name ?? '')
    .normalize('NFC')
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+/u, '')) // ignore la ponctuation en tête (« (Lucie » → « Lucie »)
    .filter(Boolean);
  if (words.length === 0) return '';
  const first = Array.from(words[0])[0] ?? '';
  if (words.length === 1) return first.toLocaleUpperCase('fr-FR');
  const last = Array.from(words[words.length - 1])[0] ?? '';
  return (first + last).toLocaleUpperCase('fr-FR');
}

/** Photos génériques / générées qui ne sont PAS des photos choisies par l'utilisateur. */
const PLACEHOLDER_PATTERNS = [
  /ui-avatars\.com/i,
  /photo-1534528741775-53994a69daeb/, // ancienne photo par défaut du compte client
  /photo-1535713875002-d1d0cf377fde/, // ancienne photo par défaut d'un nouveau compte
];

/** Vraie photo à afficher, ou null pour afficher les initiales. */
export function realPhoto(src?: string | null): string | null {
  const s = (src ?? '').trim();
  if (!s) return null;
  if (PLACEHOLDER_PATTERNS.some((p) => p.test(s))) return null;
  return s;
}
