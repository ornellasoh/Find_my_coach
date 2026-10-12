// Notification de test : envoyée UNIQUEMENT aux appareils du compte qui la demande (jamais à d'autres utilisateurs).
// Renvoie un diagnostic : appareils enregistrés, services configurés, résultat par appareil.
import { admin, corsHeaders, getUser, json } from '../_shared/common.ts';
import { pushConfig, sendPushDetailed } from '../_shared/push.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Non connecté' }, 401);

    // Anti-abus : une notification de test par minute et par compte
    const since = new Date(Date.now() - 60_000).toISOString();
    const { data: recent } = await admin
      .from('notifications').select('id').eq('user_id', user.id).gte('created_at', since).eq('data->>type', 'test').limit(1);
    if (recent?.length) return json({ error: 'Patientez une minute avant un nouveau test.' }, 429);

    const title = 'Notification de test ✅';
    const message = 'Si vous lisez ceci sur votre téléphone, les notifications push fonctionnent.';
    const id = `notif-${Date.now()}-test`;
    await admin.from('notifications').insert({
      id, user_id: user.id, read: false,
      data: { id, userId: user.id, type: 'test', title, message, read: false, createdAt: new Date().toISOString() },
    });

    const { data: profile } = await admin.from('profiles').select('notify_push').eq('id', user.id).maybeSingle();
    const { data: devices } = await admin.from('push_tokens').select('token, platform, updated_at').eq('user_id', user.id);
    const config = pushConfig();
    if (profile?.notify_push === false) {
      return json({ inApp: true, devices: devices?.length ?? 0, config, results: [], note: 'Notifications push désactivées dans vos préférences.' });
    }
    if (!devices?.length) {
      return json({ inApp: true, devices: 0, config, results: [], note: 'Aucun téléphone enregistré pour ce compte : ouvrez l’app sur le téléphone et acceptez les notifications.' });
    }
    // Petit délai : laisse le temps de mettre l'app en arrière-plan pour voir la notification système
    await new Promise((r) => setTimeout(r, 6000));
    const { dead, results } = await sendPushDetailed(devices, title, message, { type: 'test' });
    if (dead.length) await admin.from('push_tokens').delete().in('token', dead);
    return json({ inApp: true, devices: devices.length, config, results });
  } catch (err) {
    console.error('send-test-push', err);
    return json({ error: 'Test impossible' }, 500);
  }
});
