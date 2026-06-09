# Cycle Rotatif — Home Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la carte statique de l'accueil par une carte interactive avec chips — l'app suggère la prochaine séance PPL, l'utilisateur peut en choisir une autre en un tap.

**Architecture:** Nouvelle méthode repo `findLatestDatesPerWorkout` (une requête SQL GROUP BY), hook `useHomeWorkout` qui encapsule chargement + suggestion + sélection + dates, écran `(tabs)/index.tsx` reécrit pour consommer le hook. `SessionService.getNextWorkout` reste intact.

**Tech Stack:** React Native, expo-sqlite, expo-router, TypeScript strict, Jest + react-test-renderer

---

## File Map

| Action | Fichier |
|--------|---------|
| Modify | `app/repositories/ISessionLogRepository.ts` |
| Modify | `app/repositories/sessionLogRepository.contract.ts` |
| Modify | `app/repositories/InMemorySessionLogRepository.ts` |
| Modify | `app/repositories/SQLiteSessionLogRepository.ts` |
| Create | `app/hooks/useHomeWorkout.ts` |
| Create | `app/hooks/useHomeWorkout.test.ts` |
| Modify | `app/app/(tabs)/index.tsx` |

---

## Task 1: Repository — `findLatestDatesPerWorkout`

**Files:**
- Modify: `app/repositories/ISessionLogRepository.ts`
- Modify: `app/repositories/sessionLogRepository.contract.ts`
- Modify: `app/repositories/InMemorySessionLogRepository.ts`
- Modify: `app/repositories/SQLiteSessionLogRepository.ts`
- Test: `app/repositories/InMemorySessionLogRepository.test.ts` (already exists, runs contract)

- [ ] **Step 1: Add method signature to `ISessionLogRepository.ts`**

Replace the entire file content:

```ts
import type { SessionLog } from '../db/types';

export type CreateSessionLogDto = Omit<SessionLog, 'id' | 'ended_at'>;

export interface ISessionLogRepository {
  save(dto: CreateSessionLogDto): Promise<SessionLog>;
  findById(id: number): Promise<SessionLog | null>;
  findByWorkoutId(workoutId: number): Promise<SessionLog[]>;
  findLatestByWorkoutIds(workoutIds: number[]): Promise<SessionLog | null>;
  findLatestDatesPerWorkout(workoutIds: number[]): Promise<Map<number, string | null>>;
  complete(id: number, endedAt: string): Promise<void>;
  findAll(): Promise<SessionLog[]>;
}
```

- [ ] **Step 2: Add contract tests to `sessionLogRepository.contract.ts`**

Append this `describe` block **inside** `runSessionLogRepositoryContractTests`, after the existing `describe('findAll', ...)` block and before the closing `}` of `runSessionLogRepositoryContractTests`:

```ts
  describe('findLatestDatesPerWorkout', () => {
    it('retourne null pour chaque workout sans sessions', async () => {
      const map = await repo.findLatestDatesPerWorkout([1, 2]);
      expect(map.get(1)).toBeNull();
      expect(map.get(2)).toBeNull();
    });

    it('retourne la date started_at la plus récente par workout', async () => {
      await repo.save({ ...dto1, workout_id: 1, started_at: '2026-01-01T10:00:00.000Z' });
      await repo.save({ ...dto1, workout_id: 1, started_at: '2026-01-10T10:00:00.000Z' });
      await repo.save({ ...dto1, workout_id: 2, started_at: '2026-01-05T10:00:00.000Z' });
      const map = await repo.findLatestDatesPerWorkout([1, 2]);
      expect(map.get(1)).toBe('2026-01-10T10:00:00.000Z');
      expect(map.get(2)).toBe('2026-01-05T10:00:00.000Z');
    });

    it('retourne une Map vide si workoutIds est vide', async () => {
      await repo.save(dto1);
      const map = await repo.findLatestDatesPerWorkout([]);
      expect(map.size).toBe(0);
    });

    it('met null pour un workout sans sessions parmi des workouts avec sessions', async () => {
      await repo.save({ ...dto1, workout_id: 1, started_at: '2026-01-01T10:00:00.000Z' });
      const map = await repo.findLatestDatesPerWorkout([1, 2]);
      expect(map.get(1)).toBe('2026-01-01T10:00:00.000Z');
      expect(map.get(2)).toBeNull();
    });
  });
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
cd app && npm test -- --testPathPattern="InMemorySessionLogRepository" --no-coverage
```

