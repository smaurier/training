# WorkoutExercise + Block + Set — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter les repos/service/hook/composants/écrans pour configurer les exercices d'une séance (WorkoutExercise → Block → Set).

**Architecture:** 3 repos indépendants (IWorkoutExerciseRepository, IBlockRepository, ISetRepository) + 1 service orchestrateur (WorkoutExerciseService) qui compose un view model `WorkoutExerciseDetail`. La transaction SQLite est injectée via `TransactionRunner` pour garder le service testable sans SQLite. Screens → Hook → Service → Repos → SQLite.

**Tech Stack:** React Native + Expo SDK 54, TypeScript strict, expo-sqlite, expo-router, Jest (jest-expo), TDD Red/Green/Refactor.

---

## Fichiers créés / modifiés

```
# Créés
app/repositories/IWorkoutExerciseRepository.ts
app/repositories/workoutExerciseRepository.contract.ts
app/repositories/InMemoryWorkoutExerciseRepository.ts
app/repositories/InMemoryWorkoutExerciseRepository.test.ts
app/repositories/SQLiteWorkoutExerciseRepository.ts

app/repositories/IBlockRepository.ts
app/repositories/blockRepository.contract.ts
app/repositories/InMemoryBlockRepository.ts
app/repositories/InMemoryBlockRepository.test.ts
app/repositories/SQLiteBlockRepository.ts

app/repositories/ISetRepository.ts
app/repositories/setRepository.contract.ts
app/repositories/InMemorySetRepository.ts
app/repositories/InMemorySetRepository.test.ts
app/repositories/SQLiteSetRepository.ts

app/services/WorkoutExerciseService.ts
app/services/WorkoutExerciseService.test.ts

app/hooks/useWorkoutExercises.ts

app/components/workout/WorkoutExerciseCard.tsx
app/components/workout/BlockCard.tsx

app/app/workout/[id].tsx
app/app/add-workout-exercise.tsx

# Modifiés
app/app/_layout.tsx           ← +2 Stack.Screen
app/app/programme/[id].tsx    ← WorkoutCard.onPress → navigation
```

---

## Task 1 — IWorkoutExerciseRepository

**Files:**
- Create: `app/repositories/IWorkoutExerciseRepository.ts`
- Create: `app/repositories/workoutExerciseRepository.contract.ts`
- Create: `app/repositories/InMemoryWorkoutExerciseRepository.ts`
- Create: `app/repositories/InMemoryWorkoutExerciseRepository.test.ts`

- [ ] **Step 1 — Écrire l'interface**

`app/repositories/IWorkoutExerciseRepository.ts` :
```typescript
import type { WorkoutExercise } from '../db/types';

export type CreateWorkoutExerciseDto = Omit<WorkoutExercise, 'id'>;

export interface IWorkoutExerciseRepository {
  findByWorkoutId(workoutId: number): Promise<WorkoutExercise[]>;
  findById(id: number): Promise<WorkoutExercise | null>;
  save(dto: CreateWorkoutExerciseDto): Promise<WorkoutExercise>;
  delete(id: number): Promise<void>;
}
```

- [ ] **Step 2 — Écrire le contrat de tests**

`app/repositories/workoutExerciseRepository.contract.ts` :
```typescript
import { IWorkoutExerciseRepository, CreateWorkoutExerciseDto } from './IWorkoutExerciseRepository';

const we1: CreateWorkoutExerciseDto = { workout_id: 1, exercise_id: 1, order_index: 0 };

export function runWorkoutExerciseRepositoryContractTests(
  createRepo: () => IWorkoutExerciseRepository
) {
  let repo: IWorkoutExerciseRepository;
  beforeEach(() => { repo = createRepo(); });

  describe('save', () => {
    it('retourne un workout_exercise avec un id généré', async () => {
      const result = await repo.save(we1);
      expect(result.id).toBeGreaterThan(0);
      expect(result.workout_id).toBe(1);
      expect(result.exercise_id).toBe(1);
    });
    it('assigne des ids distincts', async () => {
      const a = await repo.save(we1);
      const b = await repo.save({ ...we1, exercise_id: 2 });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('findByWorkoutId', () => {
    it('retourne vide si aucun exercice', async () => {
      expect(await repo.findByWorkoutId(1)).toHaveLength(0);
    });
    it('retourne les exercices de la séance', async () => {
      await repo.save(we1);
      await repo.save({ ...we1, exercise_id: 2, order_index: 1 });
      expect(await repo.findByWorkoutId(1)).toHaveLength(2);
    });
    it("ne retourne pas les exercices d'une autre séance", async () => {
      await repo.save(we1);
      await repo.save({ ...we1, workout_id: 2 });
      expect(await repo.findByWorkoutId(1)).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('retourne le workout_exercise correspondant', async () => {
      const saved = await repo.save(we1);
      expect((await repo.findById(saved.id))?.exercise_id).toBe(1);
    });
    it('retourne null si id inconnu', async () => {
      expect(await repo.findById(999)).toBeNull();
    });
  });

  describe('delete', () => {
    it('supprime le workout_exercise', async () => {
      const saved = await repo.save(we1);
      await repo.delete(saved.id);
      expect(await repo.findById(saved.id)).toBeNull();
    });
    it('ne supprime que le workout_exercise ciblé', async () => {
      const a = await repo.save(we1);
      const b = await repo.save({ ...we1, exercise_id: 2, order_index: 1 });
      await repo.delete(a.id);
      const remaining = await repo.findByWorkoutId(1);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(b.id);
    });
  });
}
```

