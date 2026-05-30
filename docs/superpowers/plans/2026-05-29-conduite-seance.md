# Conduite de séance guidée — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter la conduite de séance guidée : check-in état du jour → navigation série par série avec timer → résumé avec progressions automatiques.

**Architecture:** State machine à 3 phases (`checkin` | `running` | `summary`) dans un seul écran `session/[workoutId].tsx`. Nouvelles couches repo/service suivent le pattern existant (Interface → InMemory → SQLite + contract tests TDD). `SessionService` orchestre la logique métier, `useSession` expose l'état et les actions à l'écran.

**Tech Stack:** React Native + Expo SDK 54, expo-sqlite, TypeScript strict, jest-expo, Expo Router file-based navigation.

---

## Fichiers créés / modifiés

```
app/repositories/
  ISessionLogRepository.ts          ← nouveau
  InMemorySessionLogRepository.ts   ← nouveau
  SQLiteSessionLogRepository.ts     ← nouveau
  sessionLogRepository.contract.ts  ← nouveau
  InMemorySessionLogRepository.test.ts ← nouveau
  ISetLogRepository.ts              ← nouveau
  InMemorySetLogRepository.ts       ← nouveau
  SQLiteSetLogRepository.ts         ← nouveau
  setLogRepository.contract.ts      ← nouveau
  InMemorySetLogRepository.test.ts  ← nouveau
  IPersonalRecordRepository.ts      ← nouveau
  InMemoryPersonalRecordRepository.ts ← nouveau
  SQLitePersonalRecordRepository.ts ← nouveau
  personalRecordRepository.contract.ts ← nouveau
  InMemoryPersonalRecordRepository.test.ts ← nouveau

app/services/
  SessionService.ts                 ← nouveau
  SessionService.test.ts            ← nouveau

app/hooks/
  useTimer.ts                       ← nouveau
  useSession.ts                     ← nouveau

app/components/session/
  CheckInPhase.tsx                  ← nouveau
  RunningPhase.tsx                  ← nouveau
  SummaryPhase.tsx                  ← nouveau

app/app/
  session/[workoutId].tsx           ← nouveau
  _layout.tsx                       ← modifié (+1 Stack.Screen)
  workout/[id].tsx                  ← modifié (bouton Démarrer)
  (tabs)/index.tsx                  ← modifié (carte prochaine séance)
```

---

## Task 1 : ISessionLogRepository

**Files:**
- Create: `app/repositories/ISessionLogRepository.ts`
- Create: `app/repositories/sessionLogRepository.contract.ts`
- Create: `app/repositories/InMemorySessionLogRepository.ts`
- Create: `app/repositories/InMemorySessionLogRepository.test.ts`
- Create: `app/repositories/SQLiteSessionLogRepository.ts`

- [ ] **Step 1 : Écrire l'interface**

```typescript
// app/repositories/ISessionLogRepository.ts
import type { SessionLog } from '../db/types';

export type CreateSessionLogDto = Omit<SessionLog, 'id' | 'ended_at'>;

export interface ISessionLogRepository {
  save(dto: CreateSessionLogDto): Promise<SessionLog>;
  findById(id: number): Promise<SessionLog | null>;
  findByWorkoutId(workoutId: number): Promise<SessionLog[]>;
  findLatestByWorkoutIds(workoutIds: number[]): Promise<SessionLog | null>;
  complete(id: number, endedAt: string): Promise<void>;
}
```

- [ ] **Step 2 : Écrire les contract tests (RED)**

```typescript
// app/repositories/sessionLogRepository.contract.ts
import { ISessionLogRepository, CreateSessionLogDto } from './ISessionLogRepository';

const dto1: CreateSessionLogDto = {
  workout_id: 1,
  started_at: '2026-01-01T10:00:00.000Z',
  checkin_energy: 3,
  checkin_fatigue: 2,
  checkin_sleep: 3,
  notes: null,
};

export function runSessionLogRepositoryContractTests(createRepo: () => ISessionLogRepository) {
  let repo: ISessionLogRepository;
  beforeEach(() => { repo = createRepo(); });

  describe('save', () => {
    it('retourne un SessionLog avec id généré et ended_at null', async () => {
      const result = await repo.save(dto1);
      expect(result.id).toBeGreaterThan(0);
      expect(result.workout_id).toBe(1);
      expect(result.ended_at).toBeNull();
      expect(result.checkin_energy).toBe(3);
    });
    it('assigne des ids distincts', async () => {
      const a = await repo.save(dto1);
      const b = await repo.save({ ...dto1, started_at: '2026-01-02T10:00:00.000Z' });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('findById', () => {
    it('retourne le log correspondant', async () => {
      const saved = await repo.save(dto1);
      const found = await repo.findById(saved.id);
      expect(found?.workout_id).toBe(1);
    });
    it('retourne null si id inconnu', async () => {
      expect(await repo.findById(999)).toBeNull();
    });
  });

  describe('findByWorkoutId', () => {
    it('retourne vide si aucun log', async () => {
      expect(await repo.findByWorkoutId(1)).toHaveLength(0);
    });
    it('retourne les logs du workout', async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, started_at: '2026-01-02T10:00:00.000Z' });
      expect(await repo.findByWorkoutId(1)).toHaveLength(2);
    });
    it("ne retourne pas les logs d'un autre workout", async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, workout_id: 2, started_at: '2026-01-02T10:00:00.000Z' });
      expect(await repo.findByWorkoutId(1)).toHaveLength(1);
    });
  });

  describe('findLatestByWorkoutIds', () => {
    it('retourne null si aucun log', async () => {
      expect(await repo.findLatestByWorkoutIds([1, 2])).toBeNull();
    });
    it('retourne le log le plus récent parmi plusieurs workouts', async () => {
      await repo.save({ ...dto1, workout_id: 1, started_at: '2026-01-01T10:00:00.000Z' });
      await repo.save({ ...dto1, workout_id: 2, started_at: '2026-01-03T10:00:00.000Z' });
      const latest = await repo.findLatestByWorkoutIds([1, 2]);
      expect(latest?.workout_id).toBe(2);
    });
    it('retourne null si workoutIds vide', async () => {
      await repo.save(dto1);
      expect(await repo.findLatestByWorkoutIds([])).toBeNull();
    });
  });

  describe('complete', () => {
    it('met à jour ended_at', async () => {
      const saved = await repo.save(dto1);
      await repo.complete(saved.id, '2026-01-01T11:00:00.000Z');
      const updated = await repo.findById(saved.id);
      expect(updated?.ended_at).toBe('2026-01-01T11:00:00.000Z');
    });
  });
}
```

- [ ] **Step 3 : Écrire InMemorySessionLogRepository**

```typescript
// app/repositories/InMemorySessionLogRepository.ts
import type { SessionLog } from '../db/types';
import { ISessionLogRepository, CreateSessionLogDto } from './ISessionLogRepository';

export class InMemorySessionLogRepository implements ISessionLogRepository {
  private items: SessionLog[] = [];
  private nextId = 1;

  async save(dto: CreateSessionLogDto): Promise<SessionLog> {
    const item: SessionLog = { ...dto, id: this.nextId++, ended_at: null };
    this.items.push(item);
    return item;
  }

  async findById(id: number): Promise<SessionLog | null> {
    return this.items.find(i => i.id === id) ?? null;
  }

  async findByWorkoutId(workoutId: number): Promise<SessionLog[]> {
    return this.items.filter(i => i.workout_id === workoutId);
  }

  async findLatestByWorkoutIds(workoutIds: number[]): Promise<SessionLog | null> {
    if (workoutIds.length === 0) return null;
    const matching = this.items
      .filter(i => workoutIds.includes(i.workout_id))
      .sort((a, b) => b.started_at.localeCompare(a.started_at));
    return matching[0] ?? null;
  }

  async complete(id: number, endedAt: string): Promise<void> {
    const item = this.items.find(i => i.id === id);
    if (item) item.ended_at = endedAt;
  }
}
```

- [ ] **Step 4 : Écrire le test file InMemory**

```typescript
// app/repositories/InMemorySessionLogRepository.test.ts
import { InMemorySessionLogRepository } from './InMemorySessionLogRepository';
import { runSessionLogRepositoryContractTests } from './sessionLogRepository.contract';

describe('InMemorySessionLogRepository', () => {
  runSessionLogRepositoryContractTests(() => new InMemorySessionLogRepository());
});
```

- [ ] **Step 5 : Lancer les tests (GREEN attendu)**

```
npx jest --testPathPattern=InMemorySessionLogRepository
```
Attendu : 8 tests PASS.

- [ ] **Step 6 : Écrire SQLiteSessionLogRepository**

