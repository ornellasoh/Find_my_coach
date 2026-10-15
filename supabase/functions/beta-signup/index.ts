// Inscription des bêta-testeurs (formulaire de findmycoach.io), sans compte.
//  POST { email, firstName, platform?: 'android'|'ios', role?: 'client'|'coach', source? } → envoie l'email de validation (prénom obligatoire).
//  GET  ?confirm=<jeton>  → valide l'adresse, envoie les liens d'installation + tutoriel, puis
//                           redirige vers <SITE_URL>/beta-merci (?statut=ok | invalide).
// iPhone : après confirmation, un administrateur valide la demande dans l'app (fonction beta-approve),
// ce qui ajoute le testeur au groupe TestFlight ; Apple envoie alors l'invitation.
// Android : dès la confirmation, l'adresse est ajoutée au groupe Google du test fermé Google Play.
// Anti-abus : un email de validation au plus toutes les 2 minutes par adresse ; liens renvoyés au plus toutes les 10 minutes.
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { brandEmail, escapeHtml as esc, sendMail } from '../_shared/mailer.ts';
import { button, h2, p, playSection, steps, testPlan } from '../_shared/beta.ts';
import { addToBetaGroup } from '../_shared/googleGroup.ts';

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

async function sendLinks(email: string, firstName: string | null, platform: string | null, role: string | null) {
  const play = await setting('beta_play_url');
  const apk = await setting('beta_apk_url');
  const testflight = await setting('beta_testflight_url');
  const hello = firstName ? `Bienvenue ${esc(firstName)} !` : 'Bienvenue !';
  const android =
    h2('📱 Sur Android') +
    (play
      ? playSection(play)
      : apk
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
      : p('Votre demande est bien enregistrée. Dès qu’elle est validée par notre équipe, <strong>Apple vous envoie une invitation TestFlight</strong> à cette adresse, et nous vous envoyons le mode d’emploi.') +
        p(`En attendant, vous pouvez déjà installer l’app gratuite <strong>TestFlight</strong> : <a href="${TESTFLIGHT_APP}" style="color:#00A84F;font-weight:700;">ouvrir l’App Store</a>.`));
  const order = platform === 'ios' ? iphone + android : android + iphone;
  await sendMail(
    email,
    'Votre accès à la bêta Find My Coach 🎉',
    brandEmail(
      'Votre accès à la bêta',
      p(hello) +
        p('Votre adresse est confirmée. Voici comment installer Find My Coach — cela prend 2 minutes.') +
        order +
        testPlan(role),
    ),
  );
}

/** Ajoute un testeur Android au groupe Google du test Play ; en cas d'échec, l'équipe est prévenue pour le faire à la main. */
async function addAndroidTester(row: { id: string; email: string; first_name: string | null }) {
  try {
    await addToBetaGroup(row.email);
    await admin.from('beta_testers').update({ play_group_added_at: new Date().toISOString(), play_group_error: null }).eq('id', row.id);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('beta android group', error);
    await admin.from('beta_testers').update({ play_group_error: error.slice(0, 300) }).eq('id', row.id);
    const to = Deno.env.get('BETA_NOTIFY_EMAIL') ?? Deno.env.get('SMTP_USER') ?? 'contact@findmycoach.io';
    await sendMail(
      to,
      'Testeur Android à ajouter à la main dans Google Play',
      brandEmail(
        'Ajout automatique impossible',
        p(`<strong>${esc(row.first_name ?? 'Sans prénom')}</strong> (${esc(row.email)}) a confirmé son adresse, mais son ajout au groupe des testeurs Android a échoué : ${esc(error)}.`) +
          p('Ajoutez cette adresse à la main au groupe Google des testeurs (ou dans la Play Console), sinon le lien lui affichera « application non disponible ».'),
      ),
    );
  }
}

/** Prévient l'équipe qu'une demande iPhone attend sa validation (Administration → Bêta). */
async function notifyTeam(email: string, firstName: string | null) {
  const to = Deno.env.get('BETA_NOTIFY_EMAIL') ?? Deno.env.get('SMTP_USER') ?? 'contact@findmycoach.io';
  const who = `<strong>${esc(firstName ?? 'Sans prénom')}</strong> (${esc(email)})`;
  await sendMail(
    to,
    'Nouveau testeur iPhone à valider',
    brandEmail(
      'Un testeur attend votre validation',
      p(`${who} a confirmé son adresse et souhaite tester Find My Coach sur iPhone.`) +
        p('Ouvrez l’app → Profil → Administration → <strong>Bêta</strong>, puis touchez <strong>Valider</strong> : la personne est ajoutée à TestFlight et reçoit son invitation.'),
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
    if (!row.confirmed_at) {
      await admin.from('beta_testers').update({ confirmed_at: new Date().toISOString() }).eq('id', row.id);
      try {
        if (row.platform === 'android') await addAndroidTester(row);
        else await notifyTeam(row.email, row.first_name);
      } catch (err) { console.error('beta notify', err); }
    }
    if (minutesSince(row.links_sent_at) > 10) {
      try {
        await sendLinks(row.email, row.first_name, row.platform, row.role);
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
  const firstName = String(body.firstName ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const platform = body.platform === 'ios' || body.platform === 'android' ? body.platform : null;
  const role = body.role === 'client' || body.role === 'coach' ? body.role : null;
  const source = String(body.source ?? '').trim().slice(0, 60) || null;
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Adresse email invalide.' }, 400);
  if (firstName.length < 2) return json({ error: 'Indiquez votre prénom.' }, 400);

  const { data: existing } = await admin.from('beta_testers').select('*').eq('email', email).maybeSingle();
  // Toujours la même réponse (on ne révèle pas si l'adresse est déjà inscrite)
  const ok = json({ ok: true, message: 'Vérifiez votre boîte mail pour confirmer votre adresse.' });

  if (existing) {
    if (minutesSince(existing.confirm_sent_at) < 2) return ok;
    await admin.from('beta_testers').update({ first_name: firstName, platform: platform ?? existing.platform, role: role ?? existing.role, source: existing.source ?? source, confirm_sent_at: new Date().toISOString() }).eq('id', existing.id);
    try { await sendConfirmation(email, firstName, existing.token); } catch (err) { console.error('beta confirm', err); return json({ error: 'Envoi impossible pour le moment, réessayez.' }, 502); }
    return ok;
  }

  const { data: created, error } = await admin
    .from('beta_testers')
    .insert({ email, first_name: firstName, platform, role, source, confirm_sent_at: new Date().toISOString() })
    .select('token')
    .single();
  if (error || !created) return json({ error: 'Inscription impossible pour le moment, réessayez.' }, 500);
  try { await sendConfirmation(email, firstName, created.token); } catch (err) { console.error('beta confirm', err); return json({ error: 'Envoi impossible pour le moment, réessayez.' }, 502); }
  return ok;
});
