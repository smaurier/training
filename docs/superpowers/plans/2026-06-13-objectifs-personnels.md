# Objectifs personnels — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'utilisateur de fixer un objectif de poids de travail sur un exercice, avec ETA calculé par régression linéaire sur l'historique réel.

**Architecture:** Table `goals` (migration v12), `IGoalRepository` + implémentations SQLite/InMemory, `computeETA` pure function (régression linéaire, fenêtre 12 sessions), `GoalService` CRUD, `useGoals` hook, UI dans `[exerciseId].tsx` (section + BottomSheet) et `progression.tsx` (section Stats).

**Tech Stack:** React Native, Expo SDK 54, TypeScript strict, expo-sqlite, @gorhom/bottom-sheet, Jest

---

## Fichiers

| Fichier | Action |
|---|---|
| `app/db/schema.ts` | Modifier — migration v12 |
| `app/db/types.ts` | Modifier — interfaces Goal, CreateGoalDto, GoalWithExercise |
| `app/repositories/IGoalRepository.ts` | Créer |
| `app/repositories/InMemoryGoalRepository.ts` | Créer |
| `app/repositories/SQLiteGoalRepository.ts` | Créer |
| `app/services/goalETA.ts` | Créer — computeETA pure function + ETAResult |
| `app/services/goalETA.test.ts` | Créer — 7 tests TDD |
| `app/services/GoalService.ts` | Créer |
| `app/services/GoalService.test.ts` | Créer — 4 tests TDD |
| `app/hooks/useGoals.ts` | Créer |
| `app/app/progression/[exerciseId].tsx` | Modifier — section OBJECTIF + BottomSheet création |
| `app/app/(tabs)/progression.tsx` | Modifier — section OBJECTIFS dans Stats |

---

### Task 1 : Infrastructure — DB, types, repositories

**Files:**
- Modify: `app/db/schema.ts`
- Modify: `app/db/types.ts`
- Create: `app/repositories/IGoalRepository.ts`
- Create: `app/repositories/InMemoryGoalRepository.ts`
- Create: `app/repositories/SQLiteGoalRepository.ts`

**Contexte :**
- Les migrations sont dans `app/db/schema.ts` — tableau `MIGRATIONS: string[]`. La dernière migration existante est v11 (`ALTER TABLE session_logs ADD COLUMN tags TEXT`). Ajouter v12 à la fin du tableau.
- Le fichier `app/db/types.ts` contient toutes les interfaces DB (Goal, etc.) — ajouter à la fin.
- Les repos SQLite utilisent `expo-sqlite` via `this.db.runAsync`, `this.db.getFirstAsync<T>`, `this.db.getAllAsync<T>`.
- `INSERT OR REPLACE INTO goals` fonctionne grâce à `UNIQUE(exercise_id)` — remplace silencieusement l'existant.
- Pas de tests TDD pour les repos (les tests passent par GoalService + InMemoryGoalRepository).

- [ ] **Step 1 : Ajouter migration v12 dans `app/db/schema.ts`**

Trouver la fin du tableau `MIGRATIONS` (ligne ~188-189) :
```typescript
  // v11 — tags séance
  `ALTER TABLE session_logs ADD COLUMN tags TEXT;`,
];
```

Remplacer par :
```typescript
  // v11 — tags séance
  `ALTER TABLE session_logs ADD COLUMN tags TEXT;`,

  // v12 — objectifs personnels
  `
  CREATE TABLE IF NOT EXISTS goals (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id   INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    target_weight REAL    NOT NULL,
    target_date   TEXT,
    achieved_at   TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(exercise_id)
  );
  `,
];
```

- [ ] **Step 2 : Ajouter interfaces dans `app/db/types.ts`**

Ajouter à la fin du fichier :

```typescript
export interface Goal {
  id: number;
  exercise_id: number;
  target_weight: number;
  target_date: string | null;
  achieved_at: string | null;
  created_at: string;
}

export interface CreateGoalDto {
  exercise_id: number;
  target_weight: number;
  target_date: string | null;
}

export interface GoalWithExercise {
  goal: Goal;
  exerciseName: string;
}
```

- [ ] **Step 3 : Créer `app/repositories/IGoalRepository.ts`**

```typescript
import type { Goal, CreateGoalDto } from '../db/types';

export interface IGoalRepository {
  save(dto: CreateGoalDto): Promise<Goal>;
  findByExerciseId(exerciseId: number): Promise<Goal | null>;
  findAll(): Promise<Goal[]>;
  update(id: number, patch: Partial<Pick<Goal, 'achieved_at' | 'target_weight' | 'target_date'>>): Promise<void>;
  delete(id: number): Promise<void>;
}
```

- [ ] **Step 4 : Créer `app/repositories/InMemoryGoalRepository.ts`**

