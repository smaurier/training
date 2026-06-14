# Historique cardio + Suppression sécurisée exercice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher km/durée dans l'historique des exercices cardio, et permettre la suppression d'exercices avec un guard contre les données liées (set_logs + workout_exercises).

**Architecture:** Deux features indépendantes. Feature 1 : `ExerciseHistoryService` propage `duration_seconds`/`distance_meters` depuis `SetLog`, `computeBestSet` helper branché sur `exercise.type`, UI `[exerciseId].tsx` adapte le rendu. Feature 2 : `findByExerciseId` ajouté à `IWorkoutExerciseRepository`, `ExerciseService.safeDelete(id, force)` vérifie les deux tables avant suppression, swipe-left dans `ExerciseCard`.

**Tech Stack:** React Native + Expo SDK 54, TypeScript strict, expo-sqlite, Jest TDD, react-native-gesture-handler (Swipeable — déjà installé)

---

## Fichiers impactés

**Feature 1 — Historique cardio**
- Modify: `app/services/ExerciseHistoryService.ts`
- Modify: `app/services/ExerciseHistoryService.test.ts`
- Modify: `app/app/progression/[exerciseId].tsx`

**Feature 2 — Suppression sécurisée**
- Modify: `app/repositories/IWorkoutExerciseRepository.ts`
- Modify: `app/repositories/SQLiteWorkoutExerciseRepository.ts`
- Modify: `app/repositories/InMemoryWorkoutExerciseRepository.ts`
- Modify: `app/repositories/workoutExerciseRepository.contract.ts`
- Modify: `app/services/ExerciseService.ts`
- Modify: `app/services/ExerciseService.test.ts`
- Modify: `app/hooks/useExercises.ts`
- Modify: `app/components/exercises/ExerciseCard.tsx`
- Modify: `app/app/(tabs)/exercices.tsx`

---

## Task 1 — ExerciseHistoryService : cardio fields + computeBestSet (TDD)

**Files:**
- Modify: `app/services/ExerciseHistoryService.ts`
- Modify: `app/services/ExerciseHistoryService.test.ts`

### Context

`ExerciseSetRecord` a actuellement `{ reps: number; weight: number }`. Les champs `duration_seconds` et `distance_meters` sont dans `SetLog` mais non propagés. `bestSet` est calculé inline dans `getHistory` — à extraire en `computeBestSet`.

Les tests existants vérifient `bestSet` avec `.toEqual({ reps: X, weight: Y })` — ces assertions échoueront après l'ajout de nouveaux champs optionnels → mise à jour vers `expect.objectContaining`.

- [ ] **Step 1 : Écrire les tests RED**

Dans `app/services/ExerciseHistoryService.test.ts`, ajouter après le bloc `describe('ExerciseHistoryService.getLoggedExercises', ...)` :

