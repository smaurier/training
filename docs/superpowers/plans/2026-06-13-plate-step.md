# plate_step configurable — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre l'incrément de rondelle (`plate_step`) configurable dans Réglages, au lieu de 2 kg hardcodé partout.

**Architecture:** Ajouter `plateStep: number = 2` comme param optionnel aux deux fonctions pures (`applyDeload`, `computeWarmupSets`), propager à travers `DeloadService`, `SessionService`, `useSession`, `WarmupPhase`. Lire depuis settings KV au mount dans `[workoutId].tsx` et `reglages.tsx`. UI : `SegmentedControl` identique aux autres réglages, options kg/lbs selon `resolvedUnits`.

**Tech Stack:** React Native, Expo SDK 54, TypeScript strict, expo-sqlite, Jest

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `app/services/settingsUtils.ts` | Ajouter `getPlateStep(stored)` |
| `app/services/settingsUtils.test.ts` | Tests `getPlateStep` |
| `app/services/progression.ts` | `applyDeload(weight, plateStep=2)` |
| `app/services/progression.test.ts` | Nouveaux cas plateStep |
| `app/services/warmup.ts` | `computeWarmupSets(workWeight, plateStep=2)` |
| `app/services/warmup.test.ts` | Nouveaux cas plateStep |
| `app/services/DeloadService.ts` | `applyDeloadToExercises(exercises, plateStep=2)` |
| `app/services/DeloadService.test.ts` | Nouveau cas plateStep |
| `app/services/SessionService.ts` | `calculateProgressions(sessionLogId, plateStep=2)` |
| `app/services/SessionService.test.ts` | Nouveau cas plateStep |
| `app/components/session/WarmupPhase.tsx` | Prop `plateStep?: number` |
| `app/hooks/useSession.ts` | Param `plateStep=2`, passe aux 3 appels calculateProgressions |
| `app/app/(tabs)/reglages.tsx` | Section PROGRESSION + SegmentedControl |
| `app/app/session/[workoutId].tsx` | State plateStep, read settings, passe partout |

---

### Task 1: `getPlateStep` dans settingsUtils (TDD)

**Files:**
- Modify: `app/services/settingsUtils.ts`
- Test: `app/services/settingsUtils.test.ts`

- [ ] **Step 1: Écrire les tests**

Dans `app/services/settingsUtils.test.ts`, ajouter l'import de `getPlateStep` et ce describe à la fin du fichier :

```typescript
import { resolveTheme, resolveUnits, convertWeight, lbsToKg, getPlateStep } from './settingsUtils';
```

```typescript
describe('getPlateStep', () => {
  it('null → 2 (défaut)', () => expect(getPlateStep(null)).toBe(2));
  it("'2' → 2", () => expect(getPlateStep('2')).toBe(2));
  it("'1' → 1", () => expect(getPlateStep('1')).toBe(1));
  it("'1.25' → 1.25", () => expect(getPlateStep('1.25')).toBe(1.25));
  it("'2.5' → 2.5", () => expect(getPlateStep('2.5')).toBe(2.5));
  it("'5' → 5", () => expect(getPlateStep('5')).toBe(5));
  it("valeur invalide → 2", () => expect(getPlateStep('invalid')).toBe(2));
  it("'3' (hors liste) → 2", () => expect(getPlateStep('3')).toBe(2));
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="settingsUtils.test" --no-coverage 2>&1 | tail -10
```
Attendu : FAIL — `getPlateStep is not a function`

- [ ] **Step 3: Implémenter `getPlateStep`**

Dans `app/services/settingsUtils.ts`, ajouter à la fin :

```typescript
const VALID_PLATE_STEPS = [1, 1.25, 2, 2.5, 5] as const;
export type PlateStepValue = '1' | '1.25' | '2' | '2.5' | '5';

export function getPlateStep(stored: string | null): number {
  const n = parseFloat(stored ?? '');
  return (VALID_PLATE_STEPS as readonly number[]).includes(n) ? n : 2;
}
```