```typescript
// app/repositories/SQLiteSessionLogRepository.ts
import { SQLiteDatabase } from 'expo-sqlite';
import type { SessionLog } from '../db/types';
import { ISessionLogRepository, CreateSessionLogDto } from './ISessionLogRepository';

export class SQLiteSessionLogRepository implements ISessionLogRepository {
  constructor(private db: SQLiteDatabase) {}

  async save(dto: CreateSessionLogDto): Promise<SessionLog> {
    const result = await this.db.runAsync(
      'INSERT INTO session_logs (workout_id, started_at, checkin_energy, checkin_fatigue, checkin_sleep, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [dto.workout_id, dto.started_at, dto.checkin_energy, dto.checkin_fatigue, dto.checkin_sleep, dto.notes]
    );
    const saved = await this.findById(result.lastInsertRowId);
    if (!saved) throw new Error(`SessionLog ${result.lastInsertRowId} introuvable après insertion`);
    return saved;
  }

  async findById(id: number): Promise<SessionLog | null> {
    return this.db.getFirstAsync<SessionLog>('SELECT * FROM session_logs WHERE id = ?', [id]);
  }

  async findByWorkoutId(workoutId: number): Promise<SessionLog[]> {
    return this.db.getAllAsync<SessionLog>(
      'SELECT * FROM session_logs WHERE workout_id = ? ORDER BY started_at DESC',
      [workoutId]
    );
  }

  async findLatestByWorkoutIds(workoutIds: number[]): Promise<SessionLog | null> {
    if (workoutIds.length === 0) return null;
    const placeholders = workoutIds.map(() => '?').join(',');
    return this.db.getFirstAsync<SessionLog>(
      `SELECT * FROM session_logs WHERE workout_id IN (${placeholders}) ORDER BY started_at DESC LIMIT 1`,
      workoutIds
    );
  }

  async complete(id: number, endedAt: string): Promise<void> {
    await this.db.runAsync('UPDATE session_logs SET ended_at = ? WHERE id = ?', [endedAt, id]);
  }
}
```

- [ ] **Step 7 : Commit**

```bash
git add app/repositories/ISessionLogRepository.ts app/repositories/InMemorySessionLogRepository.ts app/repositories/SQLiteSessionLogRepository.ts app/repositories/sessionLogRepository.contract.ts app/repositories/InMemorySessionLogRepository.test.ts
git commit -m "feat(repo): ISessionLogRepository — interface + InMemory + SQLite"
```

---

## Task 2 : ISetLogRepository

**Files:**
- Create: `app/repositories/ISetLogRepository.ts`
- Create: `app/repositories/setLogRepository.contract.ts`
- Create: `app/repositories/InMemorySetLogRepository.ts`
- Create: `app/repositories/InMemorySetLogRepository.test.ts`
- Create: `app/repositories/SQLiteSetLogRepository.ts`

- [ ] **Step 1 : Interface**

```typescript
// app/repositories/ISetLogRepository.ts
import type { SetLog } from '../db/types';

export type CreateSetLogDto = Omit<SetLog, 'id'>;

export interface ISetLogRepository {
  save(dto: CreateSetLogDto): Promise<SetLog>;
  findBySessionLogId(sessionLogId: number): Promise<SetLog[]>;
  findBySetId(setId: number): Promise<SetLog[]>;
}
```

- [ ] **Step 2 : Contract tests**

```typescript
// app/repositories/setLogRepository.contract.ts
import { ISetLogRepository, CreateSetLogDto } from './ISetLogRepository';

const dto1: CreateSetLogDto = {
  session_log_id: 1,
  set_id: 10,
  exercise_id: 5,
  reps_done: 8,
  weight_done: 80,
  rpe: 8,
  completed_at: '2026-01-01T10:05:00.000Z',
};

export function runSetLogRepositoryContractTests(createRepo: () => ISetLogRepository) {
  let repo: ISetLogRepository;
  beforeEach(() => { repo = createRepo(); });

  describe('save', () => {
    it('retourne un SetLog avec id généré', async () => {
      const result = await repo.save(dto1);
      expect(result.id).toBeGreaterThan(0);
      expect(result.reps_done).toBe(8);
      expect(result.weight_done).toBe(80);
      expect(result.rpe).toBe(8);
    });
    it('accepte rpe null', async () => {
      const result = await repo.save({ ...dto1, rpe: null });
      expect(result.rpe).toBeNull();
    });
  });

  describe('findBySessionLogId', () => {
    it('retourne vide si aucun log', async () => {
      expect(await repo.findBySessionLogId(1)).toHaveLength(0);
    });
    it('retourne les logs de la session', async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, set_id: 11, completed_at: '2026-01-01T10:06:00.000Z' });
      expect(await repo.findBySessionLogId(1)).toHaveLength(2);
    });
    it("ne retourne pas les logs d'une autre session", async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, session_log_id: 2, set_id: 11, completed_at: '2026-01-01T10:06:00.000Z' });
      expect(await repo.findBySessionLogId(1)).toHaveLength(1);
    });
  });

  describe('findBySetId', () => {
    it('retourne vide si aucun log', async () => {
      expect(await repo.findBySetId(10)).toHaveLength(0);
    });
    it('retourne les logs pour ce set', async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, session_log_id: 2, completed_at: '2026-01-02T10:05:00.000Z' });
      expect(await repo.findBySetId(10)).toHaveLength(2);
    });
  });
}
```

- [ ] **Step 3 : InMemorySetLogRepository**

```typescript
// app/repositories/InMemorySetLogRepository.ts
import type { SetLog } from '../db/types';
import { ISetLogRepository, CreateSetLogDto } from './ISetLogRepository';

export class InMemorySetLogRepository implements ISetLogRepository {
  private items: SetLog[] = [];
  private nextId = 1;

  async save(dto: CreateSetLogDto): Promise<SetLog> {
    const item: SetLog = { ...dto, id: this.nextId++ };
    this.items.push(item);
    return item;
  }

  async findBySessionLogId(sessionLogId: number): Promise<SetLog[]> {
    return this.items.filter(i => i.session_log_id === sessionLogId);
  }

  async findBySetId(setId: number): Promise<SetLog[]> {
    return this.items
      .filter(i => i.set_id === setId)
      .sort((a, b) => b.completed_at.localeCompare(a.completed_at));
  }
}
```

- [ ] **Step 4 : Test file**

```typescript
// app/repositories/InMemorySetLogRepository.test.ts
import { InMemorySetLogRepository } from './InMemorySetLogRepository';
import { runSetLogRepositoryContractTests } from './setLogRepository.contract';

describe('InMemorySetLogRepository', () => {
  runSetLogRepositoryContractTests(() => new InMemorySetLogRepository());
});
```

- [ ] **Step 5 : Run tests**

```
npx jest --testPathPattern=InMemorySetLogRepository
```
Attendu : 7 tests PASS.

- [ ] **Step 6 : SQLiteSetLogRepository**

```typescript
// app/repositories/SQLiteSetLogRepository.ts
import { SQLiteDatabase } from 'expo-sqlite';
import type { SetLog } from '../db/types';
import { ISetLogRepository, CreateSetLogDto } from './ISetLogRepository';

export class SQLiteSetLogRepository implements ISetLogRepository {
  constructor(private db: SQLiteDatabase) {}

  async save(dto: CreateSetLogDto): Promise<SetLog> {
    const result = await this.db.runAsync(
      'INSERT INTO set_logs (session_log_id, set_id, exercise_id, reps_done, weight_done, rpe, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dto.session_log_id, dto.set_id, dto.exercise_id, dto.reps_done, dto.weight_done, dto.rpe, dto.completed_at]
    );
    const saved = await this.db.getFirstAsync<SetLog>('SELECT * FROM set_logs WHERE id = ?', [result.lastInsertRowId]);
    if (!saved) throw new Error(`SetLog ${result.lastInsertRowId} introuvable après insertion`);
    return saved;
  }

  async findBySessionLogId(sessionLogId: number): Promise<SetLog[]> {
    return this.db.getAllAsync<SetLog>(
      'SELECT * FROM set_logs WHERE session_log_id = ?',
      [sessionLogId]
    );
  }

  async findBySetId(setId: number): Promise<SetLog[]> {
    return this.db.getAllAsync<SetLog>(
      'SELECT * FROM set_logs WHERE set_id = ? ORDER BY completed_at DESC',
      [setId]
    );
  }
}
```

- [ ] **Step 7 : Commit**

```bash
git add app/repositories/ISetLogRepository.ts app/repositories/InMemorySetLogRepository.ts app/repositories/SQLiteSetLogRepository.ts app/repositories/setLogRepository.contract.ts app/repositories/InMemorySetLogRepository.test.ts
git commit -m "feat(repo): ISetLogRepository — interface + InMemory + SQLite"
```

---

## Task 3 : IPersonalRecordRepository

**Files:**
- Create: `app/repositories/IPersonalRecordRepository.ts`
- Create: `app/repositories/personalRecordRepository.contract.ts`
- Create: `app/repositories/InMemoryPersonalRecordRepository.ts`
- Create: `app/repositories/InMemoryPersonalRecordRepository.test.ts`
- Create: `app/repositories/SQLitePersonalRecordRepository.ts`

- [ ] **Step 1 : Interface**

```typescript
// app/repositories/IPersonalRecordRepository.ts
import type { PersonalRecord } from '../db/types';

export type CreatePersonalRecordDto = Omit<PersonalRecord, 'id'>;

export interface IPersonalRecordRepository {
  save(dto: CreatePersonalRecordDto): Promise<PersonalRecord>;
  findBestByExerciseId(exerciseId: number): Promise<PersonalRecord | null>;
}
```

- [ ] **Step 2 : Contract tests**

