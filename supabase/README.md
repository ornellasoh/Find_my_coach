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

## Version 1 « séances » (migration `20261011000000_v1_sessions.sql`)

À appliquer **après** les migrations précédentes (SQL Editor → coller le fichier → Run). Elle est idempotente et ne supprime aucune donnée :
les adresses exactes et les justificatifs déjà présents dans les fiches sont **déplacés** dans des tables privées.

| Table | Contenu | Qui peut lire |
|---|---|---|
| booking_session_details | lien de visio (https), consignes, lieu exact | client et coach d'une séance confirmée ou effectuée, admin |
| booking_reschedules | demandes de report + historique | client et coach de la séance, admin |
| session_reports | compte rendu après la séance | client et coach de la séance, admin |
| booking_issues | signalements (absence, technique, comportement) | l'auteur et l'admin (statut modifiable par l'admin seulement) |
| coach_private | adresse et coordonnées exactes du coach | le coach lui-même, admin |
| coach_documents | justificatifs (fichiers dans le stockage privé `documents`) | le coach lui-même, admin |

Fonctions appelables par l'app (contrôles côté serveur) : `set_session_details`, `propose_reschedule`, `respond_reschedule`,
`save_session_report`, `admin_review_document`, `admin_set_coach_verification`.

Règles appliquées par la base :
- une seule séance confirmée par créneau (index unique + verrou en cas de demandes simultanées) ;
- le client ne peut modifier ni l'horaire, ni le prix, ni le statut de paiement d'une réservation ;
- report : même coach, même séance, même prix, accord de l'autre participant, au moins `reschedule_min_hours` (24 h, table `app_settings`) avant la séance ;
- badge « Vérifié » et « Élite » : modifiables uniquement par un admin.

Fonction serveur ajoutée : `notify-dispatch` (envoi push + email des notifications créées par la base) — à déployer **sans vérification JWT** (comme `send-reminders`).
Fonctions modifiées : `create-checkout`, `stripe-webhook` / `verify-payment` (via `_shared/confirm.ts`), `send-reminders`, `_shared/common.ts`.

Tests (base PostgreSQL locale jetable, jamais la production) : `PGHOST=… PGPORT=… PGUSER=postgres bash supabase/tests/run_local.sh`
