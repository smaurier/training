# Historique des séances — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher toutes les séances passées dans l'onglet Progression, groupées par mois, avec un écran détail par séance (sets loggués + check-in).

**Architecture:** Deux nouvelles méthodes sur les repositories existants (`findAll` + `countBySessionLogIds`), un nouveau `HistoryService` (4 repos injectés), un hook `useHistory` qui groupe par mois pour `SectionList`, deux nouveaux écrans. Même pattern TDD Red/Green/Refactor + Repository + hooks que les sessions précédentes.

**Tech Stack:** React Native, Expo SDK 54, expo-sqlite, TypeScript strict, Jest, Expo Router.

---

## File Structure

```
app/repositories/
  ISessionLogRepository.ts          ← ajouter findAll()
  sessionLogRepository.contract.ts  ← ajouter tests findAll
  InMemorySessionLogRepository.ts   ← implémenter findAll
  SQLiteSessionLogRepository.ts     ← implémenter findAll
  ISetLogRepository.ts              ← ajouter countBySessionLogIds()
  setLogRepository.contract.ts      ← ajouter tests countBySessionLogIds
  InMemorySetLogRepository.ts       ← implémenter countBySessionLogIds
  SQLiteSetLogRepository.ts         ← implémenter countBySessionLogIds

app/services/
  HistoryService.ts                 ← nouveau (view models + 2 méthodes)
  HistoryService.test.ts            ← nouveau (8 tests)

app/hooks/
  useHistory.ts                     ← nouveau (groupement par mois)

app/components/history/
  SessionCard.tsx                   ← nouveau (item liste)
  ExerciseHistorySection.tsx        ← nouveau (exercice + chips sets)

app/app/
  (tabs)/progression.tsx            ← réécriture complète (SectionList)
  history/[sessionLogId].tsx        ← nouveau (écran détail)
  _layout.tsx                       ← ajouter Stack.Screen history
```

---

## Task 1 : Repository extensions — findAll + countBySessionLogIds

**Files:**
- Modify: `app/repositories/ISessionLogRepository.ts`
- Modify: `app/repositories/sessionLogRepository.contract.ts`
- Modify: `app/repositories/InMemorySessionLogRepository.ts`
- Modify: `app/repositories/SQLiteSessionLogRepository.ts`
- Modify: `app/repositories/ISetLogRepository.ts`
- Modify: `app/repositories/setLogRepository.contract.ts`
- Modify: `app/repositories/InMemorySetLogRepository.ts`
- Modify: `app/repositories/SQLiteSetLogRepository.ts`

- [ ] **Step 1 : Ajouter findAll au contrat ISessionLogRepository**

`app/repositories/ISessionLogRepository.ts` — ajouter la méthode :

```typescript
import type { SessionLog } from '../db/types';

export type CreateSessionLogDto = Omit<SessionLog, 'id' | 'ended_at'>;

export interface ISessionLogRepository {
  save(dto: CreateSessionLogDto): Promise<SessionLog>;
  findById(id: number): Promise<SessionLog | null>;
  findByWorkoutId(workoutId: number): Promise<SessionLog[]>;
  findLatestByWorkoutIds(workoutIds: number[]): Promise<SessionLog | null>;
  complete(id: number, endedAt: string): Promise<void>;
  findAll(): Promise<SessionLog[]>;
}
```

- [ ] **Step 2 : Ajouter les tests findAll au contrat sessionLogRepository**

Dans `app/repositories/sessionLogRepository.contract.ts`, ajouter ce bloc AVANT la dernière accolade fermante de `runSessionLogRepositoryContractTests` :

