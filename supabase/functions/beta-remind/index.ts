// Relance des bêta-testeurs qui n'ont pas confirmé leur adresse (appelée chaque matin par une tâche planifiée de la base).
// Une seule relance par personne : entre 24 h et 14 jours après l'inscription.
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { brandEmail, escapeHtml as esc, sendMail } from '../_shared/mailer.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const p = (html: string) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#334155;">${html}</p>`;
const button = (label: string, url: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;"><tr><td style="background:#00D664;border-radius:999px;">
<a href="${esc(url)}" style="display:inline-block;padding:15px 28px;font-size:16px;font-weight:700;color:#0F172A;text-decoration:none;">${esc(label)} &rarr;</a></td></tr></table>`;

Deno.serve(async (req) => {
  const secret = req.headers.get('x-internal-secret');
  const { data: allowed } = secret ? await admin.rpc('internal_secret_ok', { s: secret }) : { data: false };
  if (allowed !== true) return json({ error: 'Accès refusé' }, 401);

  const now = Date.now();
  const { data: rows, error } = await admin
    .from('beta_testers')
    .select('id, email, first_name, token')
    .is('confirmed_at', null)
    .is('reminder_sent_at', null)
    .is('rejected_at', null)
    .lte('created_at', new Date(now - 24 * 3_600_000).toISOString())
    .gte('created_at', new Date(now - 14 * 86_400_000).toISOString())
    .limit(50);
  if (error) return json({ error: error.message }, 500);

  let sent = 0;
  for (const row of rows ?? []) {
    // Enregistré AVANT l'envoi : jamais de relance en double
    await admin.from('beta_testers').update({ reminder_sent_at: new Date().toISOString() }).eq('id', row.id);
    try {
      await sendMail(
        row.email,
        'Plus qu’un clic pour tester Find My Coach',
        brandEmail(
          'Votre accès vous attend 💚',
          p(row.first_name ? `Bonjour ${esc(row.first_name)},` : 'Bonjour,') +
            p('Vous avez demandé à tester Find My Coach en avant-première, mais votre adresse email n’est pas encore confirmée. Un clic suffit pour recevoir l’app et le mode d’emploi.') +
            button('Confirmer mon adresse', `${SUPABASE_URL}/functions/v1/beta-signup?confirm=${row.token}`) +
            `<p style="margin:0;font-size:13px;line-height:1.6;color:#64748B;">Vous avez changé d’avis ? Ignorez cet email, nous ne vous relancerons plus.</p>`,
        ),
      );
      sent++;
    } catch (err) {
      console.error('beta-remind', err);
    }
  }
  return json({ checked: rows?.length ?? 0, sent });
});
