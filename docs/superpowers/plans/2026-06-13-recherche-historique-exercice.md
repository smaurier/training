# Recherche historique exercice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de consulter l'historique d'un exercice (dernière séance + historique récent) depuis le tab Stats, via une recherche par nom ou un tap sur Exercise1RMCard.

**Architecture:** `ExerciseHistoryService` (TDD isolé) orchestre `ISetLogRepository.findByExerciseId` + `IExerciseRepository`. Deux hooks fins (`useExerciseHistory`, `useLoggedExercises`) wrappent le service. Deux nouveaux écrans Expo Router : `progression/search.tsx` (recherche) et `progression/[exerciseId].tsx` (détail). La route `progression/[exerciseId]` est déjà enregistrée dans `_layout.tsx` ligne 100 — le fichier manque seulement.

**Tech Stack:** React Native, Expo SDK 54, TypeScript strict, expo-sqlite, Jest, Expo Router

---

## Fichiers

| Fichier | Action |
|---|---|
| `app/services/ExerciseHistoryService.ts` | Créer — types + 2 méthodes |
| `app/services/ExerciseHistoryService.test.ts` | Créer — TDD 10 tests |
| `app/hooks/useExerciseHistory.ts` | Créer |
| `app/hooks/useLoggedExercises.ts` | Créer |
| `app/app/progression/search.tsx` | Créer |
| `app/app/progression/[exerciseId].tsx` | Créer |
| `app/app/_layout.tsx` | Modifier — ajouter `progression/search` dans Stack |
| `app/app/(tabs)/progression.tsx` | Modifier — ajouter pressable "Rechercher un exercice" |

---

### Task 1 : `ExerciseHistoryService` (TDD)

**Files:**
- Create: `app/services/ExerciseHistoryService.ts`
- Create: `app/services/ExerciseHistoryService.test.ts`

**Contexte :**
- `InMemorySetLogRepository.findByExerciseId(id)` retourne les set_logs triés ASC par `completed_at`
- `InMemoryExerciseRepository.save(dto)` retourne un `Exercise` avec `.id`
- `CreateExerciseDto` = `Omit<Exercise, 'id' | 'created_at'>` — champs requis : `name, type, muscle_groups, technical_notes, description, is_custom, progression_step, progression_threshold`

- [ ] **Step 1 : Écrire les tests (RED)**

Créer `app/services/ExerciseHistoryService.test.ts` :