```typescript
import type { IGoalRepository } from './IGoalRepository';
import type { Goal, CreateGoalDto } from '../db/types';

export class InMemoryGoalRepository implements IGoalRepository {
  private goals: Goal[] = [];
  private nextId = 1;

  async save(dto: CreateGoalDto): Promise<Goal> {
    const existing = this.goals.findIndex(g => g.exercise_id === dto.exercise_id);
    if (existing !== -1) this.goals.splice(existing, 1);
    const goal: Goal = {
      id: this.nextId++,
      exercise_id: dto.exercise_id,
      target_weight: dto.target_weight,
      target_date: dto.target_date,
      achieved_at: null,
      created_at: new Date().toISOString(),
    };
    this.goals.push(goal);
    return goal;
  }

  async findByExerciseId(exerciseId: number): Promise<Goal | null> {
    return this.goals.find(g => g.exercise_id === exerciseId) ?? null;
  }

  async findAll(): Promise<Goal[]> {
    return [...this.goals];
  }

  async update(id: number, patch: Partial<Pick<Goal, 'achieved_at' | 'target_weight' | 'target_date'>>): Promise<void> {
    const goal = this.goals.find(g => g.id === id);
    if (!goal) return;
    if (patch.achieved_at !== undefined) goal.achieved_at = patch.achieved_at;
    if (patch.target_weight !== undefined) goal.target_weight = patch.target_weight;
    if (patch.target_date !== undefined) goal.target_date = patch.target_date;
  }

  async delete(id: number): Promise<void> {
    this.goals = this.goals.filter(g => g.id !== id);
  }
}
```

- [ ] **Step 5 : Créer `app/repositories/SQLiteGoalRepository.ts`**

```typescript
import type { SQLiteDatabase } from 'expo-sqlite';
import type { IGoalRepository } from './IGoalRepository';
import type { Goal, CreateGoalDto } from '../db/types';

export class SQLiteGoalRepository implements IGoalRepository {
  constructor(private db: SQLiteDatabase) {}

  async save(dto: CreateGoalDto): Promise<Goal> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO goals (exercise_id, target_weight, target_date) VALUES (?, ?, ?)`,
      [dto.exercise_id, dto.target_weight, dto.target_date],
    );
    const row = await this.db.getFirstAsync<Goal>(
      'SELECT * FROM goals WHERE exercise_id = ?',
      [dto.exercise_id],
    );
    return row!;
  }

  async findByExerciseId(exerciseId: number): Promise<Goal | null> {
    return (await this.db.getFirstAsync<Goal>(
      'SELECT * FROM goals WHERE exercise_id = ?',
      [exerciseId],
    )) ?? null;
  }

  async findAll(): Promise<Goal[]> {
    return this.db.getAllAsync<Goal>('SELECT * FROM goals ORDER BY created_at DESC');
  }

  async update(id: number, patch: Partial<Pick<Goal, 'achieved_at' | 'target_weight' | 'target_date'>>): Promise<void> {
    const entries = (Object.entries(patch) as [string, unknown][]).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return;
    const sets = entries.map(([k]) => `${k} = ?`).join(', ');
    const values = entries.map(([, v]) => v);
    await this.db.runAsync(`UPDATE goals SET ${sets} WHERE id = ?`, [...values, id]);
  }

  async delete(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
  }
}
```

- [ ] **Step 6 : TypeScript check**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -15
```

Attendu : 0 erreurs TS.

- [ ] **Step 7 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/db/schema.ts app/db/types.ts app/repositories/IGoalRepository.ts app/repositories/InMemoryGoalRepository.ts app/repositories/SQLiteGoalRepository.ts && git commit -m "feat(goals): migration v12 + types + IGoalRepository + InMemory + SQLite"
```

---

### Task 2 : `computeETA` — pure function (TDD)

**Files:**
- Create: `app/services/goalETA.ts`
- Create: `app/services/goalETA.test.ts`

**Contexte :**
- `computeETA` prend l'historique des séances (max 12 — l'appelant fait le slice), calcule la régression linéaire sur (jours, poids) et retourne un `ETAResult`.
- Paramètre `today: Date = new Date()` pour permettre les tests déterministes.
- L'appelant passe `recentSessions.slice(-12).map(s => ({ date: s.date, weight: s.bestSet.weight }))`.
- `ExerciseSession.date` est une ISO string (ex: `"2026-06-01T10:00:00.000Z"`). Utiliser `Date.parse(s.date)` est correct.

- [ ] **Step 1 : Écrire les tests RED**

Créer `app/services/goalETA.test.ts` :

```typescript
import { computeETA } from './goalETA';

function makeSession(startIso: string, dayOffset: number, weight: number) {
  const d = new Date(startIso);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return { date: d.toISOString(), weight };
}

const START = '2026-01-01T10:00:00.000Z';
const TODAY = new Date('2026-03-01T12:00:00.000Z');

