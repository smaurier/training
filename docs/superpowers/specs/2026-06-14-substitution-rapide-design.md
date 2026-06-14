# Substitution Rapide — Design Spec

## Résumé

Remplacer temporairement un exercice en cours de séance (ex : pas de barre → haltères). La substitution est session-only — le programme n'est jamais modifié.

---

## Périmètre

**In scope :**
- Remplacer l'exercice actuel pendant la phase `running`
- Substitution valide pour tous les rounds restants de l'exercice (y compris superset)
- Logging des séries sous le nouvel `exercise.id`
- Indicateur visuel ⇄ dans `RunningPhase`

**Out of scope (V1) :**
- Persistance de la substitution en cas de pause/resume
- Substitution per-série (swap global uniquement)
- Modification des blocks/sets (programme inchangé)
- Historique/annulation de substitution

---

## Architecture

### Principe fondamental

La substitution remplace **uniquement** les métadonnées de l'exercice (`id`, `name`, `type`, `muscle_groups`, etc.) — jamais les blocks ni les sets. Le programme (reps, poids, repos) est préservé intégralement.

### État : `useSession`

```typescript
// Type réutilisé — déjà défini dans WorkoutExerciseDetail
type ExerciseStub = WorkoutExerciseDetail['exercise']
// = Pick<Exercise, 'id' | 'name' | 'type' | 'technical_notes' | 'muscle_groups' | 'description'>

// Nouvel état interne
const [substitutions, setSubstitutions] = useState<Record<number, ExerciseStub>>({});

// Dérivé — remplace workoutDetails dans toute la logique du hook
const effectiveDetails = useMemo(
  () => workoutDetails.map((d, i) =>
    substitutions[i] ? { ...d, exercise: substitutions[i] } : d
  ),
  [workoutDetails, substitutions]
);
```

### API — nouvelles entrées dans `UseSessionResult`

```typescript
substituteCurrentExercise: (replacement: ExerciseStub) => void;
isCurrentExerciseSubstituted: boolean;
```

### Implémentation dans `useSession`

```typescript
const substituteCurrentExercise = useCallback(
  (replacement: ExerciseStub) => {
    setSubstitutions(prev => ({ ...prev, [position.exerciseIdx]: replacement }));
  },
  [position.exerciseIdx]
);

const isCurrentExerciseSubstituted = substitutions[position.exerciseIdx] !== undefined;
```

### Changements mécaniques dans `useSession`

Partout où `workoutDetails` est passé à `advancePosition` ou `computeNextLabel`, remplacer par `effectiveDetails`. Callbacks concernés : `validateSet`, `skipSet`, `skipExercise`. Mettre à jour les deps `useCallback` en conséquence (`workoutDetails` → `effectiveDetails`).

`currentExercise` dérivé de `effectiveDetails` au lieu de `workoutDetails` :
```typescript
const currentExercise = effectiveDetails[position.exerciseIdx] ?? null;
```

---

## Composants UI

### Nouveau : `SubstituteSheet`

**Fichier :** `app/components/session/SubstituteSheet.tsx`

```typescript
interface SubstituteSheetProps {
  sheetRef: React.RefObject<BottomSheet>;
  currentMuscleGroups: string[];  // déjà parsé depuis JSON
  onSelect: (exercise: ExerciseStub) => void;
  onClose: () => void;
}
```

**Chargement lazy** — exercices chargés au premier open du sheet uniquement (pas au mount de RunningPhase) :
```typescript
const [exercises, setExercises] = useState<Exercise[]>([]);
const [hasLoaded, setHasLoaded] = useState(false);

// onAnimate du BottomSheet → déclenche le load au premier open
function handleAnimate(fromIndex: number, toIndex: number) {
  if (toIndex >= 0 && !hasLoaded) {
    new SQLiteExerciseRepository(getDb()).findAll().then(all => {
      setExercises(all);
      setHasLoaded(true);
    });
  }
}
```

**Logique de filtre :**
```typescript
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
```

Si `currentMuscleGroups` est vide ou ne matche rien, la liste filtrée est vide → l'utilisateur utilise la recherche texte. Comportement attendu, pas d'erreur.

**Sélection** — le sheet se ferme avant de remonter le choix :
```typescript
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
```

**Accessibilité** — chaque row :
```tsx
<PressableA11y
  accessibilityLabel={`Choisir ${exercise.name}`}
  onPress={() => handleSelect(exercise)}
>
```

**UI :** `TextInput` recherche en haut + `FlatList`. snapPoints `['75%', '90%']`.

---

### Modifications `RunningPhase`

**Nouvelles props :**
```typescript
onSubstituteExercise?: (replacement: ExerciseStub) => void;
isSubstituted?: boolean;
```

**Nouveau ref :**
```typescript
const substituteSheetRef = useRef<BottomSheet>(null);
```

**Dans le skip sheet** — bouton "Remplacer" conditionnel :
```tsx
{onSubstituteExercise && (
  <PressableA11y
    accessibilityLabel="Remplacer cet exercice"
    onPress={() => {
      skipExerciseSheetRef.current?.close();
      substituteSheetRef.current?.expand();
    }}
  >
    <Ionicons name="swap-horizontal-outline" />
    <Text>Remplacer cet exercice</Text>
  </PressableA11y>
)}
```

**Indicateur dans l'en-tête :**
```tsx
<View style={styles.exerciseNameRow}>
  {isSubstituted && (
    <Ionicons name="swap-horizontal-outline" size={16} color={colors.textSecondary} />
  )}
  <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
</View>
```

**`SubstituteSheet` rendu en bas de `RunningPhase`** (après les autres sheets) :
```tsx
{onSubstituteExercise && (
  <SubstituteSheet
    sheetRef={substituteSheetRef}
    currentMuscleGroups={parseMuscleGroups(exercise.exercise.muscle_groups)}
    onSelect={onSubstituteExercise}
    onClose={() => substituteSheetRef.current?.close()}
  />
)}

// Helper (dans le fichier ou importé)
function parseMuscleGroups(json: string): string[] {
  try { return JSON.parse(json) as string[]; }
  catch { return []; }
}
```

---

### Modifications `[workoutId].tsx`

```tsx
<RunningPhase
  {/* ... props existantes ... */}
  onSubstituteExercise={session.substituteCurrentExercise}
  isSubstituted={session.isCurrentExerciseSubstituted}
/>
```

---

## Tests TDD

**Fichier :** `app/hooks/useSession.test.ts` — nouveau `describe` :

```typescript
describe('useSession — substituteCurrentExercise', () => {
  it('currentExercise.exercise.name retourne le remplaçant après substitution', ...)
  it('validateSet logue le bon exercise.id après substitution', ...)
  it('currentSet reste inchangé après substitution — id, reps_min, weight identiques', ...)
})
```

Pas de tests composant pour `SubstituteSheet` — cohérent avec le pattern existant (aucun composant session n'a de test unitaire).

---

## Fichiers impactés

| Action | Fichier |
|--------|---------|
| Modifier | `app/hooks/useSession.ts` |
| Modifier | `app/components/session/RunningPhase.tsx` |
| Modifier | `app/app/session/[workoutId].tsx` |
| Créer | `app/components/session/SubstituteSheet.tsx` |
| Modifier | `app/hooks/useSession.test.ts` |

---

## Limitations V1 connues

1. **Pause/resume** — les substitutions ne sont pas persistées. Si la séance est mise en pause puis reprise, l'exercice original est restauré.
2. **Scope global** — la substitution s'applique à tous les rounds restants de l'exercice (y compris les tours superset). Pas de substitution per-série.
