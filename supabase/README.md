# Supabase — Find My Coach

## 1. Créer les tables (une seule fois)
Supabase → ton projet → **SQL Editor** → New query → coller le contenu de
`migrations/20261008000000_init.sql` → **Run**.

## 2. (Optionnel) Coachs de démonstration
Même chose avec `seed.sql` : 8 coachs vitrines + quelques avis, pour que l'app ne soit pas vide au lancement.
Les supprimer plus tard : `delete from coaches where user_id like 'user-coach-%';`

## 3. Brancher l'app
Project Settings → **API** : copier **Project URL** et la clé **anon public**, puis :
- `.env.local` (web) et `.env.mobile` (app) : `VITE_SUPABASE_URL=…` et `VITE_SUPABASE_ANON_KEY=…`
- GitHub → Settings → Secrets and variables → Actions → **Variables** : mêmes noms (pour l'APK).

⚠️ Ne jamais mettre la clé `service_role` dans l'app.

## 4. Réglages conseillés
- **Authentication → Providers → Email** : pendant les tests, tu peux désactiver « Confirm email » pour se connecter sans valider le mail.
- **Authentication → URL Configuration** : mettre l'adresse de ton site (lien des emails de réinitialisation).
- Devenir **admin** : Table Editor → `profiles` → passer `role` à `admin` sur ton compte.

## Tables
| Table | Contenu | Qui peut lire |
|---|---|---|
| profiles | comptes (client / coach / admin) | utilisateurs connectés |
| coaches | fiches coach | tout le monde (coachs actifs) |
| availabilities | créneaux | tout le monde |
| bookings | réservations | le client, le coach concerné, l'admin |
| reviews | avis | tout le monde (sauf masqués) |
| favorites, goals | favoris, objectifs | leur propriétaire |
| notifications | notifications | le destinataire |
| messages | messagerie client ↔ coach (temps réel) | les 2 interlocuteurs |
| workout_programs | programmes d'entraînement | le client et son coach |

## Paiements Stripe
Fonctions serveur (`supabase/functions`, déjà déployées) :
| Fonction | Rôle |
|---|---|
| `create-checkout` | crée la page de paiement Stripe d'une réservation (prix recalculé côté serveur) |
| `stripe-webhook` | reçoit les événements Stripe : paiement réussi/expiré/remboursé, compte coach validé |
| `connect-onboarding` | inscription Stripe du coach (identité + IBAN) ou accès à son tableau de bord |
| `payment-return` | page « vous pouvez revenir dans l'app » après paiement sur mobile |

Secrets à définir (Edge Functions → Secrets) : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, et plus tard `SITE_URL`.
Commission : 15 % de la séance + frais de service (4,50 €) + taxes, prélevés automatiquement via Stripe Connect.
