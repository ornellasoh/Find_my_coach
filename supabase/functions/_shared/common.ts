// Outils partagés par les fonctions Find My Coach (Stripe + Supabase)
import Stripe from 'npm:stripe@17.7.0';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.58.0';

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

const round2 = (n: number) => Math.round(n * 100) / 100;

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
  const taxes = round2(basePrice * 0.025);
  let discount = 0;
  const code = (promoCode ?? '').trim().toUpperCase();
  if (code === 'FMC10') discount = 10;
  if (code === 'WELCOME20') discount = round2(basePrice * 0.2);
  const total = Math.max(0, round2(basePrice + SERVICE_FEE + taxes - discount));
  // Commission Find My Coach : 15 % de la séance + frais de service + taxes, moins la remise offerte
  const platformFee = Math.max(0, round2(basePrice * COMMISSION_RATE + SERVICE_FEE + taxes - discount));
  return { basePrice, taxes, discount, total, platformFee };
}

/** Ajoute une notification dans l'app (format attendu par l'app). */
export async function notify(userId: string | null | undefined, type: string, title: string, message: string, bookingId?: string) {
  if (!userId) return;
  const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  await admin.from('notifications').insert({
    id,
    user_id: userId,
    read: false,
    data: { id, userId, type, title, message, relatedBookingId: bookingId, read: false, createdAt: new Date().toISOString() },
  });
}
