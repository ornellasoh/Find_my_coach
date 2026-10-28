## Journal pour le récap du soir (Kouadio)

Chaque soir à 19 h 53, l'assistant « Kouadio » envoie un récap à Ornella et Jessy. Il ne voit ni ce Mac ni GitHub : il lit la table Supabase `public.journal_dev`. Ce journal est donc la seule façon pour lui de savoir ce qui a été fait.

**Mise en place (une seule fois)** : si la table `public.journal_dev` n'existe pas, crée-la avec cette migration (nom : `journal_dev`) :

```sql
create table if not exists public.journal_dev (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  resume      text not null,          -- ce qui a été fait, en français simple
  statut      text not null default 'fait'
              check (statut in ('fait', 'en_cours', 'non_envoye', 'decision', 'a_faire_ornella')),
  details     text                    -- facultatif : fichiers, fonctions, migrations
);
alter table public.journal_dev enable row level security;
-- Aucune policy : la table n'est lisible ni modifiable depuis l'app,
-- seulement par le service (outils Supabase / migrations).
```

À chaque séance de travail, dès qu'une tâche est terminée (et au plus tard avant de finir la séance), ajoute une ligne par sujet avec `execute_sql` :

```sql
insert into public.journal_dev (resume, statut, details) values
  ('<ce qui a été fait, 1 phrase, sans jargon>', '<statut>', '<détails techniques courts>');
```

Statuts :

- `fait` : terminé et en ligne (poussé sur GitHub et/ou déployé sur Supabase) ;
- `non_envoye` : terminé sur le Mac mais pas encore commité/poussé ;
- `en_cours` : commencé, pas fini ;
- `decision` : une décision prise ou à prendre par Ornella ;
- `a_faire_ornella` : une action qu'Ornella doit faire elle-même (compte Apple, Google Play, secret à coller…).

Règles : jamais de clé secrète, de mot de passe ni de donnée personnelle de testeur dans le journal. Des phrases simples : la lectrice n'est pas développeuse.

## Mises à jour iOS / Android : anticiper

Leçon du 28 octobre 2026 : le passage aux scènes (exigé par iOS 27) a rendu invisibles pendant 12 jours toutes les pages ouvertes par Capacitor (Google, Apple, paiement…), sans que personne ne le voie.

- Avant tout changement natif (version d'iOS ou d'Xcode, Capacitor, plugin, `Info.plist`, `AppDelegate.swift`) : chercher ce qu'il peut casser (notes de version, issues GitHub, code du plugin dans `node_modules`).
- Après : retester sur iPhone la connexion Google et Apple, un paiement, un pack, l'agenda, la visio et une notification.
- Toute page externe passe par `openInApp` (`src/lib/inAppBrowser.ts`), jamais `Browser.open` directement. `npm run check:ios` le vérifie avant chaque build Xcode Cloud ; y ajouter chaque nouveau risque trouvé.
- Mise à jour à venir ou risque repéré : l'écrire dans le journal avec le statut `decision` (le risque + l'action proposée), sans attendre la panne.
