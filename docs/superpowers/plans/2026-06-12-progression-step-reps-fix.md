# Progression step + suppression reps_max — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer `reps_max` de toute la base de code et câbler `calculateProgression` avec `exercise.progression_step` dans SessionService.

**Architecture:** Suppression colonne DB (migration v9) + propagation type cascade → repositories → services → UI. `calculateProgression` déjà correcte — juste mal câblée. `repsFeedback` refactoring signature indépendant.

**Tech Stack:** TypeScript strict, expo-sqlite, Jest, React Native

**Spec:** `docs/superpowers/specs/2026-06-12-progression-step-reps-fix.md`

**Note TypeScript :** Les tâches 3–10 forment un bloc. TypeScript sera cassé entre les tâches 3 et 10. Lancer `npm run typecheck` seulement après la tâche 10.

---

### Task 1: repsFeedback — refactoring signature (TDD)

**Files:**
- Modify: `app/services/repsFeedback.ts`
- Modify: `app/services/repsFeedback.test.ts`

- [ ] **Step 1 : Réécrire les 8 tests avec nouvelle signature**

Remplacer intégralement le contenu de `repsFeedback.test.ts` :

```typescript
import { computeRepsFeedback } from './repsFeedback';

describe('computeRepsFeedback', () => {
  it('retourne null si bodyweight', () => {
    expect(computeRepsFeedback('10', 5, true)).toBeNull();
  });
  it('retourne null si reps vide', () => {
    expect(computeRepsFeedback('', 5, false)).toBeNull();
  });
  it('retourne null si reps non-numérique', () => {
    expect(computeRepsFeedback('abc', 5, false)).toBeNull();
  });
  it('retourne null si dans la cible', () => {
    expect(computeRepsFeedback('5', 5, false)).toBeNull();
  });
  it('retourne null exactement à repsMin * 1.25 (6 <= 6.25)', () => {
    expect(computeRepsFeedback('6', 5, false)).toBeNull();
  });
  it('retourne message "dépasse" si reps > repsMin * 1.25 (7 > 6.25)', () => {
    expect(computeRepsFeedback('7', 5, false)).toBe(
      "Tu dépasses la cible — envisage d'augmenter le poids."
    );
  });
  it('retourne null exactement à repsMin * 0.75 (4 >= 3.75)', () => {
    expect(computeRepsFeedback('4', 5, false)).toBeNull();
  });
  it('retourne message "en dessous" si reps < repsMin * 0.75 (3 < 3.75)', () => {
    expect(computeRepsFeedback('3', 5, false)).toBe(
      "Tu es en dessous de la cible — le poids est peut-être trop lourd."
    );
  });
});
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```
cd app && npx jest repsFeedback --no-coverage
```

Attendu : 8 failures (mauvais nombre d'arguments).

- [ ] **Step 3 : Mettre à jour `repsFeedback.ts`**

```typescript
export function computeRepsFeedback(
  repsStr: string,
  repsMin: number,
  isBodyweight: boolean,
): string | null {
  if (isBodyweight) return null;
  const parsed = parseInt(repsStr, 10);
  if (isNaN(parsed)) return null;
  if (parsed > repsMin * 1.25) return "Tu dépasses la cible — envisage d'augmenter le poids.";
  if (parsed < repsMin * 0.75) return "Tu es en dessous de la cible — le poids est peut-être trop lourd.";
  return null;
}
```

- [ ] **Step 4 : Lancer les tests**

```
cd app && npx jest repsFeedback --no-coverage
```

Attendu : 8 passed.

- [ ] **Step 5 : Commit**

```bash
git add app/services/repsFeedback.ts app/services/repsFeedback.test.ts
git commit -m "refactor(repsFeedback): supprimer paramètre repsMax — cible fixe unique"
```

---

### Task 2: progression.ts — supprimer applyProgression

**Files:**
- Modify: `app/services/progression.ts`
- Modify: `app/services/progression.test.ts`

- [ ] **Step 1 : Supprimer les tests `applyProgression` de `progression.test.ts`**

Retirer le bloc `describe('applyProgression', ...)` entier. Garder tous les autres describes (`calculateProgression`, `applyDeload`, `isSetAchieved`, `isSessionAchieved`, `isSessionFullSuccess`, `isSessionSignificantFailure`).

Retirer aussi `applyProgression` de la ligne d'import en haut du fichier :

```typescript
import {
  isSetAchieved, isSessionAchieved, calculateProgression,
  applyDeload, isSessionFullSuccess, isSessionSignificantFailure,
} from './progression';
```

- [ ] **Step 2 : Lancer les tests**

```
cd app && npx jest progression --no-coverage
```

Attendu : tous passent (les tests `applyProgression` ont disparu, les autres restent verts).

- [ ] **Step 3 : Supprimer `applyProgression` de `progression.ts`**

Retirer ces lignes :

```typescript
export function applyProgression(weight: number): number {
  return Math.ceil((weight * 1.025) / 2) * 2;
}
```

- [ ] **Step 4 : Lancer les tests**

```
cd app && npx jest progression --no-coverage
```

Attendu : tous passent.

- [ ] **Step 5 : Commit**

```bash
git add app/services/progression.ts app/services/progression.test.ts
git commit -m "refactor(progression): supprimer applyProgression — remplacée par calculateProgression"
```

---

### Task 3: Migration v9 + type Set

**Files:**
- Modify: `app/db/schema.ts`
- Modify: `app/db/types.ts`

⚠️ TypeScript sera cassé après cette tâche jusqu'à la tâche 10 incluse.

- [ ] **Step 1 : Ajouter migration v9 dans `schema.ts`**

Après la migration v8, ajouter :

```typescript
  // v9 — suppression reps_max : cibles fixes uniquement (reps_min = cible canonique)
  `
  CREATE TABLE sets_new (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id         INTEGER NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    reps_min         INTEGER NOT NULL,
    weight           REAL,
    weight_type      TEXT NOT NULL DEFAULT 'fixed' CHECK(weight_type IN ('fixed', 'bodyweight', 'bar')),
    rest_duration    INTEGER NOT NULL DEFAULT 120,
    order_index      INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER,
    weight_ratio     REAL
  );
  INSERT INTO sets_new
    SELECT id, block_id, reps_min, weight, weight_type, rest_duration, order_index, duration_seconds, weight_ratio
    FROM sets;
  DROP TABLE sets;
  ALTER TABLE sets_new RENAME TO sets;
  `,
