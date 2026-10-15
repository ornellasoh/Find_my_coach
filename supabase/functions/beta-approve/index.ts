// Validation des bêta-testeurs par un administrateur (écran Administration → Bêta).
//  POST { action: 'check' }                → vérifie les clés App Store Connect et le groupe TestFlight
//  POST { action: 'check-android' }        → vérifie l'accès au groupe Google des testeurs Android
//  POST { action: 'approve', id }          → ajoute le testeur au groupe TestFlight (Apple envoie l'invitation)
//                                            puis lui envoie le mode d'emploi
//  POST { action: 'reject', id }           → écarte la demande (aucun email envoyé)
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { addTestFlightTester, appStoreConfigured, checkAppStore } from '../_shared/appstore.ts';
import { brandEmail, escapeHtml as esc, sendMail } from '../_shared/mailer.ts';
import { checkBetaGroup } from '../_shared/googleGroup.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function getUser(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user ?? null;
}
/** Administrateur ? (table protégée admin_users, jamais le rôle du profil) */
async function isAdminUser(userId: string): Promise<boolean> {
  const { data } = await admin.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
  return !!data;
}

const TESTFLIGHT_APP = 'https://apps.apple.com/app/testflight/id899247664';
const NOT_CONFIGURED = 'Clés App Store Connect manquantes (ASC_ISSUER_ID, ASC_KEY_ID, ASC_PRIVATE_KEY) : voir docs/beta-configuration.md.';

const p = (html: string) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#334155;">${html}</p>`;
const steps = (items: string[]) =>
  `<ol style="margin:0 0 18px;padding-left:22px;font-size:15px;line-height:1.7;color:#334155;">${items.map((i) => `<li style="margin-bottom:6px;">${i}</li>`).join('')}</ol>`;

async function sendTutorial(email: string, firstName: string | null) {
  await sendMail(
    email,
    'Votre invitation TestFlight Find My Coach arrive 🍎',
    brandEmail(
      'Vous êtes sur la liste !',
      p(firstName ? `Bonne nouvelle ${esc(firstName)},` : 'Bonne nouvelle,') +
        p('Votre accès à la bêta iPhone de Find My Coach est validé. Apple vous envoie une invitation à cette même adresse. Voici comment installer l’app :') +
        steps([
          `Sur votre iPhone, installez l’app gratuite <strong>TestFlight</strong> d’Apple : <a href="${TESTFLIGHT_APP}" style="color:#00A84F;font-weight:700;">ouvrir l’App Store</a>.`,
          'Ouvrez l’email envoyé par <strong>TestFlight</strong> (expéditeur Apple, pensez à vérifier les indésirables) et touchez <strong>View in TestFlight</strong>.',
          'Dans TestFlight, touchez <strong>Accepter</strong> puis <strong>Installer</strong>.',
          'Find My Coach apparaît sur votre écran d’accueil. Les mises à jour arrivent automatiquement par TestFlight.',
        ]) +
        p('L’email d’Apple peut mettre quelques minutes à arriver. Un bug, une idée ? Répondez à cet email, chaque retour compte !'),
    ),
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Non connecté' }, 401);
    if (!(await isAdminUser(user.id))) return json({ error: 'Réservé aux administrateurs.' }, 403);
    const { action, id } = await req.json();

    if (action === 'check') {
      if (!appStoreConfigured()) return json({ configured: false, error: NOT_CONFIGURED });
      try {
        return json({ configured: true, ...(await checkAppStore()) });
      } catch (err) {
        return json({ configured: false, error: (err as Error).message });
      }
    }

    if (action === 'check-android') {
      try {
        return json({ configured: true, group: await checkBetaGroup() });
      } catch (err) {
        return json({ configured: false, error: `Ajout automatique Android inactif : ${(err as Error).message}.` });
      }
    }

    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Testeur introuvable' }, 404);
    const { data: row } = await admin.from('beta_testers').select('*').eq('id', id).maybeSingle();
    if (!row) return json({ error: 'Testeur introuvable' }, 404);

    if (action === 'reject') {
      await admin.from('beta_testers').update({ rejected_at: new Date().toISOString() }).eq('id', id);
      return json({ ok: true });
    }
    if (action !== 'approve') return json({ error: 'Action inconnue' }, 400);

    if (!row.confirmed_at) return json({ error: 'Cette personne n’a pas encore confirmé son adresse email.' }, 409);
    if (!appStoreConfigured()) return json({ error: NOT_CONFIGURED }, 503);

    let group: string;
    try {
      ({ group } = await addTestFlightTester(row.email, row.first_name));
    } catch (err) {
      const message = (err as Error).message.slice(0, 500);
      console.error('beta-approve testflight', message);
      await admin.from('beta_testers').update({ testflight_error: message }).eq('id', id);
      return json({ error: message }, 502);
    }

    const now = new Date().toISOString();
    await admin.from('beta_testers')
      .update({ approved_at: row.approved_at ?? now, approved_by: user.id, rejected_at: null, testflight_invited_at: now, testflight_error: null })
      .eq('id', id);

    let mailed = true;
    try { await sendTutorial(row.email, row.first_name); } catch (err) { mailed = false; console.error('beta-approve mail', err); }
    return json({ ok: true, group, mailed });
  } catch (err) {
    console.error('beta-approve', err);
    return json({ error: 'Validation impossible pour le moment.' }, 500);
  }
});
