# Substitution Rapide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'utilisateur de remplacer temporairement un exercice en séance (session-only, programme inchangé) via le bottom sheet "Passer".

**Architecture:** État `substitutions: Record<number, ExerciseStub>` dans `useSession`, dérivé en `effectiveDetails` via `useMemo`. Tous les callbacks du hook (validateSet, skipSet, skipExercise, confirmTransition) utilisent `effectiveDetails` au lieu de `workoutDetails`. Un nouveau composant `SubstituteSheet` charge les exercices lazily et filtre par groupe musculaire.

**Tech Stack:** React Native, expo-sqlite, @gorhom/bottom-sheet, TypeScript strict, Jest TDD

---

## Fichiers impactés

| Action | Fichier |
|--------|---------|
| Modifier | `app/hooks/useSession.ts` |
| Modifier | `app/hooks/useSession.test.ts` |
| Créer | `app/components/session/SubstituteSheet.tsx` |
| Modifier | `app/components/session/RunningPhase.tsx` |
| Modifier | `app/app/session/[workoutId].tsx` |

---

## Task 1 : Hook useSession — état substitution (TDD)

**Files:**
- Modify: `app/hooks/useSession.ts`
- Test: `app/hooks/useSession.test.ts`

### Contexte

`useSession` reçoit `workoutDetails: WorkoutExerciseDetail[]` en prop. Actuellement tous les callbacks (`validateSet`, `skipSet`, `skipExercise`, `confirmTransition`) utilisent `workoutDetails` directement. On va ajouter un état `substitutions` et dériver `effectiveDetails` qui override les métadonnées d'exercice sans toucher aux blocks/sets.

`WorkoutExerciseDetail['exercise']` = `Pick<Exercise, 'id' | 'name' | 'type' | 'technical_notes' | 'muscle_groups' | 'description'>` — pas besoin de nouveau type.

---

- [ ] **Step 1 : Écrire les 3 tests qui échouent**

Dans `app/hooks/useSession.test.ts`, ajouter après le dernier `describe` existant :

```typescript
describe('useSession — substituteCurrentExercise', () => {
  const replacement: WorkoutExerciseDetail['exercise'] = {
    id: 99,
    name: 'Développé Haltères',
    type: 'musculation',
    technical_notes: null,
    muscle_groups: '["poitrine"]',
    description: null,
  };

  function makeSessionWithExercise() {
    const exercises = [makeExercise('Développé Barre', 80, 3)];
    return renderHook(() =>
      useSession(1, exercises, {
        sessionLogId: 1,
        position: { exerciseIdx: 0, blockIdx: 0, setIdx: 0 },
        phase: 'running',
        startedAt: Date.now(),
        setsLogged: 0,
        volume: 0,
      })
    );
  }

  it('currentExercise.exercise.name retourne le remplaçant après substitution', () => {
    const { result } = makeSessionWithExercise();
    expect(result.current.currentExercise?.exercise.name).toBe('Développé Barre');
    act(() => {
      result.current.substituteCurrentExercise(replacement);
    });
    expect(result.current.currentExercise?.exercise.name).toBe('Développé Haltères');
    expect(result.current.currentExercise?.exercise.id).toBe(99);
  });

  it('isCurrentExerciseSubstituted reflète l\'état de substitution', () => {
    const { result } = makeSessionWithExercise();
    expect(result.current.isCurrentExerciseSubstituted).toBe(false);
    act(() => {
      result.current.substituteCurrentExercise(replacement);
    });
    expect(result.current.isCurrentExerciseSubstituted).toBe(true);
  });

  it('currentSet reste inchangé après substitution — id, reps_min, weight identiques', () => {
    const { result } = makeSessionWithExercise();
    const setIdBefore = result.current.currentSet?.id;
    const repsMinBefore = result.current.currentSet?.reps_min;
    const weightBefore = result.current.currentSet?.weight;
    act(() => {
      result.current.substituteCurrentExercise(replacement);
    });
    expect(result.current.currentSet?.id).toBe(setIdBefore);
    expect(result.current.currentSet?.reps_min).toBe(repsMinBefore);
    expect(result.current.currentSet?.weight).toBe(weightBefore);
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd C:/Users/sylva/projects/training-app && npx jest useSession.test --no-coverage 2>&1 | tail -20
```

