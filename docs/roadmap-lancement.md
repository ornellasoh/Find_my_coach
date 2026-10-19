# Feuille de route du lancement — Find My Coach

État au 13 octobre 2026. Les cases se cochent au fur et à mesure.

## Mercredi 14 octobre — App Store (environ 2 h)

### Avant le build (15 min)
- [x] Décider : iPhone uniquement ou iPad aussi. Réglage actuel de l'app : iPhone et iPad (fait, confirmé par Ornella le 19 oct.).
- [x] Stripe : activer « Accounts v1 support » (`dashboard.stripe.com/settings/developers/api-policies/feat_accounts_v1_support`),
      sinon l'activation des paiements d'un coach échoue.
- [x] Lovable : coller la consigne « prénom obligatoire » sur la page `/beta` (le serveur refuse déjà les inscriptions sans prénom).

### Build iPhone (30 min d'attente)
- [x] App Store Connect → Xcode Cloud → démarrer un build → il arrive sous le nom 1.0 (2).
- [x] L'installer par TestFlight sur ton iPhone et tester :
  - [x] « Continuer avec Apple » te connecte bien ;
  - [x] Profil → Administration → « Bêta-testeurs iPhone (TestFlight) » est visible ;
  - [x] « Ajouter au calendrier » dans le détail d'une séance confirmée ouvre la fenêtre d'iOS.

### TestFlight (15 min)
- [x] TestFlight → Test 2 → Builds → ajouter 1.0 (2) → remplir « Quoi tester » → envoyer pour vérification
      (textes : `store/app-store/textes-app-store.md`, section 7).
- [x] Valider Roger et Zakary dans l'onglet Bêta-testeurs (ils recevront l'invitation dès que le build est approuvé).

### Fiche App Store (45 min)
- [x] Créer un compte client de démonstration dans l'app (pour le vérificateur d'Apple).
- [x] Distribution → Version 1.0 : captures (`store/app-store/captures/iPhone-6.9-pouces_1320x2868`), description,
      mots-clés, URL, copyright, build 1.0 (2), informations de vérification.