```typescript
describe('ExerciseHistoryService — cardio', () => {
  const cardioExerciseDto = {
    name: 'Course',
    type: 'cardio' as const,
    muscle_groups: '[]',
    technical_notes: null,
    description: null,
    is_custom: 0 as const,
    progression_step: 0,
    progression_threshold: 1,
  };

  it('propage duration_seconds et distance_meters dans ExerciseSetRecord', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(cardioExerciseDto);
    await setLogRepo.save({
      session_log_id: 1, set_id: 1, exercise_id: ex.id,
      reps_done: 0, weight_done: 0, rpe: null,
      completed_at: '2026-06-01T10:00:00.000Z',
      duration_seconds: 1800,
      distance_meters: 5000,
    });
    const result = await service.getHistory(ex.id);
    expect(result.lastSession?.sets[0].duration_seconds).toBe(1800);
    expect(result.lastSession?.sets[0].distance_meters).toBe(5000);
  });

  it('bestSet cardio — choisit la distance max quand distance_meters > 0', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(cardioExerciseDto);
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 0, weight_done: 0, rpe: null, completed_at: '2026-06-01T10:00:00.000Z', duration_seconds: 1800, distance_meters: 5000 });
    await setLogRepo.save({ session_log_id: 1, set_id: 2, exercise_id: ex.id, reps_done: 0, weight_done: 0, rpe: null, completed_at: '2026-06-01T10:30:00.000Z', duration_seconds: 2100, distance_meters: 8000 });
    const result = await service.getHistory(ex.id);
    expect(result.lastSession?.bestSet.distance_meters).toBe(8000);
  });

  it('bestSet cardio — fallback durée max si aucune distance', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(cardioExerciseDto);
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 0, weight_done: 0, rpe: null, completed_at: '2026-06-01T10:00:00.000Z', duration_seconds: 1800, distance_meters: null });
    await setLogRepo.save({ session_log_id: 1, set_id: 2, exercise_id: ex.id, reps_done: 0, weight_done: 0, rpe: null, completed_at: '2026-06-01T10:30:00.000Z', duration_seconds: 2700, distance_meters: null });
    const result = await service.getHistory(ex.id);
    expect(result.lastSession?.bestSet.duration_seconds).toBe(2700);
  });

  it('bestSet cardio — fallback premier set si tout null', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(cardioExerciseDto);
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 0, weight_done: 0, rpe: null, completed_at: '2026-06-01T10:00:00.000Z', duration_seconds: null, distance_meters: null });
    const result = await service.getHistory(ex.id);
    expect(result.lastSession?.bestSet).toBeDefined();
  });
});
```

Mettre à jour les deux assertions `toEqual` existantes (tests non-cardio) pour utiliser `objectContaining` :

```typescript
// ligne ~71 — bestSet = set avec poids le plus élevé
expect(result.lastSession?.bestSet).toEqual(expect.objectContaining({ reps: 3, weight: 85 }));

// ligne ~80 — bestSet = reps max si bodyweight
expect(result.lastSession?.bestSet).toEqual(expect.objectContaining({ reps: 12, weight: 0 }));
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd app && npm test -- --testPathPattern="ExerciseHistoryService" --no-coverage 2>&1 | tail -20
```

Attendu : FAIL — "Cannot read properties of undefined" ou "Expected ... toEqual ..."

- [ ] **Step 3 : Implémenter les changements dans `ExerciseHistoryService.ts`**

Remplacer le contenu complet du fichier `app/services/ExerciseHistoryService.ts` :

```typescript
import type { ISetLogRepository } from '../repositories/ISetLogRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';
import type { Exercise } from '../db/types';

export interface ExerciseSetRecord {
  reps: number;
  weight: number;
  duration_seconds?: number | null;
  distance_meters?: number | null;
}

export interface ExerciseSession {
  sessionLogId: number;
  date: string;
  sets: ExerciseSetRecord[];
  bestSet: ExerciseSetRecord;
}

export interface ExerciseHistory {
  exercise: Exercise;
  lastSession: ExerciseSession | null;
  recentSessions: ExerciseSession[];
}

function computeBestSet(sets: ExerciseSetRecord[], isCardio: boolean): ExerciseSetRecord {
  if (isCardio) {
    const withDistance = sets.filter(s => s.distance_meters != null && s.distance_meters > 0);
    if (withDistance.length > 0)
      return withDistance.reduce((b, s) => s.distance_meters! > b.distance_meters! ? s : b);
    const withDuration = sets.filter(s => s.duration_seconds != null && s.duration_seconds > 0);
    if (withDuration.length > 0)
      return withDuration.reduce((b, s) => s.duration_seconds! > b.duration_seconds! ? s : b);
    return sets[0];
  }
  const allBodyweight = sets.every(s => s.weight === 0);
  return allBodyweight
    ? sets.reduce((b, s) => s.reps > b.reps ? s : b, sets[0])
    : sets.reduce((b, s) => s.weight > b.weight ? s : b, sets[0]);
}

export class ExerciseHistoryService {
  constructor(
    private setLogRepo: ISetLogRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async getHistory(exerciseId: number, limit?: number): Promise<ExerciseHistory> {
    const exercise = await this.exerciseRepo.findById(exerciseId);
    if (!exercise) throw new Error(`Exercise ${exerciseId} not found`);

    const setLogs = await this.setLogRepo.findByExerciseId(exerciseId);
    const isCardio = exercise.type === 'cardio';

    const groupMap = new Map<number, { date: string; sets: ExerciseSetRecord[] }>();
    for (const log of setLogs) {
      const record: ExerciseSetRecord = {
        reps: log.reps_done,
        weight: log.weight_done,
        duration_seconds: log.duration_seconds,
        distance_meters: log.distance_meters,
      };
      const existing = groupMap.get(log.session_log_id);
      if (!existing) {
        groupMap.set(log.session_log_id, { date: log.completed_at, sets: [record] });
      } else {
        existing.sets.push(record);
      }
    }

    const sessions: ExerciseSession[] = [...groupMap.entries()].map(([id, { date, sets }]) => ({
      sessionLogId: id,
      date,
      sets,
      bestSet: computeBestSet(sets, isCardio),
    })).sort((a, b) => b.date.localeCompare(a.date));

    return {
      exercise,
      lastSession: sessions[0] ?? null,
      recentSessions: limit !== undefined ? sessions.slice(0, limit) : sessions,
    };
  }

  async getLoggedExercises(): Promise<Exercise[]> {
    const loggedIds = new Set(await this.setLogRepo.findDistinctExerciseIds());
    const all = await this.exerciseRepo.findAll();
    return all
      .filter(e => loggedIds.has(e.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }
}
```