```

- [ ] **Step 2 : Supprimer `reps_max` de l'interface `Set` dans `types.ts`**

```typescript
export interface Set {
  id: number;
  block_id: number;
  reps_min: number;
  // reps_max supprimé
  weight: number | null;
  weight_type: WeightType;
  rest_duration: number;
  order_index: number;
  duration_seconds: number | null;
  weight_ratio: number | null;
}
```

- [ ] **Step 3 : Commit (TypeScript encore cassé)**

```bash
git add app/db/schema.ts app/db/types.ts
git commit -m "feat(db): migration v9 — suppression reps_max de la table sets"
```

---

### Task 4: Repository layer

**Files:**
- Modify: `app/repositories/ISetRepository.ts`
- Modify: `app/repositories/SQLiteSetRepository.ts`
- Modify: `app/repositories/setRepository.contract.ts`

- [ ] **Step 1 : Mettre à jour `ISetRepository.ts`**

```typescript
import type { Set } from '../db/types';

export type CreateSetDto = Omit<Set, 'id' | 'duration_seconds' | 'weight_ratio'> & { duration_seconds?: number | null; weight_ratio?: number | null };
export type UpdateSetDto = Pick<Set, 'reps_min' | 'weight' | 'weight_type' | 'rest_duration'>;

export interface ISetRepository {
  findByBlockId(blockId: number): Promise<Set[]>;
  findById(id: number): Promise<Set | null>;
  save(dto: CreateSetDto): Promise<Set>;
  update(id: number, dto: UpdateSetDto): Promise<Set>;
  delete(id: number): Promise<void>;
}
```

- [ ] **Step 2 : Mettre à jour `SQLiteSetRepository.ts` — méthode `save`**

```typescript
async save(dto: CreateSetDto): Promise<TrainingSet> {
  const result = await this.db.runAsync(
    'INSERT INTO sets (block_id, reps_min, weight, weight_type, rest_duration, order_index, duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [dto.block_id, dto.reps_min, dto.weight, dto.weight_type, dto.rest_duration, dto.order_index, dto.duration_seconds ?? null]
  );
  const saved = await this.findById(result.lastInsertRowId);
  if (!saved) throw new Error(`Set ${result.lastInsertRowId} introuvable après insertion`);
  return saved;
}
```

- [ ] **Step 3 : Mettre à jour `SQLiteSetRepository.ts` — méthode `update`**

```typescript
async update(id: number, dto: UpdateSetDto): Promise<TrainingSet> {
  await this.db.runAsync(
    'UPDATE sets SET reps_min=?, weight=?, weight_type=?, rest_duration=? WHERE id=?',
    [dto.reps_min, dto.weight, dto.weight_type, dto.rest_duration, id]
  );
  const updated = await this.findById(id);
  if (!updated) throw new Error(`Set ${id} introuvable`);
  return updated;
}
```

- [ ] **Step 4 : Adapter `setRepository.contract.ts`**

Dans tous les objets de test, supprimer `reps_max`. Par exemple :

```typescript
// Avant
await repo.save({ block_id: 1, reps_min: 8, reps_max: 12, weight: 60, weight_type: 'fixed', rest_duration: 90, order_index: 0 });

