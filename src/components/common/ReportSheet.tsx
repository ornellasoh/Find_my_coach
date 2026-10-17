import React, { useState } from 'react';
import { Check, CheckCircle2 } from 'lucide-react';
import { Sheet } from '../ui/fmc';
import { REPORT_REASONS, reportContent, type ReportReason, type ReportTarget } from '../../lib/moderation';

/**
 * Feuille « Signaler » : motif + précisions facultatives. Le signalement part à l'équipe Find My Coach,
 * qui le traite sous 24 h ; la personne signalée n'est pas prévenue.
 */
export const ReportSheet: React.FC<{
  type: ReportTarget;
  targetId: string;
  subject: string; // ex. « cette conversation », « cet avis »
  onClose: () => void;
  /** Proposé après l'envoi (ex. « Bloquer Marie »), si pertinent */
  afterAction?: { label: string; run: () => Promise<void> | void };
}> = ({ type, targetId, subject, onClose, afterAction }) => {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!reason) return;
    setBusy(true);
    setError('');
    try {
      await reportContent(type, targetId, reason, details.trim());
      setSent(true);
    } catch (e) {
      setError((e as Error).message || 'Le signalement n’a pas pu être envoyé.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Sheet onClose={onClose} label="Signalement envoyé">
        <div className="py-6 text-center space-y-2">
          <div className="w-14 h-14 bg-[#E6FBEF] dark:bg-fmc-green/15 text-[#007A3D] dark:text-fmc-green rounded-full flex items-center justify-center mx-auto">
            <Check className="w-7 h-7" strokeWidth={3} />
          </div>
          <h3 className="text-[20px] font-bold">Merci pour votre signalement</h3>
          <p className="text-[15px] text-slate-500">L’équipe Find My Coach l’examine sous 24 h. La personne concernée n’est pas prévenue.</p>
          {afterAction && (
            <button
              type="button"
              onClick={async () => { await afterAction.run(); onClose(); }}
              className="apple-press mt-3 w-full min-h-12 rounded-full bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 font-bold cursor-pointer"
            >
              {afterAction.label}
            </button>
          )}
          <button type="button" onClick={onClose} className="apple-press w-full min-h-12 rounded-full font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
            Fermer
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      onClose={onClose}
      title="Signaler"
      footer={
        <button
          type="button"
          disabled={!reason || busy}
          onClick={send}
          className="apple-press w-full h-14 rounded-full bg-rose-600 text-white font-bold text-[17px] disabled:opacity-50 cursor-pointer"
        >
          {busy ? 'Envoi…' : 'Envoyer le signalement'}
        </button>
      }
    >
      <p className="text-[15px] text-slate-500 mb-4">Pourquoi signalez-vous {subject} ?</p>
      <div role="radiogroup" aria-label="Motif du signalement" className="space-y-2">
        {REPORT_REASONS.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={reason === r.id}
            onClick={() => setReason(r.id)}
            className={`w-full min-h-12 px-4 rounded-2xl border text-left text-[15px] font-semibold flex items-center justify-between gap-3 cursor-pointer ${
              reason === r.id ? 'border-rose-400 bg-rose-50 dark:bg-rose-500/10' : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            {r.label}
            {reason === r.id ? <CheckCircle2 className="w-5 h-5 text-rose-600 shrink-0" /> : <span className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />}
          </button>
        ))}
      </div>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={1000}
        rows={3}
        aria-label="Précisions (facultatif)"
        placeholder="Précisions (facultatif)"
        className="mt-4 w-full text-[15px] p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none placeholder:text-slate-500"
      />
      {error && <p className="text-sm text-rose-600 mt-2" role="alert">{error}</p>}
    </Sheet>
  );
};