- [x] Informations sur l'app : sous-titre, catégories, classification d'âge.
- [x] Confidentialité de l'app : URL + questionnaire (section 4 du fichier de textes, à relire).
- [x] Tarifs et disponibilité : Gratuit, France.
- [x] « Ajouter pour vérification » → « Envoyer ». Publication manuelle.

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
- [ ] Saisir le mot de passe du compte de test dans App Store Connect (Informations de vérification) et la Play Console (Accès à l'application).
- [ ] Valider les nouveaux testeurs iPhone à chaque email « Nouveau testeur iPhone à valider ».
- [ ] Noter les retours des testeurs (bugs, écrans peu clairs) pour une version 1.0.1.
- [ ] Tous les 6 mois : refaire le secret « Connexion Apple » (prochaine échéance : avril 2027,
      `node scripts/apple-secret.mjs …`, voir `docs/beta-configuration.md`, section 2).

## Version 1.1 — pendant les tests

- [x] Refus Apple du 14 oct. (« l'app se ferme au lancement ») : corrigé (scènes iOS 27), poussé le 15 oct.
      Nouveau build testé par TestFlight et renvoyé à Apple avec la réponse au refus, notes de vérification collées (Ornella, 19 oct.).
- [x] Badges clients : série de semaines, paliers, première séance (13 oct.).
- [x] Statistiques coach (15 oct.) : accueil coach → « Statistiques » : revenus nets des 6 derniers mois,
      clients, clients réguliers, taux de fidélisation, clients les plus fidèles.
- [ ] Tester l'écran Statistiques avec un vrai compte coach (Ornella).

- [x] Avis : réponse publique du coach (une seule fois) ; avis refusés par le serveur sans séance effectuée (16 oct.).
- [x] Packs de séances (16 oct.) : le coach les crée dans « Mon profil pro » ; le client paie en 1, 3 ou 5 fois (échéancier Stripe, risque d'impayé pour le coach) ; chaque réservation utilise une séance.
- [x] Stripe : événements `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted` ajoutés au webhook (Ornella, 16 oct.).
- [x] Emails et notifications des packs et des réponses aux avis, rappels automatiques (16 oct.) : voir « Automatisations » plus bas.
- [x] Avis : 7 jours après la séance pour le laisser (refusé au-delà par le serveur), demande 2 h après, relance 5 jours après s'il manque (19 oct.).

### Test des packs de séances (Stripe en mode test, carte 4242 4242 4242 4242) — fait par Ornella le 19 oct.
- [x] Stripe (mode test) : activer « Accounts v1 support », puis compléter le compte coach d'Ornella (Comptes connectés) jusqu'à « Paiements activés ».
      Sans cela, seul l'achat en 1 fois fonctionne ; en 3 ou 5 fois est refusé.
- [x] Compte coach : Profil → Mon profil pro → Packs de séances → créer « Pack test » (3 séances, 30 €, « En 3 fois » coché).
- [x] Autre compte (client) : fiche coach → « Acheter ce pack » → « En 3 fois » → carte 4242 → le pack apparaît dans « Mes réservations ».
- [x] Réserver une séance avec le pack (« Réserver avec mon pack ») → plus que 2 séances ; l'annuler plus de 24 h avant → la séance revient.
- [x] Vérifier les emails reçus : pack activé (client), pack vendu (coach), réservation confirmée.
- [x] Mensualités 2 et 3 : prélevées 1 et 2 mois plus tard (ou mode test accéléré, une mensualité par jour, à demander à Claude).
- [x] Échec de prélèvement : dans Stripe (mode test), changer la carte du client pour 4000 0000 0000 0341 → email « Échéance non prélevée », réservations bloquées.

### Automatisations (app + push + email)
| Moment | Client | Coach |
|---|---|---|
| Pack payé | « Pack activé » | « Nouveau pack vendu » |
| Réservation avec le pack | « Réservation confirmée » + séances restantes | « Nouvelle réservation (pack) » |
| 3 jours avant une mensualité | « Prochaine mensualité » (montant, date) | — |
| Mensualité refusée | « Échéance non prélevée » + lien pour payer | « Échéance impayée » |
| Mensualité en retard réglée | — | « Échéance réglée » |
| Dernière mensualité payée | « Pack entièrement réglé » | « Pack entièrement réglé » |
| Échéancier abandonné par Stripe | « Pack suspendu » | « Pack impayé » |
| 14 jours avant la fin de validité (séances restantes) | « Votre pack expire bientôt » | — |
| Plus qu'une séance dans le pack | « Dernière séance de votre pack » | — |
| 2 h après une séance effectuée | « Comment s'est passée votre séance ? » | — |
| 5 jours après, toujours sans avis | « Plus que 2 jours pour donner votre avis » | — |
| Réponse du coach à un avis | « Votre coach a répondu à votre avis » | — |

## En attente de décision

- Lien TestFlight public pour les 10 premiers inscrits iPhone, puis validation manuelle (idée proposée, non codée).
- Séance découverte à prix réduit (en pause).
- Lien de visio enregistré une fois par le coach (en pause : priorité aux séances en présentiel).

## Refonte du design (inspirée d'iPhone / iOS 26) — terminée le 19 oct.

Ne pas mélanger avec le lancement : on finit les maquettes, on choisit, puis on livre avec la version 1.1.
Maquette de départ : `docs/maquettes/rechercher-v2.html` (design system, écran Rechercher, feuille « Tous les filtres »).

- [x] Relire les recherches de tendances : plus nécessaire, la refonte est faite (19 oct.).
- [x] Valider la maquette de l'écran Rechercher : écran codé et testé sur téléphone (19 oct.).
- [x] Décision du 15 oct. : un seul design pour iPhone et Android, mais codes Material 3 sur Android
      (barre de navigation, boutons, puces, retour). Maquette : `docs/maquettes/rechercher-v2-android.html`.
- [x] Maquette Android de l'écran Rechercher validée par Ornella (15 oct.).
- [x] Maquettes des autres écrans : plus nécessaires, les écrans ont été refaits directement dans l'app (19 oct.).
- [x] Coder l'écran Rechercher refait (16 oct., branche `refonte-ios`).
- [x] Barre de menu flottante (iPhone) / barre Material 3 (Android), appui instantané, réglages d'accessibilité du téléphone respectés (16 oct.).
- [x] Tous les autres écrans harmonisés : en-têtes iOS, feuilles du bas, dates et montants en français, sans émojis (16 oct.).
- [x] Barre du coach à 5 onglets : « Revenus » déplacé dans « Profil » (décision d'Ornella, 16 oct.).
- [x] Refonte fusionnée dans main le 16 oct. (choix d'Ornella, sans attendre la validation d'Apple) : elle part dans le prochain build TestFlight et chez les testeurs Android.
- [x] Tester la refonte sur un vrai iPhone et un vrai Android (Ornella, 19 oct.).
- Option pour plus tard — badges clients « chocolaterie » : en attente (décision d'Ornella, 16 oct.). Maquette : `docs/maquettes/badges-chocolaterie.html`.
- Option pour plus tard — temps de réponse du coach et « Populaire cette semaine » (environ ½ jour).
- [x] Barre de menu flottante sur toute l'app (16 oct.).
- [x] Coder les autres écrans (16 oct., première passe ; à affiner après test sur téléphone).

Total : 1 à 2 semaines, plus 1 à 3 jours de vérification Apple et Google.

Idée à trancher plus tard : recherche « en une phrase » (« coach de yoga douce à Lyon, le soir, moins de 70 € »),
comme Airbnb depuis septembre 2026. Fonctionnalité nouvelle, 2 à 3 jours ; plutôt avec les recommandations personnalisées.

## Version 2

- Agent IA et programmes d'entraînement envoyés par les coachs.
- Packs de séances, créneaux récurrents, parrainage, visio intégrée, mise en page iPad.