describe('computeETA', () => {
  it('retourne no_data si sessions vides', () => {
    expect(computeETA([], 100, undefined, TODAY).status).toBe('no_data');
  });

  it('retourne no_data si moins de 3 sessions', () => {
    const sessions = [makeSession(START, 0, 60), makeSession(START, 7, 62)];
    expect(computeETA(sessions, 100, undefined, TODAY).status).toBe('no_data');
  });

  it('retourne achieved si dernière session weight >= target', () => {
    const sessions = [
      makeSession(START, 0, 60),
      makeSession(START, 7, 80),
      makeSession(START, 14, 100),
    ];
    expect(computeETA(sessions, 100, undefined, TODAY).status).toBe('achieved');
  });

  it('retourne stagnant si pente <= 0 (même poids)', () => {
    const sessions = Array.from({ length: 5 }, (_, i) => makeSession(START, i * 7, 80));
    expect(computeETA(sessions, 100, undefined, TODAY).status).toBe('stagnant');
  });

  it('retourne on_track avec etaDate et ratePerWeek pour progression régulière', () => {
    // +2kg par semaine sur 8 séances : 60, 62, 64, ..., 74
    const sessions = Array.from({ length: 8 }, (_, i) => makeSession(START, i * 7, 60 + i * 2));
    const result = computeETA(sessions, 84, undefined, TODAY);
    expect(result.status).toBe('on_track');
    if (result.status !== 'on_track') return;
    expect(result.ratePerWeek).toBeCloseTo(2, 1);
    expect(result.etaDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(result.etaDate) > TODAY).toBe(true);
  });

  it('inclut projectedAtTargetDate si targetDate fournie', () => {
    const sessions = Array.from({ length: 8 }, (_, i) => makeSession(START, i * 7, 60 + i * 2));
    // targetDate = 2026-04-01 = 90 jours depuis START
    // projection = 60 + (2/7)*90 ≈ 85.7
    const result = computeETA(sessions, 84, '2026-04-01', TODAY);
    expect(result.status).toBe('on_track');
    if (result.status !== 'on_track') return;
    expect(result.projectedAtTargetDate).toBeDefined();
    expect(result.projectedAtTargetDate!).toBeCloseTo(85.7, 0);
  });

  it('calcule correctement avec exactement 12 sessions', () => {
    // 12 séances +1kg/sem
    const sessions = Array.from({ length: 12 }, (_, i) => makeSession(START, i * 7, 60 + i));
    const result = computeETA(sessions, 80, undefined, TODAY);
    expect(result.status).toBe('on_track');
    if (result.status !== 'on_track') return;
    expect(result.ratePerWeek).toBeCloseTo(1, 1);
  });
});
```

- [ ] **Step 2 : Vérifier RED**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="goalETA.test" --no-coverage 2>&1 | tail -10
```

Attendu : FAIL — `Cannot find module './goalETA'`

- [ ] **Step 3 : Implémenter `app/services/goalETA.ts`**

```typescript
export type ETAResult =
  | { status: 'achieved' }
  | { status: 'on_track'; etaDate: string; ratePerWeek: number; projectedAtTargetDate?: number }
  | { status: 'stagnant' }
  | { status: 'no_data' };

export function computeETA(
  sessions: { date: string; weight: number }[],
  targetWeight: number,
  targetDate?: string,
  today: Date = new Date(),
): ETAResult {
  const valid = sessions.filter(s => s.weight > 0);
  if (valid.length < 3) return { status: 'no_data' };
  if (valid[valid.length - 1].weight >= targetWeight) return { status: 'achieved' };

  const x0 = Date.parse(valid[0].date);
  const points = valid.map(s => ({
    x: (Date.parse(s.date) - x0) / 86400000,
    y: s.weight,
  }));

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { status: 'stagnant' };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  if (slope <= 0) return { status: 'stagnant' };

  const xToday = (today.getTime() - x0) / 86400000;
  const weightToday = intercept + slope * xToday;
  const daysUntilTarget = Math.max(1, (targetWeight - weightToday) / slope);
  const etaDate = new Date(today.getTime() + daysUntilTarget * 86400000).toISOString().slice(0, 10);
  const ratePerWeek = Math.round(slope * 7 * 10) / 10;

  let projectedAtTargetDate: number | undefined;
  if (targetDate) {
    const xTarget = (Date.parse(targetDate) - x0) / 86400000;
    projectedAtTargetDate = Math.round((intercept + slope * xTarget) * 10) / 10;
  }

  return { status: 'on_track', etaDate, ratePerWeek, projectedAtTargetDate };
}
```

- [ ] **Step 4 : Vérifier GREEN**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="goalETA.test" --no-coverage 2>&1 | tail -10
```

Attendu : PASS — 7 tests passent.

- [ ] **Step 5 : Suite complète + TS**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -10 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/services/goalETA.ts app/services/goalETA.test.ts && git commit -m "feat(goals): computeETA — régression linéaire ETA par poids de travail (TDD)"
```

---

### Task 3 : `GoalService` (TDD)

