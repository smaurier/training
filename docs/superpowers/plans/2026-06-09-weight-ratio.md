# Weight Ratio Back-off — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Calculer automatiquement le poids du bloc Back-off en appliquant un ratio sur le poids Travail, sans écriture en DB et sans modifier RunningPhase.

**Architecture:** Migration v6 ajoute `weight_ratio REAL` sur `sets`. La pure function `resolveWeights` injecte les poids calculés en mémoire au chargement de la séance. `[workoutId].tsx` applique `resolveWeights` via `useMemo` avant de passer les exercices à `useSession`.

**Tech Stack:** TypeScript strict, Expo SQLite, Jest, React Native

---

## File Map

| Fichier | Action | Rôle |
|---|---|---|
| `app/db/schema.ts` | Modifier | Ajouter migration v6 |
| `app/db/types.ts` | Modifier | Ajouter `weight_ratio` sur `Set` |
| `app/db/seeds.ts` | Modifier | `SetSpec` + `f()` + Back-off + SQL INSERT/UPDATE |
| `app/services/weightRatio.ts` | Créer | Pure function `resolveWeights` |
| `app/services/weightRatio.test.ts` | Créer | 6 tests unitaires |
| `app/app/session/[workoutId].tsx` | Modifier | `useMemo` → `resolveWeights` avant `useSession` |

---

## Task 1 — Migration v6 + type `Set`

**Files:**
- Modify: `app/db/schema.ts`
- Modify: `app/db/types.ts`

- [ ] **Step 1: Ajouter la migration v6 dans `app/db/schema.ts`**

À la fin du tableau `MIGRATIONS` (après la ligne `'ALTER TABLE exercises ADD COLUMN description TEXT;'`), ajouter :

```ts
  // v6 — weight_ratio pour blocs Back-off
  `ALTER TABLE sets ADD COLUMN weight_ratio REAL;`,
```

Le fichier doit se terminer ainsi :

```ts
  // v5 — descriptions exercices
  `ALTER TABLE exercises ADD COLUMN description TEXT;`,

  // v6 — weight_ratio pour blocs Back-off
  `ALTER TABLE sets ADD COLUMN weight_ratio REAL;`,
];
```

- [ ] **Step 2: Ajouter `weight_ratio` sur l'interface `Set` dans `app/db/types.ts`**

Modifier l'interface `Set` (autour de la ligne 47) :

```ts
export interface Set {
  id: number;
  block_id: number;
  reps_min: number;
  reps_max: number;
  weight: number | null;
  weight_type: WeightType;
  rest_duration: number;
  order_index: number;
  duration_seconds: number | null;
  weight_ratio: number | null;
}
```

- [ ] **Step 3: Typecheck**

```bash
cd C:\Users\sylva\projects\training-app\app && npx tsc --noEmit 2>&1
```

Expected: erreurs sur `seeds.ts` (INSERT/UPDATE ne passent pas encore `weight_ratio`) — c'est normal, sera fixé en Task 2. Pas d'erreur ailleurs.

- [ ] **Step 4: Commit**

```bash
git -C C:\Users\sylva\projects\training-app add app/db/schema.ts app/db/types.ts
git -C C:\Users\sylva\projects\training-app commit -m "feat(db): migration v6 — weight_ratio REAL sur sets"
```

---

## Task 2 — Seeds : `SetSpec`, `f()`, Back-off, SQL

**Files:**
- Modify: `app/db/seeds.ts`

- [ ] **Step 1: Ajouter `weight_ratio` dans `SetSpec`**

Localiser `type SetSpec` (autour de la ligne 422) et ajouter le champ :

```ts
type SetSpec = {
  reps_min: number;
  reps_max: number;
  weight: number | null;
  weight_type: WeightType;
  rest: number;
  duration_seconds?: number | null;
  weight_ratio?: number | null;
};
```

- [ ] **Step 2: Mettre à jour le helper `f()`**

Localiser `function f(` (autour de la ligne 449) et ajouter le 5ème paramètre :

```ts
function f(reps_min: number, reps_max: number, rest: number, weight: number | null = null, weight_ratio: number | null = null): SetSpec {
  return { reps_min, reps_max, weight, weight_type: 'fixed', rest, weight_ratio };
}
```

- [ ] **Step 3: Mettre à jour le set Back-off de "Développé couché barre"**

Localiser le bloc `name: 'Back-off'` (autour de la ligne 511) :

```ts
{
  name: 'Back-off',
  is_work: true,
  sets: [f(12, 15, 60, null, 0.8)],
},
```

- [ ] **Step 4: Mettre à jour l'INSERT SQL dans les seeds**

Localiser `INSERT INTO sets` (autour de la ligne 772) et ajouter `weight_ratio` :

```ts
await db.runAsync(
  'INSERT INTO sets (block_id, reps_min, reps_max, weight, weight_type, rest_duration, order_index, duration_seconds, weight_ratio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  [blockId, s.reps_min, s.reps_max, s.weight, s.weight_type, s.rest, si, s.duration_seconds ?? null, s.weight_ratio ?? null]
);
```