Expected: FAIL — `TypeError: repo.findLatestDatesPerWorkout is not a function`

- [ ] **Step 4: Implement `findLatestDatesPerWorkout` in `InMemorySessionLogRepository.ts`**

Add this method after `findLatestByWorkoutIds` (line 28):

```ts
  async findLatestDatesPerWorkout(workoutIds: number[]): Promise<Map<number, string | null>> {
    const result = new Map<number, string | null>();
    for (const id of workoutIds) {
      const logs = this.items
        .filter(l => l.workout_id === id)
        .sort((a, b) => b.started_at.localeCompare(a.started_at));
      result.set(id, logs[0]?.started_at ?? null);
    }
    return result;
  }
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm test -- --testPathPattern="InMemorySessionLogRepository" --no-coverage
```

Expected: PASS — 4 new tests green

- [ ] **Step 6: Implement `findLatestDatesPerWorkout` in `SQLiteSessionLogRepository.ts`**

Add this method after `findLatestByWorkoutIds` (after line 36):

```ts
  async findLatestDatesPerWorkout(workoutIds: number[]): Promise<Map<number, string | null>> {
    const result = new Map<number, string | null>();
    for (const id of workoutIds) result.set(id, null);
    if (workoutIds.length === 0) return result;
    const placeholders = workoutIds.map(() => '?').join(',');
    const rows = await this.db.getAllAsync<{ workout_id: number; last_started: string }>(
      `SELECT workout_id, MAX(started_at) AS last_started FROM session_logs WHERE workout_id IN (${placeholders}) GROUP BY workout_id`,
      workoutIds
    );
    for (const row of rows) result.set(row.workout_id, row.last_started);
    return result;
  }
```

- [ ] **Step 7: Run full test suite — all green**

```bash
npm test -- --no-coverage
```

Expected: all existing tests PASS + 4 new `findLatestDatesPerWorkout` tests PASS

- [ ] **Step 8: Typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 9: Commit**

```bash
cd app && git add repositories/ISessionLogRepository.ts repositories/sessionLogRepository.contract.ts repositories/InMemorySessionLogRepository.ts repositories/SQLiteSessionLogRepository.ts && git commit -m "feat(repo): findLatestDatesPerWorkout — MAX(started_at) GROUP BY workout_id"
```

---

## Task 2: Hook — `useHomeWorkout`

**Files:**
- Create: `app/hooks/useHomeWorkout.ts`
- Create: `app/hooks/useHomeWorkout.test.ts`

### Background

`useHomeWorkout` encapsule toute la logique de l'accueil :
- Charge le programme actif + workouts + suggestion cycle + dates dernière séance
- Expose `selectWorkout(w)` pour override local (sans persistance)
- `isSuggestion = selectedWorkout?.id === suggestedWorkout?.id`
- `useEffect` pour le chargement initial ; l'écran gère `useFocusEffect` pour le rechargement au focus

Le hook crée ses dépendances en interne. Les tests les mockent via `jest.mock`.

- [ ] **Step 1: Create `app/hooks/useHomeWorkout.test.ts`**

