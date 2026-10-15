# Bêta — configuration et procédures

Ce document regroupe ce qui se fait **hors du code** (consoles Supabase, Google, Apple, Firebase, GitHub).
Aucune clé ne doit être collée dans le code, dans l'app ou dans une conversation : elles se saisissent
directement dans la console concernée.

---

## 1. Administrateurs

Les droits d'administration ne dépendent plus du champ `profiles.role` (modifiable côté client autrefois)
ni d'une liste dans l'app. Ils sont lus dans la table protégée `public.admin_users` (liée à `auth.users`),
que personne ne peut modifier depuis l'app (RLS sans politique d'écriture). Toutes les vérifications
(`is_admin()`, fonctions `admin_*`, fonction `cancel-booking`, statistiques) se font côté serveur.

### Premier administrateur
Supabase → SQL Editor → exécuter, en remplaçant l'email par celui du compte **déjà inscrit dans l'app** :

```sql
insert into public.admin_users (user_id, note)
select id, 'premier admin' from auth.users where email = 'adresse@exemple.fr'
on conflict do nothing;
```

Vérifier : `select u.email, a.granted_at from public.admin_users a join auth.users u on u.id = a.user_id;`

### Administrateurs suivants
Depuis le SQL Editor, ou par un admin connecté (RPC) :

```sql
select public.admin_grant('autre.adresse@exemple.fr', 'note facultative');
select public.admin_revoke('<uuid du compte>');   -- refuse de retirer le dernier admin
```

Après l'ajout, la personne se déconnecte puis se reconnecte : la ligne « Administration » apparaît dans
Profil. Un compte ordinaire ne voit pas cette ligne et l'écran admin le renvoie à l'accueil ; les données
admin lui sont de toute façon refusées par la base.

---

## 2. Connexion Google et Apple

Le code existe (`src/lib/oauth.ts`, boutons dans l'inscription). Retour dans l'app par
`io.findmycoach.app://auth-callback` (déclaré dans `AndroidManifest.xml` et `Info.plist`).
Le profil est créé par le déclencheur `handle_new_user` (nom repris de Google/Apple, pas de photo du
fournisseur) ; un même email ne crée pas de second compte si l'option « lier les identités » de Supabase
reste activée (comportement par défaut).

**Non vérifié** : l'état des fournisseurs dans la console Supabase n'a pas pu être lu depuis l'environnement
de travail. À contrôler :

### Supabase → Authentication → URL Configuration
- Site URL : l'URL du site web (ex. `https://findmycoach.io`)
- Redirect URLs : ajouter `io.findmycoach.app://auth-callback` et l'URL du site web.

### Google
1. Google Cloud Console → APIs & Services → OAuth consent screen : type Externe, nom de l'app, email
   d'assistance, domaine autorisé `supabase.co` et votre domaine. Publier (sinon seuls les testeurs déclarés
   peuvent se connecter).
2. Credentials → Create credentials → OAuth client ID → **Web application**.
   Authorized redirect URI : `https://seftoygihefwohrioojo.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → Providers → Google : activer, coller Client ID et Client secret.

### Apple
1. developer.apple.com → Identifiers → App ID `io.findmycoach.app` : cocher **Sign in with Apple**.
2. Identifiers → **Services ID** (ex. `io.findmycoach.app.signin`) : activer Sign in with Apple,
   Domain `seftoygihefwohrioojo.supabase.co`, Return URL `https://seftoygihefwohrioojo.supabase.co/auth/v1/callback`.
3. Keys → nouvelle clé avec Sign in with Apple → télécharger le `.p8` (une seule fois).
4. Supabase → Providers → Apple : activer, Client IDs = Services ID **et** `io.findmycoach.app`,
   (Services ID actuel : `io.findmycoach.app.signin`), puis générer le secret — Supabase refuse le `.p8` brut
   (« Secret key should be a JWT ») :
   `node scripts/apple-secret.mjs ~/Downloads/AuthKey_<KeyID>.p8 io.findmycoach.app.signin <KeyID>`
   copie le secret dans le presse-papiers. Il expire tous les 6 mois (prochaine échéance : avril 2027) : relancer la commande.
   Le bouton s'affiche dans l'app grâce à `VITE_APPLE_SIGNIN=true` (`.env.mobile`).