- [ ] **Step 5: Mettre à jour les deux UPDATE SQL dans les seeds**

Il y a deux UPDATE autour de la ligne 760. Les deux doivent inclure `weight_ratio`.

**Chemin `preserveWeight` (weight préservé — seul `weight_ratio` change) :**
```ts
await db.runAsync(
  'UPDATE sets SET reps_min = ?, reps_max = ?, weight_type = ?, rest_duration = ?, duration_seconds = ?, weight_ratio = ? WHERE id = ?',
  [s.reps_min, s.reps_max, s.weight_type, s.rest, s.duration_seconds ?? null, s.weight_ratio ?? null, existingSet.id]
);
```

**Chemin normal (weight aussi mis à jour) :**
```ts
await db.runAsync(
  'UPDATE sets SET reps_min = ?, reps_max = ?, weight = ?, weight_type = ?, rest_duration = ?, duration_seconds = ?, weight_ratio = ? WHERE id = ?',
  [s.reps_min, s.reps_max, s.weight, s.weight_type, s.rest, s.duration_seconds ?? null, s.weight_ratio ?? null, existingSet.id]
);
```

- [ ] **Step 6: Typecheck**

```bash
cd C:\Users\sylva\projects\training-app\app && npx tsc --noEmit 2>&1
```

Expected: 0 erreurs.

- [ ] **Step 7: Tests**

```bash
cd C:\Users\sylva\projects\training-app\app && npx jest --no-coverage 2>&1 | tail -5
```

Expected: `267 passed, 267 total`

- [ ] **Step 8: Commit**

```bash
git -C C:\Users\sylva\projects\training-app add app/db/seeds.ts
git -C C:\Users\sylva\projects\training-app commit -m "feat(seeds): weight_ratio 0.8 sur Back-off Développé couché barre"
```

---

## Task 3 — Pure function `resolveWeights` (TDD)

**Files:**
- Create: `app/services/weightRatio.test.ts`
- Create: `app/services/weightRatio.ts`

- [ ] **Step 1: Écrire les tests (fichier inexistant → tous échouent)**

Créer `app/services/weightRatio.test.ts` :

```ts
import { resolveWeights } from './weightRatio';
import type { WorkoutExerciseDetail } from './WorkoutExerciseService';
import type { Set as TrainingSet } from '../db/types';

function makeSet(overrides: Partial<TrainingSet>): TrainingSet {
  return {
    id: 1,
    block_id: 1,
    reps_min: 8,
    reps_max: 8,
    weight: null,
    weight_ratio: null,
    weight_type: 'fixed',
    rest_duration: 120,
    order_index: 0,
    duration_seconds: null,
    ...overrides,
  };
}

function makeExercise(blocks: WorkoutExerciseDetail['blocks']): WorkoutExerciseDetail {
  return {
    id: 1,
    workout_id: 1,
    order_index: 0,
    exercise: { id: 1, name: 'Test', type: 'musculation', technical_notes: null, muscle_groups: '[]', description: null },
    blocks,
  };
}

describe('resolveWeights', () => {
  it('calcule le poids Back-off depuis le poids Travail', () => {
    const exercise = makeExercise([
      { id: 1, name: 'Travail', order_index: 0, is_work_block: 1, sets: [makeSet({ weight: 60 })] },
      { id: 2, name: 'Back-off', order_index: 1, is_work_block: 1, sets: [makeSet({ weight_ratio: 0.8 })] },
    ]);
    const result = resolveWeights(exercise);
    expect(result.blocks[1].sets[0].weight).toBe(48);
  });

  it('retourne l\'exercice inchangé si le poids Travail est null', () => {
    const exercise = makeExercise([
      { id: 1, name: 'Travail', order_index: 0, is_work_block: 1, sets: [makeSet({ weight: null })] },
      { id: 2, name: 'Back-off', order_index: 1, is_work_block: 1, sets: [makeSet({ weight_ratio: 0.8 })] },
    ]);
    const result = resolveWeights(exercise);
    expect(result.blocks[1].sets[0].weight).toBeNull();
  });

  it('ne remplace pas un poids déjà défini sur le set', () => {
    const exercise = makeExercise([
      { id: 1, name: 'Travail', order_index: 0, is_work_block: 1, sets: [makeSet({ weight: 60 })] },
      { id: 2, name: 'Back-off', order_index: 1, is_work_block: 1, sets: [makeSet({ weight: 40, weight_ratio: 0.8 })] },
    ]);
    const result = resolveWeights(exercise);
    expect(result.blocks[1].sets[0].weight).toBe(40);
  });

  it('arrondit au multiple de 2kg inférieur', () => {
    // 63 × 0.8 = 50.4 → Math.round(50.4 / 2) * 2 = Math.round(25.2) * 2 = 25 * 2 = 50
    const exercise = makeExercise([
      { id: 1, name: 'Travail', order_index: 0, is_work_block: 1, sets: [makeSet({ weight: 63 })] },
      { id: 2, name: 'Back-off', order_index: 1, is_work_block: 1, sets: [makeSet({ weight_ratio: 0.8 })] },
    ]);
    const result = resolveWeights(exercise);
    expect(result.blocks[1].sets[0].weight).toBe(50);
  });

  it('ne modifie pas les sets sans weight_ratio (Travail, Échauffement)', () => {
    const exercise = makeExercise([
      { id: 1, name: 'Travail', order_index: 0, is_work_block: 1, sets: [makeSet({ weight: 60 })] },
    ]);
    const result = resolveWeights(exercise);
    expect(result.blocks[0].sets[0].weight).toBe(60);
    expect(result.blocks[0].sets[0].weight_ratio).toBeNull();
  });

  it('retourne l\'exercice inchangé s\'il n\'y a pas de bloc Travail', () => {
    const exercise = makeExercise([
      { id: 1, name: 'Échauffement', order_index: 0, is_work_block: 0, sets: [makeSet({ weight: 30 })] },
    ]);
    const result = resolveWeights(exercise);
    expect(result).toEqual(exercise);
  });
});
```

