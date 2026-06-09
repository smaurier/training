# Spec — Weight Ratio Back-off

**Date :** 2026-06-09
**Scope :** Calcul automatique du poids Back-off par ratio depuis le poids Travail
**Statut :** Approuvé

---

## Problème

Les blocs Back-off sont seedés avec `weight: null`. En séance, l'affichage est `— × 12–15 rép` — l'utilisateur doit calculer mentalement 80% du poids Travail (ex: 60kg → 48kg). Friction inutile.

---

## Solution

Ajouter `weight_ratio REAL` sur la table `sets`. Les sets Back-off PPL reçoivent `weight_ratio: 0.8`. Au chargement de la séance, une pure function `resolveWeights` injecte les poids calculés en mémoire — aucune écriture en DB, RunningPhase inchangé.

---

## Migration DB

**Migration v6** dans `db/migrations.ts` :

```sql
ALTER TABLE sets ADD COLUMN weight_ratio REAL;
```

`db/types.ts` — ajouter sur `WorkoutSet` :

```ts
weight_ratio: number | null;
```

---

## Seeds

Modifier le helper `f()` dans `db/seeds.ts` :

```ts
function f(reps_min: number, reps_max: number, rest: number, weight: number | null = null, weight_ratio: number | null = null) {
  return { reps_min, reps_max, weight, weight_type: 'fixed' as const, rest_duration: rest, weight_ratio };
}
```

Tous les sets Back-off PPL : `f(12, 15, 60, null, 0.8)`.

---

## Pure function `resolveWeights`

**Fichier :** `app/services/weightRatio.ts`

```ts
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';

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

**Règles :**
- Si Travail `weight` est null → retourner l'exercice inchangé (pas encore de poids de départ)
- Si le set a déjà un `weight` explicite → ne pas écraser (saisie manuelle prioritaire)
- Arrondi : `Math.round(travailWeight × ratio / 2) × 2` → multiple de 2kg

**Exemples :**
| Travail | Ratio | Résultat |
|---|---|---|
| 60 kg | 0.8 | 48 kg |
| 40 kg | 0.8 | 32 kg |
| 65 kg | 0.8 | 52 kg |
| 63 kg | 0.8 | 50 kg (50.4 → arrondi) |
| null | 0.8 | null (inchangé) |

---

## Intégration useSession

Dans `hooks/useSession.ts`, après le chargement de `workoutDetails`, appliquer `resolveWeights` sur chaque exercice :

```ts
import { resolveWeights } from '@/services/weightRatio';

// après load :
const resolvedExercises = workoutDetails.exercises.map(resolveWeights);
```

La résolution est en mémoire uniquement — le DB n'est jamais modifié.

---

## Tests

**Fichier :** `app/services/weightRatio.test.ts`

Cas à couvrir :
1. Travail 60kg + ratio 0.8 → Back-off 48kg
2. Travail null → exercice inchangé
3. Set avec `weight` déjà défini → inchangé (saisie manuelle non écrasée)
4. Arrondi : 63kg × 0.8 = 50.4 → 50kg
5. Set sans `weight_ratio` (Travail, Échauffement) → inchangé
6. Exercice sans bloc "Travail" → inchangé

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `db/migrations.ts` | Migration v6 : `ALTER TABLE sets ADD COLUMN weight_ratio REAL` |
| `db/types.ts` | `weight_ratio: number \| null` sur `WorkoutSet` |
| `db/seeds.ts` | Helper `f()` + back-off sets PPL → `weight_ratio: 0.8` |
| `services/weightRatio.ts` | Nouveau — `resolveWeights` pure function |
| `services/weightRatio.test.ts` | Nouveau — 6 tests |
| `hooks/useSession.ts` | Appel `resolveWeights` après load workoutDetails |

**Inchangés :** `RunningPhase.tsx`, `SessionService.ts`, tous les repositories.

---

## Hors scope

- Autres ratios (échauffement en % du Travail) — même mécanique, extensible plus tard
- Affichage du ratio dans l'UI création/édition de set
- RPE-adjusted ou 1RM Epley
