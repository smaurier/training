# Réordonnancement des éléments — Design

**Session :** 8B  
**Date :** 2026-05-28

---

## Contexte

L'app stocke `order_index` sur toutes les entités ordonnées (`workout_exercises`, `blocks`, `sets`). La 8A a implémenté l'édition inline (create/update/delete) de blocs et séries. La 8B ajoute le réordonnancement via boutons ↑↓.

---

## Périmètre

Réordonner :
- **Exercices** dans une séance (`workout_exercises` dans `workout/[id].tsx`)
- **Blocs** dans un exercice (`blocks` dans `WorkoutExerciseCard`)
- **Séries** dans un bloc (`sets` dans `BlockCard`)

**Hors périmètre :** drag-and-drop (peut être ajouté en couche bonus ultérieurement si souhaité).

---

## Choix UX

- **Boutons ↑↓** (chevrons) toujours visibles, un par côté de chaque item
- Le bouton ↑ du premier item et le bouton ↓ du dernier item sont **masqués** (condition `isFirst`/`isLast`)
- **Persistance immédiate** : chaque tap déclenche un UPDATE en base (cohérent avec 8A)
- WCAG 2.5.7 compliant par construction (pas de dragging movement)
- `accessibilityLabel` : `"Monter <name>"` / `"Descendre <name>"`

---

## Architecture

```
swap(idA, idB) sur chaque repo
    └── service.reorderXxx(…, direction)
            └── hook.reorderXxx → refresh()
                    └── UI ↑↓ buttons → WorkoutExerciseCard / BlockCard
```

---

## Repository layer

### Interfaces — 3 interfaces enrichies

`IWorkoutExerciseRepository`, `IBlockRepository`, `ISetRepository` reçoivent chacune :

```typescript
swap(idA: number, idB: number): Promise<void>;
```

### InMemory (3 implémentations)

```typescript
async swap(idA: number, idB: number): Promise<void> {
  const a = this.items.find(i => i.id === idA);
  const b = this.items.find(i => i.id === idB);
  if (!a || !b) throw new Error(`swap: id inconnu (${idA}, ${idB})`);
  const tmp = a.order_index;
  a.order_index = b.order_index;
  b.order_index = tmp;
}
```

### SQLite (3 implémentations)

Chaque implémentation SQLite utilise `this.db.withTransactionAsync`. Les noms de table sont respectivement `workout_exercises`, `blocks`, `sets`.

```typescript
async swap(idA: number, idB: number): Promise<void> {
  const a = await this.findById(idA);
  const b = await this.findById(idB);
  if (!a || !b) throw new Error(`swap: id inconnu (${idA}, ${idB})`);
  await this.db.withTransactionAsync(async () => {
    await this.db.runAsync(
      'UPDATE <table> SET order_index=? WHERE id=?',
      [b.order_index, idA]
    );
    await this.db.runAsync(
      'UPDATE <table> SET order_index=? WHERE id=?',
      [a.order_index, idB]
    );
  });
}
```

### ORDER BY à vérifier

Les méthodes `findByWorkoutId`, `findByWorkoutExerciseId`, `findByBlockId` doivent inclure `ORDER BY order_index ASC`. À vérifier dans chaque SQLite repo et à ajouter si absent.

### Contract tests (ajout aux suites existantes)

Chaque fichier `*.contract.ts` reçoit un `describe('swap', ...)` :

```typescript
describe('swap', () => {
  it('permute les order_index de deux items adjacents', async () => {
    const a = await repo.save({ ...dto, order_index: 0 });
    const b = await repo.save({ ...dto, order_index: 1 });
    await repo.swap(a.id, b.id);
    expect((await repo.findById(a.id))!.order_index).toBe(1);
    expect((await repo.findById(b.id))!.order_index).toBe(0);
  });
  it('permute les order_index de deux items non-adjacents', async () => {
    const a = await repo.save({ ...dto, order_index: 0 });
    await repo.save({ ...dto, order_index: 1 });
    const c = await repo.save({ ...dto, order_index: 2 });
    await repo.swap(a.id, c.id);
    expect((await repo.findById(a.id))!.order_index).toBe(2);
    expect((await repo.findById(c.id))!.order_index).toBe(0);
  });
  it('throw si un id est inconnu', async () => {
    const a = await repo.save({ ...dto, order_index: 0 });
    await expect(repo.swap(a.id, 999)).rejects.toThrow('999');
  });
});
```

---

## Service layer

3 nouvelles méthodes sur `WorkoutExerciseService` :

