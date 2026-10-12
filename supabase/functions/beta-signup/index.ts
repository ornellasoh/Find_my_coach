// Inscription des bêta-testeurs (formulaire de findmycoach.io), sans compte.
//  POST { email, firstName?, platform?: 'android'|'ios', source? } → envoie l'email de validation.
//  GET  ?confirm=<jeton>  → valide l'adresse, envoie les liens d'installation + tutoriel, puis
//                           redirige vers <SITE_URL>/beta-merci (?statut=ok | invalide).
// Anti-abus : un email de validation au plus toutes les 2 minutes par adresse ; liens renvoyés au plus toutes les 10 minutes.
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { brandEmail, escapeHtml as esc, sendMail } from '../_shared/mailer.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const SITE = (Deno.env.get('SITE_URL') ?? 'https://findmycoach.io').replace(/\/$/, '');
const TESTFLIGHT_APP = 'https://apps.apple.com/app/testflight/id899247664';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const redirect = (statut: string) => new Response(null, { status: 302, headers: { Location: `${SITE}/beta-merci?statut=${statut}` } });
const minutesSince = (iso?: string | null) => (iso ? (Date.now() - Date.parse(iso)) / 60_000 : Infinity);

async function setting(key: string): Promise<string | null> {
  const { data } = await admin.from('app_settings').select('value').eq('key', key).maybeSingle();
  return typeof data?.value === 'string' && data.value ? data.value : null;
}

