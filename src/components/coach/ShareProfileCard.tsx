import React, { useEffect, useState } from 'react';
import { Check, Copy, Instagram, Share2 } from 'lucide-react';
import type { CoachProfile } from '../../types';
import { useApp } from '../../context/AppContext';
import { coachSlug } from '../../utils/coachTrust';

/**
 * Lien public du coach à mettre en bio Instagram / WhatsApp : findmycoach.io/coach/<slug>.
 * La page du site affiche la fiche et propose « Ouvrir dans l'app » ou le téléchargement.
 * Affiché quand VITE_PUBLIC_PROFILE_URL est défini (ex. https://findmycoach.io/coach/).
 */
const BASE = (import.meta.env.VITE_PUBLIC_PROFILE_URL as string | undefined)?.trim();

export const coachPublicLink = (c: Pick<CoachProfile, 'id' | 'name' | 'userId' | 'slug'>) =>
  BASE ? `${BASE.replace(/\/?$/, '/')}${encodeURIComponent(c.slug || coachSlug(c))}` : '';

export const ShareProfileCard: React.FC<{ coach?: CoachProfile }> = ({ coach }) => {
  const { updateCoachProfile } = useApp();
  const [copied, setCopied] = useState(false);

  // Enregistre l'identifiant court du lien sur la fiche (une seule fois)
  useEffect(() => {
    if (BASE && coach && !coach.slug) updateCoachProfile(coach.id, { slug: coachSlug(coach) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach?.id, coach?.slug]);

  if (!BASE || !coach) return null;
  const link = coachPublicLink(coach);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const t = document.createElement('textarea');
      t.value = link;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  const share = async () => {
    try {
      await navigator.share({ title: `${coach.name} sur Find My Coach`, text: 'Réservez votre séance avec moi sur Find My Coach :', url: link });
    } catch { /* partage annulé ou indisponible */ }
  };
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="rounded-2xl p-4 mb-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <Instagram className="w-4 h-4 text-[#00B050]" />
        <h2 className="text-sm font-bold">Votre lien Find My Coach</h2>
      </div>
      <p className="text-xs text-slate-500 mt-1">À mettre en bio Instagram, en story ou sur WhatsApp : vos abonnés téléchargent l'app et réservent directement avec vous.</p>
      <p className="mt-3 text-xs font-mono bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 break-all">{link}</p>
      <div className="mt-2.5 flex gap-2">
        <button type="button" onClick={copy} className="flex-1 h-10 rounded-full bg-[#00D664] text-[#0F172A] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Lien copié' : 'Copier le lien'}
        </button>
        {canShare && (
          <button type="button" onClick={share} className="h-10 px-4 rounded-full border border-slate-300 dark:border-slate-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Share2 className="w-4 h-4" /> Partager
          </button>
        )}
      </div>
    </div>
  );
};
