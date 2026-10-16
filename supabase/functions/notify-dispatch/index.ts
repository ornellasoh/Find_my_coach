// Envoie en push + email une notification créée par la base (lien de séance, report, compte rendu…).
// Appelée uniquement par la base (fonction fmc_notify → call_edge), avec le secret interne.
import { admin, deliver, isInternalCall, json } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (!(await isInternalCall(req))) return json({ error: 'Accès refusé' }, 401);
  try {
    const { notification_id } = await req.json();
    if (!notification_id) return json({ error: 'notification_id manquant' }, 400);
    const { data: row } = await admin.from('notifications').select('user_id, data').eq('id', notification_id).maybeSingle();
    if (!row) return json({ error: 'Notification introuvable' }, 404);
    const n = row.data ?? {};
    await deliver(row.user_id, n.type ?? 'system', n.title ?? 'Find My Coach', n.message ?? '', n.relatedBookingId,
      n.actionUrl ? { label: n.actionLabel ?? 'Ouvrir', url: n.actionUrl } : undefined);
    return json({ sent: true });
  } catch (err) {
    console.error('notify-dispatch', err);
    return json({ error: 'Envoi impossible' }, 500);
  }
});