```ts
import { act, create } from 'react-test-renderer';
import React from 'react';
import { useHomeWorkout } from './useHomeWorkout';
import { SessionService } from '../services/SessionService';
import { SQLiteProgramRepository } from '../repositories/SQLiteProgramRepository';
import { SQLiteWorkoutRepository } from '../repositories/SQLiteWorkoutRepository';
import { SQLiteSessionLogRepository } from '../repositories/SQLiteSessionLogRepository';
import type { Workout } from '../db/types';

jest.mock('../services/SessionService');
jest.mock('../repositories/SQLiteProgramRepository');
jest.mock('../repositories/SQLiteWorkoutRepository');
jest.mock('../repositories/SQLiteSessionLogRepository');
jest.mock('../repositories/SQLiteSetLogRepository');
jest.mock('../repositories/SQLitePersonalRecordRepository');
jest.mock('../repositories/SQLiteWorkoutExerciseRepository');
jest.mock('../repositories/SQLiteBlockRepository');
jest.mock('../repositories/SQLiteSetRepository');
jest.mock('../repositories/SQLiteExerciseRepository');
jest.mock('../db');

const MockSessionService = SessionService as jest.MockedClass<typeof SessionService>;
const MockProgramRepo = SQLiteProgramRepository as jest.MockedClass<typeof SQLiteProgramRepository>;
const MockWorkoutRepo = SQLiteWorkoutRepository as jest.MockedClass<typeof SQLiteWorkoutRepository>;
const MockSessionLogRepo = SQLiteSessionLogRepository as jest.MockedClass<typeof SQLiteSessionLogRepository>;

const workout1: Workout = { id: 1, program_id: 1, name: 'Push', order_index: 0 };
const workout2: Workout = { id: 2, program_id: 1, name: 'Pull', order_index: 1 };
const workout3: Workout = { id: 3, program_id: 1, name: 'Legs', order_index: 2 };

function setupMocks({
  activeProgram = true,
  workouts = [workout1, workout2, workout3],
  suggested = workout1,
  dates = new Map<number, string | null>(),
}: {
  activeProgram?: boolean;
  workouts?: Workout[];
  suggested?: Workout | null;
  dates?: Map<number, string | null>;
} = {}) {
  MockProgramRepo.mockImplementation(() => ({
    findAll: jest.fn().mockResolvedValue(
      activeProgram ? [{ id: 1, name: 'PPL', is_active: 1 }] : []
    ),
  } as unknown as SQLiteProgramRepository));

  MockWorkoutRepo.mockImplementation(() => ({
    findByProgramId: jest.fn().mockResolvedValue(workouts),
  } as unknown as SQLiteWorkoutRepository));

  MockSessionService.mockImplementation(() => ({
    getNextWorkout: jest.fn().mockResolvedValue(suggested),
  } as unknown as SessionService));

  MockSessionLogRepo.mockImplementation(() => ({
    findLatestDatesPerWorkout: jest.fn().mockResolvedValue(dates),
  } as unknown as SQLiteSessionLogRepository));
}

async function renderHook() {
  let result!: ReturnType<typeof useHomeWorkout>;
  function TestComponent() {
    result = useHomeWorkout();
    return null;
  }
  await act(async () => {
    create(React.createElement(TestComponent));
  });
  return { getResult: () => result };
}

describe('useHomeWorkout', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('loading est true au premier render puis false', async () => {
    let resolvePrograms!: (v: unknown[]) => void;
    MockProgramRepo.mockImplementation(() => ({
      findAll: jest.fn().mockReturnValue(new Promise(res => { resolvePrograms = res; })),
    } as unknown as SQLiteProgramRepository));
    MockWorkoutRepo.mockImplementation(() => ({ findByProgramId: jest.fn() } as unknown as SQLiteWorkoutRepository));
    MockSessionService.mockImplementation(() => ({ getNextWorkout: jest.fn() } as unknown as SessionService));
    MockSessionLogRepo.mockImplementation(() => ({ findLatestDatesPerWorkout: jest.fn() } as unknown as SQLiteSessionLogRepository));

    let capturedLoading!: boolean;
    function TestComponent() {
      const state = useHomeWorkout();
      if (!capturedLoading) capturedLoading = state.loading;
      return null;
    }
    act(() => { create(React.createElement(TestComponent)); });
    expect(capturedLoading).toBe(true);
    await act(async () => { resolvePrograms([]); });
  });

  it('hasActiveProgram est false si aucun programme actif', async () => {
    setupMocks({ activeProgram: false });
    const { getResult } = await renderHook();
    expect(getResult().hasActiveProgram).toBe(false);
    expect(getResult().workouts).toHaveLength(0);
    expect(getResult().suggestedWorkout).toBeNull();
  });

  it('retourne les workouts triés et la suggestion du cycle', async () => {
    setupMocks({ workouts: [workout2, workout1, workout3], suggested: workout2 });
    const { getResult } = await renderHook();
    expect(getResult().hasActiveProgram).toBe(true);
    expect(getResult().workouts).toHaveLength(3);
    expect(getResult().workouts[0].order_index).toBeLessThanOrEqual(getResult().workouts[1].order_index);
    expect(getResult().suggestedWorkout?.id).toBe(workout2.id);
    expect(getResult().selectedWorkout?.id).toBe(workout2.id);
    expect(getResult().isSuggestion).toBe(true);
  });

  it('selectWorkout change selectedWorkout et isSuggestion', async () => {
    setupMocks({ suggested: workout1 });
    let result!: ReturnType<typeof useHomeWorkout>;
    function TestComponent() { result = useHomeWorkout(); return null; }
    await act(async () => { create(React.createElement(TestComponent)); });
    expect(result.isSuggestion).toBe(true);

    act(() => { result.selectWorkout(workout2); });
    expect(result.selectedWorkout?.id).toBe(workout2.id);
    expect(result.isSuggestion).toBe(false);
  });

  it('expose les lastDates retournées par le repo', async () => {
    const dates = new Map([[1, '2026-01-10T10:00:00.000Z'], [2, null], [3, '2026-01-08T10:00:00.000Z']]);
    setupMocks({ dates });
    const { getResult } = await renderHook();
    expect(getResult().lastDates.get(1)).toBe('2026-01-10T10:00:00.000Z');
    expect(getResult().lastDates.get(2)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- --testPathPattern="useHomeWorkout" --no-coverage
```