**Files:**
- Create: `app/services/GoalService.ts`
- Create: `app/services/GoalService.test.ts`

**Contexte :**
- `GoalService` prend `IGoalRepository` + `IExerciseRepository` (pour résoudre les noms d'exercices dans `getAllGoalsWithExercise`).
- `InMemoryExerciseRepository` existe déjà dans `app/repositories/InMemoryExerciseRepository.ts`.
- `baseExerciseDto` utilisé dans d'autres tests : `{ name: 'Squat', type: 'musculation' as const, muscle_groups: '[]', technical_notes: null, description: null, is_custom: 0 as const, progression_step: 2.5, progression_threshold: 1 }`.

- [ ] **Step 1 : Écrire les tests RED**

Créer `app/services/GoalService.test.ts` :

```typescript
import { GoalService } from './GoalService';
import { InMemoryGoalRepository } from '../repositories/InMemoryGoalRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';

const baseExerciseDto = {
  name: 'Squat',
  type: 'musculation' as const,
  muscle_groups: '[]',
  technical_notes: null,
  description: null,
  is_custom: 0 as const,
  progression_step: 2.5,
  progression_threshold: 1,
};

function makeService() {
  const goalRepo = new InMemoryGoalRepository();
  const exerciseRepo = new InMemoryExerciseRepository();
  return { service: new GoalService(goalRepo, exerciseRepo), goalRepo, exerciseRepo };
}

describe('GoalService', () => {
  it('setGoal crée un objectif', async () => {
    const { service } = makeService();
    const goal = await service.setGoal(1, 100, null);
    expect(goal.exercise_id).toBe(1);
    expect(goal.target_weight).toBe(100);
    expect(goal.target_date).toBeNull();
    expect(goal.achieved_at).toBeNull();
  });

  it('setGoal remplace l\'existant pour le même exercice', async () => {
    const { service } = makeService();
    await service.setGoal(1, 100, null);
    const updated = await service.setGoal(1, 120, '2026-09-01');
    expect(updated.target_weight).toBe(120);
    const fetched = await service.getGoal(1);
    expect(fetched?.target_weight).toBe(120);
  });

  it('markAchieved remplit achieved_at', async () => {
    const { service } = makeService();
    const goal = await service.setGoal(1, 100, null);
    await service.markAchieved(goal.id, '2026-08-15T10:00:00.000Z');
    const fetched = await service.getGoal(1);
    expect(fetched?.achieved_at).toBe('2026-08-15T10:00:00.000Z');
  });

  it('deleteGoal supprime l\'objectif', async () => {
    const { service } = makeService();
    const goal = await service.setGoal(1, 100, null);
    await service.deleteGoal(goal.id);
    expect(await service.getGoal(1)).toBeNull();
  });
});
```

- [ ] **Step 2 : Vérifier RED**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="GoalService.test" --no-coverage 2>&1 | tail -10
```

Attendu : FAIL — `Cannot find module './GoalService'`

- [ ] **Step 3 : Implémenter `app/services/GoalService.ts`**

```typescript
import type { IGoalRepository } from '../repositories/IGoalRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';
import type { Goal, GoalWithExercise, CreateGoalDto } from '../db/types';

export class GoalService {
  constructor(
    private goalRepo: IGoalRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async setGoal(exerciseId: number, targetWeight: number, targetDate: string | null): Promise<Goal> {
    return this.goalRepo.save({ exercise_id: exerciseId, target_weight: targetWeight, target_date: targetDate });
  }

  async getGoal(exerciseId: number): Promise<Goal | null> {
    return this.goalRepo.findByExerciseId(exerciseId);
  }

  async getAllGoalsWithExercise(): Promise<GoalWithExercise[]> {
    const goals = await this.goalRepo.findAll();
    return Promise.all(goals.map(async goal => {
      const exercise = await this.exerciseRepo.findById(goal.exercise_id);
      return { goal, exerciseName: exercise?.name ?? '' };
    }));
  }

  async markAchieved(id: number, achievedAt: string): Promise<void> {
    return this.goalRepo.update(id, { achieved_at: achievedAt });
  }

  async deleteGoal(id: number): Promise<void> {
    return this.goalRepo.delete(id);
  }
}
```

- [ ] **Step 4 : Vérifier GREEN**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="GoalService.test" --no-coverage 2>&1 | tail -10
```

Attendu : PASS — 4 tests passent.

- [ ] **Step 5 : Suite complète + TS**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -10 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/services/GoalService.ts app/services/GoalService.test.ts && git commit -m "feat(goals): GoalService — CRUD objectifs (TDD)"
```

---

### Task 4 : `useGoals` hook

**Files:**
- Create: `app/hooks/useGoals.ts`

**Contexte :**
- Pattern identique à `useLoggedExercises.ts` — même structure mountedRef + refresh + error.
- `GoalService` prend deux repos : `SQLiteGoalRepository` et `SQLiteExerciseRepository`.
- `getDb()` importé depuis `'../db'`.
- Pas de tests (comportement observable en UI).

- [ ] **Step 1 : Créer `app/hooks/useGoals.ts`**

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { GoalService } from '../services/GoalService';
import { SQLiteGoalRepository } from '../repositories/SQLiteGoalRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { getDb } from '../db';
import type { GoalWithExercise } from '../db/types';

function makeService(): GoalService {
  const db = getDb();
  return new GoalService(
    new SQLiteGoalRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

export function useGoals() {
  const serviceRef = useRef<GoalService | null>(null);
  if (serviceRef.current == null) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [goals, setGoals] = useState<GoalWithExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await service.getAllGoalsWithExercise();
      if (mountedRef.current) setGoals(result);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [service]);

  useEffect(() => { refresh(); }, [refresh]);

  return { goals, isLoading, error, refresh };
}
```

- [ ] **Step 2 : TypeScript + suite complète**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -10 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 3 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/hooks/useGoals.ts && git commit -m "feat(goals): useGoals hook — GoalWithExercise[] pour Stats"
```

---

### Task 5 : UI `[exerciseId].tsx` — section OBJECTIF + BottomSheet

**Files:**
- Modify: `app/app/progression/[exerciseId].tsx`

**Contexte :**
- Ce fichier fait ~226 lignes. Lire le fichier en entier avant de modifier.
- BottomSheet de `@gorhom/bottom-sheet` : `useRef<BottomSheet>(null)`, `snapPoints = useMemo(() => ['55%'], [])`, `useEffect` qui appelle `ref.current?.expand()` / `ref.current?.close()` selon un boolean. Voir `AddProgrammeBottomSheet.tsx` pour le pattern exact.
- `getDb()` est déjà importé (ligne 15).
- `exerciseHistory` est de type `ExerciseHistory | null` — `exerciseHistory?.recentSessions` peut être undefined.
- `ExerciseSession.bestSet.weight` est le poids le plus lourd de la séance.
- Gate bodyweight : `exerciseHistory?.recentSessions.every(s => s.bestSet.weight === 0)` — si true, masquer toute la section OBJECTIF.
- `GoalService` construit avec `SQLiteGoalRepository` + `SQLiteExerciseRepository` + `getDb()`.
- `computeETA` prend `sessions: { date: string; weight: number }[]`, `targetWeight: number`, `targetDate?: string`, `today?: Date`.
- Chips date : `'1m' | '3m' | '6m' | '1y' | 'none'`.

**Helper à ajouter (fichier local, avant le composant) :**
```typescript
function getTargetDateFromChip(chip: '1m' | '3m' | '6m' | '1y' | 'none'): string | null {
  if (chip === 'none') return null;
  const d = new Date();
  if (chip === '1m') d.setMonth(d.getMonth() + 1);
  else if (chip === '3m') d.setMonth(d.getMonth() + 3);
  else if (chip === '6m') d.setMonth(d.getMonth() + 6);
  else if (chip === '1y') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function formatEtaDate(isoDate: string): string {
  return new Date(isoDate + 'T12:00:00Z').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function makeGoalService(): GoalService {
  const db = getDb();
  return new GoalService(
    new SQLiteGoalRepository(db),
    new SQLiteExerciseRepository(db),
  );
}
```

- [ ] **Step 1 : Ajouter imports**

Dans `app/app/progression/[exerciseId].tsx`, ajouter aux imports existants :

```typescript
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { GoalService } from '@/services/GoalService';
import { SQLiteGoalRepository } from '@/repositories/SQLiteGoalRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import { computeETA } from '@/services/goalETA';
import type { Goal } from '@/db/types';
```

- [ ] **Step 2 : Ajouter helpers + makeGoalService avant le composant**

Après les helpers `formatDate`, `formatDateLong`, `formatDateShort` existants, ajouter :

```typescript
function getTargetDateFromChip(chip: '1m' | '3m' | '6m' | '1y' | 'none'): string | null {
  if (chip === 'none') return null;
  const d = new Date();
  if (chip === '1m') d.setMonth(d.getMonth() + 1);
  else if (chip === '3m') d.setMonth(d.getMonth() + 3);
  else if (chip === '6m') d.setMonth(d.getMonth() + 6);
  else if (chip === '1y') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function formatEtaDate(isoDate: string): string {
  return new Date(isoDate + 'T12:00:00Z').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function makeGoalService(): GoalService {
  const db = getDb();
  return new GoalService(new SQLiteGoalRepository(db), new SQLiteExerciseRepository(db));
}
```

- [ ] **Step 3 : Ajouter state + refs dans le composant**

Dans `ExerciseProgressionScreen`, après les états existants (`history`, `bestPR`, `allPRs`, `isLoading`, `error`) et après `mountedRef`, ajouter :

```typescript
  const goalServiceRef = useRef<GoalService | null>(null);
  if (goalServiceRef.current == null) goalServiceRef.current = makeGoalService();
  const goalService = goalServiceRef.current;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalSheetVisible, setGoalSheetVisible] = useState(false);
  const [targetWeightInput, setTargetWeightInput] = useState('');
  const [selectedChip, setSelectedChip] = useState<'1m' | '3m' | '6m' | '1y' | 'none'>('3m');
  const goalSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['55%'], []);
```

(Ajouter `useMemo` à l'import React si pas déjà présent — il l'est déjà dans ce fichier.)

- [ ] **Step 4 : Ajouter useEffect load goal**

Après le `useEffect` 1RM existant (lignes 48-74), ajouter :

```typescript
  useEffect(() => {
    const id = Number(exerciseId);
    goalService.getGoal(id).then(g => {
      if (mountedRef.current) setGoal(g);
    }).catch(() => {});
  }, [exerciseId, goalService]);
```

- [ ] **Step 5 : Ajouter useEffect détection atteinte**

Après le useEffect load goal, ajouter :

```typescript
  useEffect(() => {
    if (!goal || goal.achieved_at) return;
    const lastWeight = exerciseHistory?.recentSessions[0]?.bestSet.weight ?? 0;
    if (lastWeight > 0 && lastWeight >= goal.target_weight) {
      const now = new Date().toISOString();
      goalService.markAchieved(goal.id, now).then(() => {
        if (mountedRef.current) setGoal(prev => prev ? { ...prev, achieved_at: now } : null);
      }).catch(() => {});
    }
  }, [goal, exerciseHistory, goalService]);
```

- [ ] **Step 6 : Ajouter useEffect BottomSheet**

```typescript
  useEffect(() => {
    if (goalSheetVisible) {
      goalSheetRef.current?.expand();
    } else {
      goalSheetRef.current?.close();
    }
  }, [goalSheetVisible]);
```

- [ ] **Step 7 : Ajouter handler saveGoal**

```typescript
  const handleSaveGoal = useCallback(async () => {
    const w = parseFloat(targetWeightInput.replace(',', '.'));
    if (isNaN(w) || w <= 0) return;
    const targetDate = getTargetDateFromChip(selectedChip);
    const saved = await goalService.setGoal(Number(exerciseId), w, targetDate);
    if (mountedRef.current) {
      setGoal(saved);
      setGoalSheetVisible(false);
    }
  }, [targetWeightInput, selectedChip, exerciseId, goalService]);

  const handleDeleteGoal = useCallback(async () => {
    if (!goal) return;
    await goalService.deleteGoal(goal.id);
    if (mountedRef.current) setGoal(null);
  }, [goal, goalService]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} onPress={() => setGoalSheetVisible(false)} />
    ),
    [],
  );
```

(Ajouter `useCallback` à l'import React si pas déjà présent — vérifier l'import existant.)

- [ ] **Step 8 : Calculer eta pour l'affichage**

Juste avant le return du composant, ajouter :

```typescript
  const isBodyweight = exerciseHistory?.recentSessions.every(s => s.bestSet.weight === 0) ?? false;

  const etaSessions = (exerciseHistory?.recentSessions ?? [])
    .slice(-12)
    .map(s => ({ date: s.date, weight: s.bestSet.weight }));

  const eta = goal && !goal.achieved_at
    ? computeETA(etaSessions, goal.target_weight, goal.target_date ?? undefined)
    : null;

  const previewTargetWeight = parseFloat(targetWeightInput.replace(',', '.'));
  const previewEta = !isNaN(previewTargetWeight) && previewTargetWeight > 0
    ? computeETA(etaSessions, previewTargetWeight, getTargetDateFromChip(selectedChip) ?? undefined)
    : null;
```

- [ ] **Step 9 : Ajouter section OBJECTIF dans le JSX**

Dans le `ScrollView`, après la section HISTORIQUE SÉANCES existante (avant la balise `</ScrollView>`), ajouter :

```tsx
      {!isBodyweight && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>OBJECTIF</Text>

          {!goal && (
            <PressableA11y
              accessibilityLabel="Définir un objectif de poids"
              onPress={() => {
                setTargetWeightInput('');
                setSelectedChip('3m');
                setGoalSheetVisible(true);
              }}
              style={[styles.goalButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.goalButtonText, { color: colors.primary }]}>Définir un objectif</Text>
            </PressableA11y>
          )}

          {goal && goal.achieved_at && (
            <View>
              <Text style={[styles.goalAchieved, { color: colors.primary }]}>
                ✦ {convert(goal.target_weight)} {unitLabel} · Atteint le {new Date(goal.achieved_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <PressableA11y
                accessibilityLabel="Supprimer l'objectif"
                onPress={handleDeleteGoal}
                style={styles.goalDeleteBtn}
              >
                <Text style={[styles.goalDeleteText, { color: colors.textSecondary }]}>Supprimer</Text>
              </PressableA11y>
            </View>
          )}

          {goal && !goal.achieved_at && eta && (
            <View>
              <Text style={[styles.goalText, { color: colors.text }]}>
                {convert(goal.target_weight)} {unitLabel}
                {eta.status === 'on_track' && ` · ETA : ${formatEtaDate(eta.etaDate)} (+${eta.ratePerWeek} kg/sem)`}
                {eta.status === 'stagnant' && ' · Progression stagnante — ETA non calculable'}
                {eta.status === 'no_data' && ' · Trop peu de séances pour estimer'}
              </Text>
              {eta.status === 'on_track' && eta.projectedAtTargetDate !== undefined && goal.target_date && (
                <Text style={[styles.goalProjection, { color: colors.textSecondary }]}>
                  À la date cible ({new Date(goal.target_date + 'T12:00:00Z').toLocaleDateString('fr-FR', { month: 'long' })}) : ~{convert(eta.projectedAtTargetDate)} {unitLabel} estimés
                </Text>
              )}
              <PressableA11y
                accessibilityLabel="Supprimer l'objectif"
                onPress={handleDeleteGoal}
                style={styles.goalDeleteBtn}
              >
                <Text style={[styles.goalDeleteText, { color: colors.textSecondary }]}>Supprimer</Text>
              </PressableA11y>
            </View>
          )}
        </View>
      )}
```

- [ ] **Step 10 : Ajouter BottomSheet après le ScrollView (dans le return, avant la fermeture de View racine)**

```tsx
      <BottomSheet
        ref={goalSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onClose={() => setGoalSheetVisible(false)}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Objectif de poids</Text>
          <TextInput
            style={[styles.sheetInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Poids cible (kg)"
            placeholderTextColor={colors.textSecondary}
            value={targetWeightInput}
            onChangeText={setTargetWeightInput}
            keyboardType="decimal-pad"
            accessibilityLabel="Poids cible en kilogrammes"
          />
          <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>Date cible</Text>
          <View style={styles.chipsRow}>
            {(['1m', '3m', '6m', '1y', 'none'] as const).map(chip => (
              <PressableA11y
                key={chip}
                accessibilityLabel={chip === 'none' ? 'Sans date' : chip === '1m' ? '1 mois' : chip === '3m' ? '3 mois' : chip === '6m' ? '6 mois' : '1 an'}
                accessibilityState={{ selected: selectedChip === chip }}
                onPress={() => setSelectedChip(chip)}
                style={[
                  styles.chip,
                  { backgroundColor: selectedChip === chip ? colors.primary : colors.background, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.chipText, { color: selectedChip === chip ? '#fff' : colors.text }]}>
                  {chip === 'none' ? 'Aucune' : chip === '1m' ? '1 mois' : chip === '3m' ? '3 mois' : chip === '6m' ? '6 mois' : '1 an'}
                </Text>
              </PressableA11y>
            ))}
          </View>
          {previewEta && (
            <Text style={[styles.sheetPreview, { color: colors.textSecondary }]}>
              {previewEta.status === 'on_track' && `ETA : ${formatEtaDate(previewEta.etaDate)} (+${previewEta.ratePerWeek} kg/sem)`}
              {previewEta.status === 'achieved' && '✦ Objectif déjà atteint !'}
              {previewEta.status === 'stagnant' && 'Progression stagnante — ETA non calculable'}
              {previewEta.status === 'no_data' && 'Trop peu de séances pour estimer'}
            </Text>
          )}
          <PressableA11y
            accessibilityLabel="Enregistrer l'objectif"
            onPress={handleSaveGoal}
            style={[styles.sheetSaveBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.sheetSaveBtnText}>Enregistrer</Text>
          </PressableA11y>
        </BottomSheetView>
      </BottomSheet>
```

- [ ] **Step 11 : Ajouter styles**

Dans `StyleSheet.create({...})`, ajouter :

```typescript
  goalButton: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start' },
  goalButtonText: { fontSize: 14, fontWeight: '600' },
  goalText: { fontSize: 15, fontWeight: '500' },
  goalProjection: { fontSize: 13, marginTop: 4 },
  goalAchieved: { fontSize: 15, fontWeight: '600' },
  goalDeleteBtn: { marginTop: 8, alignSelf: 'flex-start' },
  goalDeleteText: { fontSize: 13 },
  sheetContent: { padding: 20, gap: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  sheetInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  sheetLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, fontWeight: '500' },
  sheetPreview: { fontSize: 13, fontStyle: 'italic' },
  sheetSaveBtn: { borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  sheetSaveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
```

- [ ] **Step 12 : TypeScript + suite complète**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -20 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 13 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add "app/app/progression/[exerciseId].tsx" && git commit -m "feat(goals): section OBJECTIF dans détail exercice + BottomSheet création"
```

---

### Task 6 : `progression.tsx` — section OBJECTIFS dans Stats

**Files:**
- Modify: `app/app/(tabs)/progression.tsx`

**Contexte :**
- `progression.tsx` utilise `useFocusEffect` + `useCallback` avec `refreshHist()` + `refreshStats()` pour recharger au focus. Ajouter `refreshGoals()` au même callback.
- La section Stats se trouve dans le return final (après `if (activeSegment === 'historique')`).
- Insérer la section OBJECTIFS avant la section existante `{stats && ...chipsRow}`.
- Chaque ligne objectif navigue vers `/progression/[exerciseId]` avec `exerciseId` et `exerciseName`.
- Pour les objectifs atteints : afficher "✦ Atteint" à la place de l'ETA — pas de calcul d'ETA en Stats (coûteux, non nécessaire).

- [ ] **Step 1 : Ajouter import useGoals**

Dans les imports de `app/app/(tabs)/progression.tsx`, ajouter :

```typescript
import { useGoals } from '@/hooks/useGoals';
```

- [ ] **Step 2 : Ajouter useGoals au composant**

Dans `ProgressionScreen`, après la ligne `useProgression()`, ajouter :

```typescript
  const { goals, refresh: refreshGoals } = useGoals();
```

- [ ] **Step 3 : Ajouter refreshGoals au useFocusEffect**

Trouver :
```typescript
      refreshHist();
      refreshStats();
```

Remplacer par :
```typescript
      refreshHist();
      refreshStats();
      refreshGoals();
```

Et ajouter `refreshGoals` aux dépendances du `useCallback` :
```typescript
  }, [refreshHist, refreshStats, refreshGoals])
```

- [ ] **Step 4 : Ajouter section OBJECTIFS dans le JSX Stats**

Dans le return Stats (ScrollView), avant la section `{stats && (<View style={styles.chipsRow}>...)}`, ajouter :

```tsx
        {goals.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>OBJECTIFS</Text>
            {goals.map(({ goal, exerciseName }, i) => (
              <PressableA11y
                key={goal.id}
                accessibilityLabel={`Objectif ${exerciseName} : ${goal.target_weight} kg${goal.achieved_at ? ', atteint' : ''}`}
                onPress={() => router.push({
                  pathname: '/progression/[exerciseId]' as any,
                  params: { exerciseId: String(goal.exercise_id), exerciseName },
                })}
                style={[styles.goalRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <Text style={[styles.goalRowName, { color: colors.text }]}>{exerciseName}</Text>
                <Text style={[styles.goalRowTarget, { color: goal.achieved_at ? colors.primary : colors.textSecondary }]}>
                  {goal.achieved_at ? `✦ ${goal.target_weight} kg atteint` : `→ ${goal.target_weight} kg`}
                </Text>
              </PressableA11y>
            ))}
          </View>
        )}
```

- [ ] **Step 5 : Ajouter styles**

Dans `StyleSheet.create({...})`, ajouter :

```typescript
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  goalRowName: { fontSize: 14, fontWeight: '500', flex: 1 },
  goalRowTarget: { fontSize: 13 },
```

- [ ] **Step 6 : TypeScript + suite complète**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -20 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 7 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add "app/app/(tabs)/progression.tsx" && git commit -m "feat(goals): section OBJECTIFS dans Stats — liste + navigation exercice"
```

---

## Self-Review

**Spec coverage :**
- ✅ Migration v12 `goals` table avec UNIQUE(exercise_id) — T1
- ✅ `IGoalRepository` + InMemory + SQLite — T1
- ✅ `computeETA` pure function, régression linéaire, 7 tests TDD — T2
- ✅ `GoalService` CRUD, 4 tests TDD — T3
- ✅ `useGoals` hook → `GoalWithExercise[]` — T4
- ✅ Gate bodyweight (`recentSessions.every(s => s.bestSet.weight === 0)`) — T5
- ✅ Section OBJECTIF dans `[exerciseId].tsx` (5 états : no goal, on_track, stagnant, no_data, achieved) — T5
- ✅ BottomSheet création avec chips date et aperçu ETA temps réel — T5
- ✅ Détection atteinte via useEffect (bestSet.weight >= target_weight) — T5
- ✅ Section OBJECTIFS dans Stats — T6
- ✅ `today` paramètre injecté dans `computeETA` pour tests déterministes — T2

**Placeholders :** aucun.

**Type consistency :**
- `Goal` défini T1 → utilisé T2 (non), T3 (GoalService return) → utilisé T4 (useGoals state) → utilisé T5 ([exerciseId].tsx state). ✓
- `GoalWithExercise` défini T1 → retourné par GoalService.getAllGoalsWithExercise() T3 → retourné par useGoals T4 → destructuré dans progression.tsx T6. ✓
- `ETAResult` défini T2 → `computeETA` retourne T2 → utilisé dans [exerciseId].tsx T5 (`.status`, `.etaDate`, `.ratePerWeek`, `.projectedAtTargetDate`). ✓
- `makeGoalService()` retourne `GoalService` → utilise `SQLiteGoalRepository` + `SQLiteExerciseRepository` → définis T1. ✓
