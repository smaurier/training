# Volume par groupe musculaire — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher dans l'onglet Stats la répartition du volume d'entraînement par macro-catégorie musculaire (Push / Pull / Jambes / Gainage) sur 4 semaines glissantes, avec détail expandable par muscle.

**Architecture:** Pure function `computeVolumeByMuscleGroup` dans `muscleGroupUtils.ts` (TDD isolé). `ProgressionService.getVolumeByMuscleGroup()` orchestre les repos existants. `MuscleGroupCard` composant React Native avec expand/collapse local. `useProgression` hook étendu.

**Tech Stack:** React Native, Expo SDK 54, TypeScript strict, expo-sqlite, Jest

---

## Fichiers

| Fichier | Action |
|---|---|
| `app/services/muscleGroupUtils.ts` | Créer — types, mapping, `getMacroCategory`, `computeVolumeByMuscleGroup` |
| `app/services/muscleGroupUtils.test.ts` | Créer — 9 tests TDD |
| `app/services/ProgressionService.ts` | Ajouter `getVolumeByMuscleGroup` + import |
| `app/services/ProgressionService.test.ts` | 2 nouveaux tests |
| `app/hooks/useProgression.ts` | Ajouter `volumeByMuscleGroup` state + appel service |
| `app/components/progression/MuscleGroupCard.tsx` | Créer — card expandable |
| `app/app/(tabs)/progression.tsx` | Insérer `<MuscleGroupCard>` après `<VolumeBarChart>` |

---

### Task 1 : `muscleGroupUtils.ts` — types, mapping, pure functions (TDD)

**Files:**
- Create: `app/services/muscleGroupUtils.ts`
- Create: `app/services/muscleGroupUtils.test.ts`

- [ ] **Step 1 : Écrire les tests (RED)**

Créer `app/services/muscleGroupUtils.test.ts` :