- [ ] **Step 4 : Vérifier que tous les tests passent**

```bash
cd app && npm test -- --testPathPattern="ExerciseHistoryService" --no-coverage 2>&1 | tail -15
```

Attendu : `Tests: 12 passed` (8 existants + 4 nouveaux)

- [ ] **Step 5 : Typecheck**

```bash
cd app && npm run typecheck 2>&1 | tail -5
```

Attendu : aucune erreur

- [ ] **Step 6 : Commit**

```bash
git add app/services/ExerciseHistoryService.ts app/services/ExerciseHistoryService.test.ts
git commit -m "feat(history): ExerciseHistoryService — cardio fields + computeBestSet"
```

---

## Task 2 — `[exerciseId].tsx` : affichage cardio

**Files:**
- Modify: `app/app/progression/[exerciseId].tsx`

### Context

Le fichier affiche deux sections historiques :
- **DERNIÈRE SÉANCE** (ligne ~270) : liste les sets avec `s.weight > 0 ? "${convert(s.weight)} ${unitLabel}" : 'Poids de corps'} × {s.reps} reps`
- **HISTORIQUE SÉANCES** (ligne ~283) : affiche `bestSet.weight` et `bestSet.reps`

Pour les exercices cardio (`exercise.type === 'cardio'`), remplacer par km/durée. `exerciseHistory.exercise` est disponible via `useExerciseHistory`.

- [ ] **Step 1 : Ajouter `formatCardioSet` et `isCardio`**

D'abord, mettre à jour l'import existant ligne ~18 pour inclure `ExerciseSetRecord` :

```typescript
import type { ExerciseSession, ExerciseSetRecord } from '@/services/ExerciseHistoryService';
```

Puis ajouter après `formatDateShort` (ligne ~35) :

```typescript
function formatCardioSet(s: ExerciseSetRecord): string {
  const parts: string[] = [];
  if (s.distance_meters != null && s.distance_meters > 0) {
    parts.push(`${(s.distance_meters / 1000).toFixed(1)} km`);
  }
  if (s.duration_seconds != null && s.duration_seconds > 0) {
    const min = Math.floor(s.duration_seconds / 60);
    const sec = s.duration_seconds % 60;
    parts.push(sec > 0 ? `${min}min ${sec}s` : `${min}min`);
  }
  return parts.length > 0 ? parts.join(' · ') : '—';
}
```

Ajouter juste après la ligne `const isBodyweight = ...` (ligne ~189) :

```typescript
const isCardio = exerciseHistory?.exercise.type === 'cardio';
```

