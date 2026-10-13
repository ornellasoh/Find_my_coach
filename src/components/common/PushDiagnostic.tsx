import React from 'react';
import { pushStatus } from '../../lib/push';

const STATUS_TEXT: Record<string, string> = {
  denied: 'Notifications refusées : autorisez-les dans les réglages du téléphone (Find My Coach → Notifications).',
  error: 'Enregistrement du téléphone impossible.',
};

/** Signale un problème de notifications sur cet appareil (rien à afficher quand tout va bien). */
export const PushDiagnostic: React.FC = () => {
  const st = pushStatus();
  const text = STATUS_TEXT[st.status];
  if (!text) return null;
  return (
    <p className="pt-2 mt-1 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
      {text}
      {st.status === 'error' && st.error ? ` (${st.error})` : ''}
    </p>
  );
};
