import { useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase, isSupabaseEnabled } from './supabase';

/**
 * Campagnes marketing (Octobre Rose, Noël…) pilotées depuis l'admin, sans mise à jour de l'app :
 * bannière (photo, titre, message, couleur), logo teinté dans l'app, et icône de l'app sur le téléphone
 * (parmi les icônes déjà livrées dans l'app : voir APP_ICONS).
 */
export type AppIconName = 'default' | 'rose' | 'noel';

export interface Campaign {
  active: boolean;
  name?: string;
  title?: string;
  message?: string;
  /** couleur de la bannière, ex. #E91E63 */
  color?: string;
  /** photo de la bannière (URL publique) */
  imageUrl?: string;
  /** lien ouvert au toucher (facultatif) */
  linkUrl?: string;
  /** teinte du logo dans l'app */
  logo?: AppIconName;
  /** icône de l'app sur l'écran d'accueil du téléphone */
  icon?: AppIconName;
  /** dates facultatives (AAAA-MM-JJ) : la campagne s'arrête toute seule après « endsOn » */
  startsOn?: string;
  endsOn?: string;
}

export const APP_ICONS: { value: AppIconName; label: string; filter: string; swatch: string }[] = [
  { value: 'default', label: 'Vert (habituel)', filter: 'none', swatch: '#00D664' },
  { value: 'rose', label: 'Rose (Octobre Rose)', filter: 'hue-rotate(180deg) saturate(1.05)', swatch: '#F0368C' },
  { value: 'noel', label: 'Rouge (Noël)', filter: 'hue-rotate(210deg) saturate(1.1)', swatch: '#E53935' },
];

export const CAMPAIGN_PRESETS: { id: string; label: string; campaign: Campaign }[] = [
  {
    id: 'octobre-rose',
    label: 'Octobre Rose',
    campaign: {
      active: true,
      name: 'Octobre Rose',
      title: 'Octobre Rose 🎗️',
      message: 'Ce mois-ci, bougeons ensemble pour la prévention du cancer du sein. Prenez soin de vous, faites-vous dépister.',
      color: '#E91E63',
      logo: 'rose',
      icon: 'rose',
    },
  },
  {
    id: 'noel',
    label: 'Noël',
    campaign: {
      active: true,
      name: 'Noël',
      title: 'Joyeuses fêtes 🎄',
      message: 'Offrez une séance avec un coach : le cadeau qui fait du bien toute l’année.',
      color: '#C62828',
      logo: 'noel',
      icon: 'noel',
    },
  },
];

const STORAGE_KEY = 'fmc_campaign';
const today = () => new Date().toISOString().slice(0, 10);

/** Campagne réellement en cours (active et dans ses dates). */
export function liveCampaign(c: Campaign | null | undefined): Campaign | null {
  if (!c || !c.active) return null;
  const d = today();
  if (c.startsOn && d < c.startsOn) return null;
  if (c.endsOn && d > c.endsOn) return null;
  return c;
}

let current: Campaign | null = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Campaign) : null;
  } catch {
    return null;
  }
})();
const listeners = new Set<(c: Campaign | null) => void>();

function setCurrent(c: Campaign | null) {
  current = c;
  try {
    if (c) localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* stockage indisponible */ }
  listeners.forEach((l) => l(c));
}

/** Recharge la campagne depuis le serveur (réglage public « campaign »). */
export async function refreshCampaign(): Promise<void> {
  if (!isSupabaseEnabled || !supabase) return;
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'campaign').maybeSingle();
  if (error) return; // on garde la dernière campagne connue
  setCurrent((data?.value as Campaign) ?? null);
}

/** Enregistre la campagne (administrateurs uniquement : la base refuse les autres). */
export async function saveCampaign(c: Campaign): Promise<void> {
  if (!isSupabaseEnabled || !supabase) {
    setCurrent(c); // mode démo : local
    return;
  }
  const { error } = await supabase.from('app_settings').upsert({ key: 'campaign', value: c, updated_at: new Date().toISOString() });
  if (error) throw new Error('Enregistrement impossible : ' + error.message);
  setCurrent(c);
}

/** Envoie la photo de la bannière dans le stockage public « campaigns » et renvoie son adresse. */
export async function uploadCampaignImage(file: File): Promise<string> {
  if (!isSupabaseEnabled || !supabase) return URL.createObjectURL(file);
  if (!file.type.startsWith('image/')) throw new Error('Choisissez une image (JPG, PNG ou WebP).');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image trop lourde (5 Mo maximum).');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `banners/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('campaigns').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error('Envoi de la photo impossible : ' + error.message);
  return supabase.storage.from('campaigns').getPublicUrl(path).data.publicUrl;
}

export function useCampaign(): Campaign | null {
  const [c, setC] = useState<Campaign | null>(current);
  useEffect(() => {
    listeners.add(setC);
    return () => {
      listeners.delete(setC);
    };
  }, []);
  return liveCampaign(c);
}

// ---------------------------------------------------------------- Icône de l'app (natif)
interface AppIconPlugin {
  getName(): Promise<{ value: string }>;
  change(opts: { name: string }): Promise<void>;
}
const AppIcon = registerPlugin<AppIconPlugin>('AppIcon');

/** Change l'icône du téléphone si nécessaire (icônes livrées dans l'app ; sans effet sur le web). */
async function applyAppIcon(icon: AppIconName) {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('AppIcon')) return;
  try {
    const { value } = await AppIcon.getName();
    if ((value || 'default') === icon) return;
    await AppIcon.change({ name: icon });
  } catch (err) {
    console.warn('Icône de l’app non modifiée', err);
  }
}

/** Applique la campagne : logo teinté dans l'app + icône du téléphone. À monter une fois (App). */
export function useCampaignEffects() {
  const c = useCampaign();
  useEffect(() => {
    refreshCampaign();
    const onFocus = () => refreshCampaign();
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, []);
  const logo = c?.logo ?? 'default';
  const icon = c?.icon ?? 'default';
  useEffect(() => {
    const f = APP_ICONS.find((i) => i.value === logo)?.filter ?? 'none';
    document.documentElement.style.setProperty('--fmc-logo-filter', f);
  }, [logo]);
  useEffect(() => {
    applyAppIcon(icon);
  }, [icon]);
}
