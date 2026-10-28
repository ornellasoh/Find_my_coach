#!/bin/sh
# Garde-fou avant chaque build iOS (Xcode Cloud et sur le Mac : npm run check:ios).
# Arrête le build si une page Google / Apple / Stripe / visio risque de ne pas s'afficher sur iPhone,
# comme du 20 au 28 octobre 2026 (fenêtre invisible depuis le passage aux scènes d'iOS 27).
set -e
cd "$(dirname "$0")/.."
fail=0

# 1. Correctif Capacitor appliqué (patches/@capacitor+ios+*.patch, via « postinstall »)
if grep -q "UIWindow.init(frame: UIScreen.main.bounds)" node_modules/@capacitor/ios/Capacitor/Capacitor/CapacitorBridge.swift; then
  echo "❌ Correctif Capacitor absent : les pages en plein écran seraient invisibles sur iPhone (npx patch-package)."
  fail=1
fi

# 2. Toutes les pages externes passent par openInApp (repli sur Safari si la page ne s'affiche pas)
direct=$(grep -rn "Browser.open(" src --include=*.ts --include=*.tsx | grep -v "src/lib/inAppBrowser.ts" || true)
if [ -n "$direct" ]; then
  echo "❌ Browser.open utilisé directement (utiliser openInApp de src/lib/inAppBrowser.ts) :"
  echo "$direct"
  fail=1
fi

# 3. Cycle de vie par scènes toujours déclaré (sinon iOS 27 ferme l'app au lancement)
if ! grep -q "UIApplicationSceneManifest" ios/App/App/Info.plist; then
  echo "❌ UIApplicationSceneManifest manquant dans Info.plist."
  fail=1
fi

[ "$fail" -eq 0 ] && echo "✅ Vérifications iOS OK"
exit "$fail"