```typescript
// app/repositories/personalRecordRepository.contract.ts
import { IPersonalRecordRepository, CreatePersonalRecordDto } from './IPersonalRecordRepository';

const dto1: CreatePersonalRecordDto = {
  exercise_id: 1,
  weight: 100,
  reps: 5,
  estimated_1rm: 116.7,
  achieved_at: '2026-01-01T10:00:00.000Z',
  session_log_id: null,
};

export function runPersonalRecordRepositoryContractTests(createRepo: () => IPersonalRecordRepository) {
  let repo: IPersonalRecordRepository;
  beforeEach(() => { repo = createRepo(); });

  describe('save', () => {
    it('retourne un PR avec id généré', async () => {
      const result = await repo.save(dto1);
      expect(result.id).toBeGreaterThan(0);
      expect(result.estimated_1rm).toBe(116.7);
    });
  });

  describe('findBestByExerciseId', () => {
    it('retourne null si aucun PR', async () => {
      expect(await repo.findBestByExerciseId(1)).toBeNull();
    });
    it('retourne le PR avec le 1RM le plus élevé', async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, weight: 105, reps: 3, estimated_1rm: 115.5, achieved_at: '2026-01-02T10:00:00.000Z' });
      const best = await repo.findBestByExerciseId(1);
      expect(best?.estimated_1rm).toBe(116.7);
    });
    it("ne retourne pas le PR d'un autre exercice", async () => {
      await repo.save({ ...dto1, exercise_id: 2, estimated_1rm: 200 });
      expect(await repo.findBestByExerciseId(1)).toBeNull();
    });
  });
}
```

- [ ] **Step 3 : InMemoryPersonalRecordRepository**

```typescript
// app/repositories/InMemoryPersonalRecordRepository.ts
import type { PersonalRecord } from '../db/types';
import { IPersonalRecordRepository, CreatePersonalRecordDto } from './IPersonalRecordRepository';

export class InMemoryPersonalRecordRepository implements IPersonalRecordRepository {
  private items: PersonalRecord[] = [];
  private nextId = 1;

  async save(dto: CreatePersonalRecordDto): Promise<PersonalRecord> {
    const item: PersonalRecord = { ...dto, id: this.nextId++ };
    this.items.push(item);
    return item;
  }

  async findBestByExerciseId(exerciseId: number): Promise<PersonalRecord | null> {
    const matching = this.items
      .filter(i => i.exercise_id === exerciseId)
      .sort((a, b) => b.estimated_1rm - a.estimated_1rm);
    return matching[0] ?? null;
  }
}
```

- [ ] **Step 4 : Test file**

```typescript
// app/repositories/InMemoryPersonalRecordRepository.test.ts
import { InMemoryPersonalRecordRepository } from './InMemoryPersonalRecordRepository';
import { runPersonalRecordRepositoryContractTests } from './personalRecordRepository.contract';

describe('InMemoryPersonalRecordRepository', () => {
  runPersonalRecordRepositoryContractTests(() => new InMemoryPersonalRecordRepository());
});
```

- [ ] **Step 5 : Run tests**

```
npx jest --testPathPattern=InMemoryPersonalRecordRepository
```
Attendu : 4 tests PASS.

- [ ] **Step 6 : SQLitePersonalRecordRepository**

```typescript
// app/repositories/SQLitePersonalRecordRepository.ts
import { SQLiteDatabase } from 'expo-sqlite';
import type { PersonalRecord } from '../db/types';
import { IPersonalRecordRepository, CreatePersonalRecordDto } from './IPersonalRecordRepository';

export class SQLitePersonalRecordRepository implements IPersonalRecordRepository {
  constructor(private db: SQLiteDatabase) {}

  async save(dto: CreatePersonalRecordDto): Promise<PersonalRecord> {
    const result = await this.db.runAsync(
      'INSERT INTO personal_records (exercise_id, weight, reps, estimated_1rm, achieved_at, session_log_id) VALUES (?, ?, ?, ?, ?, ?)',
      [dto.exercise_id, dto.weight, dto.reps, dto.estimated_1rm, dto.achieved_at, dto.session_log_id]
    );
    const saved = await this.db.getFirstAsync<PersonalRecord>('SELECT * FROM personal_records WHERE id = ?', [result.lastInsertRowId]);
    if (!saved) throw new Error(`PersonalRecord ${result.lastInsertRowId} introuvable après insertion`);
    return saved;
  }

  async findBestByExerciseId(exerciseId: number): Promise<PersonalRecord | null> {
    return this.db.getFirstAsync<PersonalRecord>(
      'SELECT * FROM personal_records WHERE exercise_id = ? ORDER BY estimated_1rm DESC LIMIT 1',
      [exerciseId]
    );
  }
}
```

- [ ] **Step 7 : Commit**

```bash
git add app/repositories/IPersonalRecordRepository.ts app/repositories/InMemoryPersonalRecordRepository.ts app/repositories/SQLitePersonalRecordRepository.ts app/repositories/personalRecordRepository.contract.ts app/repositories/InMemoryPersonalRecordRepository.test.ts
git commit -m "feat(repo): IPersonalRecordRepository — interface + InMemory + SQLite"
```

---

## Task 4 : SessionService — startSession / logSet / completeSession

**Files:**
- Create: `app/services/SessionService.ts`
- Create: `app/services/SessionService.test.ts`

- [ ] **Step 1 : Écrire les types et les tests RED**

```typescript
// app/services/SessionService.test.ts
import { SessionService } from './SessionService';
import { InMemorySessionLogRepository } from '../repositories/InMemorySessionLogRepository';
import { InMemorySetLogRepository } from '../repositories/InMemorySetLogRepository';
import { InMemoryPersonalRecordRepository } from '../repositories/InMemoryPersonalRecordRepository';
import { InMemoryWorkoutRepository } from '../repositories/InMemoryWorkoutRepository';
import { InMemoryWorkoutExerciseRepository } from '../repositories/InMemoryWorkoutExerciseRepository';
import { InMemoryBlockRepository } from '../repositories/InMemoryBlockRepository';
import { InMemorySetRepository } from '../repositories/InMemorySetRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';

function makeService() {
  return {
    sessionLogRepo: new InMemorySessionLogRepository(),
    setLogRepo: new InMemorySetLogRepository(),
    prRepo: new InMemoryPersonalRecordRepository(),
    workoutRepo: new InMemoryWorkoutRepository(),
    weRepo: new InMemoryWorkoutExerciseRepository(),
    blockRepo: new InMemoryBlockRepository(),
    setRepo: new InMemorySetRepository(),
    exerciseRepo: new InMemoryExerciseRepository(),
    build() {
      return new SessionService(
        this.sessionLogRepo, this.setLogRepo, this.prRepo,
        this.workoutRepo, this.weRepo, this.blockRepo,
        this.setRepo, this.exerciseRepo,
      );
    },
  };
}

describe('SessionService.startSession', () => {
  it('crée un session_log avec workout_id et checkin', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    expect(log.id).toBeGreaterThan(0);
    expect(log.workout_id).toBe(1);
    expect(log.ended_at).toBeNull();
    expect(log.checkin_energy).toBe(3);
    expect(log.checkin_fatigue).toBe(1);
    expect(log.checkin_sleep).toBe(2);
  });
  it('accepte checkin avec valeurs null', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: null, checkin_fatigue: null, checkin_sleep: null });
    expect(log.checkin_energy).toBeNull();
  });
});

describe('SessionService.logSet', () => {
  it('crée un set_log avec les données réelles', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const session = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    const setLog = await service.logSet(session.id, 10, 5, { repsDone: 7, weightDone: 80, rpe: 8 });
    expect(setLog.id).toBeGreaterThan(0);
    expect(setLog.session_log_id).toBe(session.id);
    expect(setLog.set_id).toBe(10);
    expect(setLog.exercise_id).toBe(5);
    expect(setLog.reps_done).toBe(7);
    expect(setLog.weight_done).toBe(80);
    expect(setLog.rpe).toBe(8);
  });
  it('crée un PR si 1RM meilleur que le précédent', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const session = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.logSet(session.id, 10, 5, { repsDone: 5, weightDone: 100, rpe: null });
    const pr = await ctx.prRepo.findBestByExerciseId(5);
    // 1RM Epley: 100 * (1 + 5/30) ≈ 116.67
    expect(pr).not.toBeNull();
    expect(pr!.estimated_1rm).toBeCloseTo(116.67, 1);
  });
  it("ne crée pas de PR si weight = 0", async () => {
    const ctx = makeService();
    const service = ctx.build();
    const session = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.logSet(session.id, 10, 5, { repsDone: 10, weightDone: 0, rpe: null });
    expect(await ctx.prRepo.findBestByExerciseId(5)).toBeNull();
  });
  it('ne crée pas de PR si 1RM inférieur au meilleur existant', async () => {
    const ctx = makeService();
    const service = ctx.build();
    await ctx.prRepo.save({ exercise_id: 5, weight: 120, reps: 1, estimated_1rm: 124, achieved_at: '2026-01-01T00:00:00.000Z', session_log_id: null });
    const session = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.logSet(session.id, 10, 5, { repsDone: 5, weightDone: 100, rpe: null });
    const allPrs = await ctx.prRepo.findBestByExerciseId(5);
    expect(allPrs?.weight).toBe(120);
  });
  it('accepte rpe null', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const session = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    const setLog = await service.logSet(session.id, 10, 5, { repsDone: 8, weightDone: 60, rpe: null });
    expect(setLog.rpe).toBeNull();
  });
});

describe('SessionService.completeSession', () => {
  it('met ended_at sur le session_log', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const session = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    expect(session.ended_at).toBeNull();
    await service.completeSession(session.id);
    const updated = await ctx.sessionLogRepo.findById(session.id);
    expect(updated?.ended_at).not.toBeNull();
  });
});
```

