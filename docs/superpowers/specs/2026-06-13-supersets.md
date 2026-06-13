# Spec — Supersets

**Date :** 2026-06-13
**Statut :** Approuvé

---

## Contexte

Permettre de lier N exercices (A→B→C) dans un workout pour les enchaîner sans pause pendant la séance. Le repos tombe uniquement après le dernier exercice du groupe. Couvre supersets (A+B) et tri-sets (A+B+C).

Philosophie anti-perf :
- Célèbre la présence (✓) : fonctionnalité neutre, aucun jugement de performance
- Données tirées (✓) : configuré par l'utilisateur, affiché pendant la séance
- Soi-même (✓) : comparaison interne uniquement

---

## Règles de gestion

- **Taille du groupe :** 2 ou plus. Pas de limite fixe en V1.
- **Repos :** uniquement après le dernier exercice du groupe. Pas de repos entre les exercices du groupe.
- **Rounds :** A set 1 → B set 1 → C set 1 → REST → A set 2 → B set 2 → C set 2 → REST → …
- **Contrainte V1 :** Les exercices d'un groupe doivent avoir le même nombre de séries. Le routing se base sur le premier exercice du groupe pour déterminer le nombre de rounds.
- **Délier = dissoudre :** Délier un exercice d'un groupe dissout tout le groupe (tous les membres repassent à `superset_group_id = NULL`). Pas de déliaison partielle en V1.
- **Réorganisation :** Si les exercices d'un groupe sont réordonnés, le groupe reste intact. Le routing utilise l'ordre trié par `exerciseIdx` comme source de vérité.
- **`skipExercise` en superset :** Saute le groupe entier (premier exercice après le groupe). Texte de confirmation : `"Passer le superset entier (A · B · C)"`.
- **Warmup :** La phase warmup ne s'applique qu'au premier exercice du groupe (lors de l'exercise_transition initiale). Les exercices suivants du groupe passent directement en `running`.

---

## Data model

### Migration v13

```sql
ALTER TABLE workout_exercises ADD COLUMN superset_group_id INTEGER;
```

- `superset_group_id` NULL = exercice standalone.
- `superset_group_id` non-null = membre d'un groupe superset.
- Même valeur = même groupe. Scoped par workout (les IDs ne sont pas globaux).
- L'ordre dans le groupe = `order_index` de `workout_exercises` (déjà existant).

### `WorkoutExercise` (types.ts)

Ajouter le champ :
```typescript
superset_group_id: number | null;
```

### `WorkoutExerciseDetail` (WorkoutExerciseService.ts)

Ajouter le champ dans l'interface et le propager depuis `workout_exercises` :
```typescript
superset_group_id: number | null;
```

---

## Architecture

### Repository — `IWorkoutExerciseRepository`

Nouvelle méthode :
```typescript
updateSuperset(id: number, groupId: number | null): Promise<void>;
```

Implémentations : `InMemoryWorkoutExerciseRepository` + `SQLiteWorkoutExerciseRepository`.

### Service — `WorkoutExerciseService`

Deux nouvelles méthodes :

```typescript
async linkToNext(aId: number, bId: number): Promise<void>
```
- Récupère les deux `workout_exercises`
- Calcule `newGroupId` par priorité :
  1. Si B est déjà dans un groupe → utiliser le `groupId` de B (A rejoint le groupe de B)
  2. Si A est déjà dans un groupe → utiliser le `groupId` de A (B rejoint le groupe de A)
  3. Sinon → générer `MAX(superset_group_id) + 1` parmi tous les exercices du workout
- Appelle `updateSuperset(aId, newGroupId)` et `updateSuperset(bId, newGroupId)`.

```typescript
async unlink(workoutExerciseId: number): Promise<void>
```
- Récupère `superset_group_id` de l'exercice.
- Si null → no-op.
- Sinon, récupère tous les exercices du workout avec ce `superset_group_id`.
- Appelle `updateSuperset(id, null)` sur chacun d'eux.

### Hook — `useWorkoutExercises`

Expose :
```typescript
linkToNext: (id: number) => Promise<void>;
unlink: (id: number) => Promise<void>;
```

---

## Session routing

### `advancePosition` (useSession.ts)

Signature inchangée : `(position: SessionPosition, details: WorkoutExerciseDetail[]) => SessionPosition | null`

Logique ajoutée en tête de fonction, avant la logique standard :

```typescript
const currentGroupId = details[exerciseIdx]?.superset_group_id;
if (currentGroupId != null) {
  // Tous les membres du groupe, triés par exerciseIdx
  const groupExercises = details
    .map((d, i) => ({ detail: d, exerciseIdx: i }))
    .filter(({ detail }) => detail.superset_group_id === currentGroupId)
    .sort((a, b) => a.exerciseIdx - b.exerciseIdx);

  const posInGroup = groupExercises.findIndex(g => g.exerciseIdx === exerciseIdx);
  const isLastInGroup = posInGroup === groupExercises.length - 1;

  if (!isLastInGroup) {
    // Avancer au prochain exercice du groupe, même setIdx
    const next = groupExercises[posInGroup + 1];
    return { exerciseIdx: next.exerciseIdx, blockIdx: 0, setIdx };
  }

  // Dernier du groupe : vérifier s'il reste des tours
  const firstInGroup = groupExercises[0];
  const firstBlock = details[firstInGroup.exerciseIdx]?.blocks[0];
  if (firstBlock && setIdx + 1 < firstBlock.sets.length) {
    // Prochain tour : retour au premier exercice du groupe
    return { exerciseIdx: firstInGroup.exerciseIdx, blockIdx: 0, setIdx: setIdx + 1 };
  }

  // Tous les tours terminés : exercice après le groupe
  const lastGroupExerciseIdx = groupExercises[groupExercises.length - 1].exerciseIdx;
  if (lastGroupExerciseIdx + 1 < details.length) {
    return { exerciseIdx: lastGroupExerciseIdx + 1, blockIdx: 0, setIdx: 0 };
  }
  return null;
}
// ... logique standard inchangée
```

### Helpers (useSession.ts)

```typescript
function isSupersetForward(
  current: SessionPosition,
  next: SessionPosition,
  details: WorkoutExerciseDetail[]
): boolean {
  const currentGroupId = details[current.exerciseIdx]?.superset_group_id;
  if (currentGroupId == null) return false;
  if (details[next.exerciseIdx]?.superset_group_id !== currentGroupId) return false;
  // Même groupe : vérifier qu'on avance (pas un retour en début de groupe)
  const groupExercises = details
    .map((d, i) => ({ detail: d, exerciseIdx: i }))
    .filter(({ detail }) => detail.superset_group_id === currentGroupId)
    .sort((a, b) => a.exerciseIdx - b.exerciseIdx);
  const currentPos = groupExercises.findIndex(g => g.exerciseIdx === current.exerciseIdx);
  const nextPos = groupExercises.findIndex(g => g.exerciseIdx === next.exerciseIdx);
  return nextPos > currentPos;
}

function isSupersetNextRound(
  current: SessionPosition,
  next: SessionPosition,
  details: WorkoutExerciseDetail[]
): boolean {
  const currentGroupId = details[current.exerciseIdx]?.superset_group_id;
  if (currentGroupId == null) return false;
  if (details[next.exerciseIdx]?.superset_group_id !== currentGroupId) return false;
  const groupExercises = details
    .map((d, i) => ({ detail: d, exerciseIdx: i }))
    .filter(({ detail }) => detail.superset_group_id === currentGroupId)
    .sort((a, b) => a.exerciseIdx - b.exerciseIdx);
  const currentPos = groupExercises.findIndex(g => g.exerciseIdx === current.exerciseIdx);
  const nextPos = groupExercises.findIndex(g => g.exerciseIdx === next.exerciseIdx);
  return nextPos < currentPos; // retour en début de groupe = prochain tour
}
```

### `validateSet` (useSession.ts)

Après le calcul de `next` via `advancePosition`, avant la logique de repos actuelle :

```typescript
if (isSupersetForward(position, next, workoutDetails)) {
  // Pas de repos, pas de transition — enchaîner directement
  setPosition(next);
  setPhase('running');
  return isPR;
}

const supersetNextRound = isSupersetNextRound(position, next, workoutDetails);
const exerciseChanges = next.exerciseIdx !== position.exerciseIdx;
if (exerciseChanges) setStartingWeightDone(false);

if (completedRestDuration === 0) {
  setPosition(next);
  // Superset next round → running direct, pas exercise_transition
  setPhase(exerciseChanges && !supersetNextRound ? 'exercise_transition' : 'running');
  return isPR;
}

setRestDuration(completedRestDuration);
setPendingPhase(exerciseChanges && !supersetNextRound ? 'exercise_transition' : 'running');
setNextLabel(computeNextLabel(next, workoutDetails, exerciseChanges && !supersetNextRound));
setPosition(next);
setPhase('rest');
```

### `skipExercise` (useSession.ts)

Logique modifiée :

```typescript
const skipExercise = useCallback(async () => {
  if (!sessionLogId) return;
  positionHistory.current = [];
  setHistorySize(0);

  const currentGroupId = workoutDetails[position.exerciseIdx]?.superset_group_id;
  let targetExerciseIdx: number;

  if (currentGroupId != null) {
    // Superset : sauter au premier exercice après le groupe
    const groupExercises = workoutDetails
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d.superset_group_id === currentGroupId);
    const lastInGroup = Math.max(...groupExercises.map(g => g.i));
    targetExerciseIdx = lastInGroup + 1;
  } else {
    targetExerciseIdx = position.exerciseIdx + 1;
  }

  if (targetExerciseIdx >= workoutDetails.length) {
    await service.completeSession(sessionLogId);
    // ... calculateProgressions + setPhase('summary')
  } else {
    setPosition({ exerciseIdx: targetExerciseIdx, blockIdx: 0, setIdx: 0 });
    setPhase('exercise_transition');
  }
}, [...]);
```

---

## UX Session

### `RunningPhase.tsx`

Prop ajoutée : `supersetPosition?: { current: number; total: number }` (calculé dans `[workoutId].tsx`).

Badge dans le header, après le badge bloc :
```tsx
{supersetPosition && (
  <View style={styles.supersetBadge}>
    <Text style={styles.supersetBadgeText}>
      SUPERSET · {supersetPosition.current}/{supersetPosition.total}
    </Text>
  </View>
)}
```

Style : fond violet `#7c3aed`, texte blanc, `fontSize: 11`, `fontWeight: '700'`.

Calcul dans `[workoutId].tsx` :
```typescript
function getSupersetPosition(
  position: SessionPosition,
  details: WorkoutExerciseDetail[]
): { current: number; total: number } | undefined {
  const groupId = details[position.exerciseIdx]?.superset_group_id;
  if (groupId == null) return undefined;
  const group = details
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.superset_group_id === groupId)
    .sort((a, b) => a.i - b.i);
  const pos = group.findIndex(g => g.i === position.exerciseIdx);
  return { current: pos + 1, total: group.length };
}
```

### `ExerciseTransitionPhase.tsx`

Si `supersetGroup` prop fournie (tableau de noms d'exercices), afficher :
```
Tu vas enchaîner :  A → B → C · repos après C
```
Ligne ajoutée sous le nom de l'exercice.

Prop : `supersetGroup?: string[]` — noms des exercices du groupe dans l'ordre.
N'afficher que si `supersetGroup.length > 1`.

Calculé dans `[workoutId].tsx` :
```typescript
function getSupersetGroup(
  position: SessionPosition,
  details: WorkoutExerciseDetail[]
): string[] | undefined {
  const groupId = details[position.exerciseIdx]?.superset_group_id;
  if (groupId == null) return undefined;
  return details
    .filter(d => d.superset_group_id === groupId)
    .sort((a, b) => details.indexOf(a) - details.indexOf(b))
    .map(d => d.exercise.name);
}
```
Passé comme `supersetGroup={getSupersetGroup(position, workoutDetails)}` à `<ExerciseTransitionPhase>`.

### `RestPhase.tsx`

Aucun changement — `nextLabel` est déjà calculé par `computeNextLabel`. Quand on revient au premier exercice du groupe (tour suivant), le label affiche le nom de cet exercice.

---

## UX Éditeur

### `WorkoutExerciseCard.tsx`

Nouvelles props :
```typescript
supersetGroupLabel?: string;   // e.g. "A" si premier du groupe, "B" si second…
isLastInWorkout?: boolean;     // masquer "Grouper" si dernier exercice
onLinkToNext?: () => void;
onUnlink?: () => void;
```

En bas de la card :
- Si `onLinkToNext` et pas `supersetGroupLabel` et pas `isLastInWorkout` :
  → bouton `🔗 Grouper avec le suivant`
- Si `supersetGroupLabel` :
  → badge `SUPERSET · {supersetGroupLabel}` + bouton `✕ Délier`

Le group container violet (bordure `#7c3aed`) entoure les cards du même groupe dans `workout/[id].tsx` (rendu conditionnel dans la FlatList).

### `workout/[id].tsx`

Passe `onLinkToNext={() => linkToNext(item.id, exercises[index+1].id)}` et `onUnlink={() => unlink(item.id)}` à chaque `WorkoutExerciseCard`. `linkToNext` dans le hook a la même signature `(aId: number, bId: number)` que le service.

Groupe visuellement les cards du même `superset_group_id` avec un `View` conteneur à bordure violette.

### `BottomSheet skip` dans `RunningPhase.tsx`

Quand l'exercice est en superset, le texte du bouton destructif devient :
```
Passer le superset entier (A · B · C)
```
Calculé depuis la prop `supersetPosition` et les noms des exercices du groupe.

---

## Tests TDD

### `advancePosition` avec supersets (sessionUtils ou useSession.test.ts)

1. **Avance dans le groupe (A→B, B→C)** — retourne exercice suivant du groupe, même setIdx
2. **Dernier du groupe → tour suivant (C→A, setIdx+1)** — retourne premier exercice, setIdx incrémenté
3. **Tous tours terminés → exercice après groupe** — retourne exercice après le groupe
4. **Groupe à un seul membre (edge case)** — comportement identique au standalone
5. **`isSupersetForward` : forward détecté correctement** (A→B: true, C→A: false)
6. **`isSupersetForward` : exercices réordonnés** (B avant A dans la liste, même groupId) — still correct

### `WorkoutExerciseService.unlink`

7. **Unlink dissolve tout le groupe** — tous les membres repassent à null
8. **Unlink sur standalone** — no-op

### `WorkoutExerciseService.linkToNext`

9. **Link A+B** — même groupId non-null
10. **Link B+C avec B déjà dans groupe A+B** — C rejoint le groupe existant

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `app/db/schema.ts` | Modifier — migration v13 |
| `app/db/types.ts` | Modifier — `superset_group_id` sur `WorkoutExercise` |
| `app/repositories/IWorkoutExerciseRepository.ts` | Modifier — `updateSuperset` |
| `app/repositories/InMemoryWorkoutExerciseRepository.ts` | Modifier — implémenter `updateSuperset` |
| `app/repositories/SQLiteWorkoutExerciseRepository.ts` | Modifier — implémenter `updateSuperset` |
| `app/services/WorkoutExerciseService.ts` | Modifier — `linkToNext`, `unlink`, `superset_group_id` dans `loadDetail` |
| `app/services/WorkoutExerciseService.test.ts` | Modifier — tests TDD linkToNext/unlink |
| `app/hooks/useWorkoutExercises.ts` | Modifier — exposer `linkToNext`, `unlink` |
| `app/hooks/useSession.ts` | Modifier — `advancePosition`, `isSupersetForward`, `isSupersetNextRound`, `validateSet`, `skipExercise` |
| `app/hooks/useSession.test.ts` | Modifier — tests TDD advancePosition superset |
| `app/components/session/RunningPhase.tsx` | Modifier — badge SUPERSET, texte skip superset |
| `app/components/session/ExerciseTransitionPhase.tsx` | Modifier — preview groupe A→B→C |
| `app/components/workout/WorkoutExerciseCard.tsx` | Modifier — bouton 🔗 / badge + délier |
| `app/app/workout/[id].tsx` | Modifier — group container, passer onLinkToNext/onUnlink |
| `app/app/session/[workoutId].tsx` | Modifier — getSupersetPosition, passer props |

---

## Hors scope V1

- Warmup par exercice dans un superset (le warmup ne s'applique qu'au premier exercice du groupe)
- Superset avec exercices de types différents (cardio + musculation)
- Visualisation superset dans SummaryPhase
- Supersets dans les statistiques de progression
- Tri-sets avec nombre de séries différent par exercice