- [ ] **Step 4: Vérifier que les tests passent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="settingsUtils.test" --no-coverage 2>&1 | tail -10
```
Attendu : PASS — 8 nouveaux tests

- [ ] **Step 5: TypeScript check**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
```
Attendu : 0 erreur

- [ ] **Step 6: Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/services/settingsUtils.ts app/services/settingsUtils.test.ts && git commit -m "feat(settings): getPlateStep — TDD"
```

---

### Task 2: `applyDeload` — paramètre `plateStep` (TDD)

**Files:**
- Modify: `app/services/progression.ts`
- Test: `app/services/progression.test.ts`

- [ ] **Step 1: Ajouter les nouveaux cas de test**

Dans `app/services/progression.test.ts`, à l'intérieur du `describe('applyDeload', ...)` existant, ajouter après les cas existants :

```typescript
  it('plateStep 2.5 — applyDeload(60, 2.5) → 52.5', () => {
    // 60×0.9=54, floor(54/2.5)=21, 21×2.5=52.5
    expect(applyDeload(60, 2.5)).toBe(52.5);
  });
  it('plateStep 5 — applyDeload(65, 5) → 55', () => {
    // 65×0.9=58.5, floor(58.5/5)=11, 11×5=55
    expect(applyDeload(65, 5)).toBe(55);
  });
  it('plateStep 1.25 — applyDeload(100, 1.25) → 90', () => {
    // 100×0.9=90, floor(90/1.25)=72, 72×1.25=90
    expect(applyDeload(100, 1.25)).toBe(90);
  });
  it('défaut plateStep=2 — comportement inchangé', () => {
    expect(applyDeload(60)).toBe(54);
  });
```

- [ ] **Step 2: Vérifier que les nouveaux tests échouent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="progression.test" --no-coverage 2>&1 | tail -15
```
Attendu : 4 failures sur les nouveaux cas (Expected: 52.5, Received: 54 etc.)

- [ ] **Step 3: Modifier `applyDeload`**

Dans `app/services/progression.ts`, remplacer (ligne ~57-59) :

```typescript
export function applyDeload(weight: number): number {
  return Math.floor((weight * 0.9) / 2) * 2;
}
```

par :

```typescript
export function applyDeload(weight: number, plateStep: number = 2): number {
  return Math.floor((weight * 0.9) / plateStep) * plateStep;
}
```

- [ ] **Step 4: Vérifier que tous les tests passent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="progression.test" --no-coverage 2>&1 | tail -10
```
Attendu : PASS (tous les anciens + 4 nouveaux)

- [ ] **Step 5: TypeScript check + commit**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
cd /c/Users/sylva/projects/training-app && git add app/services/progression.ts app/services/progression.test.ts && git commit -m "feat(progression): applyDeload accepte plateStep — défaut 2"
```

---

### Task 3: `computeWarmupSets` — paramètre `plateStep` (TDD)

**Files:**
- Modify: `app/services/warmup.ts`
- Test: `app/services/warmup.test.ts`

- [ ] **Step 1: Ajouter les nouveaux cas de test**

Dans `app/services/warmup.test.ts`, à l'intérieur du `describe('computeWarmupSets', ...)` existant, ajouter après les cas existants :

