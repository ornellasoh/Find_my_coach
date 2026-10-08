# FindMyCoach

Marketplace mobile-first qui met en relation clients et coachs sportifs.
App **React + Vite + Tailwind**, packagée en app native **iOS et Android** avec **Capacitor**.

## Démarrer en local (web)

```bash
npm install
cp .env.example .env.local   # puis renseigner GEMINI_API_KEY
npm run dev                  # http://localhost:3000
```

## Comment ça marche (Capacitor)

1. `npm run build:mobile` compile l'app React dans `dist/`.
2. `npx cap sync` copie `dist/` dans les projets natifs `android/` et `ios/`.
3. On ouvre le projet natif (Android Studio ou Xcode) et on lance l'app sur un téléphone.

Le code de l'app reste 100 % React : on modifie `src/`, puis on relance `npm run cap:sync`.

## Android : obtenir l'APK

**Automatiquement (GitHub)** : à chaque push sur `main`, le workflow
*Build Android APK* compile l'app. Ouvrir l'onglet **Actions** du repo → dernier
run → télécharger l'artefact **FindMyCoach-apk** → installer le `.apk` sur le téléphone
(autoriser « sources inconnues »).

**Sur ton Mac** (Android Studio installé) :

```bash
npm run android      # build + sync + ouvre Android Studio
```
Puis *Build → Build Bundle(s) / APK(s) → Build APK(s)*.
Pour le Play Store : *Build → Generate Signed App Bundle* (fichier `.aab`).

## iPhone

Nécessite **Xcode** sur Mac (App Store, gratuit) :

```bash
npm run ios          # build + sync + ouvre Xcode
```
Dans Xcode : *Signing & Capabilities* → choisir ton Apple ID (Team), brancher l'iPhone,
cliquer ▶︎. Pour TestFlight / App Store : compte Apple Developer (99 €/an) puis
*Product → Archive*.

## Agent IA (Gemini) dans l'app mobile

L'IA passe par le serveur `server.ts` (la clé Gemini ne doit jamais être dans l'app).
1. Héberger le serveur (Cloud Run, Render, Railway…) avec `GEMINI_API_KEY`.
2. Mettre son URL dans `.env.mobile` : `VITE_API_URL=https://mon-serveur.com`
   (et, pour le build GitHub, dans *Settings → Secrets and variables → Actions → Variables* : `VITE_API_URL`).
3. `npm run cap:sync`.

Sans serveur, l'Agent IA utilise ses réponses de secours intégrées.

## Icônes et splash screen

Sources dans `resources/` (`icon.png` 1024×1024, `splash.png` 2732×2732).
Régénérer les icônes natives : `npm run assets` puis `npx cap sync`.

## Identifiant de l'app

`io.findmycoach.app` (dans `capacitor.config.ts`). À choisir définitivement avant
la première publication sur les stores.
