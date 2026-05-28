# Session 8 — Édition inline Sets + Blocs

**Date** : 2026-05-28  
**Scope** : Modifier/ajouter/supprimer des séries et des blocs directement depuis l'accordéon `workout/[id].tsx`

---

## Contexte

Session 7 a livré l'accordéon `WorkoutExerciseCard` + `BlockCard` en lecture seule. Les séries et blocs sont créés avec des valeurs par défaut (3–8 rép, pas de poids, 2 min de repos). Cette session ajoute l'édition complète : modifier une série existante, ajouter/supprimer une série, ajouter/renommer/supprimer un bloc.

---

## Architecture

### Couches touchées

```
ISetRepository              + update(id, dto)
IBlockRepository            + update(id, dto)

WorkoutExerciseService      + updateSet, addSet, removeSet
                            + addBlock, updateBlock, removeBlock

useWorkoutExercises         + 6 nouvelles méthodes

components/workout/
  BlockCard.tsx             refactor — séries pressables, bouton +, long press bloc
  WorkoutExerciseCard.tsx   + bouton "Ajouter un bloc", passe callbacks
  EditSetModal.tsx          nouveau
  EditBlockModal.tsx        nouveau

app/workout/[id].tsx        passe les 6 nouvelles méthodes du hook
```

### Nouveaux fichiers

```
app/components/workout/EditSetModal.tsx
app/components/workout/EditBlockModal.tsx
```

---

## 1. Repository layer

### UpdateSetDto / UpdateBlockDto

```typescript
// ISetRepository.ts — non-Partial : la modal fournit toujours les 5 champs
export type UpdateSetDto = Pick<Set, 'reps_min' | 'reps_max' | 'weight' | 'weight_type' | 'rest_duration'>;

// IBlockRepository.ts — Partial : rename seul ou toggle seul possible
export type UpdateBlockDto = Partial<Pick<Block, 'name' | 'is_work_block'>>;
```

### Signatures

```typescript
// ISetRepository
update(id: number, dto: UpdateSetDto): Promise<Set>; // throw si id inconnu

// IBlockRepository
update(id: number, dto: UpdateBlockDto): Promise<Block>; // throw si id inconnu
```

### SQLite — update sets

```sql
UPDATE sets SET reps_min=?, reps_max=?, weight=?, weight_type=?, rest_duration=? WHERE id=?
```
Les 5 colonnes sont toujours fournies (UpdateSetDto non-Partial). Re-fetch après UPDATE via `findById`.

### SQLite — update blocks

```sql
UPDATE blocks SET name=?, is_work_block=? WHERE id=?
```

### InMemory — update

```typescript
const idx = this.items.findIndex(i => i.id === id);
if (idx === -1) throw new Error(`${id} introuvable`);
this.items[idx] = { ...this.items[idx], ...dto };
return this.items[idx];
```

### Contract tests (ajoutés aux suites existantes)

```typescript
describe('update', () => {
  it('modifie les champs fournis, laisse les autres intacts', async () => { ... });
  it('retourne la row mise à jour', async () => { ... });
  it('throw si id inconnu', async () => { ... });
});
```

---

## 2. Service (WorkoutExerciseService)

Toutes les méthodes retournent `void` — le hook appelle `refresh()` après chaque mutation.

```typescript
// Séries
async updateSet(setId: number, dto: UpdateSetDto): Promise<void> {
  await this.setRepo.update(setId, dto);
}

async addSet(blockId: number): Promise<void> {
  const existing = await this.setRepo.findByBlockId(blockId);
  await this.setRepo.save({
    block_id: blockId,
    reps_min: 3,
    reps_max: 8,
    weight: null,
    weight_type: 'fixed',
    rest_duration: 120,
    order_index: existing.length,
  });
}

async removeSet(setId: number): Promise<void> {
  await this.setRepo.delete(setId);
}

// Blocs
async addBlock(workoutExerciseId: number, name: string, isWorkBlock: 0 | 1): Promise<void> {
  const existing = await this.blockRepo.findByWorkoutExerciseId(workoutExerciseId);
  await this.runInTransaction(async () => {
    const block = await this.blockRepo.save({
      workout_exercise_id: workoutExerciseId,
      name,
      order_index: existing.length,
      is_work_block: isWorkBlock,
    });
    await this.setRepo.save({
      block_id: block.id,
      reps_min: 3,
      reps_max: 8,
      weight: null,
      weight_type: 'fixed',
      rest_duration: 120,
      order_index: 0,
    });
  });
}

async updateBlock(blockId: number, dto: UpdateBlockDto): Promise<void> {
  await this.blockRepo.update(blockId, dto);
}

async removeBlock(blockId: number): Promise<void> {
  await this.blockRepo.delete(blockId); // CASCADE SQLite supprime les sets
}
```

### Tests TDD (WorkoutExerciseService.test.ts)

- `updateSet` : modifie reps_min, visible via `getWithDetails`
- `addSet` : ajoute série avec defaults, order_index = longueur existante
- `removeSet` : série absente de `getWithDetails` après suppression
- `addBlock` : crée bloc + 1 série par défaut, order_index correct
- `updateBlock` : nom mis à jour visible via `getWithDetails`
- `removeBlock` : bloc absent de `getWithDetails` après suppression

---

## 3. Hook (useWorkoutExercises)

6 nouvelles méthodes, même pattern `useCallback` + `refresh()` que `add` / `remove` :

