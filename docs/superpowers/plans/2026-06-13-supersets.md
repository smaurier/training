# Supersets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de lier N exercices (A→B→C) dans un workout pour les enchaîner sans pause en séance — repos uniquement après le dernier exercice du groupe.

**Architecture:** Nouvelle colonne `superset_group_id INTEGER` sur `workout_exercises` (migration v13). `WorkoutExerciseService` gagne `linkToNext(aId, bId)` et `unlink(id)`. `advancePosition` dans `useSession.ts` est étendue pour router en round-robin (A→B→C→repos→A tour suivant) ; `validateSet` et `skipExercise` utilisent deux helpers `isSupersetForward`/`isSupersetNextRound` pour supprimer le repos/transition intra-groupe. L'éditeur de workout affiche un bouton "🔗 Grouper" et un group container violet.

**Tech Stack:** React Native, Expo SDK 54, TypeScript strict, expo-sqlite, Jest (TDD), @gorhom/bottom-sheet

---

## Fichiers

| Fichier | Action |
|---|---|
| `app/db/schema.ts` | Modifier — migration v13 |
| `app/db/types.ts` | Modifier — `superset_group_id` sur `WorkoutExercise` |
| `app/repositories/IWorkoutExerciseRepository.ts` | Modifier — `updateSuperset` + `CreateWorkoutExerciseDto` |
| `app/repositories/InMemoryWorkoutExerciseRepository.ts` | Modifier — implémenter `updateSuperset` |
| `app/repositories/SQLiteWorkoutExerciseRepository.ts` | Modifier — implémenter `updateSuperset` |
| `app/services/WorkoutExerciseService.ts` | Modifier — `superset_group_id` dans `WorkoutExerciseDetail` + `loadDetail` + `linkToNext` + `unlink` |
| `app/services/WorkoutExerciseService.test.ts` | Modifier — TDD linkToNext/unlink (4 tests) |
| `app/hooks/useWorkoutExercises.ts` | Modifier — exposer `linkToNext(aId, bId)` + `unlink(id)` |
| `app/hooks/useSession.ts` | Modifier — `advancePosition` superset + `isSupersetForward` + `isSupersetNextRound` + `validateSet` + `skipExercise` |
| `app/hooks/useSession.test.ts` | Créer — TDD advancePosition superset (8 tests) |
| `app/components/session/RunningPhase.tsx` | Modifier — prop `supersetPosition` + badge + texte skip |
| `app/components/session/ExerciseTransitionPhase.tsx` | Modifier — prop `supersetGroup` + preview A→B→C |
| `app/components/workout/WorkoutExerciseCard.tsx` | Modifier — props `supersetGroupLabel` + `isLastInWorkout` + `onLinkToNext` + `onUnlink` |
| `app/app/workout/[id].tsx` | Modifier — `buildRenderItems` + group container + passer props |
| `app/app/session/[workoutId].tsx` | Modifier — `getSupersetPosition` + `getSupersetGroup` + passer props |

---

### Task 1 : Schema + types

**Files:**
- Modify: `app/db/schema.ts`
- Modify: `app/db/types.ts`
- Modify: `app/repositories/IWorkoutExerciseRepository.ts`
- Modify: `app/services/WorkoutExerciseService.ts`

- [ ] **Step 1 : Migration v13 dans `app/db/schema.ts`**

À la fin du tableau `MIGRATIONS`, après la migration v12 (`goals`), ajouter :

```typescript
  // v13 — supersets : grouper des exercices en round-robin
  `ALTER TABLE workout_exercises ADD COLUMN superset_group_id INTEGER;`,
```

- [ ] **Step 2 : Ajouter `superset_group_id` dans `app/db/types.ts`**

Dans l'interface `WorkoutExercise` (lignes 33-38), ajouter après `order_index` :

```typescript
  superset_group_id: number | null;
```

- [ ] **Step 3 : Mettre à jour `CreateWorkoutExerciseDto` dans `app/repositories/IWorkoutExerciseRepository.ts`**

Remplacer :
```typescript
export type CreateWorkoutExerciseDto = Omit<WorkoutExercise, 'id'>;
```
Par :
```typescript
export type CreateWorkoutExerciseDto = Omit<WorkoutExercise, 'id' | 'superset_group_id'>;
```

Ajouter `updateSuperset` dans l'interface `IWorkoutExerciseRepository` :
```typescript
  updateSuperset(id: number, groupId: number | null): Promise<void>;
```

Le fichier complet devient :
```typescript
import type { WorkoutExercise } from '../db/types';

export type CreateWorkoutExerciseDto = Omit<WorkoutExercise, 'id' | 'superset_group_id'>;

export interface IWorkoutExerciseRepository {
  findByWorkoutId(workoutId: number): Promise<WorkoutExercise[]>;
  findById(id: number): Promise<WorkoutExercise | null>;
  save(dto: CreateWorkoutExerciseDto): Promise<WorkoutExercise>;
  delete(id: number): Promise<void>;
  swap(idA: number, idB: number): Promise<void>;
  updateSuperset(id: number, groupId: number | null): Promise<void>;
}
```

- [ ] **Step 4 : Ajouter `superset_group_id` dans `WorkoutExerciseDetail` + `loadDetail` dans `app/services/WorkoutExerciseService.ts`**

Dans l'interface `WorkoutExerciseDetail` (lignes 17-23), ajouter après `order_index` :
```typescript
  superset_group_id: number | null;
```

Dans la méthode privée `loadDetail` (vers la fin du fichier), modifier le `return` pour inclure `superset_group_id` :
```typescript
    return {
      id: we.id,
      workout_id: we.workout_id,
      order_index: we.order_index,
      superset_group_id: we.superset_group_id,
      exercise: {
        id: exercise.id,
        name: exercise.name,
        type: exercise.type,
        technical_notes: exercise.technical_notes,
        muscle_groups: exercise.muscle_groups,
        description: exercise.description,
      },
      blocks: blocksWithSets,
    };
```

- [ ] **Step 5 : Vérifier TypeScript**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -20
```

Attendu : quelques erreurs sur `InMemoryWorkoutExerciseRepository` (superset_group_id manquant dans save) et `SQLiteWorkoutExerciseRepository` (`updateSuperset` non implémenté) — normal, sera corrigé en Task 2.

- [ ] **Step 6 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/db/schema.ts app/db/types.ts app/repositories/IWorkoutExerciseRepository.ts app/services/WorkoutExerciseService.ts && git commit -m "feat(supersets): migration v13 + types superset_group_id + IWorkoutExerciseRepository.updateSuperset"
```

