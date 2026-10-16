# Find My Coach

**Your Coach Anytime, Anywhere.** Marketplace mobile qui met en relation des clients et des coachs
(sport, nutrition, bien-être) : recherche, réservation, paiement, messagerie, suivi des progrès.

- App **React 19 + Vite + Tailwind 4**, packagée en app native **iOS et Android** avec **Capacitor 7**
- Back-end **Supabase** (Auth, Postgres + RLS, Storage, Edge Functions, Realtime, tâches planifiées)
- Paiements **Stripe** (Checkout + Connect, commission plateforme)
- Identifiant de l'app : `io.findmycoach.app` · Site : [findmycoach.io](https://findmycoach.io)

---

## Fonctionnalités

**Clients** — recherche de coachs (discipline, ville, prix, note, carte), fiche coach, réservation
de créneaux (domicile, salle, extérieur, visio), paiement sécurisé, annulation avec remboursement
automatique, messagerie (pastille des messages non lus), notifications et rappels, ajout de la séance
au calendrier (iPhone, Android, web), photo de profil, objectifs, badges et série de semaines, avis, favoris.

**Coachs** — fiche publique avec photo, disponibilités, planning et clients, encaissement via
Stripe Connect (versement automatique), annulation (client remboursé), tableau de bord, lien coach
personnel avec statistiques, progression du profil, demande d'avis après la séance.

**Pour tous** — inscription client / coach, emails de bienvenue et de service, mode clair / sombre /
automatique, connexion Apple / Google, carte Apple Plans (secours OpenStreetMap), clôture automatique
des séances 2 h après la fin, suppression du compte dans l'app.

**Bêta** — inscription sur findmycoach.io (prénom, client ou coach, Android ou iPhone), email de
validation, envoi du lien APK ou ajout automatique à TestFlight après validation, relance des testeurs.

---

## Démarrer en local

```bash
npm install
cp .env.example .env.local        # renseigner les variables (voir ci-dessous)
npx vite --host 127.0.0.1 --port 3000
```
Ouvrir http://127.0.0.1:3000 (Safari : utiliser 127.0.0.1 plutôt que localhost).

Vérifier le typage : `npm run lint`

### Variables d'environnement (clés publiques uniquement)

| Variable | Rôle |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Projet Supabase. Sans elles, l'app tourne en **mode démo** (données d'exemple locales). |
| `VITE_MAPTILER_KEY` | Fond de carte MapTiler (facultatif, sinon OpenStreetMap). |
| `VITE_PUSH_ENABLED` | `true` une fois Firebase configuré (voir *Notifications push*). |

`.env.mobile` (versionné) contient les valeurs utilisées pour les builds mobiles.
**Aucune clé secrète** (Stripe `sk_`, `service_role`, mots de passe) ne doit être dans l'app ou le dépôt.

---

## Structure

```
src/
  components/client|coach|admin|common   écrans
  components/ui/fmc.tsx                  composants de la charte
  context/AppContext.tsx                 état de l'app, synchronisation Supabase
  lib/supabase.ts remote.ts              connexion et synchronisation des données
  lib/payments.ts                        Stripe (paiement, annulation, vérification)
  lib/push.ts photos.ts                  notifications push, envoi de photos
  native.ts                              barre d'état, bouton retour Android
supabase/
  migrations/                            schéma, sécurité (RLS), déclencheurs
  functions/                             fonctions serveur (voir ci-dessous)
android/  ios/                           projets natifs Capacitor
resources/                               icône et splash (sources)
store/                                   visuels App Store et Google Play
.github/workflows/                       builds Android automatiques
```

---

## Supabase

Projet **FindMyCoach** (région Paris), organisation Find My Coach. Schéma dans `supabase/migrations/`.

- **Tables** : profiles, coaches, availabilities, bookings (+ vue `booked_slots`), reviews, favorites,
  notifications, goals, workout_programs, messages, stripe_accounts, payments, push_tokens