- [ ] **Step 2 : Mettre à jour la section DERNIÈRE SÉANCE**

Trouver (ligne ~275-279) :
```tsx
{exerciseHistory.lastSession.sets.map((s, i) => (
  <Text key={`${s.weight}-${s.reps}-${i}`} style={[styles.setRow, { color: colors.text }]}>
    · {s.weight > 0 ? `${convert(s.weight)} ${unitLabel}` : 'Poids de corps'} × {s.reps} reps
  </Text>
))}
```

Remplacer par :
```tsx
{exerciseHistory.lastSession.sets.map((s, i) => (
  <Text key={`${s.weight}-${s.reps}-${i}`} style={[styles.setRow, { color: colors.text }]}>
    · {isCardio
      ? formatCardioSet(s)
      : s.weight > 0 ? `${convert(s.weight)} ${unitLabel} × ${s.reps} reps` : `Poids de corps × ${s.reps} reps`}
  </Text>
))}
```

- [ ] **Step 3 : Mettre à jour la section HISTORIQUE SÉANCES**

Trouver (ligne ~297-301) :
```tsx
{session.bestSet.weight > 0
  ? `${convert(session.bestSet.weight)} ${unitLabel} × ${session.bestSet.reps}`
  : `${session.bestSet.reps} reps`}
```

Remplacer par :
```tsx
{isCardio
  ? formatCardioSet(session.bestSet)
  : session.bestSet.weight > 0
    ? `${convert(session.bestSet.weight)} ${unitLabel} × ${session.bestSet.reps}`
    : `${session.bestSet.reps} reps`}
```

- [ ] **Step 4 : Typecheck**

```bash
cd app && npm run typecheck 2>&1 | tail -5
```

Attendu : aucune erreur

- [ ] **Step 5 : Lancer tous les tests**

```bash
cd app && npm test 2>&1 | tail -10
```

Attendu : tous passent

- [ ] **Step 6 : Commit**

```bash
git add app/app/progression/[exerciseId].tsx
git commit -m "feat(history): affichage cardio km/durée dans historique exercice"
```

---

## Task 3 — `findByExerciseId` sur WorkoutExercise repos

**Files:**
- Modify: `app/repositories/IWorkoutExerciseRepository.ts`
- Modify: `app/repositories/SQLiteWorkoutExerciseRepository.ts`
- Modify: `app/repositories/InMemoryWorkoutExerciseRepository.ts`
- Modify: `app/repositories/workoutExerciseRepository.contract.ts`

### Context

`IWorkoutExerciseRepository` n'a pas `findByExerciseId` — nécessaire pour que `ExerciseService.safeDelete` vérifie si l'exercice est utilisé dans des programmes.

- [ ] **Step 1 : Ajouter le test contract RED**

Dans `app/repositories/workoutExerciseRepository.contract.ts`, ajouter après le dernier `describe` :

```typescript
describe('findByExerciseId', () => {
  it('retourne vide si aucun workout_exercise pour cet exercice', async () => {
    expect(await repo.findByExerciseId(99)).toHaveLength(0);
  });

  it('retourne les workout_exercises de cet exercice', async () => {
    await repo.save({ workout_id: 1, exercise_id: 7, order_index: 0 });
    await repo.save({ workout_id: 2, exercise_id: 7, order_index: 0 });
    await repo.save({ workout_id: 1, exercise_id: 8, order_index: 1 }); // autre exercice
    const result = await repo.findByExerciseId(7);
    expect(result).toHaveLength(2);
    expect(result.every(we => we.exercise_id === 7)).toBe(true);
  });
});
```

- [ ] **Step 2 : Vérifier que le test échoue**

```bash
cd app && npm test -- --testPathPattern="InMemoryWorkoutExercise" --no-coverage 2>&1 | tail -10
```

Attendu : FAIL — "repo.findByExerciseId is not a function"

- [ ] **Step 3 : Ajouter la signature à l'interface**

Dans `app/repositories/IWorkoutExerciseRepository.ts`, ajouter à la fin de l'interface :