---

### Task 2 : Repository — `updateSuperset` (TDD)

**Files:**
- Modify: `app/repositories/InMemoryWorkoutExerciseRepository.ts`
- Modify: `app/repositories/SQLiteWorkoutExerciseRepository.ts`
- Modify: `app/repositories/InMemoryWorkoutExerciseRepository.test.ts`

**Contexte :**
- `InMemoryWorkoutExerciseRepository.save()` doit initialiser `superset_group_id: null` car le DTO l'omet désormais.
- `updateSuperset(id, groupId)` : met à jour `superset_group_id` sur l'entrée ciblée.
- Le test existant dans `InMemoryWorkoutExerciseRepository.test.ts` suit le pattern `contract.ts` — ajouter les tests en fin de fichier.

- [ ] **Step 1 : Écrire les tests RED dans `app/repositories/InMemoryWorkoutExerciseRepository.test.ts`**

Ajouter à la fin du fichier :

```typescript
describe('InMemoryWorkoutExerciseRepository.updateSuperset', () => {
  it('assigne groupId non-null', async () => {
    const repo = new InMemoryWorkoutExerciseRepository();
    const saved = await repo.save({ workout_id: 1, exercise_id: 1, order_index: 0 });
    await repo.updateSuperset(saved.id, 42);
    const updated = await repo.findById(saved.id);
    expect(updated?.superset_group_id).toBe(42);
  });

  it('remet à null', async () => {
    const repo = new InMemoryWorkoutExerciseRepository();
    const saved = await repo.save({ workout_id: 1, exercise_id: 1, order_index: 0 });
    await repo.updateSuperset(saved.id, 42);
    await repo.updateSuperset(saved.id, null);
    const updated = await repo.findById(saved.id);
    expect(updated?.superset_group_id).toBeNull();
  });
});
```

- [ ] **Step 2 : Vérifier RED**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="InMemoryWorkoutExerciseRepository" --no-coverage 2>&1 | tail -10
```

Attendu : FAIL — `repo.updateSuperset is not a function`

- [ ] **Step 3 : Implémenter dans `app/repositories/InMemoryWorkoutExerciseRepository.ts`**

Modifier `save` pour initialiser `superset_group_id` :
```typescript
  async save(dto: CreateWorkoutExerciseDto): Promise<WorkoutExercise> {
    const item: WorkoutExercise = { ...dto, id: this.nextId++, superset_group_id: null };
    this.items.push(item);
    return item;
  }
```

Ajouter `updateSuperset` après `swap` :
```typescript
  async updateSuperset(id: number, groupId: number | null): Promise<void> {
    const item = this.items.find(i => i.id === id);
    if (item) item.superset_group_id = groupId;
  }
```

- [ ] **Step 4 : Vérifier GREEN**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="InMemoryWorkoutExerciseRepository" --no-coverage 2>&1 | tail -5
```

Attendu : PASS

- [ ] **Step 5 : Implémenter dans `app/repositories/SQLiteWorkoutExerciseRepository.ts`**

Ajouter `updateSuperset` après `swap` :
```typescript
  async updateSuperset(id: number, groupId: number | null): Promise<void> {
    await this.db.runAsync(
      'UPDATE workout_exercises SET superset_group_id = ? WHERE id = ?',
      [groupId, id]
    );
  }
```

- [ ] **Step 6 : Suite complète + TS**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -10 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : erreurs TS restantes uniquement sur `WorkoutExerciseService` (linkToNext/unlink non implémentés) — sera corrigé Task 3. Tous les tests existants passent.

- [ ] **Step 7 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/repositories/InMemoryWorkoutExerciseRepository.ts app/repositories/SQLiteWorkoutExerciseRepository.ts app/repositories/InMemoryWorkoutExerciseRepository.test.ts && git commit -m "feat(supersets): updateSuperset — InMemory + SQLite (TDD)"
```

---

### Task 3 : `WorkoutExerciseService` — `linkToNext` + `unlink` (TDD)

**Files:**
- Modify: `app/services/WorkoutExerciseService.ts`
- Modify: `app/services/WorkoutExerciseService.test.ts`

**Contexte :**
- `makeService()` dans le test retourne `{ service, exerciseRepo }`. Utiliser ce même pattern pour les nouveaux tests.
- `seedExercise(exerciseRepo)` crée un exercice. Copier le pattern existant pour créer plusieurs exercices.
- `service.addToWorkout(workoutId, exerciseId)` retourne un `WorkoutExerciseDetail` avec `.id` = workout_exercise id.
- `linkToNext(aId, bId)` : priorité groupId — B d'abord, puis A, puis MAX+1.
- `unlink(id)` : dissout tout le groupe (tous les membres repassent à null).

- [ ] **Step 1 : Écrire les 4 tests RED dans `app/services/WorkoutExerciseService.test.ts`**

Ajouter un nouveau `describe` à la fin du fichier :

```typescript
describe('WorkoutExerciseService — supersets', () => {
  async function seedTwo() {
    const { service, exerciseRepo } = makeService();
    const exA = await seedExercise(exerciseRepo);
    const exB = await exerciseRepo.save({ ...exA, name: 'Triceps' });
    const weA = await service.addToWorkout(1, exA.id);
    const weB = await service.addToWorkout(1, exB.id);
    return { service, weA, weB };
  }

  describe('linkToNext', () => {
    it('assigne le même groupId non-null aux deux exercices', async () => {
      const { service, weA, weB } = await seedTwo();
      await service.linkToNext(weA.id, weB.id);
      const details = await service.getWithDetails(1);
      expect(details[0].superset_group_id).not.toBeNull();
      expect(details[0].superset_group_id).toBe(details[1].superset_group_id);
    });

    it('ajoute un troisième exercice au groupe existant de B', async () => {
      const { service, exerciseRepo } = makeService();
      const exA = await seedExercise(exerciseRepo);
      const exB = await exerciseRepo.save({ ...exA, name: 'B' });
      const exC = await exerciseRepo.save({ ...exA, name: 'C' });
      const weA = await service.addToWorkout(1, exA.id);
      const weB = await service.addToWorkout(1, exB.id);
      const weC = await service.addToWorkout(1, exC.id);
      // B+C déjà dans le même groupe
      await service.linkToNext(weB.id, weC.id);
      // On lie A au groupe de B
      await service.linkToNext(weA.id, weB.id);
      const details = await service.getWithDetails(1);
      const gids = details.map(d => d.superset_group_id);
      expect(gids[0]).not.toBeNull();
      expect(gids[0]).toBe(gids[1]);
      expect(gids[1]).toBe(gids[2]);
    });
  });

  describe('unlink', () => {
    it('dissout tout le groupe — tous les membres repassent à null', async () => {
      const { service, weA, weB } = await seedTwo();
      await service.linkToNext(weA.id, weB.id);
      await service.unlink(weA.id);
      const details = await service.getWithDetails(1);
      expect(details[0].superset_group_id).toBeNull();
      expect(details[1].superset_group_id).toBeNull();
    });

    it('no-op sur un exercice standalone', async () => {
      const { service, weA } = await seedTwo();
      await expect(service.unlink(weA.id)).resolves.not.toThrow();
      const details = await service.getWithDetails(1);
      expect(details[0].superset_group_id).toBeNull();
    });
  });
});
```

- [ ] **Step 2 : Vérifier RED**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="WorkoutExerciseService" --no-coverage 2>&1 | tail -10
```

