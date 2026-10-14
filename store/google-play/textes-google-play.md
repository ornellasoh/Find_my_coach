# Google Play — textes et réponses pour Find My Coach

Tout ce qu'il faut copier dans la Play Console pour publier la version 1.0.
Les longueurs sont vérifiées par rapport aux limites de Google (indiquées entre parenthèses).
Version de référence : textes App Store du 13 oct. 2026 (`store/app-store/textes-app-store.md`), adaptés à Android.

## 1. Fiche principale du Store (Croissance → Présence sur le Store → Fiche principale)

**Nom de l'application** (13/30)

```
Find My Coach
```

**Description courte** (79/80)

```
Trouvez un coach sportif près de chez vous et réservez votre séance en un clic.
```

**Description complète** (1489/4000)

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
• Gardez votre série de semaines et débloquez des badges
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

**Éléments graphiques** : `store/google-play.zip` (icône 512 × 512, bannière 1024 × 500, 5 captures de téléphone).
Ces captures datent du 10 oct. 2026 : elles ne montrent ni la messagerie actuelle ni les badges.

## 2. Paramètres du Store (Croissance → Présence sur le Store → Paramètres du Store)

- **Catégorie de l'application** : Application → **Santé et remise en forme**
- **Tags** : Fitness, Coaching sportif, Entraînement personnel (choisir les plus proches proposés)
- **Adresse e-mail** : contact@findmycoach.io
- **Site Web** : https://findmycoach.io
- **Téléphone** : facultatif

## 3. Contenu de l'application (Règlement → Contenu de l'application)

### Règles de confidentialité
```
https://findmycoach.io/confidentialite
```

### Annonces
**Non**, l'application ne contient pas d'annonces.

### Accès aux applications
**Toutes les fonctionnalités ou certaines d'entre elles sont soumises à restrictions.**
Ajouter les identifiants d'un compte client de test (les saisir dans la Console, jamais dans ce fichier) et coller :

```
Créez ou utilisez le compte de test fourni (compte client). Depuis l'accueil, ouvrez « Explorer » pour chercher un coach, ouvrez une fiche puis « Réserver la séance ». La suppression du compte se trouve dans Profil, tout en bas de l'écran.
```

### Classification du contenu (questionnaire IARC)
- Catégorie : **Toutes les autres catégories d'applications** (ni jeu, ni réseau social).
- Violence, sexualité, langage grossier, substances, jeux d'argent : **Non** partout.
- **Les utilisateurs peuvent-ils interagir ou échanger du contenu ?** **Oui** (messagerie, avis).
- **Partage de la position avec d'autres utilisateurs ?** **Non** (la position sert seulement à trier les coachs).
- **Achats numériques ?** **Non** (les séances sont des services réalisés par une personne, payés via Stripe).

### Public cible et contenu
- Tranche d'âge cible : **18 ans et plus** uniquement.
  Cocher des tranches plus jeunes soumet l'app aux règles « Familles », incompatibles avec la messagerie libre
  et le paiement entre adultes.
- L'app n'attire pas particulièrement les enfants : **Non**.

### Sécurité des données
Réponses générales :
- L'app collecte ou partage-t-elle des données ? **Oui**
- Toutes les données sont-elles chiffrées pendant le transfert ? **Oui** (HTTPS)
- Les utilisateurs peuvent-ils demander la suppression de leurs données ? **Oui** (dans l'app, et par le lien ci-dessous)
- **Lien de suppression du compte** (obligatoire, page web accessible sans l'app) : voir la remarque en bas.

Données à déclarer (toutes **collectées**, **non partagées**, **traitement requis**, finalité **Fonctionnement de l'app** et **Gestion du compte**) :

| Catégorie Google | Type | Remarque |
|---|---|---|
| Informations personnelles | Nom, Adresse e-mail, ID utilisateur | |
| Informations personnelles | Adresse | Seulement pour une séance à domicile |
| Informations personnelles | Numéro de téléphone | Facultatif |
| Informations financières | Historique des achats | Réservations ; la carte est saisie chez Stripe, jamais dans l'app |
| Santé et remise en forme | Informations sur l'activité physique | Seulement si l'utilisateur saisit des objectifs |
| Messages | Autres messages dans l'application | Messagerie client ↔ coach |
| Photos et vidéos | Photos | Photo de profil, justificatifs du coach |
| ID de l'appareil ou autres ID | ID de l'appareil ou autres ID | Jeton de notification |

Ne pas déclarer : **Position** (lue sur le téléphone pour trier les coachs, jamais envoyée au serveur) ni
**Informations de paiement** (saisies chez Stripe).

À relire avant d'envoyer : ce tableau décrit ce que fait le code au 14 oct. 2026 et engage l'éditeur de l'app.

### Applications gouvernementales, financières, santé
- Application financière : **Non**.
- Application de santé : déclarer seulement « Activité physique et remise en forme » si la Console le demande.

## 4. Test fermé (Tester → Tests fermés)

**Notes de version** (fr-FR)

```
Première version bêta de Find My Coach : recherche de coachs, réservation et paiement, messagerie, notifications, badges et suivi de progression. Vos retours : contact@findmycoach.io
```

**Liste de testeurs** : créer une liste d'adresses Gmail (au moins 12 si le compte développeur est personnel).

## Remarque : page de suppression du compte

Google exige un lien **web** où un utilisateur peut demander la suppression de son compte sans installer l'app.
Une page à créer sur le site vitrine (Lovable), par exemple `https://findmycoach.io/suppression-compte`, suffit :
elle explique comment supprimer le compte dans l'app (Profil → « Supprimer mon compte ») et propose d'écrire à
contact@findmycoach.io pour le faire à leur place, avec le délai de traitement.