- [ ] **Step 2: Vérifier que les tests échouent**

```bash
cd C:\Users\sylva\projects\training-app\app && npx jest weightRatio --no-coverage 2>&1 | tail -10
```

Expected: `Cannot find module './weightRatio'`

- [ ] **Step 3: Créer `app/services/weightRatio.ts`**

```ts
import type { WorkoutExerciseDetail } from './WorkoutExerciseService';

export function resolveWeights(exercise: WorkoutExerciseDetail): WorkoutExerciseDetail {
  const travailWeight = exercise.blocks
    .find(b => b.name === 'Travail')
    ?.sets[0]?.weight ?? null;

  if (travailWeight === null) return exercise;

  const resolvedBlocks = exercise.blocks.map(block => ({
    ...block,
    sets: block.sets.map(set => {
      if (set.weight_ratio == null || set.weight != null) return set;
      return { ...set, weight: Math.round(travailWeight * set.weight_ratio / 2) * 2 };
    }),
  }));

  return { ...exercise, blocks: resolvedBlocks };
}
```

- [ ] **Step 4: Vérifier que les tests passent**

```bash
cd C:\Users\sylva\projects\training-app\app && npx jest weightRatio --no-coverage 2>&1 | tail -10
```

Expected: `6 passed, 6 total`

- [ ] **Step 5: Typecheck**

```bash
cd C:\Users\sylva\projects\training-app\app && npx tsc --noEmit 2>&1
```

Expected: 0 erreurs.

- [ ] **Step 6: Suite complète**

```bash
cd C:\Users\sylva\projects\training-app\app && npx jest --no-coverage 2>&1 | tail -5
```

Expected: `273 passed, 273 total` (267 + 6 nouveaux)

- [ ] **Step 7: Commit**

```bash
git -C C:\Users\sylva\projects\training-app add app/services/weightRatio.ts app/services/weightRatio.test.ts
git -C C:\Users\sylva\projects\training-app commit -m "feat(services): resolveWeights — calcul poids Back-off depuis ratio Travail"
```

---

## Task 4 — Câblage dans `[workoutId].tsx`

**Files:**
- Modify: `app/app/session/[workoutId].tsx`

- [ ] **Step 1: Lire `app/app/session/[workoutId].tsx`**

Vérifier la ligne d'import de `useMemo` (déjà présent ligne 2) et la ligne `const session = useSession(workoutId, exercises)` (ligne 25).

- [ ] **Step 2: Ajouter l'import de `resolveWeights`**

Ajouter après les imports existants (après la ligne `import { useColorScheme }...`) :

```ts
import { resolveWeights } from '@/services/weightRatio';
```

- [ ] **Step 3: Appliquer `resolveWeights` via `useMemo` avant `useSession`**

Remplacer :

```ts
const { exercises, refresh } = useWorkoutExercises(workoutId);
const session = useSession(workoutId, exercises);
```

Par :

```ts
const { exercises, refresh } = useWorkoutExercises(workoutId);
const resolvedExercises = useMemo(() => exercises.map(resolveWeights), [exercises]);
const session = useSession(workoutId, resolvedExercises);
```

Note : `useMemo` est déjà importé ligne 2 — pas besoin d'ajouter l'import.

Mettre aussi à jour la ligne qui passe `exercises.length` à `ExerciseTransitionPhase` (ligne 76) — elle doit rester `exercises.length` (nombre d'exercices bruts, pas résolu) :

```tsx
totalExercises={exercises.length}
```

Cette ligne est déjà correcte — ne pas la changer.

- [ ] **Step 4: Typecheck**

```bash
cd C:\Users\sylva\projects\training-app\app && npx tsc --noEmit 2>&1
```

Expected: 0 erreurs.

- [ ] **Step 5: Tests**

```bash
cd C:\Users\sylva\projects\training-app\app && npx jest --no-coverage 2>&1 | tail -5
```

Expected: `273 passed, 273 total`

- [ ] **Step 6: Commit**

```bash
git -C C:\Users\sylva\projects\training-app add "app/app/session/[workoutId].tsx"
git -C C:\Users\sylva\projects\training-app commit -m "feat(session): résolution automatique poids Back-off via resolveWeights"
```