5. Xcode → target App → Signing & Capabilities → + Sign in with Apple.
   Rappel App Store : si Google est proposé sur iPhone, Apple doit l'être aussi.

### Test à faire sur appareil
Nouveau compte Google → choix « Je cherche un coach » → retour dans l'app connecté, prénom correct,
initiales à la place de la photo. Se déconnecter, se reconnecter avec Google : même compte (pas de doublon,
vérifiable dans Supabase → Authentication → Users).

---

## 3. Notifications push

- In-app : table `notifications`, cloche de l'app. Fonctionne sans configuration.
- Push : Android via Firebase Cloud Messaging, iPhone via APNs (direct). Le jeton de l'appareil est
  enregistré pour le compte connecté (`register_push_token`) et retiré à la déconnexion ; si un autre
  compte se connecte sur le même téléphone, le jeton lui est réattribué.

### Secrets (Supabase → Edge Functions → Secrets)
| Secret | Valeur |
|---|---|
| `FCM_SERVICE_ACCOUNT` | JSON complet du compte de service Firebase (Firebase → Paramètres du projet → Comptes de service → Générer une clé privée) |
| `APNS_KEY` | contenu du fichier `.p8` (Apple Developer → Keys → clé avec « Apple Push Notifications service ») |
| `APNS_KEY_ID` | identifiant de cette clé |
| `APNS_TEAM_ID` | `242FTWP9T9` |
| `APNS_TOPIC` | `io.findmycoach.app` |
| `APNS_ENV` | `production` (TestFlight / App Store) ; `sandbox` seulement pour une app lancée depuis Xcode |

Xcode → Signing & Capabilities → + **Push Notifications** (et Background Modes → Remote notifications facultatif).
Android : `android/app/google-services.json` est déjà présent.

### Test de bout en bout
Le bouton « M'envoyer une notification de test » a été retiré de l'app (13 oct. 2026, push validé sur Android et iPhone).
Pour tester : depuis un second compte, réserver une séance ou envoyer un message au compte testé → la push arrive.

---

## 4. Rebuild de l'APK Android

Le workflow `.github/workflows/android-apk.yml` se lance à chaque `push` sur `main` (ou à la main :
GitHub → Actions → « Android APK » → Run workflow).

```bash
git add -A
git commit -m "Préparation bêta"
git push origin main
```

