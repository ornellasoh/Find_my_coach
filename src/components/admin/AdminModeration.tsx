import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { BookingIssue, CoachDocument, IssueStatus } from '../../types';
import {
  ISSUE_LABELS,
  ISSUE_STATUS_LABELS,
  adminReviewDocument,
  adminSetVerification,
  documentUrl,
  fetchAllIssues,
  fetchCoachDocuments,
  updateIssue,
} from '../../lib/sessions';
import { openExternal } from '../../utils/meeting';
import { REPORT_REASONS, fetchAdminReports, resolveReport, type AdminReport } from '../../lib/moderation';

const card = 'bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs';
const btn = 'min-h-10 px-3 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50';

/** Vérification des coachs : documents privés + attribution explicite du badge. */
export const AdminVerifications: React.FC = () => {
  const { coaches, refreshBookings } = useApp();
  const [docs, setDocs] = useState<CoachDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = () => fetchCoachDocuments().then(setDocs).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await load();
      await refreshBookings();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!docs) return <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</p>;
  const byCoach = new Map<string, CoachDocument[]>();
  docs.forEach((d) => byCoach.set(d.coachId, [...(byCoach.get(d.coachId) ?? []), d]));

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {byCoach.size === 0 && <p className={`${card} text-sm text-slate-500 text-center`}>Aucun document à vérifier.</p>}
      {[...byCoach.entries()].map(([coachId, list]) => {
        const coach = coaches.find((c) => c.id === coachId);
        const verified = coach?.verificationStatus === 'verified';
        return (
          <div key={coachId} className={card}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="font-bold text-sm truncate">{coach?.name ?? coachId}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${verified ? 'bg-emerald-100 text-[#008A3E]' : 'bg-slate-100 text-slate-600'}`}>
                {verified ? 'Vérifié' : coach?.verificationStatus === 'pending' ? 'En attente' : 'Non vérifié'}
              </span>
            </div>
            <ul className="space-y-2">
              {list.map((d) => (
                <li key={d.id} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-2">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">{d.title}</span>
                    <span className="text-slate-500">{d.status === 'approved' ? 'Validé' : d.status === 'rejected' ? 'Refusé' : 'À vérifier'}</span>
                  </div>
                  <input
                    value={notes[d.id] ?? d.adminFeedback ?? ''}
                    onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })}
                    placeholder="Commentaire pour le coach (si refus)"
                    className="w-full min-h-10 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <div className="flex gap-2">
                    {d.filePath && (
                      <button className={`${btn} bg-white dark:bg-slate-900 border border-slate-200`} onClick={async () => { const u = await documentUrl(d.filePath!).catch(() => null); if (u) openExternal(u); }}>
                        Ouvrir
                      </button>
                    )}
                    <button className={`${btn} bg-[#00D664] text-[#0F172A]`} disabled={!!busy} onClick={() => act(d.id, () => adminReviewDocument(d.id, 'approved', notes[d.id] ?? ''))}>Valider</button>
                    <button className={`${btn} bg-rose-50 text-rose-600`} disabled={!!busy} onClick={() => act(d.id, () => adminReviewDocument(d.id, 'rejected', notes[d.id] ?? ''))}>Refuser</button>
                  </div>
                </li>
              ))}
            </ul>
            <button
              className={`${btn} mt-3 w-full flex items-center justify-center gap-1.5 ${verified ? 'bg-slate-100 dark:bg-slate-800' : 'bg-[#0F172A] text-white'}`}
              disabled={!!busy || (!verified && !list.some((d) => d.status === 'approved'))}
              onClick={() => act(`v-${coachId}`, () => adminSetVerification(coachId, !verified))}
            >
              <ShieldCheck className="w-4 h-4" /> {verified ? 'Retirer le badge « Vérifié »' : 'Attribuer le badge « Vérifié »'}
            </button>
          </div>
        );
      })}
      <p className="text-[11px] text-slate-500">Après attribution du badge, le coach doit recharger l'app pour le voir.</p>
    </div>
  );
};

