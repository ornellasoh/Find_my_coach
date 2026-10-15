// Blocs des emails de la bêta (installation Android par Google Play, parcours de test client / coach).
import { escapeHtml as esc } from './mailer.ts';

export const p = (html: string) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#334155;">${html}</p>`;
export const button = (label: string, url: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;"><tr><td style="background:#00D664;border-radius:999px;">
<a href="${esc(url)}" style="display:inline-block;padding:15px 28px;font-size:16px;font-weight:700;color:#0F172A;text-decoration:none;">${esc(label)} &rarr;</a></td></tr></table>`;
export const steps = (items: string[]) =>
  `<ol style="margin:0 0 18px;padding-left:22px;font-size:15px;line-height:1.7;color:#334155;">${items.map((i) => `<li style="margin-bottom:6px;">${i}</li>`).join('')}</ol>`;
export const h2 = (t: string) => `<h2 style="margin:26px 0 10px;font-size:18px;font-weight:800;color:#0F172A;">${esc(t)}</h2>`;
const note = (html: string) => `<p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#64748B;">${html}</p>`;

/** Installation Android par le lien de test interne Google Play. */
export function playSection(playUrl: string) {
  return (
    button('Installer depuis Google Play', playUrl) +
    steps([
      'Ouvrez cet email <strong>sur votre téléphone Android</strong> et touchez le bouton ci-dessus.',
      'Vérifiez en haut de la page que c’est bien <strong>votre compte Google</strong> (celui du Play Store), puis touchez <strong>Accepter l’invitation</strong>.',
      'Touchez <strong>Télécharger sur Google Play</strong> : la fiche Find My Coach s’ouvre dans le Play Store.',
      'Touchez <strong>Installer</strong>, puis <strong>Ouvrir</strong>. Les mises à jour arrivent ensuite automatiquement par le Play Store.',
    ]) +
    note('La page indique « application non disponible » ? Nous n’avons pas encore ajouté votre compte Google à la liste des testeurs : réessayez dans quelques heures. Votre compte Google n’est pas l’adresse de cet email ? Répondez-nous en indiquant votre adresse Gmail.')
  );
}

/** Parcours de test guidé, selon le profil choisi à l'inscription (les deux si inconnu). */
export function testPlan(role: string | null) {
  const client =
    h2('🧭 Votre parcours de test — client (15 min)') +
    steps([
      '<strong>Inscription</strong> : créez votre compte (email, Google ou Apple) en choisissant « Je cherche un coach ». Ajoutez une photo et un objectif.',
      '<strong>Recherche</strong> : trouvez un coach par discipline, ville ou sur la carte. Ouvrez sa fiche, ajoutez-le à vos favoris.',
      '<strong>Réservation</strong> : choisissez un créneau et allez jusqu’au paiement avec la carte de test <strong>4242 4242 4242 4242</strong> (date future, code quelconque) — aucun débit réel.',
      '<strong>Après la réservation</strong> : retrouvez la séance dans votre agenda, ajoutez-la au calendrier du téléphone, envoyez un message au coach.',
      '<strong>Notifications</strong> : vérifiez que vous recevez la confirmation (notification et email).',
      '<strong>Annulation</strong> : annulez la séance et vérifiez le message de remboursement.',
      '<strong>Profil</strong> : changez de thème (clair / sombre), consultez vos badges, modifiez vos informations.',
    ]);
  const coach =
    h2('🧭 Votre parcours de test — coach (20 min)') +
    steps([
      '<strong>Inscription</strong> : créez votre compte en choisissant « Je suis coach ».',
      '<strong>Fiche coach</strong> : photo, disciplines, tarifs, lieux (domicile, salle, extérieur, visio), présentation. Suivez la jauge de progression du profil.',
      '<strong>Disponibilités</strong> : ouvrez quelques créneaux sur les prochains jours.',
      '<strong>Paiements</strong> : touchez « Activer les paiements » et allez aussi loin que possible (vous pouvez vous arrêter avant les informations bancaires).',
      '<strong>Votre lien</strong> : copiez votre lien coach personnel et ouvrez-le sur un autre téléphone.',
      '<strong>Réservation</strong> : demandez à un proche (ou à un second compte) de réserver chez vous, puis répondez à son message et consultez votre planning et le tableau de bord.',
    ]);
  const body = role === 'client' ? client : role === 'coach' ? coach : client + coach;
  return (
    body +
    h2('📝 Vos retours') +
    p('Répondez simplement à cet email : ce qui bloque, ce qui n’est pas clair, ce qui vous plaît. Une capture d’écran vaut mille mots ! Indiquez votre modèle de téléphone si vous trouvez un bug.')
  );
}
