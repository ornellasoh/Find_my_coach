import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { Booking, CoachProfile } from '../../types';
import { supabase } from '../../lib/supabase';

interface AdminStats {
  users_total: number;
  clients: number;
  coaches: number;
  new_7d: number;
  unconfirmed_emails: number;
  coach_profiles_live: number;
  bookings_pending: number;
  bookings_confirmed: number;
  bookings_completed: number;
  bookings_cancelled: number;
  paid_eur: number;
  platform_fees_eur: number;
  refunded_eur: number;
}

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const card = 'bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs';

/**
 * Statistiques administrateur. En ligne : calculées par la base (fonction admin_stats, refusée
 * aux non-admins). Une erreur s'affiche comme une erreur, jamais comme un zéro.
 */
export const AdminStatsCards: React.FC<{ localBookings: Booking[]; localCoaches: CoachProfile[] }> = ({ localBookings, localCoaches }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!supabase);

  const load = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.rpc('admin_stats');
    if (err) setError(err.message.includes('administrateur') ? 'Accès refusé.' : 'Statistiques indisponibles (réseau ou base). Réessayez.');
    else setStats(data as AdminStats);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  if (!supabase) {
    // Mode démo : chiffres calculés sur les données locales de démonstration
    const done = localBookings.filter((b) => b.bookingStatus === 'completed').length;
    return (
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className={card}><span className="text-[11px] text-slate-400 block">Réservations (démo)</span><span className="text-lg font-black block">{localBookings.length}</span></div>
        <div className={card}><span className="text-[11px] text-slate-400 block">Séances terminées (démo)</span><span className="text-lg font-black block">{done}</span></div>
        <div className={card}><span className="text-[11px] text-slate-400 block">Fiches coach (démo)</span><span className="text-lg font-black block">{localCoaches.length}</span></div>
      </div>
    );
  }

  if (loading) {
    return <p className="mb-4 text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Chargement des statistiques…</p>;
  }
  if (error || !stats) {
    return (
      <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-sm text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
        <span>{error ?? 'Statistiques indisponibles.'}</span>
        <button onClick={load} className="min-h-10 px-3 rounded-full bg-white dark:bg-slate-900 font-semibold flex items-center gap-1 cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Réessayer
        </button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2.5 mb-4">
      <div className={card}>
        <span className="text-[11px] text-slate-400 block font-medium">Comptes</span>
        <span className="text-lg font-black block mt-0.5">{stats.users_total}</span>
        <span className="text-[10px] text-slate-400">{stats.clients} client(s) · {stats.coaches} coach(s) · {stats.new_7d} sur 7 j</span>
      </div>
      <div className={card}>
        <span className="text-[11px] text-slate-400 block font-medium">Fiches coach en ligne</span>
        <span className="text-lg font-black block mt-0.5">{stats.coach_profiles_live}</span>
        <span className="text-[10px] text-slate-400">{stats.unconfirmed_emails} email(s) non confirmé(s)</span>
      </div>
      <div className={card}>
        <span className="text-[11px] text-slate-400 block font-medium">Réservations</span>
        <span className="text-lg font-black block mt-0.5">{stats.bookings_confirmed + stats.bookings_completed}</span>
        <span className="text-[10px] text-slate-400">
          {stats.bookings_completed} terminée(s) · {stats.bookings_pending} en attente · {stats.bookings_cancelled} annulée(s)
        </span>
      </div>
      <div className={card}>
        <span className="text-[11px] text-slate-400 block font-medium">Paiements encaissés</span>
        <span className="text-lg font-black text-[#008A3E] block mt-0.5">{eur(stats.paid_eur)}</span>
        <span className="text-[10px] text-slate-400">commissions {eur(stats.platform_fees_eur)} · remboursé {eur(stats.refunded_eur)}</span>
      </div>
    </div>
  );
};