/** Signalements des réservations, avec statut de traitement. */
export const AdminIssues: React.FC = () => {
  const { bookings } = useApp();
  const [issues, setIssues] = useState<BookingIssue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => fetchAllIssues().then(setIssues).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (i: BookingIssue, status: IssueStatus) => {
    setBusy(i.id);
    try {
      await updateIssue(i.id, status, notes[i.id] ?? i.adminNote ?? '');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!issues) return <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</p>;
  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {issues.length === 0 && <p className={`${card} text-sm text-slate-500 text-center`}>Aucun signalement.</p>}
      {issues.map((i) => {
        const b = bookings.find((x) => x.id === i.bookingId);
        return (
          <div key={i.id} className={card}>
            <div className="flex justify-between gap-2">
              <p className="font-bold text-sm">{ISSUE_LABELS[i.category]}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">{ISSUE_STATUS_LABELS[i.status]}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Par le {i.reporterRole === 'coach' ? 'coach' : 'client'} · {new Date(i.createdAt).toLocaleString('fr-FR')}
              {b ? ` · ${b.clientName} / ${b.coachName}, séance du ${b.date} ${b.startTime}` : ` · réservation ${i.bookingId}`}
            </p>
            {i.description && <p className="text-sm mt-2 whitespace-pre-line">{i.description}</p>}
            <input
              value={notes[i.id] ?? i.adminNote ?? ''}
              onChange={(e) => setNotes({ ...notes, [i.id]: e.target.value })}
              placeholder="Note interne"
              className="mt-2 w-full min-h-10 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {(['in_progress', 'resolved', 'dismissed'] as IssueStatus[]).map((s) => (
                <button key={s} disabled={busy === i.id} onClick={() => save(i, s)} className={`${btn} ${i.status === s ? 'bg-[#00D664] text-[#0F172A]' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  {ISSUE_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const REPORT_TYPE_LABELS: Record<AdminReport['targetType'], string> = {
  conversation: 'Conversation',
  review: 'Avis',
  user: 'Utilisateur',
};
const REPORT_STATUS_LABELS: Record<AdminReport['status'], string> = {
  open: 'À traiter',
  resolved: 'Traité',
  dismissed: 'Classé sans suite',
};

/** Messages, avis et utilisateurs signalés (règle 1.2 d'Apple : à traiter sous 24 h). */
export const AdminReports: React.FC = () => {
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => fetchAdminReports().then(setReports).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const act = async (id: string, action: 'resolve' | 'dismiss' | 'hide_review') => {
    setBusy(id + action);
    setError(null);
    try {
      await resolveReport(id, action);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!reports) return <p className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</p>;
  const open = reports.filter((r) => r.status === 'open').length;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold">Messages et avis signalés {open > 0 && <span className="ml-1 text-rose-600">({open} à traiter)</span>}</h3>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {reports.length === 0 && <p className={`${card} text-sm text-slate-500 text-center`}>Aucun signalement.</p>}
      {reports.map((r) => (
        <div key={r.id} className={card}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-sm">{REPORT_TYPE_LABELS[r.targetType]} · {REPORT_REASONS.find((x) => x.id === r.reason)?.label ?? r.reason}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${r.status === 'open' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
              {REPORT_STATUS_LABELS[r.status]}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Signalé par {r.reporterName || 'un utilisateur'} · concerne {r.reportedName || 'un utilisateur'} · {new Date(r.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
          {r.details && <p className="text-sm mt-2">« {r.details} »</p>}
          {r.snapshot && (
            <pre className="mt-2 text-xs whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-800 rounded-xl p-3 max-h-48 overflow-y-auto font-sans">{r.snapshot}</pre>
          )}
          {r.status === 'open' && (
            <div className="flex flex-wrap gap-2 mt-3">
              {r.targetType === 'review' && (
                <button className={`${btn} bg-rose-600 text-white`} disabled={!!busy} onClick={() => act(r.id, 'hide_review')}>Masquer l’avis</button>
              )}
              <button className={`${btn} bg-[#00D664] text-[#0F172A]`} disabled={!!busy} onClick={() => act(r.id, 'resolve')}>Traité</button>
              <button className={`${btn} bg-slate-100 text-slate-700`} disabled={!!busy} onClick={() => act(r.id, 'dismiss')}>Classer sans suite</button>
            </div>
          )}
          {r.status === 'open' && r.targetType !== 'review' && (
            <p className="text-[11px] text-slate-500 mt-2">
              Si le comportement est grave : désactiver le compte dans Supabase (Authentication → Users → Ban user), puis marquer « Traité ».
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
