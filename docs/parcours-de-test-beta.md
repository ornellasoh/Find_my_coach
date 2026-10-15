# Parcours de test de la bêta

Envoyé automatiquement dans l'email « Votre accès à la bêta » après confirmation de l'adresse sur
findmycoach.io/beta, selon le profil choisi (client, coach, ou les deux si non renseigné).
Source du texte : `supabase/functions/_shared/beta.ts` (`testPlan`).

## Client (15 min)
1. Inscription « Je cherche un coach » (email, Google ou Apple), photo et objectif.
2. Recherche par discipline, ville ou carte ; fiche coach ; favoris.
3. Réservation et paiement avec la carte de test `4242 4242 4242 4242` (Stripe en mode test).
4. Séance dans l'agenda, ajout au calendrier du téléphone, message au coach.
5. Notification et email de confirmation reçus.
6. Annulation et message de remboursement.
7. Profil : thème clair / sombre, badges, informations.

## Coach (20 min)
1. Inscription « Je suis coach ».
2. Fiche : photo, disciplines, tarifs, lieux, présentation ; jauge de progression.
3. Disponibilités sur les prochains jours.
4. « Activer les paiements » (jusqu'avant les informations bancaires).
5. Lien coach personnel ouvert sur un autre téléphone.
6. Réservation par un proche ou un second compte ; réponse au message ; planning et tableau de bord.

## Retours
Par réponse à l'email (capture d'écran + modèle de téléphone). À noter pour la version 1.0.1.
