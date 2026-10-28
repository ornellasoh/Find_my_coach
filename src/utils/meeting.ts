import { Capacitor } from '@capacitor/core';
import { openInApp } from '../lib/inAppBrowser';

/** Lien de visio accepté : https uniquement, sans espace, 500 caractères maximum (même règle que la base). */
export function validateMeetingUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) return { ok: false, error: 'Collez le lien de la visio (Meet, Zoom, Teams…).' };
  if (value.length > 500) return { ok: false, error: 'Lien trop long.' };
  if (!/^https:\/\/[^\s<>"]+$/i.test(value)) return { ok: false, error: 'Le lien doit commencer par https://' };
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || !u.hostname.includes('.')) return { ok: false, error: 'Lien invalide.' };
    return { ok: true, url: u.toString() };
  } catch {
    return { ok: false, error: 'Lien invalide.' };
  }
}

/** Nom lisible du service de visio, d'après l'adresse. */
export function meetingProvider(url?: string | null): string {
  if (!url) return 'Visio';
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.endsWith('meet.google.com')) return 'Google Meet';
    if (h.includes('zoom.')) return 'Zoom';
    if (h.includes('teams.microsoft') || h.includes('teams.live')) return 'Microsoft Teams';
    if (h.includes('whereby')) return 'Whereby';
    if (h.includes('jit.si')) return 'Jitsi';
    return h.replace(/^www\./, '');
  } catch {
    return 'Visio';
  }
}

/**
 * Ouvre un lien externe (visio, itinéraire).
 * iPhone / Android : navigateur du système → l'app Meet / Zoom / Teams prend le relais si elle est installée.
 * Web : nouvel onglet. N'affecte jamais le statut de la séance.
 */
export async function openExternal(url: string) {
  if (Capacitor.isNativePlatform()) {
    await openInApp(url);
    return;
  }
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (!w) window.location.href = url;
}

/** Lien d'itinéraire (Apple Plans sur iPhone, Google Maps ailleurs) — l'adresse n'est jamais stockée dans l'URL de l'app. */
export function directionsUrl(address: string): string {
  const q = encodeURIComponent(address);
  if (Capacitor.getPlatform() === 'ios') return `https://maps.apple.com/?daddr=${q}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}