- [ ] **Step 3 — Écrire le fichier de test (RED)**

`app/repositories/InMemoryWorkoutExerciseRepository.test.ts` :
```typescript
import { InMemoryWorkoutExerciseRepository } from './InMemoryWorkoutExerciseRepository';
import { runWorkoutExerciseRepositoryContractTests } from './workoutExerciseRepository.contract';

describe('InMemoryWorkoutExerciseRepository', () => {
  runWorkoutExerciseRepositoryContractTests(() => new InMemoryWorkoutExerciseRepository());
});
```

- [ ] **Step 4 — Vérifier que le test échoue**

Depuis `app/` : `npm test -- --testPathPattern="InMemoryWorkoutExerciseRepository" --no-coverage`
Attendu : FAIL — `Cannot find module './InMemoryWorkoutExerciseRepository'`

- [ ] **Step 5 — Implémenter InMemoryWorkoutExerciseRepository (GREEN)**

`app/repositories/InMemoryWorkoutExerciseRepository.ts` :
```typescript
import type { WorkoutExercise } from '../db/types';
import { IWorkoutExerciseRepository, CreateWorkoutExerciseDto } from './IWorkoutExerciseRepository';

export class InMemoryWorkoutExerciseRepository implements IWorkoutExerciseRepository {
  private items: WorkoutExercise[] = [];
  private nextId = 1;

  async findByWorkoutId(workoutId: number): Promise<WorkoutExercise[]> {
    return this.items.filter(i => i.workout_id === workoutId);
  }

  async findById(id: number): Promise<WorkoutExercise | null> {
    return this.items.find(i => i.id === id) ?? null;
  }

  async save(dto: CreateWorkoutExerciseDto): Promise<WorkoutExercise> {
    const item: WorkoutExercise = { ...dto, id: this.nextId++ };
    this.items.push(item);
    return item;
  }

  async delete(id: number): Promise<void> {
    this.items = this.items.filter(i => i.id !== id);
  }
}
```

- [ ] **Step 6 — Vérifier que les tests passent**

`npm test -- --testPathPattern="InMemoryWorkoutExerciseRepository" --no-coverage`
Attendu : PASS — 7 tests GREEN

- [ ] **Step 7 — Créer SQLiteWorkoutExerciseRepository**

`app/repositories/SQLiteWorkoutExerciseRepository.ts` :
```typescript
import { SQLiteDatabase } from 'expo-sqlite';
import type { WorkoutExercise } from '../db/types';
import { IWorkoutExerciseRepository, CreateWorkoutExerciseDto } from './IWorkoutExerciseRepository';

export class SQLiteWorkoutExerciseRepository implements IWorkoutExerciseRepository {
  constructor(private db: SQLiteDatabase) {}

  async findByWorkoutId(workoutId: number): Promise<WorkoutExercise[]> {
    return this.db.getAllAsync<WorkoutExercise>(
      'SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY order_index',
      [workoutId]
    );
  }

  async findById(id: number): Promise<WorkoutExercise | null> {
    return this.db.getFirstAsync<WorkoutExercise>(
      'SELECT * FROM workout_exercises WHERE id = ?',
      [id]
    );
  }

  async save(dto: CreateWorkoutExerciseDto): Promise<WorkoutExercise> {
    const result = await this.db.runAsync(
      'INSERT INTO workout_exercises (workout_id, exercise_id, order_index) VALUES (?, ?, ?)',
      [dto.workout_id, dto.exercise_id, dto.order_index]
    );
    const saved = await this.findById(result.lastInsertRowId);
    if (!saved) throw new Error(`WorkoutExercise ${result.lastInsertRowId} introuvable après insertion`);
    return saved;
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM workout_exercises WHERE id = ?', [id]);
  }
}
```

- [ ] **Step 8 — Vérifier TypeScript**

`npx tsc --noEmit`
Attendu : 0 erreur

- [ ] **Step 9 — Commit**

```bash
git add app/repositories/IWorkoutExerciseRepository.ts \
        app/repositories/workoutExerciseRepository.contract.ts \
        app/repositories/InMemoryWorkoutExerciseRepository.ts \
        app/repositories/InMemoryWorkoutExerciseRepository.test.ts \
        app/repositories/SQLiteWorkoutExerciseRepository.ts
git commit -m "feat(repo): IWorkoutExerciseRepository + InMemory + SQLite"
```

---

## Task 2 — IBlockRepository

**Files:**
- Create: `app/repositories/IBlockRepository.ts`
- Create: `app/repositories/blockRepository.contract.ts`
- Create: `app/repositories/InMemoryBlockRepository.ts`
- Create: `app/repositories/InMemoryBlockRepository.test.ts`
- Create: `app/repositories/SQLiteBlockRepository.ts`

- [ ] **Step 1 — Interface**

`app/repositories/IBlockRepository.ts` :
```typescript
import type { Block } from '../db/types';

export type CreateBlockDto = Omit<Block, 'id'>;

export interface IBlockRepository {
  findByWorkoutExerciseId(workoutExerciseId: number): Promise<Block[]>;
  findById(id: number): Promise<Block | null>;
  save(dto: CreateBlockDto): Promise<Block>;
  delete(id: number): Promise<void>;
}
```