Attendu : FAIL — `service.linkToNext is not a function`

- [ ] **Step 3 : Implémenter `linkToNext` et `unlink` dans `app/services/WorkoutExerciseService.ts`**

Ajouter avant `private async loadDetail` :

```typescript
  async linkToNext(aId: number, bId: number): Promise<void> {
    const a = await this.weRepo.findById(aId);
    const b = await this.weRepo.findById(bId);
    if (!a || !b) throw new Error(`linkToNext: workout_exercise introuvable`);

    let newGroupId: number;
    if (b.superset_group_id != null) {
      newGroupId = b.superset_group_id;
    } else if (a.superset_group_id != null) {
      newGroupId = a.superset_group_id;
    } else {
      const all = await this.weRepo.findByWorkoutId(a.workout_id);
      const max = Math.max(0, ...all.map(e => e.superset_group_id ?? 0));
      newGroupId = max + 1;
    }

    await this.weRepo.updateSuperset(aId, newGroupId);
    await this.weRepo.updateSuperset(bId, newGroupId);
  }

  async unlink(workoutExerciseId: number): Promise<void> {
    const we = await this.weRepo.findById(workoutExerciseId);
    if (!we || we.superset_group_id == null) return;
    const groupId = we.superset_group_id;
    const all = await this.weRepo.findByWorkoutId(we.workout_id);
    const members = all.filter(e => e.superset_group_id === groupId);
    await Promise.all(members.map(m => this.weRepo.updateSuperset(m.id, null)));
  }
```

- [ ] **Step 4 : Vérifier GREEN**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="WorkoutExerciseService" --no-coverage 2>&1 | tail -5
```

Attendu : PASS — tous les tests du fichier passent.

- [ ] **Step 5 : Suite complète + TS**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -10 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/services/WorkoutExerciseService.ts app/services/WorkoutExerciseService.test.ts && git commit -m "feat(supersets): WorkoutExerciseService.linkToNext + unlink (TDD)"
```

---

### Task 4 : `useWorkoutExercises` — exposer `linkToNext` + `unlink`

**Files:**
- Modify: `app/hooks/useWorkoutExercises.ts`

**Contexte :**
- Pattern de tous les callbacks : `try { await service.method(); await refresh(); } catch (e) { setError(...); throw e; }`
- Ajouter `linkToNext` et `unlink` à `UseWorkoutExercisesResult` et au `return`.
- Le hook expose `linkToNext(aId: number, bId: number)` (même signature que le service).

- [ ] **Step 1 : Ajouter `linkToNext` et `unlink` à l'interface `UseWorkoutExercisesResult`**

Après `reorderSet` dans l'interface (ligne 26) :
```typescript
  linkToNext: (aId: number, bId: number) => Promise<void>;
  unlink: (id: number) => Promise<void>;
```

- [ ] **Step 2 : Implémenter les callbacks**

Après `reorderSet` useCallback (avant le `return`) :

```typescript
  const linkToNext = useCallback(async (aId: number, bId: number) => {
    try {
      await service.linkToNext(aId, bId);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const unlink = useCallback(async (id: number) => {
    try {
      await service.unlink(id);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);
```

- [ ] **Step 3 : Ajouter au `return`**

```typescript
  return {
    exercises, loading, error,
    add, remove, refresh,
    updateSet, addSet, removeSet,
    addBlock, updateBlock, removeBlock,
    reorderExercise, reorderBlock, reorderSet,
    linkToNext, unlink,
  };
```

- [ ] **Step 4 : TypeScript + suite complète**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -10 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 5 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/hooks/useWorkoutExercises.ts && git commit -m "feat(supersets): useWorkoutExercises expose linkToNext + unlink"
```

---

### Task 5 : Session routing — `advancePosition` + helpers (TDD)

**Files:**
- Modify: `app/hooks/useSession.ts`
- Create: `app/hooks/useSession.test.ts`

**Contexte :**
- `advancePosition` est exportée depuis `useSession.ts` (ligne 70-83). Sa signature reste `(position: SessionPosition, details: WorkoutExerciseDetail[]) => SessionPosition | null`.
- Deux nouveaux helpers EXPORTÉS : `isSupersetForward` et `isSupersetNextRound`. Les exporter permet de les tester directement.
- `WorkoutExerciseDetail` vient de `'../services/WorkoutExerciseService'`.
- Pour construire les faux détails dans les tests, utiliser la factory `makeDetail` ci-dessous.
- `SessionPosition = { exerciseIdx: number; blockIdx: number; setIdx: number }`.

- [ ] **Step 1 : Écrire les 8 tests RED dans `app/hooks/useSession.test.ts` (nouveau fichier)**

```typescript
import { advancePosition, isSupersetForward, isSupersetNextRound } from './useSession';
import type { WorkoutExerciseDetail } from '../services/WorkoutExerciseService';

function makeDetail(exerciseIdx: number, groupId: number | null = null, numSets = 3): WorkoutExerciseDetail {
  const sets = Array.from({ length: numSets }, (_, i) => ({
    id: exerciseIdx * 10 + i + 1,
    block_id: exerciseIdx + 1,
    reps_min: 5,
    weight: 80,
    weight_type: 'fixed' as const,
    rest_duration: 90,
    order_index: i,
    duration_seconds: null,
    weight_ratio: null,
  }));
  return {
    id: exerciseIdx + 1,
    workout_id: 1,
    order_index: exerciseIdx,
    superset_group_id: groupId,
    exercise: {
      id: exerciseIdx + 1,
      name: `Ex${exerciseIdx}`,
      type: 'musculation',
      technical_notes: null,
      muscle_groups: '[]',
      description: null,
    },
    blocks: [{ id: exerciseIdx + 1, name: 'Travail', order_index: 0, is_work_block: 1, sets }],
  };
}

