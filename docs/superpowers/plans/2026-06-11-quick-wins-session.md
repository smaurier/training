# Quick Wins Séance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 quick UX improvements to RunningPhase: PR badge flash, reps feedback hint, RPE chips, and in-session weight adjustment stepper.

**Architecture:** F3 and F2 are pure UI changes in RunningPhase with no service dependencies. F1 threads an `isPR` boolean from `SessionService.logSet` → `useSession.validateSet` → `[workoutId].tsx` overlay. F4 adds a new BottomSheet stepper in RunningPhase wired to the existing `session.setStartingWeight`.

**Tech Stack:** React Native, TypeScript strict, Jest (InMemory repos), `@gorhom/bottom-sheet`, `expo-sqlite`

---

## File Map

| File | Action | Reason |
|------|--------|--------|
| `app/services/repsFeedback.ts` | Create | Pure function for F2 — unit-testable in isolation |
| `app/services/repsFeedback.test.ts` | Create | TDD for F2 |
| `app/services/SessionService.ts` | Modify | F1: `logSet` returns `{ setLog, isPR }` |
| `app/services/SessionService.test.ts` | Modify | Update 3 tests + add 4 isPR tests |
| `app/hooks/useSession.ts` | Modify | F1: `validateSet` returns `Promise<boolean>` |
| `app/app/session/[workoutId].tsx` | Modify | F1: PR badge overlay + wrap onValidate |
| `app/components/session/RunningPhase.tsx` | Modify | F2 hint + F3 RPE chips + F4 stepper |

---

## Task 1: F2 — repsFeedback pure function (TDD)

**Files:**
- Create: `app/services/repsFeedback.ts`
- Create: `app/services/repsFeedback.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `app/services/repsFeedback.test.ts`:

```typescript
import { computeRepsFeedback } from './repsFeedback';

