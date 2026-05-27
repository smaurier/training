# Design — Écran Programmes (Session 6 + 7)

**Date :** 2026-05-27
**Scope :** CRUD complet Programme + Workout (Session 6) · WorkoutExercise + Block + Set (Session 7)

---

## 1. Contexte

L'écran Programmes est un placeholder. Il faut implémenter la gestion complète des programmes d'entraînement : création, édition, suppression, et navigation dans l'arborescence jusqu'à la configuration des séries.

---

## 2. Architecture

Stack identique au module Exercices : Repository → Service → Hook → Screen.

### Arborescence des entités

```
Program ──< Workout ──< WorkoutExercise >── Exercise (existant)
                              ↓
                           Block ──< Set
```

### Couches

```
Screens (UI)
    ↓
Hooks (usePrograms, useWorkouts, useWorkoutExercises, useBlocks)
    ↓
Services (ProgramService, WorkoutService, WorkoutExerciseService, BlockSetService)
    ↓
Repositories (SQLite implementations)
    ↓
SQLite DB (programs, workouts, workout_exercises, blocks, sets)
```

---

## 3. Navigation (drill-down, 4 niveaux)

```
(tabs)/programmes            ← liste tous les programmes
  → /add-programme           ← modal créer/éditer programme
  → /programme/[id]          ← détail programme + liste séances
        → /add-workout       ← modal créer/éditer séance
        → /workout/[id]      ← détail séance + exercices (Session 7)
              → /workout-exercise/[id]  ← config blocs + séries (Session 7)
```

**Règle modale :** `add-programme` et `add-workout` sont des modals. Ils reçoivent un `id` optionnel — si présent : mode édition (formulaire pré-rempli), sinon : mode création.

---

## 4. Repositories

### `IProgramRepository`

```ts
interface IProgramRepository {
  findAll(): Promise<Program[]>
  findById(id: number): Promise<Program | null>
  save(dto: CreateProgramDto): Promise<Program>
  update(id: number, dto: UpdateProgramDto): Promise<Program>
  delete(id: number): Promise<void>
}

type CreateProgramDto = Omit<Program, 'id' | 'created_at'>
type UpdateProgramDto = Pick<Program, 'name' | 'description' | 'is_active'>
```

### `IWorkoutRepository`

```ts
interface IWorkoutRepository {
  findByProgramId(programId: number): Promise<Workout[]>
  findById(id: number): Promise<Workout | null>
  save(dto: CreateWorkoutDto): Promise<Workout>
  update(id: number, dto: UpdateWorkoutDto): Promise<Workout>
  delete(id: number): Promise<void>
}

type CreateWorkoutDto = Omit<Workout, 'id'>
type UpdateWorkoutDto = Pick<Workout, 'name' | 'order_index'>
```

**Suppression en cascade :** `delete` sur un Program supprime ses Workouts (SQL `ON DELETE CASCADE`). `delete` sur un Workout supprime ses WorkoutExercises.

> **Prérequis :** Ajouter `PRAGMA foreign_keys = ON` dans `db/index.ts` → `initDatabase()`. SQLite ignore les foreign keys par défaut — sans ce pragma, `ON DELETE CASCADE` ne s'exécute pas.

**Implémentations par interface :**
- `InMemoryProgramRepository` — tableau JS, pour les tests
- `SQLiteProgramRepository` — lecture/écriture table `programs`
- `InMemoryWorkoutRepository` — tableau JS, pour les tests
- `SQLiteWorkoutRepository` — lecture/écriture table `workouts`

**Contract tests** (`programRepository.contract.ts`, `workoutRepository.contract.ts`) — suite partagée InMemory + SQLite.

---

## 5. Services

### `ProgramService`

| Méthode | Validation | Action |
|---|---|---|
| `create(input)` | nom non vide | `repo.save()` |
| `update(id, input)` | nom non vide | `repo.update()` |
| `listAll()` | — | `repo.findAll()` |
| `getById(id)` | — | `repo.findById()` |
| `remove(id)` | — | `repo.delete()` (cascade SQL) |
| `setActive(id)` | — | `is_active=1` sur ce programme, `0` sur les autres |

### `WorkoutService`

| Méthode | Validation | Action |
|---|---|---|
| `create(input)` | nom non vide, programId requis | `repo.save()` |
| `update(id, input)` | nom non vide | `repo.update()` |
| `listByProgram(programId)` | — | `repo.findByProgramId()` |
| `getById(id)` | — | `repo.findById()` |
| `remove(id)` | — | `repo.delete()` |

**Tests :** Red → Green → Refactor. Cas couverts : happy path, validation nom vide, ID inexistant.