const p = (html: string) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#334155;">${html}</p>`;
const button = (label: string, url: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;"><tr><td style="background:#00D664;border-radius:999px;">
<a href="${esc(url)}" style="display:inline-block;padding:15px 28px;font-size:16px;font-weight:700;color:#0F172A;text-decoration:none;">${esc(label)} &rarr;</a></td></tr></table>`;
const steps = (items: string[]) =>
  `<ol style="margin:0 0 18px;padding-left:22px;font-size:15px;line-height:1.7;color:#334155;">${items.map((i) => `<li style="margin-bottom:6px;">${i}</li>`).join('')}</ol>`;
const h2 = (t: string) => `<h2 style="margin:26px 0 10px;font-size:18px;font-weight:800;color:#0F172A;">${esc(t)}</h2>`;

async function sendConfirmation(email: string, firstName: string | null, token: string) {
  const link = `${SUPABASE_URL}/functions/v1/beta-signup?confirm=${token}`;
  const hello = firstName ? `Bonjour ${esc(firstName)},` : 'Bonjour,';
  await sendMail(
    email,
    'Confirmez votre adresse pour tester Find My Coach',
    brandEmail(
      'Encore une étape 💚',
      p(hello) +
        p('Merci de vouloir tester Find My Coach en avant-première ! Confirmez votre adresse email pour recevoir le lien d’installation de l’app et le mode d’emploi.') +
        button('Confirmer mon adresse', link) +
        `<p style="margin:0;font-size:13px;line-height:1.6;color:#64748B;">Vous n’êtes pas à l’origine de cette demande ? Ignorez simplement cet email.</p>`,
    ),
  );
}

async function sendLinks(email: string, firstName: string | null, platform: string | null) {
  const apk = await setting('beta_apk_url');
  const testflight = await setting('beta_testflight_url');
  const hello = firstName ? `Bienvenue ${esc(firstName)} !` : 'Bienvenue !';
  const android =
    h2('📱 Sur Android') +
    (apk
      ? button('Télécharger l’app Android', apk) +
        steps([
          'Touchez le bouton ci-dessus depuis votre téléphone Android : le fichier <strong>findmycoach-latest.apk</strong> se télécharge.',
          'Ouvrez le fichier téléchargé (notification ou dossier « Téléchargements »).',
          'Si Android affiche « Installation bloquée » : touchez <strong>Paramètres</strong> → activez <strong>Autoriser depuis cette source</strong> → revenez en arrière.',
          'Touchez <strong>Installer</strong>, puis <strong>Ouvrir</strong>. C’est prêt !',
        ])
      : p('Le lien Android arrive très bientôt par email.'));
  const iphone =
    h2('🍎 Sur iPhone') +
    (testflight
      ? steps([
          `Installez l’app gratuite <strong>TestFlight</strong> d’Apple : <a href="${TESTFLIGHT_APP}" style="color:#00A84F;font-weight:700;">ouvrir l’App Store</a>.`,
          'Revenez à cet email sur votre iPhone et touchez le bouton ci-dessous.',
          'Dans TestFlight, touchez <strong>Accepter</strong> puis <strong>Installer</strong>.',
          'Find My Coach apparaît sur votre écran d’accueil. Les mises à jour arrivent automatiquement par TestFlight.',
        ]) + button('Rejoindre la bêta iPhone', testflight)
      : p('La version iPhone est en cours de validation par Apple : vous recevrez votre invitation TestFlight par email dès qu’elle est prête.'));
  const order = platform === 'ios' ? iphone + android : android + iphone;
  await sendMail(
    email,
    'Votre accès à la bêta Find My Coach 🎉',
    brandEmail(
      'Votre accès à la bêta',
      p(hello) +
        p('Votre adresse est confirmée. Voici comment installer Find My Coach — cela prend 2 minutes.') +
        order +
        h2('Et ensuite ?') +
        steps([
          'Créez votre compte (email ou Google) en choisissant « Je cherche un coach » ou « Je suis coach ».',
          'Testez librement : recherche, réservation, messages, notifications…',
          'Un bug, une idée ? Répondez à cet email, chaque retour compte !',
        ]),
    ),
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  // Validation de l'adresse (lien de l'email)
  if (req.method === 'GET') {
    const token = new URL(req.url).searchParams.get('confirm') ?? '';
    if (!/^[0-9a-f-]{36}$/i.test(token)) return redirect('invalide');
    const { data: row } = await admin.from('beta_testers').select('*').eq('token', token).maybeSingle();
    if (!row) return redirect('invalide');
    if (!row.confirmed_at) await admin.from('beta_testers').update({ confirmed_at: new Date().toISOString() }).eq('id', row.id);
    if (minutesSince(row.links_sent_at) > 10) {
      try {
        await sendLinks(row.email, row.first_name, row.platform);
        await admin.from('beta_testers').update({ links_sent_at: new Date().toISOString() }).eq('id', row.id);
      } catch (err) {
        console.error('beta links', err);
        return redirect('erreur');
      }
    }
    return redirect('ok');
  }

  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* corps vide */ }
  const email = String(body.email ?? '').trim().toLowerCase();
  const firstName = String(body.firstName ?? '').trim().slice(0, 60) || null;
  const platform = body.platform === 'ios' || body.platform === 'android' ? body.platform : null;
  const source = String(body.source ?? '').trim().slice(0, 60) || null;
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Adresse email invalide.' }, 400);

  const { data: existing } = await admin.from('beta_testers').select('*').eq('email', email).maybeSingle();
  // Toujours la même réponse (on ne révèle pas si l'adresse est déjà inscrite)
  const ok = json({ ok: true, message: 'Vérifiez votre boîte mail pour confirmer votre adresse.' });

  if (existing) {
    if (minutesSince(existing.confirm_sent_at) < 2) return ok;
    await admin.from('beta_testers').update({ first_name: firstName ?? existing.first_name, platform: platform ?? existing.platform, confirm_sent_at: new Date().toISOString() }).eq('id', existing.id);
    try { await sendConfirmation(email, firstName ?? existing.first_name, existing.token); } catch (err) { console.error('beta confirm', err); return json({ error: 'Envoi impossible pour le moment, réessayez.' }, 502); }
    return ok;
  }

  const { data: created, error } = await admin
    .from('beta_testers')
    .insert({ email, first_name: firstName, platform, source, confirm_sent_at: new Date().toISOString() })
    .select('token')
    .single();
  if (error || !created) return json({ error: 'Inscription impossible pour le moment, réessayez.' }, 500);
  try { await sendConfirmation(email, firstName, created.token); } catch (err) { console.error('beta confirm', err); return json({ error: 'Envoi impossible pour le moment, réessayez.' }, 502); }
  return ok;
});
