# App Store — textes et captures de Find My Coach

Tout ce qu'il faut copier dans App Store Connect pour soumettre la version 1.0.
Les longueurs ont été vérifiées par rapport aux limites d'Apple (indiquées entre parenthèses).

## 1. Fiche de l'app (onglet Distribution)

**Nom** (13/30)

```
Find My Coach
```

**Sous-titre** (28/30)

```
Votre coach sportif, partout
```

**Texte promotionnel** (138/170) — modifiable à tout moment sans nouvelle version

```
Trouvez un coach sportif près de chez vous et réservez votre séance en quelques secondes : à domicile, en extérieur, en salle ou en visio.
```

**Description** (1432/4000)

```
Find My Coach vous met en relation avec des coachs sportifs près de chez vous. Trouvez le coach qui vous correspond, réservez votre séance et payez en toute sécurité, directement depuis l'app.

TROUVEZ LE BON COACH
• Recherchez par nom, discipline ou objectif
• Affichez les coachs autour de vous sur la carte
• Filtrez par format (domicile, extérieur, salle, visio), tarif et disponibilité
• Consultez chaque fiche : parcours, spécialités, tarifs et avis des clients

RÉSERVEZ EN QUELQUES SECONDES
• Choisissez un créneau dans l'agenda du coach
• Payez par carte en toute sécurité
• Recevez une confirmation et un rappel avant chaque séance
• Annulation gratuite jusqu'à 24 h avant la séance

RESTEZ EN CONTACT
• Échangez avec votre coach par messagerie
• Rejoignez votre séance en visio en un geste
• Retrouvez le compte rendu de votre coach après la séance

SUIVEZ VOS PROGRÈS
• Fixez vos objectifs et suivez votre régularité
• Retrouvez l'historique de vos séances
• Donnez votre avis pour aider les autres clients

VOUS ÊTES COACH ?
• Créez votre fiche et partagez votre lien personnel
• Ouvrez vos créneaux et gérez votre planning
• Suivez vos clients et vos revenus
• Recevez vos paiements automatiquement sur votre compte bancaire

Sport, remise en forme, yoga, préparation physique, nutrition, bien-être : quel que soit votre objectif, votre coach est à portée de main.

Une question ? Écrivez-nous à contact@findmycoach.io
```

**Mots-clés** (98/100) — séparés par des virgules, sans espace après la virgule ; « coach » est déjà dans le nom

```
sport,fitness,musculation,yoga,pilates,nutrition,remise en forme,domicile,visio,entraineur,running
```

**URL d'assistance**

```
https://findmycoach.io
```

**URL marketing** (facultatif)

```
https://findmycoach.io
```

**URL de la politique de confidentialité**

```
https://findmycoach.io/confidentialite
```

**Copyright**

```
© 2026 Find My Coach
```

**Catégorie principale** : Forme et santé — **Catégorie secondaire** : Sports

**Prix** : Gratuit

## 2. Captures d'écran

