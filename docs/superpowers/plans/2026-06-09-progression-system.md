# Progression System + Critical Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix data loss on restart (seeds idempotency), fix timer/input bugs, add starting-weight flow, and replace the linear progression algorithm with double-progression + auto-deload.

**Architecture:** Pure functions in `progression.ts` (testable in isolation) drive SessionService logic. Seeds use upsert-by-name instead of DELETE+INSERT to preserve set weights across restarts. A new `ExerciseStartingWeightPhase` component intercepts the session before the first Travail set of any exercise with no history. RunningPhase pre-fills from target values; "Tout réussi" button removed.

**Tech Stack:** TypeScript, React Native, Expo SQLite, Jest

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `services/progression.ts` | Modify | Add `applyProgression`, `applyDeload`, `isSessionFullSuccess`, `isSessionSignificantFailure` |
| `services/progression.test.ts` | Modify | Tests for new functions (keep existing) |
| `services/SessionService.ts` | Modify | New `calculateProgressions` + add `setStartingWeight` |
| `db/seeds.ts` | Modify | Upsert-by-name + PPL reps fixed at 8 |
| `components/session/RunningPhase.tsx` | Modify | `key` comment fix, weight init `''`, remove Tout réussi |
| `components/session/ExerciseStartingWeightPhase.tsx` | **Create** | Starting-weight prompt before first Travail set |
| `hooks/useSession.ts` | Modify | Add `setStartingWeight` |
| `app/session/[workoutId].tsx` | Modify | `key={set.id}`, ExerciseStartingWeightPhase wiring |

---

## Task 1 — progression.ts: new pure functions

**Files:**
- Modify: `app/services/progression.ts`
- Modify: `app/services/progression.test.ts`

- [ ] **Step 1.1 — Write failing tests for new functions**

Add at the bottom of `app/services/progression.test.ts`:

```ts
import {
  isSetAchieved, isSessionAchieved, calculateProgression,
  applyProgression, applyDeload, isSessionFullSuccess, isSessionSignificantFailure,
} from './progression';

// --- applyProgression ---

describe('applyProgression', () => {
  it('arrondit au 2kg supérieur — 60kg', () => {
    expect(applyProgression(60)).toBe(62); // 60 * 1.025 = 61.5 → ceil to 62
  });

  it('arrondit au 2kg supérieur — 40kg', () => {
    expect(applyProgression(40)).toBe(42); // 40 * 1.025 = 41 → ceil(41/2)*2 = 42
  });

  it('minimum +2kg quelle que soit la charge', () => {
    expect(applyProgression(20)).toBe(22); // 20 * 1.025 = 20.5 → ceil(10.25)*2 = 22
  });
});

// --- applyDeload ---

describe('applyDeload', () => {
  it('arrondit au 2kg inférieur — 60kg', () => {
    expect(applyDeload(60)).toBe(54); // 60 * 0.9 = 54 → floor(27)*2 = 54
  });

  it('arrondit au 2kg inférieur — 40kg', () => {
    expect(applyDeload(40)).toBe(36); // 40 * 0.9 = 36 → floor(18)*2 = 36
  });
});

// --- isSessionFullSuccess ---

describe('isSessionFullSuccess', () => {
  it('true si toutes les séries atteignent la cible', () => {
    expect(isSessionFullSuccess([
      { reps_done: 8, reps_min: 8 },
      { reps_done: 8, reps_min: 8 },
      { reps_done: 9, reps_min: 8 },
    ])).toBe(true);
  });

  it('false si une série rate la cible d\'1 rep', () => {
    expect(isSessionFullSuccess([
      { reps_done: 7, reps_min: 8 },
      { reps_done: 8, reps_min: 8 },
    ])).toBe(false);
  });

  it('false si liste vide', () => {
    expect(isSessionFullSuccess([])).toBe(false);
  });
});

// --- isSessionSignificantFailure ---

describe('isSessionSignificantFailure', () => {
  it('true si au moins une série est à 2 reps sous la cible', () => {
    expect(isSessionSignificantFailure([
      { reps_done: 6, reps_min: 8 },
      { reps_done: 8, reps_min: 8 },
    ])).toBe(true);
  });

  it('false si le manque est d\'1 rep seulement', () => {
    expect(isSessionSignificantFailure([
      { reps_done: 7, reps_min: 8 },
      { reps_done: 8, reps_min: 8 },
    ])).toBe(false);
  });

  it('false si toutes les séries réussies', () => {
    expect(isSessionSignificantFailure([
      { reps_done: 8, reps_min: 8 },
      { reps_done: 8, reps_min: 8 },
    ])).toBe(false);
  });
});
```

