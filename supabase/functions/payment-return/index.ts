// Page de retour affichée après le paiement dans le navigateur intégré de l'app.
const MESSAGES: Record<string, string> = {
  success: '✅ Paiement confirmé !\n\nVotre séance est réservée. Fermez cette page (bouton « Terminé » / ✕) pour revenir dans Find My Coach.',
  cancelled: 'Paiement annulé.\n\nAucun montant n’a été débité. Fermez cette page pour revenir dans Find My Coach.',
  connect: '✅ Merci !\n\nVos informations Stripe ont été enregistrées. Fermez cette page pour revenir dans Find My Coach.',
};

Deno.serve((req) => {
  const status = new URL(req.url).searchParams.get('status') ?? 'success';
  return new Response(`Find My Coach\n\n${MESSAGES[status] ?? MESSAGES.success}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
});