- [ ] **Step 2 : Run (RED attendu)**

```
npx jest --testPathPattern=SessionService
```
Attendu : FAIL "Cannot find module './SessionService'".

- [ ] **Step 3 : Écrire SessionService (startSession + logSet + completeSession)**

```typescript
// app/services/SessionService.ts
import type { SessionLog, SetLog, Workout } from '../db/types';
import { ISessionLogRepository, CreateSessionLogDto } from '../repositories/ISessionLogRepository';
import { ISetLogRepository } from '../repositories/ISetLogRepository';
import { IPersonalRecordRepository } from '../repositories/IPersonalRecordRepository';
import { IWorkoutRepository } from '../repositories/IWorkoutRepository';
import { IWorkoutExerciseRepository } from '../repositories/IWorkoutExerciseRepository';
import { IBlockRepository } from '../repositories/IBlockRepository';
import { ISetRepository, UpdateSetDto } from '../repositories/ISetRepository';
import { IExerciseRepository } from '../repositories/IExerciseRepository';

export type CheckIn = Pick<SessionLog, 'checkin_energy' | 'checkin_fatigue' | 'checkin_sleep'>;

export interface SetActual {
  repsDone: number;
  weightDone: number;
  rpe: number | null;
}

export interface ProgressionResult {
  exerciseId: number;
  exerciseName: string;
  oldWeight: number | null;
  newWeight: number | null;
  achieved: boolean;
  consecutiveSuccesses: number;
  threshold: number;
}

export class SessionService {
  constructor(
    private sessionLogRepo: ISessionLogRepository,
    private setLogRepo: ISetLogRepository,
    private prRepo: IPersonalRecordRepository,
    private workoutRepo: IWorkoutRepository,
    private weRepo: IWorkoutExerciseRepository,
    private blockRepo: IBlockRepository,
    private setRepo: ISetRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async startSession(workoutId: number, checkin: CheckIn): Promise<SessionLog> {
    return this.sessionLogRepo.save({
      workout_id: workoutId,
      started_at: new Date().toISOString(),
      checkin_energy: checkin.checkin_energy,
      checkin_fatigue: checkin.checkin_fatigue,
      checkin_sleep: checkin.checkin_sleep,
      notes: null,
    });
  }

  async logSet(sessionLogId: number, setId: number, exerciseId: number, actual: SetActual): Promise<SetLog> {
    const setLog = await this.setLogRepo.save({
      session_log_id: sessionLogId,
      set_id: setId,
      exercise_id: exerciseId,
      reps_done: actual.repsDone,
      weight_done: actual.weightDone,
      rpe: actual.rpe,
      completed_at: new Date().toISOString(),
    });

    if (actual.weightDone > 0 && actual.repsDone > 0) {
      const estimated1RM = actual.weightDone * (1 + actual.repsDone / 30);
      const currentBest = await this.prRepo.findBestByExerciseId(exerciseId);
      if (!currentBest || estimated1RM > currentBest.estimated_1rm) {
        await this.prRepo.save({
          exercise_id: exerciseId,
          weight: actual.weightDone,
          reps: actual.repsDone,
          estimated_1rm: estimated1RM,
          achieved_at: new Date().toISOString(),
          session_log_id: sessionLogId,
        });
      }
    }

    return setLog;
  }

  async completeSession(sessionLogId: number): Promise<void> {
    await this.sessionLogRepo.complete(sessionLogId, new Date().toISOString());
  }

  // getNextWorkout and calculateProgressions added in Tasks 5 & 6
}
```

- [ ] **Step 4 : Run tests (GREEN)**

```
npx jest --testPathPattern=SessionService
```
Attendu : 7 tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add app/services/SessionService.ts app/services/SessionService.test.ts
git commit -m "feat(service): SessionService — startSession, logSet, completeSession"
```

---

## Task 5 : SessionService — getNextWorkout

**Files:**
- Modify: `app/services/SessionService.ts`
- Modify: `app/services/SessionService.test.ts`

- [ ] **Step 1 : Ajouter les tests RED dans SessionService.test.ts**

Ajouter ce bloc après les tests existants dans `SessionService.test.ts` :

```typescript
describe('SessionService.getNextWorkout', () => {
  async function seedWorkouts(ctx: ReturnType<typeof makeService>) {
    const w1 = await ctx.workoutRepo.save({ program_id: 1, name: 'Push', order_index: 0 });
    const w2 = await ctx.workoutRepo.save({ program_id: 1, name: 'Pull', order_index: 1 });
    const w3 = await ctx.workoutRepo.save({ program_id: 1, name: 'Legs', order_index: 2 });
    return [w1, w2, w3];
  }

  it('retourne le premier workout si aucune session passée', async () => {
    const ctx = makeService();
    const service = ctx.build();
    await seedWorkouts(ctx);
    const next = await service.getNextWorkout(1);
    expect(next?.name).toBe('Push');
  });

  it('retourne le workout suivant dans la séquence', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const [w1] = await seedWorkouts(ctx);
    await ctx.sessionLogRepo.save({ workout_id: w1.id, started_at: '2026-01-01T10:00:00.000Z', checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null });
    const next = await service.getNextWorkout(1);
    expect(next?.name).toBe('Pull');
  });

  it('boucle sur le premier workout après le dernier', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const [, , w3] = await seedWorkouts(ctx);
    await ctx.sessionLogRepo.save({ workout_id: w3.id, started_at: '2026-01-01T10:00:00.000Z', checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null });
    const next = await service.getNextWorkout(1);
    expect(next?.name).toBe('Push');
  });

  it('retourne null si le programme n\'a pas de workouts', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const next = await service.getNextWorkout(1);
    expect(next).toBeNull();
  });

  it('ignore les sessions d\'un autre programme', async () => {
    const ctx = makeService();
    const service = ctx.build();
    await seedWorkouts(ctx);
    const otherWorkout = await ctx.workoutRepo.save({ program_id: 2, name: 'Autre', order_index: 0 });
    await ctx.sessionLogRepo.save({ workout_id: otherWorkout.id, started_at: '2026-01-05T10:00:00.000Z', checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null });
    const next = await service.getNextWorkout(1);
    expect(next?.name).toBe('Push');
  });
});
```

- [ ] **Step 2 : Run (RED)**

```
npx jest --testPathPattern=SessionService
```
Attendu : 5 tests FAIL "service.getNextWorkout is not a function".

- [ ] **Step 3 : Implémenter getNextWorkout dans SessionService.ts**

Ajouter cette méthode dans la classe `SessionService` (après `completeSession`) :

```typescript
async getNextWorkout(programId: number): Promise<Workout | null> {
  const workouts = (await this.workoutRepo.findByProgramId(programId))
    .sort((a, b) => a.order_index - b.order_index);
  if (workouts.length === 0) return null;

  const latest = await this.sessionLogRepo.findLatestByWorkoutIds(workouts.map(w => w.id));
  if (!latest) return workouts[0];

  const lastIdx = workouts.findIndex(w => w.id === latest.workout_id);
  return workouts[(lastIdx + 1) % workouts.length];
}
```

- [ ] **Step 4 : Run tests (GREEN)**

```
npx jest --testPathPattern=SessionService
```
Attendu : 12 tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add app/services/SessionService.ts app/services/SessionService.test.ts
git commit -m "feat(service): SessionService.getNextWorkout — séquence circulaire"
```

---

## Task 6 : SessionService — calculateProgressions

**Files:**
- Modify: `app/services/SessionService.ts`
- Modify: `app/services/SessionService.test.ts`

- [ ] **Step 1 : Ajouter les tests RED**

Ajouter ce bloc dans `SessionService.test.ts` :

