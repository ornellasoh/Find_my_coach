import React, { useEffect, useRef, useState } from 'react';
import { FileCheck2, Loader2, Lock, Upload } from 'lucide-react';
import type { CoachDocument, CoachProfile } from '../../types';
import { documentUrl, fetchCoachDocuments, submitCoachDocument } from '../../lib/sessions';
import { openExternal } from '../../utils/meeting';

const TYPE_LABELS: Record<CoachDocument['type'], string> = {
  diploma: 'Diplôme',
  cert: 'Certification',
  identity: "Pièce d'identité",
  insurance: 'Assurance RC Pro',
  kbis: 'Kbis / SIRET',
};
const STATUS_LABELS: Record<CoachDocument['status'], { label: string; cls: string }> = {
  pending: { label: 'En cours de vérification', cls: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Validé', cls: 'bg-emerald-100 text-[#008A3E]' },
  rejected: { label: 'À compléter', cls: 'bg-rose-100 text-rose-700' },
};

/** Justificatifs du coach : stockage privé, visibles uniquement par le coach et l'équipe Find My Coach. */
export const CoachDocumentsPanel: React.FC<{ coach: CoachProfile; ownerId: string; onCountChange?: (n: number) => void }> = ({
  coach,
  ownerId,
  onCountChange,
}) => {
  const [docs, setDocs] = useState<CoachDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<CoachDocument['type']>('diploma');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCoachDocuments(coach.id)
      .then((d) => {
        setDocs(d);
        onCountChange?.(d.length);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);
    if (!title.trim()) return setError('Donnez un nom au document (ex. BPJEPS AF).');
    if (!file) return setError('Joignez le fichier (PDF ou photo).');
    setBusy(true);
    try {
      const d = await submitCoachDocument(coach.id, ownerId, type, title.trim(), file);
      const next = [d, ...docs];
      setDocs(next);
      onCountChange?.(next.length);
      setTitle('');
      setFile(null);
      setOk('Document envoyé. L’équipe Find My Coach le vérifie sous 48 h ouvrées.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible.');
    } finally {
      setBusy(false);
    }
  };

  const verified = coach.verificationStatus === 'verified';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-fmc-line/80 dark:border-slate-800 space-y-3 mt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-[#00B050]" /> Justificatifs & badge « Vérifié »
        </h3>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${verified ? 'bg-emerald-100 text-[#008A3E]' : coach.verificationStatus === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
          {verified ? 'Vérifié' : coach.verificationStatus === 'pending' ? 'En cours' : 'Non vérifié'}
        </span>
      </div>
      <p className="text-xs text-slate-500 flex items-start gap-1.5">
        <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        Vos documents restent privés : seuls vous et l'équipe Find My Coach y avez accès. Le badge s'affiche après validation par un administrateur.
      </p>

      {loading ? (
        <p className="text-xs text-slate-500 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement…</p>
      ) : docs.length === 0 ? (
        <p className="text-xs text-slate-500">Aucun document envoyé pour l'instant.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-bold block truncate">{d.title}</span>
                <span className="text-[10px] text-slate-500">{TYPE_LABELS[d.type]}</span>
                {d.adminFeedback && <span className="block text-[11px] text-rose-600 mt-0.5">{d.adminFeedback}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {d.filePath && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const url = await documentUrl(d.filePath!);
                        if (url) openExternal(url);
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                    className="min-h-9 px-2 underline cursor-pointer"
                  >
                    Voir
                  </button>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_LABELS[d.status].cls}`}>{STATUS_LABELS[d.status].label}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CoachDocument['type'])}
            className="min-h-11 px-2 bg-slate-50 dark:bg-slate-800 text-sm rounded-xl border border-slate-300 dark:border-slate-700"
          >
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Nom du document"
            className="min-h-11 px-3 bg-slate-50 dark:bg-slate-800 text-sm rounded-xl border border-slate-300 dark:border-slate-700"
          />
        </div>
        <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button type="button" onClick={() => fileRef.current?.click()} className="w-full min-h-11 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-sm cursor-pointer">
          {file ? file.name : 'Choisir un fichier (PDF ou photo, 10 Mo max.)'}
        </button>
        {error && <p className="text-xs text-rose-600">{error}</p>}
        {ok && <p className="text-xs text-[#008A3E] font-semibold">{ok}</p>}
        <button type="submit" disabled={busy} className="w-full min-h-11 bg-slate-100 dark:bg-slate-800 font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-[#00B050]" />} Envoyer pour vérification
        </button>
      </form>
    </div>
  );
};
