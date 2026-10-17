import { supabase } from './supabase';

/** Signaler et bloquer (règle 1.2 d'Apple) : tout est vérifié et enregistré par le serveur. */

export type ReportTarget = 'conversation' | 'review' | 'user';
export type ReportReason = 'harassment' | 'inappropriate' | 'scam' | 'spam' | 'other';

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: 'harassment', label: 'Harcèlement ou insultes' },
  { id: 'inappropriate', label: 'Contenu sexuel ou inapproprié' },
  { id: 'scam', label: 'Arnaque ou paiement hors de l’app' },
  { id: 'spam', label: 'Spam ou publicité' },
  { id: 'other', label: 'Autre' },
];

export async function reportContent(type: ReportTarget, targetId: string, reason: ReportReason, details?: string) {
  if (!supabase) throw new Error('Indisponible en mode démo.');
  const { error } = await supabase.rpc('fmc_report', { p_type: type, p_target_id: targetId, p_reason: reason, p_details: details || null });
  if (error) throw new Error(error.message);
}

export async function fetchMyBlocks(): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('user_blocks').select('blocked_id');
  return ((data ?? []) as { blocked_id: string }[]).map((r) => r.blocked_id);
}

export async function blockUser(me: string, userId: string) {
  if (!supabase) throw new Error('Indisponible en mode démo.');
  const { error } = await supabase.from('user_blocks').upsert({ blocker_id: me, blocked_id: userId }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function unblockUser(me: string, userId: string) {
  if (!supabase) throw new Error('Indisponible en mode démo.');
  const { error } = await supabase.from('user_blocks').delete().eq('blocker_id', me).eq('blocked_id', userId);
  if (error) throw new Error(error.message);
}

export interface AdminReport {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  snapshot: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
  reporterName: string;
  reportedName: string;
  reportedUserId: string | null;
}

export async function fetchAdminReports(): Promise<AdminReport[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('fmc_admin_reports');
  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    reason: r.reason,
    details: r.details,
    snapshot: r.snapshot,
    status: r.status,
    createdAt: r.created_at,
    reporterName: r.reporter_name,
    reportedName: r.reported_name,
    reportedUserId: r.reported_user_id,
  }));
}

export async function resolveReport(id: string, action: 'resolve' | 'dismiss' | 'hide_review', note?: string) {
  if (!supabase) throw new Error('Indisponible en mode démo.');
  const { error } = await supabase.rpc('fmc_admin_resolve_report', { p_id: id, p_action: action, p_note: note || null });
  if (error) throw new Error(error.message);
}