```typescript
describe('SessionService.calculateProgressions', () => {
  async function seedWorkoutWithExercise(ctx: ReturnType<typeof makeService>, progressionThreshold = 1) {
    const exercise = await ctx.exerciseRepo.save({
      name: 'Squat',
      type: 'musculation',
      muscle_groups: '[]',
      technical_notes: null,
      is_custom: 0,
      progression_step: 2.5,
      progression_threshold: progressionThreshold,
      created_at: '2026-01-01T00:00:00.000Z',
    });
    const workout = await ctx.workoutRepo.save({ program_id: 1, name: 'Legs', order_index: 0 });
    const we = await ctx.weRepo.save({ workout_id: workout.id, exercise_id: exercise.id, order_index: 0 });
    const block = await ctx.blockRepo.save({ workout_exercise_id: we.id, name: 'Travail', order_index: 0, is_work_block: 1 });
    const set = await ctx.setRepo.save({ block_id: block.id, reps_min: 6, reps_max: 8, weight: 80, weight_type: 'fixed', rest_duration: 120, order_index: 0 });
    return { exercise, workout, we, block, set };
  }

  it('applique la progression si tous les sets de travail sont atteints (seuil 1)', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const { exercise, workout, set } = await seedWorkoutWithExercise(ctx, 1);
    const session = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 3 });
    await service.logSet(session.id, set.id, exercise.id, { repsDone: 8, weightDone: 80, rpe: 7 });
    await service.completeSession(session.id);

    const progressions = await service.calculateProgressions(session.id);
    expect(progressions).toHaveLength(1);
    expect(progressions[0].achieved).toBe(true);
    expect(progressions[0].oldWeight).toBe(80);
    expect(progressions[0].newWeight).toBe(82.5);

    const updatedSet = await ctx.setRepo.findById(set.id);
    expect(updatedSet?.weight).toBe(82.5);
  });

  it("ne progresse pas si reps_done < reps_max", async () => {
    const ctx = makeService();
    const service = ctx.build();
    const { exercise, workout, set } = await seedWorkoutWithExercise(ctx, 1);
    const session = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 3 });
    await service.logSet(session.id, set.id, exercise.id, { repsDone: 6, weightDone: 80, rpe: 9 });
    await service.completeSession(session.id);

    const progressions = await service.calculateProgressions(session.id);
    expect(progressions[0].achieved).toBe(false);
    const updatedSet = await ctx.setRepo.findById(set.id);
    expect(updatedSet?.weight).toBe(80);
  });

  it('ne progresse pas si seuil 2 non atteint (1 seule session réussie)', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const { exercise, workout, set } = await seedWorkoutWithExercise(ctx, 2);
    const session = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 3 });
    await service.logSet(session.id, set.id, exercise.id, { repsDone: 8, weightDone: 80, rpe: 7 });
    await service.completeSession(session.id);

    const progressions = await service.calculateProgressions(session.id);
    expect(progressions[0].achieved).toBe(false);
    expect(progressions[0].consecutiveSuccesses).toBe(1);
    expect(progressions[0].threshold).toBe(2);
    const updatedSet = await ctx.setRepo.findById(set.id);
    expect(updatedSet?.weight).toBe(80);
  });

  it('progresse si seuil 2 atteint (2 sessions réussies consécutives)', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const { exercise, workout, set } = await seedWorkoutWithExercise(ctx, 2);

    // Session 1 réussie (passée)
    const session1 = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 3 });
    await service.logSet(session1.id, set.id, exercise.id, { repsDone: 8, weightDone: 80, rpe: 7 });
    await service.completeSession(session1.id);

    // Session 2 réussie (courante)
    const session2 = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 3 });
    await service.logSet(session2.id, set.id, exercise.id, { repsDone: 8, weightDone: 80, rpe: 7 });
    await service.completeSession(session2.id);

    const progressions = await service.calculateProgressions(session2.id);
    expect(progressions[0].achieved).toBe(true);
    expect(progressions[0].consecutiveSuccesses).toBe(2);
    const updatedSet = await ctx.setRepo.findById(set.id);
    expect(updatedSet?.weight).toBe(82.5);
  });

  it('ignore les blocs non-travail pour le calcul', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const exercise = await ctx.exerciseRepo.save({ name: 'Bench', type: 'musculation', muscle_groups: '[]', technical_notes: null, is_custom: 0, progression_step: 2, progression_threshold: 1, created_at: '2026-01-01T00:00:00.000Z' });
    const workout = await ctx.workoutRepo.save({ program_id: 1, name: 'Push', order_index: 0 });
    const we = await ctx.weRepo.save({ workout_id: workout.id, exercise_id: exercise.id, order_index: 0 });
    // Bloc d'échauffement (is_work_block=0)
    const warmupBlock = await ctx.blockRepo.save({ workout_exercise_id: we.id, name: 'Échauffement', order_index: 0, is_work_block: 0 });
    const warmupSet = await ctx.setRepo.save({ block_id: warmupBlock.id, reps_min: 10, reps_max: 10, weight: 40, weight_type: 'fixed', rest_duration: 60, order_index: 0 });
    // Bloc de travail (is_work_block=1)
    const workBlock = await ctx.blockRepo.save({ workout_exercise_id: we.id, name: 'Travail', order_index: 1, is_work_block: 1 });
    const workSet = await ctx.setRepo.save({ block_id: workBlock.id, reps_min: 6, reps_max: 8, weight: 80, weight_type: 'fixed', rest_duration: 120, order_index: 0 });

    const session = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 3 });
    // Log seulement l'échauffement (pas le bloc travail)
    await service.logSet(session.id, warmupSet.id, exercise.id, { repsDone: 10, weightDone: 40, rpe: null });
    await service.completeSession(session.id);

    const progressions = await service.calculateProgressions(session.id);
    // Aucun log pour le bloc de travail → pas de progression
    expect(progressions[0].achieved).toBe(false);
    const updatedWorkSet = await ctx.setRepo.findById(workSet.id);
    expect(updatedWorkSet?.weight).toBe(80);
  });
});
```

- [ ] **Step 2 : Run (RED)**

```
npx jest --testPathPattern=SessionService
```
Attendu : 5 tests FAIL "service.calculateProgressions is not a function".

- [ ] **Step 3 : Implémenter calculateProgressions dans SessionService.ts**

Ajouter cette méthode et helper privé dans la classe `SessionService` :

```typescript
async calculateProgressions(sessionLogId: number): Promise<ProgressionResult[]> {
  const sessionLog = await this.sessionLogRepo.findById(sessionLogId);
  if (!sessionLog) throw new Error(`SessionLog ${sessionLogId} introuvable`);

  const setLogs = await this.setLogRepo.findBySessionLogId(sessionLogId);
  const workoutExercises = await this.weRepo.findByWorkoutId(sessionLog.workout_id);
  const results: ProgressionResult[] = [];

  for (const we of workoutExercises) {
    const exercise = await this.exerciseRepo.findById(we.exercise_id);
    if (!exercise) continue;

    const blocks = await this.blockRepo.findByWorkoutExerciseId(we.id);
    const workBlocks = blocks.filter(b => b.is_work_block === 1);
    if (workBlocks.length === 0) continue;

    const workSets: import('../db/types').Set[] = [];
    for (const block of workBlocks) {
      const sets = await this.setRepo.findByBlockId(block.id);
      workSets.push(...sets);
    }
    if (workSets.length === 0) continue;

    const workSetIds = workSets.map(s => s.id);
    const workSetLogs = setLogs.filter(sl => workSetIds.includes(sl.set_id));
    if (workSetLogs.length === 0) {
      results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight: workSets[0].weight, newWeight: workSets[0].weight, achieved: false, consecutiveSuccesses: 0, threshold: exercise.progression_threshold });
      continue;
    }

    const allAchieved = this.checkAllWorkSetsAchieved(workSets, workSetLogs);
    if (!allAchieved) {
      results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight: workSets[0].weight, newWeight: workSets[0].weight, achieved: false, consecutiveSuccesses: 0, threshold: exercise.progression_threshold });
      continue;
    }

    // Compter les séances réussies consécutives (inclut la courante)
    const pastSessions = (await this.sessionLogRepo.findByWorkoutId(sessionLog.workout_id))
      .filter(s => s.id !== sessionLogId && s.ended_at !== null)
      .sort((a, b) => b.started_at.localeCompare(a.started_at));

    let consecutiveSuccesses = 1;
    for (const past of pastSessions.slice(0, exercise.progression_threshold - 1)) {
      const pastLogs = await this.setLogRepo.findBySessionLogId(past.id);
      const pastWorkLogs = pastLogs.filter(sl => workSetIds.includes(sl.set_id));
      if (pastWorkLogs.length === 0 || !this.checkAllWorkSetsAchieved(workSets, pastWorkLogs)) break;
      consecutiveSuccesses++;
    }

    const oldWeight = workSets[0].weight;

    if (consecutiveSuccesses >= exercise.progression_threshold) {
      for (const set of workSets) {
        if (set.weight !== null) {
          await this.setRepo.update(set.id, {
            reps_min: set.reps_min,
            reps_max: set.reps_max,
            weight: set.weight + exercise.progression_step,
            weight_type: set.weight_type,
            rest_duration: set.rest_duration,
          });
        }
      }
      const newWeight = oldWeight !== null ? oldWeight + exercise.progression_step : null;
      results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight, newWeight, achieved: true, consecutiveSuccesses, threshold: exercise.progression_threshold });
    } else {
      results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight, newWeight: oldWeight, achieved: false, consecutiveSuccesses, threshold: exercise.progression_threshold });
    }
  }

  return results;
}

private checkAllWorkSetsAchieved(
  workSets: import('../db/types').Set[],
  setLogs: import('../db/types').SetLog[]
): boolean {
  for (const set of workSets) {
    const log = setLogs.find(sl => sl.set_id === set.id);
    if (!log || log.reps_done < set.reps_max) return false;
  }
  return true;
}
```

- [ ] **Step 4 : Run tests (GREEN)**

```
npx jest --testPathPattern=SessionService
```
Attendu : 17 tests PASS.

- [ ] **Step 5 : Run tous les tests**

```
npx jest
```
Attendu : tous les tests existants toujours PASS (≥ 142 + 17 nouveaux).

- [ ] **Step 6 : Commit**

```bash
git add app/services/SessionService.ts app/services/SessionService.test.ts
git commit -m "feat(service): SessionService.calculateProgressions — progression automatique"
```