// details: [standalone, A(group1), B(group1), C(group1), standalone]
// exerciseIdx:  0         1          2          3          4
const GROUP_ID = 1;
function makeDetails() {
  return [
    makeDetail(0),              // standalone
    makeDetail(1, GROUP_ID),    // A
    makeDetail(2, GROUP_ID),    // B
    makeDetail(3, GROUP_ID),    // C
    makeDetail(4),              // standalone after group
  ];
}

describe('advancePosition — supersets', () => {
  it('A→B : avance au prochain exercice du groupe, même setIdx', () => {
    const details = makeDetails();
    const pos = { exerciseIdx: 1, blockIdx: 0, setIdx: 0 }; // A, set 0
    const next = advancePosition(pos, details);
    expect(next).toEqual({ exerciseIdx: 2, blockIdx: 0, setIdx: 0 }); // B, set 0
  });

  it('B→C : avance encore dans le groupe', () => {
    const details = makeDetails();
    const pos = { exerciseIdx: 2, blockIdx: 0, setIdx: 0 }; // B, set 0
    const next = advancePosition(pos, details);
    expect(next).toEqual({ exerciseIdx: 3, blockIdx: 0, setIdx: 0 }); // C, set 0
  });

  it('C (dernier du groupe) → A tour suivant (setIdx+1)', () => {
    const details = makeDetails();
    const pos = { exerciseIdx: 3, blockIdx: 0, setIdx: 0 }; // C, set 0
    const next = advancePosition(pos, details);
    expect(next).toEqual({ exerciseIdx: 1, blockIdx: 0, setIdx: 1 }); // A, set 1
  });

  it('C dernier tour → exercice standalone après le groupe', () => {
    const details = makeDetails();
    const pos = { exerciseIdx: 3, blockIdx: 0, setIdx: 2 }; // C, set 2 (dernier)
    const next = advancePosition(pos, details);
    expect(next).toEqual({ exerciseIdx: 4, blockIdx: 0, setIdx: 0 }); // standalone après
  });

  it('C dernier tour sans exercice suivant → null', () => {
    const details = [makeDetail(0, GROUP_ID), makeDetail(1, GROUP_ID)];
    const pos = { exerciseIdx: 1, blockIdx: 0, setIdx: 2 }; // dernier set, dernier exercice
    const next = advancePosition(pos, details);
    expect(next).toBeNull();
  });

  it('groupe à un seul membre : comportement standalone', () => {
    const details = [makeDetail(0, 99)]; // seul dans son groupe
    const pos = { exerciseIdx: 0, blockIdx: 0, setIdx: 0 };
    const next = advancePosition(pos, details);
    // dernier du groupe, plus de tours (un seul set) → null
    const details3 = [makeDetail(0, 99, 1)];
    const next3 = advancePosition({ exerciseIdx: 0, blockIdx: 0, setIdx: 0 }, details3);
    expect(next3).toBeNull();
  });
});

describe('isSupersetForward', () => {
  it('A→B dans le même groupe → true', () => {
    const details = makeDetails();
    expect(isSupersetForward({ exerciseIdx: 1, blockIdx: 0, setIdx: 0 }, { exerciseIdx: 2, blockIdx: 0, setIdx: 0 }, details)).toBe(true);
  });

  it('C→A (retour début de groupe) → false', () => {
    const details = makeDetails();
    expect(isSupersetForward({ exerciseIdx: 3, blockIdx: 0, setIdx: 0 }, { exerciseIdx: 1, blockIdx: 0, setIdx: 1 }, details)).toBe(false);
  });
});
```

- [ ] **Step 2 : Vérifier RED**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="hooks/useSession" --no-coverage 2>&1 | tail -15
```

Attendu : FAIL — `isSupersetForward is not exported` ou `advancePosition` échoue les tests superset.

- [ ] **Step 3 : Exporter les helpers et modifier `advancePosition` dans `app/hooks/useSession.ts`**

**3a.** Après `export function advancePosition(...)` (ligne 70), ajouter les deux helpers exportés. Les placer AVANT `advancePosition` pour éviter les erreurs de référence :

```typescript
export function isSupersetForward(
  current: SessionPosition,
  next: SessionPosition,
  details: WorkoutExerciseDetail[]
): boolean {
  const currentGroupId = details[current.exerciseIdx]?.superset_group_id;
  if (currentGroupId == null) return false;
  if (details[next.exerciseIdx]?.superset_group_id !== currentGroupId) return false;
  const group = details
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.superset_group_id === currentGroupId)
    .sort((a, b) => a.i - b.i);
  const currentPos = group.findIndex(g => g.i === current.exerciseIdx);
  const nextPos = group.findIndex(g => g.i === next.exerciseIdx);
  return nextPos > currentPos;
}

export function isSupersetNextRound(
  current: SessionPosition,
  next: SessionPosition,
  details: WorkoutExerciseDetail[]
): boolean {
  const currentGroupId = details[current.exerciseIdx]?.superset_group_id;
  if (currentGroupId == null) return false;
  if (details[next.exerciseIdx]?.superset_group_id !== currentGroupId) return false;
  const group = details
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.superset_group_id === currentGroupId)
    .sort((a, b) => a.i - b.i);
  const currentPos = group.findIndex(g => g.i === current.exerciseIdx);
  const nextPos = group.findIndex(g => g.i === next.exerciseIdx);
  return nextPos < currentPos;
}
```

**3b.** Modifier `advancePosition` — ajouter la logique superset EN TÊTE de fonction, avant le code standard :

