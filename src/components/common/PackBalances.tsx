import React, { useEffect } from 'react';
import { Layers } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatEuro } from '../ui/fmc';
import { sessionsLeft } from '../../lib/packs';
import type { PackBalance } from '../../types';

const STATUS: Record<PackBalance['status'], { label: string; cls: string }> = {
  active: { label: 'Actif', cls: 'bg-[#E6FBEF] text-[#007A3D] dark:bg-fmc-green/15 dark:text-fmc-green' },
  past_due: { label: 'Échéance en retard', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  unpaid: { label: 'Impayé', cls: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' },
  cancelled: { label: 'Annulé', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  expired: { label: 'Expiré', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
};

const dateFr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

/** Liste des packs : « Mes packs » pour le client, « Packs vendus » pour le coach. */
export const PackBalances: React.FC<{ mode: 'client' | 'coach' }> = ({ mode }) => {
  const { packBalances, currentUser, packNotice, refreshPackBalances } = useApp();
  // Séances utilisées et mensualités à jour à chaque ouverture de l'écran
  useEffect(() => {
    refreshPackBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const list = packBalances.filter((b) => (mode === 'client' ? b.clientId === currentUser?.id : b.clientId !== currentUser?.id));
  if (list.length === 0 && !(mode === 'client' && packNotice)) return null;

  return (
    <section className="mb-5" aria-labelledby={`packs-${mode}`}>
      <h2 id={`packs-${mode}`} className="text-base font-semibold mb-3 flex items-center gap-2">
        <Layers className="w-5 h-5 text-fmc-green-ink" /> {mode === 'client' ? 'Mes packs' : 'Packs vendus'}
      </h2>
      {mode === 'client' && packNotice && <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{packNotice}</p>}
      <div className="space-y-2.5">
        {list.map((b) => {
          const left = sessionsLeft(b);
          const st = STATUS[b.status] ?? STATUS.cancelled;
          return (
            <div key={b.id} className="bg-white dark:bg-slate-900 rounded-[20px] border border-fmc-line/80 dark:border-slate-800 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{b.pack.name}</p>
                  <p className="text-sm text-slate-500 truncate">{mode === 'client' ? `avec ${b.coachName}` : b.clientName || 'Client'}</p>
                </div>
                <span className={`shrink-0 text-xs font-semibold rounded-full px-2.5 py-1 ${st.cls}`}>{st.label}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden" aria-hidden>
                <div className="h-full bg-fmc-green" style={{ width: `${(b.sessionsUsed / Math.max(1, b.sessionsTotal)) * 100}%` }} />
              </div>
              <p className="text-sm mt-2 tabular-nums">
                <span className="font-semibold">{left} séance{left > 1 ? 's' : ''} restante{left > 1 ? 's' : ''}</span>
                <span className="text-slate-500"> sur {b.sessionsTotal}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1 tabular-nums">
                {b.installments > 1
                  ? `${b.installmentsPaid}/${b.installments} mensualités payées (${formatEuro(b.installmentAmount)} par mois)`
                  : `Payé ${formatEuro(b.amountTotal)}`}
                {mode === 'coach' && ` · vous recevez ${formatEuro(b.amountTotal - b.applicationFee)} au total`}
                {b.expiresAt && b.status !== 'cancelled' && ` · valable jusqu’au ${dateFr(b.expiresAt)}`}
              </p>
              {mode === 'client' && b.status === 'past_due' && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                  Le dernier prélèvement a échoué : réglez-le avec le lien reçu par notification pour réserver de nouveau avec ce pack.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