Attendu : `TypeError: result.current.substituteCurrentExercise is not a function`

- [ ] **Step 3 : Ajouter les types dans `UseSessionResult`**

Dans `app/hooks/useSession.ts`, trouver l'interface `UseSessionResult` (lignes ~38-68). Ajouter avant `error: string | null;` :

```typescript
substituteCurrentExercise: (replacement: WorkoutExerciseDetail['exercise']) => void;
isCurrentExerciseSubstituted: boolean;
```

- [ ] **Step 4 : Ajouter l'état et le dérivé `effectiveDetails`**

Dans la fonction `useSession`, après `const [startingWeightDone, setStartingWeightDone] = useState(false);` (~ligne 210), ajouter :

```typescript
const [substitutions, setSubstitutions] = useState<Record<number, WorkoutExerciseDetail['exercise']>>({});

const effectiveDetails = useMemo(
  () => workoutDetails.map((d, i) =>
    substitutions[i] ? { ...d, exercise: substitutions[i] } : d
  ),
  [workoutDetails, substitutions]
);
```

- [ ] **Step 5 : Remplacer `workoutDetails` → `effectiveDetails` dans les dérivés**

Ligne ~212 : `const currentExercise = workoutDetails[position.exerciseIdx] ?? null;`
→ remplacer par :
```typescript
const currentExercise = effectiveDetails[position.exerciseIdx] ?? null;
```

- [ ] **Step 6 : Remplacer `workoutDetails` → `effectiveDetails` dans `validateSet`**

Dans `validateSet` (~lignes 245-296), remplacer **4 occurrences** de `workoutDetails` :

```typescript
// ligne ~255
const next = advancePosition(position, effectiveDetails);

// ligne ~270
if (isSupersetForward(position, next, effectiveDetails)) {

// ligne ~276
const supersetNextRound = isSupersetNextRound(position, next, effectiveDetails);

// ligne ~288
setNextLabel(computeNextLabel(next, effectiveDetails, exerciseChanges && !supersetNextRound));
```

Dans le tableau de deps du `useCallback`, remplacer `workoutDetails` par `effectiveDetails` :
```typescript
}, [service, sessionLogId, currentSet, currentExercise, position, effectiveDetails, plateStep]);
```

- [ ] **Step 7 : Remplacer `workoutDetails` → `effectiveDetails` dans `confirmTransition`**

Dans `confirmTransition` (~ligne 304) :
```typescript
const exercise = effectiveDetails[position.exerciseIdx];
```

Deps : `[phase, effectiveDetails, position.exerciseIdx]`

- [ ] **Step 8 : Remplacer `workoutDetails` → `effectiveDetails` dans `skipSet`**

Dans `skipSet` (~ligne 322) :
```typescript
const next = advancePosition(position, effectiveDetails);
```

Deps : `[service, sessionLogId, position, effectiveDetails, plateStep]`

- [ ] **Step 9 : Remplacer `workoutDetails` → `effectiveDetails` dans `skipExercise`**

Dans `skipExercise` (~lignes 354-382), remplacer **3 occurrences** :

```typescript
const currentGroupId = effectiveDetails[position.exerciseIdx]?.superset_group_id;
// ...
const groupIndices = effectiveDetails
  .map((d, i) => ({ d, i }))
  .filter(({ d }) => d.superset_group_id === currentGroupId)
  .map(({ i }) => i);
// ...
if (nextExerciseIdx >= effectiveDetails.length) {
```

Deps : `[service, sessionLogId, position.exerciseIdx, effectiveDetails, plateStep]`

- [ ] **Step 10 : Ajouter `substituteCurrentExercise` et `isCurrentExerciseSubstituted`**

Après `skipExercise` et avant `setStartingWeight`, ajouter :

```typescript
const substituteCurrentExercise = useCallback(
  (replacement: WorkoutExerciseDetail['exercise']) => {
    setSubstitutions(prev => ({ ...prev, [position.exerciseIdx]: replacement }));
  },
  [position.exerciseIdx]
);

const isCurrentExerciseSubstituted = substitutions[position.exerciseIdx] !== undefined;
```

- [ ] **Step 11 : Ajouter au return**

Dans l'objet `return` (~ligne 407), ajouter `substituteCurrentExercise, isCurrentExerciseSubstituted` :

