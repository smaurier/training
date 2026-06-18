# Progression step + suppression reps_max — Design

## Contexte

Deux bugs conjoints dans l'algorithme de progression :
1. `applyProgression` ignore `exercise.progression_step` — utilise ×1.025 fixe
2. `reps_max` existe mais n'est plus utilisé (décision design : cibles fixes, `reps_min` canonique)

Décision : corriger les deux dans la même migration.

---

## Décisions de design

| Sujet | Décision | Raison |
|---|---|---|
| Cible reps | `reps_min` uniquement (`reps_max` supprimé) | Objectif rond en séance, sémantique claire |
| Normalisation seeds | reps_min = ancienne valeur basse (ex: 8-10 → 8) | `reps_min` déjà utilisé dans toute la logique |
| Pas de progression | `exercise.progression_step` (défaut 2.0 kg en DB) | Matériel réel, plus réaliste que ×1.025 |
| Gate RPE | Aucun (collecte DB uniquement) | Pas de validation scientifique pour gate session-par-session |
| `calculateProgression` | Câblé dans SessionService (remplace `applyProgression`) | Déjà correct, progression_step inclus |
| `consecutive_successes` | Toujours 0 (non persisté) | Tous les exercices ont `progression_threshold = 1` (défaut DB, absent des seeds) → progress à chaque succès |

---

## Règle de progression (simplifiée)

```
tous les sets travail >= reps_min  →  nouveau_poids = poids + progression_step
sinon                              →  poids inchangé
```