describe('computeRepsFeedback', () => {
  it('retourne null si bodyweight', () => {
    expect(computeRepsFeedback('10', 5, 8, true)).toBeNull();
  });
  it('retourne null si reps vide', () => {
    expect(computeRepsFeedback('', 5, 8, false)).toBeNull();
  });
  it('retourne null si reps non-numérique', () => {
    expect(computeRepsFeedback('abc', 5, 8, false)).toBeNull();
  });
  it('retourne null si dans la plage cible', () => {
    expect(computeRepsFeedback('6', 5, 8, false)).toBeNull();
  });
  it('retourne null exactement à reps_max * 1.25', () => {
    // 8 * 1.25 = 10 → pas au-dessus → null
    expect(computeRepsFeedback('10', 5, 8, false)).toBeNull();
  });
  it('retourne message "dépasse" si reps > reps_max * 1.25', () => {
    // 8 * 1.25 = 10, 11 dépasse
    expect(computeRepsFeedback('11', 5, 8, false)).toBe(
      "Tu dépasses la cible — envisage d'augmenter le poids."
    );
  });
  it('retourne null exactement à reps_min * 0.75', () => {
    // 5 * 0.75 = 3.75, 4 >= 3.75 → null
    expect(computeRepsFeedback('4', 5, 8, false)).toBeNull();
  });
  it('retourne message "en dessous" si reps < reps_min * 0.75', () => {
    // 5 * 0.75 = 3.75, 3 < 3.75
    expect(computeRepsFeedback('3', 5, 8, false)).toBe(
      "Tu es en dessous de la cible — le poids est peut-être trop lourd."
    );
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd app && npx jest services/repsFeedback.test.ts --no-coverage
```

Expected: `Cannot find module './repsFeedback'`

- [ ] **Step 3: Implement the function**

Create `app/services/repsFeedback.ts`:

```typescript
export function computeRepsFeedback(
  repsStr: string,
  repsMin: number,
  repsMax: number,
  isBodyweight: boolean,
): string | null {
  if (isBodyweight) return null;
  const parsed = parseInt(repsStr, 10);
  if (isNaN(parsed)) return null;
  if (parsed > repsMax * 1.25) return "Tu dépasses la cible — envisage d'augmenter le poids.";
  if (parsed < repsMin * 0.75) return "Tu es en dessous de la cible — le poids est peut-être trop lourd.";
  return null;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd app && npx jest services/repsFeedback.test.ts --no-coverage
```

Expected: 8 tests PASS

- [ ] **Step 5: Commit**

```bash
cd app && git add services/repsFeedback.ts services/repsFeedback.test.ts
git commit -m "feat(session): computeRepsFeedback — feedback proportionnel écart reps"
```

---

## Task 2: F1 — SessionService.logSet retourne isPR

**Files:**
- Modify: `app/services/SessionService.ts` (lines 68-97)
- Modify: `app/services/SessionService.test.ts`

- [ ] **Step 1: Ajouter les tests isPR**

Dans `app/services/SessionService.test.ts`, ajouter à la fin du `describe('SessionService.logSet')` (après la ligne 112, avant le `}`):

```typescript
  it('retourne isPR: true si premier log avec poids > 0', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const session = await service.startSession(1, { checkin_energy: null, checkin_fatigue: null, checkin_sleep: null });
    const result = await service.logSet(session.id, 10, 5, { repsDone: 5, weightDone: 80, rpe: null });
    expect(result.isPR).toBe(true);
  });
  it('retourne isPR: true si 1RM dépasse le meilleur existant', async () => {
    const ctx = makeService();
    const service = ctx.build();
    await ctx.prRepo.save({ exercise_id: 5, weight: 80, reps: 5, estimated_1rm: 93.3, achieved_at: '2026-01-01T00:00:00.000Z', session_log_id: null });
    const session = await service.startSession(1, { checkin_energy: null, checkin_fatigue: null, checkin_sleep: null });
    // 100 * (1 + 5/30) ≈ 116.67 > 93.3
    const result = await service.logSet(session.id, 10, 5, { repsDone: 5, weightDone: 100, rpe: null });
    expect(result.isPR).toBe(true);
  });
  it('retourne isPR: false si 1RM inférieur au meilleur existant', async () => {
    const ctx = makeService();
    const service = ctx.build();
    await ctx.prRepo.save({ exercise_id: 5, weight: 120, reps: 1, estimated_1rm: 124, achieved_at: '2026-01-01T00:00:00.000Z', session_log_id: null });
    const session = await service.startSession(1, { checkin_energy: null, checkin_fatigue: null, checkin_sleep: null });
    const result = await service.logSet(session.id, 10, 5, { repsDone: 5, weightDone: 80, rpe: null });
    expect(result.isPR).toBe(false);
  });
  it('retourne isPR: false si weightDone = 0', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const session = await service.startSession(1, { checkin_energy: null, checkin_fatigue: null, checkin_sleep: null });
    const result = await service.logSet(session.id, 10, 5, { repsDone: 10, weightDone: 0, rpe: null });
    expect(result.isPR).toBe(false);
  });
```

- [ ] **Step 2: Mettre à jour les 3 tests existants qui utilisent le retour de logSet**

Dans `app/services/SessionService.test.ts`, remplacer les lignes qui font `const setLog = await service.logSet(...)` par destructuring :

Ligne ~56 :
```typescript
    const { setLog } = await service.logSet(session.id, 10, 5, { repsDone: 7, weightDone: 80, rpe: 8 });
```

Ligne ~95 :
```typescript
    const { setLog } = await service.logSet(session.id, 10, 5, { repsDone: 8, weightDone: 60, rpe: null });
```

Lignes ~103-110 :
```typescript
    const { setLog } = await service.logSet(session.id, 10, 5, {
      repsDone: 1,
      weightDone: 0,
      rpe: null,
      durationSeconds: 1800,
      distanceMeters: 5000,
    });
    expect(setLog.duration_seconds).toBe(1800);
    expect(setLog.distance_meters).toBe(5000);
```

- [ ] **Step 3: Run tests — verify the new ones fail, old ones still fail (type error)**

```bash
cd app && npx jest services/SessionService.test.ts --no-coverage
```

Expected: erreurs TypeScript sur le type de retour de `logSet`

- [ ] **Step 4: Modifier SessionService.logSet**

Dans `app/services/SessionService.ts`, remplacer la méthode `logSet` (lignes 68-97) :

```typescript
  async logSet(sessionLogId: number, setId: number, exerciseId: number, actual: SetActual): Promise<{ setLog: SetLog; isPR: boolean }> {
    const setLog = await this.setLogRepo.save({
      session_log_id: sessionLogId,
      set_id: setId,
      exercise_id: exerciseId,
      reps_done: actual.repsDone,
      weight_done: actual.weightDone,
      rpe: actual.rpe,
      duration_seconds: actual.durationSeconds ?? null,
      distance_meters: actual.distanceMeters ?? null,
      completed_at: new Date().toISOString(),
    });

    let isPR = false;
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
        isPR = true;
      }
    }

    return { setLog, isPR };
  }