---

## Task 7 : useTimer hook

**Files:**
- Create: `app/hooks/useTimer.ts`

- [ ] **Step 1 : Écrire useTimer**

```typescript
// app/hooks/useTimer.ts
import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseTimerResult {
  remaining: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: (seconds: number) => void;
}

export function useTimer(initialSeconds: number): UseTimerResult {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          setIsRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback((seconds: number) => {
    setIsRunning(false);
    setRemaining(seconds);
  }, []);

  return { remaining, isRunning, start, pause, reset };
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/hooks/useTimer.ts
git commit -m "feat(hook): useTimer — countdown hook"
```

---

## Task 8 : useSession hook

**Files:**
- Create: `app/hooks/useSession.ts`

- [ ] **Step 1 : Écrire useSession**

```typescript
// app/hooks/useSession.ts
import { useState, useRef, useCallback } from 'react';
import { SessionService, CheckIn, SetActual, ProgressionResult } from '../services/SessionService';
import { SQLiteSessionLogRepository } from '../repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '../repositories/SQLiteSetLogRepository';
import { SQLitePersonalRecordRepository } from '../repositories/SQLitePersonalRecordRepository';
import { SQLiteWorkoutRepository } from '../repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '../repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '../repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '../repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import type { WorkoutExerciseDetail, BlockWithSets } from '../services/WorkoutExerciseService';
import type { Set as TrainingSet } from '../db/types';
import { getDb } from '../db';

export type SessionPhase = 'checkin' | 'running' | 'summary';

export interface SessionPosition {
  exerciseIdx: number;
  blockIdx: number;
  setIdx: number;
}

export interface UseSessionResult {
  phase: SessionPhase;
  sessionLogId: number | null;
  position: SessionPosition;
  currentExercise: WorkoutExerciseDetail | null;
  currentBlock: BlockWithSets | null;
  currentSet: TrainingSet | null;
  progressLabel: string;
  startSession: (checkin: CheckIn) => Promise<void>;
  validateSet: (actual: SetActual) => Promise<void>;
  skipSet: () => void;
  progressions: ProgressionResult[];
  sessionStartedAt: number | null;
  totalSetsLogged: number;
  error: string | null;
}

export function advancePosition(
  position: SessionPosition,
  details: WorkoutExerciseDetail[]
): SessionPosition | null {
  const { exerciseIdx, blockIdx, setIdx } = position;
  const exercise = details[exerciseIdx];
  if (!exercise) return null;
  const block = exercise.blocks[blockIdx];
  if (!block) return null;
  if (setIdx + 1 < block.sets.length) return { exerciseIdx, blockIdx, setIdx: setIdx + 1 };
  if (blockIdx + 1 < exercise.blocks.length) return { exerciseIdx, blockIdx: blockIdx + 1, setIdx: 0 };
  if (exerciseIdx + 1 < details.length) return { exerciseIdx: exerciseIdx + 1, blockIdx: 0, setIdx: 0 };
  return null;
}

function makeService(): SessionService {
  const db = getDb();
  return new SessionService(
    new SQLiteSessionLogRepository(db),
    new SQLiteSetLogRepository(db),
    new SQLitePersonalRecordRepository(db),
    new SQLiteWorkoutRepository(db),
    new SQLiteWorkoutExerciseRepository(db),
    new SQLiteBlockRepository(db),
    new SQLiteSetRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

export function useSession(workoutId: number, workoutDetails: WorkoutExerciseDetail[]): UseSessionResult {
  const serviceRef = useRef<SessionService | null>(null);
  if (!serviceRef.current) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [phase, setPhase] = useState<SessionPhase>('checkin');
  const [sessionLogId, setSessionLogId] = useState<number | null>(null);
  const [position, setPosition] = useState<SessionPosition>({ exerciseIdx: 0, blockIdx: 0, setIdx: 0 });
  const [progressions, setProgressions] = useState<ProgressionResult[]>([]);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [totalSetsLogged, setTotalSetsLogged] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const currentExercise = workoutDetails[position.exerciseIdx] ?? null;
  const currentBlock = currentExercise?.blocks[position.blockIdx] ?? null;
  const currentSet = currentBlock?.sets[position.setIdx] ?? null;
  const progressLabel = currentExercise
    ? `${position.exerciseIdx + 1} / ${workoutDetails.length} exercices`
    : '';

  const startSession = useCallback(async (checkin: CheckIn) => {
    try {
      const log = await service.startSession(workoutId, checkin);
      setSessionLogId(log.id);
      setSessionStartedAt(Date.now());
      setPhase('running');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur démarrage séance');
    }
  }, [service, workoutId]);

  const validateSet = useCallback(async (actual: SetActual) => {
    if (!sessionLogId || !currentSet || !currentExercise) return;
    try {
      await service.logSet(sessionLogId, currentSet.id, currentExercise.exercise.id, actual);
      setTotalSetsLogged(n => n + 1);

      const next = advancePosition(position, workoutDetails);
      if (next === null) {
        await service.completeSession(sessionLogId);
        const progs = await service.calculateProgressions(sessionLogId);
        setProgressions(progs);
        setPhase('summary');
      } else {
        setPosition(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur validation série');
    }
  }, [service, sessionLogId, currentSet, currentExercise, position, workoutDetails]);

  const skipSet = useCallback(() => {
    const next = advancePosition(position, workoutDetails);
    if (next === null) {
      setPhase('summary');
    } else {
      setPosition(next);
    }
  }, [position, workoutDetails]);

  return {
    phase, sessionLogId, position,
    currentExercise, currentBlock, currentSet, progressLabel,
    startSession, validateSet, skipSet,
    progressions, sessionStartedAt, totalSetsLogged, error,
  };
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/hooks/useSession.ts
git commit -m "feat(hook): useSession — state machine + validateSet + advancePosition"
```

---

## Task 9 : session/[workoutId].tsx + CheckInPhase

**Files:**
- Create: `app/app/session/[workoutId].tsx`
- Create: `app/components/session/CheckInPhase.tsx`
- Modify: `app/app/_layout.tsx`

- [ ] **Step 1 : Créer le dossier session**

Créer le fichier `app/app/session/[workoutId].tsx` :

```typescript
// app/app/session/[workoutId].tsx
import { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises';
import { useSession } from '@/hooks/useSession';
import { useTimer } from '@/hooks/useTimer';
import { CheckInPhase } from '@/components/session/CheckInPhase';
import { RunningPhase } from '@/components/session/RunningPhase';
import { SummaryPhase } from '@/components/session/SummaryPhase';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function SessionScreen() {
  const { workoutId: param } = useLocalSearchParams<{ workoutId: string }>();
  const workoutId = Number(param) || 0;
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { exercises } = useWorkoutExercises(workoutId);
  const session = useSession(workoutId, exercises);
  const timer = useTimer(120);

  // Quand la position change (nouvelle série), reset le timer avec rest_duration de la série courante
  const prevPositionRef = useRef(session.position);
  useEffect(() => {
    if (
      session.phase === 'running' &&
      session.position !== prevPositionRef.current &&
      session.currentSet
    ) {
      timer.reset(session.currentSet.rest_duration);
      timer.start();
    }
    prevPositionRef.current = session.position;
  }, [session.position, session.phase, session.currentSet]);

  const handleBack = useCallback(() => router.back(), [router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {session.phase === 'checkin' && (
          <CheckInPhase onStart={session.startSession} />
        )}
        {session.phase === 'running' && session.currentSet && session.currentBlock && session.currentExercise && (
          <RunningPhase
            exercise={session.currentExercise}
            block={session.currentBlock}
            set={session.currentSet}
            progressLabel={session.progressLabel}
            timer={timer}
            onValidate={session.validateSet}
            onSkip={session.skipSet}
          />
        )}
        {session.phase === 'summary' && (
          <SummaryPhase
            progressions={session.progressions}
            totalSets={session.totalSetsLogged}
            durationSeconds={session.sessionStartedAt ? Math.round((Date.now() - session.sessionStartedAt) / 1000) : 0}
            onClose={handleBack}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
```

- [ ] **Step 2 : Créer CheckInPhase**