```typescript
  describe('findAll', () => {
    it('retourne [] si aucune session', async () => {
      expect(await repo.findAll()).toHaveLength(0);
    });
    it('retourne toutes les sessions ordonnées par started_at DESC', async () => {
      await repo.save({ ...dto1, started_at: '2026-01-01T10:00:00.000Z' });
      await repo.save({ ...dto1, started_at: '2026-01-03T10:00:00.000Z' });
      await repo.save({ ...dto1, started_at: '2026-01-02T10:00:00.000Z' });
      const all = await repo.findAll();
      expect(all).toHaveLength(3);
      expect(all[0].started_at).toBe('2026-01-03T10:00:00.000Z');
      expect(all[2].started_at).toBe('2026-01-01T10:00:00.000Z');
    });
  });
```

- [ ] **Step 3 : Vérifier que les tests échouent**

```
npx jest --testPathPattern=InMemorySessionLogRepository --no-coverage
```

Attendu : FAIL — `findAll is not a function`.

- [ ] **Step 4 : Implémenter findAll dans InMemorySessionLogRepository**

`app/repositories/InMemorySessionLogRepository.ts` — ajouter la méthode :

```typescript
  async findAll(): Promise<SessionLog[]> {
    return [...this.items].sort((a, b) => b.started_at.localeCompare(a.started_at));
  }
```

- [ ] **Step 5 : Vérifier que les tests passent**

```
npx jest --testPathPattern=InMemorySessionLogRepository --no-coverage
```

Attendu : PASS sur tous les tests.

- [ ] **Step 6 : Implémenter findAll dans SQLiteSessionLogRepository**

`app/repositories/SQLiteSessionLogRepository.ts` — ajouter la méthode :

```typescript
  async findAll(): Promise<SessionLog[]> {
    return this.db.getAllAsync<SessionLog>(
      'SELECT * FROM session_logs ORDER BY started_at DESC'
    );
  }
```

- [ ] **Step 7 : Ajouter countBySessionLogIds au contrat ISetLogRepository**

`app/repositories/ISetLogRepository.ts` — remplacer le contenu complet :

```typescript
import type { SetLog } from '../db/types';

export type CreateSetLogDto = Omit<SetLog, 'id'>;

export interface ISetLogRepository {
  save(dto: CreateSetLogDto): Promise<SetLog>;
  findBySessionLogId(sessionLogId: number): Promise<SetLog[]>;
  findBySetId(setId: number): Promise<SetLog[]>;
  countBySessionLogIds(ids: number[]): Promise<Record<number, number>>;
}
```

- [ ] **Step 8 : Ajouter les tests countBySessionLogIds au contrat setLogRepository**

Dans `app/repositories/setLogRepository.contract.ts`, ajouter ce bloc AVANT la dernière accolade fermante de `runSetLogRepositoryContractTests` :

```typescript
  describe('countBySessionLogIds', () => {
    it('retourne {} si ids vide', async () => {
      await repo.save(dto1);
      expect(await repo.countBySessionLogIds([])).toEqual({});
    });
    it('retourne les comptes par session', async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, set_id: 11, completed_at: '2026-01-01T10:06:00.000Z' });
      await repo.save({ ...dto1, session_log_id: 2, set_id: 12, completed_at: '2026-01-01T10:07:00.000Z' });
      const counts = await repo.countBySessionLogIds([1, 2]);
      expect(counts[1]).toBe(2);
      expect(counts[2]).toBe(1);
    });
    it("n'inclut pas les ids sans sets", async () => {
      const counts = await repo.countBySessionLogIds([99]);
      expect(counts[99]).toBeUndefined();
    });
  });
```

- [ ] **Step 9 : Vérifier que les tests échouent**

```
npx jest --testPathPattern=InMemorySetLogRepository --no-coverage
```

Attendu : FAIL — `countBySessionLogIds is not a function`.

- [ ] **Step 10 : Implémenter countBySessionLogIds dans InMemorySetLogRepository**

`app/repositories/InMemorySetLogRepository.ts` — ajouter la méthode :

```typescript
  async countBySessionLogIds(ids: number[]): Promise<Record<number, number>> {
    if (ids.length === 0) return {};
    const result: Record<number, number> = {};
    for (const item of this.items) {
      if (ids.includes(item.session_log_id)) {
        result[item.session_log_id] = (result[item.session_log_id] ?? 0) + 1;
      }
    }
    return result;
  }
```

