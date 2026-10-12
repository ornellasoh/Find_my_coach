import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { pushAvailable, pushStatus, sendTestPush, type PushTestResult } from '../../lib/push';

const STATUS_TEXT: Record<string, string> = {
  unavailable: 'Push indisponible ici (navigateur web ou app sans notifications).',
  denied: 'Notifications refusées : autorisez-les dans les réglages du téléphone (Find My Coach → Notifications).',
  registered: 'Ce téléphone est enregistré pour recevoir les notifications.',
  error: 'Enregistrement du téléphone impossible.',
  pending: 'Enregistrement du téléphone en cours…',
};

/** État des notifications sur cet appareil + test envoyé uniquement à ses propres appareils. */
export const PushDiagnostic: React.FC = () => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PushTestResult | null>(null);
  const [error, setError] = useState('');
  const st = pushStatus();

  const run = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(await sendTestPush());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-2 mt-1 border-t border-slate-200 dark:border-slate-700 space-y-2">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        {STATUS_TEXT[st.status]}
        {st.status === 'error' && st.error ? ` (${st.error})` : ''}
      </p>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="w-full min-h-11 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} M'envoyer une notification de test
      </button>
      {busy && <p className="text-xs text-slate-500" role="status">Envoi dans quelques secondes : verrouillez l'écran ou quittez l'app pour voir la notification.</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {result && (
        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5" role="status">
          <p>✔ Notification ajoutée dans l'app.</p>
          {result.note && <p>{result.note}</p>}
          {result.results.map((r, i) => (
            <p key={i}>
              {r.platform === 'ios' ? 'iPhone/iPad' : 'Android'} : {r.ok ? 'envoyée au téléphone ✔' : `échec — ${r.error}`}
            </p>
          ))}
          {!pushAvailable() && <p>Ouvrez l'app sur votre téléphone pour recevoir la notification push.</p>}
        </div>
      )}
    </div>
  );
};
