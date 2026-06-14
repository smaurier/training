# Historique cardio + Suppression sécurisée exercice — Design Spec

## Résumé

Deux features indépendantes :
1. **Historique cardio** — afficher `duration_seconds` / `distance_meters` dans l'historique d'un exercice cardio (données présentes en DB mais jamais surfacées).
2. **Suppression sécurisée exercice** — swipe-left pour supprimer, avec vérification préalable dans `set_logs` ET `workout_exercises`.

---

## Feature 1 : Historique cardio

### Contexte

`SetLog` a `duration_seconds: number | null` et `distance_meters: number | null` (migration v4).
`ExerciseHistoryService.getHistory` lit uniquement `reps_done` / `weight_done` — les champs cardio sont ignorés.

### Changements service

**`ExerciseSetRecord`** — 2 champs optionnels ajoutés :

```typescript
export interface ExerciseSetRecord {
  reps: number;
  weight: number;
  duration_seconds?: number | null;
  distance_meters?: number | null;
}
```

**`getHistory`** — propage les champs dans le `groupMap` :

```typescript
const record: ExerciseSetRecord = {
  reps: log.reps_done,
  weight: log.weight_done,
  duration_seconds: log.duration_seconds,
  distance_meters: log.distance_meters,
};
```

**`bestSet` pour cardio** — si `exercise.type === 'cardio'` :
- Si des logs ont `distance_meters > 0` → best = max `distance_meters`
- Sinon → best = max `duration_seconds`
- Fallback (tout null) → premier set

```typescript
function computeBestSet(sets: ExerciseSetRecord[], isCardio: boolean): ExerciseSetRecord {
  if (isCardio) {
    const withDistance = sets.filter(s => s.distance_meters != null && s.distance_meters > 0);
    if (withDistance.length > 0)
      return withDistance.reduce((b, s) => (s.distance_meters! > b.distance_meters! ? s : b));
    const withDuration = sets.filter(s => s.duration_seconds != null && s.duration_seconds > 0);
    if (withDuration.length > 0)
      return withDuration.reduce((b, s) => (s.duration_seconds! > b.duration_seconds! ? s : b));
    return sets[0];
  }
  const allBodyweight = sets.every(s => s.weight === 0);
  return allBodyweight
    ? sets.reduce((b, s) => (s.reps > b.reps ? s : b), sets[0])
    : sets.reduce((b, s) => (s.weight > b.weight ? s : b), sets[0]);
}
```

`ExerciseHistory` passe `exercise` à la fonction. `getHistory` reçoit `exercise.type` depuis le repo.

### Changements UI — `[exerciseId].tsx`

Détecte `exercise.type === 'cardio'` pour le rendu des sets.

Format d'affichage `bestSet` cardio :
- `distance_meters` disponible → `"X,X km"` (division par 1000, 1 décimale)
- `duration_seconds` disponible → `"Xmin Ys"` (ou `"Xmin"` si secondes = 0)
- Les deux → `"X,X km · Xmin"`

