# Feuille de route du lancement — Find My Coach

État au 13 octobre 2026. Les cases se cochent au fur et à mesure.

## Mercredi 14 octobre — App Store (environ 2 h)

### Avant le build (15 min)
- [ ] Décider : **iPhone uniquement** (recommandé) ou iPad aussi. À dire à Claude, qui fait la modification (une ligne).
- [ ] Stripe : activer « Accounts v1 support » (`dashboard.stripe.com/settings/developers/api-policies/feat_accounts_v1_support`),
      sinon l'activation des paiements d'un coach échoue.
- [ ] Lovable : coller la consigne « prénom obligatoire » sur la page `/beta` (le serveur refuse déjà les inscriptions sans prénom).

### Build iPhone (30 min d'attente)
- [ ] App Store Connect → Xcode Cloud → démarrer un build → il arrive sous le nom 1.0 (2).
- [ ] L'installer par TestFlight sur ton iPhone et tester :
  - [ ] « Continuer avec Apple » te connecte bien ;
  - [ ] Profil → Administration → « Bêta-testeurs iPhone (TestFlight) » est visible ;
  - [ ] « Ajouter au calendrier » dans le détail d'une séance confirmée ouvre la fenêtre d'iOS.

### TestFlight (15 min)
- [ ] TestFlight → Test 2 → Builds → ajouter 1.0 (2) → remplir « Quoi tester » → envoyer pour vérification
      (textes : `store/app-store/textes-app-store.md`, section 7).
- [ ] Valider Roger et Zakary dans l'onglet Bêta-testeurs (ils recevront l'invitation dès que le build est approuvé).

### Fiche App Store (45 min)
- [ ] Créer un compte client de démonstration dans l'app (pour le vérificateur d'Apple).
- [ ] Distribution → Version 1.0 : captures (`store/app-store/captures/iPhone-6.9-pouces_1320x2868`), description,
      mots-clés, URL, copyright, build 1.0 (2), informations de vérification.
- [ ] Informations sur l'app : sous-titre, catégories, classification d'âge.
- [ ] Confidentialité de l'app : URL + questionnaire (section 4 du fichier de textes, à relire).
- [ ] Tarifs et disponibilité : Gratuit, France.
- [ ] « Ajouter pour vérification » → « Envoyer ». Publication manuelle.

## Jeudi 15 octobre — Google Play (environ 2 h)

- [ ] Vérifier le type de compte Google Play Console. **Compte personnel** : Google impose un test fermé avec
      12 testeurs pendant 14 jours avant la mise en production. **Compte organisation** : pas de cette contrainte.
- [ ] GitHub → Actions → « Android Play Store (AAB signé) » → Run workflow (version 1.0.0). Si le workflow s'arrête sur
      « ANDROID_KEYSTORE_BASE64 manquant » : créer la clé d'envoi et les 4 secrets (README, section Google Play).
- [ ] Demander à Claude : captures Google Play refaites avec les écrans actuels (celles de `store/google-play.zip`
      datent du 10 octobre) et textes de la fiche Play (titre, description courte, description complète).
- [ ] Play Console → créer l'app → fiche du Store, classification du contenu, sécurité des données, public cible.
- [ ] Envoyer l'AAB en **test interne**, puis en **test fermé** (inviter tes testeurs Android : Yousra, Nicolas, Eliana…).

## Ensuite — pendant les tests

- [ ] Répondre aux retours d'Apple (1 à 2 jours) ; en cas de refus, transmettre le message à Claude.
- [ ] Valider les nouveaux testeurs iPhone à chaque email « Nouveau testeur iPhone à valider ».
- [ ] Noter les retours des testeurs (bugs, écrans peu clairs) pour une version 1.0.1.
- [ ] Tous les 6 mois : refaire le secret « Connexion Apple » (prochaine échéance : avril 2027,
      `node scripts/apple-secret.mjs …`, voir `docs/beta-configuration.md`, section 2).

## En attente de décision

- Lien TestFlight public pour les 10 premiers inscrits iPhone, puis validation manuelle (idée proposée, non codée).
- Séance découverte à prix réduit (en pause).
- Lien de visio enregistré une fois par le coach (en pause : priorité aux séances en présentiel).

## Version 2

- Agent IA et programmes d'entraînement envoyés par les coachs.
- Packs de séances, créneaux récurrents, parrainage, visio intégrée, mise en page iPad.
