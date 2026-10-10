# Guide : créer une app mobile de A à Z

> Retour d'expérience Find My Coach (octobre 2026). Réutilisable pour une prochaine app.

---

## 1. La recette en un coup d'œil

| Brique | Outil choisi | Pourquoi |
|---|---|---|
| Interface | **React + Vite + Tailwind** | Un seul code pour web, iPhone et Android |
| App native | **Capacitor** | Emballe l'app web dans une vraie app iOS / Android |
| Code & builds | **GitHub** + **GitHub Actions** | Sauvegarde du code + APK compilé automatiquement à chaque push |
| Base de données, comptes | **Supabase** | Connexion, base Postgres, stockage de fichiers, fonctions serveur |
| Paiements | **Stripe** (Checkout + Connect) | Paiement par carte / Apple Pay, reversement aux prestataires |
| Emails | **Google Workspace (SMTP)** | Envoi depuis l'adresse de la marque |
| Notifications push | **Firebase Cloud Messaging** | Android et iPhone |
| Site vitrine | **Lovable** | Site + bouton de téléchargement de l'app |

**Ordre conseillé :** maquettes → app en mode démo → GitHub → Supabase (comptes + données) → paiements → emails → notifications → stores.

---

## 2. Partir d'un prototype (AI Studio, Lovable…)

- Le prototype est en général une app web React : on la garde, on la nettoie et on ajoute Capacitor.
- Garder un **mode démo** (données d'exemple) qui marche sans serveur : pratique pour tester et pour les captures des stores.
- Refaire les écrans d'après les maquettes et la **charte graphique** (couleurs, police, logo) dès le début, avec des composants réutilisables (boutons, cartes, en-têtes).

---

## 3. Capacitor (app native)

```bash
npm run build                 # compile l'app web dans dist/
npx cap add android           # une seule fois
npx cap add ios               # une seule fois (Mac + Xcode)
npx cap sync                  # copie dist/ dans les projets natifs
npx cap open android|ios      # ouvre Android Studio / Xcode
```

- Choisir l'**identifiant définitif** dès le départ (ex. `io.monapp.app`) : impossible à changer après publication.
- Icônes et splash : placer `icon.png` (1024×1024) et `splash.png` dans `resources/`, puis `npx @capacitor/assets generate --assetPath resources`.
- Prévoir : barre d'état qui suit le mode sombre, bouton retour Android, zones de sécurité (encoche).

---

## 4. GitHub

- Pousser depuis son Mac : `git add -A && git commit -m "..." && git push`
- Premier push qui échoue en « HTTP 400 » : `git config http.postBuffer 524288000`
- « nothing to commit » = tout est déjà envoyé.
- **GitHub Actions** : un fichier `.github/workflows/*.yml` compile l'APK Android à chaque push (onglet *Actions* → *Artifacts*).
- **Secrets GitHub** : *Settings → Secrets and variables → Actions → New repository secret* (onglet *Secrets*, pas *Variables*). Le nom doit être exact.

---

## 5. Pièges sur Mac

- **Ne pas mettre le projet dans iCloud** (Documents/Bureau synchronisés) : iCloud vide `node_modules` et tout plante sans message. Utiliser `~/Developer/`.
- Safari et `localhost` : lancer avec `npx vite --host 127.0.0.1 --port 3000` et ouvrir `http://127.0.0.1:3000`.
- Xcode : après l'installation, exécuter
  `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` puis `sudo xcodebuild -license accept`.
- CocoaPods : `brew install cocoapods`.
- Si `npx cap add ios` a échoué à moitié : `rm -rf ios` puis recommencer.

---

## 6. Supabase

- **Un projet par app**, dans l'organisation de l'entreprise. Un transfert d'organisation est possible (*Project Settings → General → Transfer project*) : il faut être Owner des deux organisations, et l'URL et les clés ne changent pas.
- **Clés :**
  - clé **publique** (`anon` / `sb_publishable_…`) : peut aller dans l'app ;
  - clé **service_role** : JAMAIS dans l'app, seulement dans les fonctions serveur ou les secrets GitHub.
- **RLS (Row Level Security) sur toutes les tables** : chacun ne lit et n'écrit que ses données.
- Les actions sensibles (confirmer un paiement, annuler une séance payée, supprimer un compte) passent **uniquement par une fonction serveur**, jamais directement depuis l'app.
- **Déclencheurs (triggers)** utiles : créer le profil à l'inscription, empêcher un utilisateur de modifier son rôle, empêcher un prestataire de se réserver lui-même.
- **Stockage** : un bucket public pour les photos et l'APK, un bucket privé pour les documents.
- **Tâches planifiées** (pg_cron) pour les rappels automatiques.
- **Emails d'authentification** : modèles à coller dans *Authentication → Emails → Templates* (confirmation, mot de passe oublié, lien magique, changement d'email, invitation). Logo hébergé dans le stockage public.
- Penser au lien de confirmation d'email qui doit reconnecter l'utilisateur (`detectSessionInUrl` sur le web).

---

## 7. Stripe (paiements d'une place de marché)

- **Checkout** pour payer, **Connect Express** pour reverser automatiquement au prestataire, avec une commission (`application_fee_amount`).
- Erreur « product tax code is missing » : désactiver *Managed Payments* dans la session (`managed_payments: { enabled: false }`).
- **Webhooks** :
  - créer la destination **dans le bon mode** (test ou réel) : c'est l'erreur la plus fréquente ;
  - une destination pour le compte plateforme, une pour les comptes connectés ;
  - copier le `whsec_…` de **cette** destination dans les secrets (sinon « Signature invalide ») ;
  - tester avec « Envoyer un événement test » → doit répondre 200.
