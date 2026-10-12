// « Nouveau message » (appelé par la base à chaque message de la messagerie) :
//  - push sur le téléphone du destinataire (si activé) ;
//  - email, seulement au premier message d'un échange (pas d'email si l'expéditeur a déjà écrit
//    à cette personne dans les 30 dernières minutes), selon ses préférences.
import { admin, isInternalCall, json } from '../_shared/common.ts';
import { pushEnabled, sendPush } from '../_shared/push.ts';
import { notificationEmail, sendMail } from '../_shared/mailer.ts';

const EMAIL_QUIET_MINUTES = 30;

Deno.serve(async (req) => {
  if (!(await isInternalCall(req))) return json({ error: 'Accès refusé' }, 401);
  const { message_id } = await req.json();

  // Verrou : un seul envoi par message
  const { data: msg } = await admin
    .from('messages')
    .update({ pushed_at: new Date().toISOString() })
    .eq('id', message_id)
    .is('pushed_at', null)
    .select('id, sender_id, recipient_id, text, created_at')
    .maybeSingle();
  if (!msg) return json({ skipped: 'déjà traité' });

  const [{ data: recipient }, { data: sender }] = await Promise.all([
    admin.from('profiles').select('name, email, notify_push, notify_email').eq('id', msg.recipient_id).maybeSingle(),
    admin.from('profiles').select('name').eq('id', msg.sender_id).maybeSingle(),
  ]);
  if (!recipient) return json({ skipped: 'destinataire introuvable' });

  const senderName = String(sender?.name ?? '').trim() || 'Un membre Find My Coach';
  const preview = String(msg.text ?? '').slice(0, 140);
  const result: Record<string, unknown> = {};

  // Push
  if (recipient.notify_push !== false && pushEnabled()) {
    const { data: tokens } = await admin.from('push_tokens').select('token, platform').eq('user_id', msg.recipient_id);
    if (tokens?.length) {
      const dead = await sendPush(tokens, senderName, preview, { type: 'message', senderId: msg.sender_id });
      if (dead.length) await admin.from('push_tokens').delete().in('token', dead);
      result.push = tokens.length - dead.length;
    }
  }

  // Email (premier message d'un échange uniquement, pour ne pas inonder la boîte mail)
  if (recipient.notify_email !== false && recipient.email) {
    const since = new Date(new Date(msg.created_at).getTime() - EMAIL_QUIET_MINUTES * 60_000).toISOString();
    const { count } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', msg.sender_id)
      .eq('recipient_id', msg.recipient_id)
      .neq('id', msg.id)
      .gte('created_at', since)
      .lte('created_at', msg.created_at);
    if (!count) {
      const prenom = String(recipient.name ?? '').trim().split(/\s+/)[0];
      try {
        await sendMail(
          recipient.email,
          `Nouveau message de ${senderName} — Find My Coach`,
          notificationEmail({
            prenom,
            title: `Nouveau message de ${senderName}`,
            message: `« ${preview}${String(msg.text ?? '').length > 140 ? '…' : ''} » — Répondez directement dans l'app Find My Coach.`,
            cta: 'Répondre dans l’app',
          }),
        );
        result.email = true;
      } catch (err) {
        console.error('message email', err);
      }
    }
  }
  return json(result);
});