```typescript
import { ExerciseHistoryService } from './ExerciseHistoryService';
import { InMemorySetLogRepository } from '../repositories/InMemorySetLogRepository';
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
  const setLogRepo = new InMemorySetLogRepository();
  const exerciseRepo = new InMemoryExerciseRepository();
  return { service: new ExerciseHistoryService(setLogRepo, exerciseRepo), setLogRepo, exerciseRepo };
}

describe('ExerciseHistoryService.getHistory', () => {
  it('retourne lastSession null si aucun set_log', async () => {
    const { service, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    const result = await service.getHistory(ex.id);
    expect(result.lastSession).toBeNull();
    expect(result.recentSessions).toEqual([]);
  });

  it('groupe les sets par session_log_id', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    await setLogRepo.save({ session_log_id: 1, set_id: 2, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:05:00.000Z' });
    const result = await service.getHistory(ex.id);
    expect(result.recentSessions).toHaveLength(1);
    expect(result.recentSessions[0].sets).toHaveLength(2);
  });

  it('retourne sessions triées DESC — plus récente en premier', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    await setLogRepo.save({ session_log_id: 2, set_id: 2, exercise_id: ex.id, reps_done: 5, weight_done: 82.5, rpe: null, completed_at: '2026-06-08T10:00:00.000Z' });
    const result = await service.getHistory(ex.id);
    expect(result.lastSession?.sessionLogId).toBe(2);
    expect(result.recentSessions[0].sessionLogId).toBe(2);
    expect(result.recentSessions[1].sessionLogId).toBe(1);
  });

  it('lastSession = recentSessions[0]', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    const result = await service.getHistory(ex.id);
    expect(result.lastSession).toEqual(result.recentSessions[0]);
  });

  it('bestSet = set avec poids le plus élevé', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    await setLogRepo.save({ session_log_id: 1, set_id: 2, exercise_id: ex.id, reps_done: 3, weight_done: 85, rpe: null, completed_at: '2026-06-01T10:05:00.000Z' });
    const result = await service.getHistory(ex.id);
    expect(result.lastSession?.bestSet).toEqual({ reps: 3, weight: 85 });
  });

  it('bestSet = reps max si tous les sets sont weight=0 (bodyweight)', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 8, weight_done: 0, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    await setLogRepo.save({ session_log_id: 1, set_id: 2, exercise_id: ex.id, reps_done: 12, weight_done: 0, rpe: null, completed_at: '2026-06-01T10:05:00.000Z' });
    const result = await service.getHistory(ex.id);
    expect(result.lastSession?.bestSet).toEqual({ reps: 12, weight: 0 });
  });

  it('respecte la limite — limit=2 retourne max 2 sessions', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    for (let i = 1; i <= 3; i++) {
      await setLogRepo.save({ session_log_id: i, set_id: i, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: `2026-06-0${i}T10:00:00.000Z` });
    }
    const result = await service.getHistory(ex.id, 2);
    expect(result.recentSessions).toHaveLength(2);
  });
});

describe('ExerciseHistoryService.getLoggedExercises', () => {
  it('retourne [] si aucun set_log', async () => {
    const { service } = makeService();
    expect(await service.getLoggedExercises()).toEqual([]);
  });

  it('retourne uniquement les exercices loggés, triés alphabétiquement', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const squat = await exerciseRepo.save({ ...baseExerciseDto, name: 'Squat' });
    const bench = await exerciseRepo.save({ ...baseExerciseDto, name: 'Développé couché' });
    await exerciseRepo.save({ ...baseExerciseDto, name: 'Curl biceps' }); // jamais loggé
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: squat.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    await setLogRepo.save({ session_log_id: 1, set_id: 2, exercise_id: bench.id, reps_done: 8, weight_done: 60, rpe: null, completed_at: '2026-06-01T10:05:00.000Z' });
    const result = await service.getLoggedExercises();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Développé couché');
    expect(result[1].name).toBe('Squat');
  });

  it('déduplique — même exercice loggé plusieurs fois apparaît une seule fois', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-01T10:00:00.000Z' });
    await setLogRepo.save({ session_log_id: 2, set_id: 2, exercise_id: ex.id, reps_done: 5, weight_done: 80, rpe: null, completed_at: '2026-06-08T10:00:00.000Z' });
    const result = await service.getLoggedExercises();
    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="ExerciseHistoryService.test" --no-coverage 2>&1 | tail -5
```
Attendu : FAIL — `Cannot find module './ExerciseHistoryService'`

- [ ] **Step 3 : Créer `app/services/ExerciseHistoryService.ts`**