- [ ] **Step 1.2 — Run tests to verify they fail**

```
cd app && npm test -- --testPathPattern=progression.test
```

Expected: FAIL — `applyProgression is not a function` (4+ failures)

- [ ] **Step 1.3 — Implement new functions in progression.ts**

Add at the bottom of `app/services/progression.ts` (keep all existing code):

```ts
export function applyProgression(weight: number): number {
  return Math.ceil(weight * 1.025 / 2) * 2;
}

export function applyDeload(weight: number): number {
  return Math.floor(weight * 0.9 / 2) * 2;
}

export function isSessionFullSuccess(workSets: SetResult[]): boolean {
  if (workSets.length === 0) return false;
  return workSets.every(s => s.reps_done >= s.reps_min);
}

export function isSessionSignificantFailure(workSets: SetResult[]): boolean {
  return workSets.some(s => s.reps_done <= s.reps_min - 2);
}
```

- [ ] **Step 1.4 — Run tests to verify they pass**

```
cd app && npm test -- --testPathPattern=progression.test
```

Expected: All tests PASS (old + new)

- [ ] **Step 1.5 — Commit**

```bash
git add app/services/progression.ts app/services/progression.test.ts
git commit -m "feat(progression): add applyProgression, applyDeload, isSessionFullSuccess, isSessionSignificantFailure"
```

---

## Task 2 — SessionService: new progression algo + setStartingWeight

**Files:**
- Modify: `app/services/SessionService.ts`

- [ ] **Step 2.1 — Add import of new progression functions**

At the top of `app/services/SessionService.ts`, add import:

```ts
import {
  applyProgression,
  applyDeload,
  isSessionFullSuccess,
  isSessionSignificantFailure,
  SetResult,
} from './progression';
```

- [ ] **Step 2.2 — Add setStartingWeight method**

Add this method to `SessionService` class (before `calculateProgressions`):

```ts
async setStartingWeight(workoutExerciseId: number, weight: number): Promise<void> {
  const blocks = await this.blockRepo.findByWorkoutExerciseId(workoutExerciseId);
  const travailBlocks = blocks.filter(b => b.is_work_block === 1 && b.name === 'Travail');
  for (const block of travailBlocks) {
    const sets = await this.setRepo.findByBlockId(block.id);
    for (const set of sets) {
      await this.setRepo.update(set.id, {
        reps_min: set.reps_min,
        reps_max: set.reps_max,
        weight,
        weight_type: set.weight_type,
        rest_duration: set.rest_duration,
      });
    }
  }
}
```

- [ ] **Step 2.3 — Replace calculateProgressions with new double-progression logic**

Replace the entire `calculateProgressions` method and `checkAllWorkSetsAchieved` with:

```ts
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
    const travailBlocks = blocks.filter(b => b.is_work_block === 1 && b.name === 'Travail');
    if (travailBlocks.length === 0) continue;

    const travailSets: import('../db/types').Set[] = [];
    for (const block of travailBlocks) {
      const sets = await this.setRepo.findByBlockId(block.id);
      travailSets.push(...sets);
    }
    if (travailSets.length === 0) continue;

    const travailSetIds = travailSets.map(s => s.id);
    const currentLogs = setLogs.filter(sl => travailSetIds.includes(sl.set_id));
    const oldWeight = travailSets[0].weight;

    if (currentLogs.length === 0) {
      results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight, newWeight: oldWeight, achieved: false, consecutiveSuccesses: 0, threshold: 1 });
      continue;
    }

    const currentSetResults: SetResult[] = currentLogs.map(log => ({
      reps_done: log.reps_done,
      reps_min: travailSets.find(s => s.id === log.set_id)?.reps_min ?? log.reps_done,
    }));

    if (isSessionFullSuccess(currentSetResults) && oldWeight !== null) {
      const newWeight = applyProgression(oldWeight);
      for (const set of travailSets) {
        await this.setRepo.update(set.id, {
          reps_min: set.reps_min,
          reps_max: set.reps_max,
          weight: newWeight,
          weight_type: set.weight_type,
          rest_duration: set.rest_duration,
        });
      }
      results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight, newWeight, achieved: true, consecutiveSuccesses: 1, threshold: 1 });
    } else if (isSessionSignificantFailure(currentSetResults) && oldWeight !== null) {
      const prevFailed = await this.checkPreviousSignificantFailure(
        sessionLogId, sessionLog.workout_id, travailSets
      );
      if (prevFailed) {
        const newWeight = applyDeload(oldWeight);
        for (const set of travailSets) {
          await this.setRepo.update(set.id, {
            reps_min: set.reps_min,
            reps_max: set.reps_max,
            weight: newWeight,
            weight_type: set.weight_type,
            rest_duration: set.rest_duration,
          });
        }
        results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight, newWeight, achieved: false, consecutiveSuccesses: 0, threshold: 1 });
      } else {
        results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight, newWeight: oldWeight, achieved: false, consecutiveSuccesses: 0, threshold: 1 });
      }
    } else {
      results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight, newWeight: oldWeight, achieved: false, consecutiveSuccesses: 0, threshold: 1 });
    }
  }

  return results;
}

private async checkPreviousSignificantFailure(
  currentSessionLogId: number,
  workoutId: number,
  travailSets: import('../db/types').Set[]
): Promise<boolean> {
  const pastSessions = (await this.sessionLogRepo.findByWorkoutId(workoutId))
    .filter(s => s.id !== currentSessionLogId && s.ended_at !== null)
    .sort((a, b) => b.started_at.localeCompare(a.started_at));

  if (pastSessions.length === 0) return false;

  const travailSetIds = travailSets.map(s => s.id);
  const prevLogs = await this.setLogRepo.findBySessionLogId(pastSessions[0].id);
  const prevTravailLogs = prevLogs.filter(sl => travailSetIds.includes(sl.set_id));

  if (prevTravailLogs.length === 0) return false;

  const prevSetResults: SetResult[] = prevTravailLogs.map(log => ({
    reps_done: log.reps_done,
    reps_min: travailSets.find(s => s.id === log.set_id)?.reps_min ?? log.reps_done,
  }));

  return isSessionSignificantFailure(prevSetResults);
}
```

- [ ] **Step 2.4 — Typecheck**

```
cd app && npm run typecheck
```

Expected: 0 errors

- [ ] **Step 2.5 — Commit**

```bash
git add app/services/SessionService.ts
git commit -m "feat(progression): double-progression + auto-deload + setStartingWeight"
```

---

## Task 3 — Seeds idempotentes

**Files:**
- Modify: `app/db/seeds.ts`

- [ ] **Step 3.1 — Replace seedProgram with idempotent version**

Replace the entire `seedProgram` function (from line `export async function seedProgram` to end of file) with:

```ts
export async function seedProgram(db: SQLiteDatabase): Promise<void> {
  // Ajouter les exercices manquants (déjà idempotent)
  for (const ex of EXTRA_EXERCISES) {
    const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM exercises WHERE name = ?', [ex.name]);
    if (!row) {
      await db.runAsync(
        'INSERT INTO exercises (name, type, muscle_groups, technical_notes, is_custom) VALUES (?, ?, ?, ?, 0)',
        [ex.name, ex.type, ex.muscle_groups, ex.technical_notes]
      );
    }
  }

  const allEx = await db.getAllAsync<{ id: number; name: string }>('SELECT id, name FROM exercises');
  const exMap = new Map(allEx.map(e => [e.name, e.id]));
  const getExId = (name: string): number => {
    const id = exMap.get(name);
    if (id === undefined) throw new Error(`Exercise not found in DB: ${name}`);
    return id;
  };

  // Programme — get or create
  let programId: number;
  const existingProgram = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM programs WHERE name = ?', [PPL.name]
  );
  if (existingProgram) {
    programId = existingProgram.id;
  } else {
    const { lastInsertRowId } = await db.runAsync(
      'INSERT INTO programs (name, description, is_active) VALUES (?, ?, 1)',
      [PPL.name, PPL.description]
    );
    programId = lastInsertRowId;
  }

  for (let wi = 0; wi < PPL.workouts.length; wi++) {
    const workout = PPL.workouts[wi];

    // Workout — get or create
    let workoutId: number;
    const existingWorkout = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM workouts WHERE program_id = ? AND name = ?', [programId, workout.name]
    );
    if (existingWorkout) {
      workoutId = existingWorkout.id;
      await db.runAsync('UPDATE workouts SET order_index = ? WHERE id = ?', [wi, workoutId]);
    } else {
      const { lastInsertRowId } = await db.runAsync(
        'INSERT INTO workouts (program_id, name, order_index) VALUES (?, ?, ?)',
        [programId, workout.name, wi]
      );
      workoutId = lastInsertRowId;
    }

    for (let ei = 0; ei < workout.exercises.length; ei++) {
      const we = workout.exercises[ei];
      const exId = getExId(we.exercise);

      // WorkoutExercise — get or create
      let weId: number;
      const existingWe = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM workout_exercises WHERE workout_id = ? AND exercise_id = ?', [workoutId, exId]
      );
      if (existingWe) {
        weId = existingWe.id;
        await db.runAsync('UPDATE workout_exercises SET order_index = ? WHERE id = ?', [ei, weId]);
      } else {
        const { lastInsertRowId } = await db.runAsync(
          'INSERT INTO workout_exercises (workout_id, exercise_id, order_index) VALUES (?, ?, ?)',
          [workoutId, exId, ei]
        );
        weId = lastInsertRowId;
      }

      for (let bi = 0; bi < we.blocks.length; bi++) {
        const block = we.blocks[bi];

        // Block — get or create
        let blockId: number;
        const existingBlock = await db.getFirstAsync<{ id: number }>(
          'SELECT id FROM blocks WHERE workout_exercise_id = ? AND name = ?', [weId, block.name]
        );
        if (existingBlock) {
          blockId = existingBlock.id;
          await db.runAsync(
            'UPDATE blocks SET order_index = ?, is_work_block = ? WHERE id = ?',
            [bi, block.is_work ? 1 : 0, blockId]
          );
        } else {
          const { lastInsertRowId } = await db.runAsync(
            'INSERT INTO blocks (workout_exercise_id, name, order_index, is_work_block) VALUES (?, ?, ?, ?)',
            [weId, block.name, bi, block.is_work ? 1 : 0]
          );
          blockId = lastInsertRowId;
        }

        for (let si = 0; si < block.sets.length; si++) {
          const s = block.sets[si];

          // Set — get or create, preserve weight if has set_logs
          const existingSet = await db.getFirstAsync<{ id: number }>(
            'SELECT id FROM sets WHERE block_id = ? AND order_index = ?', [blockId, si]
          );
          if (existingSet) {
            const hasLogs = await db.getFirstAsync<{ count: number }>(
              'SELECT COUNT(*) as count FROM set_logs WHERE set_id = ?', [existingSet.id]
            );
            const preserveWeight = (hasLogs?.count ?? 0) > 0;
            if (preserveWeight) {
              await db.runAsync(
                'UPDATE sets SET reps_min = ?, reps_max = ?, weight_type = ?, rest_duration = ?, duration_seconds = ? WHERE id = ?',
                [s.reps_min, s.reps_max, s.weight_type, s.rest, s.duration_seconds ?? null, existingSet.id]
              );
            } else {
              await db.runAsync(
                'UPDATE sets SET reps_min = ?, reps_max = ?, weight = ?, weight_type = ?, rest_duration = ?, duration_seconds = ? WHERE id = ?',
                [s.reps_min, s.reps_max, s.weight, s.weight_type, s.rest, s.duration_seconds ?? null, existingSet.id]
              );
            }
          } else {
            await db.runAsync(
              'INSERT INTO sets (block_id, reps_min, reps_max, weight, weight_type, rest_duration, order_index, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [blockId, s.reps_min, s.reps_max, s.weight, s.weight_type, s.rest, si, s.duration_seconds ?? null]
            );
          }
        }
      }
    }
  }
}
```