```typescript
export interface UseWorkoutExercisesResult {
  exercises: WorkoutExerciseDetail[];
  loading: boolean;
  error: string | null;
  add: (exerciseId: number) => Promise<void>;
  remove: (workoutExerciseId: number) => Promise<void>;
  refresh: () => Promise<void>;
  updateSet: (setId: number, dto: UpdateSetDto) => Promise<void>;
  addSet: (blockId: number) => Promise<void>;
  removeSet: (setId: number) => Promise<void>;
  addBlock: (workoutExerciseId: number, name: string, isWorkBlock: 0 | 1) => Promise<void>;
  updateBlock: (blockId: number, dto: UpdateBlockDto) => Promise<void>;
  removeBlock: (blockId: number) => Promise<void>;
}
```

Chaque méthode : appel service → `refresh()` → erreur surfacée dans `error` state et re-throw.

---

## 4. Composants

### EditSetModal

**Mode édition uniquement** — le bouton "+" crée directement avec les defaults sans modal (voir BlockCard). La modal s'ouvre uniquement en tap sur une série existante.

```typescript
interface EditSetModalProps {
  set: TrainingSet;          // rendu conditionnel : {editingSet && <EditSetModal set={editingSet} .../>}
  onSave: (dto: UpdateSetDto) => Promise<void>;
  onClose: () => void;
}
```

**Champs (pré-remplis avec les valeurs de `set`) :**
| Champ | Type | Notes |
|---|---|---|
| Reps min | TextInput numeric | |
| Reps max | TextInput numeric | |
| Poids (kg) | TextInput numeric | vide si weight === null |
| Type poids | Segmented : Fixe / PC / Barre | |
| Repos (s) | TextInput numeric | |

- `accessibilityViewIsModal={true}`
- Annuler (close sans sauvegarder) + Enregistrer (appelle onSave)
- Si type = PC ou Barre → champ poids désactivé (grisé, valeur ignorée à la sauvegarde)

### EditBlockModal

```typescript
interface EditBlockModalProps {
  visible: boolean;
  block: Block | null;           // null = mode création
  workoutExerciseId: number;
  onSave: (name: string, isWorkBlock: 0 | 1) => Promise<void>;
  onClose: () => void;
}
```

**Champs :**
| Champ | Type | Valeur par défaut (création) |
|---|---|---|
| Nom | TextInput | "" (focus auto) |
| Bloc de travail | Switch | true (1) |

- `accessibilityViewIsModal={true}`
- Annuler + Enregistrer (disabled si nom vide)

### BlockCard — refactor

**Props ajoutées :**
```typescript
interface BlockCardProps {
  block: BlockWithSets;
  onUpdateSet: (setId: number, dto: UpdateSetDto) => Promise<void>;
  onAddSet: (blockId: number) => Promise<void>;
  onRemoveSet: (setId: number) => Promise<void>;
  onRenameBlock: (block: BlockWithSets) => void;   // signal vers WorkoutExerciseCard pour ouvrir EditBlockModal
  onRemoveBlock: (blockId: number) => Promise<void>;
}
```

**État local :**
```typescript
const [editingSet, setEditingSet] = useState<TrainingSet | null>(null);
```

**Interactions :**
- Header bloc : long press → `Alert.alert` "Renommer" → `onRenameBlock(block)` / "Supprimer" → Alert confirmation → `onRemoveBlock(block.id)`
- Ligne série : `PressableA11y` tap → `setEditingSet(set)` → `EditSetModal` visible
- Ligne série : long press → Alert "Supprimer cette série ?" → `onRemoveSet(set.id)`
- Bouton "+" en bas de liste séries → `onAddSet(block.id)` direct (pas de modal — crée avec defaults)

**Accessibilité :**
- `accessibilityLabel` sur chaque ligne série : `"${formatSet(set)}, appuyer pour modifier"`
- `accessibilityHint` : `"Appuyer longuement pour supprimer"`
- Bouton "+" : `accessibilityLabel="Ajouter une série"`

### WorkoutExerciseCard — ajouts

**Props ajoutées :**
```typescript
onAddBlock: (workoutExerciseId: number, name: string, isWorkBlock: 0 | 1) => Promise<void>;
onUpdateBlock: (blockId: number, dto: UpdateBlockDto) => Promise<void>;
onRemoveBlock: (blockId: number) => Promise<void>;
onUpdateSet: (setId: number, dto: UpdateSetDto) => Promise<void>;
onAddSet: (blockId: number) => Promise<void>;
onRemoveSet: (setId: number) => Promise<void>;
```

**État local ajouté :**
```typescript
const [showAddBlock, setShowAddBlock] = useState(false);
const [editingBlock, setEditingBlock] = useState<Block | null>(null); // non-null = mode renommage
```

**Quand expanded :**
- Bouton "Ajouter un bloc" en bas de liste blocs → `setShowAddBlock(true)` → `EditBlockModal` en mode création (block=null)
- `onRenameBlock(block)` reçu de BlockCard → `setEditingBlock(block)` → `EditBlockModal` en mode renommage (block pré-rempli)
- `EditBlockModal` visible si `showAddBlock || editingBlock !== null`

### workout/[id].tsx — ajout

Passe les 6 nouvelles méthodes du hook à chaque `WorkoutExerciseCard` :
```typescript
<WorkoutExerciseCard
  detail={item}
  onRemove={() => confirmRemove(item)}
  onUpdateSet={updateSet}
  onAddSet={addSet}
  onRemoveSet={removeSet}
  onAddBlock={addBlock}
  onUpdateBlock={updateBlock}
  onRemoveBlock={removeBlock}
/>
```

---

## 5. Hors scope Session 8

- Réordonnancement des séries dans un bloc (drag-and-drop séries)
- Réordonnancement des blocs dans un exercice
- Réordonnancement des exercices dans une séance (Session 8B — drag-and-drop)
- Duplication de série / bloc
- Configuration du `weight_type` sur l'exercice lui-même (tous les blocs héritent)