```typescript
findByExerciseId(exerciseId: number): Promise<WorkoutExercise[]>;
```

- [ ] **Step 4 : Implémenter dans `InMemoryWorkoutExerciseRepository`**

Dans `app/repositories/InMemoryWorkoutExerciseRepository.ts`, ajouter après `updateSuperset` :

```typescript
async findByExerciseId(exerciseId: number): Promise<WorkoutExercise[]> {
  return this.items.filter(we => we.exercise_id === exerciseId);
}
```

- [ ] **Step 5 : Implémenter dans `SQLiteWorkoutExerciseRepository`**

Dans `app/repositories/SQLiteWorkoutExerciseRepository.ts`, ajouter après `updateSuperset` :

```typescript
async findByExerciseId(exerciseId: number): Promise<WorkoutExercise[]> {
  return this.db.getAllAsync<WorkoutExercise>(
    'SELECT * FROM workout_exercises WHERE exercise_id = ?',
    [exerciseId],
  );
}
```

- [ ] **Step 6 : Vérifier que les tests passent**

```bash
cd app && npm test -- --testPathPattern="WorkoutExercise|workoutExercise" --no-coverage 2>&1 | tail -10
```

Attendu : tous passent

- [ ] **Step 7 : Typecheck**

```bash
cd app && npm run typecheck 2>&1 | tail -5
```

Attendu : aucune erreur

- [ ] **Step 8 : Commit**

```bash
git add app/repositories/IWorkoutExerciseRepository.ts app/repositories/SQLiteWorkoutExerciseRepository.ts app/repositories/InMemoryWorkoutExerciseRepository.ts app/repositories/workoutExerciseRepository.contract.ts
git commit -m "feat(repo): findByExerciseId sur WorkoutExerciseRepository"
```

---

## Task 4 — `ExerciseService.safeDelete` (TDD)

**Files:**
- Modify: `app/services/ExerciseService.ts`
- Modify: `app/services/ExerciseService.test.ts`

### Context

`ExerciseService` a actuellement un constructeur à 1 param (`IExerciseRepository`) et une méthode `remove(id)` sans garde. On :
- Ajoute `SafeDeleteConflict` exportée
- Étend le constructeur à 3 params (`IExerciseRepository`, `ISetLogRepository`, `IWorkoutExerciseRepository`)
- Supprime `remove(id)` (dead code, rien ne l'appelle depuis l'UI)
- Ajoute `safeDelete(id, force)`
- Met à jour les tests existants (`makeService()` → 3 repos)

- [ ] **Step 1 : Écrire les tests RED**

Dans `app/services/ExerciseService.test.ts`, remplacer `makeService()` et ajouter les nouveaux tests :