Expected: FAIL — `Cannot find module './useHomeWorkout'`

- [ ] **Step 3: Create `app/hooks/useHomeWorkout.ts`**

```ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { SessionService } from '../services/SessionService';
import { SQLiteSessionLogRepository } from '../repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '../repositories/SQLiteSetLogRepository';
import { SQLitePersonalRecordRepository } from '../repositories/SQLitePersonalRecordRepository';
import { SQLiteWorkoutRepository } from '../repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '../repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '../repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '../repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { SQLiteProgramRepository } from '../repositories/SQLiteProgramRepository';
import { getDb } from '../db';
import type { Workout } from '../db/types';

export interface HomeWorkoutState {
  workouts: Workout[];
  suggestedWorkout: Workout | null;
  selectedWorkout: Workout | null;
  lastDates: Map<number, string | null>;
  isSuggestion: boolean;
  loading: boolean;
  hasActiveProgram: boolean;
  error: string | null;
  selectWorkout: (w: Workout) => void;
  refresh: () => Promise<void>;
}

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

export function useHomeWorkout(): HomeWorkoutState {
  const serviceRef = useRef<SessionService | null>(null);
  if (!serviceRef.current) serviceRef.current = makeSessionService();

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [suggestedWorkout, setSuggestedWorkout] = useState<Workout | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [lastDates, setLastDates] = useState<Map<number, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [hasActiveProgram, setHasActiveProgram] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const db = getDb();
      const programRepo = new SQLiteProgramRepository(db);
      const programs = await programRepo.findAll();
      const active = programs.find(p => p.is_active === 1);
      if (!active) {
        setHasActiveProgram(false);
        setWorkouts([]);
        setSuggestedWorkout(null);
        setSelectedWorkout(null);
        setLastDates(new Map());
        return;
      }
      setHasActiveProgram(true);

      const workoutRepo = new SQLiteWorkoutRepository(db);
      const allWorkouts = (await workoutRepo.findByProgramId(active.id))
        .sort((a, b) => a.order_index - b.order_index);
      setWorkouts(allWorkouts);

      const suggested = await serviceRef.current!.getNextWorkout(active.id);
      setSuggestedWorkout(suggested);
      setSelectedWorkout(suggested);

      const sessionLogRepo = new SQLiteSessionLogRepository(db);
      const dates = await sessionLogRepo.findLatestDatesPerWorkout(allWorkouts.map(w => w.id));
      setLastDates(dates);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement séance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const selectWorkout = useCallback((w: Workout) => {
    setSelectedWorkout(w);
  }, []);

  const isSuggestion = selectedWorkout?.id === suggestedWorkout?.id;

  return {
    workouts,
    suggestedWorkout,
    selectedWorkout,
    lastDates,
    isSuggestion,
    loading,
    hasActiveProgram,
    error,
    selectWorkout,
    refresh,
  };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- --testPathPattern="useHomeWorkout" --no-coverage
```

Expected: PASS — 5 tests green

- [ ] **Step 5: Run full suite**

```bash
npm test -- --no-coverage
```