---

## 6. Hooks

### `usePrograms()`

```ts
interface UseProgramsResult {
  programs: Program[]
  loading: boolean
  error: string | null
  create: (input: CreateProgramInput) => Promise<void>
  update: (id: number, input: UpdateProgramInput) => Promise<void>
  remove: (id: number) => Promise<void>
  refresh: () => Promise<void>
}
```

### `useWorkouts(programId: number)`

```ts
interface UseWorkoutsResult {
  workouts: Workout[]
  loading: boolean
  error: string | null
  create: (input: CreateWorkoutInput) => Promise<void>
  update: (id: number, input: UpdateWorkoutInput) => Promise<void>
  remove: (id: number) => Promise<void>
  refresh: () => Promise<void>
}
```

**Patterns communs :**
- `mountedRef` guard (évite setState après unmount)
- `serviceRef` initialisé une seule fois
- `refresh` via `useCallback`
- Erreurs surfacées dans `error` ET propagées au caller
- `useWorkouts` : `useEffect` dépend de `[refresh, programId]`

---

## 7. Écrans

### `(tabs)/programmes.tsx`

- `FlatList` des programmes
- Chaque carte : nom + nombre de séances + badge "actif" si `is_active=1`
- FAB `+` → modal `add-programme`
- Long-press → `Alert.alert` avec options Modifier / Supprimer
- Supprimer → confirmation `Alert.alert` avant suppression effective
- Tap → `programme/[id]`
- État vide : message "Aucun programme. Crée ton premier !"
- `useFocusEffect` + `isFirstFocus` guard (pattern exercices)

### `add-programme.tsx` (modal)

- Params : `id?` (optionnel — mode édition si présent)
- Champs : nom (obligatoire), description (optionnel)
- Bouton "Créer" / "Enregistrer" selon mode
- Ferme + refresh au succès

### `programme/[id].tsx`

- Header : nom du programme + bouton ✎ éditer → modal `add-programme?id=X`
- `FlatList` des séances (nom + "N exercice(s)")
- FAB `+` → modal `add-workout?programId=X`
- Long-press → `Alert.alert` Modifier / Supprimer + confirmation suppression
- Tap → `workout/[id]` (placeholder Session 7)

### `add-workout.tsx` (modal)

- Params : `programId` (obligatoire), `id?` (optionnel — mode édition)
- Champ : nom (obligatoire)
- Ferme + refresh au succès

---

## 8. Accessibilité

Critères appliqués sur chaque écran et composant :

- `accessibilityRole` correct sur tous les éléments interactifs (`button`, `header`, `list`, `listitem`)
- `accessibilityLabel` explicite — pas de labels génériques ("+" → "Créer un programme")
- `accessibilityHint` sur les éléments dont l'action n'est pas évidente
- `accessibilityState` sur les éléments avec état (badge actif : `{ selected: true }`)
- Touch targets ≥ 44×44pt (iOS HIG) / 48×48dp (Material Design)
- Contraste couleurs ≥ 4.5:1 (texte normal), ≥ 3:1 (texte large / icônes) — WCAG AA

Référentiels : WCAG 2.2, EN 301 549, Apple HIG Accessibility, Material Design Accessibility.
Doc annexe dédiée : `docs/accessibilite.md` (à créer en session 6 ou 7).

---

## 9. Fichiers produits — Session 6

```
app/repositories/
  IProgramRepository.ts
  InMemoryProgramRepository.ts
  SQLiteProgramRepository.ts
  programRepository.contract.ts
  InMemoryProgramRepository.test.ts
  IWorkoutRepository.ts
  InMemoryWorkoutRepository.ts
  SQLiteWorkoutRepository.ts
  workoutRepository.contract.ts
  InMemoryWorkoutRepository.test.ts
app/services/
  ProgramService.ts
  ProgramService.test.ts
  WorkoutService.ts
  WorkoutService.test.ts
app/hooks/
  usePrograms.ts
  useWorkouts.ts
app/app/
  add-programme.tsx
  programme/[id].tsx
  add-workout.tsx
  (tabs)/programmes.tsx   ← remplace le placeholder
```

---

## 10. Fichiers produits — Session 7

```
app/repositories/
  IWorkoutExerciseRepository.ts + impls + tests
  IBlockRepository.ts + impls + tests
  ISetRepository.ts + impls + tests
app/services/
  WorkoutExerciseService.ts + .test.ts
  BlockSetService.ts + .test.ts
app/hooks/
  useWorkoutExercises.ts
  useBlockSets.ts
app/app/
  workout/[id].tsx
  workout-exercise/[id].tsx
  add-workout-exercise.tsx
```