```typescript
import type { ISetLogRepository } from '../repositories/ISetLogRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';
import type { Exercise } from '../db/types';

export interface ExerciseSetRecord {
  reps: number;
  weight: number;
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

export class ExerciseHistoryService {
  constructor(
    private setLogRepo: ISetLogRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async getHistory(exerciseId: number, limit = 10): Promise<ExerciseHistory> {
    const exercise = await this.exerciseRepo.findById(exerciseId);
    if (!exercise) throw new Error(`Exercise ${exerciseId} not found`);

    const setLogs = await this.setLogRepo.findByExerciseId(exerciseId);

    const groupMap = new Map<number, { date: string; sets: ExerciseSetRecord[] }>();
    for (const log of setLogs) {
      const record: ExerciseSetRecord = { reps: log.reps_done, weight: log.weight_done };
      const existing = groupMap.get(log.session_log_id);
      if (!existing) {
        groupMap.set(log.session_log_id, { date: log.completed_at, sets: [record] });
      } else {
        existing.sets.push(record);
      }
    }

    const sessions: ExerciseSession[] = [...groupMap.entries()].map(([id, { date, sets }]) => {
      const allBodyweight = sets.every(s => s.weight === 0);
      const bestSet = allBodyweight
        ? sets.reduce((b, s) => s.reps > b.reps ? s : b, sets[0])
        : sets.reduce((b, s) => s.weight > b.weight ? s : b, sets[0]);
      return { sessionLogId: id, date, sets, bestSet };
    }).sort((a, b) => b.date.localeCompare(a.date));

    return {
      exercise,
      lastSession: sessions[0] ?? null,
      recentSessions: sessions.slice(0, limit),
    };
  }

  async getLoggedExercises(): Promise<Exercise[]> {
    const loggedIds = new Set(await this.setLogRepo.findDistinctExerciseIds());
    const all = await this.exerciseRepo.findAll();
    return all
      .filter(e => loggedIds.has(e.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="ExerciseHistoryService.test" --no-coverage 2>&1 | tail -5
```
Attendu : PASS — 10 tests

- [ ] **Step 5 : TypeScript check + suite complète**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
cd /c/Users/sylva/projects/training-app/app && npx jest --no-coverage 2>&1 | tail -5
```
Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/services/ExerciseHistoryService.ts app/services/ExerciseHistoryService.test.ts && git commit -m "feat(history): ExerciseHistoryService — getHistory, getLoggedExercises (TDD)"
```

---

### Task 2 : Hooks — `useExerciseHistory` + `useLoggedExercises`

**Files:**
- Create: `app/hooks/useExerciseHistory.ts`
- Create: `app/hooks/useLoggedExercises.ts`

**Contexte :** Pattern identique à `useProgression` — `useRef` pour stabiliser le service, `mountedRef` pour éviter les setState après unmount, `useCallback` + `useEffect` pour le fetch initial.

- [ ] **Step 1 : Créer `app/hooks/useExerciseHistory.ts`**

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { ExerciseHistoryService } from '../services/ExerciseHistoryService';
import type { ExerciseHistory } from '../services/ExerciseHistoryService';
import { SQLiteSetLogRepository } from '../repositories/SQLiteSetLogRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { getDb } from '../db';

