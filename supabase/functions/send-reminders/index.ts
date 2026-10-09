// Rappels automatiques (appelé toutes les 15 min par une tâche planifiée de la base) :
// - la veille (≈ 24 h avant) : notification + push + email au client et au coach
// - 1 h avant : notification + push
import { admin, hoursUntil, isInternalCall, json, notify } from '../_shared/common.ts';

const fr = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

Deno.serve(async (req) => {
  if (!(await isInternalCall(req))) return json({ error: 'Accès refusé' }, 401);

  const today = new Date().toISOString().slice(0, 10);
  const inThreeDays = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const { data: rows, error } = await admin
    .from('bookings')
    .select('id, client_id, coach_user_id, data')
    .eq('status', 'confirmed')
    .gte('date', today)
    .lte('date', inThreeDays);
  if (error) return json({ error: error.message }, 500);

  let sent = 0;
  for (const row of rows ?? []) {
    const b = row.data ?? {};
    const h = hoursUntil(b.date, b.startTime);
    if (h <= 0) continue;
    const where = b.format === 'online' || b.sessionType?.format === 'online' ? 'en visio' : (b.location || b.clientAddress ? `à ${b.location ?? b.clientAddress}` : '');

    if (h <= 24 && !b.reminder24Sent) {
      await admin.from('bookings').update({ data: { ...b, reminder24Sent: true } }).eq('id', row.id);
      b.reminder24Sent = true;
      // Séance réservée à la dernière minute : le rappel « 1 h avant » suffit
      if (h > 3) {
      await notify(row.client_id, 'reminder', 'Rappel : votre séance demain',
        `Votre séance avec ${b.coachName ?? 'votre coach'} a lieu ${fr(b.date)} à ${b.startTime} ${where}.`.trim(), row.id);
      await notify(row.coach_user_id, 'reminder', 'Rappel : séance demain',
        `Séance avec ${b.clientName ?? 'votre client'} ${fr(b.date)} à ${b.startTime} ${where}.`.trim(), row.id);
      sent++;
      }
    }
    if (h <= 1.05 && !b.reminder1hSent) {
      await admin.from('bookings').update({ data: { ...b, reminder1hSent: true } }).eq('id', row.id);
      await notify(row.client_id, 'reminder_soon', 'Votre séance commence bientôt ⏰',
        `Rendez-vous à ${b.startTime} avec ${b.coachName ?? 'votre coach'}.`, row.id);
      await notify(row.coach_user_id, 'reminder_soon', 'Séance dans 1 heure ⏰',
        `${b.clientName ?? 'Votre client'} vous attend à ${b.startTime}.`, row.id);
      sent++;
    }
  }
  return json({ checked: rows?.length ?? 0, sent });
});
