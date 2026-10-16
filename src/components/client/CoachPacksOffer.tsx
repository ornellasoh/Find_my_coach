import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { CheckCircle2, Layers, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Card, SectionHeader, Sheet, formatEuro } from '../ui/fmc';
import { installmentAmount, isUsablePack, sessionsLeft } from '../../lib/packs';
import type { CoachProfile, PackInstallments, SessionPack } from '../../types';

const FORMAT_TEXT: Record<string, string> = {
  online: 'en visio',
  home: 'à domicile',
  coach_location: 'chez le coach',
  outdoor: 'en extérieur',
  partner_gym: 'en salle',
  corporate: 'en entreprise',
};

const packFormatText = (p: SessionPack) => (p.format && p.format !== 'any' ? `Séances ${FORMAT_TEXT[p.format] ?? p.format}` : 'Tous types de séance');

/** Packs proposés par le coach sur sa fiche, avec achat en 1, 3 ou 5 fois. */
export const CoachPacksOffer: React.FC<{ coach: CoachProfile; canBuy: boolean }> = ({ coach, canBuy }) => {
  const { currentUser, isOnline, packBalances, refreshPackBalances, navigateTo } = useApp();
  const packs = (coach.packs ?? []).filter((p) => p.active !== false && p.totalPrice > 0 && p.sessionsCount >= 2);
  const [selected, setSelected] = useState<SessionPack | null>(null);
  const [plan, setPlan] = useState<PackInstallments>(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (packs.length === 0) return null;
  const owned = packBalances.filter((b) => b.coachId === coach.id && isUsablePack(b));

  const open = (p: SessionPack) => {
    if (!currentUser) {
      navigateTo('auth');
      return;
    }
    setSelected(p);
    setPlan(1);
    setError('');
    setMessage('');
  };

  const buy = async () => {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const { startPackCheckout, waitForPack } = await import('../../lib/packs');
      await startPackCheckout(coach.id, selected.id, plan, async (purchaseId) => {
        // Mobile : la page Stripe vient d'être fermée
        setMessage('Vérification du paiement…');
        const status = await waitForPack(purchaseId, 5);
        await refreshPackBalances();
        setBusy(false);
        if (status === 'active') {
          setMessage('');
          setSelected(null);
        } else {
          setMessage('');
          setError("Paiement non finalisé. Vous pouvez réessayer : aucun montant n'a été débité.");
        }
      });
    } catch (err) {
      setBusy(false);
      setError((err as Error).message || 'Le paiement a échoué.');
    }
  };

  const choices = (p: SessionPack): PackInstallments[] => (p.installments?.length ? p.installments : [1]);

  return (
    <section>
      <SectionHeader title="Packs de séances" />
      {owned.map((b) => (
        <p key={b.id} className="mb-3 rounded-2xl bg-[#E6FBEF] dark:bg-fmc-green/15 text-[#007A3D] dark:text-fmc-green text-sm font-semibold px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Votre pack « {b.pack.name} » : {sessionsLeft(b)} séance{sessionsLeft(b) > 1 ? 's' : ''} restante{sessionsLeft(b) > 1 ? 's' : ''}. Choisissez un créneau pour l’utiliser.
        </p>
      ))}
      <div className="space-y-3">
        {packs.map((p) => {
          const max = Math.max(...choices(p));
          return (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {p.sessionsCount} séances · {packFormatText(p)} · valable {p.validityMonths ?? 6} mois
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold tabular-nums">{formatEuro(p.totalPrice)}</p>
                  <p className="text-xs text-slate-500 tabular-nums">{formatEuro(p.totalPrice / p.sessionsCount)} / séance</p>
                </div>
              </div>
              {max > 1 && (
                <p className="text-sm text-fmc-green-ink font-semibold mt-2">
                  ou {max} × {formatEuro(installmentAmount(p, max))} par mois
                </p>
              )}
              {canBuy && isOnline && (
                <button
                  type="button"
                  onClick={() => open(p)}
                  className="apple-press mt-3 w-full min-h-11 rounded-full bg-fmc-dark dark:bg-white text-white dark:text-fmc-navy text-sm font-bold cursor-pointer"
                >
                  Acheter ce pack
                </button>
              )}
            </Card>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <Sheet
            onClose={() => !busy && setSelected(null)}
            title={selected.name}
            footer={
              <button
                type="button"
                disabled={busy}
                onClick={buy}
                className="apple-press w-full h-14 rounded-full bg-fmc-green text-fmc-navy font-bold text-[17px] flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                <Lock className="w-5 h-5" />
                {busy
                  ? 'Ouverture du paiement sécurisé…'
                  : plan === 1
                  ? `Payer ${formatEuro(selected.totalPrice)}`
                  : `Payer ${formatEuro(installmentAmount(selected, plan))} aujourd’hui`}
              </button>
            }
          >
            <div className="space-y-4">
              <p className="text-[15px] text-slate-500">
                {selected.sessionsCount} séances avec {coach.name.split(' ')[0]} · {packFormatText(selected).toLowerCase()} · à utiliser dans les {selected.validityMonths ?? 6} mois.
              </p>
              <div role="radiogroup" aria-label="Mode de paiement" className="space-y-2.5">
                {choices(selected).map((n) => (
                  <Card key={n} selected={plan === n} role="radio" aria-checked={plan === n} onClick={() => setPlan(n)} className="p-4 flex items-center gap-3 cursor-pointer">
                    <span className="flex-1 min-w-0">
                      <span className="font-semibold block">{n === 1 ? 'En une fois' : `En ${n} fois`}</span>
                      <span className="text-sm text-slate-500 block tabular-nums">
                        {n === 1
                          ? formatEuro(selected.totalPrice)
                          : `${formatEuro(installmentAmount(selected, n))} aujourd’hui, puis chaque mois pendant ${n - 1} mois`}
                      </span>
                    </span>
                    {plan === n ? (
                      <CheckCircle2 className="w-6 h-6 text-white fill-fmc-green shrink-0" />
                    ) : (
                      <span className="w-6 h-6 rounded-full border-2 border-fmc-line dark:border-slate-700 shrink-0" />
                    )}
                  </Card>
                ))}
              </div>
              {plan > 1 && (
                <p className="text-xs text-slate-500">
                  Les mensualités sont prélevées automatiquement sur votre carte, puis s’arrêtent après la {plan}ᵉ. Total : {formatEuro(installmentAmount(selected, plan) * plan)}.
                  Si un prélèvement échoue, les réservations avec ce pack sont suspendues jusqu’au paiement.
                </p>
              )}
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Layers className="w-4 h-4 shrink-0" /> Après le paiement, réservez vos créneaux : chaque séance est déduite du pack, sans repayer.
              </p>
              {message && <p className="text-sm text-slate-500">{message}</p>}
              {error && <p className="text-sm text-rose-500 font-medium" role="alert">{error}</p>}
            </div>
          </Sheet>
        )}
      </AnimatePresence>
    </section>
  );
};