```typescript
export function advancePosition(
  position: SessionPosition,
  details: WorkoutExerciseDetail[]
): SessionPosition | null {
  const { exerciseIdx, blockIdx, setIdx } = position;

  // --- SUPERSET ROUTING ---
  const currentGroupId = details[exerciseIdx]?.superset_group_id;
  if (currentGroupId != null) {
    const groupExercises = details
      .map((d, i) => ({ detail: d, exerciseIdx: i }))
      .filter(({ detail }) => detail.superset_group_id === currentGroupId)
      .sort((a, b) => a.exerciseIdx - b.exerciseIdx);

    const posInGroup = groupExercises.findIndex(g => g.exerciseIdx === exerciseIdx);
    const isLastInGroup = posInGroup === groupExercises.length - 1;

    if (!isLastInGroup) {
      const next = groupExercises[posInGroup + 1];
      return { exerciseIdx: next.exerciseIdx, blockIdx: 0, setIdx };
    }

    // Dernier du groupe : vérifier s'il reste des tours
    const firstInGroup = groupExercises[0];
    const firstBlock = details[firstInGroup.exerciseIdx]?.blocks[0];
    if (firstBlock && setIdx + 1 < firstBlock.sets.length) {
      return { exerciseIdx: firstInGroup.exerciseIdx, blockIdx: 0, setIdx: setIdx + 1 };
    }

    // Tous les tours terminés : exercice après le groupe
    const lastGroupExerciseIdx = groupExercises[groupExercises.length - 1].exerciseIdx;
    if (lastGroupExerciseIdx + 1 < details.length) {
      return { exerciseIdx: lastGroupExerciseIdx + 1, blockIdx: 0, setIdx: 0 };
    }
    return null;
  }

  // --- LOGIQUE STANDARD (inchangée) ---
  const exercise = details[exerciseIdx];
  if (!exercise) return null;
  const block = exercise.blocks[blockIdx];
  if (!block) return null;
  if (setIdx + 1 < block.sets.length) return { exerciseIdx, blockIdx, setIdx: setIdx + 1 };
  if (blockIdx + 1 < exercise.blocks.length) return { exerciseIdx, blockIdx: blockIdx + 1, setIdx: 0 };
  if (exerciseIdx + 1 < details.length) return { exerciseIdx: exerciseIdx + 1, blockIdx: 0, setIdx: 0 };
  return null;
}
```

- [ ] **Step 4 : Vérifier GREEN**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="hooks/useSession" --no-coverage 2>&1 | tail -5
```

Attendu : PASS — 8 tests passent.

- [ ] **Step 5 : Suite complète + TS**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -10 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/hooks/useSession.ts app/hooks/useSession.test.ts && git commit -m "feat(supersets): advancePosition superset routing + isSupersetForward/NextRound (TDD)"
```

---

### Task 6 : Session routing — `validateSet` + `skipExercise` wiring

**Files:**
- Modify: `app/hooks/useSession.ts`

**Contexte :**
- `validateSet` se trouve dans `useSession.ts` (callback `useCallback`, lignes ~176-219). Le code actuel après `advancePosition` :
  ```typescript
  const next = advancePosition(position, workoutDetails);
  if (next === null) { /* complète session */ }
  const exerciseChanges = next.exerciseIdx !== position.exerciseIdx;
  if (exerciseChanges) setStartingWeightDone(false);
  if (completedRestDuration === 0) {
    setPosition(next);
    setPhase(exerciseChanges ? 'exercise_transition' : 'running');
    return isPR;
  }
  setRestDuration(completedRestDuration);
  setPendingPhase(exerciseChanges ? 'exercise_transition' : 'running');
  setNextLabel(computeNextLabel(next, workoutDetails, exerciseChanges));
  setPosition(next);
  setPhase('rest');
  ```
- `skipExercise` se trouve plus bas (lignes ~277-295). Il calcule `nextExerciseIdx = position.exerciseIdx + 1`.
- Pas de nouveaux tests unitaires — comportement vérifié via UI.

- [ ] **Step 1 : Modifier `validateSet` pour gérer les supersets**

