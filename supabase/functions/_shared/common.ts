// Outils partagés par les fonctions Find My Coach (Stripe + Supabase)
import Stripe from 'npm:stripe@17.7.0';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.58.0';
import { notificationEmail, sendMail } from './mailer.ts';
import { pushEnabled, sendPush } from './push.ts';

export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  httpClient: Stripe.createFetchHttpClient(),
});

export const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

/** Client « administrateur » (clé service_role, jamais exposée à l'app). */
export const admin: SupabaseClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/** Utilisateur connecté à partir du jeton envoyé par l'app. */
export async function getUser(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user ?? null;
}

/** Page de retour (texte) quand l'app n'a pas d'adresse web : l'utilisateur ferme simplement la fenêtre. */
export const RETURN_PAGE = `${SUPABASE_URL}/functions/v1/payment-return`;

/** N'accepte comme adresse de retour que l'app en local ou le site officiel. */
export function safeReturnBase(candidate?: string | null): string | null {
  if (!candidate) return null;
  try {
    const u = new URL(candidate);
    const site = Deno.env.get('SITE_URL');
    const local = /^(localhost|127\.0\.0\.1)$/.test(u.hostname) && /^https?:$/.test(u.protocol);
    const official = site && candidate.startsWith(site);
    return local || official ? `${u.origin}${u.pathname}` : null;
  } catch {
    return null;
  }
}

// ---- Tarification (doit rester identique à l'écran de réservation de l'app) ----
const SESSION_MULTIPLIERS: Record<string, number> = {
  'session-video': 1.0,
  'session-home': 1.15,
  'session-partner-gym': 1.0,
  'session-outdoor': 0.95,
};
export const SERVICE_FEE = 4.5;
export const COMMISSION_RATE = 0.15;
/**
 * Part des frais Stripe correspondant aux frais de déplacement, retenue au coach
 * (tarif Stripe cartes standard EEE : 1,5 % — le forfait par paiement est déjà couvert par les frais de service).
 * À ajuster si le tarif Stripe du compte change.
 */
export const TRAVEL_STRIPE_RATE = 0.015;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Frais de déplacement du coach (séance à domicile uniquement), bornés à 0–100 €. */
// deno-lint-ignore no-explicit-any
export function travelFeeFor(coach: any, format?: string): number {
  if (format !== 'home') return 0;
  const fee = Number(coach?.travelFee ?? 0);
  return Number.isFinite(fee) ? round2(Math.min(100, Math.max(0, fee))) : 0;
}

// deno-lint-ignore no-explicit-any
export function computePrice(coach: any, sessionType: any, promoCode?: string) {
  const format = sessionType?.format;
  const fp = coach?.formatPrices ?? {};
  const base =
    format === 'home' && fp.home
      ? fp.home
      : format === 'online' && fp.online
      ? fp.online
      : coach.hourlyRate * (SESSION_MULTIPLIERS[sessionType?.id] ?? sessionType?.priceMultiplier ?? 1);
  const basePrice = round2(base);
  const travelFee = travelFeeFor(coach, format);
  const taxes = round2(basePrice * 0.025);
  let discount = 0;
  const code = (promoCode ?? '').trim().toUpperCase();
  if (code === 'FMC10') discount = 10;
  if (code === 'WELCOME20') discount = round2(basePrice * 0.2);
  const total = Math.max(0, round2(basePrice + travelFee + SERVICE_FEE + taxes - discount));
  // Commission Find My Coach : 15 % de la séance + frais de service + taxes, moins la remise offerte.
  // Frais de déplacement : sans commission, le coach les reçoit moins les frais Stripe correspondants.
  const travelStripeFee = round2(travelFee * TRAVEL_STRIPE_RATE);
  const platformFee = Math.max(0, round2(basePrice * COMMISSION_RATE + SERVICE_FEE + taxes - discount + travelStripeFee));
  return { basePrice, travelFee, travelStripeFee, taxes, discount, total, platformFee };
}

/** Types de notifications qui déclenchent aussi un email (les autres : app + push uniquement). */
const EMAIL_TYPES = new Set([
  'booking_confirmed', 'new_booking', 'booking_cancelled', 'reminder',
  'session_link', 'reschedule_request', 'reschedule_accepted', 'reschedule_declined', 'session_report',
]);

/**
 * Ajoute une notification dans l'app, puis l'envoie en push sur le téléphone
 * et par email (selon le type et les préférences de l'utilisateur). Ne lève jamais d'erreur.
 */
export async function notify(userId: string | null | undefined, type: string, title: string, message: string, bookingId?: string) {
  if (!userId) return;
  const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await admin.from('notifications').insert({
    id,
    user_id: userId,
    read: false,
    data: { id, userId, type, title, message, relatedBookingId: bookingId, read: false, createdAt: new Date().toISOString() },
  });
  await deliver(userId, type, title, message, bookingId);
}

/** Envoi push + email d'une notification déjà enregistrée (aussi utilisé par notify-dispatch). */
export async function deliver(userId: string, type: string, title: string, message: string, bookingId?: string) {
  try {
    const { data: profile } = await admin.from('profiles').select('name, email, notify_email, notify_push').eq('id', userId).maybeSingle();
    if (!profile) return;
    const jobs: Promise<unknown>[] = [];

    if (profile.notify_push !== false && pushEnabled()) {
      jobs.push((async () => {
        const { data: rows } = await admin.from('push_tokens').select('token, platform').eq('user_id', userId);
        const dead = await sendPush(rows ?? [], title, message, { type, bookingId: bookingId ?? '' });
        if (dead.length) await admin.from('push_tokens').delete().in('token', dead);
      })());
    }

    if (profile.notify_email !== false && profile.email && EMAIL_TYPES.has(type)) {
      const prenom = String(profile.name ?? '').trim().split(/\s+/)[0];
      const subject = title.replace(/[^\p{L}\p{N}\p{P}\s€]/gu, '').trim() + ' — Find My Coach';
      jobs.push(sendMail(profile.email, subject, notificationEmail({ prenom, title, message })));
    }

    const results = await Promise.allSettled(jobs);
    for (const r of results) if (r.status === 'rejected') console.error('notify', type, r.reason);
  } catch (err) {
    console.error('notify', err);
  }
}

/** Administrateur ? (table protégée admin_users, jamais le rôle du profil) */
export async function isAdminUser(userId: string): Promise<boolean> {
  const { data } = await admin.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
  return !!data;
}

/** Vérifie l'en-tête secret des appels internes (tâches planifiées, déclencheurs de la base). */
export async function isInternalCall(req: Request): Promise<boolean> {
  const secret = req.headers.get('x-internal-secret');
  if (!secret) return false;
  const { data } = await admin.rpc('internal_secret_ok', { s: secret });
  return data === true;
}

/** Heures restantes avant une séance (date AAAA-MM-JJ + heure HH:MM, heure de Paris). */
export function hoursUntil(date: string, startTime: string): number {
  const parisNow = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date()).replace(' ', 'T');
  return (Date.parse(`${date}T${startTime || '00:00'}:00Z`) - Date.parse(`${parisNow}:00Z`)) / 3_600_000;
}