```typescript
// app/components/session/CheckInPhase.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { CheckIn } from '@/services/SessionService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const CHECKIN_LABELS = {
  energy: { label: 'Énergie', options: [{ value: 1 as const, emoji: '😴', text: 'Faible' }, { value: 2 as const, emoji: '😐', text: 'Normale' }, { value: 3 as const, emoji: '💪', text: 'Élevée' }] },
  fatigue: { label: 'Fatigue', options: [{ value: 1 as const, emoji: '🟢', text: 'Reposé' }, { value: 2 as const, emoji: '🟡', text: 'Modérée' }, { value: 3 as const, emoji: '🔴', text: 'Élevée' }] },
  sleep: { label: 'Sommeil', options: [{ value: 1 as const, emoji: '😴', text: 'Mauvais' }, { value: 2 as const, emoji: '😐', text: 'Correct' }, { value: 3 as const, emoji: '🌙', text: 'Bon' }] },
} as const;

interface CheckInPhaseProps {
  onStart: (checkin: CheckIn) => Promise<void>;
}

export function CheckInPhase({ onStart }: CheckInPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [energy, setEnergy] = useState<1 | 2 | 3 | null>(null);
  const [fatigue, setFatigue] = useState<1 | 2 | 3 | null>(null);
  const [sleep, setSleep] = useState<1 | 2 | 3 | null>(null);
  const [loading, setLoading] = useState(false);

  const canStart = energy !== null && fatigue !== null && sleep !== null;

  async function handleStart() {
    if (!canStart || loading) return;
    setLoading(true);
    try {
      await onStart({ checkin_energy: energy, checkin_fatigue: fatigue, checkin_sleep: sleep });
    } finally {
      setLoading(false);
    }
  }

  function renderRow(
    config: typeof CHECKIN_LABELS.energy,
    selected: 1 | 2 | 3 | null,
    onSelect: (v: 1 | 2 | 3) => void
  ) {
    return (
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{config.label}</Text>
        <View style={styles.options}>
          {config.options.map(opt => (
            <PressableA11y
              key={opt.value}
              accessibilityLabel={`${config.label} : ${opt.text}`}
              accessibilityState={{ selected: selected === opt.value }}
              onPress={() => onSelect(opt.value)}
              style={[
                styles.option,
                { borderColor: selected === opt.value ? colors.primary : colors.border },
                selected === opt.value && { backgroundColor: colors.primary + '15' },
              ]}
            >
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
              <Text style={[styles.optionText, { color: selected === opt.value ? colors.primary : colors.textSecondary }]}>
                {opt.text}
              </Text>
            </PressableA11y>
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Comment tu te sens ?</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>3 questions rapides avant de commencer</Text>

      {renderRow(CHECKIN_LABELS.energy, energy, setEnergy)}
      {renderRow(CHECKIN_LABELS.fatigue, fatigue, setFatigue)}
      {renderRow(CHECKIN_LABELS.sleep, sleep, setSleep)}

      <PressableA11y
        accessibilityLabel="Commencer la séance"
        accessibilityState={{ disabled: !canStart }}
        onPress={handleStart}
        style={[styles.startBtn, { backgroundColor: colors.primary, opacity: canStart ? 1 : 0.4 }]}
      >
        <Text style={styles.startBtnText}>{loading ? 'Démarrage…' : 'Commencer la séance'}</Text>
      </PressableA11y>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 24 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 32 },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: -16 },
  row: { gap: 10 },
  rowLabel: { fontSize: 16, fontWeight: '600' },
  options: { flexDirection: 'row', gap: 10 },
  option: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, gap: 4 },
  optionEmoji: { fontSize: 22 },
  optionText: { fontSize: 11, fontWeight: '500' },
  startBtn: { marginTop: 8, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
```

- [ ] **Step 3 : Ajouter la route dans _layout.tsx**

Dans `app/app/_layout.tsx`, ajouter avant la dernière `</Stack>` :

```typescript
<Stack.Screen
  name="session/[workoutId]"
  options={{ headerShown: false }}
/>
```

- [ ] **Step 4 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 5 : Commit**

```bash
git add app/app/session app/components/session/CheckInPhase.tsx app/app/_layout.tsx
git commit -m "feat(screen): session/[workoutId].tsx + CheckInPhase"
```

---

## Task 10 : RunningPhase

**Files:**
- Create: `app/components/session/RunningPhase.tsx`

- [ ] **Step 1 : Créer RunningPhase**

```typescript
// app/components/session/RunningPhase.tsx
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import type { WorkoutExerciseDetail, BlockWithSets } from '@/services/WorkoutExerciseService';
import type { Set as TrainingSet } from '@/db/types';
import type { SetActual } from '@/services/SessionService';
import type { UseTimerResult } from '@/hooks/useTimer';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface RunningPhaseProps {
  exercise: WorkoutExerciseDetail;
  block: BlockWithSets;
  set: TrainingSet;
  progressLabel: string;
  timer: UseTimerResult;
  onValidate: (actual: SetActual) => Promise<void>;
  onSkip: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RunningPhase({ exercise, block, set, progressLabel, timer, onValidate, onSkip }: RunningPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [reps, setReps] = useState(String(set.reps_max));
  const [weight, setWeight] = useState(set.weight != null ? String(set.weight) : '0');
  const [rpe, setRpe] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset inputs when set changes
  const setKey = set.id;

  async function handleValidate() {
    if (loading) return;
    setLoading(true);
    try {
      await onValidate({
        repsDone: parseInt(reps, 10) || 0,
        weightDone: parseFloat(weight) || 0,
        rpe: rpe.trim() ? parseInt(rpe, 10) : null,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleToutReussi() {
    if (loading) return;
    setLoading(true);
    try {
      await onValidate({
        repsDone: set.reps_max,
        weightDone: set.weight ?? 0,
        rpe: null,
      });
    } finally {
      setLoading(false);
    }
  }

  const setLabel = set.reps_min === set.reps_max
    ? `${set.reps_min} rép`
    : `${set.reps_min}–${set.reps_max} rép`;
  const weightLabel = set.weight_type === 'bodyweight' ? 'PC' : set.weight_type === 'bar' ? 'barre' : `${set.weight ?? '—'} kg`;
  const restSets = block.sets.slice(block.sets.findIndex(s => s.id === set.id) + 1);

  return (
    <ScrollView
      key={setKey}
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
          {exercise.exercise.name}
        </Text>
        <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{progressLabel}</Text>
        <View style={styles.blockBadge}>
          <Text style={[styles.blockBadgeText, { color: colors.primary }]}>{block.name.toUpperCase()}</Text>
        </View>
      </View>

      {/* Cible */}
      <View style={[styles.targetCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.targetText, { color: colors.text }]}>{weightLabel} × {setLabel}</Text>
      </View>

      {/* Timer */}
      <PressableA11y
        accessibilityLabel={timer.isRunning ? 'Pause du chrono' : 'Reprendre le chrono'}
        onPress={timer.isRunning ? timer.pause : timer.start}
        style={[styles.timerContainer, { backgroundColor: timer.isRunning ? colors.primary + '15' : colors.surface, borderColor: timer.isRunning ? colors.primary : colors.border }]}
      >
        <Text style={[styles.timerText, { color: timer.isRunning ? colors.primary : colors.textSecondary }]}>
          {formatTime(timer.remaining)}
        </Text>
        <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
          {timer.isRunning ? 'PAUSE — tap pour stopper' : 'CHRONO — tap pour lancer'}
        </Text>
      </PressableA11y>

      {/* Saisie */}
      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reps</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={reps}
            onChangeText={setReps}
            keyboardType="numeric"
            accessibilityLabel="Répétitions réalisées"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Poids (kg)</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            accessibilityLabel="Poids utilisé"
            editable={set.weight_type === 'fixed'}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>RPE</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={rpe}
            onChangeText={setRpe}
            keyboardType="numeric"
            placeholder="—"
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel="RPE (1 à 10)"
          />
        </View>
      </View>

      {/* Boutons */}
      <PressableA11y
        accessibilityLabel="Valider la série"
        onPress={handleValidate}
        style={[styles.validateBtn, { backgroundColor: '#16a34a' }]}
      >
        <Ionicons name="checkmark" size={20} color="#fff" />
        <Text style={styles.validateBtnText}>{loading ? 'Validation…' : 'Valider'}</Text>
      </PressableA11y>

      <PressableA11y
        accessibilityLabel="Tout réussi — valider avec les valeurs cibles"
        onPress={handleToutReussi}
        style={[styles.toutReussiBtn, { borderColor: colors.primary }]}
      >
        <Text style={[styles.toutReussiBtnText, { color: colors.primary }]}>Tout réussi ⚡</Text>
      </PressableA11y>

      {/* Séries restantes */}
      {restSets.length > 0 && (
        <View style={styles.restSection}>
          <Text style={[styles.restLabel, { color: colors.textSecondary }]}>SÉRIES RESTANTES</Text>
          {restSets.map((s, i) => (
            <Text key={s.id} style={[styles.restSet, { color: colors.textSecondary }]}>
              {i + block.sets.findIndex(bs => bs.id === set.id) + 2} · {s.weight != null ? `${s.weight} kg` : 'PC'} × {s.reps_min === s.reps_max ? s.reps_min : `${s.reps_min}–${s.reps_max}`}
            </Text>
          ))}
        </View>
      )}

      <PressableA11y
        accessibilityLabel="Passer cette série"
        onPress={onSkip}
        style={styles.skipBtn}
      >
        <Text style={[styles.skipText, { color: colors.textSecondary }]}>Passer →</Text>
      </PressableA11y>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, gap: 14 },
  header: { gap: 2, marginTop: 16 },
  exerciseName: { fontSize: 22, fontWeight: '700' },
  progressLabel: { fontSize: 13 },
  blockBadge: { alignSelf: 'flex-start', marginTop: 4 },
  blockBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  targetCard: { padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  targetText: { fontSize: 20, fontWeight: '600' },
  timerContainer: { borderRadius: 16, borderWidth: 1.5, padding: 20, alignItems: 'center', gap: 4 },
  timerText: { fontSize: 52, fontWeight: '700', letterSpacing: -1 },
  timerLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3 },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputGroup: { flex: 1, gap: 4 },
  inputLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  validateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  validateBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  toutReussiBtn: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  toutReussiBtnText: { fontSize: 15, fontWeight: '600' },
  restSection: { gap: 4 },
  restLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  restSet: { fontSize: 13, lineHeight: 20 },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14 },
});
```

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/components/session/RunningPhase.tsx
git commit -m "feat(component): RunningPhase — timer + saisie + Tout réussi"
```

---

## Task 11 : SummaryPhase

**Files:**
- Create: `app/components/session/SummaryPhase.tsx`

- [ ] **Step 1 : Créer SummaryPhase**

```typescript
// app/components/session/SummaryPhase.tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import type { ProgressionResult } from '@/services/SessionService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface SummaryPhaseProps {
  progressions: ProgressionResult[];
  totalSets: number;
  durationSeconds: number;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s > 0 ? `${s} s` : ''}`.trim() : `${s} s`;
}

export function SummaryPhase({ progressions, totalSets, durationSeconds, onClose }: SummaryPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const progressionCount = progressions.filter(p => p.achieved).length;

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={[styles.heroTitle, { color: colors.text }]}>Séance terminée !</Text>
        <Text style={[styles.heroDuration, { color: colors.textSecondary }]}>{formatDuration(durationSeconds)}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalSets}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>SÉRIES</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: progressionCount > 0 ? '#16a34a' : colors.text }]}>↑ {progressionCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>PROGRESSIONS</Text>
        </View>
      </View>

      {progressions.length > 0 && (
        <View style={[styles.progressionSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Progressions</Text>
          {progressions.map(p => (
            <View key={p.exerciseId} style={[styles.progressionRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.progressionName, { color: colors.text }]} numberOfLines={1}>{p.exerciseName}</Text>
              {p.achieved ? (
                <View style={styles.progressionValues}>
                  <Text style={[styles.progressionOld, { color: colors.textSecondary }]}>
                    {p.oldWeight != null ? `${p.oldWeight} kg` : '—'}
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color="#16a34a" />
                  <Text style={styles.progressionNew}>{p.newWeight != null ? `${p.newWeight} kg` : '—'}</Text>
                </View>
              ) : (
                <Text style={[styles.progressionPending, { color: colors.textSecondary }]}>
                  {p.consecutiveSuccesses}/{p.threshold} séances
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <PressableA11y
        accessibilityLabel="Retour au programme"
        onPress={onClose}
        style={[styles.closeBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.closeBtnText}>Retour au programme</Text>
      </PressableA11y>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 20 },
  hero: { alignItems: 'center', paddingVertical: 16, gap: 6 },
  emoji: { fontSize: 48 },
  heroTitle: { fontSize: 26, fontWeight: '700' },
  heroDuration: { fontSize: 16 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 16, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  progressionSection: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  progressionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  progressionName: { flex: 1, fontSize: 14 },
  progressionValues: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressionOld: { fontSize: 13 },
  progressionNew: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  progressionPending: { fontSize: 12 },
  closeBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  closeBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
```

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/components/session/SummaryPhase.tsx
git commit -m "feat(component): SummaryPhase — résumé + progressions"
```

---

## Task 12 : Bouton "▶ Démarrer" sur workout/[id].tsx

**Files:**
- Modify: `app/app/workout/[id].tsx`

- [ ] **Step 1 : Ajouter le bouton Démarrer**

Dans `app/app/workout/[id].tsx`, ajouter l'import suivant après les imports existants :

```typescript
import { WorkoutService } from '@/services/WorkoutService'; // déjà importé
```

Dans le JSX, juste avant la `<View>` principale fermante (avant la fermeture de `<>`), ajouter après le FAB existant :

```typescript
<PressableA11y
  accessibilityLabel="Démarrer la séance"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPress={() => router.push({ pathname: '/session/[workoutId]' as any, params: { workoutId: String(workoutId) } })}
  style={[styles.startBtn, { backgroundColor: '#16a34a' }]}