Dossier `store/app-store/captures/` (6 visuels par format, à déposer dans l'ordre 1 → 6) :

| Emplacement dans App Store Connect | Dossier | Dimensions |
|---|---|---|
| iPhone — écran moyen avec Dynamic Island (**obligatoire**) | `iPhone-6.3-pouces_1206x2622` | 1206 × 2622 |
| iPhone — grand écran avec Dynamic Island | `iPhone-6.9-pouces_1320x2868` | 1320 × 2868 |
| iPhone — écran 6,5 pouces | `iPhone-6.5-pouces_1284x2778` | 1284 × 2778 |
| iPad — écran 13 pouces | `iPad-13-pouces_2064x2752` | 2064 × 2752 |

Apple n'exige qu'un seul format iPhone : l'écran moyen avec Dynamic Island (1206 × 2622). Le grand format est facultatif. Le format iPad n'est demandé que si
l'app est déclarée compatible iPad (c'est le cas aujourd'hui : voir la remarque dans la conversation du 13 oct. 2026).

Les écrans montrés viennent du mode démonstration de l'app (coachs et séances fictifs).

## 3. Informations pour la vérification par Apple (App Review)

**Connexion requise** : oui. Compte client de test : `demo.apple@findmycoach.io` (le même sert pour Google Play).
Le mot de passe se saisit directement dans App Store Connect, jamais dans ce fichier.

**Coordonnées** : prénom, nom, téléphone et email de la personne à contacter.

**Notes** (à coller)

```
Find My Coach met en relation des particuliers et des coachs sportifs indépendants pour des séances individuelles, en personne (domicile, extérieur, salle) ou en visio en direct.

Paiement : les séances sont des prestations de service individuelles réalisées par une personne (coaching 1 à 1, en personne ou en temps réel). Elles sont réglées par carte via Stripe, conformément aux règles 3.1.3(d) (services de personne à personne en temps réel) et 3.1.3(e) (services consommés en dehors de l'app). L'app ne vend aucun contenu ni fonctionnalité numérique.

Compte de test : le compte fourni est un compte client. Depuis l'accueil, ouvrez « Explorer » (« Rechercher » dans les versions suivantes) pour chercher un coach, ouvrez une fiche puis « Réserver la séance ».

Localisation : utilisée uniquement quand l'utilisateur touche « Autour de moi », pour trier les coachs par distance. Elle n'est ni enregistrée ni suivie.

Suppression du compte : Profil → « Supprimer mon compte » (tout en bas de l'écran).

Connexion : email et mot de passe, « Continuer avec Apple » ou « Continuer avec Google ».

Notifications : confirmations de réservation, messages et rappels de séance.
```

## 4. Confidentialité de l'app (questionnaire « Confidentialité de l'app »)

Réponse générale : **oui, l'app collecte des données**. Aucune donnée n'est utilisée pour le suivi publicitaire
(« tracking ») : répondre **non** partout à cette question.

| Type de données | Collecté ? | Lié à l'utilisateur | Finalité |
|---|---|---|---|
| Nom | Oui | Oui | Fonctionnement de l'app |
| Adresse email | Oui | Oui | Fonctionnement de l'app |
| Numéro de téléphone | Oui (facultatif) | Oui | Fonctionnement de l'app |
| Adresse postale (séance à domicile) | Oui | Oui | Fonctionnement de l'app |
| Photos (photo de profil, justificatifs du coach) | Oui | Oui | Fonctionnement de l'app |
| Autres contenus utilisateur (messages, avis) | Oui | Oui | Fonctionnement de l'app |
| Historique d'achats (réservations) | Oui | Oui | Fonctionnement de l'app |
| Identifiant utilisateur | Oui | Oui | Fonctionnement de l'app |
| Identifiant de l'appareil (jeton de notification) | Oui | Oui | Fonctionnement de l'app |
| Localisation précise | Non (lue sur le téléphone, jamais envoyée) | — | — |
| Informations de paiement | Non (saisies chez Stripe, jamais dans l'app) | — | — |
| Santé et forme | Oui si l'utilisateur saisit des objectifs | Oui | Fonctionnement de l'app |

À relire avant d'envoyer : ce tableau décrit ce que fait le code au 13 oct. 2026. Il engage l'éditeur de l'app.

## 5. Classification par âge

Répondre « Non » ou « Aucun » à toutes les questions de contenu (violence, contenu sexuel, jeux d'argent, etc.).
Répondre **Oui** aux questions sur la messagerie entre utilisateurs et sur les contenus créés par les utilisateurs
(messages, avis). Apple calcule ensuite la tranche d'âge.

## 6. Conformité à l'exportation

« Votre app utilise-t-elle un chiffrement ? » : uniquement le chiffrement standard (HTTPS). Le réglage
`ITSAppUsesNonExemptEncryption = false` est déjà dans l'app : la question ne devrait plus être posée.

## 7. TestFlight (informations de test)

**Description de l'app bêta**

```
Find My Coach met en relation des particuliers et des coachs sportifs, pour des séances à domicile, en extérieur, en salle ou en visio.

Côté client : recherchez un coach par spécialité ou autour de vous sur la carte, consultez sa fiche (tarifs, disponibilités, avis), réservez et payez une séance en quelques instants, échangez par messagerie et suivez vos objectifs.

Côté coach : créez votre fiche, ouvrez vos créneaux, gérez vos réservations et vos clients, et recevez vos paiements automatiquement.

Cette version bêta nous sert à vérifier que tout fonctionne avant le lancement. Vos retours sont précieux : un bug, une idée, un écran peu clair ? Écrivez-nous à contact@findmycoach.io.
```

**Quoi tester**

```
1. Créez un compte en choisissant « Je cherche un coach » ou « Je suis coach ».
2. Client : recherchez un coach, ouvrez sa fiche et réservez une séance.
3. Envoyez un message à un coach depuis l'onglet Messages.
4. Vérifiez que vous recevez bien les notifications (réservation, message, rappel).
5. Coach : complétez votre profil et ouvrez des créneaux.
```

**E-mail pour les commentaires** : contact@findmycoach.io
