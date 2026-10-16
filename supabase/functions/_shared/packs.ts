// Packs de séances : activation après paiement, suivi des échéances mensuelles (utilisé par le webhook et verify-pack).
import type Stripe from 'npm:stripe@17.7.0';
import { admin, notify, stripe } from './common.ts';

export const PACK_INSTALLMENTS = [1, 3, 5] as const;
export const PACK_VALIDITY_MONTHS = [1, 2, 3, 6, 12] as const;

const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',') + ' €';
const now = () => new Date().toISOString();

function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}

// deno-lint-ignore no-explicit-any
async function getPurchase(id: string | undefined | null): Promise<any | null> {
  if (!id) return null;
  const { data } = await admin.from('pack_purchases').select('*').eq('id', id).maybeSingle();
  return data;
}

/** Enregistre une échéance payée (sans doublon) et renvoie le nombre d'échéances payées. */
async function recordInstallment(purchaseId: string, stripeId: string, amount: number): Promise<number> {
  await admin.from('pack_installments').upsert({ stripe_id: stripeId, purchase_id: purchaseId, amount }, { onConflict: 'stripe_id', ignoreDuplicates: true });
  const { count } = await admin.from('pack_installments').select('stripe_id', { count: 'exact', head: true }).eq('purchase_id', purchaseId);
  return count ?? 0;
}

/** Premier paiement reçu : le pack devient utilisable, client et coach sont prévenus. Sans effet si déjà fait. */
// deno-lint-ignore no-explicit-any
async function activate(p: any, patch: Record<string, unknown>) {
  if (p.status !== 'pending') {
    if (Object.keys(patch).length) await admin.from('pack_purchases').update({ ...patch, updated_at: now() }).eq('id', p.id);
    return;
  }
  const activated = new Date();
  const months = Number(p.pack?.validityMonths) || 6;
  const { data: updated } = await admin
    .from('pack_purchases')
    .update({ ...patch, status: 'active', activated_at: activated.toISOString(), expires_at: addMonths(activated, months).toISOString(), updated_at: now() })
    .eq('id', p.id)
    .eq('status', 'pending')
    .select('id');
  if (!updated?.length) return; // déjà activé par un autre événement

  const name = p.pack?.name ?? 'Pack de séances';
  const plan = p.installments > 1 ? ` Paiement en ${p.installments} fois : ${euros(p.installment_amount)} par mois.` : '';
  await notify(p.client_id, 'pack_purchased', 'Pack activé',
    `Votre pack « ${name} » (${p.sessions_total} séances) est prêt. Réservez vos séances depuis la fiche de votre coach.${plan}`);
  await notify(p.coach_user_id, 'pack_sold', 'Nouveau pack vendu',
    `Un client a acheté votre pack « ${name} » (${p.sessions_total} séances, ${euros(p.amount_total)}${p.installments > 1 ? ` en ${p.installments} fois` : ''}).`);
}

/** Fin de la page de paiement Stripe pour un pack (paiement unique ou premier mois de l'échéancier). */
export async function handlePackCheckout(s: Stripe.Checkout.Session): Promise<boolean> {
  const p = await getPurchase(s.metadata?.pack_purchase_id);
  if (!p) return false;
  if (s.payment_status !== 'paid') return true;

  if (s.mode === 'subscription') {
    const subId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id;
    await activate(p, { stripe_subscription_id: subId ?? null });
    // Le premier mois est payé : on l'enregistre ici aussi, au cas où « invoice.paid » arrive plus tard
    const invoiceId = typeof s.invoice === 'string' ? s.invoice : s.invoice?.id;
    if (invoiceId) await recordInstallment(p.id, invoiceId, p.installment_amount);
  } else {
    const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id;
    await activate(p, { payment_intent_id: pi ?? null });
    await recordInstallment(p.id, pi ?? s.id, s.amount_total ?? p.amount_total);
  }
  return true;
}

// deno-lint-ignore no-explicit-any
const invoiceSubscriptionId = (inv: any): string | null => {
  const sub = inv.subscription ?? inv.parent?.subscription_details?.subscription;
  return typeof sub === 'string' ? sub : sub?.id ?? null;
};

/** Retrouve l'achat lié à une facture d'échéancier (par l'abonnement Stripe). */
// deno-lint-ignore no-explicit-any
async function purchaseForInvoice(inv: Stripe.Invoice): Promise<any | null> {
  const subId = invoiceSubscriptionId(inv);
  if (!subId) return null;
  const { data } = await admin.from('pack_purchases').select('*').eq('stripe_subscription_id', subId).maybeSingle();
  if (data) return data;
  // L'événement peut arriver avant la fin de la page de paiement : on lit l'identifiant du pack sur l'abonnement
  const sub = await stripe.subscriptions.retrieve(subId);
  const p = await getPurchase(sub.metadata?.pack_purchase_id);
  if (p && !p.stripe_subscription_id) {
    await admin.from('pack_purchases').update({ stripe_subscription_id: subId, updated_at: now() }).eq('id', p.id);
    p.stripe_subscription_id = subId;
  }
  return p;
}

