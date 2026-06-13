# Échauffement auto — Design

## Contexte

Les séries d'échauffement progressives sont scientifiquement validées (NSCA, Rippetoe, Helms) pour les exercices composés lourds : elles préparent le système nerveux central, réduisent le risque de blessure et améliorent la performance sur les séries de travail. Cette feature calcule et affiche automatiquement des séries d'échauffement basées sur le poids de travail actuel — sans les stocker en DB.

Le seed PPL contient déjà un bloc `Échauffement` hardcodé pour le Développé couché barre (40kg×5 + 45kg×3 pour un travail à 60kg). Ces valeurs ne s'ajustent pas à la progression. Cette feature remplace ce bloc par un calcul dynamique standardisé, et l'étend à tous les exercices composés qualifiés.

---

## Décisions de design

| Sujet | Décision | Raison |
|---|---|---|
| Stockage | Bloc virtuel — rien en DB | Warmup = préparation, pas du Travail loggable. Toujours synchronisé avec le poids courant. |
| Phase dédiée | Oui — `WarmupPhase` (nouvel écran) | Écran dédié = lisibilité maximale au moment où l'utilisateur en a besoin. Cohérent avec le pattern phase existant. |
| Déclencheur | `weight_type === 'fixed'` ET poids 1er set Travail ≥ 40kg | Couvre les composés lourds (bench, squat, rowing, RDL), exclut isolations légères (curl 20kg, élévations 8kg). |
| Protocole | 3 séries : 40%×8 + 60%×5 + 80%×2 | NSCA Essentials — protocole standard intermédiaire. Scientifiquement validé. |
| Arrondi | 2kg inférieur : `Math.floor(w / 2) * 2` | Matériel standard salle (disques 2kg). Cohérent avec `applyDeload`. |
| Repos | Indication texte "~60 s entre chaque" | Warmup = préparation cognitive, pas un entraînement. Pas de timer. |
| Interaction | Bouton unique "Commencer le travail →" | L'utilisateur n'est pas à la série près. Friction zéro. |
| Seed cleanup | DELETE bloc Échauffement bench dans `seedProgram` | Standardise tous les exercices — plus aucun hardcodé. |
| Pas de plaque | 2kg hardcodé en V1 | Futur : clé `plate_step` dans `settings` (backlog). |

---

## Qualification d'un exercice

```typescript
function shouldShowWarmup(workWeight: number, weightType: WeightType): boolean {
  return weightType === 'fixed' && workWeight >= 40;
}
```

**Exercices PPL qualifiés** (seed actuel) :
- Développé couché barre : 60kg ✓
- Squat barre : 60kg ✓
- Rowing barre : 50kg ✓
- Romanian Deadlift : 50kg ✓
- Pin Press : 40kg ✓ (exactement au seuil)

**Exclus** : Tractions (bodyweight), Curl EZ (20kg), Élévations latérales (8kg), Footing (bodyweight), exercices étirements (bodyweight/duration).

---

## Protocole — calcul

```typescript
type WarmupSet = { weight: number; reps: number; rest: number };

function computeWarmupSets(workWeight: number): WarmupSet[] {
  const round2 = (w: number) => Math.floor(w / 2) * 2;
  return [
    { weight: round2(workWeight * 0.4), reps: 8,  rest: 60  },
    { weight: round2(workWeight * 0.6), reps: 5,  rest: 60  },
    { weight: round2(workWeight * 0.8), reps: 2,  rest: 90  },
  ];
}
```

**Exemple — Squat 60kg** :
- 40% → `Math.floor(24/2)*2 = 24kg` × 8 reps
- 60% → `Math.floor(36/2)*2 = 36kg` × 5 reps
- 80% → `Math.floor(48/2)*2 = 48kg` × 2 reps

Le `workWeight` est le poids **résolu** (après `resolveWeights()` et ajustements mid-session), jamais le poids brut DB. Si l'utilisateur a ajusté son poids en séance, le warmup recalcule automatiquement.