```typescript
return {
  phase, sessionLogId, position,
  currentExercise, currentBlock, currentSet, progressLabel,
  startSession, validateSet, skipSet, skipExercise, undoLastSet, canUndo,
  setStartingWeight, startingWeightDone, markStartingWeightDone,
  warmupWorkWeight, confirmTransition, confirmRest, confirmWarmup, restDuration, nextLabel,
  progressions, sessionStartedAt, totalSetsLogged, totalVolume, lastSetLog, error, pauseSession,
  substituteCurrentExercise, isCurrentExerciseSubstituted,
};
```

- [ ] **Step 12 : Vérifier que les 3 tests passent**

```bash
cd C:/Users/sylva/projects/training-app && npx jest useSession.test --no-coverage 2>&1 | tail -20
```

Attendu : tous les tests passent (y compris les existants)

- [ ] **Step 13 : Typecheck**

```bash
cd C:/Users/sylva/projects/training-app && npm run typecheck 2>&1 | head -30
```

Attendu : no errors

- [ ] **Step 14 : Commit**

```bash
git -C "C:/Users/sylva/projects/training-app" add app/hooks/useSession.ts app/hooks/useSession.test.ts
git -C "C:/Users/sylva/projects/training-app" commit -m "feat(session): substituteCurrentExercise — effectiveDetails override dans useSession"
```

---

## Task 2 : Composant SubstituteSheet

**Files:**
- Create: `app/components/session/SubstituteSheet.tsx`

### Contexte

Composant autonome wrappant un `BottomSheet`. Il charge les exercices de la DB lazily (au premier open, via `onAnimate`), filtre par groupe musculaire si pas de recherche texte, affiche un état vide explicite. Chaque row a un `accessibilityLabel` conforme aux règles CLAUDE.md.

La sélection ferme le sheet AVANT de remonter le choix au parent (évite un flash de fermeture visible).

---

- [ ] **Step 1 : Créer le fichier**

Créer `app/components/session/SubstituteSheet.tsx` avec ce contenu complet :

```typescript
import { useRef, useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { Exercise } from '@/db/types';
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import { getDb } from '@/db';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

type ExerciseStub = WorkoutExerciseDetail['exercise'];

interface SubstituteSheetProps {
  sheetRef: React.RefObject<BottomSheet>;
  currentMuscleGroups: string[];
  onSelect: (exercise: ExerciseStub) => void;
  onClose: () => void;
}

export function SubstituteSheet({ sheetRef, currentMuscleGroups, onSelect, onClose }: SubstituteSheetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const hasLoaded = useRef(false);
  const snapPoints = useMemo(() => ['75%', '90%'], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  function handleAnimate(_fromIndex: number, toIndex: number) {
    if (toIndex >= 0 && !hasLoaded.current) {
      hasLoaded.current = true;
      new SQLiteExerciseRepository(getDb()).findAll().then(all => {
        setExercises(all);
      });
    }
  }

  const filtered = useMemo(() => {
    if (searchQuery.trim()) {
      return exercises.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return exercises.filter(ex => {
      try {
        const groups = JSON.parse(ex.muscle_groups) as string[];
        return groups.some(g => currentMuscleGroups.includes(g));
      } catch { return false; }
    });
  }, [exercises, currentMuscleGroups, searchQuery]);

  function handleSelect(exercise: Exercise) {
    sheetRef.current?.close();
    onSelect({
      id: exercise.id,
      name: exercise.name,
      type: exercise.type,
      technical_notes: exercise.technical_notes,
      muscle_groups: exercise.muscle_groups,
      description: exercise.description,
    });
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onAnimate={handleAnimate}
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetView style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Remplacer l'exercice</Text>
        <TextInput
          style={[styles.search, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher par nom…"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Rechercher un exercice de remplacement"
          returnKeyType="search"
        />
      </BottomSheetView>
      {filtered.length === 0 ? (
        <BottomSheetView style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aucun exercice — recherchez par nom
          </Text>
        </BottomSheetView>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={ex => String(ex.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PressableA11y
              accessibilityLabel={`Choisir ${item.name}`}
              onPress={() => handleSelect(item)}
              style={[styles.row, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.rowName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.rowType, { color: colors.textSecondary }]}>{item.type}</Text>
            </PressableA11y>
          )}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  title: { fontSize: 17, fontWeight: '600' },
  search: { borderWidth: 1, borderRadius: Radius.sm, padding: 10, fontSize: 16 },
  emptyContainer: { paddingHorizontal: 20, paddingTop: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, fontStyle: 'italic', textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  row: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  rowName: { fontSize: 16 },
  rowType: { fontSize: 12 },
});
```