// Après
await repo.save({ block_id: 1, reps_min: 8, weight: 60, weight_type: 'fixed', rest_duration: 90, order_index: 0 });
```

Idem pour les assertions sur les objets retournés (retirer `expect(set.reps_max).toBe(...)`).

- [ ] **Step 5 : Commit**

```bash
git add app/repositories/ISetRepository.ts app/repositories/SQLiteSetRepository.ts app/repositories/setRepository.contract.ts
git commit -m "refactor(repositories): supprimer reps_max — ISetRepository + SQLite"
```

---

### Task 5: Seeds — refactoring complet (SetSpec + helpers + call sites)

**Files:**
- Modify: `app/db/seeds.ts`

`SetSpec` est un type LOCAL dans seeds.ts (non importé depuis types.ts). Les helpers `f()` et `bw()` prennent `reps_max` comme 2ème argument. Toute la chaîne doit être mise à jour.

- [ ] **Step 1 : Mettre à jour `SetSpec` (type local)**

```typescript
type SetSpec = {
  reps_min: number;
  // reps_max supprimé
  weight: number | null;
  weight_type: WeightType;
  rest: number;
  duration_seconds?: number | null;
  weight_ratio?: number | null;
};
```

- [ ] **Step 2 : Mettre à jour les 4 helpers**

```typescript
// f() — retirer reps_max (2ème param). rest devient 2ème param.
function f(reps_min: number, rest: number, weight: number | null = null, weight_ratio: number | null = null): SetSpec {
  return { reps_min, weight, weight_type: 'fixed', rest, weight_ratio };
}

// bw() — retirer reps_max (2ème param). rest devient 2ème param.
function bw(reps_min: number, rest: number): SetSpec {
  return { reps_min, weight: null, weight_type: 'bodyweight', rest };
}

// barOnly() — retirer reps_max du return
function barOnly(reps: number, rest: number): SetSpec {
  return { reps_min: reps, weight: null, weight_type: 'bar', rest };
}

