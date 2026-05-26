# Design — useExercises hook + écran liste

Date : 2026-05-26

## Contexte

`ExerciseService` est implémenté et testé (31 tests GREEN). Prochaine couche : connecter le service à React via un hook, puis un premier écran réel.

## Périmètre

- Hook `useExercises` : liste + création
- Écran `exercices.tsx` : liste avec bouton d'ajout
- Modal `add-exercise.tsx` : formulaire de création
- Suppression : V2 (dépendances à vérifier avant delete)

## Architecture

```
hooks/useExercises.ts
  useSQLiteContext()              ← SQLiteDatabase via Expo
  SQLiteExerciseRepository(db)   ← repo réel
  ExerciseService(repo)          ← logique métier
  state: exercises, loading, error
  create(input) → service.create() → refresh

app/(tabs)/exercices.tsx
  useExercises()
  FlatList → ExerciseCard par item
  FAB "+" → ouvre modal

app/modal/add-exercise.tsx
  formulaire : name, type, muscle_groups (texte libre comma-séparé, splitté en tableau avant create()), progression_step (défaut : 2.5)
  onSubmit → create() du hook parent
```

## Flux de données

```
Mount
  → loading = true
  → service.listAll()
  → exercises = résultat
  → loading = false

create(input)
  → service.create(input)   [validation + save]
  → service.listAll()       [re-fetch]
  → exercises mis à jour
```

Erreurs : `error: string | null`. Si `error !== null`, l'écran affiche un message. Pas de retry automatique MVP.

## Contrat du hook

```typescript
interface UseExercisesResult {
  exercises: Exercise[];
  loading: boolean;
  error: string | null;
  create: (input: CreateExerciseInput) => Promise<void>;
}

function useExercises(): UseExercisesResult
```

## Décisions

- **Pas de test unitaire du hook** : la logique métier est déjà testée dans `ExerciseService`. Le hook est câblage React pur (YAGNI).
- **Re-fetch après create** plutôt qu'update optimiste : MVP, pas de risque de désync.
- **Pas de `useMemo` sur le service** pour l'instant : `useSQLiteContext()` retourne la même instance, le re-render est peu fréquent.
- **SQLiteExerciseRepository créé dans le hook** : pas de provider/contexte (overkill pour un seul écran MVP).

## Fichiers à créer

| Fichier | Rôle |
|---|---|
| `hooks/useExercises.ts` | Hook principal |
| `app/(tabs)/exercices.tsx` | Écran liste |
| `app/modal/add-exercise.tsx` | Modal ajout |
| `components/exercises/ExerciseCard.tsx` | Composant carte |

## V2 (hors scope)

- `remove(id)` avec vérification de dépendances (exercice utilisé dans un programme → bloquer ou avertir)
- Recherche / filtre par type
- Edit exercice existant