```

- [ ] **Step 5: Run tests — verify all pass**

```bash
cd app && npx jest services/SessionService.test.ts --no-coverage
```

Expected: tous les tests PASS (anciens + nouveaux isPR)

- [ ] **Step 6: Commit**

```bash
cd app && git add services/SessionService.ts services/SessionService.test.ts
git commit -m "feat(session): SessionService.logSet retourne isPR — détection PR en temps réel"
```

---

## Task 3: F1 — useSession.validateSet retourne isPR

**Files:**
- Modify: `app/hooks/useSession.ts`

- [ ] **Step 1: Mettre à jour l'interface UseSessionResult**

Dans `app/hooks/useSession.ts`, ligne 37, remplacer :

```typescript
  validateSet: (actual: SetActual) => Promise<void>;
```

par :

```typescript
  validateSet: (actual: SetActual) => Promise<boolean>;
```

- [ ] **Step 2: Mettre à jour l'implémentation de validateSet**

Dans `app/hooks/useSession.ts`, remplacer la fonction `validateSet` (lignes 155-196) :

```typescript
  const validateSet = useCallback(async (actual: SetActual): Promise<boolean> => {
    if (!sessionLogId || !currentSet || !currentExercise) return false;
    try {
      const { isPR } = await service.logSet(sessionLogId, currentSet.id, currentExercise.exercise.id, actual);
      positionHistory.current.push({ position: { ...position }, setId: currentSet.id });
      setHistorySize(n => n + 1);
      setTotalSetsLogged(n => n + 1);
      setTotalVolume(n => n + (actual.weightDone ?? 0) * (actual.repsDone ?? 0));

      const completedRestDuration = currentSet.rest_duration;
      const next = advancePosition(position, workoutDetails);

      if (next === null) {
        await service.completeSession(sessionLogId);
        try {
          const progs = await service.calculateProgressions(sessionLogId);
          setProgressions(progs);
        } catch {
          setProgressions([]);
        }
        setPhase('summary');
        return isPR;
      }

      const exerciseChanges = next.exerciseIdx !== position.exerciseIdx;
      if (exerciseChanges) setStartingWeightDone(false);

      if (completedRestDuration === 0) {
        setPosition(next);
        setPhase(exerciseChanges ? 'exercise_transition' : 'running');
        return isPR;
      }

      setRestDuration(completedRestDuration);
      setPendingPhase(exerciseChanges ? 'exercise_transition' : 'running');
      setNextLabel(computeNextLabel(next, workoutDetails, exerciseChanges));
      setPosition(next);
      setPhase('rest');
      return isPR;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur validation série');
      return false;
    }
  }, [service, sessionLogId, currentSet, currentExercise, position, workoutDetails]);