RPE stocké dans `set_logs.rpe` (déjà câblé) — exploité par détection plateau (#2) et décharge auto (#3).

---

## Migration v9

Recréation de la table `sets` sans `reps_max` (pattern SQLite du projet) :

```sql
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
```

---

## Fichiers touchés

### DB / Types
- `app/db/schema.ts` — migration v9 (recréation sets sans reps_max)
- `app/db/types.ts` — supprimer `reps_max: number` de l'interface `Set`
- `app/db/seeds.ts` — normaliser 9 exercices avec plage (voir tableau ci-dessous)

### Repositories
- `app/repositories/ISetRepository.ts` — supprimer `reps_max` de `SetInsert` / `SetUpdate`
- `app/repositories/SQLiteSetRepository.ts` — retirer `reps_max` des requêtes SQL
- `app/repositories/setRepository.contract.ts` — adapter les tests

### Services
- `app/services/progression.ts` — supprimer `applyProgression` (remplacée par `calculateProgression`)
- `app/services/progression.test.ts` — supprimer les tests `applyProgression`
- `app/services/repsFeedback.ts` — **supprimer paramètre `repsMax`**, adapter logique (voir ci-dessous)
- `app/services/repsFeedback.test.ts` — **réécrire les 8 tests** avec nouvelle signature
- `app/services/SessionService.ts` — câbler `calculateProgression`, supprimer appel `isSessionFullSuccess` et `applyProgression`, retirer `reps_max` des appels `setRepo.update`
- `app/services/SessionService.test.ts` — adapter tests
- `app/services/WorkoutExerciseService.ts` — retirer `reps_max`
- `app/services/WorkoutExerciseService.test.ts`
- `app/services/TemplateService.ts` — retirer `reps_max`
- `app/services/TemplateService.test.ts`
- `app/services/weightRatio.test.ts` — adapter données test (supprimer `reps_max` des fixtures)
- `app/data/templates.ts` — retirer `reps_max` de tous les sets template

### Hooks
- `app/hooks/useSession.test.ts` — adapter fixtures

### UI
- `app/components/session/RunningPhase.tsx` — 4 occurrences à corriger (voir ci-dessous)
- `app/components/session/ExerciseTransitionPhase.tsx` — remplacer `reps_min–reps_max` par `reps_min`
- `app/components/workout/BlockCard.tsx` — remplacer affichage `reps_min–reps_max` par `reps_min`
- `app/components/workout/EditSetModal.tsx` — supprimer champ `reps_max`

---

## Exercices à normaliser dans seeds.ts

| Exercice | Avant | reps_min après |
|---|---|---|
| Développé incliné haltères | 8-10 | 8 |
| Dips | 8-12 | 8 |
| Extension triceps poulie | 10-12 | 10 |
| Crunch poulie haute | 12-15 | 12 |
| Curl barre EZ | 10-12 | 10 |
| Tirage poulie basse | 10-12 | 10 |
| Relevés de jambes | 12-15 | 12 |
| Mollets debout sur step | 15-20 | 15 |
| Tractions bonus | 6-10 | 6 |

---

## repsFeedback.ts — refactoring signature

Suppression du paramètre `repsMax`. Avec cible fixe unique, le seuil "dépasse" utilise `repsMin * 1.25` (même logique, source différente) :

```typescript
// Avant
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

// Après
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

Appel site dans RunningPhase :
```typescript
// Avant
const repsFeedback = computeRepsFeedback(reps, set.reps_min, set.reps_max, set.weight_type === 'bodyweight');

// Après
const repsFeedback = computeRepsFeedback(reps, set.reps_min, set.weight_type === 'bodyweight');
```

---

## RunningPhase — 4 occurrences à corriger

```typescript
// 1. Initialiseur d'état (BOGUE : s'initialise à reps_max, pas reps_min)
// Avant
const [reps, setReps] = useState(String(set.reps_max));
// Après
const [reps, setReps] = useState(String(set.reps_min));

// 2. Label série
// Avant
const setLabel = set.reps_min === set.reps_max
  ? `${set.reps_min} rép`
  : `${set.reps_min}–${set.reps_max} rép`;
// Après
const setLabel = `${set.reps_min} rép`;

// 3. Appel computeRepsFeedback (voir section repsFeedback ci-dessus)

// 4. Séries restantes
// Avant
{s.reps_min === s.reps_max ? s.reps_min : `${s.reps_min}–${s.reps_max}`}
// Après
{s.reps_min}
```

---

## SessionService — câblage calculateProgression

```typescript
// Avant (bugué — ignore progression_step)
if (isSessionFullSuccess(currentSetResults) && oldWeight !== null) {
  const newWeight = applyProgression(oldWeight);
  for (const set of travailSets) {
    await this.setRepo.update(set.id, {
      reps_min: set.reps_min,
      reps_max: set.reps_max,
      weight: newWeight,
    });
  }
}

// Après
const exercise = await this.exerciseRepo.findById(exerciseId);
const result = calculateProgression(
  {
    current_weight: oldWeight ?? 0,
    progression_step: exercise?.progression_step ?? 2.0,
    progression_threshold: exercise?.progression_threshold ?? 1,
    consecutive_successes: 0,
  },
  currentSetResults,
);
if (result.progressed) {
  for (const set of travailSets) {
    await this.setRepo.update(set.id, { weight: result.new_weight });
  }
}
```

Note : `isSessionFullSuccess` retiré de cet appel — `calculateProgression` le gère en interne via `isSessionAchieved`. La fonction `isSessionFullSuccess` reste exportée (utilisée dans les tests existants).

---

## Tests à écrire / adapter

### `progression.test.ts`
- Supprimer les 2 tests `applyProgression` (×1.025)
- Garder tous les tests `calculateProgression`, `applyDeload`, `isSessionAchieved`, `isSessionSignificantFailure`

### `repsFeedback.test.ts`
Réécrire les 8 tests avec nouvelle signature `(repsStr, repsMin, isBodyweight)` :
- `computeRepsFeedback('10', 5, true)` → null (bodyweight)
- `computeRepsFeedback('', 5, false)` → null (vide)
- `computeRepsFeedback('abc', 5, false)` → null (non-numérique)
- `computeRepsFeedback('5', 5, false)` → null (dans la cible)
- `computeRepsFeedback('6', 5, false)` → null (exactement à repsMin * 1.25 = 6.25, 6 ne dépasse pas)
- `computeRepsFeedback('7', 5, false)` → "Tu dépasses la cible..." (7 > 5 * 1.25 = 6.25)
- `computeRepsFeedback('4', 5, false)` → null (4 >= 5 * 0.75 = 3.75)
- `computeRepsFeedback('3', 5, false)` → "Tu es en dessous de la cible..." (3 < 3.75)

### `SessionService.test.ts`
- Cas : progression avec `progression_step = 2.5` → `newWeight = oldWeight + 2.5`
- Cas : progression avec `progression_step = 5` → `newWeight = oldWeight + 5`
- Cas : hold si reps ratées → `newWeight = oldWeight`

---

## Hors scope

- Décharge automatique (feature #3) — `applyDeload` conservé tel quel
- Détection plateau (feature #2) — utilise `set_logs.rpe` déjà stocké
- `consecutive_successes` persisté en DB — threshold > 1 non utilisé (tous exercises à DEFAULT 1)
- Revue scientifique des algorithmes — reportée à l'audit global (axe 6)
- Clean code global — reporté à l'audit global (axe 7)