- [ ] **Step 2 — Contrat**

`app/repositories/blockRepository.contract.ts` :
```typescript
import { IBlockRepository, CreateBlockDto } from './IBlockRepository';

const bloc1: CreateBlockDto = { workout_exercise_id: 1, name: 'Travail', order_index: 0, is_work_block: 1 };

export function runBlockRepositoryContractTests(createRepo: () => IBlockRepository) {
  let repo: IBlockRepository;
  beforeEach(() => { repo = createRepo(); });

  describe('save', () => {
    it('retourne un block avec un id généré', async () => {
      const result = await repo.save(bloc1);
      expect(result.id).toBeGreaterThan(0);
      expect(result.name).toBe('Travail');
    });
    it('assigne des ids distincts', async () => {
      const a = await repo.save(bloc1);
      const b = await repo.save({ ...bloc1, name: 'Échauffement', order_index: 1 });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('findByWorkoutExerciseId', () => {
    it('retourne vide si aucun bloc', async () => {
      expect(await repo.findByWorkoutExerciseId(1)).toHaveLength(0);
    });
    it('retourne les blocs du workout_exercise', async () => {
      await repo.save(bloc1);
      await repo.save({ ...bloc1, name: 'Back-off', order_index: 1 });
      expect(await repo.findByWorkoutExerciseId(1)).toHaveLength(2);
    });
    it("ne retourne pas les blocs d'un autre workout_exercise", async () => {
      await repo.save(bloc1);
      await repo.save({ ...bloc1, workout_exercise_id: 2 });
      expect(await repo.findByWorkoutExerciseId(1)).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('retourne le bloc correspondant', async () => {
      const saved = await repo.save(bloc1);
      expect((await repo.findById(saved.id))?.name).toBe('Travail');
    });
    it('retourne null si id inconnu', async () => {
      expect(await repo.findById(999)).toBeNull();
    });
  });

  describe('delete', () => {
    it('supprime le bloc', async () => {
      const saved = await repo.save(bloc1);
      await repo.delete(saved.id);
      expect(await repo.findById(saved.id)).toBeNull();
    });
    it('ne supprime que le bloc ciblé', async () => {
      const a = await repo.save(bloc1);
      const b = await repo.save({ ...bloc1, name: 'Back-off', order_index: 1 });
      await repo.delete(a.id);
      const remaining = await repo.findByWorkoutExerciseId(1);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(b.id);
    });
  });
}
```

- [ ] **Step 3 — Test file (RED)**

`app/repositories/InMemoryBlockRepository.test.ts` :
```typescript
import { InMemoryBlockRepository } from './InMemoryBlockRepository';
import { runBlockRepositoryContractTests } from './blockRepository.contract';

describe('InMemoryBlockRepository', () => {
  runBlockRepositoryContractTests(() => new InMemoryBlockRepository());
});
```

- [ ] **Step 4 — Vérifier FAIL**

`npm test -- --testPathPattern="InMemoryBlockRepository" --no-coverage`
Attendu : FAIL — `Cannot find module './InMemoryBlockRepository'`

- [ ] **Step 5 — InMemoryBlockRepository (GREEN)**

`app/repositories/InMemoryBlockRepository.ts` :
```typescript
import type { Block } from '../db/types';
import { IBlockRepository, CreateBlockDto } from './IBlockRepository';

export class InMemoryBlockRepository implements IBlockRepository {
  private items: Block[] = [];
  private nextId = 1;

  async findByWorkoutExerciseId(workoutExerciseId: number): Promise<Block[]> {
    return this.items.filter(i => i.workout_exercise_id === workoutExerciseId);
  }

  async findById(id: number): Promise<Block | null> {
    return this.items.find(i => i.id === id) ?? null;
  }

  async save(dto: CreateBlockDto): Promise<Block> {
    const item: Block = { ...dto, id: this.nextId++ };
    this.items.push(item);
    return item;
  }

  async delete(id: number): Promise<void> {
    this.items = this.items.filter(i => i.id !== id);
  }
}
```

- [ ] **Step 6 — Vérifier PASS**

`npm test -- --testPathPattern="InMemoryBlockRepository" --no-coverage`
Attendu : PASS — 7 tests GREEN

- [ ] **Step 7 — SQLiteBlockRepository**

`app/repositories/SQLiteBlockRepository.ts` :
```typescript
import { SQLiteDatabase } from 'expo-sqlite';
import type { Block } from '../db/types';
import { IBlockRepository, CreateBlockDto } from './IBlockRepository';

export class SQLiteBlockRepository implements IBlockRepository {
  constructor(private db: SQLiteDatabase) {}

  async findByWorkoutExerciseId(workoutExerciseId: number): Promise<Block[]> {
    return this.db.getAllAsync<Block>(
      'SELECT * FROM blocks WHERE workout_exercise_id = ? ORDER BY order_index',
      [workoutExerciseId]
    );
  }

  async findById(id: number): Promise<Block | null> {
    return this.db.getFirstAsync<Block>('SELECT * FROM blocks WHERE id = ?', [id]);
  }

  async save(dto: CreateBlockDto): Promise<Block> {
    const result = await this.db.runAsync(
      'INSERT INTO blocks (workout_exercise_id, name, order_index, is_work_block) VALUES (?, ?, ?, ?)',
      [dto.workout_exercise_id, dto.name, dto.order_index, dto.is_work_block]
    );
    const saved = await this.findById(result.lastInsertRowId);
    if (!saved) throw new Error(`Block ${result.lastInsertRowId} introuvable après insertion`);
    return saved;
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM blocks WHERE id = ?', [id]);
  }
}
```

