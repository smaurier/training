# Programmes — Implementation Plan (Session 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter CRUD complet Programme + Workout (2 niveaux) avec Repository pattern + TDD, menant à 4 écrans fonctionnels dans l'app.

**Architecture:** Repository pattern identique au module Exercices — Interface → InMemory (tests) → SQLite (prod). Services contiennent les règles métier. Hooks connectent les services aux écrans React Native.

**Tech Stack:** TypeScript, expo-sqlite (SQLiteDatabase), expo-router (navigation), React Native (UI), Jest/jest-expo (tests)

---

## Fichiers produits

```
app/db/index.ts                                    ← MODIFIER (PRAGMA foreign_keys)
app/repositories/
  IProgramRepository.ts                            ← créer
  InMemoryProgramRepository.ts                     ← créer
  SQLiteProgramRepository.ts                       ← créer
  programRepository.contract.ts                    ← créer
  InMemoryProgramRepository.test.ts                ← créer
  IWorkoutRepository.ts                            ← créer
  InMemoryWorkoutRepository.ts                     ← créer
  SQLiteWorkoutRepository.ts                       ← créer
  workoutRepository.contract.ts                    ← créer
  InMemoryWorkoutRepository.test.ts                ← créer
app/services/
  ProgramService.ts                                ← créer
  ProgramService.test.ts                           ← créer
  WorkoutService.ts                                ← créer
  WorkoutService.test.ts                           ← créer
app/hooks/
  usePrograms.ts                                   ← créer
  useWorkouts.ts                                   ← créer
app/components/programmes/
  ProgramCard.tsx                                  ← créer
  WorkoutCard.tsx                                  ← créer
app/app/
  _layout.tsx                                      ← MODIFIER (nouvelles routes)
  (tabs)/programmes.tsx                            ← MODIFIER (remplace placeholder)
  add-programme.tsx                                ← créer
  programme/[id].tsx                               ← créer
  add-workout.tsx                                  ← créer
```

---

## Task 1 : Activer les foreign keys SQLite

**Files:**
- Modify: `app/db/index.ts`

SQLite ignore les contraintes `ON DELETE CASCADE` par défaut. Sans ce fix, supprimer un programme ne supprime pas ses workouts.

- [ ] **Step 1 : Modifier `db/index.ts`**

```ts
import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';
import { seedExercises } from './seeds';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('training.db');
    _db.execSync('PRAGMA foreign_keys = ON');
  }
  return _db;
}

export async function initDatabase(): Promise<void> {
  const db = getDb();
  await runMigrations(db);
  await seedExercises(db);
}
```

- [ ] **Step 2 : Vérifier que les tests existants passent encore**

Commande (depuis `app/`) :
```
npm test
```
Attendu : `31 passed, 31 total`

- [ ] **Step 3 : Commit**

```bash
git add app/db/index.ts
git commit -m "fix(db): enable SQLite foreign key enforcement"
```

---

## Task 2 : IProgramRepository — interface et DTOs

**Files:**
- Create: `app/repositories/IProgramRepository.ts`

L'interface est le contrat que toutes les implémentations (InMemory, SQLite) respectent. Les DTOs définissent ce que le repo accepte en entrée.

- [ ] **Step 1 : Créer `repositories/IProgramRepository.ts`**

```ts
import { Program } from '../db/types';

export type CreateProgramDto = Omit<Program, 'id' | 'created_at'>;
export type UpdateProgramDto = Pick<Program, 'name' | 'description' | 'is_active'>;

export interface IProgramRepository {
  findAll(): Promise<Program[]>;
  findById(id: number): Promise<Program | null>;
  save(dto: CreateProgramDto): Promise<Program>;
  update(id: number, dto: UpdateProgramDto): Promise<Program>;
  delete(id: number): Promise<void>;
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

---

## Task 3 : InMemoryProgramRepository + contract tests → GREEN

**Files:**
- Create: `app/repositories/programRepository.contract.ts`
- Create: `app/repositories/InMemoryProgramRepository.ts`
- Create: `app/repositories/InMemoryProgramRepository.test.ts`

Le cycle TDD commence ici : on écrit les contract tests (RED), puis l'implémentation (GREEN).

- [ ] **Step 1 : Créer `repositories/programRepository.contract.ts`**

```ts
import { IProgramRepository, CreateProgramDto } from './IProgramRepository';

const push: CreateProgramDto = {
  name: 'Push',
  description: 'Pectoraux, épaules, triceps',
  is_active: 0,
};