```typescript
async reorderExercise(workoutId: number, exerciseId: number, direction: 'up' | 'down'): Promise<void> {
  const siblings = (await this.weRepo.findByWorkoutId(workoutId))
    .sort((a, b) => a.order_index - b.order_index);
  const idx = siblings.findIndex(e => e.id === exerciseId);
  if (idx === -1) return;
  const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (neighborIdx < 0 || neighborIdx >= siblings.length) return;
  await this.weRepo.swap(siblings[idx].id, siblings[neighborIdx].id);
}

async reorderBlock(workoutExerciseId: number, blockId: number, direction: 'up' | 'down'): Promise<void> {
  const siblings = (await this.blockRepo.findByWorkoutExerciseId(workoutExerciseId))
    .sort((a, b) => a.order_index - b.order_index);
  const idx = siblings.findIndex(b => b.id === blockId);
  if (idx === -1) return;
  const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (neighborIdx < 0 || neighborIdx >= siblings.length) return;
  await this.blockRepo.swap(siblings[idx].id, siblings[neighborIdx].id);
}

async reorderSet(blockId: number, setId: number, direction: 'up' | 'down'): Promise<void> {
  const siblings = (await this.setRepo.findByBlockId(blockId))
    .sort((a, b) => a.order_index - b.order_index);
  const idx = siblings.findIndex(s => s.id === setId);
  if (idx === -1) return;
  const neighborIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (neighborIdx < 0 || neighborIdx >= siblings.length) return;
  await this.setRepo.swap(siblings[idx].id, siblings[neighborIdx].id);
}
```

### Tests service

Fichier : `services/__tests__/WorkoutExerciseService.reorder.test.ts` (ou ajout au fichier existant)

Couvre :
- `reorderExercise` vers le haut → order_index du premier item augmente
- `reorderExercise` sur le premier item vers le haut → no-op (pas de voisin)
- `reorderExercise` sur le dernier item vers le bas → no-op
- `reorderExercise` avec id inconnu → no-op (pas de throw)
- Mêmes 4 cas pour `reorderBlock` et `reorderSet`

---

## Hook layer

`UseWorkoutExercisesResult` enrichi de 3 callbacks :

```typescript
reorderExercise: (exerciseId: number, direction: 'up' | 'down') => Promise<void>;
reorderBlock: (workoutExerciseId: number, blockId: number, direction: 'up' | 'down') => Promise<void>;
reorderSet: (blockId: number, setId: number, direction: 'up' | 'down') => Promise<void>;
```

Implémentation (pattern identique aux autres callbacks 8A) :

```typescript
const reorderExercise = useCallback(
  async (exerciseId: number, direction: 'up' | 'down') => {
    try {
      await service.reorderExercise(workoutId, exerciseId, direction);
      await refresh();
    } catch (e) {
      setError(String(e));
      throw e;
    }
  },
  [service, workoutId, refresh]
);
// idem reorderBlock(workoutExerciseId, blockId, direction)
// idem reorderSet(blockId, setId, direction)
```

---

## UI layer

### `WorkoutExerciseCard`

Nouvelles props :
```typescript
isFirst: boolean;
isLast: boolean;
onMoveUp: () => Promise<void>;
onMoveDown: () => Promise<void>;
```

Header row modifié — les boutons ↑↓ s'insèrent **avant** le chevron expand :
```tsx
{/* header row: [headerContent flex:1] [↑] [↓] [expand chevron] */}
{!isFirst && (
  <PressableA11y
    accessibilityLabel={`Monter ${detail.exercise.name}`}
    onPress={onMoveUp}
    style={styles.reorderBtn}
  >
    <Ionicons name="chevron-up-outline" size={16} color={colors.textSecondary} />
  </PressableA11y>
)}
{!isLast && (
  <PressableA11y
    accessibilityLabel={`Descendre ${detail.exercise.name}`}
    onPress={onMoveDown}
    style={styles.reorderBtn}
  >
    <Ionicons name="chevron-down-outline" size={16} color={colors.textSecondary} />
  </PressableA11y>
)}
```

Style : `reorderBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }`

Dans `workout/[id].tsx`, la FlatList passe `index` et `exercises.length` :
```tsx
renderItem={({ item, index }) => (
  <WorkoutExerciseCard
    detail={item}
    isFirst={index === 0}
    isLast={index === exercises.length - 1}
    onMoveUp={() => reorderExercise(item.id, 'up')}
    onMoveDown={() => reorderExercise(item.id, 'down')}
    onRemove={...}
    onUpdateSet={...}
    // … autres props 8A
  />
)}
```