>
  <Ionicons name="play" size={18} color="#fff" />
  <Text style={styles.startBtnText}>Démarrer la séance</Text>
</PressableA11y>
```

Dans les styles, ajouter :

```typescript
startBtn: {
  position: 'absolute',
  bottom: 24,
  left: 24,
  right: 88, // laisse la place au FAB
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  paddingVertical: 14,
  borderRadius: 12,
  elevation: 4,
  shadowColor: SHADOW_COLOR,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
},
startBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
```

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/app/workout/[id].tsx
git commit -m "feat(screen): bouton Démarrer la séance sur workout/[id]"
```

---

## Task 13 : Accueil — carte "Prochaine séance"

**Files:**
- Modify: `app/app/(tabs)/index.tsx`

- [ ] **Step 1 : Réécrire index.tsx**

```typescript
// app/app/(tabs)/index.tsx
import { useState, useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { SessionService } from '@/services/SessionService';
import { SQLiteSessionLogRepository } from '@/repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '@/repositories/SQLiteSetLogRepository';
import { SQLitePersonalRecordRepository } from '@/repositories/SQLitePersonalRecordRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '@/repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '@/repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import { SQLiteProgramRepository } from '@/repositories/SQLiteProgramRepository';
import { getDb } from '@/db';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { Workout } from '@/db/types';

function makeSessionService(): SessionService {
  const db = getDb();
  return new SessionService(
    new SQLiteSessionLogRepository(db),
    new SQLiteSetLogRepository(db),
    new SQLitePersonalRecordRepository(db),
    new SQLiteWorkoutRepository(db),
    new SQLiteWorkoutExerciseRepository(db),
    new SQLiteBlockRepository(db),
    new SQLiteSetRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [nextWorkout, setNextWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasActiveProgram, setHasActiveProgram] = useState(false);

  const loadNextWorkout = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDb();
      const programRepo = new SQLiteProgramRepository(db);
      const programs = await programRepo.findAll();
      const active = programs.find(p => p.is_active === 1);
      if (!active) {
        setHasActiveProgram(false);
        setNextWorkout(null);
        return;
      }
      setHasActiveProgram(true);
      const service = makeSessionService();
      const next = await service.getNextWorkout(active.id);
      setNextWorkout(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadNextWorkout(); }, [loadNextWorkout]));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <Ionicons name="barbell-outline" size={52} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Prêt à s'entraîner ?</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : !hasActiveProgram ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Aucun programme actif</Text>
          <PressableA11y
            accessibilityLabel="Aller aux programmes"
            onPress={() => router.push('/(tabs)/programmes')}
            style={styles.linkBtn}
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>Créer un programme →</Text>
          </PressableA11y>
        </View>
      ) : nextWorkout ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>PROCHAINE SÉANCE</Text>
          <Text style={[styles.workoutName, { color: colors.text }]}>{nextWorkout.name}</Text>
          <PressableA11y
            accessibilityLabel={`Démarrer ${nextWorkout.name}`}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onPress={() => router.push({ pathname: '/session/[workoutId]' as any, params: { workoutId: String(nextWorkout.id) } })}
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.startBtnText}>Démarrer</Text>
          </PressableA11y>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Aucune séance configurée</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 24 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 10 },
  cardLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  workoutName: { fontSize: 20, fontWeight: '700' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkBtn: { paddingVertical: 4 },
  linkText: { fontSize: 15, fontWeight: '500' },
});
```

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```
Attendu : aucune erreur.

- [ ] **Step 3 : Run tous les tests**

```
npx jest
```
Attendu : ≥ 159 tests PASS (142 existants + 17 nouveaux SessionService + 8 + 7 + 4 repos).

- [ ] **Step 4 : Commit final**

```bash
git add app/app/(tabs)/index.tsx
git commit -m "feat(screen): accueil — prochaine séance + démarrage direct"
```

---

## Vérification finale

- [ ] Lancer l'app : `npm run android`
- [ ] Tester le flow complet :
  1. Accueil → carte "Prochaine séance" affichée
  2. Tap "Démarrer" → écran check-in (3 lignes, 3 options chacune)
  3. Sélectionner énergie/fatigue/sommeil → bouton "Commencer" s'active
  4. Tap "Commencer" → écran running (exercice + bloc + timer + inputs)
  5. Saisir reps/poids/RPE → "Valider" → timer redémarre, série suivante
  6. "Tout réussi ⚡" → valide avec valeurs cibles
  7. "Passer →" → série suivante sans log
  8. Après dernière série → écran résumé
  9. Résumé : durée + séries + liste progressions avec "80 → 82 kg"
  10. "Retour au programme" → navigation arrière
- [ ] Vérifier aussi via `workout/[id].tsx` → bouton vert "Démarrer la séance"
- [ ] `npx tsc --noEmit` → aucune erreur

---

## Notes d'implémentation

- `useSession` passe `workoutDetails` depuis `useWorkoutExercises` — les deux hooks coexistent dans `session/[workoutId].tsx`. Si `workoutDetails` est vide (chargement), la session ne peut pas démarrer (le bouton "Commencer" ne navigue qu'une fois les exercices chargés).
- Le timer se reset automatiquement sur chaque nouvelle série via `useEffect` sur `session.position`.
- `calculateProgressions` est appelé depuis `useSession.validateSet` lors de la complétion, pas depuis l'écran — le résumé reçoit les résultats déjà calculés.
- `rpe BETWEEN 1 AND 10` constraint SQL — ne pas permettre à l'utilisateur de saisir 0 ou >10 (le champ `rpe` est null si vide).