Expected: all tests PASS

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add hooks/useHomeWorkout.ts hooks/useHomeWorkout.test.ts && git commit -m "feat(hook): useHomeWorkout — workouts + suggestion + dates + selectWorkout"
```

---

## Task 3: UI — Rewrite `(tabs)/index.tsx`

**Files:**
- Modify: `app/app/(tabs)/index.tsx`

No unit tests — UI verification via typecheck + manual test.

### Background

L'écran consomme `useHomeWorkout` et affiche :
- Carte avec label "PROCHAINE SÉANCE" / "SÉANCE CHOISIE"
- Nom de la séance sélectionnée + date relative
- Chips scrollables (une par workout) avec styles distincts : sélectionnée (filled), suggérée non sélectionnée (bordure + opacity 0.7), neutre
- Bouton "Démarrer [nom]"
- États inchangés : aucun programme actif, aucune séance configurée

`formatRelativeDate` : helper local, pas exporté.

`useFocusEffect` est dans l'écran (pas dans le hook) — cohérent avec le pattern de tous les autres onglets.

- [ ] **Step 1: Remplacer entièrement `app/app/(tabs)/index.tsx`**

```tsx
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useHomeWorkout } from '@/hooks/useHomeWorkout';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import type { Workout } from '@/db/types';

function formatRelativeDate(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Jamais faite';
  const diffDays = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return `il y a ${diffDays} jours`;
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const {
    workouts, suggestedWorkout, selectedWorkout, lastDates,
    isSuggestion, loading, hasActiveProgram, selectWorkout, refresh,
  } = useHomeWorkout();

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

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
      ) : workouts.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Aucune séance configurée</Text>
          <PressableA11y
            accessibilityLabel="Aller aux programmes"
            onPress={() => router.push('/(tabs)/programmes')}
            style={styles.linkBtn}
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>Configurer une séance →</Text>
          </PressableA11y>
        </View>
      ) : selectedWorkout ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            {isSuggestion ? 'PROCHAINE SÉANCE' : 'SÉANCE CHOISIE'}
          </Text>
          <Text style={[styles.workoutName, { color: colors.text }]}>{selectedWorkout.name}</Text>
          <Text style={[styles.lastDate, { color: colors.textSecondary }]}>
            {formatRelativeDate(lastDates.get(selectedWorkout.id))}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsRow}
          >
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Séances du programme"
              style={styles.chipsInner}
            >
              {workouts.map((w: Workout) => {
                const isSelected = w.id === selectedWorkout.id;
                const isSug = w.id === suggestedWorkout?.id;
                return (
                  <PressableA11y
                    key={w.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${w.name}${isSug && !isSelected ? ' — suggéré par le cycle' : ''}`}
                    onPress={() => selectWorkout(w)}
                    style={[
                      styles.chip,
                      { borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                      !isSelected && isSug && { borderColor: colors.primary, opacity: 0.7 },
                    ]}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: colors.textSecondary },
                      isSelected && styles.chipTextSelected,
                    ]}>
                      {w.name}
                    </Text>
                  </PressableA11y>
                );
              })}
            </View>
          </ScrollView>

          <PressableA11y
            accessibilityLabel={`Démarrer ${selectedWorkout.name}`}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onPress={() => router.push({ pathname: '/session/[workoutId]' as any, params: { workoutId: String(selectedWorkout.id) } })}
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.startBtnText}>Démarrer</Text>
          </PressableA11y>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 24 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: Radius.sm, padding: 20, gap: 10 },
  cardLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  workoutName: { fontSize: 20, fontWeight: '700' },
  lastDate: { fontSize: 12 },
  chipsScroll: { marginHorizontal: -4 },
  chipsRow: { paddingHorizontal: 4 },
  chipsInner: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  chipTextSelected: { color: '#fff', fontWeight: '700' },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: Radius.sm,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkBtn: { paddingVertical: 4 },
  linkText: { fontSize: 15, fontWeight: '500' },
});
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 3: Run full test suite**

```bash
npm test -- --no-coverage
```

Expected: all tests PASS (no regression)

- [ ] **Step 4: Commit**

```bash
git add app/\(tabs\)/index.tsx && git commit -m "feat(home): cycle rotatif — chips séances + date dernière fois + accessibilité"
```

- [ ] **Step 5: Push**

```bash
git push
```