---

## Flow UX

```
ExerciseTransitionPhase          (déjà existant — "Prochain : Squat barre")
  ↓
ExerciseStartingWeightPhase?     (si poids null — premier usage)
  ↓ (poids résolu disponible)
WarmupPhase                      (si shouldShowWarmup → true)
  ↓ tap "Commencer le travail →"
RunningPhase — 1er set Travail
  ↓ sets suivants sans WarmupPhase
RestPhase → RunningPhase → ...
```

**WarmupPhase n'apparaît qu'une seule fois par exercice**, avant le 1er set. Jamais entre deux sets du même exercice. Jamais en reprise de séance si déjà passé (position restaurée après le warmup).

**Interaction** : bouton unique "Commencer le travail →". Pas de timer, pas de check-off par série, pas de bouton "Passer". L'utilisateur ignore les sets et tape "Commencer" s'il ne veut pas s'échauffer.

---

## `WarmupPhase` — composant

```typescript
type WarmupPhaseProps = {
  exerciseName: string;
  workWeight: number;   // résolu, en kg (conversion affichage gérée globalement)
  onStart: () => void;
};
```

Layout :

```
ÉCHAUFFEMENT
Développé couché barre

  24 kg × 8     40%
  36 kg × 5     60%
  48 kg × 2     80%

  Repos ~60 s entre chaque série

  [ Commencer le travail → ]
```

- Poids affiché selon l'unité utilisateur (kg/lbs) — conversion globale existante
- % affiché en couleur secondaire/neutre — informatif, pas prescriptif
- Style cohérent avec les autres phases (SafeAreaView, ScrollView, card section)

---

## Architecture — fichiers

| Fichier | Action |
|---|---|
| `app/services/warmup.ts` | Créer — `computeWarmupSets` + `shouldShowWarmup` (pure functions) |
| `app/services/warmup.test.ts` | Créer — TDD, cas limites |
| `app/components/session/WarmupPhase.tsx` | Créer — composant phase |
| `app/app/session/[workoutId].tsx` | Modifier — branche sur phase `'warmup'` |
| `app/db/seeds.ts` | Modifier — supprimer bloc Échauffement hardcodé bench press + DELETE cleanup dans `seedProgram` |

**Pas de migration DB** — tout virtuel. Pas de nouvelle table, pas de nouvelle colonne.

---

## Intégration state machine

`useSession` (ou `[workoutId].tsx`) dérive `needsWarmup` :

```typescript
const needsWarmup =
  isFirstSetOfExercise &&
  shouldShowWarmup(resolvedWorkWeight, currentSet.weight_type);
```

Le flag `isFirstSetOfExercise` est déjà disponible (ExerciseTransitionPhase l'utilise). Phase `'warmup'` ajoutée au type union des phases de session.

`onStart` (WarmupPhase) → bascule phase vers `'running'` sur le 1er set Travail.

---

## Seed cleanup

Dans `seedProgram`, après résolution du `programId` PPL :

```sql
DELETE FROM blocks
WHERE name = 'Échauffement'
AND workout_exercise_id IN (
  SELECT id FROM workout_exercises
  WHERE workout_id IN (
    SELECT id FROM workouts WHERE program_id = ?
  )
)
```

**Note CASCADE** : le DELETE cascade sur `sets`, puis `set_logs` (si FK CASCADE existante). Les set_logs des séries d'échauffement sont `is_work_block = false` — jamais utilisés par progression, décharge, plateau. Perte de données acceptable. Vérifier FK CASCADE dans le plan avant d'exécuter.

Dans `seeds.ts`, le bloc `{ name: 'Échauffement', is_work: false, sets: [...] }` est retiré de la définition `Développé couché barre`.

---

## Hors scope

- Timer entre séries d'échauffement → V3
- Check-off par série → V3
- Configurer le protocole (nb séries, %) → V3
- Désactiver l'échauffement par exercice → V3
- Pas de plaque configurable (`plate_step` setting) → backlog V2
