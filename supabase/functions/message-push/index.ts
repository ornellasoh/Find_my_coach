// Push « nouveau message » (appelé par la base à chaque message de la messagerie).
import { admin, isInternalCall, json } from '../_shared/common.ts';
import { pushEnabled, sendPush } from '../_shared/push.ts';

Deno.serve(async (req) => {
  if (!(await isInternalCall(req))) return json({ error: 'Accès refusé' }, 401);
  if (!pushEnabled()) return json({ skipped: 'push non configuré' });
  const { message_id } = await req.json();

  // Verrou : un seul push par message
  const { data: msg } = await admin
    .from('messages')
    .update({ pushed_at: new Date().toISOString() })
    .eq('id', message_id)
    .is('pushed_at', null)
    .select('sender_id, recipient_id, text')
    .maybeSingle();
  if (!msg) return json({ skipped: 'déjà traité' });

  const [{ data: recipient }, { data: sender }, { data: tokens }] = await Promise.all([
    admin.from('profiles').select('notify_push').eq('id', msg.recipient_id).maybeSingle(),
    admin.from('profiles').select('name').eq('id', msg.sender_id).maybeSingle(),
    admin.from('push_tokens').select('token').eq('user_id', msg.recipient_id),
  ]);
  if (recipient?.notify_push === false || !tokens?.length) return json({ skipped: 'aucun appareil' });

  const preview = String(msg.text ?? '').slice(0, 140);
  const dead = await sendPush(tokens.map((t) => t.token), sender?.name ?? 'Nouveau message', preview, {
    type: 'message',
    senderId: msg.sender_id,
  });
  if (dead.length) await admin.from('push_tokens').delete().in('token', dead);
  return json({ sent: tokens.length - dead.length });
});