```typescript
  it('plateStep 2.5 — 100 kg → 40/60/80 (multiples de 2.5)', () => {
    // 100×0.4=40, floor(40/2.5)×2.5=40
    // 100×0.6=60, floor(60/2.5)×2.5=60
    // 100×0.8=80, floor(80/2.5)×2.5=80
    expect(computeWarmupSets(100, 2.5)).toEqual([
      { weight: 40, reps: 8, rest: 60, percent: 40 },
      { weight: 60, reps: 5, rest: 60, percent: 60 },
      { weight: 80, reps: 2, rest: 90, percent: 80 },
    ]);
  });
  it('plateStep 5 — 65 kg → 25/35/50 (multiples de 5)', () => {
    // 65×0.4=26, floor(26/5)×5=25
    // 65×0.6=39, floor(39/5)×5=35
    // 65×0.8=52, floor(52/5)×5=50
    expect(computeWarmupSets(65, 5)).toEqual([
      { weight: 25, reps: 8, rest: 60, percent: 40 },
      { weight: 35, reps: 5, rest: 60, percent: 60 },
      { weight: 50, reps: 2, rest: 90, percent: 80 },
    ]);
  });
  it('défaut plateStep=2 — comportement inchangé', () => {
    expect(computeWarmupSets(60)).toEqual([
      { weight: 24, reps: 8, rest: 60, percent: 40 },
      { weight: 36, reps: 5, rest: 60, percent: 60 },
      { weight: 48, reps: 2, rest: 90, percent: 80 },
    ]);
  });
```

- [ ] **Step 2: Vérifier que les nouveaux tests échouent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="warmup.test" --no-coverage 2>&1 | tail -15
```
Attendu : 3 failures sur les nouveaux cas

- [ ] **Step 3: Modifier `computeWarmupSets`**

Dans `app/services/warmup.ts`, remplacer la fonction entière :

```typescript
export function computeWarmupSets(workWeight: number, plateStep: number = 2): WarmupSet[] {
  const roundPlate = (w: number) => Math.floor(w / plateStep) * plateStep;
  return [
    { weight: roundPlate(workWeight * 0.4), reps: 8, rest: 60, percent: 40 },
    { weight: roundPlate(workWeight * 0.6), reps: 5, rest: 60, percent: 60 },
    { weight: roundPlate(workWeight * 0.8), reps: 2, rest: 90, percent: 80 },
  ];
}
```

- [ ] **Step 4: Vérifier que tous les tests passent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="warmup.test" --no-coverage 2>&1 | tail -10
```
Attendu : PASS (tous les anciens + 3 nouveaux)

- [ ] **Step 5: TypeScript check + commit**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
cd /c/Users/sylva/projects/training-app && git add app/services/warmup.ts app/services/warmup.test.ts && git commit -m "feat(warmup): computeWarmupSets accepte plateStep — défaut 2"
```

---

### Task 4: `applyDeloadToExercises` — passer `plateStep` (DeloadService)

**Files:**
- Modify: `app/services/DeloadService.ts`
- Test: `app/services/DeloadService.test.ts`

- [ ] **Step 1: Ajouter un cas de test plateStep dans DeloadService.test.ts**

Dans `app/services/DeloadService.test.ts`, à la fin du `describe('applyDeloadToExercises', ...)` existant (après le dernier `it`), ajouter :

```typescript
  it('utilise le plateStep fourni — 65 kg avec plateStep=5 → 55 kg', () => {
    const exercises = [{
      id: 1, workout_id: 1, order_index: 0,
      exercise: { id: 10, name: 'Squat', type: 'musculation' as const, technical_notes: null, muscle_groups: '[]', description: null },
      blocks: [{
        id: 1, name: 'Travail', order_index: 0, is_work_block: 1 as const,
        sets: [{ id: 1, block_id: 1, order_index: 0, reps_min: 5, rest_duration: 120, weight: 65, weight_type: 'fixed' as const, duration_seconds: null, weight_ratio: null }],
      }],
    }];
    const result = applyDeloadToExercises(exercises, 5);
    // applyDeload(65, 5) = floor(58.5/5)*5 = 11*5 = 55
    expect(result[0].blocks[0].sets[0].weight).toBe(55);
  });
```

- [ ] **Step 2: Vérifier que le nouveau test échoue**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="DeloadService.test" --no-coverage 2>&1 | tail -15
```
Attendu : 1 failure (Expected: 55, Received: 58)

- [ ] **Step 3: Modifier `applyDeloadToExercises`**

