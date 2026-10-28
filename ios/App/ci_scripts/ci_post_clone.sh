#!/bin/sh
# Xcode Cloud : prépare le projet après le clonage du dépôt.
# Le dépôt ne contient ni node_modules, ni l'app web compilée, ni les Pods (ignorés par git) :
# on les recrée ici, sinon Xcode ne trouve pas « Pods-App.release.xcconfig ».
set -e

export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1

echo "▶ Installation de Node.js et CocoaPods"
command -v node >/dev/null 2>&1 || brew install node
command -v pod  >/dev/null 2>&1 || brew install cocoapods

cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "▶ Dépendances JavaScript"
npm ci

echo "▶ Vérifications iOS (pages Google, Apple, paiement visibles)"
sh scripts/check-ios.sh

echo "▶ Compilation de l'app (mode mobile, .env.mobile)"
npm run build:mobile

echo "▶ Copie dans le projet iOS + pod install"
npx cap sync ios

echo "✅ Projet prêt pour Xcode Cloud"