- [ ] **Step 11 : Vérifier que les tests passent**

```
npx jest --testPathPattern=InMemorySetLogRepository --no-coverage
```

Attendu : PASS sur tous les tests.

- [ ] **Step 12 : Implémenter countBySessionLogIds dans SQLiteSetLogRepository**

`app/repositories/SQLiteSetLogRepository.ts` — ajouter la méthode :

```typescript
  async countBySessionLogIds(ids: number[]): Promise<Record<number, number>> {
    if (ids.length === 0) return {};
    const placeholders = ids.map(() => '?').join(',');
    const rows = await this.db.getAllAsync<{ session_log_id: number; cnt: number }>(
      `SELECT session_log_id, COUNT(*) as cnt FROM set_logs WHERE session_log_id IN (${placeholders}) GROUP BY session_log_id`,
      ids
    );
    const result: Record<number, number> = {};
    for (const row of rows) {
      result[row.session_log_id] = row.cnt;
    }
    return result;
  }
```

- [ ] **Step 13 : Vérifier TypeScript**

```
npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 14 : Commit**

```bash
git add app/repositories/ISessionLogRepository.ts app/repositories/sessionLogRepository.contract.ts app/repositories/InMemorySessionLogRepository.ts app/repositories/SQLiteSessionLogRepository.ts app/repositories/ISetLogRepository.ts app/repositories/setLogRepository.contract.ts app/repositories/InMemorySetLogRepository.ts app/repositories/SQLiteSetLogRepository.ts
git commit -m "feat(repo): findAll SessionLog + countBySessionLogIds SetLog"
```

---

## Task 2 : HistoryService

**Files:**
- Create: `app/services/HistoryService.ts`
- Create: `app/services/HistoryService.test.ts`

- [ ] **Step 1 : Écrire les tests RED**

Créer `app/services/HistoryService.test.ts` :

```typescript
import { InMemorySessionLogRepository } from '../repositories/InMemorySessionLogRepository';
import { InMemorySetLogRepository } from '../repositories/InMemorySetLogRepository';
import { InMemoryWorkoutRepository } from '../repositories/InMemoryWorkoutRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';
import { HistoryService } from './HistoryService';

function makeService() {
  const sessionLogRepo = new InMemorySessionLogRepository();
  const setLogRepo = new InMemorySetLogRepository();
  const workoutRepo = new InMemoryWorkoutRepository();
  const exerciseRepo = new InMemoryExerciseRepository();
  const service = new HistoryService(sessionLogRepo, setLogRepo, workoutRepo, exerciseRepo);
  return { service, sessionLogRepo, setLogRepo, workoutRepo, exerciseRepo };
}

const baseSessionDto = {
  started_at: '2026-01-01T10:00:00.000Z',
  checkin_energy: 3 as const,
  checkin_fatigue: 1 as const,
  checkin_sleep: 3 as const,
  notes: null,
};

const baseExerciseDto = {
  name: 'Développé couché',
  type: 'musculation' as const,
  muscle_groups: '[]',
  technical_notes: null,
  is_custom: 0 as const,
  progression_step: 2.5,
  progression_threshold: 1,
};

