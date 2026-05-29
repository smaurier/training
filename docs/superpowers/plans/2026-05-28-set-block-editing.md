# Set/Block Editing — Plan d'implémentation (Session 8A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter l'édition inline des sets et des blocs depuis l'accordéon `workout/[id].tsx` (modifier/ajouter/supprimer series et blocs via modales).

**Architecture:** Couches en cascade — Repository (update) → Service (6 méthodes void) → Hook (6 useCallback) → Composants (BlockCard refactoré, 2 nouvelles modales, WorkoutExerciseCard étendu, écran câblé). Chaque couche testée indépendamment via TDD.

**Tech Stack:** React Native + Expo SDK 54, TypeScript strict, expo-sqlite, Jest (jest-expo), `PressableA11y` pour tous les éléments interactifs, couleurs depuis `constants/Colors.ts`.

---

## Fichiers touchés

| Fichier | Créé / Modifié |
|---|---|
| `app/repositories/ISetRepository.ts` | Modifié — ajoute `UpdateSetDto` + `update()` |
| `app/repositories/setRepository.contract.ts` | Modifié — ajoute `describe('update')` |
| `app/repositories/InMemorySetRepository.ts` | Modifié — implémente `update()` |
| `app/repositories/SQLiteSetRepository.ts` | Modifié — implémente `update()` |
| `app/repositories/IBlockRepository.ts` | Modifié — ajoute `UpdateBlockDto` + `update()` |
| `app/repositories/blockRepository.contract.ts` | Modifié — ajoute `describe('update')` |
| `app/repositories/InMemoryBlockRepository.ts` | Modifié — implémente `update()` |
| `app/repositories/SQLiteBlockRepository.ts` | Modifié — implémente `update()` (read-modify-write) |
| `app/services/WorkoutExerciseService.ts` | Modifié — 6 nouvelles méthodes |
| `app/services/WorkoutExerciseService.test.ts` | Modifié — 6 nouveaux blocs `describe` |
| `app/hooks/useWorkoutExercises.ts` | Modifié — 6 nouveaux `useCallback` + interface étendue |
| `app/components/workout/EditSetModal.tsx` | Créé |
| `app/components/workout/EditBlockModal.tsx` | Créé |
| `app/components/workout/BlockCard.tsx` | Modifié — 5 nouvelles props, interactions pressables |
| `app/components/workout/WorkoutExerciseCard.tsx` | Modifié — 6 nouvelles props, état local, EditBlockModal |
| `app/app/workout/[id].tsx` | Modifié — passe 6 nouvelles méthodes |

---

## Task 1 : UpdateSetDto + ISetRepository.update()

**Files:**
- Modify: `app/repositories/ISetRepository.ts`
- Modify: `app/repositories/setRepository.contract.ts`
- Modify: `app/repositories/InMemorySetRepository.ts`
- Modify: `app/repositories/SQLiteSetRepository.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter à la fin de `app/repositories/setRepository.contract.ts`, juste avant la dernière accolade fermante de `runSetRepositoryContractTests` :

```typescript
describe('update', () => {
  it('modifie les champs fournis et retourne la série mise à jour', async () => {
    const saved = await repo.save(serie1);
    const dto: UpdateSetDto = {
      reps_min: 4,
      reps_max: 6,
      weight: 80,
      weight_type: 'fixed',
      rest_duration: 90,
    };
    const updated = await repo.update(saved.id, dto);
    expect(updated.reps_min).toBe(4);
    expect(updated.reps_max).toBe(6);
    expect(updated.weight).toBe(80);
    expect(updated.rest_duration).toBe(90);
    expect(updated.id).toBe(saved.id);
  });

  it('ne modifie pas les autres champs (block_id, order_index)', async () => {
    const saved = await repo.save(serie1);
    const dto: UpdateSetDto = {
      reps_min: 4,
      reps_max: 6,
      weight: null,
      weight_type: 'bodyweight',
      rest_duration: 60,
    };
    const updated = await repo.update(saved.id, dto);
    expect(updated.block_id).toBe(serie1.block_id);
    expect(updated.order_index).toBe(serie1.order_index);
  });

  it('throw si id inconnu', async () => {
    const dto: UpdateSetDto = {
      reps_min: 4,
      reps_max: 6,
      weight: null,
      weight_type: 'fixed',
      rest_duration: 60,
    };
    await expect(repo.update(999, dto)).rejects.toThrow('999');
  });
});
```

Ajouter l'import `UpdateSetDto` en tête du même fichier :

```typescript
import { ISetRepository, CreateSetDto, UpdateSetDto } from './ISetRepository';
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```
npx jest repositories/InMemorySetRepository.test.ts --no-coverage
```

Attendu : FAIL — `repo.update is not a function`

- [ ] **Step 3 : Ajouter UpdateSetDto + update() à l'interface**

Remplacer le contenu de `app/repositories/ISetRepository.ts` :

```typescript
import type { Set } from '../db/types';

export type CreateSetDto = Omit<Set, 'id'>;
export type UpdateSetDto = Pick<Set, 'reps_min' | 'reps_max' | 'weight' | 'weight_type' | 'rest_duration'>;

export interface ISetRepository {
  findByBlockId(blockId: number): Promise<Set[]>;
  findById(id: number): Promise<Set | null>;
  save(dto: CreateSetDto): Promise<Set>;
  update(id: number, dto: UpdateSetDto): Promise<Set>;
  delete(id: number): Promise<void>;
}
```