- [ ] **Step 8 — TypeScript**

`npx tsc --noEmit` → 0 erreur

- [ ] **Step 9 — Commit**

```bash
git add app/repositories/IBlockRepository.ts \
        app/repositories/blockRepository.contract.ts \
        app/repositories/InMemoryBlockRepository.ts \
        app/repositories/InMemoryBlockRepository.test.ts \
        app/repositories/SQLiteBlockRepository.ts
git commit -m "feat(repo): IBlockRepository + InMemory + SQLite"
```

---

## Task 3 — ISetRepository

**Files:**
- Create: `app/repositories/ISetRepository.ts`
- Create: `app/repositories/setRepository.contract.ts`
- Create: `app/repositories/InMemorySetRepository.ts`
- Create: `app/repositories/InMemorySetRepository.test.ts`
- Create: `app/repositories/SQLiteSetRepository.ts`

> Note : `Set` dans `db/types.ts` entre en conflit avec le global JS `Set`. Utiliser `import type { Set as TrainingSet }` dans les fichiers qui ont besoin des deux, ou `import type { Set }` (type-only, pas de conflit runtime).

- [ ] **Step 1 — Interface**

`app/repositories/ISetRepository.ts` :
```typescript
import type { Set } from '../db/types';

export type CreateSetDto = Omit<Set, 'id'>;

export interface ISetRepository {
  findByBlockId(blockId: number): Promise<Set[]>;
  findById(id: number): Promise<Set | null>;
  save(dto: CreateSetDto): Promise<Set>;
  delete(id: number): Promise<void>;
}
```

- [ ] **Step 2 — Contrat**

`app/repositories/setRepository.contract.ts` :
```typescript
import { ISetRepository, CreateSetDto } from './ISetRepository';

const serie1: CreateSetDto = {
  block_id: 1,
  reps_min: 6,
  reps_max: 8,
  weight: null,
  weight_type: 'fixed',
  rest_duration: 120,
  order_index: 0,
};

export function runSetRepositoryContractTests(createRepo: () => ISetRepository) {
  let repo: ISetRepository;
  beforeEach(() => { repo = createRepo(); });

  describe('save', () => {
    it('retourne une série avec un id généré', async () => {
      const result = await repo.save(serie1);
      expect(result.id).toBeGreaterThan(0);
      expect(result.reps_min).toBe(6);
      expect(result.reps_max).toBe(8);
    });
    it('assigne des ids distincts', async () => {
      const a = await repo.save(serie1);
      const b = await repo.save({ ...serie1, order_index: 1 });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('findByBlockId', () => {
    it('retourne vide si aucune série', async () => {
      expect(await repo.findByBlockId(1)).toHaveLength(0);
    });
    it('retourne les séries du bloc', async () => {
      await repo.save(serie1);
      await repo.save({ ...serie1, order_index: 1 });
      expect(await repo.findByBlockId(1)).toHaveLength(2);
    });
    it("ne retourne pas les séries d'un autre bloc", async () => {
      await repo.save(serie1);
      await repo.save({ ...serie1, block_id: 2 });
      expect(await repo.findByBlockId(1)).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('retourne la série correspondante', async () => {
      const saved = await repo.save(serie1);
      expect((await repo.findById(saved.id))?.reps_max).toBe(8);
    });
    it('retourne null si id inconnu', async () => {
      expect(await repo.findById(999)).toBeNull();
    });
  });

  describe('delete', () => {
    it('supprime la série', async () => {
      const saved = await repo.save(serie1);
      await repo.delete(saved.id);
      expect(await repo.findById(saved.id)).toBeNull();
    });
    it('ne supprime que la série ciblée', async () => {
      const a = await repo.save(serie1);
      const b = await repo.save({ ...serie1, order_index: 1 });
      await repo.delete(a.id);
      const remaining = await repo.findByBlockId(1);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(b.id);
    });
  });
}
```

- [ ] **Step 3 — Test file (RED)**

`app/repositories/InMemorySetRepository.test.ts` :
```typescript
import { InMemorySetRepository } from './InMemorySetRepository';
import { runSetRepositoryContractTests } from './setRepository.contract';

describe('InMemorySetRepository', () => {
  runSetRepositoryContractTests(() => new InMemorySetRepository());
});
```

- [ ] **Step 4 — Vérifier FAIL**

`npm test -- --testPathPattern="InMemorySetRepository" --no-coverage`
Attendu : FAIL — `Cannot find module './InMemorySetRepository'`

- [ ] **Step 5 — InMemorySetRepository (GREEN)**