- [ ] **Step 2 : Typecheck**

```bash
cd C:/Users/sylva/projects/training-app && npm run typecheck 2>&1 | head -30
```

Attendu : no errors

- [ ] **Step 3 : Commit**

```bash
git -C "C:/Users/sylva/projects/training-app" add app/components/session/SubstituteSheet.tsx
git -C "C:/Users/sylva/projects/training-app" commit -m "feat(session): SubstituteSheet — picker exercice lazy avec filtre muscle group"
```

---

## Task 3 : RunningPhase — intégration SubstituteSheet

**Files:**
- Modify: `app/components/session/RunningPhase.tsx`

### Contexte

`RunningPhase` reçoit déjà `exercise`, `block`, `set` et des callbacks. On ajoute 2 props optionnelles (`onSubstituteExercise`, `isSubstituted`), un `substituteSheetRef`, un bouton dans le skip sheet existant, un indicateur ⇄ dans l'en-tête, et on rend `SubstituteSheet` en bas du JSX.

Ionicons est déjà importé. PressableA11y est déjà importé. BottomSheet est déjà importé.

Le skip sheet se trouve à la fin du JSX, identifiable par `ref={skipExerciseSheetRef}`. Le bouton "Remplacer" doit être ajouté entre "Passer cette série" et "Passer l'exercice entier".

---

- [ ] **Step 1 : Ajouter l'import de SubstituteSheet**

Dans les imports de `app/components/session/RunningPhase.tsx`, ajouter après les autres imports de composants session :

```typescript
import { SubstituteSheet } from '@/components/session/SubstituteSheet';
```

- [ ] **Step 2 : Ajouter les 2 nouvelles props à l'interface**

Dans `RunningPhaseProps`, ajouter après `supersetExerciseNames?: string[];` :

```typescript
onSubstituteExercise?: (replacement: WorkoutExerciseDetail['exercise']) => void;
isSubstituted?: boolean;
```

- [ ] **Step 3 : Déstructurer les nouvelles props**

Dans la signature de la fonction `RunningPhase`, ajouter `onSubstituteExercise, isSubstituted` à la déstructuration :

```typescript
export function RunningPhase({ exercise, block, set, progressLabel, onValidate, onSkip, onSkipExercise, onUndo, canUndo, lastSetLog, onAdjustWeight, supersetPosition, supersetExerciseNames, onSubstituteExercise, isSubstituted }: RunningPhaseProps) {
```

- [ ] **Step 4 : Ajouter `substituteSheetRef` et helper `parseMuscleGroups`**

Après `const adjustWeightSheetRef = useRef<BottomSheet>(null);` (~ligne 106), ajouter :

```typescript
const substituteSheetRef = useRef<BottomSheet>(null);
```

Ajouter avant la fonction `RunningPhase` (hors composant, dans le fichier) :

```typescript
function parseMuscleGroups(json: string): string[] {
  try { return JSON.parse(json) as string[]; }
  catch { return []; }
}
```

- [ ] **Step 5 : Ajouter l'indicateur ⇄ dans l'en-tête**

Trouver ce bloc dans le JSX (~ligne 229) :

```tsx
<Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1}>
  {exercise.exercise.name}
</Text>
```

Remplacer par :

```tsx
<View style={styles.exerciseNameRow}>
  {isSubstituted && (
    <Ionicons name="swap-horizontal-outline" size={18} color={colors.textSecondary} />
  )}
  <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={1} accessibilityLabel={isSubstituted ? `Exercice remplacé : ${exercise.exercise.name}` : exercise.exercise.name}>
    {exercise.exercise.name}
  </Text>
</View>
```

- [ ] **Step 6 : Ajouter le bouton "Remplacer" dans le skip sheet**

Dans le skip sheet (`ref={skipExerciseSheetRef}`), après le bouton "Passer cette série" et avant le bouton "Passer l'exercice entier", ajouter :