- Toujours prévoir un **filet de sécurité** : l'app revérifie le paiement directement chez Stripe si le webhook tarde.
- Annulation : remboursement automatique (`refunds.create`, avec `reverse_transfer` si l'argent a été reversé).
- Carte de test : `4242 4242 4242 4242`.
- Services réalisés hors de l'app (coaching, cours…) : Stripe est accepté par Apple et Google, pas besoin d'achats intégrés.

---

## 8. Emails (Google Workspace)

- Créer un **mot de passe d'application** Google pour l'adresse d'envoi (validation en deux étapes requise).
- SMTP : `smtp.gmail.com`, port 465.
- Le mettre dans les **secrets** (Supabase), jamais dans le code ni dans une conversation.
- Emails utiles : bienvenue (une seule fois), confirmation de réservation, annulation, rappel la veille.
- Laisser l'utilisateur désactiver les emails non essentiels.

---

## 9. Notifications

- **In-app** : table `notifications` + temps réel.
- **Push** : Firebase (projet gratuit) →
  1. `google-services.json` dans `android/app/` ;
  2. compte de service Firebase dans les secrets serveur ;
  3. clé APNs pour iPhone.
- Rappels automatiques : la veille + 1 h avant.
- Préférences push / email dans l'app.

---

## 10. Fonctions à ne pas oublier (exigées par les stores)

- [ ] **Suppression du compte dans l'app** (Apple + Google) + une page web expliquant comment supprimer son compte (Google)
- [ ] **Politique de confidentialité** en ligne (URL demandée par les deux stores)
- [ ] Comptes de test pour les vérificateurs Apple / Google
- [ ] Mode clair / sombre / automatique
- [ ] Déconnexion accessible partout (y compris côté prestataire et admin)

---

## 11. Publier sur l'App Store (iPhone)

1. Compte **Apple Developer** (99 $/an), de préférence en **Organisation** (numéro D-U-N-S, à demander tôt car cela prend plusieurs jours).
2. *developer.apple.com → Identifiers* : créer l'App ID (identifiant de l'app) et cocher Push Notifications.
3. *App Store Connect → Apps → +* : créer l'app (nom, langue, identifiant, SKU).
4. Xcode :
   - *Signing & Capabilities* → Team ;
   - appareil *Any iOS Device* ;
   - **Product → Archive** → *Distribute App → App Store Connect → Upload*.
5. 15 à 30 min plus tard, choisir le **build** dans la version (section *Build → +*).
6. Fiche produit :
   - nom (30 caractères) et sous-titre (30) ;
   - texte promotionnel (170) et mots-clés (100) ;
   - description ;
   - captures **1290×2796** (iPhone 6,9") ;
   - URL de confidentialité, catégorie, classification d'âge, notes pour le vérificateur.
7. À chaque nouvel envoi : **augmenter le numéro de Build**.

---

## 12. Publier sur Google Play

1. Compte **Google Play Console** (25 $ une fois). Un compte **Personnel** exige un test fermé avec **12 testeurs pendant 14 jours** avant la production ; un compte **Organisation** (D-U-N-S) ne l'exige pas.
2. Créer une **clé d'envoi** une fois et la garder précieusement :
   `keytool -genkey -v -keystore ~/monapp-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`
3. Mettre la clé (en base64) et les mots de passe dans les secrets GitHub → un workflow produit l'**AAB signé** (le format exigé, pas l'APK).
4. Envoyer l'AAB d'abord en **test interne**.
5. Fiche :
   - icône **512×512** ;
   - bannière **1024×500** ;
   - captures **1080×1920** (ratio maximum 2:1) ;
   - formulaires *Sécurité des données*, classification, public cible, URL de confidentialité, lien de suppression de compte.

---

## 13. Distribuer l'APK avant les stores

- Le workflow GitHub envoie `app-latest.apk` + `version.json` dans un bucket public.
- Le site affiche un bouton « Télécharger pour Android » qui lit `version.json` (version, date, taille).
- Installation : autoriser « Installer des applications inconnues ».

---

## 14. Sécurité : règles d'or

- Ne jamais coller une clé secrète (`sk_…`, `whsec_…`, `service_role`, mot de passe) dans une conversation ou dans le code : la saisir directement dans Supabase ou GitHub.
- Dans le dépôt : seulement des clés publiques.
- Ne jamais versionner les fichiers de signature (`*.jks`, `*.keystore`) : les garder sur le Mac et en sauvegarde.
- RLS partout et actions sensibles côté serveur.
- Tester avec un compte « jetable » avant de publier (paiement, annulation, suppression de compte).

---

## 15. Checklist d'une nouvelle app

- [ ] Nom, identifiant d'app, charte (logo, couleurs, police)
- [ ] Prototype → React + Capacitor, mode démo
- [ ] Dépôt GitHub + workflow APK
- [ ] Projet Supabase (organisation de l'entreprise), tables + RLS, emails d'authentification
- [ ] Inscription / connexion / mot de passe oublié / déconnexion / suppression de compte
- [ ] Paiements Stripe (si besoin) + webhooks en mode test + filet de vérification
- [ ] Emails de service + notifications + rappels
- [ ] Mode sombre
- [ ] Pages légales sur le site + bouton de téléchargement
- [ ] Comptes Apple Developer + Google Play (demander le D-U-N-S tôt)
- [ ] Visuels des stores (captures, icône, bannière) + textes
- [ ] Comptes de test pour les vérificateurs
- [ ] Passage de Stripe en mode réel avant le lancement