```typescript
import { getMacroCategory, computeVolumeByMuscleGroup } from './muscleGroupUtils';
import type { SetLog, Exercise } from '../db/types';

function makeSetLog(exercise_id: number, reps: number, weight: number, completed_at = '2026-06-01T10:00:00.000Z'): SetLog {
  return { id: 1, session_log_id: 1, set_id: 1, exercise_id, reps_done: reps, weight_done: weight, rpe: null, completed_at, duration_seconds: null, distance_meters: null };
}

function makeExercise(id: number, muscle_groups: string[]): Exercise {
  return { id, muscle_groups: JSON.stringify(muscle_groups), name: 'Test', type: 'musculation', technical_notes: null, description: null, is_custom: 0, progression_step: 2, progression_threshold: 1, created_at: '2026-01-01T00:00:00.000Z' };
}

describe('getMacroCategory', () => {
  it("'pectoraux' → 'Push'", () => expect(getMacroCategory('pectoraux')).toBe('Push'));
  it("'grand dorsal' → 'Pull'", () => expect(getMacroCategory('grand dorsal')).toBe('Pull'));
  it("'quadriceps' → 'Jambes'", () => expect(getMacroCategory('quadriceps')).toBe('Jambes'));
  it("'abdominaux' → 'Gainage'", () => expect(getMacroCategory('abdominaux')).toBe('Gainage'));
  it("muscle inconnu → 'Autre'", () => expect(getMacroCategory('inconnu')).toBe('Autre'));
});

describe('computeVolumeByMuscleGroup', () => {
  it('retourne [] si setLogs vide', () => {
    expect(computeVolumeByMuscleGroup([], new Map())).toEqual([]);
  });

  it('attribue volume Push pour exercice pectoraux (10×80=800)', () => {
    const map = new Map([[1, makeExercise(1, ['pectoraux', 'triceps'])]]);
    const result = computeVolumeByMuscleGroup([makeSetLog(1, 10, 80)], map);
    expect(result.find(r => r.category === 'Push')?.volume).toBe(800);
  });

  it('compte Push une seule fois même avec 3 muscles Push', () => {
    const map = new Map([[1, makeExercise(1, ['pectoraux', 'triceps', 'deltoïdes antérieurs'])]]);
    const result = computeVolumeByMuscleGroup([makeSetLog(1, 10, 80)], map);
    expect(result.find(r => r.category === 'Push')?.volume).toBe(800);
  });

  it('attribue aux deux catégories pour exercice Jambes+Gainage (Squat)', () => {
    const map = new Map([[1, makeExercise(1, ['quadriceps', 'fessiers', 'érecteurs du rachis'])]]);
    const result = computeVolumeByMuscleGroup([makeSetLog(1, 5, 100)], map);
    expect(result.find(r => r.category === 'Jambes')?.volume).toBe(500);
    expect(result.find(r => r.category === 'Gainage')?.volume).toBe(500);
  });

  it('calcule pourcentages : Push 800 + Pull 200 → 80% / 20%', () => {
    const map = new Map([
      [1, makeExercise(1, ['pectoraux'])],
      [2, makeExercise(2, ['grand dorsal'])],
    ]);
    const result = computeVolumeByMuscleGroup([
      makeSetLog(1, 10, 80),
      makeSetLog(2, 10, 20),
    ], map);
    expect(result.find(r => r.category === 'Push')?.percentage).toBe(80);
    expect(result.find(r => r.category === 'Pull')?.percentage).toBe(20);
  });

  it('trie muscles par volume DESC dans le détail', () => {
    const map = new Map([
      [1, makeExercise(1, ['pectoraux', 'triceps'])],
      [2, makeExercise(2, ['triceps'])],
    ]);
    const result = computeVolumeByMuscleGroup([
      makeSetLog(1, 10, 80),  // pectoraux=800, triceps=800
      makeSetLog(2, 10, 50),  // triceps+=500 → 1300
    ], map);
    const muscles = result.find(r => r.category === 'Push')?.muscles ?? [];
    expect(muscles[0].muscle).toBe('triceps');  // 1300 > pectoraux 800
  });

  it('ignore exercice absent de exerciseMap', () => {
    const result = computeVolumeByMuscleGroup([makeSetLog(99, 10, 80)], new Map());
    expect(result).toEqual([]);
  });

  it("retourne [] si muscle_groups est '[]'", () => {
    const map = new Map([[1, makeExercise(1, [])]]);
    expect(computeVolumeByMuscleGroup([makeSetLog(1, 10, 80)], map)).toEqual([]);
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="muscleGroupUtils.test" --no-coverage 2>&1 | tail -5
```
Attendu : FAIL — `Cannot find module './muscleGroupUtils'`

- [ ] **Step 3 : Créer `app/services/muscleGroupUtils.ts`**

