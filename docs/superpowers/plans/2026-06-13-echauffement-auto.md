# Échauffement Auto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher automatiquement une phase d'échauffement dédiée (WarmupPhase) avant le premier set de travail de chaque exercice composé qualifié (`weight_type === 'fixed'` et poids ≥ 40 kg), avec 3 séries calculées dynamiquement (40%×8 + 60%×5 + 80%×2 du poids de travail, arrondi au 2 kg inférieur).

**Architecture:** Deux pure functions dans `warmup.ts`, un nouveau composant `WarmupPhase`, et une modification de `confirmTransition` dans `useSession` pour insérer la phase `'warmup'` entre `exercise_transition` et `running`. Rien n'est stocké en DB — tout est calculé à la volée depuis le poids résolu de la première série Travail. Le bloc `Échauffement` hardcodé du Développé couché barre est supprimé des seeds et nettoyé en DB (CASCADE blocks → sets → set_logs).

**Tech Stack:** React Native, TypeScript strict, expo-sqlite, Jest (TDD), `useUnits` hook pour affichage poids.

---

## Fichiers

| Fichier | Action |
|---|---|
| `app/services/warmup.ts` | Créer — `computeWarmupSets` + `shouldShowWarmup` (pure functions) |
| `app/services/warmup.test.ts` | Créer — TDD |
| `app/components/session/WarmupPhase.tsx` | Créer — composant phase |
| `app/hooks/useSession.ts` | Modifier — ajouter `'warmup'` au type, `confirmWarmup`, modifier `confirmTransition` |
| `app/app/session/[workoutId].tsx` | Modifier — import + render WarmupPhase + `warmupWorkWeight` memo |
| `app/db/seeds.ts` | Modifier — retirer bloc Échauffement bench + DELETE cleanup dans `seedProgram` |

---

## Task 1 : Pure functions `warmup.ts` (TDD)

**Files:**
- Create: `app/services/warmup.ts`
- Create: `app/services/warmup.test.ts`

- [ ] **Step 1 : Écrire les tests**

```typescript
// app/services/warmup.test.ts
import { computeWarmupSets, shouldShowWarmup } from './warmup';

describe('computeWarmupSets', () => {
  it('60 kg → 24/36/48 kg', () => {
    expect(computeWarmupSets(60)).toEqual([
      { weight: 24, reps: 8, rest: 60, percent: 40 },
      { weight: 36, reps: 5, rest: 60, percent: 60 },
      { weight: 48, reps: 2, rest: 90, percent: 80 },
    ]);
  });

  it('arrondit au 2 kg inférieur — 65 kg → 26/38/52', () => {
    const sets = computeWarmupSets(65);
    // 65×0.4=26.0 → 26, 65×0.6=39.0 → 38, 65×0.8=52.0 → 52
    expect(sets[0]!.weight).toBe(26);
    expect(sets[1]!.weight).toBe(38);
    expect(sets[2]!.weight).toBe(52);
  });

  it('50 kg → 20/30/40', () => {
    expect(computeWarmupSets(50)).toEqual([
      { weight: 20, reps: 8, rest: 60, percent: 40 },
      { weight: 30, reps: 5, rest: 60, percent: 60 },
      { weight: 40, reps: 2, rest: 90, percent: 80 },
    ]);
  });

  it('exactement au seuil — 40 kg → 16/24/32', () => {
    expect(computeWarmupSets(40)).toEqual([
      { weight: 16, reps: 8, rest: 60, percent: 40 },
      { weight: 24, reps: 5, rest: 60, percent: 60 },
      { weight: 32, reps: 2, rest: 90, percent: 80 },
    ]);
  });

  it('100 kg → 40/60/80', () => {
    expect(computeWarmupSets(100)).toEqual([
      { weight: 40, reps: 8, rest: 60, percent: 40 },
      { weight: 60, reps: 5, rest: 60, percent: 60 },
      { weight: 80, reps: 2, rest: 90, percent: 80 },
    ]);
  });
});

describe('shouldShowWarmup', () => {
  it('fixed ≥ 40 kg → true', () => expect(shouldShowWarmup(60, 'fixed')).toBe(true));
  it('fixed exactement 40 kg → true', () => expect(shouldShowWarmup(40, 'fixed')).toBe(true));
  it('fixed < 40 kg → false', () => expect(shouldShowWarmup(39, 'fixed')).toBe(false));
  it('fixed 0 (poids non encore saisi) → false', () => expect(shouldShowWarmup(0, 'fixed')).toBe(false));
  it('bodyweight → false', () => expect(shouldShowWarmup(60, 'bodyweight')).toBe(false));
  it('bar → false', () => expect(shouldShowWarmup(60, 'bar')).toBe(false));
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
npx jest app/services/warmup.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module './warmup'`