export function runProgramRepositoryContractTests(
  createRepo: () => IProgramRepository
) {
  let repo: IProgramRepository;

  beforeEach(() => {
    repo = createRepo();
  });

  describe('save', () => {
    it('retourne un programme avec un id généré', async () => {
      const result = await repo.save(push);
      expect(result.id).toBeGreaterThan(0);
      expect(result.name).toBe('Push');
    });

    it('assigne des ids distincts', async () => {
      const a = await repo.save(push);
      const b = await repo.save({ ...push, name: 'Pull' });
      expect(a.id).not.toBe(b.id);
    });

    it('horodate created_at', async () => {
      const result = await repo.save(push);
      expect(result.created_at).toBeTruthy();
    });
  });

  describe('findAll', () => {
    it('retourne vide quand aucun programme', async () => {
      expect(await repo.findAll()).toHaveLength(0);
    });

    it('retourne tous les programmes sauvegardés', async () => {
      await repo.save(push);
      await repo.save({ ...push, name: 'Pull' });
      expect(await repo.findAll()).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('retourne le programme correspondant', async () => {
      const saved = await repo.save(push);
      const found = await repo.findById(saved.id);
      expect(found?.name).toBe('Push');
    });

    it('retourne null si id inconnu', async () => {
      expect(await repo.findById(999)).toBeNull();
    });
  });

  describe('update', () => {
    it('met à jour les champs', async () => {
      const saved = await repo.save(push);
      const updated = await repo.update(saved.id, {
        name: 'Push B',
        description: 'Version B',
        is_active: 1,
      });
      expect(updated.name).toBe('Push B');
      expect(updated.is_active).toBe(1);
    });

    it('lève une erreur si id inconnu', async () => {
      await expect(
        repo.update(999, { name: 'X', description: null, is_active: 0 })
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('supprime le programme', async () => {
      const saved = await repo.save(push);
      await repo.delete(saved.id);
      expect(await repo.findById(saved.id)).toBeNull();
    });

    it('ne supprime que le programme ciblé', async () => {
      const a = await repo.save(push);
      const b = await repo.save({ ...push, name: 'Pull' });
      await repo.delete(a.id);
      const remaining = await repo.findAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(b.id);
    });
  });
}
```

- [ ] **Step 2 : Créer `repositories/InMemoryProgramRepository.test.ts`** (RED)

```ts
import { InMemoryProgramRepository } from './InMemoryProgramRepository';
import { runProgramRepositoryContractTests } from './programRepository.contract';

describe('InMemoryProgramRepository', () => {
  runProgramRepositoryContractTests(() => new InMemoryProgramRepository());
});
```

- [ ] **Step 3 : Vérifier que le test est RED**

```
npm test -- repositories/InMemoryProgramRepository.test.ts
```
Attendu : FAIL — `Cannot find module './InMemoryProgramRepository'`

- [ ] **Step 4 : Créer `repositories/InMemoryProgramRepository.ts`** (GREEN)

```ts
import { Program } from '../db/types';
import { IProgramRepository, CreateProgramDto, UpdateProgramDto } from './IProgramRepository';

export class InMemoryProgramRepository implements IProgramRepository {
  private programs: Program[] = [];
  private nextId = 1;

  async findAll(): Promise<Program[]> {
    return [...this.programs];
  }

  async findById(id: number): Promise<Program | null> {
    return this.programs.find(p => p.id === id) ?? null;
  }

  async save(dto: CreateProgramDto): Promise<Program> {
    const program: Program = {
      ...dto,
      id: this.nextId++,
      created_at: new Date().toISOString(),
    };
    this.programs.push(program);
    return program;
  }

  async update(id: number, dto: UpdateProgramDto): Promise<Program> {
    const index = this.programs.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`Programme ${id} introuvable`);
    this.programs[index] = { ...this.programs[index], ...dto };
    return this.programs[index];
  }

  async delete(id: number): Promise<void> {
    this.programs = this.programs.filter(p => p.id !== id);
  }
}
```

- [ ] **Step 5 : Vérifier GREEN**

```
npm test -- repositories/InMemoryProgramRepository.test.ts
```
Attendu : `9 passed`

- [ ] **Step 6 : Commit**

```bash
git add app/repositories/IProgramRepository.ts app/repositories/InMemoryProgramRepository.ts app/repositories/programRepository.contract.ts app/repositories/InMemoryProgramRepository.test.ts
git commit -m "feat(repo): IProgramRepository + InMemory impl — 9 tests GREEN"
```

---

## Task 4 : SQLiteProgramRepository

**Files:**
- Create: `app/repositories/SQLiteProgramRepository.ts`

- [ ] **Step 1 : Créer `repositories/SQLiteProgramRepository.ts`**

```ts
import { SQLiteDatabase } from 'expo-sqlite';
import { Program } from '../db/types';
import { IProgramRepository, CreateProgramDto, UpdateProgramDto } from './IProgramRepository';

export class SQLiteProgramRepository implements IProgramRepository {
  constructor(private db: SQLiteDatabase) {}

  async findAll(): Promise<Program[]> {
    return this.db.getAllAsync<Program>('SELECT * FROM programs ORDER BY created_at DESC');
  }

  async findById(id: number): Promise<Program | null> {
    return this.db.getFirstAsync<Program>(
      'SELECT * FROM programs WHERE id = ?',
      [id]
    );
  }

  async save(dto: CreateProgramDto): Promise<Program> {
    const result = await this.db.runAsync(
      `INSERT INTO programs (name, description, is_active) VALUES (?, ?, ?)`,
      [dto.name, dto.description ?? null, dto.is_active]
    );
    const saved = await this.findById(result.lastInsertRowId);
    if (!saved) throw new Error(`Programme ${result.lastInsertRowId} introuvable après insertion`);
    return saved;
  }

  async update(id: number, dto: UpdateProgramDto): Promise<Program> {
    await this.db.runAsync(
      `UPDATE programs SET name = ?, description = ?, is_active = ? WHERE id = ?`,
      [dto.name, dto.description ?? null, dto.is_active, id]
    );
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Programme ${id} introuvable`);
    return updated;
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM programs WHERE id = ?', [id]);
  }
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/repositories/SQLiteProgramRepository.ts
git commit -m "feat(repo): SQLiteProgramRepository"
```

---

## Task 5 : ProgramService + tests RED → GREEN

**Files:**
- Create: `app/services/ProgramService.ts`
- Create: `app/services/ProgramService.test.ts`

Le service contient les règles métier : validation, setActive (un seul programme actif à la fois).

- [ ] **Step 1 : Écrire `services/ProgramService.test.ts`** (RED)

```ts
import { ProgramService, CreateProgramInput, UpdateProgramInput } from './ProgramService';
import { InMemoryProgramRepository } from '../repositories/InMemoryProgramRepository';

function makeService() {
  return new ProgramService(new InMemoryProgramRepository());
}

describe('ProgramService', () => {
  describe('create', () => {
    it('crée un programme valide', async () => {
      const svc = makeService();
      const result = await svc.create({ name: 'Push', description: null });
      expect(result.name).toBe('Push');
      expect(result.id).toBeGreaterThan(0);
    });

    it('lève une erreur si le nom est vide', async () => {
      const svc = makeService();
      await expect(svc.create({ name: '', description: null })).rejects.toThrow('Le nom est requis');
    });

    it('lève une erreur si le nom ne contient que des espaces', async () => {
      const svc = makeService();
      await expect(svc.create({ name: '   ', description: null })).rejects.toThrow('Le nom est requis');
    });

    it('crée avec is_active à 0 par défaut', async () => {
      const svc = makeService();
      const result = await svc.create({ name: 'Push', description: null });
      expect(result.is_active).toBe(0);
    });
  });

  describe('update', () => {
    it('met à jour le nom et la description', async () => {
      const svc = makeService();
      const created = await svc.create({ name: 'Push', description: null });
      const updated = await svc.update(created.id, { name: 'Push B', description: 'V2' });
      expect(updated.name).toBe('Push B');
      expect(updated.description).toBe('V2');
    });

    it('lève une erreur si le nom est vide', async () => {
      const svc = makeService();
      const created = await svc.create({ name: 'Push', description: null });
      await expect(svc.update(created.id, { name: '', description: null })).rejects.toThrow('Le nom est requis');
    });
  });

  describe('setActive', () => {
    it('marque un programme comme actif', async () => {
      const svc = makeService();
      const p = await svc.create({ name: 'Push', description: null });
      await svc.setActive(p.id);
      const updated = await svc.getById(p.id);
      expect(updated?.is_active).toBe(1);
    });

    it('désactive les autres programmes', async () => {
      const svc = makeService();
      const a = await svc.create({ name: 'Push', description: null });
      const b = await svc.create({ name: 'Pull', description: null });
      await svc.setActive(a.id);
      await svc.setActive(b.id);
      const updatedA = await svc.getById(a.id);
      expect(updatedA?.is_active).toBe(0);
    });
  });

  describe('remove', () => {
    it('supprime un programme existant', async () => {
      const svc = makeService();
      const p = await svc.create({ name: 'Push', description: null });
      await svc.remove(p.id);
      expect(await svc.getById(p.id)).toBeNull();
    });
  });

  describe('listAll', () => {
    it('retourne tous les programmes', async () => {
      const svc = makeService();
      await svc.create({ name: 'Push', description: null });
      await svc.create({ name: 'Pull', description: null });
      expect(await svc.listAll()).toHaveLength(2);
    });
  });
});
```

- [ ] **Step 2 : Vérifier RED**

```
npm test -- services/ProgramService.test.ts
```
Attendu : FAIL — `Cannot find module './ProgramService'`

- [ ] **Step 3 : Créer `services/ProgramService.ts`** (GREEN)

```ts
import { Program } from '../db/types';
import { IProgramRepository, CreateProgramDto } from '../repositories/IProgramRepository';

export interface CreateProgramInput {
  name: string;
  description?: string | null;
}

export interface UpdateProgramInput {
  name: string;
  description?: string | null;
}

export class ProgramService {
  constructor(private readonly repo: IProgramRepository) {}

  async create(input: CreateProgramInput): Promise<Program> {
    if (!input.name.trim()) throw new Error('Le nom est requis');
    const dto: CreateProgramDto = {
      name: input.name.trim(),
      description: input.description ?? null,
      is_active: 0,
    };
    return this.repo.save(dto);
  }

  async update(id: number, input: UpdateProgramInput): Promise<Program> {
    if (!input.name.trim()) throw new Error('Le nom est requis');
    const current = await this.repo.findById(id);
    if (!current) throw new Error(`Programme ${id} introuvable`);
    return this.repo.update(id, {
      name: input.name.trim(),
      description: input.description ?? null,
      is_active: current.is_active,
    });
  }

  async setActive(id: number): Promise<void> {
    const all = await this.repo.findAll();
    for (const p of all) {
      await this.repo.update(p.id, {
        name: p.name,
        description: p.description,
        is_active: p.id === id ? 1 : 0,
      });
    }
  }

  async listAll(): Promise<Program[]> {
    return this.repo.findAll();
  }

  async getById(id: number): Promise<Program | null> {
    return this.repo.findById(id);
  }

  async remove(id: number): Promise<void> {
    return this.repo.delete(id);
  }
}
```

- [ ] **Step 4 : Vérifier GREEN**

```
npm test -- services/ProgramService.test.ts
```
Attendu : `8 passed`

- [ ] **Step 5 : Vérifier tous les tests**

```
npm test
```
Attendu : `39 passed, 39 total`

- [ ] **Step 6 : Commit**

```bash
git add app/services/ProgramService.ts app/services/ProgramService.test.ts
git commit -m "feat(service): ProgramService — 8 tests GREEN"
```

---

## Task 6 : IWorkoutRepository — interface et DTOs

**Files:**
- Create: `app/repositories/IWorkoutRepository.ts`

- [ ] **Step 1 : Créer `repositories/IWorkoutRepository.ts`**

```ts
import { Workout } from '../db/types';

export type CreateWorkoutDto = Omit<Workout, 'id'>;
export type UpdateWorkoutDto = Pick<Workout, 'name' | 'order_index'>;

export interface IWorkoutRepository {
  findByProgramId(programId: number): Promise<Workout[]>;
  findById(id: number): Promise<Workout | null>;
  save(dto: CreateWorkoutDto): Promise<Workout>;
  update(id: number, dto: UpdateWorkoutDto): Promise<Workout>;
  delete(id: number): Promise<void>;
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

---

## Task 7 : InMemoryWorkoutRepository + contract tests → GREEN

**Files:**
- Create: `app/repositories/workoutRepository.contract.ts`
- Create: `app/repositories/InMemoryWorkoutRepository.ts`
- Create: `app/repositories/InMemoryWorkoutRepository.test.ts`

- [ ] **Step 1 : Créer `repositories/workoutRepository.contract.ts`**

```ts
import { IWorkoutRepository, CreateWorkoutDto } from './IWorkoutRepository';

const pushA: CreateWorkoutDto = {
  program_id: 1,
  name: 'Push A',
  order_index: 0,
};

export function runWorkoutRepositoryContractTests(
  createRepo: () => IWorkoutRepository
) {
  let repo: IWorkoutRepository;

  beforeEach(() => {
    repo = createRepo();
  });

  describe('save', () => {
    it('retourne une séance avec un id généré', async () => {
      const result = await repo.save(pushA);
      expect(result.id).toBeGreaterThan(0);
      expect(result.name).toBe('Push A');
    });

    it('assigne des ids distincts', async () => {
      const a = await repo.save(pushA);
      const b = await repo.save({ ...pushA, name: 'Push B' });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('findByProgramId', () => {
    it('retourne vide si aucune séance', async () => {
      expect(await repo.findByProgramId(1)).toHaveLength(0);
    });

    it('retourne les séances du programme', async () => {
      await repo.save(pushA);
      await repo.save({ ...pushA, name: 'Pull A' });
      expect(await repo.findByProgramId(1)).toHaveLength(2);
    });

    it('ne retourne pas les séances d\'un autre programme', async () => {
      await repo.save(pushA);
      await repo.save({ ...pushA, program_id: 2, name: 'Legs' });
      expect(await repo.findByProgramId(1)).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('retourne la séance correspondante', async () => {
      const saved = await repo.save(pushA);
      const found = await repo.findById(saved.id);
      expect(found?.name).toBe('Push A');
    });

    it('retourne null si id inconnu', async () => {
      expect(await repo.findById(999)).toBeNull();
    });
  });

  describe('update', () => {
    it('met à jour le nom', async () => {
      const saved = await repo.save(pushA);
      const updated = await repo.update(saved.id, { name: 'Push A v2', order_index: 1 });
      expect(updated.name).toBe('Push A v2');
    });

    it('lève une erreur si id inconnu', async () => {
      await expect(
        repo.update(999, { name: 'X', order_index: 0 })
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('supprime la séance', async () => {
      const saved = await repo.save(pushA);
      await repo.delete(saved.id);
      expect(await repo.findById(saved.id)).toBeNull();
    });

    it('ne supprime que la séance ciblée', async () => {
      const a = await repo.save(pushA);
      const b = await repo.save({ ...pushA, name: 'Pull A' });
      await repo.delete(a.id);
      const remaining = await repo.findByProgramId(1);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(b.id);
    });
  });
}
```

- [ ] **Step 2 : Créer `repositories/InMemoryWorkoutRepository.test.ts`** (RED)

```ts
import { InMemoryWorkoutRepository } from './InMemoryWorkoutRepository';
import { runWorkoutRepositoryContractTests } from './workoutRepository.contract';

describe('InMemoryWorkoutRepository', () => {
  runWorkoutRepositoryContractTests(() => new InMemoryWorkoutRepository());
});
```

- [ ] **Step 3 : Vérifier RED**

```
npm test -- repositories/InMemoryWorkoutRepository.test.ts
```
Attendu : FAIL — `Cannot find module './InMemoryWorkoutRepository'`

- [ ] **Step 4 : Créer `repositories/InMemoryWorkoutRepository.ts`** (GREEN)

```ts
import { Workout } from '../db/types';
import { IWorkoutRepository, CreateWorkoutDto, UpdateWorkoutDto } from './IWorkoutRepository';

export class InMemoryWorkoutRepository implements IWorkoutRepository {
  private workouts: Workout[] = [];
  private nextId = 1;

  async findByProgramId(programId: number): Promise<Workout[]> {
    return this.workouts.filter(w => w.program_id === programId);
  }

  async findById(id: number): Promise<Workout | null> {
    return this.workouts.find(w => w.id === id) ?? null;
  }

  async save(dto: CreateWorkoutDto): Promise<Workout> {
    const workout: Workout = { ...dto, id: this.nextId++ };
    this.workouts.push(workout);
    return workout;
  }

  async update(id: number, dto: UpdateWorkoutDto): Promise<Workout> {
    const index = this.workouts.findIndex(w => w.id === id);
    if (index === -1) throw new Error(`Séance ${id} introuvable`);
    this.workouts[index] = { ...this.workouts[index], ...dto };
    return this.workouts[index];
  }

  async delete(id: number): Promise<void> {
    this.workouts = this.workouts.filter(w => w.id !== id);
  }
}
```

- [ ] **Step 5 : Vérifier GREEN**

```
npm test -- repositories/InMemoryWorkoutRepository.test.ts
```
Attendu : `9 passed`

- [ ] **Step 6 : Commit**

```bash
git add app/repositories/IWorkoutRepository.ts app/repositories/InMemoryWorkoutRepository.ts app/repositories/workoutRepository.contract.ts app/repositories/InMemoryWorkoutRepository.test.ts
git commit -m "feat(repo): IWorkoutRepository + InMemory impl — 9 tests GREEN"
```

---

## Task 8 : SQLiteWorkoutRepository

**Files:**
- Create: `app/repositories/SQLiteWorkoutRepository.ts`

- [ ] **Step 1 : Créer `repositories/SQLiteWorkoutRepository.ts`**

```ts
import { SQLiteDatabase } from 'expo-sqlite';
import { Workout } from '../db/types';
import { IWorkoutRepository, CreateWorkoutDto, UpdateWorkoutDto } from './IWorkoutRepository';

export class SQLiteWorkoutRepository implements IWorkoutRepository {
  constructor(private db: SQLiteDatabase) {}

  async findByProgramId(programId: number): Promise<Workout[]> {
    return this.db.getAllAsync<Workout>(
      'SELECT * FROM workouts WHERE program_id = ? ORDER BY order_index',
      [programId]
    );
  }

  async findById(id: number): Promise<Workout | null> {
    return this.db.getFirstAsync<Workout>(
      'SELECT * FROM workouts WHERE id = ?',
      [id]
    );
  }

  async save(dto: CreateWorkoutDto): Promise<Workout> {
    const result = await this.db.runAsync(
      `INSERT INTO workouts (program_id, name, order_index) VALUES (?, ?, ?)`,
      [dto.program_id, dto.name, dto.order_index]
    );
    const saved = await this.findById(result.lastInsertRowId);
    if (!saved) throw new Error(`Séance ${result.lastInsertRowId} introuvable après insertion`);
    return saved;
  }

  async update(id: number, dto: UpdateWorkoutDto): Promise<Workout> {
    await this.db.runAsync(
      `UPDATE workouts SET name = ?, order_index = ? WHERE id = ?`,
      [dto.name, dto.order_index, id]
    );
    const updated = await this.findById(id);
    if (!updated) throw new Error(`Séance ${id} introuvable`);
    return updated;
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM workouts WHERE id = ?', [id]);
  }
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/repositories/SQLiteWorkoutRepository.ts
git commit -m "feat(repo): SQLiteWorkoutRepository"
```

---

## Task 9 : WorkoutService + tests RED → GREEN

**Files:**
- Create: `app/services/WorkoutService.ts`
- Create: `app/services/WorkoutService.test.ts`

- [ ] **Step 1 : Écrire `services/WorkoutService.test.ts`** (RED)

```ts
import { WorkoutService, CreateWorkoutInput, UpdateWorkoutInput } from './WorkoutService';
import { InMemoryWorkoutRepository } from '../repositories/InMemoryWorkoutRepository';

function makeService() {
  return new WorkoutService(new InMemoryWorkoutRepository());
}

describe('WorkoutService', () => {
  describe('create', () => {
    it('crée une séance valide', async () => {
      const svc = makeService();
      const result = await svc.create({ name: 'Push A', programId: 1 });
      expect(result.name).toBe('Push A');
      expect(result.program_id).toBe(1);
      expect(result.id).toBeGreaterThan(0);
    });

    it('lève une erreur si le nom est vide', async () => {
      const svc = makeService();
      await expect(svc.create({ name: '', programId: 1 })).rejects.toThrow('Le nom est requis');
    });

    it('assigne order_index = 0 pour la première séance', async () => {
      const svc = makeService();
      const result = await svc.create({ name: 'Push A', programId: 1 });
      expect(result.order_index).toBe(0);
    });

    it('incrémente order_index pour les séances suivantes', async () => {
      const svc = makeService();
      await svc.create({ name: 'Push A', programId: 1 });
      const second = await svc.create({ name: 'Pull A', programId: 1 });
      expect(second.order_index).toBe(1);
    });
  });

  describe('update', () => {
    it('met à jour le nom', async () => {
      const svc = makeService();
      const created = await svc.create({ name: 'Push A', programId: 1 });
      const updated = await svc.update(created.id, { name: 'Push A v2' });
      expect(updated.name).toBe('Push A v2');
    });

    it('lève une erreur si le nom est vide', async () => {
      const svc = makeService();
      const created = await svc.create({ name: 'Push A', programId: 1 });
      await expect(svc.update(created.id, { name: '' })).rejects.toThrow('Le nom est requis');
    });
  });

  describe('listByProgram', () => {
    it('retourne les séances du programme', async () => {
      const svc = makeService();
      await svc.create({ name: 'Push A', programId: 1 });
      await svc.create({ name: 'Pull A', programId: 1 });
      expect(await svc.listByProgram(1)).toHaveLength(2);
    });

    it('ne retourne pas les séances d\'un autre programme', async () => {
      const svc = makeService();
      await svc.create({ name: 'Push A', programId: 1 });
      await svc.create({ name: 'Legs', programId: 2 });
      expect(await svc.listByProgram(1)).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('supprime une séance existante', async () => {
      const svc = makeService();
      const w = await svc.create({ name: 'Push A', programId: 1 });
      await svc.remove(w.id);
      expect(await svc.getById(w.id)).toBeNull();
    });
  });
});
```

- [ ] **Step 2 : Vérifier RED**

```
npm test -- services/WorkoutService.test.ts
```
Attendu : FAIL — `Cannot find module './WorkoutService'`

- [ ] **Step 3 : Créer `services/WorkoutService.ts`** (GREEN)

```ts
import { Workout } from '../db/types';
import { IWorkoutRepository, CreateWorkoutDto } from '../repositories/IWorkoutRepository';

export interface CreateWorkoutInput {
  name: string;
  programId: number;
}

export interface UpdateWorkoutInput {
  name: string;
}

export class WorkoutService {
  constructor(private readonly repo: IWorkoutRepository) {}

  async create(input: CreateWorkoutInput): Promise<Workout> {
    if (!input.name.trim()) throw new Error('Le nom est requis');
    const existing = await this.repo.findByProgramId(input.programId);
    const dto: CreateWorkoutDto = {
      program_id: input.programId,
      name: input.name.trim(),
      order_index: existing.length,
    };
    return this.repo.save(dto);
  }

  async update(id: number, input: UpdateWorkoutInput): Promise<Workout> {
    if (!input.name.trim()) throw new Error('Le nom est requis');
    const current = await this.repo.findById(id);
    if (!current) throw new Error(`Séance ${id} introuvable`);
    return this.repo.update(id, {
      name: input.name.trim(),
      order_index: current.order_index,
    });
  }

  async listByProgram(programId: number): Promise<Workout[]> {
    return this.repo.findByProgramId(programId);
  }

  async getById(id: number): Promise<Workout | null> {
    return this.repo.findById(id);
  }

  async remove(id: number): Promise<void> {
    return this.repo.delete(id);
  }
}
```

- [ ] **Step 4 : Vérifier GREEN**

```
npm test -- services/WorkoutService.test.ts
```
Attendu : `8 passed`

- [ ] **Step 5 : Tous les tests**

```
npm test
```
Attendu : `47 passed, 47 total`

- [ ] **Step 6 : Commit**

```bash
git add app/services/WorkoutService.ts app/services/WorkoutService.test.ts
git commit -m "feat(service): WorkoutService — 8 tests GREEN"
```

---

## Task 10 : usePrograms hook

**Files:**
- Create: `app/hooks/usePrograms.ts`

- [ ] **Step 1 : Créer `hooks/usePrograms.ts`**

```ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { Program } from '../db/types';
import { ProgramService, CreateProgramInput, UpdateProgramInput } from '../services/ProgramService';
import { SQLiteProgramRepository } from '../repositories/SQLiteProgramRepository';
import { getDb } from '../db';

export interface UseProgramsResult {
  programs: Program[];
  loading: boolean;
  error: string | null;
  create: (input: CreateProgramInput) => Promise<void>;
  update: (id: number, input: UpdateProgramInput) => Promise<void>;
  remove: (id: number) => Promise<void>;
  setActive: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

function makeService(): ProgramService {
  return new ProgramService(new SQLiteProgramRepository(getDb()));
}

export function usePrograms(): UseProgramsResult {
  const serviceRef = useRef<ProgramService | null>(null);
  if (!serviceRef.current) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await service.listAll();
      if (mountedRef.current) setPrograms(data);
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [service]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: CreateProgramInput) => {
    try {
      await service.create(input);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const update = useCallback(async (id: number, input: UpdateProgramInput) => {
    try {
      await service.update(id, input);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const remove = useCallback(async (id: number) => {
    try {
      await service.remove(id);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const setActive = useCallback(async (id: number) => {
    try {
      await service.setActive(id);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  return { programs, loading, error, create, update, remove, setActive, refresh };
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/hooks/usePrograms.ts
git commit -m "feat(hook): usePrograms"
```

---

## Task 11 : useWorkouts hook

**Files:**
- Create: `app/hooks/useWorkouts.ts`

- [ ] **Step 1 : Créer `hooks/useWorkouts.ts`**

```ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { Workout } from '../db/types';
import { WorkoutService, CreateWorkoutInput, UpdateWorkoutInput } from '../services/WorkoutService';
import { SQLiteWorkoutRepository } from '../repositories/SQLiteWorkoutRepository';
import { getDb } from '../db';

export interface UseWorkoutsResult {
  workouts: Workout[];
  loading: boolean;
  error: string | null;
  create: (input: CreateWorkoutInput) => Promise<void>;
  update: (id: number, input: UpdateWorkoutInput) => Promise<void>;
  remove: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

function makeService(): WorkoutService {
  return new WorkoutService(new SQLiteWorkoutRepository(getDb()));
}

export function useWorkouts(programId: number): UseWorkoutsResult {
  const serviceRef = useRef<WorkoutService | null>(null);
  if (!serviceRef.current) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await service.listByProgram(programId);
      if (mountedRef.current) setWorkouts(data);
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [service, programId]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: CreateWorkoutInput) => {
    try {
      await service.create(input);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const update = useCallback(async (id: number, input: UpdateWorkoutInput) => {
    try {
      await service.update(id, input);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  const remove = useCallback(async (id: number) => {
    try {
      await service.remove(id);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

  return { workouts, loading, error, create, update, remove, refresh };
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/hooks/useWorkouts.ts
git commit -m "feat(hook): useWorkouts"
```

---

## Task 12 : Composants ProgramCard + WorkoutCard

**Files:**
- Create: `app/components/programmes/ProgramCard.tsx`
- Create: `app/components/programmes/WorkoutCard.tsx`

- [ ] **Step 1 : Créer `components/programmes/ProgramCard.tsx`**

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Program } from '@/db/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface ProgramCardProps {
  program: Program;
  workoutCount: number;
  onPress: () => void;
  onLongPress: () => void;
}

export function ProgramCard({ program, workoutCount, onPress, onLongPress }: ProgramCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`Programme ${program.name}, ${workoutCount} séance${workoutCount !== 1 ? 's' : ''}`}
      accessibilityHint="Appuie pour voir les séances, maintiens pour modifier ou supprimer"
    >
      <View style={styles.row}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {program.name}
        </Text>
        {program.is_active === 1 && (
          <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}
            accessibilityLabel="Programme actif"
            accessibilityRole="text"
          >
            <Text style={styles.activeBadgeText}>actif</Text>
          </View>
        )}
      </View>
      {program.description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {program.description}
        </Text>
      ) : null}
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {workoutCount} séance{workoutCount !== 1 ? 's' : ''}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 4,
    minHeight: 44,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2 : Créer `components/programmes/WorkoutCard.tsx`**

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Workout } from '@/db/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface WorkoutCardProps {
  workout: Workout;
  onPress: () => void;
  onLongPress: () => void;
}

export function WorkoutCard({ workout, onPress, onLongPress }: WorkoutCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`Séance ${workout.name}`}
      accessibilityHint="Appuie pour configurer les exercices, maintiens pour modifier ou supprimer"
    >
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
        {workout.name}
      </Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        0 exercice
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 4,
    minHeight: 44,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
});
```

- [ ] **Step 3 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add app/components/programmes/ProgramCard.tsx app/components/programmes/WorkoutCard.tsx
git commit -m "feat(ui): ProgramCard + WorkoutCard components"
```

---

## Task 13 : Enregistrer les nouvelles routes dans `_layout.tsx`

**Files:**
- Modify: `app/app/_layout.tsx`

Expo Router a besoin que chaque route soit déclarée dans le Stack du layout racine.

- [ ] **Step 1 : Modifier `app/app/_layout.tsx`**

Remplacer la fonction `RootLayoutNav` existante par :

```tsx
function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="add-exercise"
          options={{ presentation: 'modal', title: 'Nouvel exercice' }}
        />
        <Stack.Screen
          name="add-programme"
          options={{ presentation: 'modal', title: 'Programme' }}
        />
        <Stack.Screen
          name="programme/[id]"
          options={{ title: 'Programme' }}
        />
        <Stack.Screen
          name="add-workout"
          options={{ presentation: 'modal', title: 'Séance' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/app/_layout.tsx
git commit -m "feat(nav): register programme routes in root layout"
```

---

## Task 14 : Écran liste programmes `(tabs)/programmes.tsx`

**Files:**
- Modify: `app/app/(tabs)/programmes.tsx`

- [ ] **Step 1 : Remplacer le contenu de `app/(tabs)/programmes.tsx`**

```tsx
import { FlatList, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { usePrograms } from '@/hooks/usePrograms';
import { ProgramCard } from '@/components/programmes/ProgramCard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Program } from '@/db/types';

const FAB_ICON_COLOR = '#fff' as const;
const SHADOW_COLOR = '#000' as const;

export default function ProgrammesScreen() {
  const { programs, loading, error, remove, refresh } = usePrograms();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );

  function handleLongPress(program: Program) {
    Alert.alert(
      program.name,
      'Que veux-tu faire ?',
      [
        {
          text: 'Modifier',
          onPress: () => router.push({ pathname: '/add-programme', params: { id: String(program.id) } }),
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => confirmDelete(program),
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  }

  function confirmDelete(program: Program) {
    Alert.alert(
      'Supprimer le programme',
      `Supprimer "${program.name}" et toutes ses séances ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => remove(program.id),
        },
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={programs}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ProgramCard
            program={item}
            workoutCount={0}
            onPress={() => router.push({ pathname: '/programme/[id]', params: { id: String(item.id) } })}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            Aucun programme. Appuie sur + pour en créer un.
          </Text>
        }
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/add-programme')}
        accessibilityLabel="Créer un programme"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color={FAB_ICON_COLOR} />
      </TouchableOpacity>
    </View>
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

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add "app/app/(tabs)/programmes.tsx"
git commit -m "feat(screen): liste programmes avec FAB + long-press actions"
```

---

## Task 15 : Modal création/édition programme `add-programme.tsx`

**Files:**
- Create: `app/app/add-programme.tsx`

Le modal reçoit un paramètre `id` optionnel. Si présent, charge le programme existant et pré-remplit les champs.

- [ ] **Step 1 : Créer `app/app/add-programme.tsx`**

```tsx
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { usePrograms } from '@/hooks/usePrograms';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function AddProgrammeModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id ? Number(params.id) : null;
  const isEditing = editId !== null;

  const { create, update, programs } = usePrograms();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing && editId !== null) {
      const existing = programs.find(p => p.id === editId);
      if (existing) {
        setName(existing.name);
        setDescription(existing.description ?? '');
      }
    }
  }, [isEditing, editId, programs]);

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Champ requis', 'Le nom du programme est obligatoire.');
      return;
    }
    try {
      setSubmitting(true);
      if (isEditing && editId !== null) {
        await update(editId, { name: name.trim(), description: description.trim() || null });
      } else {
        await create({ name: name.trim(), description: description.trim() || null });
      }
      router.back();
    } catch (e) {
      setSubmitting(false);
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de sauvegarder.');
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.label, { color: colors.text }]}>Nom *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={name}
        onChangeText={setName}
        placeholder="ex. Push / Pull / Legs"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Nom du programme"
        autoFocus
      />

      <Text style={[styles.label, { color: colors.text }]}>Description</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={description}
        onChangeText={setDescription}
        placeholder="ex. Programme hypertrophie 4 jours"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Description du programme"
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={submitting}
        accessibilityLabel={isEditing ? 'Enregistrer les modifications' : 'Créer le programme'}
        accessibilityRole="button"
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>{isEditing ? 'Enregistrer' : 'Créer le programme'}</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    marginTop: 4,
  },
  inputMultiline: {
    height: 88,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/app/add-programme.tsx
git commit -m "feat(screen): modal création/édition programme"
```

---

## Task 16 : Écran détail programme `programme/[id].tsx`

**Files:**
- Create: `app/app/programme/[id].tsx`

- [ ] **Step 1 : Créer le dossier et le fichier `app/app/programme/[id].tsx`**

```tsx
import { FlatList, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { usePrograms } from '@/hooks/usePrograms';
import { useWorkouts } from '@/hooks/useWorkouts';
import { WorkoutCard } from '@/components/programmes/WorkoutCard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Workout } from '@/db/types';

const FAB_ICON_COLOR = '#fff' as const;
const SHADOW_COLOR = '#000' as const;

export default function ProgrammeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const programId = Number(id);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { programs } = usePrograms();
  const program = programs.find(p => p.id === programId);

  const { workouts, loading, error, remove, refresh } = useWorkouts(programId);

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );

  function handleLongPress(workout: Workout) {
    Alert.alert(
      workout.name,
      'Que veux-tu faire ?',
      [
        {
          text: 'Modifier',
          onPress: () =>
            router.push({ pathname: '/add-workout', params: { programId: String(programId), id: String(workout.id) } }),
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => confirmDelete(workout),
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  }

  function confirmDelete(workout: Workout) {
    Alert.alert(
      'Supprimer la séance',
      `Supprimer "${workout.name}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => remove(workout.id),
        },
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
      <Stack.Screen
        options={{
          title: program?.name ?? 'Programme',
          headerRight: () => (
            <TouchableOpacity
              onPress={() =>
                router.push({ pathname: '/add-programme', params: { id: String(programId) } })
              }
              style={styles.headerBtn}
              accessibilityLabel="Modifier le programme"
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={workouts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <WorkoutCard
              workout={item}
              onPress={() => {}}
              onLongPress={() => handleLongPress(item)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              Aucune séance. Appuie sur + pour en ajouter une.
            </Text>
          }
        />
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() =>
            router.push({ pathname: '/add-workout', params: { programId: String(programId) } })
          }
          accessibilityLabel="Ajouter une séance"
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
  headerBtn: { padding: 8 },
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

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add "app/app/programme/[id].tsx"
git commit -m "feat(screen): détail programme + liste séances"
```

---

## Task 17 : Modal création/édition séance `add-workout.tsx`

**Files:**
- Create: `app/app/add-workout.tsx`

- [ ] **Step 1 : Créer `app/app/add-workout.tsx`**

```tsx
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useWorkouts } from '@/hooks/useWorkouts';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function AddWorkoutModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ programId: string; id?: string }>();
  const programId = Number(params.programId);
  const editId = params.id ? Number(params.id) : null;
  const isEditing = editId !== null;

  const { create, update, workouts } = useWorkouts(programId);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing && editId !== null) {
      const existing = workouts.find(w => w.id === editId);
      if (existing) setName(existing.name);
    }
  }, [isEditing, editId, workouts]);

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Champ requis', 'Le nom de la séance est obligatoire.');
      return;
    }
    try {
      setSubmitting(true);
      if (isEditing && editId !== null) {
        await update(editId, { name: name.trim() });
      } else {
        await create({ name: name.trim(), programId });
      }
      router.back();
    } catch (e) {
      setSubmitting(false);
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de sauvegarder.');
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.label, { color: colors.text }]}>Nom de la séance *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={name}
        onChangeText={setName}
        placeholder="ex. Push A, Jambes, Full Body"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Nom de la séance"
        autoFocus
      />

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={submitting}
        accessibilityLabel={isEditing ? 'Enregistrer les modifications' : 'Créer la séance'}
        accessibilityRole="button"
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>{isEditing ? 'Enregistrer' : 'Créer la séance'}</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    marginTop: 4,
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 3 : Tous les tests**

```
npm test
```
Attendu : `47 passed, 47 total`

- [ ] **Step 4 : Commit**

```bash
git add app/app/add-workout.tsx
git commit -m "feat(screen): modal création/édition séance"
```

---

## Vérification finale

- [ ] Lancer l'app : `npm start` (depuis `app/`)
- [ ] Naviguer vers l'onglet Programmes
- [ ] Créer un programme via le FAB
- [ ] Taper sur le programme → voir l'écran détail
- [ ] Ajouter une séance via le FAB
- [ ] Long-press programme → modifier nom → vérifier pré-remplissage
- [ ] Long-press programme → supprimer → vérifier confirmation + disparition
- [ ] Long-press séance → modifier → supprimer
- [ ] Vérifier que l'onglet Exercices fonctionne toujours
