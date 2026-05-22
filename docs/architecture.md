# Architecture

> Ce document est mis à jour au fil du développement.

## Stack

| Couche | Technologie |
|--------|-------------|
| Framework | React Native + Expo |
| Navigation | Expo Router (file-based) |
| Stockage | SQLite (expo-sqlite) |
| Langage | TypeScript |
| Documentation | VitePress |

## Structure du projet

```
training-app/
├── docs/          ← documentation VitePress
└── app/           ← projet Expo
    ├── app/       ← routes Expo Router
    ├── components/
    ├── constants/
    └── assets/
```

## Couche base de données

```
app/db/
├── index.ts        ← singleton getDb() + initDatabase()
├── schema.ts       ← migrations SQL versionnées (PRAGMA user_version)
├── migrations.ts   ← runner de migrations
├── seeds.ts        ← 17 exercices prédéfinis
└── types.ts        ← interfaces TypeScript pour chaque table
```

### Schéma

| Table | Rôle |
|-------|------|
| `exercises` | Bibliothèque d'exercices (prédéfinis + custom) |
| `programs` | Programmes d'entraînement |
| `workouts` | Séances dans un programme |
| `workout_exercises` | Exercices dans une séance (template) |
| `blocks` | Blocs libres dans un exercice (Échauffement, Travail…) |
| `sets` | Séries dans un bloc (reps, poids, pause) |
| `session_logs` | Séances réellement effectuées |
| `set_logs` | Séries réellement effectuées (reps, poids, RPE) |
| `personal_records` | PRs calculés par exercice (1RM Epley) |
| `settings` | Clé/valeur (préférences utilisateur) |

### Progression des poids
Le champ `sets.weight` stocke le poids cible courant. Après une séance réussie, il est mis à jour directement. L'historique réel reste dans `set_logs`. Le seuil de déclenchement et le pas sont configurables par exercice (`exercises.progression_threshold`, `exercises.progression_step`).

### Migrations
Versionnement via `PRAGMA user_version`. Chaque entrée dans le tableau `MIGRATIONS` de `schema.ts` est une version. Ajouter une migration = ajouter une entrée au tableau.

## Décisions techniques

### Stockage local (SQLite)
Pas de backend pour le MVP. Toutes les données restent sur l'appareil. Un export JSON manuel sert de sauvegarde. La sync cloud est envisagée en V2.

### Expo Router
Navigation file-based pour une structure de routes lisible et maintenable. Chaque écran correspond à un fichier dans `app/`.