- [ ] **Step 3.2 — Typecheck**

```
cd app && npm run typecheck
```

Expected: 0 errors

- [ ] **Step 3.3 — Commit**

```bash
git add app/db/seeds.ts
git commit -m "fix(seeds): idempotent upsert — preserve set weights across restarts"
```

---

## Task 4 — Seeds PPL: reps fixes à 8

**Files:**
- Modify: `app/db/seeds.ts`

- [ ] **Step 4.1 — Mettre à jour les séries composés du bloc Travail**

Dans `app/db/seeds.ts`, mettre à jour les exercices suivants dans le programme PPL.

**Push — Développé couché barre, bloc Travail** (remplacer `[f(4, 6, 120), f(6, 8, 120), f(6, 8, 120), f(6, 8, 120)]`) :
```ts
sets: [f(8, 8, 120), f(8, 8, 120), f(8, 8, 120), f(8, 8, 120)],
```

**Pull — Tractions, bloc Travail** (remplacer `[bw(6, 10, 90), bw(6, 10, 90), bw(6, 10, 90)]`) :
```ts
sets: [bw(8, 8, 90), bw(8, 8, 90), bw(8, 8, 90), bw(8, 8, 90)],
```

**Pull — Rowing barre, bloc Travail** (remplacer `[f(6, 8, 90), f(6, 8, 90), f(6, 8, 90), f(6, 8, 90)]`) :
```ts
sets: [f(8, 8, 90), f(8, 8, 90), f(8, 8, 90), f(8, 8, 90)],
```

**Legs — Squat barre, bloc Travail** (remplacer `[f(6, 8, 120), f(6, 8, 120), f(6, 8, 120), f(6, 8, 120)]`) :
```ts
sets: [f(8, 8, 120), f(8, 8, 120), f(8, 8, 120), f(8, 8, 120)],
```

Pin Press, isolations, exercices déjà fixes : **ne pas toucher**.

- [ ] **Step 4.2 — Typecheck**

```
cd app && npm run typecheck
```

Expected: 0 errors

- [ ] **Step 4.3 — Commit**

```bash
git add app/db/seeds.ts
git commit -m "fix(seeds): fixed 8-rep target on compound movements (PPL)"
```

---

## Task 5 — RunningPhase: key fix + pre-fill + supprimer Tout réussi

**Files:**
- Modify: `app/components/session/RunningPhase.tsx`
- Modify: `app/app/session/[workoutId].tsx`

- [ ] **Step 5.1 — Ajouter key={set.id} dans session screen**

Dans `app/app/session/[workoutId].tsx`, ajouter `key={session.currentSet.id}` sur RunningPhase :

```tsx
{session.phase === 'running' && session.currentSet && session.currentBlock && session.currentExercise && (
  <RunningPhase
    key={session.currentSet.id}
    exercise={session.currentExercise}
    block={session.currentBlock}
    set={session.currentSet}
    progressLabel={session.progressLabel}
    timer={timer}
    onValidate={session.validateSet}
    onSkip={session.skipSet}
  />
)}
```

- [ ] **Step 5.2 — Corriger init weight + supprimer Tout réussi dans RunningPhase**

Dans `app/components/session/RunningPhase.tsx` :

**a) Changer l'init du state weight** (ligne ~38) :
```ts
// Avant :
const [weight, setWeight] = useState(set.weight != null ? String(set.weight) : '0');
// Après :
const [weight, setWeight] = useState(set.weight != null ? String(set.weight) : '');
```