Dans `app/services/DeloadService.ts`, remplacer la fonction (lignes 45-60) :

```typescript
export function applyDeloadToExercises(
  exercises: WorkoutExerciseDetail[],
  plateStep: number = 2,
): WorkoutExerciseDetail[] {
  return exercises.map(ex => ({
    ...ex,
    blocks: ex.blocks.map(block => ({
      ...block,
      sets: block.sets.map(set => ({
        ...set,
        weight: set.weight !== null && set.weight_type === 'fixed'
          ? applyDeload(set.weight, plateStep)
          : set.weight,
      })),
    })),
  }));
}
```

- [ ] **Step 4: Vérifier que tous les tests passent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="DeloadService.test" --no-coverage 2>&1 | tail -10
```
Attendu : PASS

- [ ] **Step 5: TypeScript check + commit**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
cd /c/Users/sylva/projects/training-app && git add app/services/DeloadService.ts app/services/DeloadService.test.ts && git commit -m "feat(deload): applyDeloadToExercises accepte plateStep — défaut 2"
```

---

### Task 5: `calculateProgressions` — passer `plateStep` (SessionService)

**Files:**
- Modify: `app/services/SessionService.ts`
- Test: `app/services/SessionService.test.ts`

- [ ] **Step 1: Ajouter un cas de test plateStep dans SessionService.test.ts**

Dans `app/services/SessionService.test.ts`, à l'intérieur du `describe('SessionService.calculateProgressions', ...)` existant, ajouter après le test "applique le décharge si deux échecs significatifs consécutifs" :

```typescript
  it('utilise le plateStep fourni pour le décharge auto — plateStep=5 → 70 kg', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const { exercise, workout, set } = await seedWorkoutWithExercise(ctx, 1);
    // set.weight = 80, reps_min = 6

    // Session 1 : échec significatif (reps_done=4, reps_min=6, 4 ≤ 6-2)
    const session1 = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 3 });
    await service.logSet(session1.id, set.id, exercise.id, { repsDone: 4, weightDone: 80, rpe: 9 });
    await service.completeSession(session1.id);

    // Session 2 : échec significatif → décharge avec plateStep=5
    const session2 = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 3 });
    await service.logSet(session2.id, set.id, exercise.id, { repsDone: 4, weightDone: 80, rpe: 9 });
    await service.completeSession(session2.id);

    const progressions = await service.calculateProgressions(session2.id, 5);
    // applyDeload(80, 5) = floor(72/5)*5 = 14*5 = 70
    expect(progressions[0].newWeight).toBe(70);
    const updatedSet = await ctx.setRepo.findById(set.id);
    expect(updatedSet?.weight).toBe(70);
  });
```