- [ ] **Step 3 : Implémenter `warmup.ts`**

```typescript
// app/services/warmup.ts
import type { WeightType } from '../db/types';

export type WarmupSet = {
  weight: number;
  reps: number;
  rest: number;
  percent: number;
};

export function computeWarmupSets(workWeight: number): WarmupSet[] {
  const round2 = (w: number) => Math.floor(w / 2) * 2;
  return [
    { weight: round2(workWeight * 0.4), reps: 8, rest: 60,  percent: 40 },
    { weight: round2(workWeight * 0.6), reps: 5, rest: 60,  percent: 60 },
    { weight: round2(workWeight * 0.8), reps: 2, rest: 90,  percent: 80 },
  ];
}

export function shouldShowWarmup(workWeight: number, weightType: WeightType): boolean {
  return weightType === 'fixed' && workWeight >= 40;
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
npx jest app/services/warmup.test.ts --no-coverage
```

Expected: PASS — 11 tests

- [ ] **Step 5 : Commit**

```bash
git add app/services/warmup.ts app/services/warmup.test.ts
git commit -m "feat(warmup): computeWarmupSets + shouldShowWarmup — TDD 11 tests"
```

---

## Task 2 : Composant `WarmupPhase`

**Files:**
- Create: `app/components/session/WarmupPhase.tsx`

**Contexte :** Copier le pattern de `app/components/session/ExerciseTransitionPhase.tsx` — même structure `flex:1, flexDirection:'row'` avec stripe colorée + ScrollView. Utiliser `useUnits` de `@/hooks/useUnits` pour afficher le poids (pattern identique à `RunningPhase`). Importer `computeWarmupSets` de `@/services/warmup`.

- [ ] **Step 1 : Créer `WarmupPhase.tsx`**

