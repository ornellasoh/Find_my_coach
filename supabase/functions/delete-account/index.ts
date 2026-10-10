// Suppression définitive du compte (exigée par l'App Store et Google Play).
// - Refusée s'il reste des séances à venir (à annuler d'abord, pour rembourser les clients).
// - Supprime : profil, fiche coach et créneaux, favoris, objectifs, notifications, messages,
//   programmes, appareils push, photos et documents, puis le compte de connexion.
// - Conserve les réservations et paiements passés (obligation comptable), anonymisés.
import { admin, corsHeaders, getUser, json } from '../_shared/common.ts';

const ANON = 'Utilisateur supprimé';

async function removeFolder(bucket: string, folder: string) {
  const { data } = await admin.storage.from(bucket).list(folder, { limit: 1000 });
  const paths = (data ?? []).map((f) => `${folder}/${f.name}`);
  if (paths.length) await admin.storage.from(bucket).remove(paths);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: 'Non connecté' }, 401);
    const { confirm } = await req.json().catch(() => ({}));
    if (confirm !== 'SUPPRIMER') return json({ error: 'Confirmation manquante' }, 400);
    const uid = user.id;

    // Séances à venir (client ou coach) : à annuler avant de supprimer le compte
    const today = new Date().toISOString().slice(0, 10);
    const { data: upcoming } = await admin
      .from('bookings')
      .select('id')
      .eq('status', 'confirmed')
      .gte('date', today)
      .or(`client_id.eq.${uid},coach_user_id.eq.${uid}`);
    if (upcoming?.length) {
      return json({
        error: `Vous avez ${upcoming.length} séance(s) à venir. Annulez-les d'abord (vos clients ou vous serez remboursés), puis supprimez votre compte.`,
      }, 409);
    }

    // Réservations passées : on garde la trace comptable mais sans données personnelles
    const { data: mine } = await admin.from('bookings').select('id, client_id, status, data').or(`client_id.eq.${uid},coach_user_id.eq.${uid}`);
    for (const b of mine ?? []) {
      const d = { ...(b.data ?? {}) };
      if (b.client_id === uid) {
        Object.assign(d, { clientName: ANON, clientEmail: null, clientPhone: null, clientAddress: null, clientAvatar: null, notes: null });
      } else {
        Object.assign(d, { coachName: ANON, coachPhoto: null });
      }
      await admin.from('bookings').update({ data: d, ...(b.status === 'pending' ? { status: 'cancelled' } : {}) }).eq('id', b.id);
    }

    // Avis laissés : conservés pour la note du coach, mais anonymes
    const { data: reviews } = await admin.from('reviews').select('id, data').eq('client_id', uid);
    for (const r of reviews ?? []) {
      await admin.from('reviews').update({ data: { ...r.data, clientName: ANON, clientAvatar: null } }).eq('id', r.id);
    }

    // Fiche coach (créneaux et compte Stripe Connect supprimés en cascade)
    await admin.from('coaches').delete().eq('user_id', uid);

    await Promise.all([
      admin.from('push_tokens').delete().eq('user_id', uid),
      admin.from('favorites').delete().eq('user_id', uid),
      admin.from('goals').delete().eq('user_id', uid),
      admin.from('notifications').delete().eq('user_id', uid),
      admin.from('workout_programs').delete().eq('client_id', uid),
      admin.from('messages').delete().or(`sender_id.eq.${uid},recipient_id.eq.${uid}`),
      removeFolder('avatars', uid),
      removeFolder('documents', uid),
    ]);

    await admin.from('profiles').delete().eq('id', uid);
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) throw error;

    return json({ deleted: true });
  } catch (err) {
    console.error('delete-account', err);
    return json({ error: 'La suppression a échoué. Écrivez-nous à contact@findmycoach.io.' }, 500);
  }
});