**b) Supprimer la variable morte** (ligne ~64) :
```ts
// Supprimer cette ligne :
const setKey = set.id;
```

**c) Supprimer `handleToutReussi` entière** (lignes ~108-120).

**d) Supprimer le bouton "Tout réussi"** dans le JSX (les lignes avec `toutReussiBtn` et `⚡ Tout réussi`).

**e) Supprimer les styles `toutReussiBtn` et `toutReussiBtnText`** dans `StyleSheet.create`.

**f) Ajouter placeholder sur l'input weight** quand vide :
```tsx
<TextInput
  // ... props existants ...
  placeholder={set.weight === null ? 'Poids de départ' : '—'}
  // ...
/>
```

- [ ] **Step 5.3 — Typecheck**

```
cd app && npm run typecheck
```

Expected: 0 errors

- [ ] **Step 5.4 — Commit**

```bash
git add app/components/session/RunningPhase.tsx app/app/session/[workoutId].tsx
git commit -m "fix(session): key remount, pre-fill inputs, remove Tout réussi button"
```

---

## Task 6 — ExerciseStartingWeightPhase: nouveau composant

**Files:**
- Create: `app/components/session/ExerciseStartingWeightPhase.tsx`

- [ ] **Step 6.1 — Créer le composant**

Créer `app/components/session/ExerciseStartingWeightPhase.tsx` :

```tsx
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface ExerciseStartingWeightPhaseProps {
  exercise: WorkoutExerciseDetail;
  onConfirm: (weight: number) => Promise<void>;
}

export function ExerciseStartingWeightPhase({ exercise, onConfirm }: ExerciseStartingWeightPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    const w = parseFloat(weight.replace(',', '.'));
    if (isNaN(w) || w <= 0) return;
    setLoading(true);
    try {
      await onConfirm(w);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.exerciseName, { color: colors.text }]}>
        {exercise.exercise.name}
      </Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Premier log — ton poids de départ (kg)
      </Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        placeholder="ex: 60"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Poids de départ en kilogrammes"
        autoFocus
      />
      <PressableA11y
        onPress={handleConfirm}
        style={[styles.btn, { backgroundColor: colors.tint, opacity: (!weight || loading) ? 0.5 : 1 }]}
        accessibilityLabel="Confirmer le poids de départ"
        disabled={!weight || loading}
      >
        <Text style={styles.btnText}>{loading ? 'Enregistrement…' : 'Confirmer →'}</Text>
      </PressableA11y>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
  exerciseName: { fontSize: 28, fontWeight: '700' },
  label: { fontSize: 16 },
  input: {
    height: 64,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 28,
    fontWeight: '600',
  },
  btn: { height: 56, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
```

- [ ] **Step 6.2 — Typecheck**

```
cd app && npm run typecheck
```

Expected: 0 errors

- [ ] **Step 6.3 — Commit**

```bash
git add app/components/session/ExerciseStartingWeightPhase.tsx
git commit -m "feat(session): add ExerciseStartingWeightPhase component"
```

---

## Task 7 — Wiring: useSession + session screen

**Files:**
- Modify: `app/hooks/useSession.ts`
- Modify: `app/app/session/[workoutId].tsx`

- [ ] **Step 7.1 — Ajouter setStartingWeight dans useSession**

Dans `app/hooks/useSession.ts`, ajouter `setStartingWeight` à l'interface et à l'implémentation :

**Interface** (ajouter dans `UseSessionResult`) :
```ts
setStartingWeight: (weight: number) => Promise<void>;
```

**Implémentation** (ajouter avant le `return`) :
```ts
const setStartingWeight = useCallback(async (weight: number) => {
  if (!currentExercise) return;
  try {
    await service.setStartingWeight(currentExercise.id, weight);
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Erreur poids de départ');
  }
}, [service, currentExercise]);
```

**Return** (ajouter `setStartingWeight`) :
```ts
return {
  phase, sessionLogId, position,
  currentExercise, currentBlock, currentSet, progressLabel,
  startSession, validateSet, skipSet, setStartingWeight,
  progressions, sessionStartedAt, totalSetsLogged, error,
};
```