### `BlockCard`

Nouvelles props pour les blocs :
```typescript
isFirst: boolean;
isLast: boolean;
onMoveUp: () => Promise<void>;
onMoveDown: () => Promise<void>;
```

Block name row modifié (même pattern boutons ↑↓ que WorkoutExerciseCard).

`WorkoutExerciseCard` passe ces props en mappant `detail.blocks` avec index :
```tsx
detail.blocks.map((block, index) => (
  <BlockCard
    key={block.id}
    block={block}
    isFirst={index === 0}
    isLast={index === detail.blocks.length - 1}
    onMoveUp={() => reorderBlock(detail.id, block.id, 'up')}
    onMoveDown={() => reorderBlock(detail.id, block.id, 'down')}
    onUpdateSet={onUpdateSet}
    // … autres props 8A
  />
))
```

### Set rows dans `BlockCard`

Chaque row set passe de `PressableA11y` seul à un `View` row :

```tsx
{block.sets.map((set, index) => (
  <View key={set.id} style={styles.setRow}>
    <PressableA11y
      style={styles.setMain}
      accessibilityLabel={`${formatSet(set)}, appuyer pour modifier`}
      accessibilityHint="Appuyer longuement pour supprimer"
      onPress={() => setEditingSet(set)}
      onLongPress={() => handleSetLongPress(set)}
    >
      <Text style={[styles.set, { color: colors.text }]}>{formatSet(set)}</Text>
    </PressableA11y>
    {index > 0 && (
      <PressableA11y
        accessibilityLabel={`Monter série ${index + 1}`}
        onPress={() => onReorderSet(set.id, 'up')}
        style={styles.reorderBtn}
      >
        <Ionicons name="chevron-up-outline" size={16} color={colors.textSecondary} />
      </PressableA11y>
    )}
    {index < block.sets.length - 1 && (
      <PressableA11y
        accessibilityLabel={`Descendre série ${index + 1}`}
        onPress={() => onReorderSet(set.id, 'down')}
        style={styles.reorderBtn}
      >
        <Ionicons name="chevron-down-outline" size={16} color={colors.textSecondary} />
      </PressableA11y>
    )}
  </View>
))}
```

`BlockCard` reçoit `onReorderSet: (setId: number, direction: 'up' | 'down') => Promise<void>`.

`WorkoutExerciseCard` passe `onReorderSet={(setId, dir) => reorderSet(block.id, setId, dir)}` à chaque `BlockCard`.

Styles ajoutés dans `BlockCard` :
```typescript
setRow: { flexDirection: 'row', alignItems: 'center' },
setMain: { flex: 1 },
reorderBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
```

---

## Fichiers modifiés / créés

| Fichier | Action |
|---|---|
| `repositories/IWorkoutExerciseRepository.ts` | Ajouter `swap` |
| `repositories/IBlockRepository.ts` | Ajouter `swap` |
| `repositories/ISetRepository.ts` | Ajouter `swap` |
| `repositories/InMemoryWorkoutExerciseRepository.ts` | Implémenter `swap` |
| `repositories/SQLiteWorkoutExerciseRepository.ts` | Implémenter `swap` + vérifier ORDER BY |
| `repositories/InMemoryBlockRepository.ts` | Implémenter `swap` |
| `repositories/SQLiteBlockRepository.ts` | Implémenter `swap` + vérifier ORDER BY |
| `repositories/InMemorySetRepository.ts` | Implémenter `swap` |
| `repositories/SQLiteSetRepository.ts` | Implémenter `swap` + vérifier ORDER BY |
| `repositories/workoutExercise.contract.ts` | Ajouter tests swap |
| `repositories/blockRepository.contract.ts` | Ajouter tests swap |
| `repositories/setRepository.contract.ts` | Ajouter tests swap |
| `services/WorkoutExerciseService.ts` | Ajouter 3 méthodes reorder |
| `services/__tests__/WorkoutExerciseService.reorder.test.ts` | Nouveau fichier tests service |
| `hooks/useWorkoutExercises.ts` | Ajouter 3 callbacks + interface |
| `components/workout/WorkoutExerciseCard.tsx` | Nouvelles props + boutons ↑↓ |
| `components/workout/BlockCard.tsx` | Nouvelles props + boutons ↑↓ blocs + rows sets refacto |
| `app/workout/[id].tsx` | Passer isFirst/isLast + callbacks reorder |