```typescript
import { ExerciseService, SafeDeleteConflict } from './ExerciseService';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';
import { InMemorySetLogRepository } from '../repositories/InMemorySetLogRepository';
import { InMemoryWorkoutExerciseRepository } from '../repositories/InMemoryWorkoutExerciseRepository';

function makeService() {
  const repo = new InMemoryExerciseRepository();
  const setLogRepo = new InMemorySetLogRepository();
  const weRepo = new InMemoryWorkoutExerciseRepository();
  const service = new ExerciseService(repo, setLogRepo, weRepo);
  return { service, repo, setLogRepo, weRepo };
}

// ... garder tous les describes existants (create, listAll, getById) inchangés ...

describe('ExerciseService.safeDelete', () => {
  it('supprime si aucun log ni programme', async () => {
    const { service, repo } = makeService();
    const ex = await repo.save({ name: 'Squat', type: 'musculation', muscle_groups: '[]', technical_notes: null, description: null, is_custom: 0, progression_step: 2.5, progression_threshold: 1 });
    await service.safeDelete(ex.id);
    expect(await repo.findById(ex.id)).toBeNull();
  });

  it('throw SafeDeleteConflict si set_logs existent', async () => {
    const { service, repo, setLogRepo } = makeService();
    const ex = await repo.save({ name: 'Squat', type: 'musculation', muscle_groups: '[]', technical_notes: null, description: null, is_custom: 0, progression_step: 2.5, progression_threshold: 1 });
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    await expect(service.safeDelete(ex.id)).rejects.toBeInstanceOf(SafeDeleteConflict);
  });

  it('throw SafeDeleteConflict avec sessions > 0 si set_logs existent', async () => {
    const { service, repo, setLogRepo } = makeService();
    const ex = await repo.save({ name: 'Squat', type: 'musculation', muscle_groups: '[]', technical_notes: null, description: null, is_custom: 0, progression_step: 2.5, progression_threshold: 1 });
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    const err = await service.safeDelete(ex.id).catch(e => e);
    expect(err.sessions).toBe(1);
    expect(err.programs).toBe(0);
  });

  it('throw SafeDeleteConflict si workout_exercises existent', async () => {
    const { service, repo, weRepo } = makeService();
    const ex = await repo.save({ name: 'Squat', type: 'musculation', muscle_groups: '[]', technical_notes: null, description: null, is_custom: 0, progression_step: 2.5, progression_threshold: 1 });
    await weRepo.save({ workout_id: 1, exercise_id: ex.id, order_index: 0 });
    const err = await service.safeDelete(ex.id).catch(e => e);
    expect(err).toBeInstanceOf(SafeDeleteConflict);
    expect(err.programs).toBe(1);
  });

  it('force=true supprime même avec logs et programmes', async () => {
    const { service, repo, setLogRepo, weRepo } = makeService();
    const ex = await repo.save({ name: 'Squat', type: 'musculation', muscle_groups: '[]', technical_notes: null, description: null, is_custom: 0, progression_step: 2.5, progression_threshold: 1 });
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    await weRepo.save({ workout_id: 1, exercise_id: ex.id, order_index: 0 });
    await service.safeDelete(ex.id, true);
    expect(await repo.findById(ex.id)).toBeNull();
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd app && npm test -- --testPathPattern="ExerciseService" --no-coverage 2>&1 | tail -15
```

Attendu : FAIL — "SafeDeleteConflict is not exported" ou constructeur incompatible

- [ ] **Step 3 : Implémenter dans `ExerciseService.ts`**

Remplacer le contenu complet de `app/services/ExerciseService.ts` :

```typescript
import type { Exercise } from '../db/types';
import type { IExerciseRepository, CreateExerciseDto } from '../repositories/IExerciseRepository';
import type { ISetLogRepository } from '../repositories/ISetLogRepository';
import type { IWorkoutExerciseRepository } from '../repositories/IWorkoutExerciseRepository';

export interface CreateExerciseInput {
  name: string;
  type: Exercise['type'];
  muscle_groups: string[];
  technical_notes?: string | null;
  is_custom?: 0 | 1;
  progression_step: number;
  progression_threshold: number;
}

export class SafeDeleteConflict extends Error {
  constructor(
    public readonly sessions: number,
    public readonly programs: number,
  ) {
    super('SAFE_DELETE_CONFLICT');
  }
}

export class ExerciseService {
  constructor(
    private readonly repo: IExerciseRepository,
    private readonly setLogRepo: ISetLogRepository,
    private readonly weRepo: IWorkoutExerciseRepository,
  ) {}

  async create(input: CreateExerciseInput): Promise<Exercise> {
    if (!input.name.trim()) {
      throw new Error('Le nom est requis');
    }
    if (input.progression_step <= 0) {
      throw new Error('Le pas de progression doit être positif');
    }

    const dto: CreateExerciseDto = {
      name: input.name.trim(),
      type: input.type,
      muscle_groups: JSON.stringify(input.muscle_groups),
      technical_notes: input.technical_notes ?? null,
      description: null,
      is_custom: input.is_custom ?? 0,
      progression_step: input.progression_step,
      progression_threshold: input.progression_threshold,
    };

    return this.repo.save(dto);
  }

  async listAll(): Promise<Exercise[]> {
    return this.repo.findAll();
  }

  async getById(id: number): Promise<Exercise | null> {
    return this.repo.findById(id);
  }

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
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd app && npm test -- --testPathPattern="ExerciseService" --no-coverage 2>&1 | tail -10
```