`app/repositories/InMemorySetRepository.ts` :
```typescript
import type { Set as TrainingSet } from '../db/types';
import { ISetRepository, CreateSetDto } from './ISetRepository';

export class InMemorySetRepository implements ISetRepository {
  private items: TrainingSet[] = [];
  private nextId = 1;

  async findByBlockId(blockId: number): Promise<TrainingSet[]> {
    return this.items.filter(i => i.block_id === blockId);
  }

  async findById(id: number): Promise<TrainingSet | null> {
    return this.items.find(i => i.id === id) ?? null;
  }

  async save(dto: CreateSetDto): Promise<TrainingSet> {
    const item: TrainingSet = { ...dto, id: this.nextId++ };
    this.items.push(item);
    return item;
  }

  async delete(id: number): Promise<void> {
    this.items = this.items.filter(i => i.id !== id);
  }
}
```

- [ ] **Step 6 — Vérifier PASS**

`npm test -- --testPathPattern="InMemorySetRepository" --no-coverage`
Attendu : PASS — 7 tests GREEN

- [ ] **Step 7 — SQLiteSetRepository**

`app/repositories/SQLiteSetRepository.ts` :
```typescript
import { SQLiteDatabase } from 'expo-sqlite';
import type { Set as TrainingSet } from '../db/types';
import { ISetRepository, CreateSetDto } from './ISetRepository';

export class SQLiteSetRepository implements ISetRepository {
  constructor(private db: SQLiteDatabase) {}

  async findByBlockId(blockId: number): Promise<TrainingSet[]> {
    return this.db.getAllAsync<TrainingSet>(
      'SELECT * FROM sets WHERE block_id = ? ORDER BY order_index',
      [blockId]
    );
  }

  async findById(id: number): Promise<TrainingSet | null> {
    return this.db.getFirstAsync<TrainingSet>('SELECT * FROM sets WHERE id = ?', [id]);
  }

  async save(dto: CreateSetDto): Promise<TrainingSet> {
    const result = await this.db.runAsync(
      'INSERT INTO sets (block_id, reps_min, reps_max, weight, weight_type, rest_duration, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dto.block_id, dto.reps_min, dto.reps_max, dto.weight, dto.weight_type, dto.rest_duration, dto.order_index]
    );
    const saved = await this.findById(result.lastInsertRowId);
    if (!saved) throw new Error(`Set ${result.lastInsertRowId} introuvable après insertion`);
    return saved;
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM sets WHERE id = ?', [id]);
  }
}
```

- [ ] **Step 8 — TypeScript**

`npx tsc --noEmit` → 0 erreur

- [ ] **Step 9 — Commit**

```bash
git add app/repositories/ISetRepository.ts \
        app/repositories/setRepository.contract.ts \
        app/repositories/InMemorySetRepository.ts \
        app/repositories/InMemorySetRepository.test.ts \
        app/repositories/SQLiteSetRepository.ts
git commit -m "feat(repo): ISetRepository + InMemory + SQLite"
```

---

## Task 4 — WorkoutExerciseService

**Files:**
- Create: `app/services/WorkoutExerciseService.ts`
- Create: `app/services/WorkoutExerciseService.test.ts`

- [ ] **Step 1 — Écrire les tests (RED)**

`app/services/WorkoutExerciseService.test.ts` :
```typescript
import { WorkoutExerciseService } from './WorkoutExerciseService';
import { InMemoryWorkoutExerciseRepository } from '../repositories/InMemoryWorkoutExerciseRepository';
import { InMemoryBlockRepository } from '../repositories/InMemoryBlockRepository';
import { InMemorySetRepository } from '../repositories/InMemorySetRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';

const noopTransaction = async (fn: () => Promise<void>) => fn();

function makeService() {
  const weRepo = new InMemoryWorkoutExerciseRepository();
  const blockRepo = new InMemoryBlockRepository();
  const setRepo = new InMemorySetRepository();
  const exerciseRepo = new InMemoryExerciseRepository();
  const service = new WorkoutExerciseService(weRepo, blockRepo, setRepo, exerciseRepo, noopTransaction);
  return { service, exerciseRepo };
}

async function seedExercise(exerciseRepo: InMemoryExerciseRepository) {
  return exerciseRepo.save({
    name: 'Développé couché',
    type: 'musculation',
    muscle_groups: '["pectoraux"]',
    technical_notes: null,
    is_custom: 0,
    progression_step: 2,
    progression_threshold: 1,
  });
}

describe('WorkoutExerciseService', () => {
  describe('addToWorkout', () => {
    it('crée workout_exercise + block Travail + 1 série par défaut', async () => {
      const { service, exerciseRepo } = makeService();
      const exercise = await seedExercise(exerciseRepo);
      const detail = await service.addToWorkout(1, exercise.id);
      expect(detail.id).toBeGreaterThan(0);
      expect(detail.exercise.name).toBe('Développé couché');
      expect(detail.blocks).toHaveLength(1);
      expect(detail.blocks[0].name).toBe('Travail');
      expect(detail.blocks[0].sets).toHaveLength(1);
      expect(detail.blocks[0].sets[0].reps_min).toBe(3);
      expect(detail.blocks[0].sets[0].reps_max).toBe(8);
      expect(detail.blocks[0].sets[0].weight).toBeNull();
    });

    it('lève une erreur si exercice inexistant', async () => {
      const { service } = makeService();
      await expect(service.addToWorkout(1, 999)).rejects.toThrow('Exercice 999 introuvable');
    });

    it("assigne order_index = nombre d'exercices existants", async () => {
      const { service, exerciseRepo } = makeService();
      const ex1 = await seedExercise(exerciseRepo);
      const ex2 = await exerciseRepo.save({ ...ex1, name: 'Squat' });
      const first = await service.addToWorkout(1, ex1.id);
      const second = await service.addToWorkout(1, ex2.id);
      expect(first.order_index).toBe(0);
      expect(second.order_index).toBe(1);
    });
  });

  describe('getWithDetails', () => {
    it('retourne tableau vide si aucun exercice', async () => {
      const { service } = makeService();
      expect(await service.getWithDetails(1)).toHaveLength(0);
    });

    it('retourne les details complets', async () => {
      const { service, exerciseRepo } = makeService();
      const exercise = await seedExercise(exerciseRepo);
      await service.addToWorkout(1, exercise.id);
      const details = await service.getWithDetails(1);
      expect(details).toHaveLength(1);
      expect(details[0].exercise.name).toBe('Développé couché');
      expect(details[0].blocks[0].sets).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('supprime le workout_exercise', async () => {
      const { service, exerciseRepo } = makeService();
      const exercise = await seedExercise(exerciseRepo);
      const detail = await service.addToWorkout(1, exercise.id);
      await service.remove(detail.id);
      expect(await service.getWithDetails(1)).toHaveLength(0);
    });
  });
});
```