function makeService(): ExerciseHistoryService {
  const db = getDb();
  return new ExerciseHistoryService(
    new SQLiteSetLogRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

export function useExerciseHistory(exerciseId: number) {
  const serviceRef = useRef<ExerciseHistoryService | null>(null);
  if (serviceRef.current == null) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [history, setHistory] = useState<ExerciseHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await service.getHistory(exerciseId);
      if (mountedRef.current) setHistory(result);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [service, exerciseId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { history, isLoading, error, refresh };
}
```

- [ ] **Step 2 : Créer `app/hooks/useLoggedExercises.ts`**

```typescript
import { useState, useEffect, useRef } from 'react';
import { ExerciseHistoryService } from '../services/ExerciseHistoryService';
import { SQLiteSetLogRepository } from '../repositories/SQLiteSetLogRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { getDb } from '../db';
import type { Exercise } from '../db/types';

function makeService(): ExerciseHistoryService {
  const db = getDb();
  return new ExerciseHistoryService(
    new SQLiteSetLogRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

export function useLoggedExercises() {
  const serviceRef = useRef<ExerciseHistoryService | null>(null);
  if (serviceRef.current == null) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    service.getLoggedExercises()
      .then(result => { if (mountedRef.current) setExercises(result); })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setIsLoading(false); });
  }, [service]);

  return { exercises, isLoading };
}
```

- [ ] **Step 3 : TypeScript check**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
```
Attendu : 0 erreurs.

- [ ] **Step 4 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/hooks/useExerciseHistory.ts app/hooks/useLoggedExercises.ts && git commit -m "feat(history): useExerciseHistory + useLoggedExercises hooks"
```

---

### Task 3 : Écrans + _layout + progression.tsx

**Files:**
- Create: `app/app/progression/search.tsx`
- Create: `app/app/progression/[exerciseId].tsx`
- Modify: `app/app/_layout.tsx`
- Modify: `app/app/(tabs)/progression.tsx`

**Contexte :**
- `app/app/_layout.tsx` ligne 100 enregistre déjà `progression/[exerciseId]` dans le Stack — le fichier manque seulement. Il faut ajouter `progression/search` sur la ligne d'après.
- `progression.tsx` : le pressable "Rechercher" est à insérer dans le ScrollView Stats, après `<MuscleGroupCard>`, avant `{recentPRs.length > 0 && ...}`.
- `useLocalSearchParams<{ exerciseId: string; exerciseName?: string }>()` retourne des strings — convertir `exerciseId` avec `Number()`.
- `useUnits()` : `const { convert, label: unitLabel } = useUnits()` — `convert(kg)` retourne une string.
- Les couleurs disponibles : `colors.text`, `colors.textSecondary`, `colors.surface`, `colors.background`, `colors.border`, `colors.primary`.

- [ ] **Step 1 : Mettre à jour `app/app/_layout.tsx`**

Ajouter après la ligne `<Stack.Screen name="progression/[exerciseId]" options={{ title: 'Progression' }} />` :

```tsx
<Stack.Screen name="progression/search" options={{ title: 'Rechercher un exercice' }} />
```

- [ ] **Step 2 : Créer `app/app/progression/search.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, TextInput, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useLoggedExercises } from '@/hooks/useLoggedExercises';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import type { Exercise } from '@/db/types';