Localiser le bloc après `const next = advancePosition(position, workoutDetails);` dans `validateSet`. Remplacer le code qui suit (depuis `if (next === null)` jusqu'à `setPhase('rest')`) par :

```typescript
      if (next === null) {
        await service.completeSession(sessionLogId);
        try {
          const progs = await service.calculateProgressions(sessionLogId, plateStep);
          setProgressions(progs);
        } catch {
          setProgressions([]);
        }
        setPhase('summary');
        return isPR;
      }

      // Superset : enchaîner sans repos ni transition
      if (isSupersetForward(position, next, workoutDetails)) {
        setPosition(next);
        setPhase('running');
        return isPR;
      }

      const supersetNextRound = isSupersetNextRound(position, next, workoutDetails);
      const exerciseChanges = next.exerciseIdx !== position.exerciseIdx;
      if (exerciseChanges) setStartingWeightDone(false);

      if (completedRestDuration === 0) {
        setPosition(next);
        setPhase(exerciseChanges && !supersetNextRound ? 'exercise_transition' : 'running');
        return isPR;
      }

      setRestDuration(completedRestDuration);
      setPendingPhase(exerciseChanges && !supersetNextRound ? 'exercise_transition' : 'running');
      setNextLabel(computeNextLabel(next, workoutDetails, exerciseChanges && !supersetNextRound));
      setPosition(next);
      setPhase('rest');
      return isPR;
```

- [ ] **Step 2 : Modifier `skipExercise` pour sauter le groupe entier**

Localiser `skipExercise` useCallback. Remplacer la ligne :
```typescript
    const nextExerciseIdx = position.exerciseIdx + 1;
```
Par :
```typescript
      const currentGroupId = workoutDetails[position.exerciseIdx]?.superset_group_id;
      let nextExerciseIdx: number;
      if (currentGroupId != null) {
        const groupIndices = workoutDetails
          .map((d, i) => ({ d, i }))
          .filter(({ d }) => d.superset_group_id === currentGroupId)
          .map(({ i }) => i);
        nextExerciseIdx = Math.max(...groupIndices) + 1;
      } else {
        nextExerciseIdx = position.exerciseIdx + 1;
      }
```

Puis vérifier que le reste du callback utilise `nextExerciseIdx` (et non `position.exerciseIdx + 1` en dur) — ce qui devrait déjà être le cas.

- [ ] **Step 3 : TypeScript + suite complète**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -10 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 4 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/hooks/useSession.ts && git commit -m "feat(supersets): validateSet + skipExercise superset routing wiring"
```

---

### Task 7 : Session UX — RunningPhase badge + `[workoutId].tsx`

**Files:**
- Modify: `app/components/session/RunningPhase.tsx`
- Modify: `app/app/session/[workoutId].tsx`

**Contexte :**
- `RunningPhase` reçoit une nouvelle prop `supersetPosition?: { current: number; total: number }`.
- Dans `[workoutId].tsx`, le helper `getSupersetPosition` est une fonction pure locale (non exportée).
- `RunningPhase` affiche également le texte du bouton skip différemment si superset — nécessite une prop `supersetExerciseNames?: string[]` pour construire le texte `"Passer le superset entier (A · B · C)"`.
- Le BottomSheet skip est dans `RunningPhase.tsx` — le bouton destructif est à la ligne `"Passer l'exercice entier"`.

- [ ] **Step 1 : Ajouter les props et le badge dans `app/components/session/RunningPhase.tsx`**

**1a.** Dans l'interface `RunningPhaseProps` (lignes 32-44), ajouter :
```typescript
  supersetPosition?: { current: number; total: number };
  supersetExerciseNames?: string[];
```

**1b.** Dans la destructuration de la fonction (ligne 68), ajouter `supersetPosition` et `supersetExerciseNames` :
```typescript
export function RunningPhase({ exercise, block, set, progressLabel, onValidate, onSkip, onSkipExercise, onUndo, canUndo, lastSetLog, onAdjustWeight, supersetPosition, supersetExerciseNames }: RunningPhaseProps) {
```

**1c.** Dans le header (après le badge bloc existant `<View style={styles.blockBadge}>`), ajouter le badge superset :
```tsx
            {supersetPosition && (
              <View style={styles.supersetBadge}>
                <Text style={styles.supersetBadgeText}>
                  SUPERSET · {supersetPosition.current}/{supersetPosition.total}
                </Text>
              </View>
            )}
```

**1d.** Dans le `StyleSheet.create`, ajouter après `blockBadgeText` :
```typescript
  supersetBadge: { alignSelf: 'flex-start', marginTop: 2, backgroundColor: '#7c3aed', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  supersetBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
```

**1e.** Dans le BottomSheet skip, remplacer le texte du bouton destructif :
```tsx
          <PressableA11y
            accessibilityLabel={supersetExerciseNames
              ? `Passer le superset entier : ${supersetExerciseNames.join(', ')}`
              : "Passer l'exercice entier — toutes les séries restantes"}
            onPress={() => {
              skipExerciseSheetRef.current?.close();
              onSkipExercise();
            }}
            style={[styles.sheetDestructiveBtn, { backgroundColor: '#dc2626' }]}
          >
            <Text style={styles.sheetBtnText}>
              {supersetExerciseNames
                ? `Passer le superset entier (${supersetExerciseNames.join(' · ')})`
                : "Passer l'exercice entier"}
            </Text>
          </PressableA11y>
```

- [ ] **Step 2 : Ajouter les helpers et passer les props dans `app/app/session/[workoutId].tsx`**

**2a.** Ajouter les deux helpers avant la fonction `SessionContent` (ou juste après les imports) :

```typescript
function getSupersetPosition(
  position: SessionPosition,
  details: WorkoutExerciseDetail[]
): { current: number; total: number } | undefined {
  const groupId = details[position.exerciseIdx]?.superset_group_id;
  if (groupId == null) return undefined;
  const group = details
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.superset_group_id === groupId)
    .sort((a, b) => a.i - b.i);
  const pos = group.findIndex(g => g.i === position.exerciseIdx);
  return { current: pos + 1, total: group.length };
}

function getSupersetExerciseNames(
  position: SessionPosition,
  details: WorkoutExerciseDetail[]
): string[] | undefined {
  const groupId = details[position.exerciseIdx]?.superset_group_id;
  if (groupId == null) return undefined;
  return details
    .filter(d => d.superset_group_id === groupId)
    .sort((a, b) => details.indexOf(a) - details.indexOf(b))
    .map(d => d.exercise.name);
}
```

**2b.** Dans le rendu de `<RunningPhase>` (chercher `<RunningPhase`), passer les nouvelles props :
```tsx
            <RunningPhase
              exercise={session.currentExercise}
              block={session.currentBlock}
              set={session.currentSet}
              progressLabel={session.progressLabel}
              onValidate={handleValidate}
              onSkip={session.skipSet}
              onSkipExercise={session.skipExercise}
              onUndo={session.undoLastSet}
              canUndo={session.canUndo}
              lastSetLog={session.lastSetLog}
              onAdjustWeight={handleAdjustWeight}
              supersetPosition={getSupersetPosition(session.position, workoutDetails)}
              supersetExerciseNames={getSupersetExerciseNames(session.position, workoutDetails)}
            />
```

- [ ] **Step 3 : TypeScript + suite complète**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -10 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 4 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add "app/components/session/RunningPhase.tsx" "app/app/session/[workoutId].tsx" && git commit -m "feat(supersets): badge SUPERSET session + texte skip groupe"
```

---

### Task 8 : `ExerciseTransitionPhase` — preview superset

**Files:**
- Modify: `app/components/session/ExerciseTransitionPhase.tsx`
- Modify: `app/app/session/[workoutId].tsx`

**Contexte :**
- `ExerciseTransitionPhase` reçoit `supersetGroup?: string[]` — noms des exercices du groupe dans l'ordre.
- Afficher seulement si `supersetGroup && supersetGroup.length > 1`.
- Texte : `"Tu vas enchaîner : A → B · repos après B"` (dernier nom pour le repos).
- `getSupersetGroup` est déjà ajouté à `[workoutId].tsx` en Task 7. Si omis, l'ajouter maintenant.

- [ ] **Step 1 : Ajouter la prop et l'affichage dans `app/components/session/ExerciseTransitionPhase.tsx`**

**1a.** Dans l'interface `ExerciseTransitionPhaseProps` (lignes 8-13), ajouter :
```typescript
  supersetGroup?: string[];
```

**1b.** Dans la destructuration de la fonction (ligne 38), ajouter `supersetGroup` :
```typescript
export function ExerciseTransitionPhase({
  exercise,
  exerciseNumber,
  totalExercises,
  onContinue,
  supersetGroup,
}: ExerciseTransitionPhaseProps) {
```

**1c.** Dans le ScrollView content (après `workSummary`), ajouter avant le séparateur description :
```tsx
        {supersetGroup && supersetGroup.length > 1 && (
          <View style={[styles.supersetPreview, { backgroundColor: '#7c3aed20', borderColor: '#7c3aed', borderWidth: 1, borderRadius: 8, padding: 12 }]}>
            <Text style={[styles.supersetPreviewLabel, { color: '#7c3aed' }]}>
              {'Tu vas enchaîner :'}
            </Text>
            <Text style={[styles.supersetPreviewChain, { color: colors.text }]}>
              {supersetGroup.join(' → ')}
              {' · repos après '}
              {supersetGroup[supersetGroup.length - 1]}
            </Text>
          </View>
        )}
```

**1d.** Dans `StyleSheet.create`, ajouter :
```typescript
  supersetPreview: { marginTop: 4 },
  supersetPreviewLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  supersetPreviewChain: { fontSize: 14, fontWeight: '500' },
```

- [ ] **Step 2 : Passer `supersetGroup` dans `[workoutId].tsx`**

Ajouter `getSupersetGroup` si pas encore présent (de Task 7) :
```typescript
function getSupersetGroup(
  position: SessionPosition,
  details: WorkoutExerciseDetail[]
): string[] | undefined {
  const groupId = details[position.exerciseIdx]?.superset_group_id;
  if (groupId == null) return undefined;
  return details
    .filter(d => d.superset_group_id === groupId)
    .sort((a, b) => details.indexOf(a) - details.indexOf(b))
    .map(d => d.exercise.name);
}
```

Dans le rendu de `<ExerciseTransitionPhase>` (chercher `<ExerciseTransitionPhase`), ajouter :
```tsx
              supersetGroup={getSupersetGroup(session.position, workoutDetails)}
```

- [ ] **Step 3 : TypeScript + suite complète**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -10 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 4 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/components/session/ExerciseTransitionPhase.tsx "app/app/session/[workoutId].tsx" && git commit -m "feat(supersets): ExerciseTransitionPhase preview A→B→C"
```

---

### Task 9 : Éditeur — `WorkoutExerciseCard` + `workout/[id].tsx`

**Files:**
- Modify: `app/components/workout/WorkoutExerciseCard.tsx`
- Modify: `app/app/workout/[id].tsx`

**Contexte :**
- `WorkoutExerciseCard` reçoit 4 nouvelles props optionnelles.
- `workout/[id].tsx` transforme `exercises[]` en `renderItems` via `buildRenderItems` avant de passer à la FlatList.
- Le group container = `View` à `borderWidth: 2, borderColor: '#7c3aed', borderRadius: 10, marginBottom: 8, padding: 4` avec un label "SUPERSET" absolu en haut.
- `supersetGroupLabel` = lettre A/B/C calculée dans `buildRenderItems` (position de l'exercice dans le groupe).

- [ ] **Step 1 : Ajouter les nouvelles props dans `app/components/workout/WorkoutExerciseCard.tsx`**

**1a.** Dans l'interface `WorkoutExerciseCardProps` (lignes 15-29), ajouter :
```typescript
  supersetGroupLabel?: string;
  isLastInWorkout?: boolean;
  onLinkToNext?: () => void;
  onUnlink?: () => void;
```

**1b.** Dans la destructuration de `WorkoutExerciseCard` (ligne 31), ajouter les 4 nouvelles props.

**1c.** En bas de la card, avant la fermeture du composant (avant `}` final de la View principale), ajouter la section superset. Localiser le dernier `<PressableA11y>` ou `<View>` dans le return et ajouter après :

```tsx
      {/* Superset controls */}
      <View style={styles.supersetRow}>
        {supersetGroupLabel ? (
          <>
            <View style={[styles.supersetBadge, { backgroundColor: '#7c3aed20', borderColor: '#7c3aed', borderWidth: 1 }]}>
              <Text style={[styles.supersetBadgeText, { color: '#7c3aed' }]}>
                SUPERSET · {supersetGroupLabel}
              </Text>
            </View>
            {onUnlink && (
              <PressableA11y
                accessibilityLabel="Délier cet exercice du superset"
                onPress={onUnlink}
                style={styles.unlinkBtn}
              >
                <Text style={[styles.unlinkBtnText, { color: colors.textSecondary }]}>✕ Délier</Text>
              </PressableA11y>
            )}
          </>
        ) : (
          !isLastInWorkout && onLinkToNext && (
            <PressableA11y
              accessibilityLabel="Grouper cet exercice avec le suivant en superset"
              onPress={onLinkToNext}
              style={[styles.linkBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.linkBtnText, { color: colors.textSecondary }]}>🔗 Grouper avec le suivant</Text>
            </PressableA11y>
          )
        )}
      </View>
```

**1d.** Dans `StyleSheet.create`, ajouter :
```typescript
  supersetRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  supersetBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  supersetBadgeText: { fontSize: 11, fontWeight: '700' },
  linkBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  linkBtnText: { fontSize: 12 },
  unlinkBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  unlinkBtnText: { fontSize: 12 },
```

- [ ] **Step 2 : Modifier `app/app/workout/[id].tsx`**

**2a.** Ajouter les imports nécessaires en tête de fichier :
```typescript
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';
```
(déjà présent — vérifier)

**2b.** Ajouter `linkToNext` et `unlink` dans la destructuration de `useWorkoutExercises` :
```typescript
  const {
    exercises,
    loading,
    error,
    remove,
    refresh,
    updateSet,
    addSet,
    removeSet,
    addBlock,
    updateBlock,
    removeBlock,
    reorderExercise,
    reorderBlock,
    linkToNext,
    unlink,
  } = useWorkoutExercises(workoutId);
```

**2c.** Ajouter `buildRenderItems` juste avant `export default function WorkoutDetailScreen()` :

```typescript
type RenderItem =
  | { type: 'standalone'; exercise: WorkoutExerciseDetail; index: number }
  | { type: 'superset'; members: { exercise: WorkoutExerciseDetail; index: number; label: string }[] };

function buildRenderItems(exercises: WorkoutExerciseDetail[]): RenderItem[] {
  const items: RenderItem[] = [];
  let i = 0;
  while (i < exercises.length) {
    const ex = exercises[i];
    const groupId = ex.superset_group_id;
    if (groupId != null) {
      const members: { exercise: WorkoutExerciseDetail; index: number; label: string }[] = [];
      const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let labelIdx = 0;
      while (i < exercises.length && exercises[i].superset_group_id === groupId) {
        members.push({ exercise: exercises[i], index: i, label: LABELS[labelIdx++] ?? String(labelIdx) });
        i++;
      }
      items.push({ type: 'superset', members });
    } else {
      items.push({ type: 'standalone', exercise: ex, index: i });
      i++;
    }
  }
  return items;
}
```

**2d.** Dans le rendu, remplacer le `<FlatList>` actuel. Remplacer :
```tsx
        <FlatList
          data={exercises}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <WorkoutExerciseCard
              detail={item}
              isFirst={index === 0}
              isLast={index === exercises.length - 1}
              onMoveUp={() => reorderExercise(item.id, 'up')}
              onMoveDown={() => reorderExercise(item.id, 'down')}
              onReorderBlock={reorderBlock}
              onRemove={() => confirmRemove(item)}
              onUpdateSet={updateSet}
              onAddSet={addSet}
              onRemoveSet={removeSet}
              onAddBlock={addBlock}
              onUpdateBlock={updateBlock}
              onRemoveBlock={removeBlock}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              Aucun exercice. Appuie sur + pour en ajouter un.
            </Text>
          }
        />