Attendu : tous passent (existants + 5 nouveaux)

- [ ] **Step 5 : Typecheck**

```bash
cd app && npm run typecheck 2>&1 | tail -5
```

Attendu : aucune erreur. Si erreur "ExerciseService constructor expects 3 args" → la mettre à jour dans `useExercises.ts` en step 6.

- [ ] **Step 6 : Commit**

```bash
git add app/services/ExerciseService.ts app/services/ExerciseService.test.ts
git commit -m "feat(service): ExerciseService.safeDelete + SafeDeleteConflict"
```

---

## Task 5 — `useExercises` : exposer `deleteExercise`

**Files:**
- Modify: `app/hooks/useExercises.ts`

### Context

`useExercises` a `makeService()` qui instancie `new ExerciseService(repo)` à 1 param — à mettre à jour à 3 params. Exposer `deleteExercise(id, force?)`.

- [ ] **Step 1 : Mettre à jour `useExercises.ts`**

Remplacer le contenu complet de `app/hooks/useExercises.ts` :

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { Exercise } from '../db/types';
import { ExerciseService, SafeDeleteConflict, CreateExerciseInput } from '../services/ExerciseService';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { SQLiteSetLogRepository } from '../repositories/SQLiteSetLogRepository';
import { SQLiteWorkoutExerciseRepository } from '../repositories/SQLiteWorkoutExerciseRepository';
import { getDb } from '../db';

export type { SafeDeleteConflict };

export interface UseExercisesResult {
  exercises: Exercise[];
  loading: boolean;
  error: string | null;
  create: (input: CreateExerciseInput) => Promise<void>;
  deleteExercise: (id: number, force?: boolean) => Promise<SafeDeleteConflict | null>;
  refresh: () => Promise<void>;
}

function makeService(): ExerciseService {
  const db = getDb();
  return new ExerciseService(
    new SQLiteExerciseRepository(db),
    new SQLiteSetLogRepository(db),
    new SQLiteWorkoutExerciseRepository(db),
  );
}

export function useExercises(): UseExercisesResult {
  const serviceRef = useRef<ExerciseService | null>(null);
  if (serviceRef.current == null) {
    serviceRef.current = makeService();
  }
  const service = serviceRef.current;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await service.listAll();
      if (mountedRef.current) setExercises(data);
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (input: CreateExerciseInput): Promise<void> => {
    try {
      await service.create(input);
      await refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      if (mountedRef.current) setError(msg);
      throw e;
    }
  }, [service, refresh]);

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

  return { exercises, loading, error, create, deleteExercise, refresh };
}
```

- [ ] **Step 2 : Typecheck + tests**

```bash
cd app && npm run typecheck 2>&1 | tail -5 && npm test 2>&1 | tail -10
```

Attendu : 0 erreurs TS, tous les tests passent

- [ ] **Step 3 : Commit**

```bash
git add app/hooks/useExercises.ts
git commit -m "feat(hook): useExercises — expose deleteExercise avec SafeDeleteConflict"
```

---

## Task 6 — `ExerciseCard` : Swipeable + bouton supprimer

**Files:**
- Modify: `app/components/exercises/ExerciseCard.tsx`

### Context

`ExerciseCard` est un `View` statique sans action. On le wrappe dans `Swipeable` (react-native-gesture-handler, déjà disponible dans Expo). Swipe gauche → bouton rouge "Supprimer" (largeur 80px). Prop optionnelle `onDelete`.

- [ ] **Step 1 : Mettre à jour `ExerciseCard.tsx`**

Remplacer le contenu complet de `app/components/exercises/ExerciseCard.tsx` :

```typescript
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Exercise } from '@/db/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

interface ExerciseCardProps {
  exercise: Exercise;
  onDelete?: (id: number) => void;
}