- **Sécurité** : RLS sur toutes les tables ; seul le serveur peut confirmer un paiement ou annuler
  une séance payée ; un coach ne peut pas se réserver lui-même.
- **Stockage** : `avatars` (photos), `documents` (privé), `downloads` (APK public, logo des emails)
- **Tâche planifiée** : rappels de séance toutes les 15 minutes (pg_cron)

### Fonctions serveur (`supabase/functions/`)

| Fonction | Rôle |
|---|---|
| `create-checkout` | Crée la session de paiement Stripe d'une réservation |
| `stripe-webhook` | Reçoit les événements Stripe (payé, expiré, remboursé, compte coach) |
| `verify-payment` | Vérifie un paiement directement chez Stripe (filet si le webhook tarde) |
| `cancel-booking` | Annule une séance et rembourse (client : jusqu'à 24 h avant) |
| `connect-onboarding` | Activation des paiements d'un coach (Stripe Connect Express) |
| `payment-return` | Page de retour après paiement sur mobile |
| `send-welcome` | Email de bienvenue (une seule fois) |
| `send-reminders` | Rappels la veille et 1 h avant |
| `message-push` | Notification push « nouveau message » |
| `delete-account` | Suppression définitive du compte (exigée par les stores) |

### Secrets des fonctions (Supabase → Edge Functions → Secrets)

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `SMTP_PASSWORD`
(mot de passe d'application Google de contact@findmycoach.io), `FCM_SERVICE_ACCOUNT` (push, facultatif),
`SITE_URL` (facultatif).

### Emails

Envoyés depuis **contact@findmycoach.io** (SMTP Google) : modèles d'authentification
(à coller dans Supabase → Authentication → Emails), bienvenue, confirmation, annulation, rappels.

---

## Paiements (Stripe)

- Paiement par **Stripe Checkout** ; versement automatique au coach via **Connect** (destination charges)
- Commission Find My Coach : 15 % de la séance + 4,50 € de frais de service + taxes
- Webhook : `https://<projet>.supabase.co/functions/v1/stripe-webhook`
  avec les événements `checkout.session.completed`, `checkout.session.expired`,
  `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
  `charge.refunded` (+ `account.updated` pour les comptes connectés)
- Carte de test : `4242 4242 4242 4242`, date future, CVC quelconque

---

## Notifications

- **In-app + email** : actives sans configuration supplémentaire
- **Push (Android / iPhone)** via Firebase Cloud Messaging :
  1. Projet Firebase → app Android `io.findmycoach.app` → `google-services.json` dans `android/app/`
  2. Compte de service Firebase → secret Supabase `FCM_SERVICE_ACCOUNT`
  3. `npm install @capacitor/push-notifications@^7` et `VITE_PUSH_ENABLED=true` dans `.env.mobile`
  4. iPhone : clé APNs à ajouter dans Firebase (et plugin Firebase Messaging)

Chaque utilisateur choisit email / push dans le panneau Notifications.

---

## Android

### APK de test (automatique)
À chaque push sur `main`, le workflow **Build Android APK** compile l'app :
- artefact **FindMyCoach-apk** dans l'onglet *Actions* ;
- publication de `findmycoach-latest.apk` + `version.json` dans le stockage Supabase `downloads`
  (lien de téléchargement du site), si le secret GitHub `SUPABASE_SERVICE_ROLE_KEY` est présent.

### Google Play (AAB signé)
Workflow **Android Play Store (AAB signé)** : automatique à chaque envoi sur `main`, ou manuel (*Actions → Run workflow*).
Secrets GitHub requis :

| Secret | Valeur |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -i findmycoach-upload.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | mot de passe de la clé |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | mot de passe de la clé |

Version minimale : Android 7 (SDK 24), exigée par Google Play.

**Envoi automatique vers la Play Console** (si le secret `PLAY_SERVICE_ACCOUNT_JSON` existe) :
- **à chaque envoi sur `main`** qui touche l'app (`src/`, `public/`, `android/`, dépendances, config) : AAB signé
  et publié tout de suite en **test interne**, avec la version de `package.json` et, comme nouveautés,
  la première ligne du message du commit ;
- **à la main** (*Actions → Run workflow*) : choisir la version, la piste (`internal`, `alpha` = test fermé,
  `beta`, `production` = brouillon à valider dans la Play Console) et les nouveautés.

Sans ce secret, télécharger l'artefact `.aab` et l'envoyer dans *Play Console → Tester → … → Créer une release*.

Mise en place, une seule fois :
1. Google Cloud Console (même compte que la Play Console) → créer un projet, activer **Google Play Android Developer API**.
2. *IAM → Comptes de service* → créer un compte de service → *Clés* → ajouter une clé **JSON** (fichier téléchargé).
3. Play Console → *Utilisateurs et autorisations* → inviter l'adresse du compte de service, accès à Find My Coach
   avec les droits « Publier des versions dans les pistes de test » (et « production » si besoin).
4. GitHub → *Settings → Secrets → Actions* → secret `PLAY_SERVICE_ACCOUNT_JSON` = contenu complet du fichier JSON.
   Supprimer ensuite le fichier du Mac.

La toute première version d'une app doit avoir été envoyée à la main dans la Play Console (c'est déjà fait
pour le test interne). Le numéro de version (`versionCode`) est le numéro d'exécution du workflow : il augmente tout seul.

Créer la clé une seule fois et la conserver hors du dépôt. Sans Java sur le Mac : `zsh scripts/creer-cle-android.sh`
(demande le mot de passe, crée `~/findmycoach-upload.jks` et copie sa version base64). Avec Java :
```bash
keytool -genkey -v -keystore ~/findmycoach-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

---

## iPhone (App Store)

Prérequis : Mac avec **Xcode**, **CocoaPods**, compte **Apple Developer**.
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
npm run build:mobile && npx cap sync ios
npm run assets
npx cap open ios
```
Dans Xcode : *Signing & Capabilities* → Team, Bundle ID `io.findmycoach.app` →
appareil *Any iOS Device* → **Product → Archive** → *Distribute App → App Store Connect*.
Augmenter le numéro de **Build** à chaque envoi.

---

## Visuels des stores (`store/`)

- `app-store/textes-app-store.md` : textes de la fiche, notes pour la vérification Apple, confidentialité
- `app-store/captures/` : 6 captures par format ; **1206×2622 (iPhone, obligatoire)**, 1320×2868, 1284×2778, iPad 2064×2752
- `google-play/textes-google-play.md` : fiche Play, contenu de l'application, test fermé
- `google-play.zip` : icône 512×512, bannière 1024×500, 5 captures 1080×1920 (à refaire avec les écrans actuels)

Icône et splash natifs : sources dans `resources/`, régénération avec `npm run assets`.

---

## Lancement

Suivi détaillé : [`docs/roadmap-lancement.md`](docs/roadmap-lancement.md).

**Fait (14 oct. 2026)**
- iPhone : build 1.0 (21) dans App Store Connect, fiche et captures prêtes
- Android : clé d'envoi créée, secrets GitHub en place, premier AAB signé compilé

**À faire**
- App Store : compte client de démonstration, catégorie et classification par âge, puis *Ajouter pour vérification*
- Google Play : fiche du Store, contenu de l'application, test fermé (12 testeurs pendant 14 jours si compte personnel)
- Vérifier le contenu de la page `/suppression-compte` du site
- Écrans coach/admin restants à la charte

---

## Contributeurs

- **Ornella** ([@ornellasoh](https://github.com/ornellasoh)) — fondatrice, produit et design
- **Claude** (Anthropic, via Claude Code) — développement et préparation des stores

---

© 2026 Find My Coach — contact@findmycoach.io