- [ ] **Step 2 — Vérifier FAIL**

`npm test -- --testPathPattern="WorkoutExerciseService" --no-coverage`
Attendu : FAIL — `Cannot find module './WorkoutExerciseService'`

- [ ] **Step 3 — Implémenter WorkoutExerciseService (GREEN)**

`app/services/WorkoutExerciseService.ts` :
```typescript
import type { WorkoutExercise, Exercise, Block, Set as TrainingSet } from '../db/types';
import { IWorkoutExerciseRepository } from '../repositories/IWorkoutExerciseRepository';
import { IBlockRepository } from '../repositories/IBlockRepository';
import { ISetRepository } from '../repositories/ISetRepository';
import { IExerciseRepository } from '../repositories/IExerciseRepository';

export type TransactionRunner = (fn: () => Promise<void>) => Promise<void>;

export interface BlockWithSets {
  id: number;
  name: string;
  order_index: number;
  is_work_block: 0 | 1;
  sets: TrainingSet[];
}

export interface WorkoutExerciseDetail {
  id: number;
  workout_id: number;
  order_index: number;
  exercise: Pick<Exercise, 'id' | 'name' | 'technical_notes' | 'muscle_groups'>;
  blocks: BlockWithSets[];
}

export class WorkoutExerciseService {
  constructor(
    private weRepo: IWorkoutExerciseRepository,
    private blockRepo: IBlockRepository,
    private setRepo: ISetRepository,
    private exerciseRepo: IExerciseRepository,
    private runInTransaction: TransactionRunner
  ) {}

  async addToWorkout(workoutId: number, exerciseId: number): Promise<WorkoutExerciseDetail> {
    const exercise = await this.exerciseRepo.findById(exerciseId);
    if (!exercise) throw new Error(`Exercice ${exerciseId} introuvable`);

    const existing = await this.weRepo.findByWorkoutId(workoutId);
    const orderIndex = existing.length;

    let savedWe!: WorkoutExercise;

    await this.runInTransaction(async () => {
      savedWe = await this.weRepo.save({ workout_id: workoutId, exercise_id: exerciseId, order_index: orderIndex });
      const block = await this.blockRepo.save({
        workout_exercise_id: savedWe.id,
        name: 'Travail',
        order_index: 0,
        is_work_block: 1,
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

    return this.loadDetail(savedWe, exercise);
  }

  async getWithDetails(workoutId: number): Promise<WorkoutExerciseDetail[]> {
    const wes = await this.weRepo.findByWorkoutId(workoutId);
    return Promise.all(wes.map(async (we) => {
      const exercise = await this.exerciseRepo.findById(we.exercise_id);
      if (!exercise) throw new Error(`Exercice ${we.exercise_id} introuvable`);
      return this.loadDetail(we, exercise);
    }));
  }

  async remove(id: number): Promise<void> {
    await this.weRepo.delete(id);
  }

  private async loadDetail(we: WorkoutExercise, exercise: Exercise): Promise<WorkoutExerciseDetail> {
    const blocks = await this.blockRepo.findByWorkoutExerciseId(we.id);
    const blocksWithSets: BlockWithSets[] = await Promise.all(
      blocks.map(async (block: Block) => ({
        ...block,
        sets: await this.setRepo.findByBlockId(block.id),
      }))
    );
    return {
      id: we.id,
      workout_id: we.workout_id,
      order_index: we.order_index,
      exercise: {
        id: exercise.id,
        name: exercise.name,
        technical_notes: exercise.technical_notes,
        muscle_groups: exercise.muscle_groups,
      },
      blocks: blocksWithSets,
    };
  }
}
```

- [ ] **Step 4 — Vérifier PASS**

`npm test -- --testPathPattern="WorkoutExerciseService" --no-coverage`
Attendu : PASS — 6 tests GREEN

- [ ] **Step 5 — Suite complète**

`npm test --no-coverage`
Attendu : toutes les suites GREEN (75+ tests)

- [ ] **Step 6 — TypeScript**

`npx tsc --noEmit` → 0 erreur

- [ ] **Step 7 — Commit**

```bash
git add app/services/WorkoutExerciseService.ts app/services/WorkoutExerciseService.test.ts
git commit -m "feat(service): WorkoutExerciseService — addToWorkout, getWithDetails, remove"
```