export function ExerciseCard({ exercise, onDelete }: ExerciseCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  let muscleGroups: string[] = [];
  try {
    muscleGroups = JSON.parse(exercise.muscle_groups || '[]');
  } catch {
    muscleGroups = [];
  }

  function renderRightActions() {
    if (!onDelete) return null;
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => onDelete(exercise.id)}
        accessibilityLabel={`Supprimer l'exercice ${exercise.name}`}
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={22} color="#fff" />
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable renderRightActions={onDelete ? renderRightActions : undefined} overshootRight={false}>
      <View
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        accessibilityLabel={`Exercice ${exercise.name}`}
      >
        <View style={styles.row}>
          <Text style={[styles.name, { color: colors.text }]}>{exercise.name}</Text>
          <Text style={[styles.badge, { color: colors.primary }]}>{exercise.type}</Text>
        </View>
        {muscleGroups.length > 0 && (
          <Text style={[styles.muscles, { color: colors.textSecondary }]}>
            {muscleGroups.join(' · ')}
          </Text>
        )}
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginBottom: 10,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  muscles: {
    fontSize: 13,
  },
  deleteAction: {
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: Radius.sm,
    marginBottom: 10,
  },
});
```

- [ ] **Step 2 : Typecheck**

```bash
cd app && npm run typecheck 2>&1 | tail -5
```

Attendu : aucune erreur

- [ ] **Step 3 : Commit**

```bash
git add app/components/exercises/ExerciseCard.tsx
git commit -m "feat(ui): ExerciseCard — swipe-left pour supprimer"
```

---

## Task 7 — `exercices.tsx` : `handleDeleteExercise` + passer `onDelete`

**Files:**
- Modify: `app/app/(tabs)/exercices.tsx`

### Context

`exercices.tsx` utilise `useExercises()` mais n'expose pas `deleteExercise`. On ajoute `handleDeleteExercise` qui affiche un `Alert.alert` de confirmation (avec avertissement si conflit).

- [ ] **Step 1 : Mettre à jour `exercices.tsx`**

Remplacer le contenu complet de `app/app/(tabs)/exercices.tsx` :

```typescript
import { FlatList, View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useExercises } from '@/hooks/useExercises';
import { ExerciseCard } from '@/components/exercises/ExerciseCard';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

const SHADOW_COLOR = '#000' as const;
const FAB_ICON_COLOR = '#fff' as const;

export default function ExercicesScreen() {
  const { exercises, loading, error, refresh, deleteExercise } = useExercises();
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

  const handleDeleteExercise = useCallback((id: number) => {
    deleteExercise(id).then(conflict => {
      if (!conflict) return;
      const parts: string[] = [];
      if (conflict.programs > 0) parts.push(`utilisé dans ${conflict.programs} programme(s)`);
      if (conflict.sessions > 0) parts.push(`${conflict.sessions} série(s) enregistrée(s)`);
      Alert.alert(
        'Supprimer quand même ?',
        `Cet exercice est ${parts.join(' et ')}. Cette action est irréversible.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => { deleteExercise(id, true).catch(() => {}); },
          },
        ],
      );
    }).catch(() => {});
  }, [deleteExercise]);

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
        data={exercises}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ExerciseCard exercise={item} onDelete={handleDeleteExercise} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            Aucun exercice. Appuie sur + pour en ajouter un.
          </Text>
        }
      />
      <PressableA11y
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/add-exercise')}
        accessibilityLabel="Ajouter un exercice"
      >
        <Ionicons name="add" size={28} color={FAB_ICON_COLOR} />
      </PressableA11y>
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
    borderRadius: Radius.full,
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

- [ ] **Step 2 : Typecheck + tests complets**

```bash
cd app && npm run typecheck 2>&1 | tail -5 && npm test 2>&1 | tail -10
```

Attendu : 0 erreurs TS, tous les tests passent

- [ ] **Step 3 : Commit final**

```bash
git add app/app/(tabs)/exercices.tsx
git commit -m "feat(ui): suppression exercice — swipe + guard sessions/programmes"
```