- [ ] **Step 4 : Implémenter update() dans InMemorySetRepository**

Ajouter la méthode dans `app/repositories/InMemorySetRepository.ts` :

```typescript
async update(id: number, dto: UpdateSetDto): Promise<TrainingSet> {
  const idx = this.items.findIndex(i => i.id === id);
  if (idx === -1) throw new Error(`Set ${id} introuvable`);
  this.items[idx] = { ...this.items[idx], ...dto };
  return this.items[idx];
}
```

- [ ] **Step 5 : Vérifier que les tests passent**

```
npx jest repositories/InMemorySetRepository.test.ts --no-coverage
```

Attendu : PASS — tous les tests verts

- [ ] **Step 6 : Implémenter update() dans SQLiteSetRepository**

Ajouter la méthode dans `app/repositories/SQLiteSetRepository.ts` :

```typescript
async update(id: number, dto: UpdateSetDto): Promise<TrainingSet> {
  await this.db.runAsync(
    'UPDATE sets SET reps_min=?, reps_max=?, weight=?, weight_type=?, rest_duration=? WHERE id=?',
    [dto.reps_min, dto.reps_max, dto.weight, dto.weight_type, dto.rest_duration, id]
  );
  const updated = await this.findById(id);
  if (!updated) throw new Error(`Set ${id} introuvable`);
  return updated;
}
```

- [ ] **Step 7 : Vérifier la compilation TypeScript**

```
npx tsc --noEmit
```

Attendu : pas d'erreur

- [ ] **Step 8 : Commit**

```
git add app/repositories/ISetRepository.ts app/repositories/setRepository.contract.ts app/repositories/InMemorySetRepository.ts app/repositories/SQLiteSetRepository.ts
git commit -m "feat(repo): UpdateSetDto + ISetRepository.update() — contract + implémentations"
```

---

## Task 2 : UpdateBlockDto + IBlockRepository.update()

