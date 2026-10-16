import React, { useEffect, useState } from 'react';
import { Check, Layers, Plus, Trash2 } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { formatEuro } from '../ui/fmc';
import { useApp } from '../../context/AppContext';
import { fetchStripeStatus } from '../../lib/payments';
import { PACK_INSTALLMENT_CHOICES, PACK_VALIDITY_CHOICES, installmentAmount } from '../../lib/packs';
import type { CoachProfile, CoachingFormat, PackInstallments, SessionPack } from '../../types';

const FORMAT_LABELS: Record<CoachingFormat, string> = {
  online: 'Visio',
  home: 'À domicile',
  coach_location: 'Chez le coach',
  outdoor: 'Extérieur',
  partner_gym: 'En salle',
  corporate: 'Entreprise',
};

const inputCls =
  'w-full min-h-11 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 text-[15px] rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fmc-green/50';
const pill = (active: boolean) =>
  `min-h-10 px-3 rounded-full text-xs font-bold border transition cursor-pointer ${active ? 'bg-fmc-green/15 border-[#00D664] text-[#008A3E]' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`;

const newPack = (): SessionPack => ({
  id: `pack-${Date.now().toString(36)}`,
  name: '',
  sessionsCount: 10,
  totalPrice: 0,
  validityMonths: 6,
  format: 'any',
  installments: [1],
  active: true,
});

/** Packs de séances du coach : nombre de séances, prix total, validité, type de séance, paiement en 1, 3 ou 5 fois. */
export const CoachPacksEditor: React.FC<{ coach: CoachProfile }> = ({ coach }) => {
  const { updateCoachProfile } = useApp();
  const [paymentsActive, setPaymentsActive] = useState(false);
  useEffect(() => {
    fetchStripeStatus(coach.id).then((s) => setPaymentsActive(!!s?.charges_enabled));
  }, [coach.id]);
  const [packs, setPacks] = useState<SessionPack[]>(() => (coach.packs ?? []).map((p) => ({ ...p })));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const update = (id: string, patch: Partial<SessionPack>) => {
    setSaved(false);
    setPacks((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const save = () => {
    setError('');
    for (const p of packs) {
      if (!p.name.trim()) return setError('Donnez un nom à chaque pack.');
      if (!(p.sessionsCount >= 2 && p.sessionsCount <= 100)) return setError('Un pack contient entre 2 et 100 séances.');
      if (!(p.totalPrice >= 1)) return setError(`Indiquez le prix du pack « ${p.name} ».`);
    }
    updateCoachProfile(coach.id, {
      packs: packs.map((p) => ({
        ...p,
        name: p.name.trim().slice(0, 80),
        sessionsCount: Math.round(p.sessionsCount),
        totalPrice: Math.round(p.totalPrice * 100) / 100,
        installments: (p.installments?.length ? p.installments : [1]).slice().sort() as PackInstallments[],
      })),
    });
    setSaved(true);
  };

  return (
    <section className="mt-6 bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800 space-y-4" aria-labelledby="packs-title">
      <div className="flex items-center gap-2">
        <Layers className="w-5 h-5 text-fmc-green-ink" />
        <h2 id="packs-title" className="text-[17px] font-bold">Packs de séances</h2>
      </div>
      <p className="text-sm text-slate-500">
        Proposez plusieurs séances à un prix global. Le client peut payer en une fois ou, si vous l’acceptez, en 3 ou 5 mensualités prélevées automatiquement.
      </p>

      {packs.map((p) => {
        const allowed = p.installments?.length ? p.installments : [1];
        return (
          <div key={p.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3.5 space-y-3">
            <div className="flex items-center gap-2">
              <input
                aria-label="Nom du pack"
                value={p.name}
                onChange={(e) => update(p.id, { name: e.target.value })}
                placeholder="ex. Pack Transformation"
                maxLength={80}
                className={inputCls}
              />
              <button
                type="button"
                aria-label="Supprimer ce pack"
                onClick={() => { setSaved(false); setPacks((prev) => prev.filter((x) => x.id !== p.id)); }}
                className="apple-press w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-rose-500 cursor-pointer"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Séances</span>
                <NumberInput min={2} max={100} step={1} value={p.sessionsCount} onValueChange={(n) => update(p.id, { sessionsCount: n })} className={inputCls} />
              </label>
              <label className="block">
                <span className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Prix total (€)</span>
                <NumberInput min={1} step={1} value={p.totalPrice} onValueChange={(n) => update(p.id, { totalPrice: n })} placeholder="1200" className={inputCls} />
              </label>
            </div>
            {p.totalPrice > 0 && p.sessionsCount > 0 && (
              <p className="text-xs text-slate-500 -mt-1">
                Soit {formatEuro(p.totalPrice / p.sessionsCount)} la séance. Vous recevez {formatEuro(p.totalPrice * 0.85)} (commission Find My Coach de 15 %).
              </p>
            )}

            <div>
              <span className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Valable</span>
              <div className="flex flex-wrap gap-1.5">
                {PACK_VALIDITY_CHOICES.map((m) => (
                  <button key={m} type="button" onClick={() => update(p.id, { validityMonths: m })} className={pill((p.validityMonths ?? 6) === m)}>
                    {m} mois
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Type de séance</span>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => update(p.id, { format: 'any' })} className={pill(!p.format || p.format === 'any')}>Tous</button>
                {coach.formats.map((f) => (
                  <button key={f} type="button" onClick={() => update(p.id, { format: f })} className={pill(p.format === f)}>
                    {FORMAT_LABELS[f] ?? f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Paiement accepté</span>
              <div className="flex flex-wrap gap-1.5">
                {PACK_INSTALLMENT_CHOICES.map((n) => {
                  const on = allowed.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={n === 1}
                      aria-pressed={on}
                      onClick={() => update(p.id, { installments: on ? allowed.filter((x) => x !== n) : [...allowed, n] })}
                      className={`${pill(on)} disabled:cursor-default`}
                    >
                      {n === 1 ? 'En 1 fois' : `En ${n} fois${p.totalPrice > 0 ? ` (${formatEuro(installmentAmount(p, n))}/mois)` : ''}`}
                    </button>
                  );
                })}
              </div>
              {allowed.some((n) => n > 1) && (
                <p className="text-xs text-slate-500 mt-1.5">
                  {paymentsActive
                    ? 'Chaque mensualité vous est reversée à son prélèvement. Si un client arrête de payer, les mensualités restantes ne vous sont pas versées : vous êtes prévenu et ses réservations avec le pack sont bloquées.'
                    : 'Le paiement en plusieurs fois sera proposé dès que vos paiements Stripe seront activés.'}
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer min-h-11">
              <input type="checkbox" checked={p.active !== false} onChange={(e) => update(p.id, { active: e.target.checked })} className="w-5 h-5 accent-[#00D664]" />
              Proposé aux clients
            </label>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => { setSaved(false); setPacks((prev) => [...prev, newPack()]); }}
        className="apple-press w-full min-h-11 rounded-full border border-dashed border-slate-300 dark:border-slate-700 text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <Plus className="w-4 h-4" /> Ajouter un pack
      </button>

      {error && <p className="text-sm text-rose-600 font-semibold" role="alert">{error}</p>}
      <button
        type="button"
        onClick={save}
        className="apple-press w-full py-3.5 bg-fmc-green text-fmc-navy font-bold rounded-2xl text-sm flex items-center justify-center gap-2 cursor-pointer"
      >
        {saved ? <><Check className="w-4 h-4" /> Packs enregistrés</> : 'Enregistrer mes packs'}
      </button>
    </section>
  );
};
