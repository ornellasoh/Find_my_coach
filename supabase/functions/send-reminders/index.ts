// Rappels automatiques (appelé toutes les 15 min par une tâche planifiée de la base) :
// - la veille (≈ 24 h avant) : notification + push + email au client et au coach (avec le lien de visio s'il existe)
// - 1 h avant : notification + push (avec le lien de visio s'il existe)
// - séance en visio sans lien : le coach est relancé la veille puis ≈ 3 h avant
// Les rappels ne changent jamais le statut de la séance.
import { admin, hoursUntil, isInternalCall, json, notify } from '../_shared/common.ts';

const fr = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

// deno-lint-ignore no-explicit-any
const isOnline = (b: any) => b.format === 'online' || b.sessionType?.format === 'online';

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

  const ids = (rows ?? []).map((r) => r.id);
  const { data: detailRows } = ids.length
    ? await admin.from('booking_session_details').select('booking_id, meeting_url, session_address').in('booking_id', ids)
    : { data: [] };
  const details = new Map((detailRows ?? []).map((d) => [d.booking_id, d]));

  let sent = 0;
  for (const row of rows ?? []) {
    const b = row.data ?? {};
    const h = hoursUntil(b.date, b.startTime);
    if (h <= 0) continue;
    const d = details.get(row.id);
    const link: string | null = d?.meeting_url ?? null;
    const online = isOnline(b);
    const where = online ? 'en visio' : d?.session_address ? `à ${d.session_address}` : b.location ? `à ${b.location}` : '';
    const linkText = online ? (link ? ` Lien de la séance : ${link}` : ' Le lien de visio sera ajouté par le coach avant la séance.') : '';
    const due24 = h <= 24 && !b.reminder24Sent;
    const dueLink = online && !link && h <= 3 && !b.linkReminderSent;
    const due1h = h <= 1.05 && !b.reminder1hSent;
    if (!due24 && !dueLink && !due1h) continue;
    // Les indicateurs sont enregistrés AVANT l'envoi : jamais de rappel en double
    await admin.from('bookings').update({
      data: { ...b, ...(due24 ? { reminder24Sent: true } : {}), ...(dueLink ? { linkReminderSent: true } : {}), ...(due1h ? { reminder1hSent: true } : {}) },
    }).eq('id', row.id);

    if (due24) {
      // Séance réservée à la dernière minute : le rappel « 1 h avant » suffit
      if (h > 3) {
        await notify(row.client_id, 'reminder', 'Rappel : votre séance demain',
          `Votre séance avec ${b.coachName ?? 'votre coach'} a lieu ${fr(b.date)} à ${b.startTime} ${where}.${linkText}`.trim(), row.id);
        await notify(row.coach_user_id, 'reminder', 'Rappel : séance demain',
          `Séance avec ${b.clientName ?? 'votre client'} ${fr(b.date)} à ${b.startTime} ${where}.` +
          (online && !link ? ' Pensez à ajouter le lien de visio depuis le détail de la réservation.' : ''), row.id);
        sent++;
      }
    }
    // Lien toujours manquant à l'approche de la séance : relance du coach
    if (dueLink) {
      await notify(row.coach_user_id, 'reminder_soon', 'Lien de visio manquant ⚠️',
        `Votre séance avec ${b.clientName ?? 'votre client'} commence à ${b.startTime}. Ajoutez le lien (Meet, Zoom, Teams…) dans le détail de la réservation.`,
        row.id);
      sent++;
    }
    if (due1h) {
      await notify(row.client_id, 'reminder_soon', 'Votre séance commence bientôt ⏰',
        `Rendez-vous à ${b.startTime} avec ${b.coachName ?? 'votre coach'}.${online && link ? ' Rejoignez la séance depuis l\'app.' : ''}`, row.id);
      await notify(row.coach_user_id, 'reminder_soon', 'Séance dans 1 heure ⏰',
        `${b.clientName ?? 'Votre client'} vous attend à ${b.startTime}.`, row.id);
      sent++;
    }
  }
  return json({ checked: rows?.length ?? 0, sent });
});
