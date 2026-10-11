import { supabase } from './supabase';
import type {
  BookingIssue,
  CoachDocument,
  IssueCategory,
  IssueStatus,
  RescheduleRequest,
  SessionDetails,
  SessionReport,
} from '../types';

/**
 * Séances (v1) : lien de visio et consignes, report, compte rendu, signalements, documents.
 * En ligne : tout passe par la base (règles d'accès + fonctions sécurisées).
 * Mode démo (sans Supabase) : données gardées sur l'appareil, sans contrôle serveur.
 */

const online = () => supabase !== null;

/** Message d'erreur lisible (les fonctions de la base renvoient déjà des messages en français). */
const fr = (error: { message?: string; code?: string } | null): Error => {
  const m = error?.message ?? 'Une erreur est survenue.';
  if (/row-level security|permission denied|42501/i.test(m) || error?.code === '42501') return new Error('Action non autorisée.');
  if (/Failed to fetch|NetworkError|fetch/i.test(m)) return new Error('Connexion impossible. Vérifiez votre réseau puis réessayez.');
  return new Error(m);
};

// ---------- Stockage local (mode démo uniquement) ----------
const DEMO_KEY = 'fmc_demo_sessions_v1';
interface DemoStore {
  details: Record<string, SessionDetails>;
  reschedules: RescheduleRequest[];
  reports: Record<string, SessionReport>;
  issues: BookingIssue[];
  documents: CoachDocument[];
}
const emptyStore = (): DemoStore => ({ details: {}, reschedules: [], reports: {}, issues: [], documents: [] });
function readDemo(): DemoStore {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? { ...emptyStore(), ...JSON.parse(raw) } : emptyStore();
  } catch {
    return emptyStore();
  }
}
function writeDemo(s: DemoStore) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(s));
  } catch {
    /* stockage indisponible */
  }
}
const demoId = () => `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ---------- Détails de séance ----------
type DetailsRow = { booking_id: string; meeting_url: string | null; prep_instructions: string | null; session_address: string | null; updated_at: string };
const toDetails = (r: DetailsRow): SessionDetails => ({
  bookingId: r.booking_id,
  meetingUrl: r.meeting_url,
  prepInstructions: r.prep_instructions,
  sessionAddress: r.session_address,
  updatedAt: r.updated_at,
});

/** Détails de plusieurs séances (seules celles autorisées par la base sont renvoyées). */
export async function fetchSessionDetails(bookingIds: string[]): Promise<Record<string, SessionDetails>> {
  if (!bookingIds.length) return {};
  if (!online()) {
    const d = readDemo().details;
    return Object.fromEntries(bookingIds.filter((id) => d[id]).map((id) => [id, d[id]]));
  }
  const { data, error } = await supabase!
    .from('booking_session_details')
    .select('booking_id, meeting_url, prep_instructions, session_address, updated_at')
    .in('booking_id', bookingIds);
  if (error) throw fr(error);
  return Object.fromEntries((data as DetailsRow[]).map((r) => [r.booking_id, toDetails(r)]));
}

export async function saveSessionDetails(bookingId: string, meetingUrl: string | null, prep: string | null): Promise<SessionDetails> {
  if (!online()) {
    const s = readDemo();
    const prev = s.details[bookingId];
    s.details[bookingId] = { bookingId, meetingUrl, prepInstructions: prep, sessionAddress: prev?.sessionAddress ?? null, updatedAt: new Date().toISOString() };
    writeDemo(s);
    return s.details[bookingId];
  }
  const { data, error } = await supabase!.rpc('set_session_details', {
    p_booking_id: bookingId,
    p_meeting_url: meetingUrl,
    p_prep_instructions: prep,
  });
  if (error) throw fr(error);
  return toDetails(data as DetailsRow);
}

/** Mode démo : mémorise l'adresse saisie par le client (en ligne, la base s'en charge). */
export function rememberDemoAddress(bookingId: string, address?: string) {
  if (online() || !address) return;
  const s = readDemo();
  s.details[bookingId] = { ...(s.details[bookingId] ?? { bookingId, meetingUrl: null, prepInstructions: null }), sessionAddress: address };
  writeDemo(s);
}

// ---------- Report de séance ----------
type RescheduleRow = {
  id: string; booking_id: string; requested_by: string; requester_role: 'client' | 'coach';
  old_date: string; old_start: string; old_end: string | null; new_date: string; new_start: string; new_end: string | null;
  new_availability_id: string; message: string | null; status: RescheduleRequest['status']; created_at: string; responded_at: string | null;
};
const toReschedule = (r: RescheduleRow): RescheduleRequest => ({
  id: r.id,
  bookingId: r.booking_id,
  requestedBy: r.requested_by,
  requesterRole: r.requester_role,
  oldDate: r.old_date,
  oldStart: r.old_start,
  oldEnd: r.old_end,
  newDate: r.new_date,
  newStart: r.new_start,
  newEnd: r.new_end,
  newAvailabilityId: r.new_availability_id,
  message: r.message,
  status: r.status,
  createdAt: r.created_at,
  respondedAt: r.responded_at,
});

export async function fetchReschedules(bookingIds: string[]): Promise<RescheduleRequest[]> {
  if (!bookingIds.length) return [];
  if (!online()) return readDemo().reschedules.filter((r) => bookingIds.includes(r.bookingId));
  const { data, error } = await supabase!
    .from('booking_reschedules')
    .select('*')
    .in('booking_id', bookingIds)
    .order('created_at', { ascending: false });
  if (error) throw fr(error);
  return (data as RescheduleRow[]).map(toReschedule);
}

export async function proposeReschedule(
  bookingId: string,
  slot: { id: string; date: string; startTime: string; endTime: string },
  message: string,
  demo?: { userId: string; role: 'client' | 'coach'; oldDate: string; oldStart: string; oldEnd: string },
): Promise<RescheduleRequest> {
  if (!online()) {
    const s = readDemo();
    if (s.reschedules.some((r) => r.bookingId === bookingId && r.status === 'pending')) {
      throw new Error('Une demande de report est déjà en attente pour cette séance.');
    }
    const r: RescheduleRequest = {
      id: demoId(), bookingId, requestedBy: demo?.userId ?? '', requesterRole: demo?.role ?? 'client',
      oldDate: demo?.oldDate ?? '', oldStart: demo?.oldStart ?? '', oldEnd: demo?.oldEnd,
      newDate: slot.date, newStart: slot.startTime, newEnd: slot.endTime, newAvailabilityId: slot.id,
      message: message || null, status: 'pending', createdAt: new Date().toISOString(),
    };
    s.reschedules.unshift(r);
    writeDemo(s);
    return r;
  }
  const { data, error } = await supabase!.rpc('propose_reschedule', {
    p_booking_id: bookingId,
    p_new_availability_id: slot.id,
    p_message: message || null,
  });
  if (error) throw fr(error);
  return toReschedule(data as RescheduleRow);
}

export async function respondReschedule(requestId: string, action: 'accept' | 'decline' | 'cancel'): Promise<RescheduleRequest> {
  if (!online()) {
    const s = readDemo();
    const r = s.reschedules.find((x) => x.id === requestId);
    if (!r) throw new Error('Demande introuvable.');
    r.status = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'cancelled';
    r.respondedAt = new Date().toISOString();
    writeDemo(s);
    return r;
  }
  const { data, error } = await supabase!.rpc('respond_reschedule', { p_request_id: requestId, p_action: action });
  if (error) throw fr(error);
  return toReschedule(data as RescheduleRow);
}

// ---------- Compte rendu ----------
type ReportRow = { booking_id: string; summary: string; next_actions: string | null; created_at: string; updated_at: string };
const toReport = (r: ReportRow): SessionReport => ({
  bookingId: r.booking_id, summary: r.summary, nextActions: r.next_actions, createdAt: r.created_at, updatedAt: r.updated_at,
});

export async function fetchReport(bookingId: string): Promise<SessionReport | null> {
  if (!online()) return readDemo().reports[bookingId] ?? null;
  const { data, error } = await supabase!.from('session_reports').select('*').eq('booking_id', bookingId).maybeSingle();
  if (error) throw fr(error);
  return data ? toReport(data as ReportRow) : null;
}

export async function saveReport(bookingId: string, summary: string, nextActions: string): Promise<SessionReport> {
  if (!online()) {
    const s = readDemo();
    const now = new Date().toISOString();
    s.reports[bookingId] = { bookingId, summary, nextActions: nextActions || null, createdAt: s.reports[bookingId]?.createdAt ?? now, updatedAt: now };
    writeDemo(s);
    return s.reports[bookingId];
  }
  const { data, error } = await supabase!.rpc('save_session_report', {
    p_booking_id: bookingId,
    p_summary: summary,
    p_next_actions: nextActions || null,
  });
  if (error) throw fr(error);
  return toReport(data as ReportRow);
}

// ---------- Signalements ----------
type IssueRow = {
  id: string; booking_id: string; reporter_id: string; reporter_role: 'client' | 'coach'; category: IssueCategory;
  description: string | null; status: IssueStatus; admin_note: string | null; created_at: string;
};
const toIssue = (r: IssueRow): BookingIssue => ({
  id: r.id, bookingId: r.booking_id, reporterId: r.reporter_id, reporterRole: r.reporter_role, category: r.category,
  description: r.description, status: r.status, adminNote: r.admin_note, createdAt: r.created_at,
});

export const ISSUE_LABELS: Record<IssueCategory, string> = {
  no_show: 'Absence (no-show)',
  technical: 'Problème technique',
  behaviour: 'Comportement inapproprié',
  other: 'Autre',
};
export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  open: 'Nouveau',
  in_progress: 'En cours',
  resolved: 'Résolu',
  dismissed: 'Classé',
};

export async function reportIssue(bookingId: string, reporterId: string, category: IssueCategory, description: string): Promise<BookingIssue> {
  if (!online()) {
    const s = readDemo();
    const issue: BookingIssue = {
      id: demoId(), bookingId, reporterId, reporterRole: 'client', category, description: description || null,
      status: 'open', createdAt: new Date().toISOString(),
    };
    s.issues.unshift(issue);
    writeDemo(s);
    return issue;
  }
  const { data, error } = await supabase!
    .from('booking_issues')
    .insert({ booking_id: bookingId, reporter_id: reporterId, category, description: description || null })
    .select('*')
    .single();
  if (error) throw fr(error);
  return toIssue(data as IssueRow);
}

export async function fetchMyIssues(bookingId: string): Promise<BookingIssue[]> {
  if (!online()) return readDemo().issues.filter((i) => i.bookingId === bookingId);
  const { data, error } = await supabase!.from('booking_issues').select('*').eq('booking_id', bookingId).order('created_at', { ascending: false });
  if (error) throw fr(error);
  return (data as IssueRow[]).map(toIssue);
}

/** Admin : tous les signalements (la base refuse aux autres comptes). */
export async function fetchAllIssues(): Promise<BookingIssue[]> {
  if (!online()) return readDemo().issues;
  const { data, error } = await supabase!.from('booking_issues').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw fr(error);
  return (data as IssueRow[]).map(toIssue);
}

export async function updateIssue(id: string, status: IssueStatus, adminNote: string): Promise<void> {
  if (!online()) {
    const s = readDemo();
    const i = s.issues.find((x) => x.id === id);
    if (i) { i.status = status; i.adminNote = adminNote || null; }
    writeDemo(s);
    return;
  }
  const { error } = await supabase!.from('booking_issues').update({ status, admin_note: adminNote || null }).eq('id', id);
  if (error) throw fr(error);
}

// ---------- Documents de vérification (privés) ----------
type DocRow = {
  id: string; coach_id: string; type: CoachDocument['type']; title: string; file_path: string | null;
  status: CoachDocument['status']; admin_feedback: string | null; submitted_at: string;
};
const toDoc = (r: DocRow): CoachDocument => ({
  id: r.id, coachId: r.coach_id, type: r.type, title: r.title, filePath: r.file_path, status: r.status,
  adminFeedback: r.admin_feedback, submittedAt: r.submitted_at,
});

export async function fetchCoachDocuments(coachId?: string): Promise<CoachDocument[]> {
  if (!online()) return readDemo().documents.filter((d) => !coachId || d.coachId === coachId);
  let q = supabase!.from('coach_documents').select('*').order('submitted_at', { ascending: false });
  if (coachId) q = q.eq('coach_id', coachId);
  const { data, error } = await q;
  if (error) throw fr(error);
  return (data as DocRow[]).map(toDoc);
}

/** Envoie le fichier dans le stockage privé (dossier = identifiant du compte) puis déclare le document. */
export async function submitCoachDocument(
  coachId: string,
  ownerId: string,
  type: CoachDocument['type'],
  title: string,
  file?: File | null,
): Promise<CoachDocument> {
  if (file && file.size > 10 * 1024 * 1024) throw new Error('Fichier trop lourd (10 Mo maximum).');
  if (!online()) {
    const s = readDemo();
    const doc: CoachDocument = { id: demoId(), coachId, type, title, filePath: file?.name ?? null, status: 'pending', submittedAt: new Date().toISOString() };
    s.documents.unshift(doc);
    writeDemo(s);
    return doc;
  }
  let filePath: string | null = null;
  if (file) {
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
    filePath = `${ownerId}/verification/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase!.storage.from('documents').upload(filePath, file, { upsert: false, contentType: file.type || undefined });
    if (upErr) throw fr(upErr);
  }
  const { data, error } = await supabase!
    .from('coach_documents')
    .insert({ coach_id: coachId, owner_id: ownerId, type, title, file_path: filePath })
    .select('*')
    .single();
  if (error) throw fr(error);
  return toDoc(data as DocRow);
}