```typescript
import type { SetLog, Exercise } from '../db/types';

export type MacroCategory = 'Push' | 'Pull' | 'Jambes' | 'Gainage' | 'Autre';

export const MUSCLE_CATEGORY_MAP: Record<string, MacroCategory> = {
  'pectoraux': 'Push',
  'pectoraux supérieurs': 'Push',
  'triceps': 'Push',
  'deltoïdes antérieurs': 'Push',
  'deltoïdes': 'Push',
  'grand dorsal': 'Pull',
  'biceps': 'Pull',
  'brachial': 'Pull',
  'rhomboïdes': 'Pull',
  'trapèzes': 'Pull',
  'deltoïdes postérieurs': 'Pull',
  'rotateurs externes': 'Pull',
  'ischio-jambiers': 'Jambes',
  'fessiers': 'Jambes',
  'quadriceps': 'Jambes',
  'gastrocnémiens': 'Jambes',
  'soléaires': 'Jambes',
  'abdominaux': 'Gainage',
  'érecteurs du rachis': 'Gainage',
  'fléchisseurs de hanche': 'Gainage',
};

export interface MuscleDetail {
  muscle: string;
  volume: number;
}

export interface MacroGroupVolume {
  category: MacroCategory;
  volume: number;
  percentage: number;
  muscles: MuscleDetail[];
}

const MACRO_ORDER: MacroCategory[] = ['Push', 'Pull', 'Jambes', 'Gainage', 'Autre'];

export function getMacroCategory(muscle: string): MacroCategory {
  return MUSCLE_CATEGORY_MAP[muscle] ?? 'Autre';
}

export function computeVolumeByMuscleGroup(
  setLogs: SetLog[],
  exerciseMap: Map<number, Exercise>,
): MacroGroupVolume[] {
  const categoryVolume = new Map<MacroCategory, number>();
  const muscleVolume = new Map<string, number>();

  for (const log of setLogs) {
    const exercise = exerciseMap.get(log.exercise_id);
    if (!exercise) continue;

    let muscles: string[] = [];
    try {
      muscles = JSON.parse(exercise.muscle_groups) as string[];
    } catch {
      muscles = [];
    }
    if (muscles.length === 0) continue;

    const volume = log.reps_done * log.weight_done;
    const categories = new Set<MacroCategory>(muscles.map(getMacroCategory));

    for (const cat of categories) {
      categoryVolume.set(cat, (categoryVolume.get(cat) ?? 0) + volume);
    }
    for (const muscle of muscles) {
      muscleVolume.set(muscle, (muscleVolume.get(muscle) ?? 0) + volume);
    }
  }

  const totalVolume = [...categoryVolume.values()].reduce((s, v) => s + v, 0);
  if (totalVolume === 0) return [];

  return MACRO_ORDER
    .filter(cat => categoryVolume.has(cat))
    .map(cat => {
      const volume = categoryVolume.get(cat) ?? 0;
      const muscles: MuscleDetail[] = [...muscleVolume.entries()]
        .filter(([m]) => getMacroCategory(m) === cat)
        .map(([muscle, vol]) => ({ muscle, volume: Math.round(vol) }))
        .sort((a, b) => b.volume - a.volume);
      return {
        category: cat,
        volume: Math.round(volume),
        percentage: Math.round((volume / totalVolume) * 100),
        muscles,
      };
    });
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="muscleGroupUtils.test" --no-coverage 2>&1 | tail -5
```
Attendu : PASS — 9 tests