Format ligne set (dans l'historique détaillé) : même logique que `bestSet`.

### Tests TDD

Fichier : `app/services/ExerciseHistoryService.test.ts`

```typescript
describe('ExerciseHistoryService — cardio', () => {
  it('bestSet cardio — choisit la distance max quand distance_meters > 0', ...)
  it('bestSet cardio — fallback durée si aucune distance', ...)
  it('bestSet cardio — fallback premier set si tout null', ...)
  it('propage duration_seconds et distance_meters dans ExerciseSetRecord', ...)
})
```

### Fichiers impactés

| Action | Fichier |
|--------|---------|
| Modifier | `app/services/ExerciseHistoryService.ts` |
| Modifier | `app/services/ExerciseHistoryService.test.ts` |
| Modifier | `app/app/progression/[exerciseId].tsx` |

---

## Feature 2 : Suppression sécurisée exercice

### Contexte

- `ExerciseService.remove(id)` appelle `repo.delete(id)` directement, sans vérification.
- `workout_exercises.exercise_id` référence `exercises(id)` **sans** `ON DELETE CASCADE` → suppression silencieuse d'exercice utilisé en programme = entrées orphelines.
- `IWorkoutExerciseRepository` n'a pas de `findByExerciseId` → à ajouter.
- Aucun bouton delete dans l'UI actuelle.

### Nouveau : `findByExerciseId` sur WorkoutExercise

**`IWorkoutExerciseRepository`** :
```typescript
findByExerciseId(exerciseId: number): Promise<WorkoutExercise[]>;
```

**`SQLiteWorkoutExerciseRepository`** :
```typescript
async findByExerciseId(exerciseId: number): Promise<WorkoutExercise[]> {
  return this.db.getAllAsync<WorkoutExercise>(
    'SELECT * FROM workout_exercises WHERE exercise_id = ?', [exerciseId]
  );
}
```

**`InMemoryWorkoutExerciseRepository`** :
```typescript
async findByExerciseId(exerciseId: number): Promise<WorkoutExercise[]> {
  return this.items.filter(we => we.exercise_id === exerciseId);
}
```

### `SafeDeleteConflict` error type

Exportée depuis `app/services/ExerciseService.ts` (même fichier que `ExerciseService`) pour que `useExercises` puisse l'importer.

```typescript
export class SafeDeleteConflict extends Error {
  constructor(
    public readonly sessions: number,
    public readonly programs: number,
  ) {
    super('SAFE_DELETE_CONFLICT');
  }
}
```

### Mise à jour `ExerciseService`

Constructeur étendu :

```typescript
constructor(
  private readonly repo: IExerciseRepository,
  private readonly setLogRepo: ISetLogRepository,
  private readonly weRepo: IWorkoutExerciseRepository,
) {}
```

Nouvelle méthode :

```typescript
async safeDelete(id: number, force = false): Promise<void> {
  if (!force) {
    const [logs, workoutExercises] = await Promise.all([
      this.setLogRepo.findByExerciseId(id),
      this.weRepo.findByExerciseId(id),
    ]);
    if (logs.length > 0 || workoutExercises.length > 0) {
      throw new SafeDeleteConflict(logs.length, workoutExercises.length);
    }
  }
  await this.repo.delete(id);
}
```

### Tests TDD — `ExerciseService`

```typescript
describe('ExerciseService.safeDelete', () => {
  it('supprime directement si aucun log ni programme', ...)
  it('throw SafeDeleteConflict si set_logs existent', ...)
  it('throw SafeDeleteConflict si workout_exercises existent', ...)
  it('force=true supprime même avec logs et programmes', ...)
})
```

### `useExercises` — expose `deleteExercise`

```typescript
deleteExercise: (id: number, force?: boolean) => Promise<SafeDeleteConflict | null>;
```

Implémentation :
```typescript
const deleteExercise = useCallback(async (id: number, force = false): Promise<SafeDeleteConflict | null> => {
  try {
    await service.safeDelete(id, force);
    await refresh();
    return null;
  } catch (e) {
    if (e instanceof SafeDeleteConflict) return e;
    throw e;
  }
}, [service, refresh]);
```

`makeService()` dans le hook met à jour la construction :
```typescript
function makeService(): ExerciseService {
  return new ExerciseService(
    new SQLiteExerciseRepository(getDb()),
    new SQLiteSetLogRepository(getDb()),
    new SQLiteWorkoutExerciseRepository(getDb()),
  );
}
```

### UI — `ExerciseCard` + swipe

`ExerciseCard` reçoit prop optionnelle :
```typescript
onDelete?: (id: number) => void;
```

Wrappé dans `Swipeable` (react-native-gesture-handler). Render right action : bouton rouge "Supprimer" (largeur 80, `accessibilityLabel="Supprimer l'exercice"`).

`exercices.tsx` passe `onDelete` :
```typescript
onDelete={(id) => handleDeleteExercise(id)}
```

`handleDeleteExercise` dans `exercices.tsx` :
```typescript
async function handleDeleteExercise(id: number) {
  const conflict = await deleteExercise(id);
  if (conflict) {
    const parts: string[] = [];
    if (conflict.programs > 0) parts.push(`utilisé dans ${conflict.programs} programme(s)`);
    if (conflict.sessions > 0) parts.push(`${conflict.sessions} série(s) enregistrée(s)`);
    Alert.alert(
      'Supprimer quand même ?',
      `Cet exercice est ${parts.join(' et ')}. Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteExercise(id, true) },
      ]
    );
  }
}
```

### Fichiers impactés

| Action | Fichier |
|--------|---------|
| Modifier | `app/repositories/IWorkoutExerciseRepository.ts` |
| Modifier | `app/repositories/SQLiteWorkoutExerciseRepository.ts` |
| Modifier | `app/repositories/InMemoryWorkoutExerciseRepository.ts` |
| Modifier | `app/services/ExerciseService.ts` |
| Modifier | `app/services/ExerciseService.test.ts` |
| Modifier | `app/hooks/useExercises.ts` |
| Modifier | `app/components/exercises/ExerciseCard.tsx` |
| Modifier | `app/app/(tabs)/exercices.tsx` |