Il construit un APK **debug**, le joint au run (artefact `FindMyCoach-apk`, onglet Actions → run → Artifacts),
et **le publie automatiquement** dans Supabase Storage (`downloads/findmycoach-latest.apk` + `version.json`)
**uniquement si** le secret GitHub `SUPABASE_SERVICE_ROLE_KEY` est défini dans le dépôt
(cette clé reste dans GitHub, jamais dans l'app).

Équivalent local :

```bash
npm ci
npm run build:mobile
npx cap sync android
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 5. Bêta Android : test fermé Google Play et groupe Google

Le lien de test Google Play (réglage `beta_play_url` dans `app_settings`) remplace le lien APK dans l'email envoyé
après confirmation. Vider ce réglage fait revenir au lien APK.

**Ajout automatique** : dès qu'un inscrit Android confirme son adresse, `beta-signup` l'ajoute au groupe Google
`BETA_ANDROID_GROUP`, qui sert de liste de testeurs au test fermé (API Cloud Identity Groups). En cas d'échec,
l'équipe reçoit « Testeur Android à ajouter à la main dans Google Play » et l'erreur s'affiche dans
Administration → Bêta. Le test interne n'est pas utilisable ici : Google ne permet pas de modifier sa liste d'emails par API.

### À faire une seule fois
1. **Google Workspace (admin.google.com) → Groupes** : créer `beta-android@findmycoach.io`.
   Paramètres du groupe → autoriser les **membres extérieurs à l'organisation** (sinon les adresses Gmail sont refusées).
2. **Google Cloud Console**, projet Firebase de l'app → API et services → activer **Cloud Identity API**.
3. **groups.google.com** → le groupe → Membres → ajouter l'adresse du compte de service Firebase
   (champ `client_email` du secret `FMC_SERVICE_ACCOUNT`, en `…@….iam.gserviceaccount.com`) avec le rôle **Gestionnaire**.
4. **Supabase → Edge Functions → Secrets** : `BETA_ANDROID_GROUP` = `beta-android@findmycoach.io`
   (facultatif : `GOOGLE_GROUPS_SA` pour utiliser un autre compte de service que celui de Firebase).
5. **Play Console → Find My Coach → Tester → Test fermé** : créer la piste, y envoyer le build, Testeurs →
   **Groupes Google** → `beta-android@findmycoach.io`. Copier le lien d'inscription du test fermé et le mettre dans
   `beta_play_url` (Claude peut le faire).
6. Vérifier : Administration → Bêta affiche « Google Play connecté — groupe … ».
   Ajouter au groupe les testeurs déjà inscrits : `select public.call_edge('beta-play-invite', '{"groupOnly":true}'::jsonb);`

Envoi du lien aux testeurs Android déjà inscrits (une seule fois par personne, colonne `play_invited_at`) :
`select public.call_edge('beta-play-invite', '{}'::jsonb);` — avec `'{"dryRun":true}'` pour compter sans envoyer.
Fait le 14 oct. 2026 (5 testeurs, lien du test interne). Pour renvoyer le lien du test fermé, remettre
`play_invited_at` à vide pour ces testeurs puis relancer.

Parcours de test envoyé aux testeurs : `docs/parcours-de-test-beta.md`.

---

## 6. Bêta iPhone : validation et ajout automatique à TestFlight

Parcours : inscription sur findmycoach.io/beta → email de confirmation → l'équipe reçoit « Nouveau testeur iPhone à
valider » → dans l'app, **Profil → Administration → Bêta-testeurs iPhone (TestFlight) → Valider** → la fonction
`beta-approve` ajoute la personne au groupe TestFlight par l'API App Store Connect → **Apple envoie l'invitation**
et Find My Coach envoie le mode d'emploi (installer TestFlight, ouvrir l'email d'Apple, Accepter, Installer).

### À faire une seule fois
1. **App Store Connect → Apps → Find My Coach → TestFlight** : créer un groupe de **testeurs externes**
   (ex. « Bêta testeurs »), y ajouter un build et l'envoyer en *Beta App Review* (24–48 h la première fois).
   Tant qu'aucun build n'est approuvé pour le groupe, Apple n'envoie pas l'invitation (elle part dès l'approbation).
2. **App Store Connect → Utilisateurs et accès → Intégrations → API App Store Connect** : générer une clé d'équipe,
   rôle **Gestionnaire d'apps**. Noter l'**Issuer ID**, le **Key ID**, télécharger le `.p8` (une seule fois).
3. **Supabase → Edge Functions → Secrets** :

| Secret | Valeur |
|---|---|
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_ID` | Key ID |
| `ASC_PRIVATE_KEY` | contenu complet du fichier `.p8` |
| `ASC_BETA_GROUP` | (facultatif) nom exact du groupe ; sinon le premier groupe externe est utilisé |
| `BETA_NOTIFY_EMAIL` | (facultatif) adresse prévenue à chaque demande ; par défaut contact@findmycoach.io |

4. Vérifier : l'onglet Bêta de l'administration affiche « TestFlight connecté — groupe « … » ».
   Sans l'app (SQL Editor) : `select public.call_edge('testflight-check', '{}'::jsonb);` puis, quelques secondes après,
   `select content from net._http_response order by id desc limit 1;` → `{"configured":true,"group":"…"}`.

Le réglage `beta_testflight_url` (lien public TestFlight) doit rester vide : s'il est renseigné, le lien est envoyé
dès la confirmation de l'adresse, sans validation.

---

## 7. Tâches automatiques (base de données, pg_cron)

| Tâche | Fréquence | Effet |
|---|---|---|
| `fmc-reminders` | toutes les 15 min | rappels de séance (veille, 1 h avant, lien de visio manquant) |
| `fmc-review-requests` | toutes les 15 min | 2 h après la fin d'une séance marquée « effectuée » et sans avis : notification au client (une seule fois) |
| `fmc-beta-remind` | chaque jour à 9 h UTC | relance par email les bêta-testeurs inscrits depuis plus de 24 h sans adresse confirmée (une seule fois, fonction `beta-remind`) |

Suspendre une tâche : `select cron.unschedule('fmc-beta-remind');`
