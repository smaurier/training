# Architecture

> Ce document est mis à jour au fil du développement.

## Stack

| Couche | Technologie |
|--------|-------------|
| Framework | React Native + Expo SDK 54 |
| Navigation | Expo Router (file-based) |
| Stockage | SQLite (expo-sqlite) |
| Langage | TypeScript strict |
| Tests | Jest + InMemory repositories |
| Documentation | VitePress |

## Structure du projet

```
training-app/
├── docs/                   ← documentation VitePress
└── app/                    ← projet Expo
    ├── app/                ← routes Expo Router (un fichier = un écran)
    │   ├── (tabs)/         ← onglets principaux (exercices, programme, séance, progression)
    │   ├── workout/        ← config séance [id]
    │   ├── session/        ← écran séance [id]
    │   └── progression/    ← détail exercice [exerciseId]
    ├── components/
    │   ├── session/        ← RunningPhase, CheckIn, RestPhase…
    │   ├── workout/        ← WorkoutExerciseCard, BlockCard, EditBlockModal…
    │   ├── progression/    ← VolumeBarChart, Exercise1RMCard…
    │   └── ui/             ← PressableA11y, composants partagés
    ├── services/           ← logique métier (SessionService, ProgressionService…)
    ├── repositories/       ← accès données (interfaces + SQLite + InMemory)
    ├── hooks/              ← hooks React (useSession, usePrograms, useProgression…)
    ├── constants/          ← Colors.ts, Radius.ts, Typography.ts
    └── db/                 ← schema, migrations, seeds, types
```

## Couche base de données

```
app/db/
├── index.ts        ← singleton getDb() + initDatabase()
├── schema.ts       ← migrations SQL versionnées (PRAGMA user_version)
├── migrations.ts   ← runner de migrations
├── seeds.ts        ← exercices prédéfinis + programme PPL complet
└── types.ts        ← interfaces TypeScript pour chaque table
```

### Schéma

| Table | Rôle | Colonnes notables |
|-------|------|-------------------|
| `exercises` | Bibliothèque d'exercices (prédéfinis + custom) | `type` (musculation/etirement/cardio) |
| `programs` | Programmes d'entraînement | `is_active` |
| `workouts` | Séances dans un programme | `order_index` |
| `workout_exercises` | Exercices dans une séance (template) | `order_index` |
| `blocks` | Blocs libres dans un exercice | `is_work_block` (0 = mobilité/étirements, exclut la progression) |
| `sets` | Séries dans un bloc | `duration_seconds` (null = reps, nombre = durée en secondes) |
| `session_logs` | Séances réellement effectuées | `checkin_energy/fatigue/sleep` |
| `set_logs` | Séries réellement effectuées | `rpe`, `duration_seconds`, `distance_meters` (cardio) |
| `personal_records` | PRs calculés par exercice (1RM Epley) | `estimated_1rm` |
| `settings` | Clé/valeur (préférences utilisateur) | — |

### Migrations

| Version | Contenu |
|---------|---------|
| v1 | Schéma initial (10 tables) |
| v2 | ON DELETE CASCADE sur session_logs, set_logs, personal_records |
| v3 | `sets.duration_seconds` — support séries basées sur durée |
| v4 | `set_logs.duration_seconds` + `set_logs.distance_meters` — log cardio |

Versionnement via `PRAGMA user_version`. Ajouter une migration = ajouter une entrée au tableau `MIGRATIONS` de `schema.ts`.

### Seeds

`seeds.ts` contient deux fonctions appelées à chaque démarrage dans `initDatabase()` :

- `seedExercises()` — idempotent (skip si exercices existent) : 17 exercices de base
- `seedProgram()` — **toujours** supprime et recrée le programme PPL : 6 séances (Push/Footing Mardi/Pull/Footing Jeudi/Legs/Bonus), ~50 exercices, blocs mobilité/travail/étirements avec durées

### Types de séries

| Condition | Mode | UI |
|-----------|------|----|
| `duration_seconds === null` | Reps | Inputs reps + poids + RPE |
| `duration_seconds > 0` | Durée | Décompte auto, "C'est fait" |
| `exercise.type === 'cardio'` | Cardio | Inputs durée (min) + distance (km) |

### Progression des poids
Le champ `sets.weight` stocke le poids cible courant. Après séance réussie, il est mis à jour directement. L'historique reste dans `set_logs`. Seuil et pas configurables par exercice. Blocs avec `is_work_block = 0` exclus du calcul.

## Couche Repository

```
IXxxRepository (interface)
├── SQLiteXxxRepository (production — expo-sqlite)
└── InMemoryXxxRepository (tests — tableau en mémoire)
```

Repos disponibles : Exercise, Program, Workout, WorkoutExercise, Block, Set, SessionLog, SetLog, PersonalRecord.

## Couche Service

Services injectés via constructeur (Dependency Injection) :

| Service | Rôle |
|---------|------|
| `ExerciseService` | CRUD exercices |
| `ProgramService` | CRUD programmes, activation |
| `WorkoutService` | CRUD séances dans un programme |
| `WorkoutExerciseService` | Ajout/retrait exercices, blocs, séries |
| `SessionService` | Conduite de séance, logSet, progression automatique |
| `ProgressionService` | Stats, volume, 1RM Epley, historique PRs |

## Décisions techniques

### Stockage local (SQLite)
Pas de backend pour le MVP. Toutes les données restent sur l'appareil. Sync cloud envisagée en V2.

### Expo Router
Navigation file-based. Chaque écran correspond à un fichier dans `app/`.

### Design tokens
Toutes les couleurs passent par `Colors.ts`. Rayons via `Radius.ts`. Exception documentée : `#22C55E` / `#EF4444` pour états positif/négatif (sémantique status).

### Accessibilité
`accessibilityLabel` obligatoire sur tous les éléments interactifs. `PressableA11y` remplace `TouchableOpacity` partout. Cible WCAG 2.2 + EN 301 549.
