import { Browser } from '@capacitor/browser';

/** Délai au-delà duquel on considère que le navigateur intégré ne s'est pas affiché. */
const OPEN_TIMEOUT_MS = 4000;

/**
 * Ouvre une page (Google, Apple, Stripe, visio…) dans le navigateur intégré, sur iPhone / Android.
 * Si iOS ne confirme pas l'affichage à temps (fenêtre invisible, comme après le passage aux scènes
 * d'octobre), la page s'ouvre dans Safari à la place : l'utilisateur n'est jamais bloqué.
 * Renvoie false quand ce repli a servi.
 */
export async function openInApp(url: string): Promise<boolean> {
  // Fenêtre précédente encore ouverte : iOS refuserait d'en afficher une nouvelle, sans prévenir
  await Browser.close().catch(() => {});
  const opened = await Promise.race([
    Browser.open({ url, presentationStyle: 'fullscreen' }).then(() => true, () => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), OPEN_TIMEOUT_MS)),
  ]);
  if (opened) return true;
  console.error('[inAppBrowser] navigateur intégré non affiché, repli sur Safari');
  Browser.close().catch(() => {});
  // Capacitor ouvre les liens « _blank » dans le navigateur du téléphone
  window.open(url, '_blank');
  return false;
}