```

- [ ] **Step 3: Vérifier typecheck**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 erreurs

- [ ] **Step 4: Run all tests**

```bash
cd app && npx jest --no-coverage
```

Expected: tous PASS (les tests useSession existants compilent car `Promise<boolean>` est compatible avec `await`)

- [ ] **Step 5: Commit**

```bash
cd app && git add hooks/useSession.ts
git commit -m "feat(session): useSession.validateSet retourne isPR"
```

---

## Task 4: F1 — Badge PR overlay dans [workoutId].tsx

**Files:**
- Modify: `app/app/session/[workoutId].tsx`

- [ ] **Step 1: Ajouter les imports manquants**

Dans `app/app/session/[workoutId].tsx`, ligne 2, modifier l'import react :

```typescript
import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
```

Ligne 3, modifier l'import react-native :

```typescript
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
```

Ajouter après les imports existants (ligne 16) :

```typescript
import type { SetActual } from '@/services/SessionService';
```

- [ ] **Step 2: Ajouter le state badge et le handler**

Dans `SessionScreen`, après le state `summaryDurationSeconds` (ligne 65), ajouter :

```typescript
  const [prBadge, setPrBadge] = useState<string | null>(null);
  const prBadgeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (prBadgeTimeout.current) clearTimeout(prBadgeTimeout.current);
    };
  }, []);

  const handleValidate = useCallback(async (actual: SetActual) => {
    const isPR = await session.validateSet(actual);
    if (isPR && session.currentExercise) {
      const name = session.currentExercise.exercise.name;
      if (prBadgeTimeout.current) clearTimeout(prBadgeTimeout.current);
      setPrBadge(name);
      AccessibilityInfo.announceForAccessibility('Nouveau record personnel !');
      prBadgeTimeout.current = setTimeout(() => setPrBadge(null), 3000);
    }
  }, [session]);
```

- [ ] **Step 3: Passer handleValidate à RunningPhase**

Dans le JSX de `[workoutId].tsx`, remplacer `onValidate={session.validateSet}` par :

```typescript
              onValidate={handleValidate}
```

- [ ] **Step 4: Ajouter le badge overlay dans le JSX**

Juste avant `</>` final du return (après `</View>`), ajouter :

```tsx
      {prBadge !== null && (
        <View style={styles.prBadge} pointerEvents="none">
          <Text style={styles.prBadgeIcon}>🏆</Text>
          <Text style={styles.prBadgeTitle}>Nouveau PR !</Text>
          <Text style={styles.prBadgeSub} numberOfLines={1}>{prBadge}</Text>
        </View>
      )}
