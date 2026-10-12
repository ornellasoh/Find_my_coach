import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { initOAuthListener } from './lib/oauth';

/** Initialise les fonctions natives (iOS / Android). Sans effet sur le web. */
export async function initNative() {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.classList.add('native', `platform-${Capacitor.getPlatform()}`);

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    syncStatusBar();
    // Suit le mode sombre de l'app (classe "dark" sur <html>)
    new MutationObserver(syncStatusBar).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  } catch { /* plugin indisponible */ }

  // Bouton retour Android : écran précédent de l'app, sinon fermeture
  App.addListener('backButton', () => {
    const fmc = (window as any).__fmc;
    if (fmc?.canGoBack) fmc.goBack();
    else App.exitApp();
  });

  // Retour dans l'app après connexion Google / Apple
  initOAuthListener();

  // Lien d'un coach : io.findmycoach.app://coach/<id> (ou https://findmycoach.io/coach/<id>)
  const openCoachLink = (url?: string) => {
    if (!url) return;
    const m = url.match(/^(?:io\.findmycoach\.app:\/\/coach\/|https:\/\/(?:www\.)?findmycoach\.io\/coach\/)([^/?#]+)/);
    if (!m) return;
    const id = decodeURIComponent(m[1]);
    try { localStorage.setItem('fmc_pending_coach', id); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('fmc:open-coach', { detail: id }));
  };
  App.addListener('appUrlOpen', ({ url }) => openCoachLink(url));
  App.getLaunchUrl().then((r) => openCoachLink(r?.url)).catch(() => {});

  SplashScreen.hide().catch(() => {});
}

function syncStatusBar() {
  const dark = document.documentElement.classList.contains('dark');
  StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
  if (Capacitor.getPlatform() === 'android') {
    StatusBar.setBackgroundColor({ color: dark ? '#0B0F19' : '#F6F9FA' }).catch(() => {});
  }
}