```tsx
{onSubstituteExercise && (
  <PressableA11y
    accessibilityLabel="Remplacer cet exercice par un autre"
    onPress={() => {
      skipExerciseSheetRef.current?.close();
      substituteSheetRef.current?.expand();
    }}
    style={[styles.sheetCancelBtn, { borderColor: colors.border }]}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
      <Ionicons name="swap-horizontal-outline" size={16} color={colors.text} />
      <Text style={[styles.sheetCancelText, { color: colors.text }]}>Remplacer cet exercice</Text>
    </View>
  </PressableA11y>
)}
```

- [ ] **Step 7 : Rendre `SubstituteSheet` en bas du JSX**

Juste avant le `</>` final (après le `BottomSheet` `adjustWeightSheetRef`), ajouter :

```tsx
{onSubstituteExercise && (
  <SubstituteSheet
    sheetRef={substituteSheetRef}
    currentMuscleGroups={parseMuscleGroups(exercise.exercise.muscle_groups)}
    onSelect={onSubstituteExercise}
    onClose={() => substituteSheetRef.current?.close()}
  />
)}
```

- [ ] **Step 8 : Ajouter le style `exerciseNameRow`**

Dans `StyleSheet.create`, ajouter :

```typescript
exerciseNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
```

- [ ] **Step 9 : Typecheck**

```bash
cd C:/Users/sylva/projects/training-app && npm run typecheck 2>&1 | head -30
```

Attendu : no errors

- [ ] **Step 10 : Tests complets**

```bash
cd C:/Users/sylva/projects/training-app && npx jest --no-coverage 2>&1 | tail -20
```

Attendu : all tests pass

- [ ] **Step 11 : Commit**

```bash
git -C "C:/Users/sylva/projects/training-app" add app/components/session/RunningPhase.tsx
git -C "C:/Users/sylva/projects/training-app" commit -m "feat(session): RunningPhase — bouton Remplacer + indicateur substitution"
```

---

## Task 4 : Wiring session screen

**Files:**
- Modify: `app/app/session/[workoutId].tsx`

### Contexte

La `RunningPhase` est rendue dans `SessionContent` autour de la ligne 396. Il suffit de passer 2 nouvelles props depuis `session` (le résultat de `useSession`).

---

- [ ] **Step 1 : Passer les 2 nouvelles props à RunningPhase**

Dans `app/app/session/[workoutId].tsx`, trouver le bloc `<RunningPhase ...>` (~ligne 396). Ajouter après `supersetExerciseNames={...}` :

```tsx
onSubstituteExercise={session.substituteCurrentExercise}
isSubstituted={session.isCurrentExerciseSubstituted}
```

Le bloc RunningPhase doit ressembler à :

```tsx
<RunningPhase
  key={session.currentSet.id}
  exercise={session.currentExercise}
  block={session.currentBlock}
  set={session.currentSet}
  progressLabel={session.progressLabel}
  onValidate={handleValidate}
  onSkip={session.skipSet}
  onSkipExercise={session.skipExercise}
  onUndo={session.undoLastSet}
  canUndo={session.canUndo}
  lastSetLog={session.lastSetLog}
  onAdjustWeight={session.setStartingWeight}
  supersetPosition={getSupersetPosition(session.position, deloadedExercises)}
  supersetExerciseNames={getSupersetExerciseNames(session.position, deloadedExercises)}
  onSubstituteExercise={session.substituteCurrentExercise}
  isSubstituted={session.isCurrentExerciseSubstituted}
/>
```

- [ ] **Step 2 : Typecheck**

```bash
cd C:/Users/sylva/projects/training-app && npm run typecheck 2>&1 | head -30
```

Attendu : no errors

- [ ] **Step 3 : Tests complets**

```bash
cd C:/Users/sylva/projects/training-app && npx jest --no-coverage 2>&1 | tail -20
```

Attendu : all tests pass

- [ ] **Step 4 : Commit**

```bash
git -C "C:/Users/sylva/projects/training-app" add "app/app/session/[workoutId].tsx"
git -C "C:/Users/sylva/projects/training-app" commit -m "feat(session): wiring substitution rapide dans SessionContent"
```

---

## Limitations V1 (à ne pas implémenter)

- Substitution non persistée en pause/resume (session-only par design)
- Substitution globale à l'exercice — pas per-série