/** Échéance payée : on la compte ; après la dernière, l'échéancier est arrêté. */
export async function handleInvoicePaid(inv: Stripe.Invoice) {
  const p = await purchaseForInvoice(inv);
  if (!p) return;
  if (p.status === 'pending') await activate(p, {});
  const paid = await recordInstallment(p.id, inv.id!, inv.amount_paid ?? p.installment_amount);
  // Date du prochain prélèvement (fin de la période payée), pour le rappel 3 jours avant
  const periodEnd = inv.lines?.data?.[0]?.period?.end;
  if (paid < p.installments && periodEnd) {
    await admin.from('pack_purchases').update({ next_payment_at: new Date(periodEnd * 1000).toISOString(), updated_at: now() }).eq('id', p.id);
  }
  if (p.status === 'past_due') {
    await admin.from('pack_purchases').update({ status: 'active', updated_at: now() }).eq('id', p.id);
    await notify(p.coach_user_id, 'pack_payment', 'Échéance réglée', `L'échéance en retard du pack « ${p.pack?.name ?? ''} » a été payée.`);
  }
  if (paid >= p.installments && p.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(p.stripe_subscription_id, { invoice_now: false, prorate: false });
    } catch (err) {
      console.error('arrêt échéancier', p.id, err);
    }
    // Une seule fois, même si Stripe renvoie l'événement
    const { data: done } = await admin.from('pack_purchases')
      .update({ next_payment_at: null, fully_paid_at: now(), updated_at: now() })
      .eq('id', p.id).is('fully_paid_at', null).select('id');
    if (done?.length) {
      const name = p.pack?.name ?? '';
      await notify(p.client_id, 'pack_paid', 'Pack entièrement réglé',
        `Votre dernière mensualité pour le pack « ${name} » est payée : plus aucun prélèvement. Merci !`);
      await notify(p.coach_user_id, 'pack_paid', 'Pack entièrement réglé',
        `Les ${p.installments} mensualités du pack « ${name} » ont toutes été payées (${euros(p.amount_total)} au total).`);
    }
  }
}

/** Échéance refusée (carte expirée, solde insuffisant…) : Stripe réessaie ; en attendant, pas de nouvelle réservation. */
export async function handleInvoiceFailed(inv: Stripe.Invoice) {
  const p = await purchaseForInvoice(inv);
  if (!p || p.status === 'pending') return; // premier paiement : la page Stripe affiche déjà l'erreur
  await admin.from('pack_purchases').update({ status: 'past_due', updated_at: now() }).eq('id', p.id);
  await notify(p.client_id, 'pack_payment_failed', 'Échéance non prélevée',
    `Le prélèvement de ${euros(inv.amount_due ?? p.installment_amount)} pour votre pack « ${p.pack?.name ?? ''} » a échoué. ` +
    "Réglez-la avec le bouton ci-dessous, ou Stripe réessaiera dans quelques jours ; d'ici là, vous ne pouvez plus réserver avec ce pack.",
    undefined, inv.hosted_invoice_url ? { label: 'Régler l’échéance', url: inv.hosted_invoice_url } : undefined);
  await notify(p.coach_user_id, 'pack_payment_failed', 'Échéance impayée',
    `Le prélèvement de ${euros(inv.amount_due ?? p.installment_amount)} pour le pack « ${p.pack?.name ?? ''} » d'un client a échoué. Stripe va réessayer.`);
}

/** Échéancier arrêté : normal après la dernière échéance ; sinon, impayé définitif. */
export async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const { data: p } = await admin.from('pack_purchases').select('*').eq('stripe_subscription_id', sub.id).maybeSingle();
  if (!p) return;
  const { count } = await admin.from('pack_installments').select('stripe_id', { count: 'exact', head: true }).eq('purchase_id', p.id);
  if ((count ?? 0) >= p.installments) return;
  await admin.from('pack_purchases').update({ status: 'unpaid', updated_at: now() }).eq('id', p.id);
  await notify(p.client_id, 'pack_payment_failed', 'Pack suspendu',
    `Les échéances de votre pack « ${p.pack?.name ?? ''} » n'ont pas pu être prélevées. Le pack est suspendu : contactez votre coach.`);
  await notify(p.coach_user_id, 'pack_payment_failed', 'Pack impayé',
    `Le pack « ${p.pack?.name ?? ''} » d'un client est suspendu : ${count ?? 0} échéance(s) sur ${p.installments} payée(s). Contactez-le via la messagerie.`);
}