```

Par :
```tsx
        <FlatList
          data={buildRenderItems(exercises)}
          keyExtractor={(item) =>
            item.type === 'standalone'
              ? String(item.exercise.id)
              : `superset-${item.members[0].exercise.id}`
          }
          renderItem={({ item }) => {
            if (item.type === 'standalone') {
              const { exercise, index } = item;
              return (
                <WorkoutExerciseCard
                  detail={exercise}
                  isFirst={index === 0}
                  isLast={index === exercises.length - 1}
                  isLastInWorkout={index === exercises.length - 1}
                  onMoveUp={() => reorderExercise(exercise.id, 'up')}
                  onMoveDown={() => reorderExercise(exercise.id, 'down')}
                  onReorderBlock={reorderBlock}
                  onRemove={() => confirmRemove(exercise)}
                  onUpdateSet={updateSet}
                  onAddSet={addSet}
                  onRemoveSet={removeSet}
                  onAddBlock={addBlock}
                  onUpdateBlock={updateBlock}
                  onRemoveBlock={removeBlock}
                  onLinkToNext={index < exercises.length - 1 ? () => linkToNext(exercise.id, exercises[index + 1].id) : undefined}
                />
              );
            }
            // Superset group container
            const lastMemberIndex = item.members[item.members.length - 1].index;
            return (
              <View style={styles.supersetContainer}>
                <View style={styles.supersetLabel}>
                  <Text style={styles.supersetLabelText}>SUPERSET</Text>
                </View>
                {item.members.map(({ exercise, index, label }) => (
                  <WorkoutExerciseCard
                    key={exercise.id}
                    detail={exercise}
                    isFirst={index === 0}
                    isLast={index === exercises.length - 1}
                    isLastInWorkout={index === exercises.length - 1}
                    supersetGroupLabel={label}
                    onMoveUp={() => reorderExercise(exercise.id, 'up')}
                    onMoveDown={() => reorderExercise(exercise.id, 'down')}
                    onReorderBlock={reorderBlock}
                    onRemove={() => confirmRemove(exercise)}
                    onUpdateSet={updateSet}
                    onAddSet={addSet}
                    onRemoveSet={removeSet}
                    onAddBlock={addBlock}
                    onUpdateBlock={updateBlock}
                    onRemoveBlock={removeBlock}
                    onUnlink={() => unlink(exercise.id)}
                    onLinkToNext={
                      lastMemberIndex < exercises.length - 1
                        ? () => linkToNext(exercise.id, exercises[lastMemberIndex + 1].id)
                        : undefined
                    }
                  />
                ))}
              </View>
            );
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              Aucun exercice. Appuie sur + pour en ajouter un.
            </Text>
          }
        />
```

**2e.** Dans `StyleSheet.create` de `workout/[id].tsx`, ajouter :
```typescript
  supersetContainer: { borderWidth: 2, borderColor: '#7c3aed', borderRadius: 10, marginBottom: 8, padding: 4, position: 'relative', paddingTop: 16 },
  supersetLabel: { position: 'absolute', top: -10, left: 12, backgroundColor: '#7c3aed', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  supersetLabelText: { color: '#fff', fontSize: 10, fontWeight: '700' },
```

- [ ] **Step 3 : TypeScript + suite complète**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -20 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 4 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/components/workout/WorkoutExerciseCard.tsx "app/app/workout/[id].tsx" && git commit -m "feat(supersets): éditeur workout — bouton Grouper + container violet + Délier"
```

---

## Self-Review

**Spec coverage :**
- ✅ Migration v13 `superset_group_id` — T1
- ✅ `WorkoutExercise.superset_group_id` type — T1
- ✅ `WorkoutExerciseDetail.superset_group_id` propagé — T1
- ✅ `IWorkoutExerciseRepository.updateSuperset` — T1
- ✅ `InMemoryWorkoutExerciseRepository.updateSuperset` TDD — T2
- ✅ `SQLiteWorkoutExerciseRepository.updateSuperset` — T2
- ✅ `WorkoutExerciseService.linkToNext` TDD (groupId priorité B→A→MAX+1) — T3
- ✅ `WorkoutExerciseService.unlink` TDD (dissolve tout le groupe) — T3
- ✅ `useWorkoutExercises` expose `linkToNext(aId, bId)` + `unlink(id)` — T4
- ✅ `advancePosition` superset routing (A→B→C, last→tour suivant, fin→après groupe) TDD — T5
- ✅ `isSupersetForward` exportée + testée — T5
- ✅ `isSupersetNextRound` exportée — T5
- ✅ `validateSet` : `isSupersetForward` → skip repos/transition — T6
- ✅ `validateSet` : `isSupersetNextRound` → repos sans exercise_transition — T6
- ✅ `skipExercise` saute le groupe entier — T6
- ✅ Badge `SUPERSET · 1/2` dans RunningPhase — T7
- ✅ `getSupersetPosition` dans `[workoutId].tsx` — T7
- ✅ Texte skip superset dans BottomSheet — T7
- ✅ `ExerciseTransitionPhase` preview `A → B · repos après B` — T8
- ✅ `getSupersetGroup` dans `[workoutId].tsx` — T8
- ✅ `WorkoutExerciseCard` bouton 🔗 + badge + Délier — T9
- ✅ `buildRenderItems` + group container violet — T9
- ✅ `Délier = dissoudre` (via `unlink` qui appelle `WorkoutExerciseService.unlink`) — T9

**Placeholders :** aucun.

**Type consistency :**
- `superset_group_id: number | null` défini T1 → propagé T2 → T3 service → T4 hook → T5/T6 routing → T7/T8/T9 UI. ✓
- `linkToNext(aId: number, bId: number)` : service T3 → hook T4 (même signature) → workout/[id].tsx T9. ✓
- `unlink(id: number)` : service T3 → hook T4 → workout/[id].tsx T9. ✓
- `isSupersetForward` / `isSupersetNextRound` : définis et exportés T5, utilisés T6. ✓
- `supersetPosition?: { current: number; total: number }` : prop T7, calculé par `getSupersetPosition` T7. ✓
- `supersetGroup?: string[]` : prop T8, calculé par `getSupersetGroup` T8. ✓