- [ ] **Step 5 : TypeScript check + commit**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
cd /c/Users/sylva/projects/training-app && git add app/services/muscleGroupUtils.ts app/services/muscleGroupUtils.test.ts && git commit -m "feat(stats): muscleGroupUtils — mapping, getMacroCategory, computeVolumeByMuscleGroup (TDD)"
```

---

### Task 2 : `ProgressionService.getVolumeByMuscleGroup` (TDD)

**Files:**
- Modify: `app/services/ProgressionService.ts`
- Modify: `app/services/ProgressionService.test.ts`

**Contexte :** `ProgressionService` prend 4 repos en constructeur (`sessionLogRepo`, `setLogRepo`, `personalRecordRepo`, `exerciseRepo`). `getWeekMonday` est une fonction helper déjà présente dans le fichier. La méthode `getVolumeByWeek` utilise `setLogRepo.findFromDate(earliestMonday.toISOString())` — même pattern ici.

Dans les tests, `makeService()` retourne `{ service, sessionLogRepo, setLogRepo, personalRecordRepo, exerciseRepo }`. `NOW = new Date('2026-05-29T12:00:00.000Z')`. Le lundi de cette semaine est le 2026-05-25 ; la fenêtre de 4 semaines part du 2026-05-04.

- [ ] **Step 1 : Écrire les tests (RED)**

Dans `app/services/ProgressionService.test.ts`, après le dernier `describe`, ajouter :

```typescript
describe('ProgressionService.getVolumeByMuscleGroup', () => {
  it('retourne [] si aucun set_log dans la période', async () => {
    const { service } = makeService();
    const result = await service.getVolumeByMuscleGroup(NOW);
    expect(result).toEqual([]);
  });

  it('retourne volumes Push et Pull agrégés sur 4 semaines', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const pushEx = await exerciseRepo.save({ ...baseExerciseDto, name: 'Bench', muscle_groups: '["pectoraux"]' });
    const pullEx = await exerciseRepo.save({ ...baseExerciseDto, name: 'Row', muscle_groups: '["grand dorsal"]' });
    await setLogRepo.save({
      session_log_id: 1, set_id: 1, exercise_id: pushEx.id,
      reps_done: 10, weight_done: 80, rpe: null,
      completed_at: '2026-05-27T10:00:00.000Z',
    });
    await setLogRepo.save({
      session_log_id: 1, set_id: 2, exercise_id: pullEx.id,
      reps_done: 10, weight_done: 60, rpe: null,
      completed_at: '2026-05-27T10:00:00.000Z',
    });
    const result = await service.getVolumeByMuscleGroup(NOW);
    expect(result.find(r => r.category === 'Push')?.volume).toBe(800);
    expect(result.find(r => r.category === 'Pull')?.volume).toBe(600);
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="ProgressionService.test" --no-coverage 2>&1 | tail -8
```
Attendu : 2 failures — `getVolumeByMuscleGroup is not a function`

- [ ] **Step 3 : Implémenter dans `ProgressionService.ts`**

Ajouter l'import en tête (après les imports existants) :

```typescript
import { computeVolumeByMuscleGroup, MacroGroupVolume } from './muscleGroupUtils';
```

Ajouter la méthode après `getVolumeByWeek` :

```typescript
  async getVolumeByMuscleGroup(now: Date = new Date()): Promise<MacroGroupVolume[]> {
    const thisMonday = getWeekMonday(now);
    const earliestMonday = new Date(thisMonday);
    earliestMonday.setUTCDate(earliestMonday.getUTCDate() - 21);

    const [setLogs, exercises] = await Promise.all([
      this.setLogRepo.findFromDate(earliestMonday.toISOString()),
      this.exerciseRepo.findAll(),
    ]);

    const exerciseMap = new Map(exercises.map(e => [e.id, e]));
    return computeVolumeByMuscleGroup(setLogs, exerciseMap);
  }
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="ProgressionService.test" --no-coverage 2>&1 | tail -5
```
Attendu : PASS (tous les tests existants + 2 nouveaux)

- [ ] **Step 5 : TypeScript check + suite complète**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
cd /c/Users/sylva/projects/training-app/app && npx jest --no-coverage 2>&1 | tail -5
```
Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/services/ProgressionService.ts app/services/ProgressionService.test.ts && git commit -m "feat(stats): ProgressionService.getVolumeByMuscleGroup — 4 semaines glissantes (TDD)"
```

---

### Task 3 : UI — `MuscleGroupCard` + `useProgression` + `progression.tsx`

**Files:**
- Create: `app/components/progression/MuscleGroupCard.tsx`
- Modify: `app/hooks/useProgression.ts`
- Modify: `app/app/(tabs)/progression.tsx`

Pas de nouveaux tests unitaires — composant pur UI, logique dans T1+T2. Couverture via TS + inspection visuelle.

**Contexte `useProgression` :** Le hook expose `{ stats, volumeByWeek, recentPRs, exercise1RMList, isLoading, error, refresh }`. Il appelle `Promise.all([...])` dans `refresh`. `UseProgressionReturn` est l'interface exportée.

**Contexte `progression.tsx` :** L'onglet Stats render dans l'ordre : chips row → `<VolumeBarChart>` (dans une `<View style={styles.card}>`) → PRs récents → 1RM par exercice. Le `VolumeBarChart` est déjà importé depuis `@/components/progression/VolumeBarChart`.

**Contexte `useUnits` :** `const { convert, label: unitLabel } = useUnits()` — `convert(kg: number): string`, `unitLabel: string` (ex: `'kg'` ou `'lbs'`).

**Contexte `PressableA11y` :** Composant custom accessible, utilisé partout à la place de `Pressable`. Import : `import { PressableA11y } from '@/components/ui/PressableA11y'`.

- [ ] **Step 1 : Créer `app/components/progression/MuscleGroupCard.tsx`**

```typescript
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import type { MacroGroupVolume, MacroCategory } from '@/services/muscleGroupUtils';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { useUnits } from '@/hooks/useUnits';

interface MuscleGroupCardProps {
  data: MacroGroupVolume[];
}

export function MuscleGroupCard({ data }: MuscleGroupCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { convert, label: unitLabel } = useUnits();
  const [expanded, setExpanded] = useState<Set<MacroCategory>>(new Set());

  if (data.length === 0) return null;

  function toggle(category: MacroCategory) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>VOLUME PAR STIMULUS</Text>
      {data.map(item => {
        const isExp = expanded.has(item.category);
        const volDisplay = Math.round(parseFloat(convert(item.volume))).toLocaleString();
        return (
          <View key={item.category}>
            <PressableA11y
              accessibilityLabel={`${item.category}, ${item.percentage}%, ${volDisplay} ${unitLabel}`}
              accessibilityState={{ expanded: isExp }}
              onPress={() => toggle(item.category)}
              style={styles.row}
            >
              <Text style={[styles.catLabel, { color: colors.text }]}>{item.category}</Text>
              <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.barFill,
                    { backgroundColor: colors.primary, width: `${item.percentage}%` },
                  ]}
                />
              </View>
              <Text style={[styles.pct, { color: colors.textSecondary }]}>{item.percentage}%</Text>
              <Text style={[styles.vol, { color: colors.text }]}>{volDisplay} {unitLabel}</Text>
              <Text style={[styles.chevron, { color: colors.textSecondary }]}>{isExp ? '▼' : '▶'}</Text>
            </PressableA11y>
            {isExp && item.muscles.map(m => (
              <View key={m.muscle} style={styles.muscleRow}>
                <Text style={[styles.muscleLabel, { color: colors.textSecondary }]}>· {m.muscle}</Text>
                <Text style={[styles.muscleVol, { color: colors.textSecondary }]}>
                  {Math.round(parseFloat(convert(m.volume))).toLocaleString()} {unitLabel}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.sm, padding: 14, gap: 10 },
  title: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  catLabel: { fontSize: 13, fontWeight: '600', width: 64 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  pct: { fontSize: 11, width: 30, textAlign: 'right' },
  vol: { fontSize: 12, fontWeight: '600', width: 80, textAlign: 'right' },
  chevron: { fontSize: 10, width: 14, textAlign: 'center' },
  muscleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 72, paddingVertical: 2 },
  muscleLabel: { fontSize: 12 },
  muscleVol: { fontSize: 12 },
});
```

- [ ] **Step 2 : Mettre à jour `app/hooks/useProgression.ts`**

Remplacer l'import :
```typescript
import { ProgressionService, DashboardStats, WeeklyVolume, RecentPR, Exercise1RM } from '../services/ProgressionService';
```
par :
```typescript
import { ProgressionService, DashboardStats, WeeklyVolume, RecentPR, Exercise1RM } from '../services/ProgressionService';
import type { MacroGroupVolume } from '../services/muscleGroupUtils';
```

Remplacer l'interface `UseProgressionReturn` :
```typescript
export interface UseProgressionReturn {
  stats: DashboardStats | null;
  volumeByWeek: WeeklyVolume[];
  recentPRs: RecentPR[];
  exercise1RMList: Exercise1RM[];
  volumeByMuscleGroup: MacroGroupVolume[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

Ajouter state après `exercise1RMList` :
```typescript
  const [volumeByMuscleGroup, setVolumeByMuscleGroup] = useState<MacroGroupVolume[]>([]);
```

Remplacer le `Promise.all` dans `refresh` :
```typescript
      const [s, v, p, e, m] = await Promise.all([
        service.getDashboardStats(),
        service.getVolumeByWeek(),
        service.getRecentPRs(5),
        service.getExercise1RMList(),
        service.getVolumeByMuscleGroup(),
      ]);
      if (mountedRef.current) {
        setStats(s);
        setVolumeByWeek(v);
        setRecentPRs(p);
        setExercise1RMList(e);
        setVolumeByMuscleGroup(m);
      }
```

Ajouter `volumeByMuscleGroup` dans le return :
```typescript
  return { stats, volumeByWeek, recentPRs, exercise1RMList, volumeByMuscleGroup, isLoading, error, refresh };
```

- [ ] **Step 3 : Mettre à jour `app/app/(tabs)/progression.tsx`**

Ajouter les imports en tête (après `VolumeBarChart`) :
```typescript
import { MuscleGroupCard } from '@/components/progression/MuscleGroupCard';
```

Dans la destructuration de `useProgression()`, ajouter `volumeByMuscleGroup` :
```typescript
  const { stats, volumeByWeek, recentPRs, exercise1RMList, volumeByMuscleGroup, isLoading: statsLoading, error: statsError, refresh: refreshStats } = useProgression();
```

Dans le JSX du segment Stats, insérer `<MuscleGroupCard>` **entre** le bloc `<View style={[styles.card...]}><VolumeBarChart /></View>` et le bloc `{recentPRs.length > 0 && ...}` :

```tsx
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <VolumeBarChart data={volumeByWeek} />
        </View>

        <MuscleGroupCard data={volumeByMuscleGroup} />

        {recentPRs.length > 0 && (
```

- [ ] **Step 4 : TypeScript check + tests complets**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
cd /c/Users/sylva/projects/training-app/app && npx jest --no-coverage 2>&1 | tail -5
```
Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 5 : ESLint check**

```bash
cd /c/Users/sylva/projects/training-app/app && npx eslint . --ext .ts,.tsx 2>&1 | grep " error "
```
Attendu : 0 erreurs.

- [ ] **Step 6 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/components/progression/MuscleGroupCard.tsx app/hooks/useProgression.ts "app/app/(tabs)/progression.tsx" && git commit -m "feat(stats): MuscleGroupCard — volume par stimulus Push/Pull/Jambes/Gainage"
```

---

## Self-Review

**Spec coverage :**
- ✅ Mapping muscle → catégorie → T1 (`MUSCLE_CATEGORY_MAP`, `getMacroCategory`)
- ✅ Règle d'attribution (une fois par catégorie, plein volume par muscle) → T1 (`computeVolumeByMuscleGroup`)
- ✅ Fenêtre 4 semaines glissantes → T2 (`getVolumeByMuscleGroup`, même algo que `getVolumeByWeek`)
- ✅ Types `MacroGroupVolume` + `MuscleDetail` → T1
- ✅ `ProgressionService.getVolumeByMuscleGroup` → T2
- ✅ `useProgression` étendu → T3
- ✅ `MuscleGroupCard` expandable → T3
- ✅ Position après VolumeBarChart → T3
- ✅ `accessibilityState={{ expanded }}` → T3
- ✅ Muscles triés par volume DESC → T1 (sort dans `computeVolumeByMuscleGroup`)
- ✅ Catégorie `'Autre'` incluse seulement si volume > 0 → T1 (filtre `has(cat)`)
- ✅ Retourne `null` si data vide → T3 (`if (data.length === 0) return null`)
- ✅ kg/lbs via `useUnits` → T3

**Placeholders :** aucun.

**Type consistency :**
- `MacroCategory`, `MacroGroupVolume`, `MuscleDetail` définis en T1, utilisés en T2 et T3.
- `getMacroCategory` défini en T1, utilisé dans T1 (tests) et dans `computeVolumeByMuscleGroup`.
- `getVolumeByMuscleGroup` signature : `(now?: Date) => Promise<MacroGroupVolume[]>` — cohérent entre T2 (service) et T3 (hook appel sans argument).