describe('HistoryService', () => {
  describe('getSessionList', () => {
    it('retourne [] si aucune session', async () => {
      const { service } = makeService();
      expect(await service.getSessionList()).toEqual([]);
    });

    it('retourne SessionSummary avec workoutName correct', async () => {
      const { service, sessionLogRepo, workoutRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      const list = await service.getSessionList();
      expect(list[0].workoutName).toBe('Push A');
    });

    it('calcule durationSeconds depuis ended_at', async () => {
      const { service, sessionLogRepo, workoutRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      const session = await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      await sessionLogRepo.complete(session.id, '2026-01-01T10:47:00.000Z');
      const list = await service.getSessionList();
      expect(list[0].durationSeconds).toBe(47 * 60);
    });

    it('retourne durationSeconds = 0 si ended_at null', async () => {
      const { service, sessionLogRepo, workoutRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      const list = await service.getSessionList();
      expect(list[0].durationSeconds).toBe(0);
    });

    it('retourne totalSets correct', async () => {
      const { service, sessionLogRepo, setLogRepo, workoutRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      const session = await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      await setLogRepo.save({ session_log_id: session.id, set_id: 1, exercise_id: 5, reps_done: 8, weight_done: 80, rpe: 7, completed_at: '2026-01-01T10:05:00.000Z' });
      await setLogRepo.save({ session_log_id: session.id, set_id: 2, exercise_id: 5, reps_done: 7, weight_done: 80, rpe: 8, completed_at: '2026-01-01T10:10:00.000Z' });
      const list = await service.getSessionList();
      expect(list[0].totalSets).toBe(2);
    });
  });

  describe('getSessionDetail', () => {
    it('retourne null si session inexistante', async () => {
      const { service } = makeService();
      expect(await service.getSessionDetail(999)).toBeNull();
    });

    it('retourne SessionDetail avec check-in et exercices groupés', async () => {
      const { service, sessionLogRepo, setLogRepo, workoutRepo, exerciseRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      const exercise = await exerciseRepo.save(baseExerciseDto);
      const session = await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      await sessionLogRepo.complete(session.id, '2026-01-01T10:47:00.000Z');
      await setLogRepo.save({ session_log_id: session.id, set_id: 1, exercise_id: exercise.id, reps_done: 8, weight_done: 80, rpe: 7, completed_at: '2026-01-01T10:05:00.000Z' });
      await setLogRepo.save({ session_log_id: session.id, set_id: 2, exercise_id: exercise.id, reps_done: 7, weight_done: 80, rpe: 8, completed_at: '2026-01-01T10:10:00.000Z' });
      const detail = await service.getSessionDetail(session.id);
      expect(detail).not.toBeNull();
      expect(detail!.workoutName).toBe('Push A');
      expect(detail!.checkinEnergy).toBe(3);
      expect(detail!.exercises).toHaveLength(1);
      expect(detail!.exercises[0].exerciseName).toBe('Développé couché');
      expect(detail!.exercises[0].sets).toHaveLength(2);
      expect(detail!.totalSets).toBe(2);
    });

    it('ordonne les sets par completed_at ASC dans chaque exercice', async () => {
      const { service, sessionLogRepo, setLogRepo, workoutRepo, exerciseRepo } = makeService();
      const workout = await workoutRepo.save({ program_id: 1, name: 'Push A', order_index: 0 });
      const exercise = await exerciseRepo.save({ ...baseExerciseDto, name: 'Squat' });
      const session = await sessionLogRepo.save({ ...baseSessionDto, workout_id: workout.id });
      await setLogRepo.save({ session_log_id: session.id, set_id: 2, exercise_id: exercise.id, reps_done: 6, weight_done: 100, rpe: 9, completed_at: '2026-01-01T10:10:00.000Z' });
      await setLogRepo.save({ session_log_id: session.id, set_id: 1, exercise_id: exercise.id, reps_done: 8, weight_done: 100, rpe: 7, completed_at: '2026-01-01T10:05:00.000Z' });
      const detail = await service.getSessionDetail(session.id);
      expect(detail!.exercises[0].sets[0].rpe).toBe(7);
      expect(detail!.exercises[0].sets[1].rpe).toBe(9);
    });
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```
npx jest --testPathPattern=HistoryService --no-coverage
```

Attendu : FAIL — `Cannot find module './HistoryService'`.

- [ ] **Step 3 : Créer HistoryService.ts**

Créer `app/services/HistoryService.ts` :

```typescript
import type { ISessionLogRepository } from '../repositories/ISessionLogRepository';
import type { ISetLogRepository } from '../repositories/ISetLogRepository';
import type { IWorkoutRepository } from '../repositories/IWorkoutRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';

export interface SessionSummary {
  id: number;
  workoutName: string;
  startedAt: string;
  durationSeconds: number;
  totalSets: number;
}

export interface SetLogSummary {
  repsDone: number;
  weightDone: number;
  rpe: number | null;
}

export interface ExerciseHistory {
  exerciseId: number;
  exerciseName: string;
  sets: SetLogSummary[];
}

export interface SessionDetail {
  id: number;
  workoutName: string;
  startedAt: string;
  durationSeconds: number;
  totalSets: number;
  checkinEnergy: 1 | 2 | 3 | null;
  checkinFatigue: 1 | 2 | 3 | null;
  checkinSleep: 1 | 2 | 3 | null;
  exercises: ExerciseHistory[];
}

export class HistoryService {
  constructor(
    private sessionLogRepo: ISessionLogRepository,
    private setLogRepo: ISetLogRepository,
    private workoutRepo: IWorkoutRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async getSessionList(): Promise<SessionSummary[]> {
    const sessions = await this.sessionLogRepo.findAll();
    if (sessions.length === 0) return [];

    const workoutIds = [...new Set(sessions.map(s => s.workout_id))];
    const workouts = await Promise.all(workoutIds.map(id => this.workoutRepo.findById(id)));
    const workoutMap = new Map<number, string>();
    workoutIds.forEach((id, i) => {
      workoutMap.set(id, workouts[i]?.name ?? 'Séance inconnue');
    });

    const sessionIds = sessions.map(s => s.id);
    const counts = await this.setLogRepo.countBySessionLogIds(sessionIds);

    return sessions.map(s => ({
      id: s.id,
      workoutName: workoutMap.get(s.workout_id) ?? 'Séance inconnue',
      startedAt: s.started_at,
      durationSeconds: s.ended_at
        ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000)
        : 0,
      totalSets: counts[s.id] ?? 0,
    }));
  }

  async getSessionDetail(sessionLogId: number): Promise<SessionDetail | null> {
    const session = await this.sessionLogRepo.findById(sessionLogId);
    if (!session) return null;

    const workout = await this.workoutRepo.findById(session.workout_id);
    const setLogs = await this.setLogRepo.findBySessionLogId(sessionLogId);

    const exerciseIds = [...new Set(setLogs.map(s => s.exercise_id))];
    const exercises = await Promise.all(exerciseIds.map(id => this.exerciseRepo.findById(id)));
    const exerciseMap = new Map<number, string>();
    exerciseIds.forEach((id, i) => {
      exerciseMap.set(id, exercises[i]?.name ?? 'Exercice inconnu');
    });

    const sortedLogs = [...setLogs].sort((a, b) => a.completed_at.localeCompare(b.completed_at));
    const groups = new Map<number, { firstAt: string; sets: SetLogSummary[] }>();
    for (const log of sortedLogs) {
      const entry: SetLogSummary = { repsDone: log.reps_done, weightDone: log.weight_done, rpe: log.rpe };
      const existing = groups.get(log.exercise_id);
      if (existing) {
        existing.sets.push(entry);
      } else {
        groups.set(log.exercise_id, { firstAt: log.completed_at, sets: [entry] });
      }
    }

    const exerciseHistories: ExerciseHistory[] = [...groups.entries()]
      .sort((a, b) => a[1].firstAt.localeCompare(b[1].firstAt))
      .map(([exerciseId, { sets }]) => ({
        exerciseId,
        exerciseName: exerciseMap.get(exerciseId) ?? 'Exercice inconnu',
        sets,
      }));

    const durationSeconds = session.ended_at
      ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000)
      : 0;

    return {
      id: session.id,
      workoutName: workout?.name ?? 'Séance inconnue',
      startedAt: session.started_at,
      durationSeconds,
      totalSets: setLogs.length,
      checkinEnergy: session.checkin_energy,
      checkinFatigue: session.checkin_fatigue,
      checkinSleep: session.checkin_sleep,
      exercises: exerciseHistories,
    };
  }
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```
npx jest --testPathPattern=HistoryService --no-coverage
```

Attendu : 8 tests PASS.

- [ ] **Step 5 : Vérifier TypeScript**

```
npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 6 : Commit**

```bash
git add app/services/HistoryService.ts app/services/HistoryService.test.ts
git commit -m "feat(service): HistoryService — getSessionList + getSessionDetail"
```

---

## Task 3 : useHistory hook

**Files:**
- Create: `app/hooks/useHistory.ts`

- [ ] **Step 1 : Créer le hook**

Créer `app/hooks/useHistory.ts` :

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { HistoryService, SessionSummary } from '../services/HistoryService';
import { SQLiteSessionLogRepository } from '../repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '../repositories/SQLiteSetLogRepository';
import { SQLiteWorkoutRepository } from '../repositories/SQLiteWorkoutRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { getDb } from '../db';

export interface HistorySection {
  title: string;
  data: SessionSummary[];
}

export interface UseHistoryReturn {
  sections: HistorySection[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function makeService(): HistoryService {
  const db = getDb();
  return new HistoryService(
    new SQLiteSessionLogRepository(db),
    new SQLiteSetLogRepository(db),
    new SQLiteWorkoutRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

function groupByMonth(sessions: SessionSummary[]): HistorySection[] {
  const sectionMap = new Map<string, SessionSummary[]>();
  for (const session of sessions) {
    const key = session.startedAt.slice(0, 7);
    const existing = sectionMap.get(key);
    if (existing) {
      existing.push(session);
    } else {
      sectionMap.set(key, [session]);
    }
  }
  return [...sectionMap.entries()].map(([key, data]) => {
    const label = new Date(key + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const title = label.charAt(0).toUpperCase() + label.slice(1) + ` · ${data.length} séance${data.length > 1 ? 's' : ''}`;
    return { title, data };
  });
}

export function useHistory(): UseHistoryReturn {
  const serviceRef = useRef<HistoryService | null>(null);
  if (!serviceRef.current) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [sections, setSections] = useState<HistorySection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      const list = await service.getSessionList();
      if (!mountedRef.current) return;
      setSections(groupByMonth(list));
      setError(null);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sections, isLoading, error, refresh };
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```
npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/hooks/useHistory.ts
git commit -m "feat(hook): useHistory — groupement par mois pour SectionList"
```

---

## Task 4 : SessionCard + réécriture progression.tsx

**Files:**
- Create: `app/components/history/SessionCard.tsx`
- Modify: `app/app/(tabs)/progression.tsx` (réécriture complète)

- [ ] **Step 1 : Créer SessionCard**

Créer `app/components/history/SessionCard.tsx` :

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { SessionSummary } from '@/services/HistoryService';

interface SessionCardProps {
  session: SessionSummary;
  onPress: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min${s > 0 ? ` ${s} s` : ''}` : `${s} s`;
}

export function SessionCard({ session, onPress }: SessionCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const dateStr = formatDate(session.startedAt);
  const accessibilityLabel = `${session.workoutName}, ${dateStr}, ${formatDuration(session.durationSeconds)}, ${session.totalSets} séries`;

  return (
    <PressableA11y
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
    >
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]}>{session.workoutName}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {dateStr} · {formatDuration(session.durationSeconds)} · {session.totalSets} séries
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.tabIconDefault}
        importantForAccessibility="no"
        accessibilityElementsHidden
      />
    </PressableA11y>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
  },
});
```

- [ ] **Step 2 : Réécrire progression.tsx**

Remplacer le contenu complet de `app/app/(tabs)/progression.tsx` :

```typescript
import { SectionList, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { useHistory } from '@/hooks/useHistory';
import { SessionCard } from '@/components/history/SessionCard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { SessionSummary } from '@/services/HistoryService';

export default function ProgressionScreen() {
  const { sections, isLoading, error, refresh } = useHistory();
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

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.text }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item: SessionSummary) => String(item.id)}
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() => router.push(`/history/${item.id}`)}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              Aucune séance enregistrée
            </Text>
          </View>
        }
        contentContainerStyle={sections.length === 0 ? styles.emptyContainer : undefined}
        stickySectionHeadersEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 60 },
  emptyContainer: { flex: 1 },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  message: { fontSize: 15, textAlign: 'center' },
});
```

- [ ] **Step 3 : Vérifier TypeScript**

```
npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 4 : Commit**

```bash
git add app/components/history/SessionCard.tsx app/app/(tabs)/progression.tsx
git commit -m "feat(screen): progression — historique séances groupé par mois"
```

---

## Task 5 : ExerciseHistorySection + écran détail + _layout.tsx

**Files:**
- Create: `app/components/history/ExerciseHistorySection.tsx`
- Create: `app/app/history/[sessionLogId].tsx`
- Modify: `app/app/_layout.tsx`

- [ ] **Step 1 : Créer ExerciseHistorySection**

Créer `app/components/history/ExerciseHistorySection.tsx` :

```typescript
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { ExerciseHistory } from '@/services/HistoryService';

interface ExerciseHistorySectionProps {
  exercise: ExerciseHistory;
}

export function ExerciseHistorySection({ exercise }: ExerciseHistorySectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.container}>
      <Text
        style={[styles.exerciseName, { color: colors.textSecondary }]}
        accessibilityRole="header"
      >
        {exercise.exerciseName}
      </Text>
      <View style={styles.chips}>
        {exercise.sets.map((set, i) => {
          const label = set.rpe != null
            ? `${set.weightDone} kg × ${set.repsDone} · RPE ${set.rpe}`
            : `${set.weightDone} kg × ${set.repsDone}`;
          return (
            <View
              key={i}
              style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
              accessibilityLabel={label}
            >
              <Text style={[styles.chipText, { color: colors.text }]}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  exerciseName: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 13,
  },
});
```

- [ ] **Step 2 : Créer l'écran détail history/[sessionLogId].tsx**

Créer `app/app/history/[sessionLogId].tsx` :

```typescript
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { HistoryService, SessionDetail } from '@/services/HistoryService';
import { ExerciseHistorySection } from '@/components/history/ExerciseHistorySection';
import { SQLiteSessionLogRepository } from '@/repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '@/repositories/SQLiteSetLogRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getDb } from '@/db';

const CHECKIN_ENERGY: Record<number, string> = { 1: '😴', 2: '😐', 3: '💪' };
const CHECKIN_FATIGUE: Record<number, string> = { 1: '💪', 2: '😐', 3: '😴' };
const CHECKIN_SLEEP: Record<number, string> = { 1: '😴', 2: '😐', 3: '🌙' };

function formatDuration(seconds: number): string {
  if (seconds === 0) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min${s > 0 ? ` ${s} s` : ''}` : `${s} s`;
}

function makeService(): HistoryService {
  const db = getDb();
  return new HistoryService(
    new SQLiteSessionLogRepository(db),
    new SQLiteSetLogRepository(db),
    new SQLiteWorkoutRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

export default function SessionDetailScreen() {
  const { sessionLogId } = useLocalSearchParams<{ sessionLogId: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    const service = makeService();
    service.getSessionDetail(Number(sessionLogId)).then(d => {
      if (!mountedRef.current) return;
      setDetail(d);
      setIsLoading(false);
    });
  }, [sessionLogId]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.text }]}>Séance introuvable</Text>
      </View>
    );
  }

  const allRpe = detail.exercises
    .flatMap(e => e.sets)
    .map(s => s.rpe)
    .filter((r): r is number => r !== null);
  const avgRpe = allRpe.length > 0
    ? (allRpe.reduce((a, b) => a + b, 0) / allRpe.length).toFixed(1)
    : null;

  const hasCheckin =
    detail.checkinEnergy !== null ||
    detail.checkinFatigue !== null ||
    detail.checkinSleep !== null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.statsRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatDuration(detail.durationSeconds)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Durée</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{detail.totalSets}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Séries</Text>
        </View>
        {avgRpe !== null && (
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>RPE {avgRpe}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Moy.</Text>
          </View>
        )}
      </View>

      {hasCheckin && (
        <View style={[styles.checkinRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
          {detail.checkinEnergy !== null && (
            <View style={styles.checkinItem}>
              <Text style={styles.checkinEmoji}>{CHECKIN_ENERGY[detail.checkinEnergy]}</Text>
              <Text style={[styles.checkinLabel, { color: colors.textSecondary }]}>Énergie</Text>
            </View>
          )}
          {detail.checkinFatigue !== null && (
            <View style={styles.checkinItem}>
              <Text style={styles.checkinEmoji}>{CHECKIN_FATIGUE[detail.checkinFatigue]}</Text>
              <Text style={[styles.checkinLabel, { color: colors.textSecondary }]}>Fatigue</Text>
            </View>
          )}
          {detail.checkinSleep !== null && (
            <View style={styles.checkinItem}>
              <Text style={styles.checkinEmoji}>{CHECKIN_SLEEP[detail.checkinSleep]}</Text>
              <Text style={[styles.checkinLabel, { color: colors.textSecondary }]}>Sommeil</Text>
            </View>
          )}
        </View>
      )}

      {detail.exercises.map(exercise => (
        <ExerciseHistorySection key={exercise.exerciseId} exercise={exercise} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  content: { paddingBottom: 32 },
  statsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
  },
  checkinRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  checkinItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  checkinEmoji: {
    fontSize: 20,
  },
  checkinLabel: {
    fontSize: 11,
  },
  message: { fontSize: 15, textAlign: 'center' },
});
```

- [ ] **Step 3 : Ajouter Stack.Screen dans _layout.tsx**

Dans `app/app/_layout.tsx`, ajouter AVANT la balise `</Stack>` fermante :

```tsx
        <Stack.Screen
          name="history/[sessionLogId]"
          options={{ title: 'Détail séance' }}
        />
```

- [ ] **Step 4 : Vérifier TypeScript**

```
npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 5 : Lancer la suite complète de tests**

```
npx jest --no-coverage
```

Attendu : tous les tests PASS (182 existants + 8 nouveaux HistoryService + 2 findAll + 3 countBySessionLogIds = ~195 tests).

- [ ] **Step 6 : Mettre à jour docs/tests-manuels-mvp.md**

Ajouter cette section avant `## Sessions futures` dans `docs/tests-manuels-mvp.md` :

```markdown
## 10. Historique des séances

### 10A — Liste

- [ ] Onglet Progression affiche les séances passées groupées par mois
- [ ] En-tête de section : "Mai 2026 · N séances"
- [ ] Chaque item : nom séance, date, durée, nb séries
- [ ] Séance sans ended_at → durée affiche "--"
- [ ] Liste vide (aucune séance) → message "Aucune séance enregistrée"
- [ ] Après complétion d'une séance depuis l'onglet Séance → retour sur Progression → nouvelle séance visible

### 10B — Détail

- [ ] Tap sur une séance → écran détail
- [ ] Header : durée, nb séries, RPE moy. (si au moins un RPE saisi)
- [ ] Pas de RPE saisi → colonne RPE absente du header
- [ ] Check-in : énergie / fatigue / sommeil avec emojis corrects
- [ ] Exercices listés avec sets : "80 kg × 8 · RPE 7"
- [ ] Sets sans RPE → pas de "· RPE" dans le chip
- [ ] Séance avec ~10 exercices → scroll fluide sans freeze
```

- [ ] **Step 7 : Commit final**

```bash
git add app/components/history/ExerciseHistorySection.tsx app/app/history/[sessionLogId].tsx app/app/_layout.tsx docs/tests-manuels-mvp.md
git commit -m "feat(screen): historique détail séance + ExerciseHistorySection"
```