export default function ExerciseSearchScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { exercises, isLoading } = useLoggedExercises();
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
    : exercises;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TextInput
        style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
        placeholder="Rechercher un exercice…"
        placeholderTextColor={colors.textSecondary}
        value={query}
        onChangeText={setQuery}
        autoFocus
        clearButtonMode="while-editing"
        accessibilityLabel="Rechercher un exercice"
      />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {exercises.length === 0 ? 'Aucun exercice loggé' : 'Aucun résultat'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: Exercise) => String(item.id)}
          renderItem={({ item }) => (
            <PressableA11y
              accessibilityLabel={item.name}
              onPress={() => router.push({
                pathname: '/progression/[exerciseId]' as any,
                params: { exerciseId: String(item.id), exerciseName: item.name },
              })}
              style={[styles.row, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
            </PressableA11y>
          )}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchInput: { margin: 16, borderRadius: Radius.sm, padding: 12, fontSize: 15, borderWidth: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 14 },
  row: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  name: { fontSize: 15, fontWeight: '500' },
});
```

- [ ] **Step 3 : Créer `app/app/progression/[exerciseId].tsx`**

```tsx
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useExerciseHistory } from '@/hooks/useExerciseHistory';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { useUnits } from '@/hooks/useUnits';
import type { ExerciseSession } from '@/services/ExerciseHistoryService';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function ExerciseHistoryScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const { history, isLoading, error } = useExerciseHistory(Number(exerciseId));
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { convert, label: unitLabel } = useUnits();

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !history) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {error ?? 'Exercice introuvable'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      {history.lastSession ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            DERNIÈRE SÉANCE — {formatDate(history.lastSession.date)}
          </Text>
          {history.lastSession.sets.map((s, i) => (
            <Text key={i} style={[styles.setRow, { color: colors.text }]}>
              · {s.weight > 0 ? `${convert(s.weight)} ${unitLabel}` : 'Poids de corps'} × {s.reps} reps
            </Text>
          ))}
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Aucune séance enregistrée
          </Text>
        </View>
      )}

      {history.recentSessions.length > 1 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>HISTORIQUE</Text>
          {history.recentSessions.map((session: ExerciseSession, i) => (
            <View
              key={session.sessionLogId}
              style={[
                styles.historyRow,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              ]}
            >
              <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                {formatDateShort(session.date)}
              </Text>
              <Text style={[styles.historyBest, { color: colors.text }]}>
                {session.bestSet.weight > 0
                  ? `${convert(session.bestSet.weight)} ${unitLabel} × ${session.bestSet.reps}`
                  : `${session.bestSet.reps} reps`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: Radius.sm, padding: 14, gap: 8 },
  cardLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  setRow: { fontSize: 14 },
  message: { fontSize: 14, textAlign: 'center' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  historyDate: { fontSize: 13 },
  historyBest: { fontSize: 14, fontWeight: '600' },
});
```

- [ ] **Step 4 : Mettre à jour `app/app/(tabs)/progression.tsx`**

Ajouter le pressable "Rechercher un exercice" après `<MuscleGroupCard data={volumeByMuscleGroup} />`, avant `{recentPRs.length > 0 && (` :

```tsx
        <PressableA11y
          accessibilityLabel="Rechercher un exercice"
          onPress={() => router.push('/progression/search' as any)}
          style={[styles.searchEntry, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.searchEntryText, { color: colors.textSecondary }]}>Rechercher un exercice</Text>
          <Text style={[styles.searchEntryChevron, { color: colors.textSecondary }]}>›</Text>
        </PressableA11y>
```

Ajouter les styles dans `StyleSheet.create({...})` :

```tsx
  searchEntry: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 12 },
  searchEntryText: { fontSize: 14 },
  searchEntryChevron: { fontSize: 18 },
```

- [ ] **Step 5 : TypeScript check + tests complets + ESLint**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
cd /c/Users/sylva/projects/training-app/app && npx jest --no-coverage 2>&1 | tail -5
cd /c/Users/sylva/projects/training-app/app && npx eslint . --ext .ts,.tsx --max-warnings 0 2>&1 | grep " error \| warning " || echo "OK"
```
Attendu : 0 erreurs TS, tous les tests passent, 0 warnings ESLint.

- [ ] **Step 6 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add "app/app/progression/search.tsx" "app/app/progression/[exerciseId].tsx" "app/app/_layout.tsx" "app/app/(tabs)/progression.tsx" && git commit -m "feat(history): écrans recherche + historique exercice"
```

---

## Self-Review

**Spec coverage :**
- ✅ `ExerciseHistoryService.getHistory` — T1
- ✅ `ExerciseHistoryService.getLoggedExercises` — T1
- ✅ Groupement par `session_log_id` — T1
- ✅ `bestSet = max weight` / `max reps si bodyweight` — T1
- ✅ Sessions triées DESC — T1
- ✅ `limit = 10` par défaut — T1
- ✅ `useExerciseHistory` + `useLoggedExercises` — T2
- ✅ Écran search avec autoFocus + filtre client-side — T3
- ✅ Empty state — T3
- ✅ Écran détail : card DERNIÈRE SÉANCE + HISTORIQUE — T3
- ✅ `useUnits` pour affichage — T3
- ✅ Bodyweight display ("Poids de corps" si weight=0) — T3
- ✅ Entry point "Rechercher" dans Stats tab — T3
- ✅ `progression/search` ajouté au Stack — T3
- ✅ `progression/[exerciseId]` déjà dans `_layout.tsx` — rien à faire
- ✅ `Exercise1RMCard.onPress` déjà câblé vers `/progression/[exerciseId]` — rien à modifier

**Placeholders :** aucun.

**Type consistency :** `ExerciseSetRecord`, `ExerciseSession`, `ExerciseHistory` définis en T1, utilisés en T2 (return type) et T3 (import).