/** Lien temporaire (5 min) pour consulter un document privé — propriétaire ou admin uniquement. */
export async function documentUrl(filePath: string): Promise<string | null> {
  if (!online() || !filePath || /^https?:|^data:/.test(filePath)) return /^https?:|^data:/.test(filePath) ? filePath : null;
  const { data, error } = await supabase!.storage.from('documents').createSignedUrl(filePath, 300);
  if (error) throw fr(error);
  return data.signedUrl;
}

export async function adminReviewDocument(id: string, status: 'approved' | 'rejected', feedback: string): Promise<void> {
  if (!online()) {
    const s = readDemo();
    const d = s.documents.find((x) => x.id === id);
    if (d) { d.status = status; d.adminFeedback = feedback || null; }
    writeDemo(s);
    return;
  }
  const { error } = await supabase!.rpc('admin_review_document', { p_document_id: id, p_status: status, p_feedback: feedback || null });
  if (error) throw fr(error);
}

export async function adminSetVerification(coachId: string, verified: boolean): Promise<void> {
  if (!online()) return;
  const { error } = await supabase!.rpc('admin_set_coach_verification', { p_coach_id: coachId, p_verified: verified });
  if (error) throw fr(error);
}

/** Adresse exacte du coach connecté (privée). */
export async function fetchMyPrivateAddress(coachId: string): Promise<string | null> {
  if (!online()) return null;
  const { data } = await supabase!.from('coach_private').select('address').eq('coach_id', coachId).maybeSingle();
  return (data as { address?: string | null } | null)?.address ?? null;
}
