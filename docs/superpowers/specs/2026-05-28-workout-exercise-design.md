# Session 7 — WorkoutExercise + Block + Set

**Date** : 2026-05-28  
**Scope** : B+ — 3 repos + 3 services + écran workout/[id] + modal add-workout-exercise

---

## Contexte

Le schéma DB (v1) contient déjà les tables `workout_exercises`, `blocks`, `sets`. Les types TypeScript existent dans `db/types.ts`. Ce qui manque : repositories, service, hooks, composants, écrans.

L'écran `programme/[id].tsx` a un placeholder Alert sur `WorkoutCard.onPress` — cette session le remplace par la navigation vers `workout/[id]`.

---

## Architecture

### Couches (inchangées)

```
Screen → Hook → Service → Repositories → SQLite
```

### Nouveaux fichiers

```
repositories/
  IWorkoutExerciseRepository.ts
  InMemoryWorkoutExerciseRepository.ts
  InMemoryWorkoutExerciseRepository.test.ts
  workoutExerciseRepository.contract.ts
  SQLiteWorkoutExerciseRepository.ts

  IBlockRepository.ts
  InMemoryBlockRepository.ts
  InMemoryBlockRepository.test.ts
  blockRepository.contract.ts
  SQLiteBlockRepository.ts

  ISetRepository.ts
  InMemorySetRepository.ts
  InMemorySetRepository.test.ts
  setRepository.contract.ts
  SQLiteSetRepository.ts

services/
  WorkoutExerciseService.ts       ← orchestrateur unique
  WorkoutExerciseService.test.ts

hooks/
  useWorkoutExercises.ts

components/workout/
  WorkoutExerciseCard.tsx         ← accordéon
  BlockCard.tsx                   ← block + sets

app/
  workout/[id].tsx                ← nouvel écran
  add-workout-exercise.tsx        ← modal
  _layout.tsx                     ← register new routes
```

---

## 1. Repositories

### Interfaces

**IWorkoutExerciseRepository**
```typescript
findByWorkoutId(workoutId: number): Promise<WorkoutExercise[]>
findById(id: number): Promise<WorkoutExercise | null>
save(dto: CreateWorkoutExerciseDto): Promise<WorkoutExercise>
delete(id: number): Promise<void>
```

**IBlockRepository**
```typescript
findByWorkoutExerciseId(weId: number): Promise<Block[]>
findById(id: number): Promise<Block | null>
save(dto: CreateBlockDto): Promise<Block>
delete(id: number): Promise<void>
```

**ISetRepository**
```typescript
findByBlockId(blockId: number): Promise<Set[]>
findById(id: number): Promise<Set | null>
save(dto: CreateSetDto): Promise<Set>
delete(id: number): Promise<void>
```

### Contract tests

Même pattern que `programRepository.contract.ts` / `workoutRepository.contract.ts` :
- Suite de cas partagée InMemory + SQLite
- Cas couverts par interface : save, findById, findByXxx, delete, not found returns null

### SQLite — cascade

`workout_exercises ON DELETE CASCADE` → `blocks ON DELETE CASCADE` → `sets ON DELETE CASCADE`  
→ supprimer un `workout_exercise` supprime en cascade ses blocks et sets. Le service n'appelle que `weRepo.delete(id)`.

---

## 2. View models

Définis dans `services/WorkoutExerciseService.ts` (pas dans `db/types.ts` — ce sont des compositions, pas des types DB).

```typescript
export interface BlockWithSets {
  id: number;
  name: string;
  order_index: number;
  is_work_block: 0 | 1;
  sets: Set[];
}

export interface WorkoutExerciseDetail {
  id: number;
  workout_id: number;
  order_index: number;
  exercise: Pick<Exercise, 'id' | 'name' | 'technical_notes' | 'muscle_groups'>;
  blocks: BlockWithSets[];
}
```

---

## 3. Service

### Dépendances

```typescript
type TransactionRunner = (fn: () => Promise<void>) => Promise<void>;

class WorkoutExerciseService {
  constructor(
    private weRepo: IWorkoutExerciseRepository,
    private blockRepo: IBlockRepository,
    private setRepo: ISetRepository,
    private exerciseRepo: IExerciseRepository,
    private runInTransaction: TransactionRunner
  )
}
```

**Tests** : `runInTransaction = async (fn) => fn()` (no-op, pas de rollback mais logique métier couverte)  
**Prod** : `runInTransaction = (fn) => db.withTransactionAsync(fn)`

### Méthodes

**`addToWorkout(workoutId, exerciseId): Promise<WorkoutExerciseDetail>`**

1. Valide que l'exercice existe
2. Charge les workout_exercises existants pour calculer `order_index`
3. Dans une transaction :
   - `weRepo.save({ workout_id, exercise_id, order_index })`
   - `blockRepo.save({ workout_exercise_id, name: 'Travail', order_index: 0, is_work_block: 1 })`
   - `setRepo.save({ block_id, reps_min: 3, reps_max: 8, weight: null, weight_type: 'fixed', rest_duration: 120, order_index: 0 })`
