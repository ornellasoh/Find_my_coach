// Envoi unique du lien de test Google Play (+ parcours de test) aux testeurs Android déjà confirmés.
// Ajoute d'abord chaque testeur au groupe Google du test Play (si configuré).
// Appel : select public.call_edge('beta-play-invite', '{}'::jsonb);
//   {"dryRun":true} : compte sans envoyer ; {"groupOnly":true} : ajoute au groupe tous les testeurs Android confirmés, sans email.
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { brandEmail, escapeHtml as esc, sendMail } from '../_shared/mailer.ts';
import { h2, p, playSection, testPlan } from '../_shared/beta.ts';
import { addToBetaGroup, betaGroupEmail } from '../_shared/googleGroup.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  const secret = req.headers.get('x-internal-secret');
  const { data: allowed } = secret ? await admin.rpc('internal_secret_ok', { s: secret }) : { data: false };
  if (allowed !== true) return json({ error: 'Accès refusé' }, 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* corps vide */ }
  const { data: setting } = await admin.from('app_settings').select('value').eq('key', 'beta_play_url').maybeSingle();
  const playUrl = typeof setting?.value === 'string' ? setting.value : null;
  if (!playUrl) return json({ error: 'Réglage beta_play_url vide' }, 400);

  let query = admin
    .from('beta_testers')
    .select('id, email, first_name, role, play_group_added_at')
    .eq('platform', 'android')
    .not('confirmed_at', 'is', null)
    .is('rejected_at', null);
  if (body.groupOnly === true) query = query.is('play_group_added_at', null);
  else query = query.is('play_invited_at', null);
  const { data: rows, error } = await query.limit(100);
  if (error) return json({ error: error.message }, 500);
  if (body.dryRun === true) return json({ toSend: rows?.length ?? 0 });

  // Ajout au groupe Google ; un échec n'empêche pas l'email (il est noté dans play_group_error)
  const groupErrors: string[] = [];
  if (betaGroupEmail()) {
    for (const row of rows ?? []) {
      if (row.play_group_added_at) continue;
      try {
        await addToBetaGroup(row.email);
        await admin.from('beta_testers').update({ play_group_added_at: new Date().toISOString(), play_group_error: null }).eq('id', row.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        groupErrors.push(`${row.email} : ${msg}`);
        await admin.from('beta_testers').update({ play_group_error: msg.slice(0, 300) }).eq('id', row.id);
      }
    }
  }
  if (body.groupOnly === true) return json({ checked: rows?.length ?? 0, groupErrors });

  let sent = 0;
  for (const row of rows ?? []) {
    // Enregistré AVANT l'envoi : jamais d'envoi en double
    await admin.from('beta_testers').update({ play_invited_at: new Date().toISOString() }).eq('id', row.id);
    try {
      await sendMail(
        row.email,
        'Find My Coach arrive sur Google Play 🎉',
        brandEmail(
          'La bêta passe par Google Play',
          p(row.first_name ? `Bonjour ${esc(row.first_name)},` : 'Bonjour,') +
            p('Merci de tester Find My Coach ! L’app Android s’installe désormais directement depuis le <strong>Google Play Store</strong> : plus de fichier à télécharger, et les mises à jour arrivent toutes seules.') +
            p('Vous aviez installé l’ancienne version (fichier APK) ? Désinstallez-la d’abord (appui long sur l’icône → Désinstaller).') +
            h2('📱 Installer l’app') +
            playSection(playUrl) +
            testPlan(row.role),
        ),
      );
      sent++;
    } catch (err) {
      console.error('beta-play-invite', err);
    }
  }
  return json({ checked: rows?.length ?? 0, sent, groupErrors });
});