- [ ] **Step 2: Vérifier que le nouveau test échoue**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="SessionService.test" --no-coverage 2>&1 | tail -15
```
Attendu : 1 failure (Expected: 70, Received: 72)

- [ ] **Step 3: Modifier `calculateProgressions` dans SessionService.ts**

Localiser la signature de `calculateProgressions` (`async calculateProgressions(sessionLogId: number)`) et remplacer par :

```typescript
async calculateProgressions(sessionLogId: number, plateStep: number = 2): Promise<ProgressionResult[]> {
```

Puis trouver la ligne `const newWeight = applyDeload(oldWeight);` (dans la branche `isSessionSignificantFailure`) et remplacer par :

```typescript
const newWeight = applyDeload(oldWeight, plateStep);
```

- [ ] **Step 4: Vérifier que tous les tests passent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="SessionService.test" --no-coverage 2>&1 | tail -10
```
Attendu : PASS (tous les tests existants + 1 nouveau)

- [ ] **Step 5: TypeScript check + commit**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
cd /c/Users/sylva/projects/training-app && git add app/services/SessionService.ts app/services/SessionService.test.ts && git commit -m "feat(session): calculateProgressions accepte plateStep — défaut 2"
```

---

### Task 6: Thread `plateStep` — `WarmupPhase.tsx` + `useSession.ts`

**Files:**
- Modify: `app/components/session/WarmupPhase.tsx`
- Modify: `app/hooks/useSession.ts`

Pas de nouveaux tests : les fonctions pures sont testées en T2/T3. Le threading est mécanique.

- [ ] **Step 1: Modifier `WarmupPhase.tsx`**

Dans `app/components/session/WarmupPhase.tsx` :

Remplacer l'interface et la signature :

```typescript
interface WarmupPhaseProps {
  exerciseName: string;
  workWeight: number;
  plateStep?: number;
  onStart: () => void;
}

export function WarmupPhase({ exerciseName, workWeight, plateStep = 2, onStart }: WarmupPhaseProps) {
```

Remplacer la ligne `const sets = computeWarmupSets(workWeight);` par :

```typescript
  const sets = computeWarmupSets(workWeight, plateStep);
```

- [ ] **Step 2: Modifier `useSession.ts`**

Localiser la signature de `useSession` (ligne ~115) :

```typescript
export function useSession(
  workoutId: number,
  workoutDetails: WorkoutExerciseDetail[],
  initialSession?: InitialSession,
): UseSessionResult {
```

Remplacer par :

```typescript
export function useSession(
  workoutId: number,
  workoutDetails: WorkoutExerciseDetail[],
  initialSession?: InitialSession,
  plateStep: number = 2,
): UseSessionResult {
```

Puis localiser les 3 appels `service.calculateProgressions(sessionLogId)` (lignes ~190, 248, 284) et remplacer chacun par :

```typescript
service.calculateProgressions(sessionLogId, plateStep)
```

- [ ] **Step 3: TypeScript check**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
```
Attendu : 0 erreur

- [ ] **Step 4: Tests**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --no-coverage 2>&1 | tail -10
```
Attendu : tous les tests passent

- [ ] **Step 5: Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/components/session/WarmupPhase.tsx app/hooks/useSession.ts && git commit -m "feat(warmup,session): thread plateStep dans WarmupPhase + useSession"
```

---

### Task 7: UI — `reglages.tsx` + `[workoutId].tsx`

**Files:**
- Modify: `app/app/(tabs)/reglages.tsx`
- Modify: `app/app/session/[workoutId].tsx`

- [ ] **Step 1: Modifier `reglages.tsx`**

Ajouter l'import en tête de fichier :

```typescript
import { getPlateStep, PlateStepValue } from '@/services/settingsUtils';
```

Ajouter après `UNITS_OPTIONS` les constantes d'options :

```typescript
const PLATE_STEP_OPTIONS_KG: { value: PlateStepValue; label: string }[] = [
  { value: '1', label: '1 kg' },
  { value: '2', label: '2 kg' },
  { value: '2.5', label: '2,5 kg' },
  { value: '5', label: '5 kg' },
];

const PLATE_STEP_OPTIONS_LBS: { value: PlateStepValue; label: string }[] = [
  { value: '1.25', label: '2,5 lbs' },
  { value: '2.5', label: '5 lbs' },
  { value: '5', label: '10 lbs' },
];
```

Dans `ReglagesScreen`, ajouter le state et l'effet après `deloadWeeksStr` :

```typescript
  const [plateStepValue, setPlateStepValue] = useState<PlateStepValue>('2');

  useEffect(() => {
    const repo = new SQLiteSettingsRepository(getDb());
    repo.get('plate_step').then(v => {
      const valid: PlateStepValue[] = ['1', '1.25', '2', '2.5', '5'];
      if (v && valid.includes(v as PlateStepValue)) {
        setPlateStepValue(v as PlateStepValue);
      }
    }).catch(console.error);
  }, []);

  const handlePlateStepChange = useCallback(async (v: PlateStepValue) => {
    setPlateStepValue(v);
    const repo = new SQLiteSettingsRepository(getDb());
    await repo.set('plate_step', v);
  }, []);
```

Ajouter la section PROGRESSION dans le JSX, entre la section DÉCHARGE AUTOMATIQUE et DONNÉES :

```tsx
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PROGRESSION</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.hint, { color: colors.textSecondary, marginBottom: 8 }]}>
          Incrément minimal lors des calculs de poids (décharge, échauffement)
        </Text>
        <SegmentedControl
          options={resolvedUnits === 'lbs' ? PLATE_STEP_OPTIONS_LBS : PLATE_STEP_OPTIONS_KG}
          selected={plateStepValue}
          onSelect={handlePlateStepChange}
          colors={colors}
          isDark={isDark}
        />
      </View>
```

- [ ] **Step 2: Modifier `[workoutId].tsx`**

Ajouter l'import :

```typescript
import { getPlateStep } from '@/services/settingsUtils';
```

Dans `SessionContent`, ajouter le state et l'effet après `deloadSuggested` :

```typescript
  const [plateStep, setPlateStep] = useState<number>(2);

  useEffect(() => {
    const repo = new SQLiteSettingsRepository(getDb());
    repo.get('plate_step').then(v => setPlateStep(getPlateStep(v))).catch(console.error);
  }, []);
```

Modifier l'appel `useSession` (ligne ~139) :

```typescript
  const session = useSession(workoutId, deloadedExercises, initialSession, plateStep);
```

Modifier le `useMemo` de `deloadedExercises` (ajouter `plateStep` dans la liste des dépendances et le passer à la fonction) :

```typescript
  const deloadedExercises = useMemo(
    () => isDeloadSession ? applyDeloadToExercises(resolvedExercises, plateStep) : resolvedExercises,
    [isDeloadSession, resolvedExercises, plateStep],
  );
```

Dans le JSX `<WarmupPhase ...>`, ajouter `plateStep={plateStep}` :

```tsx
          <WarmupPhase
            exerciseName={session.currentExercise.exercise.name}
            workWeight={session.warmupWorkWeight}
            plateStep={plateStep}
            onStart={session.confirmWarmup}
          />
```

- [ ] **Step 3: TypeScript check**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
```
Attendu : 0 erreur

- [ ] **Step 4: Tests complets**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --no-coverage 2>&1 | tail -10
```
Attendu : tous les tests passent

- [ ] **Step 5: Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add "app/app/(tabs)/reglages.tsx" app/app/session/[workoutId].tsx && git commit -m "feat(reglages): plate_step configurable — SegmentedControl kg/lbs"
```

---

## Self-Review

**Spec coverage :**
- ✅ `getPlateStep()` → T1
- ✅ `applyDeload(weight, plateStep=2)` → T2
- ✅ `computeWarmupSets(workWeight, plateStep=2)` → T3
- ✅ `applyDeloadToExercises(exercises, plateStep=2)` → T4
- ✅ `calculateProgressions(sessionLogId, plateStep=2)` → T5
- ✅ `WarmupPhase.plateStep` prop → T6
- ✅ `useSession` 4e param → T6
- ✅ `reglages.tsx` section PROGRESSION + SegmentedControl kg/lbs → T7
- ✅ `[workoutId].tsx` state + read settings + passe à useSession/WarmupPhase/applyDeloadToExercises → T7
- ✅ Options kg (1/2/2.5/5) et lbs (2.5/5/10 → 1.25/2.5/5 interne) → T7
- ✅ Défaut 2 partout (rétrocompat) → T2–T6
- ✅ Tests: 8 (getPlateStep) + 4 (applyDeload) + 3 (computeWarmupSets) + 1 (applyDeloadToExercises) + 1 (calculateProgressions) = 17 nouveaux tests

**Placeholders :** aucun.

**Type consistency :** `PlateStepValue` défini en T1, réutilisé en T7. `plateStep: number` cohérent T2→T7.