```

- [ ] **Step 5: Ajouter les styles du badge**

Dans `StyleSheet.create` à la fin du fichier, ajouter :

```typescript
  prBadge: {
    position: 'absolute',
    top: 64,
    alignSelf: 'center',
    backgroundColor: '#ca8a04',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    zIndex: 100,
    alignItems: 'center',
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  prBadgeIcon: { fontSize: 24 },
  prBadgeTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  prBadgeSub: { color: '#fef3c7', fontSize: 13, maxWidth: 200 },
```

- [ ] **Step 6: Typecheck**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 erreurs

- [ ] **Step 7: Commit**

```bash
cd app && git add "app/session/[workoutId].tsx"
git commit -m "feat(session): badge PR flash — overlay 3s non-bloquant après validation série"
```

---

## Task 5: F3 — RPE chips dans RunningPhase

**Files:**
- Modify: `app/components/session/RunningPhase.tsx`

- [ ] **Step 1: Ajouter la constante RPE_OPTIONS**

Dans `app/components/session/RunningPhase.tsx`, après les imports (avant la définition de `RunningPhaseProps`, ligne 22), ajouter :

```typescript
const RPE_OPTIONS = [
  { label: 'Facile', value: '3' },
  { label: 'Normal', value: '6' },
  { label: 'Difficile', value: '9' },
] as const;
```

- [ ] **Step 2: Remplacer le bloc RPE TextInput par les chips**

Dans `RunningPhase`, localiser le `<View style={styles.inputGroup}>` qui contient `RPE (1–10)` (lignes ~346-358). Remplacer ce bloc entier par :

```tsx
            <View style={styles.rpeSection}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>RESSENTI (OPTIONNEL)</Text>
              <View style={styles.rpeRow}>
                {RPE_OPTIONS.map(opt => (
                  <PressableA11y
                    key={opt.value}
                    accessibilityLabel={`Ressenti : ${opt.label}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: rpe === opt.value }}
                    onPress={() => setRpe(rpe === opt.value ? '' : opt.value)}
                    style={[
                      styles.rpeChip,
                      {
                        borderColor: colors.border,
                        backgroundColor: rpe === opt.value ? colors.primary : colors.surface,
                      },
                    ]}
                  >
                    <Text style={[styles.rpeChipText, { color: rpe === opt.value ? '#fff' : colors.text }]}>
                      {opt.label}
                    </Text>
                  </PressableA11y>
                ))}
              </View>
            </View>
```

- [ ] **Step 3: Ajouter les styles RPE**

Dans `StyleSheet.create` à la fin du fichier, ajouter :

```typescript
  rpeSection: { gap: 6 },
  rpeRow: { flexDirection: 'row', gap: 8 },
  rpeChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    minHeight: 44,
  },
  rpeChipText: { fontSize: 14, fontWeight: '500' },
```

- [ ] **Step 4: Typecheck + tests**

```bash
cd app && npx tsc --noEmit && npx jest --no-coverage
```

Expected: 0 erreurs TypeScript, tous tests PASS

- [ ] **Step 5: Commit**

```bash
cd app && git add components/session/RunningPhase.tsx
git commit -m "feat(session): RPE — remplace TextInput libre par chips Facile/Normal/Difficile"
```

---

## Task 6: F2 — Feedback reps inline dans RunningPhase

**Files:**
- Modify: `app/components/session/RunningPhase.tsx`

- [ ] **Step 1: Importer computeRepsFeedback**

Dans `app/components/session/RunningPhase.tsx`, ajouter à la fin des imports (après la ligne `import { lbsToKg } from '@/services/settingsUtils';`) :

```typescript
import { computeRepsFeedback } from '@/services/repsFeedback';
```

- [ ] **Step 2: Ajouter la valeur dérivée repsFeedback**

Dans le corps de `RunningPhase`, juste avant le `return` principal, ajouter :

```typescript
  const repsFeedback = computeRepsFeedback(
    reps,
    set.reps_min,
    set.reps_max,
    set.weight_type === 'bodyweight',
  );
```

- [ ] **Step 3: Afficher repsFeedback sous le bouton Valider**

Dans le JSX du bloc `isDuration === false && isCardio === false` (section reps/poids), localiser le bouton Valider et ajouter juste après :

```tsx
          {repsFeedback !== null && (
            <Text
              style={[styles.repsFeedback, { color: colors.textSecondary }]}
              accessibilityLiveRegion="polite"
            >
              {repsFeedback}
            </Text>
          )}
```

- [ ] **Step 4: Ajouter le style repsFeedback**

Dans `StyleSheet.create`, ajouter :

```typescript
  repsFeedback: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
```

- [ ] **Step 5: Typecheck + tests**

```bash
cd app && npx tsc --noEmit && npx jest --no-coverage
```

Expected: 0 erreurs, tous tests PASS

- [ ] **Step 6: Commit**

```bash
cd app && git add components/session/RunningPhase.tsx
git commit -m "feat(session): feedback reps — hint inline si écart > 25% cible"
```

---

## Task 7: F4 — Stepper poids dans RunningPhase

**Files:**
- Modify: `app/components/session/RunningPhase.tsx`
- Modify: `app/app/session/[workoutId].tsx`

- [ ] **Step 1: Ajouter le prop onAdjustWeight à RunningPhaseProps**

Dans `app/components/session/RunningPhase.tsx`, dans l'interface `RunningPhaseProps` (lignes 22-33), ajouter :

```typescript
  onAdjustWeight?: (kg: number) => Promise<void>;
```

- [ ] **Step 2: Ajouter les refs et states du stepper**

Dans le corps de `RunningPhase`, après les états existants (`loading`, `countdown`, etc.), ajouter :

```typescript
  const adjustWeightSheetRef = useRef<BottomSheet>(null);
  const adjustWeightSnapPoints = useMemo(() => ['45%'], []);
  const [adjustedWeight, setAdjustedWeight] = useState(set.weight ?? 0);
  const [adjustSuccess, setAdjustSuccess] = useState(false);
  const weightStep = unitResolved === 'lbs' ? lbsToKg(5) : 2.5;
```

- [ ] **Step 3: Destructurer onAdjustWeight depuis les props**

Modifier la ligne de destructuring des props :

```typescript
export function RunningPhase({ exercise, block, set, progressLabel, onValidate, onSkip, onSkipExercise, onUndo, canUndo, lastSetLog, onAdjustWeight }: RunningPhaseProps) {
```

- [ ] **Step 4: Ajouter le bouton barbell dans headerActions**

Dans le JSX, dans `<View style={styles.headerActions}>`, ajouter en premier (avant le bouton description) :

```tsx
            {set.weight_type !== 'bodyweight' && onAdjustWeight && (
              <PressableA11y
                onPress={() => {
                  setAdjustedWeight(set.weight ?? 0);
                  adjustWeightSheetRef.current?.expand();
                }}
                accessibilityLabel="Modifier le poids de travail pour les séries suivantes"
                style={styles.actionBtn}
              >
                <Ionicons name="barbell-outline" size={22} color={colors.textSecondary} />
              </PressableA11y>
            )}
```

- [ ] **Step 5: Ajouter le message de succès sous restSets**

Juste après le bloc `restSets.length > 0` (section SÉRIES RESTANTES), ajouter :

```tsx
      {adjustSuccess && (
        <Text style={[styles.adjustSuccessMsg, { color: colors.textSecondary }]}>
          Poids mis à jour pour les séries suivantes.
        </Text>
      )}
```

- [ ] **Step 6: Ajouter le BottomSheet stepper**

Dans le JSX, après le `</BottomSheet>` du sheet description (juste avant `</>`), ajouter :

```tsx
      <BottomSheet
        ref={adjustWeightSheetRef}
        index={-1}
        snapPoints={adjustWeightSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={styles.sheetContainer}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Modifier le poids</Text>
          <View style={styles.stepperRow}>
            <PressableA11y
              accessibilityLabel={`Diminuer de ${unitResolved === 'lbs' ? '5 lbs' : '2,5 kg'}`}
              onPress={() => setAdjustedWeight(w => Math.max(0, parseFloat((w - weightStep).toFixed(2))))}
              style={[styles.stepperBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={[styles.stepperBtnText, { color: colors.text }]}>−</Text>
            </PressableA11y>
            <View
              style={styles.stepperValue}
              accessible
              accessibilityValue={{ text: `${convert(adjustedWeight)} ${unitLabel}` }}
            >
              <Text style={[styles.stepperValueText, { color: colors.text }]}>
                {convert(adjustedWeight)} {unitLabel}
              </Text>
            </View>
            <PressableA11y
              accessibilityLabel={`Augmenter de ${unitResolved === 'lbs' ? '5 lbs' : '2,5 kg'}`}
              onPress={() => setAdjustedWeight(w => parseFloat((w + weightStep).toFixed(2)))}
              style={[styles.stepperBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={[styles.stepperBtnText, { color: colors.text }]}>+</Text>
            </PressableA11y>
          </View>
          <PressableA11y
            accessibilityLabel="Confirmer le nouveau poids"
            onPress={async () => {
              if (!onAdjustWeight) return;
              await onAdjustWeight(adjustedWeight);
              adjustWeightSheetRef.current?.close();
              setAdjustSuccess(true);
              setTimeout(() => setAdjustSuccess(false), 2000);
            }}
            style={[styles.validateBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.validateBtnText}>Confirmer</Text>
          </PressableA11y>
          <PressableA11y
            accessibilityLabel="Annuler la modification de poids"
            onPress={() => adjustWeightSheetRef.current?.close()}
            style={[styles.sheetCancelBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.sheetCancelText, { color: colors.text }]}>Annuler</Text>
          </PressableA11y>
        </BottomSheetView>
      </BottomSheet>
```

> **Convention poids :** `adjustedWeight` est stocké en kg en interne. `convert()` s'occupe de la conversion pour l'affichage. `weightStep` est en kg (via `lbsToKg(5)` si lbs). `onAdjustWeight(adjustedWeight)` reçoit donc toujours des kg — cohérent avec `session.setStartingWeight`.

- [ ] **Step 7: Ajouter les styles stepper**

Dans `StyleSheet.create`, ajouter :

```typescript
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center' },
  stepperBtn: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 28, fontWeight: '400', lineHeight: 34 },
  stepperValue: { flex: 1, alignItems: 'center' },
  stepperValueText: { fontSize: 22, fontWeight: '600' },
  adjustSuccessMsg: { fontSize: 13, textAlign: 'center' },
```

- [ ] **Step 8: Câbler onAdjustWeight dans [workoutId].tsx**

Dans `app/app/session/[workoutId].tsx`, dans le JSX `<RunningPhase>`, ajouter la prop :

```tsx
              onAdjustWeight={session.setStartingWeight}
```

- [ ] **Step 9: Typecheck + tests**

```bash
cd app && npx tsc --noEmit && npx jest --no-coverage
```

Expected: 0 erreurs TypeScript, tous tests PASS

- [ ] **Step 10: Commit final**

```bash
cd app && git add components/session/RunningPhase.tsx "app/session/[workoutId].tsx"
git commit -m "feat(session): stepper poids — modifier charge séries suivantes depuis RunningPhase"
```

---

## Task 8: Version bump + journal

- [ ] **Step 1: Bump version**

```bash
cd .. && bash scripts/version-bump.sh minor
```

Expected: version `1.5.x` → `1.6.0`

- [ ] **Step 2: Run full test suite**

```bash
cd app && npx jest --no-coverage
```

Expected: tous PASS

- [ ] **Step 3: Typecheck final**

```bash
cd app && npx tsc --noEmit
```

Expected: 0 erreurs

- [ ] **Step 4: Mettre à jour le journal**

Ajouter une entrée dans `docs/journal/project-log.md` :

```markdown
## S29 — 2026-06-11 — Quick Wins Séance

### Livré
- **F1 Célébration PR** : `SessionService.logSet` retourne `{ setLog, isPR }`. Badge overlay 3s dans `[workoutId].tsx`, survit la transition RunningPhase→RestPhase. `AccessibilityInfo.announceForAccessibility`.
- **F2 Feedback reps** : `computeRepsFeedback` (pure function, 8 tests). Hint inline si écart > 25% cible, sous bouton Valider.
- **F3 RPE redesign** : TextInput remplacé par 3 chips Facile/Normal/Difficile (mapped 3/6/9). `accessibilityRole="radio"`.
- **F4 Stepper poids** : bouton barbell dans header → BottomSheet stepper ±2.5 kg (±5 lbs). Appliqué aux séries suivantes via `session.setStartingWeight`. Message de confirmation 2s.

### Décisions
- `validateSet` retourne `Promise<boolean>` (isPR) — responsabilité UI du badge reste dans `[workoutId].tsx`, pas dans `useSession`
- Threshold feedback reps : ±25% proportionnel (pas absolu) — adapté à toutes plages de reps
- adjustedWeight en kg interne, `convert()` pour l'affichage — cohérent avec le reste de l'app
```

- [ ] **Step 5: Commit journal + version**

```bash
cd app && git add ../docs/journal/project-log.md app.json ../app.json 2>/dev/null; git add -A && git commit -m "chore(release): v1.6.0 — quick wins séance (PR badge, feedback reps, RPE chips, stepper poids)"
```