4. Retourne le `WorkoutExerciseDetail` complet

**`getWithDetails(workoutId): Promise<WorkoutExerciseDetail[]>`**

Pour chaque workout_exercise :
- Charge l'exercice via `exerciseRepo.findById`
- Charge les blocks via `blockRepo.findByWorkoutExerciseId`
- Pour chaque block, charge les sets via `setRepo.findByBlockId`
- Assemble `WorkoutExerciseDetail`

Note : N+1 queries acceptable sur app perso SQLite locale.

**`remove(id): Promise<void>`**

`weRepo.delete(id)` — cascade DB supprime blocks et sets.

### Tests (TDD — Red/Green/Refactor)

- `addToWorkout` : crée les 3 rows, retourne le detail complet
- `addToWorkout` : exercice inexistant → throw
- `addToWorkout` : order_index = nombre d'exercices existants
- `getWithDetails` : retourne tableau vide si aucun exercice
- `getWithDetails` : retourne les details complets (blocks + sets + exercise)
- `remove` : supprime le workout_exercise

---

## 4. Hook

**`useWorkoutExercises(workoutId: number)`**

```typescript
{
  exercises: WorkoutExerciseDetail[],
  loading: boolean,
  error: string | null,
  add: (exerciseId: number) => Promise<void>,
  remove: (workoutExerciseId: number) => Promise<void>,
  refresh: () => void,
}
```

Instancie `WorkoutExerciseService` avec les 4 repos SQLite + `db.withTransactionAsync`.  
Pattern identique à `useWorkouts` / `usePrograms`.

---

## 5. Composants

### `WorkoutExerciseCard`

- Props : `detail: WorkoutExerciseDetail`, `onRemove: () => void`
- État local : `expanded: boolean` (collapsed par défaut)
- Collapsed : nom exercice + muscle_groups (chips ou texte)
- Expanded : liste de `BlockCard`
- Long press → `onRemove` (Alert confirmation)
- Accessibilité : `PressableA11y`, `accessibilityState={{ expanded }}`

### `BlockCard`

- Props : `block: BlockWithSets`
- Header : nom du block (ex: "Travail")
- Sets : liste de lignes format `"N × min–max @ Xkg — Xs"`
  - Si `weight_type === 'bodyweight'` → "PC" à la place du poids
  - Si `weight_type === 'bar'` → "barre"
  - Si `reps_min === reps_max` → "N × X" (pas de fourchette)

---

## 6. Écrans

### `workout/[id].tsx`

- Params : `id` (workout id)
- Charge workout name via `useWorkouts(programId)` — ou un `getById` direct
- Charge exercises via `useWorkoutExercises(workoutId)`
- FlatList de `WorkoutExerciseCard`
- FAB → `router.push('/add-workout-exercise?workoutId=' + workoutId)`
- `useFocusEffect` + `isFirstFocus` pattern (identique à `programme/[id].tsx`)
- Empty state : "Aucun exercice. Appuie sur + pour en ajouter un."

**Problème** : pour charger le workout name, il faut le `programId`. Solutions :
- Passer `programId` en param de route (recommandé — simple)
- Faire un `findById` global dans un repo Workout sans programId

→ Route : `/workout/[id]?programId=X`

### `add-workout-exercise.tsx`

- Params : `workoutId`
- État : `search: string`
- Charge tous les exercices via `useExercises()` (hook existant)
- Filtre par `search` (nom, muscle groups) côté client
- FlatList des exercices filtrés
- Tap → `add(exerciseId)` → `router.back()`
- Pas de multi-sélection Session 7

### `programme/[id].tsx` — modification

```typescript
// Avant
onPress={() => Alert.alert('Bientôt disponible', '...')}

// Après
onPress={() => router.push(`/workout/${item.id}?programId=${programId}`)}
```

---

## 7. Navigation

Nouvelles routes à enregistrer dans `app/_layout.tsx` :

```typescript
<Stack.Screen name="workout/[id]" />
<Stack.Screen name="add-workout-exercise" options={{ presentation: 'modal' }} />
```

---

## 8. Ordre d'implémentation (TDD)

1. **IWorkoutExerciseRepository** → contract → InMemory (Red/Green) → SQLite (Green)
2. **IBlockRepository** → idem
3. **ISetRepository** → idem
4. **WorkoutExerciseService** → tests (Red) → implémentation (Green) → refactor
5. **useWorkoutExercises** hook
6. **WorkoutExerciseCard** + **BlockCard** composants
7. **workout/[id].tsx** écran
8. **add-workout-exercise.tsx** modal
9. **programme/[id].tsx** → brancher la navigation
10. **_layout.tsx** → enregistrer les routes

---

## Hors scope Session 7

- Édition inline des blocks/sets (Session 8)
- Réordonnancement drag-and-drop des exercices (Session 8+)
- Duplication d'exercice
- Fourchettes de reps configurables dans le modal d'ajout