- [ ] **Step 7.2 — Intégrer ExerciseStartingWeightPhase dans le session screen**

Remplacer le contenu de `app/app/session/[workoutId].tsx` par :

```tsx
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises';
import { useSession } from '@/hooks/useSession';
import { useTimer } from '@/hooks/useTimer';
import { CheckInPhase } from '@/components/session/CheckInPhase';
import { RunningPhase } from '@/components/session/RunningPhase';
import { SummaryPhase } from '@/components/session/SummaryPhase';
import { ExerciseStartingWeightPhase } from '@/components/session/ExerciseStartingWeightPhase';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function SessionScreen() {
  const { workoutId: param } = useLocalSearchParams<{ workoutId: string }>();
  const workoutId = Number(param) || 0;
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { exercises, refresh } = useWorkoutExercises(workoutId);
  const session = useSession(workoutId, exercises);
  const timer = useTimer(120);

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

  // Détecte si l'exercice courant nécessite un poids de départ
  // (première fois qu'on arrive sur le premier set du bloc Travail + weight null sur tous ses sets)
  const needsStartingWeight = useMemo(() => {
    if (session.phase !== 'running') return false;
    if (!session.currentExercise) return false;
    const firstTravailBlockIdx = session.currentExercise.blocks.findIndex(
      b => b.is_work_block === 1 && b.name === 'Travail'
    );
    if (firstTravailBlockIdx === -1) return false;
    if (session.position.blockIdx !== firstTravailBlockIdx || session.position.setIdx !== 0) return false;
    return session.currentExercise.blocks[firstTravailBlockIdx].sets.every(s => s.weight === null);
  }, [session.phase, session.currentExercise, session.position]);

  const handleStartingWeightConfirm = useCallback(async (weight: number) => {
    await session.setStartingWeight(weight);
    await refresh();
  }, [session, refresh]);

  const handleBack = useCallback(() => router.back(), [router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {session.phase === 'checkin' && (
          <CheckInPhase onStart={session.startSession} />
        )}
        {session.phase === 'running' && session.currentSet && session.currentBlock && session.currentExercise && (
          needsStartingWeight ? (
            <ExerciseStartingWeightPhase
              exercise={session.currentExercise}
              onConfirm={handleStartingWeightConfirm}
            />
          ) : (
            <RunningPhase
              key={session.currentSet.id}
              exercise={session.currentExercise}
              block={session.currentBlock}
              set={session.currentSet}
              progressLabel={session.progressLabel}
              timer={timer}
              onValidate={session.validateSet}
              onSkip={session.skipSet}
            />
          )
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

- [ ] **Step 7.3 — Typecheck + tests**

```
cd app && npm run typecheck && npm test
```

Expected: 0 errors, all tests pass

- [ ] **Step 7.4 — Commit**

```bash
git add app/hooks/useSession.ts app/app/session/[workoutId].tsx
git commit -m "feat(session): wire ExerciseStartingWeightPhase + setStartingWeight"
```

---

## Self-Review Checklist

- [x] **Seeds idempotentes** → Task 3 ✓
- [x] **Seeds PPL reps fixes** → Task 4 ✓
- [x] **Timer reset** → Task 5 (key={set.id}) ✓
- [x] **Pre-fill inputs** → Task 5 (init weight `''` + placeholder) ✓
- [x] **Supprimer Tout réussi** → Task 5 ✓
- [x] **ExerciseStartingWeightPhase composant** → Task 6 ✓
- [x] **ExerciseStartingWeightPhase wiring** → Task 7 ✓
- [x] **setStartingWeight service** → Task 2 ✓
- [x] **Double progression** → Task 2 ✓
- [x] **Auto-deload** → Task 2 ✓
- [x] **applyProgression / applyDeload fonctions** → Task 1 ✓
- [x] **Types cohérents** → `SetResult` partagé, `WorkoutExerciseDetail.id` = we_id ✓

**Hors scope (reporté)** : 1RM Epley, RPE-adjusted, weight_ratio back-off, ExerciseTransitionPhase, cycle rotatif.
