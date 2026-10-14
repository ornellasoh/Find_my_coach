#!/bin/zsh
# Crée la clé d'envoi Google Play (une seule fois) et copie sa version base64 dans le presse-papiers,
# prête à coller dans le secret GitHub ANDROID_KEYSTORE_BASE64.
# Usage : zsh scripts/creer-cle-android.sh
set -euo pipefail

OUT="$HOME/findmycoach-upload.jks"
if [[ -e "$OUT" ]]; then
  echo "La clé existe déjà : $OUT (ne pas la recréer, sinon Google Play refusera les prochains envois)."
  echo "Pour recopier sa version base64 : base64 -i \"$OUT\" | pbcopy"
  exit 1
fi

read -rs "PW?Choisis un mot de passe pour la clé (8 caractères minimum) : "; echo
read -rs "PW2?Retape-le : "; echo
if [[ "$PW" != "$PW2" ]]; then echo "Les deux mots de passe ne correspondent pas."; exit 1; fi
if (( ${#PW} < 8 )); then echo "Mot de passe trop court."; exit 1; fi

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
openssl req -x509 -newkey rsa:2048 -nodes -days 10000 \
  -keyout "$tmp/cle.pem" -out "$tmp/cert.pem" \
  -subj "/CN=Find My Coach/O=Find My Coach/C=FR" 2>/dev/null
PW="$PW" openssl pkcs12 -export -name upload \
  -inkey "$tmp/cle.pem" -in "$tmp/cert.pem" -out "$OUT" -passout env:PW
chmod 600 "$OUT"

base64 -i "$OUT" | pbcopy
echo
echo "Clé créée : $OUT"
echo "Sa version base64 est copiée dans le presse-papiers (secret ANDROID_KEYSTORE_BASE64)."
echo "Garde ce fichier et son mot de passe en lieu sûr : ils servent pour toutes les mises à jour de l'app."