**Files:**
- Modify: `app/repositories/IBlockRepository.ts`
- Modify: `app/repositories/blockRepository.contract.ts`
- Modify: `app/repositories/InMemoryBlockRepository.ts`
- Modify: `app/repositories/SQLiteBlockRepository.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

Ajouter l'import et le bloc `describe('update')` dans `app/repositories/blockRepository.contract.ts` :

```typescript
import { IBlockRepository, CreateBlockDto, UpdateBlockDto } from './IBlockRepository';
```

Ajouter dans `runBlockRepositoryContractTests`, après le `describe('delete')` :

```typescript
describe('update', () => {
  it('renomme le bloc et retourne le bloc mis à jour', async () => {
    const saved = await repo.save(bloc1);
    const dto: UpdateBlockDto = { name: 'Échauffement' };
    const updated = await repo.update(saved.id, dto);
    expect(updated.name).toBe('Échauffement');
    expect(updated.id).toBe(saved.id);
    expect(updated.workout_exercise_id).toBe(bloc1.workout_exercise_id);
  });

  it('toggle is_work_block sans toucher au nom', async () => {
    const saved = await repo.save(bloc1);
    const dto: UpdateBlockDto = { is_work_block: 0 };
    const updated = await repo.update(saved.id, dto);
    expect(updated.is_work_block).toBe(0);
    expect(updated.name).toBe('Travail');
  });

  it('throw si id inconnu', async () => {
    await expect(repo.update(999, { name: 'X' })).rejects.toThrow('999');
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```
npx jest repositories/InMemoryBlockRepository.test.ts --no-coverage
```

Attendu : FAIL — `repo.update is not a function`

- [ ] **Step 3 : Ajouter UpdateBlockDto + update() à l'interface**

Remplacer le contenu de `app/repositories/IBlockRepository.ts` :

```typescript
import type { Block } from '../db/types';

export type CreateBlockDto = Omit<Block, 'id'>;
export type UpdateBlockDto = Partial<Pick<Block, 'name' | 'is_work_block'>>;

export interface IBlockRepository {
  findByWorkoutExerciseId(workoutExerciseId: number): Promise<Block[]>;
  findById(id: number): Promise<Block | null>;
  save(dto: CreateBlockDto): Promise<Block>;
  update(id: number, dto: UpdateBlockDto): Promise<Block>;
  delete(id: number): Promise<void>;
}
```

- [ ] **Step 4 : Implémenter update() dans InMemoryBlockRepository**

Ajouter la méthode dans `app/repositories/InMemoryBlockRepository.ts` :

```typescript
async update(id: number, dto: UpdateBlockDto): Promise<Block> {
  const idx = this.items.findIndex(i => i.id === id);
  if (idx === -1) throw new Error(`Block ${id} introuvable`);
  this.items[idx] = { ...this.items[idx], ...dto };
  return this.items[idx];
}
```

- [ ] **Step 5 : Vérifier que les tests passent**

```
npx jest repositories/InMemoryBlockRepository.test.ts --no-coverage
```

Attendu : PASS

- [ ] **Step 6 : Implémenter update() dans SQLiteBlockRepository**

SQLite utilise read-modify-write (UpdateBlockDto est Partial — on merge avec les valeurs existantes) :

```typescript
async update(id: number, dto: UpdateBlockDto): Promise<Block> {
  const current = await this.findById(id);
  if (!current) throw new Error(`Block ${id} introuvable`);
  const merged = { ...current, ...dto };
  await this.db.runAsync(
    'UPDATE blocks SET name=?, is_work_block=? WHERE id=?',
    [merged.name, merged.is_work_block, id]
  );
  const updated = await this.findById(id);
  if (!updated) throw new Error(`Block ${id} introuvable après update`);
  return updated;
}
```

- [ ] **Step 7 : Vérifier la compilation TypeScript**

```
npx tsc --noEmit
```

Attendu : pas d'erreur

- [ ] **Step 8 : Commit**

```
git add app/repositories/IBlockRepository.ts app/repositories/blockRepository.contract.ts app/repositories/InMemoryBlockRepository.ts app/repositories/SQLiteBlockRepository.ts
git commit -m "feat(repo): UpdateBlockDto + IBlockRepository.update() — contract + implémentations"
```

---

## Task 3 : WorkoutExerciseService — 6 nouvelles méthodes (TDD)

**Files:**
- Modify: `app/services/WorkoutExerciseService.test.ts`
- Modify: `app/services/WorkoutExerciseService.ts`

- [ ] **Step 1 : Écrire les 6 blocs de tests qui échouent**

Ajouter les imports nécessaires en tête de `app/services/WorkoutExerciseService.test.ts` :

```typescript
import { UpdateSetDto } from '../repositories/ISetRepository';
import { UpdateBlockDto } from '../repositories/IBlockRepository';
```

Ajouter dans `describe('WorkoutExerciseService')`, après le bloc `describe('remove')` :

```typescript
describe('updateSet', () => {
  it('modifie les champs de la série, visible via getWithDetails', async () => {
    const { service, exerciseRepo } = makeService();
    const exercise = await seedExercise(exerciseRepo);
    const detail = await service.addToWorkout(1, exercise.id);
    const setId = detail.blocks[0].sets[0].id;
    const dto: UpdateSetDto = { reps_min: 5, reps_max: 5, weight: 100, weight_type: 'fixed', rest_duration: 180 };
    await service.updateSet(setId, dto);
    const updated = await service.getWithDetails(1);
    expect(updated[0].blocks[0].sets[0].reps_min).toBe(5);
    expect(updated[0].blocks[0].sets[0].weight).toBe(100);
  });
});

describe('addSet', () => {
  it('ajoute une série avec les defaults, order_index = longueur existante', async () => {
    const { service, exerciseRepo } = makeService();
    const exercise = await seedExercise(exerciseRepo);
    const detail = await service.addToWorkout(1, exercise.id);
    const blockId = detail.blocks[0].id;
    await service.addSet(blockId);
    const updated = await service.getWithDetails(1);
    expect(updated[0].blocks[0].sets).toHaveLength(2);
    expect(updated[0].blocks[0].sets[1].order_index).toBe(1);
    expect(updated[0].blocks[0].sets[1].reps_min).toBe(3);
    expect(updated[0].blocks[0].sets[1].weight).toBeNull();
  });
});

describe('removeSet', () => {
  it('supprime la série, absente de getWithDetails après suppression', async () => {
    const { service, exerciseRepo } = makeService();
    const exercise = await seedExercise(exerciseRepo);
    const detail = await service.addToWorkout(1, exercise.id);
    const setId = detail.blocks[0].sets[0].id;
    await service.removeSet(setId);
    const updated = await service.getWithDetails(1);
    expect(updated[0].blocks[0].sets).toHaveLength(0);
  });
});

describe('addBlock', () => {
  it('crée un bloc + 1 série par défaut, order_index correct', async () => {
    const { service, exerciseRepo } = makeService();
    const exercise = await seedExercise(exerciseRepo);
    const detail = await service.addToWorkout(1, exercise.id);
    await service.addBlock(detail.id, 'Back-off', 0);
    const updated = await service.getWithDetails(1);
    expect(updated[0].blocks).toHaveLength(2);
    expect(updated[0].blocks[1].name).toBe('Back-off');
    expect(updated[0].blocks[1].is_work_block).toBe(0);
    expect(updated[0].blocks[1].order_index).toBe(1);
    expect(updated[0].blocks[1].sets).toHaveLength(1);
    expect(updated[0].blocks[1].sets[0].reps_min).toBe(3);
  });
});

describe('updateBlock', () => {
  it('renomme le bloc, visible via getWithDetails', async () => {
    const { service, exerciseRepo } = makeService();
    const exercise = await seedExercise(exerciseRepo);
    const detail = await service.addToWorkout(1, exercise.id);
    const blockId = detail.blocks[0].id;
    const dto: UpdateBlockDto = { name: 'Échauffement' };
    await service.updateBlock(blockId, dto);
    const updated = await service.getWithDetails(1);
    expect(updated[0].blocks[0].name).toBe('Échauffement');
  });
});

describe('removeBlock', () => {
  it('supprime le bloc, absent de getWithDetails après suppression', async () => {
    const { service, exerciseRepo } = makeService();
    const exercise = await seedExercise(exerciseRepo);
    const detail = await service.addToWorkout(1, exercise.id);
    const blockId = detail.blocks[0].id;
    await service.removeBlock(blockId);
    const updated = await service.getWithDetails(1);
    expect(updated[0].blocks).toHaveLength(0);
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```
npx jest services/WorkoutExerciseService.test.ts --no-coverage
```

Attendu : FAIL — `service.updateSet is not a function` (et similaires)

- [ ] **Step 3 : Ajouter les 6 méthodes dans WorkoutExerciseService**

Ajouter les imports en tête de `app/services/WorkoutExerciseService.ts` :

```typescript
import { ISetRepository, UpdateSetDto } from '../repositories/ISetRepository';
import { IBlockRepository, UpdateBlockDto } from '../repositories/IBlockRepository';
```

Remplacer les imports actuels qui importent `ISetRepository` et `IBlockRepository` par ceux ci-dessus (ils incluent maintenant les types Update).

Ajouter les 6 méthodes dans la classe `WorkoutExerciseService`, après `remove()` :

```typescript
async updateSet(setId: number, dto: UpdateSetDto): Promise<void> {
  await this.setRepo.update(setId, dto);
}

async addSet(blockId: number): Promise<void> {
  const existing = await this.setRepo.findByBlockId(blockId);
  await this.setRepo.save({
    block_id: blockId,
    reps_min: 3,
    reps_max: 8,
    weight: null,
    weight_type: 'fixed',
    rest_duration: 120,
    order_index: existing.length,
  });
}

async removeSet(setId: number): Promise<void> {
  await this.setRepo.delete(setId);
}

async addBlock(workoutExerciseId: number, name: string, isWorkBlock: 0 | 1): Promise<void> {
  const existing = await this.blockRepo.findByWorkoutExerciseId(workoutExerciseId);
  await this.runInTransaction(async () => {
    const block = await this.blockRepo.save({
      workout_exercise_id: workoutExerciseId,
      name,
      order_index: existing.length,
      is_work_block: isWorkBlock,
    });
    await this.setRepo.save({
      block_id: block.id,
      reps_min: 3,
      reps_max: 8,
      weight: null,
      weight_type: 'fixed',
      rest_duration: 120,
      order_index: 0,
    });
  });
}

async updateBlock(blockId: number, dto: UpdateBlockDto): Promise<void> {
  await this.blockRepo.update(blockId, dto);
}

async removeBlock(blockId: number): Promise<void> {
  await this.blockRepo.delete(blockId);
}
```

- [ ] **Step 4 : Vérifier que tous les tests passent**

```
npx jest services/WorkoutExerciseService.test.ts --no-coverage
```

Attendu : PASS — tous les tests verts (anciens + 6 nouveaux)

- [ ] **Step 5 : Vérifier la compilation TypeScript**

```
npx tsc --noEmit
```

- [ ] **Step 6 : Commit**

```
git add app/services/WorkoutExerciseService.ts app/services/WorkoutExerciseService.test.ts
git commit -m "feat(service): 6 nouvelles méthodes set/block CRUD dans WorkoutExerciseService"
```

---

## Task 4 : useWorkoutExercises — 6 nouvelles méthodes

**Files:**
- Modify: `app/hooks/useWorkoutExercises.ts`

- [ ] **Step 1 : Mettre à jour l'interface et les imports**

Remplacer le contenu de `app/hooks/useWorkoutExercises.ts` :

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { WorkoutExerciseService, WorkoutExerciseDetail } from '../services/WorkoutExerciseService';
import { SQLiteWorkoutExerciseRepository } from '../repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '../repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '../repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { UpdateSetDto } from '../repositories/ISetRepository';
import { UpdateBlockDto } from '../repositories/IBlockRepository';
import { getDb } from '../db';

export interface UseWorkoutExercisesResult {
  exercises: WorkoutExerciseDetail[];
  loading: boolean;
  error: string | null;
  add: (exerciseId: number) => Promise<void>;
  remove: (workoutExerciseId: number) => Promise<void>;
  refresh: () => Promise<void>;
  updateSet: (setId: number, dto: UpdateSetDto) => Promise<void>;
  addSet: (blockId: number) => Promise<void>;
  removeSet: (setId: number) => Promise<void>;
  addBlock: (workoutExerciseId: number, name: string, isWorkBlock: 0 | 1) => Promise<void>;
  updateBlock: (blockId: number, dto: UpdateBlockDto) => Promise<void>;
  removeBlock: (blockId: number) => Promise<void>;
}

function makeService(): WorkoutExerciseService {
  const db = getDb();
  return new WorkoutExerciseService(
    new SQLiteWorkoutExerciseRepository(db),
    new SQLiteBlockRepository(db),
    new SQLiteSetRepository(db),
    new SQLiteExerciseRepository(db),
    (fn) => db.withTransactionAsync(fn),
  );
}

export function useWorkoutExercises(workoutId: number): UseWorkoutExercisesResult {
  const serviceRef = useRef<WorkoutExerciseService | null>(null);
  if (!serviceRef.current) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [exercises, setExercises] = useState<WorkoutExerciseDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await service.getWithDetails(workoutId);
      if (mountedRef.current) setExercises(data);
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [service, workoutId]);

  useEffect(() => { refresh(); }, [refresh]);

  const add = useCallback(async (exerciseId: number) => {
    try {
      await service.addToWorkout(workoutId, exerciseId);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, workoutId, refresh]);

  const remove = useCallback(async (workoutExerciseId: number) => {
    try {
      await service.remove(workoutExerciseId);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const updateSet = useCallback(async (setId: number, dto: UpdateSetDto) => {
    try {
      await service.updateSet(setId, dto);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const addSet = useCallback(async (blockId: number) => {
    try {
      await service.addSet(blockId);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const removeSet = useCallback(async (setId: number) => {
    try {
      await service.removeSet(setId);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const addBlock = useCallback(async (workoutExerciseId: number, name: string, isWorkBlock: 0 | 1) => {
    try {
      await service.addBlock(workoutExerciseId, name, isWorkBlock);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const updateBlock = useCallback(async (blockId: number, dto: UpdateBlockDto) => {
    try {
      await service.updateBlock(blockId, dto);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const removeBlock = useCallback(async (blockId: number) => {
    try {
      await service.removeBlock(blockId);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  return { exercises, loading, error, add, remove, refresh, updateSet, addSet, removeSet, addBlock, updateBlock, removeBlock };
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```
npx tsc --noEmit
```

Attendu : pas d'erreur

- [ ] **Step 3 : Vérifier la suite de tests complète**

```
npx jest --no-coverage
```

Attendu : tous les tests verts (aucun nouveau test de hook — le hook est une intégration testée via les écrans)

- [ ] **Step 4 : Commit**

```
git add app/hooks/useWorkoutExercises.ts
git commit -m "feat(hook): 6 nouvelles méthodes set/block dans useWorkoutExercises"
```

---

## Task 5 : EditSetModal

**Files:**
- Create: `app/components/workout/EditSetModal.tsx`

- [ ] **Step 1 : Créer le composant**

Créer `app/components/workout/EditSetModal.tsx` :

```typescript
import { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet } from 'react-native';
import type { Set as TrainingSet, WeightType } from '@/db/types';
import type { UpdateSetDto } from '@/repositories/ISetRepository';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const MODAL_OVERLAY_COLOR = 'rgba(0,0,0,0.4)' as const;
const BTN_PRIMARY_TEXT = '#fff' as const;

interface EditSetModalProps {
  set: TrainingSet;
  onSave: (dto: UpdateSetDto) => Promise<void>;
  onClose: () => void;
}

export function EditSetModal({ set, onSave, onClose }: EditSetModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [repsMin, setRepsMin] = useState(String(set.reps_min));
  const [repsMax, setRepsMax] = useState(String(set.reps_max));
  const [weight, setWeight] = useState(set.weight != null ? String(set.weight) : '');
  const [weightType, setWeightType] = useState<WeightType>(set.weight_type);
  const [rest, setRest] = useState(String(set.rest_duration));

  const weightDisabled = weightType === 'bodyweight' || weightType === 'bar';

  const SEGMENTS: { key: WeightType; label: string }[] = [
    { key: 'fixed', label: 'Fixe' },
    { key: 'bodyweight', label: 'PC' },
    { key: 'bar', label: 'Barre' },
  ];

  async function handleSave() {
    const dto: UpdateSetDto = {
      reps_min: parseInt(repsMin, 10) || set.reps_min,
      reps_max: parseInt(repsMax, 10) || set.reps_max,
      weight: weightDisabled ? null : (weight.trim() ? parseFloat(weight) : null),
      weight_type: weightType,
      rest_duration: parseInt(rest, 10) || set.rest_duration,
    };
    await onSave(dto);
    onClose();
  }

  return (
    <Modal transparent animationType="slide" accessibilityViewIsModal>
      <View style={[styles.overlay, { backgroundColor: MODAL_OVERLAY_COLOR }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Modifier la série</Text>

          <View style={styles.repsRow}>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={repsMin}
              onChangeText={setRepsMin}
              keyboardType="numeric"
              accessibilityLabel="Répétitions minimum"
            />
            <Text style={[styles.separator, { color: colors.textSecondary }]}>–</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={repsMax}
              onChangeText={setRepsMax}
              keyboardType="numeric"
              accessibilityLabel="Répétitions maximum"
            />
          </View>

          <View style={styles.segmented}>
            {SEGMENTS.map(({ key, label }) => {
              const active = weightType === key;
              return (
                <PressableA11y
                  key={key}
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active }}
                  onPress={() => setWeightType(key)}
                  style={[
                    styles.segment,
                    { borderColor: colors.border },
                    active ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={{ color: active ? BTN_PRIMARY_TEXT : colors.text }}>{label}</Text>
                </PressableA11y>
              );
            })}
          </View>

          <TextInput
            style={[
              styles.inputFull,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              weightDisabled && styles.disabled,
            ]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            editable={!weightDisabled}
            accessibilityLabel="Poids en kilogrammes"
          />

          <TextInput
            style={[styles.inputFull, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={rest}
            onChangeText={setRest}
            keyboardType="numeric"
            accessibilityLabel="Temps de repos en secondes"
          />

          <View style={styles.buttons}>
            <PressableA11y
              accessibilityLabel="Annuler"
              onPress={onClose}
              style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
            >
              <Text style={{ color: colors.text }}>Annuler</Text>
            </PressableA11y>
            <PressableA11y
              accessibilityLabel="Enregistrer"
              onPress={handleSave}
              style={[styles.btn, { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: BTN_PRIMARY_TEXT }}>Enregistrer</Text>
            </PressableA11y>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, gap: 14 },
  title: { fontSize: 17, fontWeight: '600' },
  repsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16, textAlign: 'center' },
  separator: { fontSize: 18 },
  segmented: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  inputFull: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16 },
  disabled: { opacity: 0.4 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 8 },
});
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```
npx tsc --noEmit
```

Attendu : pas d'erreur

- [ ] **Step 3 : Commit**

```
git add app/components/workout/EditSetModal.tsx
git commit -m "feat(component): EditSetModal — édition inline d'une série"
```

---

## Task 6 : EditBlockModal

**Files:**
- Create: `app/components/workout/EditBlockModal.tsx`

- [ ] **Step 1 : Créer le composant**

Créer `app/components/workout/EditBlockModal.tsx` :

```typescript
import { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Switch, StyleSheet } from 'react-native';
import type { Block } from '@/db/types';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const MODAL_OVERLAY_COLOR = 'rgba(0,0,0,0.4)' as const;
const BTN_PRIMARY_TEXT = '#fff' as const;

interface EditBlockModalProps {
  visible: boolean;
  block: Block | null;
  workoutExerciseId: number;
  onSave: (name: string, isWorkBlock: 0 | 1) => Promise<void>;
  onClose: () => void;
}

export function EditBlockModal({ visible, block, workoutExerciseId: _workoutExerciseId, onSave, onClose }: EditBlockModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [name, setName] = useState(block?.name ?? '');
  const [isWorkBlock, setIsWorkBlock] = useState((block?.is_work_block ?? 1) === 1);

  useEffect(() => {
    setName(block?.name ?? '');
    setIsWorkBlock((block?.is_work_block ?? 1) === 1);
  }, [block, visible]);

  const canSave = name.trim().length > 0;

  async function handleSave() {
    if (!canSave) return;
    await onSave(name.trim(), isWorkBlock ? 1 : 0);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" accessibilityViewIsModal>
      <View style={[styles.overlay, { backgroundColor: MODAL_OVERLAY_COLOR }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            {block ? 'Renommer le bloc' : 'Nouveau bloc'}
          </Text>

          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={name}
            onChangeText={setName}
            placeholder="Nom du bloc"
            placeholderTextColor={colors.textSecondary}
            autoFocus
            accessibilityLabel="Nom du bloc"
          />

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Bloc de travail</Text>
            <Switch
              value={isWorkBlock}
              onValueChange={setIsWorkBlock}
              accessibilityLabel="Bloc de travail"
            />
          </View>

          <View style={styles.buttons}>
            <PressableA11y
              accessibilityLabel="Annuler"
              onPress={onClose}
              style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
            >
              <Text style={{ color: colors.text }}>Annuler</Text>
            </PressableA11y>
            <PressableA11y
              accessibilityLabel="Enregistrer"
              onPress={handleSave}
              accessibilityState={{ disabled: !canSave }}
              style={[styles.btn, { backgroundColor: colors.primary, opacity: canSave ? 1 : 0.4 }]}
            >
              <Text style={{ color: BTN_PRIMARY_TEXT }}>Enregistrer</Text>
            </PressableA11y>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, gap: 14 },
  title: { fontSize: 17, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 15 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 8 },
});
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```
npx tsc --noEmit
```

Attendu : pas d'erreur

- [ ] **Step 3 : Commit**

```
git add app/components/workout/EditBlockModal.tsx
git commit -m "feat(component): EditBlockModal — création et renommage de blocs"
```

---

## Task 7 : BlockCard — refactor

**Files:**
- Modify: `app/components/workout/BlockCard.tsx`

- [ ] **Step 1 : Remplacer le contenu de BlockCard**

Remplacer le contenu de `app/components/workout/BlockCard.tsx` :

```typescript
import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import type { BlockWithSets } from '@/services/WorkoutExerciseService';
import type { Set as TrainingSet } from '@/db/types';
import type { UpdateSetDto } from '@/repositories/ISetRepository';
import { EditSetModal } from './EditSetModal';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface BlockCardProps {
  block: BlockWithSets;
  onUpdateSet: (setId: number, dto: UpdateSetDto) => Promise<void>;
  onAddSet: (blockId: number) => Promise<void>;
  onRemoveSet: (setId: number) => Promise<void>;
  onRenameBlock: (block: BlockWithSets) => void;
  onRemoveBlock: (blockId: number) => Promise<void>;
}

function formatSet(set: TrainingSet): string {
  const reps = set.reps_min === set.reps_max
    ? `${set.reps_min} rép`
    : `${set.reps_min}–${set.reps_max} rép`;

  let weight: string;
  if (set.weight_type === 'bodyweight') weight = 'PC';
  else if (set.weight_type === 'bar') weight = 'barre';
  else weight = set.weight != null ? `${set.weight} kg` : '— kg';

  const rest = set.rest_duration >= 60
    ? `${Math.round(set.rest_duration / 60)} min`
    : `${set.rest_duration} s`;

  return `${reps} @ ${weight} — ${rest}`;
}

export function BlockCard({ block, onUpdateSet, onAddSet, onRemoveSet, onRenameBlock, onRemoveBlock }: BlockCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [editingSet, setEditingSet] = useState<TrainingSet | null>(null);

  function handleBlockLongPress() {
    Alert.alert(block.name, 'Que veux-tu faire ?', [
      {
        text: 'Renommer',
        onPress: () => onRenameBlock(block),
      },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => Alert.alert(
          'Supprimer le bloc',
          `Supprimer "${block.name}" et toutes ses séries ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => onRemoveBlock(block.id) },
          ]
        ),
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  function handleSetLongPress(set: TrainingSet) {
    Alert.alert(
      'Supprimer cette série ?',
      formatSet(set),
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => onRemoveSet(set.id) },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <PressableA11y
        accessibilityLabel={`${block.name}, appuyer longuement pour modifier`}
        accessibilityHint="Appuyer longuement pour renommer ou supprimer"
        onPress={() => {}}
        onLongPress={handleBlockLongPress}
      >
        <Text style={[styles.blockName, { color: colors.textSecondary }]}>{block.name}</Text>
      </PressableA11y>

      {block.sets.length === 0 ? (
        <Text style={[styles.set, { color: colors.textSecondary }]}>Aucune série.</Text>
      ) : (
        block.sets.map((set) => (
          <PressableA11y
            key={set.id}
            accessibilityLabel={`${formatSet(set)}, appuyer pour modifier`}
            accessibilityHint="Appuyer longuement pour supprimer"
            onPress={() => setEditingSet(set)}
            onLongPress={() => handleSetLongPress(set)}
          >
            <Text style={[styles.set, { color: colors.text }]}>
              {formatSet(set)}
            </Text>
          </PressableA11y>
        ))
      )}

      <PressableA11y
        accessibilityLabel="Ajouter une série"
        onPress={() => onAddSet(block.id)}
        style={styles.addBtn}
      >
        <Text style={[styles.addBtnText, { color: colors.primary }]}>+ Ajouter une série</Text>
      </PressableA11y>

      {editingSet && (
        <EditSetModal
          set={editingSet}
          onSave={async (dto) => { await onUpdateSet(editingSet.id, dto); }}
          onClose={() => setEditingSet(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4, paddingVertical: 8 },
  blockName: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  set: { fontSize: 14, lineHeight: 20, paddingVertical: 2 },
  addBtn: { marginTop: 4 },
  addBtnText: { fontSize: 13, fontWeight: '500' },
});
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```
npx tsc --noEmit
```

Attendu : pas d'erreur

- [ ] **Step 3 : Commit**

```
git add app/components/workout/BlockCard.tsx
git commit -m "feat(component): BlockCard — édition/ajout/suppression sets, rename/delete bloc"
```

---

## Task 8 : WorkoutExerciseCard + workout/[id].tsx — câblage final

**Files:**
- Modify: `app/components/workout/WorkoutExerciseCard.tsx`
- Modify: `app/app/workout/[id].tsx`

- [ ] **Step 1 : Mettre à jour WorkoutExerciseCard**

Remplacer le contenu de `app/components/workout/WorkoutExerciseCard.tsx` :

```typescript
import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WorkoutExerciseDetail, BlockWithSets } from '@/services/WorkoutExerciseService';
import type { Block } from '@/db/types';
import type { UpdateSetDto } from '@/repositories/ISetRepository';
import type { UpdateBlockDto } from '@/repositories/IBlockRepository';
import { BlockCard } from './BlockCard';
import { EditBlockModal } from './EditBlockModal';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface WorkoutExerciseCardProps {
  detail: WorkoutExerciseDetail;
  onRemove: () => void;
  onUpdateSet: (setId: number, dto: UpdateSetDto) => Promise<void>;
  onAddSet: (blockId: number) => Promise<void>;
  onRemoveSet: (setId: number) => Promise<void>;
  onAddBlock: (workoutExerciseId: number, name: string, isWorkBlock: 0 | 1) => Promise<void>;
  onUpdateBlock: (blockId: number, dto: UpdateBlockDto) => Promise<void>;
  onRemoveBlock: (blockId: number) => Promise<void>;
}

export function WorkoutExerciseCard({
  detail,
  onRemove,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
}: WorkoutExerciseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  function handleLongPress() {
    Alert.alert(detail.exercise.name, 'Que veux-tu faire ?', [
      { text: 'Supprimer', style: 'destructive', onPress: onRemove },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  function handleRenameBlock(block: BlockWithSets) {
    setEditingBlock(block);
  }

  function handleBlockModalClose() {
    setShowAddBlock(false);
    setEditingBlock(null);
  }

  async function handleBlockSave(name: string, isWorkBlock: 0 | 1) {
    if (editingBlock) {
      await onUpdateBlock(editingBlock.id, { name, is_work_block: isWorkBlock });
    } else {
      await onAddBlock(detail.id, name, isWorkBlock);
    }
    setShowAddBlock(false);
    setEditingBlock(null);
  }

  const parsedMuscles = detail.exercise.muscle_groups
    ? JSON.parse(detail.exercise.muscle_groups)
    : [];
  const muscleGroups = Array.isArray(parsedMuscles) ? parsedMuscles.join(', ') : '';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <PressableA11y
        accessibilityLabel={`${detail.exercise.name}, ${expanded ? 'réduire' : 'développer'}`}
        accessibilityHint="Appuyer longuement pour supprimer"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(e => !e)}
        onLongPress={handleLongPress}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {detail.exercise.name}
          </Text>
          {muscleGroups ? (
            <Text style={[styles.muscles, { color: colors.textSecondary }]} numberOfLines={1}>
              {muscleGroups}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
          importantForAccessibility="no"
          accessibilityElementsHidden={true}
        />
      </PressableA11y>

      {expanded && (
        <View style={styles.blocks}>
          {detail.blocks.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>Aucun bloc configuré.</Text>
          ) : (
            detail.blocks.map(block => (
              <BlockCard
                key={block.id}
                block={block}
                onUpdateSet={onUpdateSet}
                onAddSet={onAddSet}
                onRemoveSet={onRemoveSet}
                onRenameBlock={handleRenameBlock}
                onRemoveBlock={onRemoveBlock}
              />
            ))
          )}

          <PressableA11y
            accessibilityLabel="Ajouter un bloc"
            onPress={() => setShowAddBlock(true)}
            style={styles.addBlockBtn}
          >
            <Text style={[styles.addBlockText, { color: colors.primary }]}>+ Ajouter un bloc</Text>
          </PressableA11y>
        </View>
      )}

      <EditBlockModal
        visible={showAddBlock || editingBlock !== null}
        block={editingBlock}
        workoutExerciseId={detail.id}
        onSave={handleBlockSave}
        onClose={handleBlockModalClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8, minHeight: 56 },
  headerContent: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  muscles: { fontSize: 12 },
  blocks: { padding: 12, paddingTop: 0, gap: 8 },
  empty: { fontSize: 13, fontStyle: 'italic', paddingVertical: 4 },
  addBlockBtn: { marginTop: 4, paddingVertical: 8 },
  addBlockText: { fontSize: 13, fontWeight: '500' },
});
```

- [ ] **Step 2 : Mettre à jour workout/[id].tsx**

Remplacer le contenu de `app/app/workout/[id].tsx` :

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises';
import { WorkoutExerciseCard } from '@/components/workout/WorkoutExerciseCard';
import { WorkoutService } from '@/services/WorkoutService';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { getDb } from '@/db';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';

const FAB_ICON_COLOR = '#fff' as const;
const SHADOW_COLOR = '#000' as const;

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id) || 0;
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [workoutName, setWorkoutName] = useState('Séance');
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
  } = useWorkoutExercises(workoutId);

  useEffect(() => {
    const service = new WorkoutService(new SQLiteWorkoutRepository(getDb()));
    service.getById(workoutId).then(w => {
      if (w) setWorkoutName(w.name);
    });
  }, [workoutId]);

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) { isFirstFocus.current = false; return; }
      refresh();
    }, [refresh])
  );

  function confirmRemove(detail: WorkoutExerciseDetail) {
    Alert.alert(
      'Supprimer l\'exercice',
      `Supprimer "${detail.exercise.name}" de cette séance ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => remove(detail.id) },
      ]
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: workoutName }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={exercises}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <WorkoutExerciseCard
              detail={item}
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
        <PressableA11y
          accessibilityLabel="Ajouter un exercice"
          style={[styles.fab, { backgroundColor: colors.primary }]}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onPress={() => router.push({ pathname: '/add-workout-exercise' as any, params: { workoutId: String(workoutId) } })}
        >
          <Ionicons name="add" size={28} color={FAB_ICON_COLOR} />
        </PressableA11y>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 15 },
  errorText: { fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
```

- [ ] **Step 3 : Vérifier la compilation TypeScript**

```
npx tsc --noEmit
```

Attendu : pas d'erreur

- [ ] **Step 4 : Vérifier la suite de tests complète**

```
npx jest --no-coverage
```

Attendu : tous les tests verts (aucune régression)

- [ ] **Step 5 : Commit**

```
git add app/components/workout/WorkoutExerciseCard.tsx app/app/workout/[id].tsx
git commit -m "feat(screen): câblage édition sets/blocs — WorkoutExerciseCard + workout/[id].tsx"
```

---

## Vérification finale

Après la Task 8 :

```
npx jest --no-coverage
npx tsc --noEmit
```

Les deux commandes doivent passer sans erreur. Tester manuellement depuis l'app :
- Ouvrir une séance → développer un exercice
- Tapper sur une série → EditSetModal s'ouvre avec les valeurs pré-remplies
- Modifier les valeurs → Enregistrer → la série affiche les nouvelles valeurs
- Long press sur une série → Alert "Supprimer" → la série disparaît
- Bouton "+ Ajouter une série" → nouvelle série avec defaults apparaît
- Long press sur le nom du bloc → Alert Renommer / Supprimer
- Renommer → EditBlockModal s'ouvre pré-rempli → Enregistrer → nouveau nom affiché
- Supprimer → confirmation → bloc + séries disparaissent
- Bouton "+ Ajouter un bloc" → EditBlockModal vide → saisir nom → Enregistrer → nouveau bloc avec 1 série
