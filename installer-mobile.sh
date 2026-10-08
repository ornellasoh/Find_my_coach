#!/bin/bash
# FindMyCoach — installe les dépendances, génère les apps iOS/Android et pousse sur GitHub.
# Lancer depuis le Terminal :  bash ~/Documents/FindMyCoach/installer-mobile.sh
set -e
cd "$(dirname "$0")"

command -v node >/dev/null || { echo "❌ Node.js manquant : installe-le depuis https://nodejs.org (version LTS) puis relance."; exit 1; }
command -v git  >/dev/null || { echo "❌ git manquant : lance 'xcode-select --install' puis relance."; exit 1; }

echo "▶︎ 1/5 Installation des dépendances…"
npm install

echo "▶︎ 2/5 Vérification TypeScript et build web…"
npx tsc --noEmit
npm run build:mobile

echo "▶︎ 3/5 Génération des projets natifs…"
[ -d android ] || npx cap add android
[ -d ios ] || npx cap add ios --packagemanager SPM || echo "⚠️  iOS : installe Xcode depuis l App Store puis relance ce script."

echo "▶︎ 4/5 Icônes, splash screen et synchronisation…"
npm run assets || echo "⚠️  Génération des icônes ignorée."
npx cap sync

echo "▶︎ 5/5 Envoi sur GitHub…"
[ -d .git ] || git init -b main
git add -A
git commit -m "FindMyCoach : app React + Capacitor (iOS & Android)" || true
if ! git remote get-url origin >/dev/null 2>&1; then
  if command -v gh >/dev/null; then
    gh auth status >/dev/null 2>&1 || gh auth login
    gh repo create findmycoach --private --source=. --remote=origin --push
  else
    echo ""
    echo "👉 Crée un repo vide sur https://github.com/new (nom : findmycoach, sans README),"
    read -p "   puis colle son URL ici (https://github.com/…/findmycoach.git) : " URL
    git remote add origin "$URL"
    git push -u origin main
  fi
else
  git push -u origin main
fi
echo ""
echo "✅ Terminé ! L'APK Android se compile maintenant dans l'onglet « Actions » de ton repo GitHub."
echo "   Android Studio : npm run android   |   Xcode (iPhone) : npm run ios"