```typescript
// app/components/session/WarmupPhase.tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useUnits } from '@/hooks/useUnits';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { computeWarmupSets } from '@/services/warmup';

interface WarmupPhaseProps {
  exerciseName: string;
  workWeight: number;
  onStart: () => void;
}

export function WarmupPhase({ exerciseName, workWeight, onStart }: WarmupPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { convert, label: unitLabel } = useUnits();
  const sets = computeWarmupSets(workWeight);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.stripe, { backgroundColor: colors.primary }]} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.phaseLabel, { color: colors.textSecondary }]}>
          ÉCHAUFFEMENT
        </Text>
        <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={2}>
          {exerciseName}
        </Text>

        <View style={[styles.setsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {sets.map((s, i) => (
            <View
              key={i}
              style={[
                styles.setRow,
                i < sets.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
              ]}
            >
              <Text style={[styles.setWeight, { color: colors.text }]}>
                {convert(s.weight)} {unitLabel} × {s.reps}
              </Text>
              <Text style={[styles.setPercent, { color: colors.textSecondary }]}>
                {s.percent}%
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Repos ~60 s entre chaque série
        </Text>

        <PressableA11y
          accessibilityLabel={`Commencer le travail pour ${exerciseName}`}
          onPress={onStart}
          style={[styles.startBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.startBtnText}>Commencer le travail →</Text>
        </PressableA11y>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  stripe: { width: 4 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    gap: 16,
  },
  phaseLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  exerciseName: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  setsCard: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  setWeight: { fontSize: 17, fontWeight: '600' },
  setPercent: { fontSize: 14 },
  hint: { fontSize: 14 },
  startBtn: {
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginTop: 8,
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 erreurs.

- [ ] **Step 3 : Commit**

```bash
git add app/components/session/WarmupPhase.tsx
git commit -m "feat(warmup): WarmupPhase — écran échauffement dédié"
```

---

## Task 3 : `useSession.ts` — phase `'warmup'`

**Files:**
- Modify: `app/hooks/useSession.ts`

**Contexte :** Le fichier est à `app/hooks/useSession.ts`. `SessionPhase` est défini ligne 15. `confirmTransition` est lignes 220–222. Le retour du hook est lignes 301–308. `workoutDetails` et `position` sont disponibles dans le scope du hook.

- [ ] **Step 1 : Ajouter `'warmup'` au type `SessionPhase` (ligne 15)**

Remplacer :
```typescript
export type SessionPhase = 'checkin' | 'exercise_transition' | 'running' | 'rest' | 'summary';
```
Par :
```typescript
export type SessionPhase = 'checkin' | 'exercise_transition' | 'running' | 'rest' | 'summary' | 'warmup';
```

- [ ] **Step 2 : Ajouter l'import `shouldShowWarmup`**

Ajouter après les imports existants (ex: après la ligne `import { getDb } from '../db';`) :
```typescript
import { shouldShowWarmup } from '../services/warmup';
```

- [ ] **Step 3 : Ajouter `confirmWarmup` à l'interface `UseSessionResult`**

Dans `UseSessionResult` (après `confirmTransition: () => void;`) :
```typescript
confirmWarmup: () => void;
```

- [ ] **Step 4 : Modifier `confirmTransition` — insérer la phase warmup si qualifié**

Remplacer la fonction `confirmTransition` existante (lignes 220–222) :
```typescript
const confirmTransition = useCallback(() => {
  setPhase('running');
}, []);
```
Par :
```typescript
const confirmTransition = useCallback(() => {
  const exercise = workoutDetails[position.exerciseIdx];
  const travailBlock = exercise?.blocks.find(b => b.is_work_block === 1 && b.name === 'Travail');
  const firstSet = travailBlock?.sets[0];
  if (firstSet && shouldShowWarmup(firstSet.weight ?? 0, firstSet.weight_type)) {
    setPhase('warmup');
  } else {
    setPhase('running');
  }
}, [workoutDetails, position.exerciseIdx]);
```

- [ ] **Step 5 : Ajouter `confirmWarmup` (après `confirmTransition`)**

```typescript
const confirmWarmup = useCallback(() => {
  setPhase('running');
}, []);
```

- [ ] **Step 6 : Ajouter `confirmWarmup` au `return`**

Dans l'objet return (ligne ~308), ajouter `confirmWarmup` :
```typescript
return {
  phase, sessionLogId, position,
  currentExercise, currentBlock, currentSet, progressLabel,
  startSession, validateSet, skipSet, skipExercise, undoLastSet, canUndo,
  setStartingWeight, startingWeightDone, markStartingWeightDone,
  confirmTransition, confirmRest, confirmWarmup, restDuration, nextLabel,
  progressions, sessionStartedAt, totalSetsLogged, totalVolume, lastSetLog, error, pauseSession,
};
```

- [ ] **Step 7 : Vérifier TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 erreurs.

- [ ] **Step 8 : Lancer les tests useSession**

```bash
npx jest app/hooks/useSession.test.ts --no-coverage
```

Expected: PASS (tous les tests existants).

- [ ] **Step 9 : Commit**

```bash
git add app/hooks/useSession.ts
git commit -m "feat(warmup): useSession — phase 'warmup' + confirmWarmup + confirmTransition check"
```

---

## Task 4 : `[workoutId].tsx` — render WarmupPhase

**Files:**
- Modify: `app/app/session/[workoutId].tsx`

**Contexte :** Les imports sont lignes 1–38. Le `useMemo` `needsStartingWeight` est lignes 141–153. Les blocs de rendu conditionnels sont lignes 282–350. La `WarmupPhase` doit s'intercaler entre le bloc `exercise_transition` (ligne 291) et le bloc `running` (ligne 300). Le bouton pause (ligne 359) inclut déjà tous les phases autres que `checkin`/`summary` — pas de changement nécessaire.

- [ ] **Step 1 : Ajouter l'import `WarmupPhase`**

Après les imports des autres composants session (ligne ~14) :
```typescript
import { WarmupPhase } from '@/components/session/WarmupPhase';
```

- [ ] **Step 2 : Ajouter `warmupWorkWeight` useMemo**

Après le `useMemo` `needsStartingWeight` (ligne ~153), ajouter :
```typescript
const warmupWorkWeight = useMemo(() => {
  if (!session.currentExercise) return 0;
  const travailBlock = session.currentExercise.blocks.find(
    b => b.is_work_block === 1 && b.name === 'Travail'
  );
  return travailBlock?.sets[0]?.weight ?? 0;
}, [session.currentExercise]);
```

- [ ] **Step 3 : Ajouter le bloc de rendu `WarmupPhase`**

Entre le bloc `exercise_transition` et le bloc `running` (après la ligne 298 environ), ajouter :
```typescript
{!session.error && session.phase === 'warmup' && session.currentExercise && (
  <WarmupPhase
    exerciseName={session.currentExercise.exercise.name}
    workWeight={warmupWorkWeight}
    onStart={session.confirmWarmup}
  />
)}
```

- [ ] **Step 4 : Vérifier TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 erreurs.

- [ ] **Step 5 : Lancer tous les tests**

```bash
npx jest --no-coverage
```

Expected: PASS tous les suites.

- [ ] **Step 6 : Commit**

```bash
git add app/app/session/[workoutId].tsx
git commit -m "feat(warmup): [workoutId].tsx — render WarmupPhase entre transition et travail"
```

---

## Task 5 : `seeds.ts` — supprimer le bloc Échauffement hardcodé

**Files:**
- Modify: `app/db/seeds.ts`

**Contexte :** Le bloc `Échauffement` hardcodé du Développé couché barre est lignes 582–591. La fonction `seedProgram` commence ligne 726. Le `programId` est résolu vers la ligne 768. FK CASCADE confirmé : `blocks → sets (CASCADE) → set_logs (CASCADE)`, `PRAGMA foreign_keys = ON`.

**Note :** Premier usage d'un exercice qualifié (poids null) : `shouldShowWarmup(0, 'fixed')` retourne `false` → warmup non affiché lors de `ExerciseStartingWeightPhase`. La WarmupPhase apparaîtra à partir de la séance suivante, quand le poids est renseigné. Comportement attendu et acceptable.

- [ ] **Step 1 : Retirer le bloc `Échauffement` de la définition bench press**

Dans le tableau PPL, exercice `'Développé couché barre'`, supprimer le bloc entier :
```typescript
// SUPPRIMER ces lignes :
{
  name: 'Échauffement',
  is_work: false,
  sets: [
    barOnly(10, 60),
    { reps_min: 5, weight: 40, weight_type: 'fixed', rest: 60 },
    { reps_min: 3, weight: 45, weight_type: 'fixed', rest: 90 },
  ],
},
```

L'entrée bench press doit devenir :
```typescript
{
  exercise: 'Développé couché barre',
  blocks: [
    {
      name: 'Travail',
      is_work: true,
      sets: [f(8, 120, 60), f(8, 120, 60), f(8, 120, 60), f(8, 120, 60)],
    },
    {
      name: 'Back-off',
      is_work: true,
      sets: [f(12, 60, null, 0.8)],
    },
  ],
},
```

- [ ] **Step 2 : Ajouter le DELETE cleanup dans `seedProgram`**

Dans `seedProgram`, immédiatement après que `programId` est résolu (après la ligne `programId = existingProgram.id;` / `programId = lastInsertRowId;` selon le cas — c'est-à-dire juste avant la boucle `for (let wi = 0; ...)`), ajouter :

```typescript
// Cleanup : supprimer les blocs Échauffement hardcodés (remplacés par WarmupPhase dynamique)
await db.runAsync(
  `DELETE FROM blocks WHERE name = 'Échauffement'
   AND workout_exercise_id IN (
     SELECT id FROM workout_exercises
     WHERE workout_id IN (SELECT id FROM workouts WHERE program_id = ?)
   )`,
  [programId]
);
```

- [ ] **Step 3 : Vérifier TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 erreurs.

- [ ] **Step 4 : Lancer tous les tests**

```bash
npx jest --no-coverage
```

Expected: PASS tous les suites (aucun test ne couvre les seeds directement).

- [ ] **Step 5 : Commit**

```bash
git add app/db/seeds.ts
git commit -m "feat(warmup): seeds — supprimer bloc Échauffement hardcodé bench + DELETE cleanup"
```

---

## Vérification finale

- [ ] Lancer la suite complète

```bash
npx jest --no-coverage
```

Expected: toutes les suites PASS.

- [ ] Vérifier TypeScript

```bash
cd app && npx tsc --noEmit
```

Expected: 0 erreurs.
