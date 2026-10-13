// Fichier calendrier (.ics) d'une séance, pour la feuille « Ajouter au calendrier » de l'iPhone.
//  POST { booking_id } (utilisateur connecté, client ou coach de la séance) → { url } valable 10 minutes
//  GET  ?b=<réservation>&r=<c|k>&e=<expiration>&s=<signature>            → le fichier .ics
// L'adresse et le lien de visio ne figurent jamais dans l'URL : ils sont lus en base au moment du GET.
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SERVICE_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`calendar-event:${payload}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Instant UTC d'une date + heure exprimées à l'heure de Paris. */
function parisToUtc(date: string, time: string): Date {
  const guess = Date.parse(`${date}T${time || '00:00'}:00Z`);
  const paris = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(guess)).replace(' ', 'T');
  return new Date(guess - (Date.parse(`${paris}Z`) - guess));
}
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    if (req.method === 'POST') {
      const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
      const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } };
      if (!auth.user) return json({ error: 'Non connecté' }, 401);
      const { booking_id } = await req.json();
      const { data: row } = await admin.from('bookings').select('id, client_id, coach_user_id').eq('id', String(booking_id ?? '')).maybeSingle();
      const role = row?.client_id === auth.user.id ? 'c' : row?.coach_user_id === auth.user.id ? 'k' : null;
      if (!row || !role) return json({ error: 'Réservation introuvable' }, 404);
      const exp = Math.floor(Date.now() / 1000) + 600;
      const q = new URLSearchParams({ b: row.id, r: role, e: String(exp), s: await sign(`${row.id}.${role}.${exp}`) });
      return json({ url: `${SUPABASE_URL}/functions/v1/calendar-event?${q}` });
    }

    if (req.method !== 'GET') return json({ error: 'Méthode non autorisée' }, 405);
    const p = new URL(req.url).searchParams;
    const [b, r, e, s] = [p.get('b') ?? '', p.get('r') ?? '', p.get('e') ?? '', p.get('s') ?? ''];
    if (!b || !/^[ck]$/.test(r) || Number(e) < Date.now() / 1000 || s !== (await sign(`${b}.${r}.${e}`))) {
      return new Response('Lien expiré : rouvrez la séance dans Find My Coach.', { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    const { data: row } = await admin.from('bookings').select('id, status, data').eq('id', b).maybeSingle();
    if (!row || row.status === 'cancelled') return new Response('Séance introuvable.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    const { data: d } = await admin.from('booking_session_details').select('meeting_url, session_address').eq('booking_id', b).maybeSingle();
    const k = row.data ?? {};
    const online = k.format === 'online' || k.sessionType?.format === 'online';
    const location = online ? 'Visio' : d?.session_address || k.location || '';
    const description = [k.sessionType?.name, d?.meeting_url ? `Lien de la visio : ${d.meeting_url}` : '', 'Réservé avec Find My Coach'].filter(Boolean).join('\n');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Find My Coach//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${row.id}@findmycoach.io`, `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(parisToUtc(k.date, k.startTime))}`, `DTEND:${stamp(parisToUtc(k.date, k.endTime))}`,
      `SUMMARY:${esc(`Séance avec ${(r === 'c' ? k.coachName : k.clientName) ?? 'Find My Coach'}`)}`,
      ...(location ? [`LOCATION:${esc(location)}`] : []), `DESCRIPTION:${esc(description)}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Séance dans 1 heure', 'TRIGGER:-PT1H', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    return new Response(ics, {
      headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="seance-findmycoach.ics"', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('calendar-event', err);
    return json({ error: 'Calendrier indisponible' }, 500);
  }
});