---

## Task 5 — useWorkoutExercises hook

**Files:**
- Create: `app/hooks/useWorkoutExercises.ts`

- [ ] **Step 1 — Implémenter le hook**

`app/hooks/useWorkoutExercises.ts` :
```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { WorkoutExerciseService, WorkoutExerciseDetail } from '../services/WorkoutExerciseService';
import { SQLiteWorkoutExerciseRepository } from '../repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '../repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '../repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { getDb } from '../db';

export interface UseWorkoutExercisesResult {
  exercises: WorkoutExerciseDetail[];
  loading: boolean;
  error: string | null;
  add: (exerciseId: number) => Promise<void>;
  remove: (workoutExerciseId: number) => Promise<void>;
  refresh: () => Promise<void>;
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

  return { exercises, loading, error, add, remove, refresh };
}
```

- [ ] **Step 2 — TypeScript**

`npx tsc --noEmit` → 0 erreur

- [ ] **Step 3 — Commit**

```bash
git add app/hooks/useWorkoutExercises.ts
git commit -m "feat(hook): useWorkoutExercises"
```

---

## Task 6 — Composants WorkoutExerciseCard + BlockCard

**Files:**
- Create: `app/components/workout/BlockCard.tsx`
- Create: `app/components/workout/WorkoutExerciseCard.tsx`

- [ ] **Step 1 — BlockCard**

`app/components/workout/BlockCard.tsx` :
```typescript
import { View, Text, StyleSheet } from 'react-native';
import type { BlockWithSets } from '@/services/WorkoutExerciseService';
import type { Set as TrainingSet } from '@/db/types';

interface ColorsSubset {
  text: string;
  textSecondary: string;
}

interface BlockCardProps {
  block: BlockWithSets;
  colors: ColorsSubset;
}

function formatSet(set: TrainingSet): string {
  const reps = set.reps_min === set.reps_max
    ? `${set.reps_min} reps`
    : `${set.reps_min}–${set.reps_max} reps`;

  let weight: string;
  if (set.weight_type === 'bodyweight') weight = 'PC';
  else if (set.weight_type === 'bar') weight = 'barre';
  else weight = set.weight != null ? `${set.weight} kg` : '— kg';

  const rest = set.rest_duration >= 60
    ? `${Math.round(set.rest_duration / 60)} min`
    : `${set.rest_duration} s`;

  return `${reps} @ ${weight} — ${rest}`;
}

export function BlockCard({ block, colors }: BlockCardProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.blockName, { color: colors.textSecondary }]}>{block.name}</Text>
      {block.sets.length === 0 ? (
        <Text style={[styles.set, { color: colors.textSecondary }]}>Aucune série.</Text>
      ) : (
        block.sets.map((set) => (
          <Text key={set.id} style={[styles.set, { color: colors.text }]}>
            {formatSet(set)}
          </Text>
        ))
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
  set: { fontSize: 14, lineHeight: 20 },
});
```

- [ ] **Step 2 — WorkoutExerciseCard**

`app/components/workout/WorkoutExerciseCard.tsx` :
```typescript
import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';
import { BlockCard } from './BlockCard';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface WorkoutExerciseCardProps {
  detail: WorkoutExerciseDetail;
  onRemove: () => void;
}

export function WorkoutExerciseCard({ detail, onRemove }: WorkoutExerciseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  function handleLongPress() {
    Alert.alert(detail.exercise.name, 'Que veux-tu faire ?', [
      { text: 'Supprimer', style: 'destructive', onPress: onRemove },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  let muscleGroups = '';
  try {
    const parsed = JSON.parse(detail.exercise.muscle_groups);
    muscleGroups = Array.isArray(parsed) ? parsed.join(', ') : '';
  } catch {
    muscleGroups = '';
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <PressableA11y
        accessibilityLabel={`${detail.exercise.name}, ${expanded ? 'réduire' : 'développer'}`}
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
        />
      </PressableA11y>
      {expanded && (
        <View style={styles.blocks}>
          {detail.blocks.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>Aucun bloc configuré.</Text>
          ) : (
            detail.blocks.map(block => (
              <BlockCard key={block.id} block={block} colors={colors} />
            ))
          )}
        </View>
      )}
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
});
```

- [ ] **Step 3 — TypeScript**

`npx tsc --noEmit` → 0 erreur

- [ ] **Step 4 — Commit**

```bash
git add app/components/workout/BlockCard.tsx app/components/workout/WorkoutExerciseCard.tsx
git commit -m "feat(ui): WorkoutExerciseCard accordeon + BlockCard"
```

---

## Task 7 — Écran workout/[id].tsx + _layout.tsx

**Files:**
- Create: `app/app/workout/[id].tsx`
- Modify: `app/app/_layout.tsx`

- [ ] **Step 1 — Créer l'écran**

`app/app/workout/[id].tsx` :
```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  const { exercises, loading, error, remove, refresh } = useWorkoutExercises(workoutId);

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
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              Aucun exercice. Appuie sur + pour en ajouter un.
            </Text>
          }
        />
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => router.push({ pathname: '/add-workout-exercise', params: { workoutId: String(workoutId) } })}
          accessibilityLabel="Ajouter un exercice"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={28} color={FAB_ICON_COLOR} />
        </TouchableOpacity>
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

- [ ] **Step 2 — Enregistrer les routes dans _layout.tsx**

Dans `app/app/_layout.tsx`, ajouter après le `<Stack.Screen name="add-workout" .../>` existant :

```typescript
        <Stack.Screen name="workout/[id]" options={{ title: 'Séance' }} />
        <Stack.Screen
          name="add-workout-exercise"
          options={{ presentation: 'modal', title: 'Ajouter un exercice' }}
        />
