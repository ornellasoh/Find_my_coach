import React, { useEffect, useState } from 'react';
import { Check, Copy, Instagram, Share2 } from 'lucide-react';
import type { CoachProfile } from '../../types';
import { useApp } from '../../context/AppContext';
import { coachSlug } from '../../utils/coachTrust';
import { supabase } from '../../lib/supabase';

interface LinkStats { visits: number; visits30: number; signups: number; signups30: number }

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
  const [stats, setStats] = useState<LinkStats | null>(null);

  // Statistiques du lien : visites et comptes créés grâce à lui
  useEffect(() => {
    if (!BASE || !coach || !supabase) return;
    let alive = true;
    supabase.rpc('coach_link_stats').then(({ data, error }) => {
      if (alive && !error && data) setStats(data as LinkStats);
    });
    return () => { alive = false; };
  }, [coach?.id]);

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
        <button type="button" onClick={copy} className="flex-1 h-11 rounded-full bg-[#00D664] text-[#0F172A] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Lien copié' : 'Copier le lien'}
        </button>
        {canShare && (
          <button type="button" onClick={share} className="h-11 px-4 rounded-full border border-slate-300 dark:border-slate-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Share2 className="w-4 h-4" /> Partager
          </button>
        )}
      </div>
      {stats && (
        <dl className="mt-3 grid grid-cols-2 gap-2">
          {[
            { label: 'Visites du lien', total: stats.visits, recent: stats.visits30 },
            { label: 'Comptes créés', total: stats.signups, recent: stats.signups30 },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5">
              <dt className="text-[11px] text-slate-500">{s.label}</dt>
              <dd className="text-xl font-bold tabular-nums leading-tight">{s.total}</dd>
              <dd className="text-[11px] text-slate-500 tabular-nums">{s.recent} sur 30 jours</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};