// mob() — retirer reps_max du return
function mob(seconds: number): SetSpec {
  return { reps_min: 1, weight: null, weight_type: 'bodyweight', rest: 0, duration_seconds: seconds };
}
```

- [ ] **Step 3 : Mettre à jour TOUS les call sites de `f()` et `bw()` dans seeds.ts**

Le décalage d'arguments est :
- `f(reps_min, reps_max, rest, weight?)` → `f(reps_min, rest, weight?)`
- `bw(reps_min, reps_max, rest)` → `bw(reps_min, rest)`

Exemples de transformations :
```typescript
// f() — supprimer le 2ème argument (reps_max)
f(8, 8, 120, 60)    → f(8, 120, 60)
f(8, 10, 60, 16)    → f(8, 60, 16)    // Développé incliné (ex-plage 8-10 → cible 8)
f(10, 12, 60, 20)   → f(10, 60, 20)   // Extension triceps
f(12, 15, 45, 25)   → f(12, 45, 25)   // Crunch poulie
f(10, 12, 60, 20)   → f(10, 60, 20)   // Curl EZ
f(10, 12, 60, 30)   → f(10, 60, 30)   // Tirage poulie
f(15, 15, 60, 20)   → f(15, 60, 20)
f(5, 5, 120, 40)    → f(5, 120, 40)

// bw() — supprimer le 2ème argument (reps_max)
bw(8, 12, 60)       → bw(8, 60)       // Dips (ex-plage 8-12 → cible 8)
bw(8, 8, 90)        → bw(8, 90)
bw(12, 15, 45)      → bw(12, 45)      // Relevés de jambes
bw(15, 20, 45)      → bw(15, 45)      // Mollets
bw(6, 10, 90)       → bw(6, 90)       // Tractions bonus
```

Appliquer à TOUS les appels dans le fichier (pas seulement les exemples ci-dessus). TypeScript signalera les oublis.

- [ ] **Step 4 : Vérifier que le SQL INSERT dans seeds.ts ne passe plus `reps_max`**

Chercher le SQL d'insertion des sets dans seeds.ts. Retirer `reps_max` de la liste des colonnes et des paramètres.

- [ ] **Step 5 : Commit**

```bash
git add app/db/seeds.ts
git commit -m "refactor(seeds): supprimer reps_max — SetSpec + helpers f/bw/barOnly/mob + call sites"
```

---

### Task 6: data/templates.ts + TemplateService

**Files:**
- Modify: `app/data/templates.ts`
- Modify: `app/services/TemplateService.ts`
- Modify: `app/services/TemplateService.test.ts`

- [ ] **Step 1 : Mettre à jour `templates.ts` — type + helpers**

```typescript
// Type SetTemplate
type SetTemplate = {
  reps_min: number;
  // reps_max supprimé
  weight: number | null;
  weight_type: WeightType;
  rest: number;
  duration_seconds?: number | null;
  weight_ratio?: number | null;
};

// Helper s()
function s(reps_min: number, rest: number): SetTemplate {
  return { reps_min, weight: null, weight_type: 'fixed', rest };
}