```

Le bloc `<Stack>` complet après modification :
```typescript
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-exercise" options={{ presentation: 'modal', title: 'Nouvel exercice' }} />
        <Stack.Screen name="add-programme" options={{ presentation: 'modal', title: 'Programme' }} />
        <Stack.Screen name="programme/[id]" options={{ title: 'Programme' }} />
        <Stack.Screen name="add-workout" options={{ presentation: 'modal', title: 'Séance' }} />
        <Stack.Screen name="workout/[id]" options={{ title: 'Séance' }} />
        <Stack.Screen name="add-workout-exercise" options={{ presentation: 'modal', title: 'Ajouter un exercice' }} />
      </Stack>
```

- [ ] **Step 3 — TypeScript**

`npx tsc --noEmit` → 0 erreur

- [ ] **Step 4 — Commit**

```bash
git add app/app/workout app/app/_layout.tsx
git commit -m "feat(screen): workout/[id] — liste exercices avec accordeon"
```

---

## Task 8 — Modal add-workout-exercise

**Files:**
- Create: `app/app/add-workout-exercise.tsx`

- [ ] **Step 1 — Créer la modal**

`app/app/add-workout-exercise.tsx` :
```typescript
import { useState } from 'react';
import { View, Text, FlatList, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises';
import { useExercises } from '@/hooks/useExercises';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { Exercise } from '@/db/types';

export default function AddWorkoutExerciseScreen() {
  const { workoutId: workoutIdParam } = useLocalSearchParams<{ workoutId: string }>();
  const workoutId = Number(workoutIdParam) || 0;
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [search, setSearch] = useState('');
  const { add } = useWorkoutExercises(workoutId);
  const { exercises, loading } = useExercises();

  const filtered = exercises.filter(ex => {
    const q = search.toLowerCase();
    return ex.name.toLowerCase().includes(q) || ex.muscle_groups.toLowerCase().includes(q);
  });

  async function handleSelect(exercise: Exercise) {
    await add(exercise.id);
    router.back();
  }

  function parseMuscleGroups(raw: string): string {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.join(', ') : '';
    } catch {
      return '';
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Ajouter un exercice' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TextInput
          style={[styles.search, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
          placeholder="Rechercher..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Rechercher un exercice"
        />
        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <PressableA11y
                accessibilityLabel={`Ajouter ${item.name}`}
                accessibilityHint="Ajoute cet exercice à la séance"
                onPress={() => handleSelect(item)}
                style={[styles.item, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.itemMuscles, { color: colors.textSecondary }]} numberOfLines={1}>
                  {parseMuscleGroups(item.muscle_groups)}
                </Text>
              </PressableA11y>
            )}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                Aucun exercice trouvé.
              </Text>
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: { margin: 16, padding: 12, borderRadius: 8, borderWidth: 1, fontSize: 15 },
  loader: { marginTop: 48 },
  item: { padding: 16, borderBottomWidth: 1, gap: 2 },
  itemName: { fontSize: 15, fontWeight: '500' },
  itemMuscles: { fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 15 },
});
```

- [ ] **Step 2 — TypeScript**

`npx tsc --noEmit` → 0 erreur

- [ ] **Step 3 — Commit**

```bash
git add app/app/add-workout-exercise.tsx
git commit -m "feat(screen): add-workout-exercise modal — sélection exercice"
```

---

## Task 9 — Brancher la navigation dans programme/[id].tsx

**Files:**
- Modify: `app/app/programme/[id].tsx:117`

- [ ] **Step 1 — Remplacer le placeholder par la navigation**

Dans `app/app/programme/[id].tsx`, remplacer :
```typescript
              onPress={() => Alert.alert('Bientôt disponible', 'La configuration des exercices arrive dans la prochaine session.')}
```
par :
```typescript
              onPress={() => router.push(`/workout/${item.id}`)}
```

- [ ] **Step 2 — Supprimer l'import Alert si plus utilisé**

Vérifier si `Alert` est encore utilisé dans le fichier (il l'est, pour le long press). Laisser l'import.

- [ ] **Step 3 — TypeScript**

`npx tsc --noEmit` → 0 erreur

- [ ] **Step 4 — Tests complets**

`npm test --no-coverage`
Attendu : toutes suites GREEN

- [ ] **Step 5 — Commit final**

```bash
git add app/app/programme/[id].tsx
git commit -m "feat(nav): WorkoutCard.onPress → workout/[id]"
```

---

## Vérification finale

- [ ] Lancer l'app : `npm start` depuis `app/`
- [ ] Naviguer : Programmes → programme → séance → écran vide → "+"
- [ ] Ajouter un exercice → revenir → exercice visible dans la liste
- [ ] Taper sur l'exercice → accordéon s'ouvre → bloc "Travail" + 1 série "3–8 reps @ — kg — 2 min"
- [ ] Long press → Alert → Supprimer → exercice disparu