// Helper work()
function work(exerciseName: string, n: number, reps_min: number, rest: number): ExerciseTemplate {
  return {
    exerciseName,
    blocks: [{ name: 'Travail', is_work: true, sets: repeat(n, s(reps_min, rest)) }],
  };
}
```

Après ces changements, TypeScript signalera toutes les erreurs dans les appels `s(...)` et `work(...)` — chaque appel a un argument `reps_max` en trop. Supprimer l'argument `reps_max` de TOUS les appels.

- [ ] **Step 2 : Corriger tous les appels `s()` et `work()` dans `templates.ts`**

Rechercher `s(` et `work(` dans le fichier. Pour chaque :
- `s(repsMin, repsMax, rest)` → `s(repsMin, rest)`  
- `work(name, n, repsMin, repsMax, rest)` → `work(name, n, repsMin, rest)`

- [ ] **Step 3 : Retirer `reps_max` de `TemplateService.ts`**

Dans la méthode qui appelle `setRepo.save()`, supprimer `reps_max` du DTO :

```typescript
await this.setRepo.save({
  block_id: block.id,
  reps_min: setTemplate.reps_min,
  // pas de reps_max
  weight: setTemplate.weight,
  weight_type: setTemplate.weight_type,
  rest_duration: setTemplate.rest,
  order_index: idx,
  duration_seconds: setTemplate.duration_seconds ?? null,
  weight_ratio: setTemplate.weight_ratio ?? null,
});
```

- [ ] **Step 4 : Adapter `TemplateService.test.ts`**

Supprimer `reps_max` des fixtures et des assertions dans les tests.

- [ ] **Step 5 : Commit**

```bash
git add app/data/templates.ts app/services/TemplateService.ts app/services/TemplateService.test.ts
git commit -m "refactor(templates): supprimer reps_max — helpers s() et work() simplifiés"
```

---

### Task 7: WorkoutExerciseService

**Files:**
- Modify: `app/services/WorkoutExerciseService.ts`
- Modify: `app/services/WorkoutExerciseService.test.ts`

- [ ] **Step 1 : Retirer `reps_max` des 3 appels `setRepo.save()` dans `WorkoutExerciseService.ts`**

Les 3 occurrences hardcodent `reps_min: 3, reps_max: 8`. Corriger :

```typescript
await this.setRepo.save({
  block_id: block.id,
  reps_min: 3,
  // reps_max supprimé
  weight: null,
  weight_type: 'fixed',
  rest_duration: 120,
  order_index: 0,
});
```

- [ ] **Step 2 : Adapter `WorkoutExerciseService.test.ts`**

Supprimer `reps_max` des fixtures et assertions.

- [ ] **Step 3 : Commit**

```bash
git add app/services/WorkoutExerciseService.ts app/services/WorkoutExerciseService.test.ts
git commit -m "refactor(WorkoutExerciseService): supprimer reps_max des DTOs"
```

---

### Task 8: SessionService — câbler calculateProgression

**Files:**
- Modify: `app/services/SessionService.ts`
- Modify: `app/services/SessionService.test.ts`

- [ ] **Step 1 : Mettre à jour l'import dans `SessionService.ts`**

```typescript
import {
  calculateProgression,
  applyDeload,
  isSessionSignificantFailure,
  SetResult,
} from './progression';
```

(`applyProgression` et `isSessionFullSuccess` retirés de l'import.)

- [ ] **Step 2 : Remplacer le bloc progression dans `calculateProgressions`**

Avant (lignes ~227–238) :

```typescript
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
}
```

Après :

```typescript
const progressionResult = calculateProgression(
  {
    current_weight: oldWeight ?? 0,
    progression_step: exercise.progression_step,
    progression_threshold: exercise.progression_threshold,
    consecutive_successes: 0,
  },
  currentSetResults,
);

if (progressionResult.progressed && oldWeight !== null) {
  for (const set of travailSets) {
    await this.setRepo.update(set.id, {
      reps_min: set.reps_min,
      weight: progressionResult.new_weight,
      weight_type: set.weight_type,
      rest_duration: set.rest_duration,
    });
  }
  results.push({ exerciseId: exercise.id, exerciseName: exercise.name, oldWeight, newWeight: progressionResult.new_weight, achieved: true, consecutiveSuccesses: 1, threshold: exercise.progression_threshold });
}
```

- [ ] **Step 3 : Retirer `reps_max` du bloc deload (lignes ~244–252)**

```typescript
// Avant
await this.setRepo.update(set.id, {
  reps_min: set.reps_min,
  reps_max: set.reps_max,
  weight: newWeight,
  weight_type: set.weight_type,
  rest_duration: set.rest_duration,
});

// Après
await this.setRepo.update(set.id, {
  reps_min: set.reps_min,
  weight: newWeight,
  weight_type: set.weight_type,
  rest_duration: set.rest_duration,
});
```

- [ ] **Step 4 : Supprimer `reps_max` de toutes les fixtures dans `SessionService.test.ts`**

Les occurrences à corriger (supprimer `reps_max: X`) :
- Ligne ~224 : `ctx.setRepo.save({ ..., reps_min: 1, reps_max: 1, ... })` → retirer `reps_max: 1`
- Ligne ~248 : dans `seedWorkoutWithExercise` : `ctx.setRepo.save({ ..., reps_min: 6, reps_max: 8, ... })` → retirer `reps_max: 8`
- Ligne ~331 : `ctx.setRepo.save({ ..., reps_min: 1, reps_max: 1, ... })` → retirer `reps_max: 1`
- Ligne ~349 : `ctx.setRepo.save({ ..., reps_min: 10, reps_max: 10, ... })` → retirer `reps_max: 10`
- Ligne ~352 : `ctx.setRepo.save({ ..., reps_min: 6, reps_max: 8, ... })` → retirer `reps_max: 8`

- [ ] **Step 5 : Mettre à jour le test de progression existant (expectation change)**

Le test "applique la progression si tous les sets de travail sont atteints" (ligne ~252) utilise `progression_step: 2.5` (dans `seedWorkoutWithExercise`). Après câblage de `calculateProgression` :

```typescript
// Avant (applyProgression(80) = Math.ceil(82/2)*2 = 82)
expect(progressions[0].newWeight).toBe(82);
const updatedSet = await ctx.setRepo.findById(set.id);
expect(updatedSet?.weight).toBe(82);

// Après (calculateProgression avec step=2.5 → 80 + 2.5 = 82.5)
expect(progressions[0].newWeight).toBe(82.5);
const updatedSet = await ctx.setRepo.findById(set.id);
expect(updatedSet?.weight).toBe(82.5);
```

- [ ] **Step 6 : Lancer les tests SessionService**

```
cd app && npx jest SessionService --no-coverage
```

Attendu : tous passent.

- [ ] **Step 7 : Commit**

```bash
git add app/services/SessionService.ts app/services/SessionService.test.ts
git commit -m "feat(SessionService): câbler calculateProgression avec exercise.progression_step"
```

---

### Task 9: Fixtures tests restants

**Files:**
- Modify: `app/services/weightRatio.test.ts`
- Modify: `app/hooks/useSession.test.ts`

- [ ] **Step 1 : Supprimer `reps_max` des fixtures dans `weightRatio.test.ts`**

Rechercher toutes les occurrences de `reps_max` et les supprimer des objets de test.

- [ ] **Step 2 : Supprimer `reps_max` des fixtures dans `useSession.test.ts`**

Même traitement.

- [ ] **Step 3 : Lancer la suite de tests complète**

```
cd app && npx jest --no-coverage
```

Attendu : tous passent.

- [ ] **Step 4 : Commit**

```bash
git add app/services/weightRatio.test.ts app/hooks/useSession.test.ts
git commit -m "fix(tests): supprimer reps_max des fixtures weightRatio + useSession"
```

---

### Task 10: Typecheck global

- [ ] **Step 1 : Lancer le typecheck**

```
cd app && npm run typecheck
```

Attendu : 0 erreurs. Si des erreurs subsistent, les corriger avant de continuer.

---

### Task 11: UI — RunningPhase (4 corrections)

**Files:**
- Modify: `app/components/session/RunningPhase.tsx`

- [ ] **Step 1 : Corriger l'initialiseur d'état (bogue actuel)**

```typescript
// Avant (bogue : initialisé à reps_max au lieu de reps_min)
const [reps, setReps] = useState(String(set.reps_max));

// Après
const [reps, setReps] = useState(String(set.reps_min));
```

- [ ] **Step 2 : Simplifier `setLabel`**

```typescript
// Avant
const setLabel = set.reps_min === set.reps_max
  ? `${set.reps_min} rép`
  : `${set.reps_min}–${set.reps_max} rép`;

// Après
const setLabel = `${set.reps_min} rép`;
```

- [ ] **Step 3 : Corriger l'appel `computeRepsFeedback`**

```typescript
// Avant
const repsFeedback = computeRepsFeedback(
  reps,
  set.reps_min,
  set.reps_max,
  set.weight_type === 'bodyweight',
);

// Après
const repsFeedback = computeRepsFeedback(
  reps,
  set.reps_min,
  set.weight_type === 'bodyweight',
);
```

- [ ] **Step 4 : Corriger l'affichage "Séries restantes"**

```typescript
// Avant
{s.reps_min === s.reps_max ? s.reps_min : `${s.reps_min}–${s.reps_max}`}

// Après
{s.reps_min}
```

- [ ] **Step 5 : Commit**

```bash
git add app/components/session/RunningPhase.tsx
git commit -m "fix(RunningPhase): corriger initialiseur reps_min, supprimer reps_max"
```

---

### Task 12: UI — ExerciseTransitionPhase, BlockCard, EditSetModal

**Files:**
- Modify: `app/components/session/ExerciseTransitionPhase.tsx`
- Modify: `app/components/workout/BlockCard.tsx`
- Modify: `app/components/workout/EditSetModal.tsx`

- [ ] **Step 1 : `ExerciseTransitionPhase.tsx` — simplifier label reps**

```typescript
// Avant
const repsLabel =
  s.reps_min === s.reps_max ? `${s.reps_min} reps` : `${s.reps_min}–${s.reps_max} reps`;

// Après
const repsLabel = `${s.reps_min} reps`;
```

- [ ] **Step 2 : `BlockCard.tsx` — simplifier `formatSet`**

```typescript
// Avant
function formatSet(set: TrainingSet): string {
  const reps = set.reps_min === set.reps_max
    ? `${set.reps_min} rép`
    : `${set.reps_min}–${set.reps_max} rép`;
  // ...
}

// Après
function formatSet(set: TrainingSet): string {
  const reps = `${set.reps_min} rép`;
  // reste inchangé
}
```

- [ ] **Step 3 : `EditSetModal.tsx` — supprimer champ reps_max**

Retirer : `const [repsMax, setRepsMax] = useState(String(set.reps_max));`

Remplacer le `View repsRow` (deux inputs + séparateur) par un seul input full-width :

```tsx
{/* Avant — deux inputs en row */}
<View style={styles.repsRow}>
  <TextInput style={[styles.input, ...]} value={repsMin} onChangeText={setRepsMin}
    keyboardType="numeric" accessibilityLabel="Répétitions minimum" />
  <Text style={[styles.separator, ...]}>–</Text>
  <TextInput style={[styles.input, ...]} value={repsMax} onChangeText={setRepsMax}
    keyboardType="numeric" accessibilityLabel="Répétitions maximum" />
</View>

{/* Après — un seul input */}
<TextInput
  style={[styles.inputFull, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
  value={repsMin}
  onChangeText={setRepsMin}
  keyboardType="numeric"
  accessibilityLabel="Répétitions"
/>
```

Mettre à jour `handleSave` :

```typescript
async function handleSave() {
  const dto: UpdateSetDto = {
    reps_min: parseInt(repsMin, 10) || set.reps_min,
    weight: weightDisabled ? null : (weight.trim() ? parseFloat(weight) : null),
    weight_type: weightType,
    rest_duration: parseInt(rest, 10) || set.rest_duration,
  };
  await onSave(dto);
  onClose();
}
```

Supprimer les styles morts de `StyleSheet.create` : `repsRow`, `input`, `separator`.

- [ ] **Step 4 : Lancer typecheck final**

```
cd app && npm run typecheck
```

Attendu : 0 erreurs.

- [ ] **Step 5 : Lancer la suite de tests complète**

```
cd app && npx jest --no-coverage
```

Attendu : tous passent.

- [ ] **Step 6 : Commit**

```bash
git add app/components/session/ExerciseTransitionPhase.tsx app/components/workout/BlockCard.tsx app/components/workout/EditSetModal.tsx
git commit -m "fix(UI): supprimer reps_max — ExerciseTransition, BlockCard, EditSetModal"
```
