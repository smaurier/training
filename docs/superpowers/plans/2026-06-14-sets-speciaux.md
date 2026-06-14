# Sets spéciaux — AMRAP & Dropsets — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter AMRAP (flag `set_type` sur les sets) et dropsets (détection visuelle via `rest_duration === 0`) dans l'éditeur et la séance.

**Architecture:** Un seul champ `set_type TEXT DEFAULT 'normal'` (migration v14) sur la table `sets`. Dropsets = sets consécutifs avec `rest_duration === 0` — la phase `running` s'enchaîne déjà automatiquement dans `useSession.validateSet` quand `rest_duration === 0` et même exercice : aucun changement de logique de session nécessaire. Pyramid hors scope. 4 tâches : foundation TDD → éditeur → card → session UI.

**Tech Stack:** React Native + Expo SDK 54, TypeScript strict, expo-sqlite, Jest TDD. Run : `cd app && npm test`, `npm run typecheck`.

---

### Task 1 : Foundation — migration, types, repos, tests, fixtures

**Files:**
- Modify: `app/db/schema.ts`
- Modify: `app/db/types.ts`
- Modify: `app/repositories/ISetRepository.ts`
- Modify: `app/repositories/InMemorySetRepository.ts`
- Modify: `app/repositories/SQLiteSetRepository.ts`
- Modify: `app/repositories/setRepository.contract.ts` ← TDD ici
- Modify: `app/services/DeloadService.test.ts` ← fixtures
- Modify: `app/hooks/useSession.test.ts` ← fixtures
- Modify: `app/services/weightRatio.test.ts` ← fixtures

---

- [ ] **Step 1 : Écrire les tests TDD (RED)**

Ajouter dans `app/repositories/setRepository.contract.ts`, à la fin du `describe('update')` existant et après lui :

```typescript
// Dans describe('update') existant — ajouter après le test 'throw si id inconnu' :
it('preserve set_type quand set_type absent du dto', async () => {
  const saved = await repo.save(serie1);
  // save() doit retourner set_type: 'normal'
  expect(saved.set_type).toBe('normal');
  const dto: UpdateSetDto = {
    reps_min: 4,
    weight: 80,
    weight_type: 'fixed',
    rest_duration: 90,
  };
  const updated = await repo.update(saved.id, dto);
  expect(updated.set_type).toBe('normal'); // préservé
});

it('met à jour set_type vers amrap', async () => {
  const saved = await repo.save(serie1);
  const dto: UpdateSetDto = {
    reps_min: 5,
    weight: 80,
    weight_type: 'fixed',
    rest_duration: 120,
    set_type: 'amrap',
  };
  const updated = await repo.update(saved.id, dto);
  expect(updated.set_type).toBe('amrap');
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd app && npm test -- --testPathPattern=InMemorySetRepository --no-coverage 2>&1 | tail -20
```

Attendu : erreur TypeScript (`Property 'set_type' does not exist`) ou test FAIL.

- [ ] **Step 3 : Ajouter `SetType` et `Set.set_type` dans `app/db/types.ts`**

```typescript
// Après la ligne : export type WeightType = 'fixed' | 'bodyweight' | 'bar';
export type SetType = 'normal' | 'amrap';
```

Et dans l'interface `Set`, ajouter après `weight_ratio` :

```typescript
export interface Set {
  id: number;
  block_id: number;
  reps_min: number;
  weight: number | null;
  weight_type: WeightType;
  rest_duration: number;
  order_index: number;
  duration_seconds: number | null;
  weight_ratio: number | null;
  set_type: SetType;
}
```

- [ ] **Step 4 : Ajouter la migration v14 dans `app/db/schema.ts`**

Ajouter après la migration v13 :

```typescript
// v14 — AMRAP : type de série (normal par défaut, amrap pour les séries max-reps)
`ALTER TABLE sets ADD COLUMN set_type TEXT NOT NULL DEFAULT 'normal'
  CHECK(set_type IN ('normal', 'amrap'));`,
```

- [ ] **Step 5 : Mettre à jour les DTOs dans `app/repositories/ISetRepository.ts`**

```typescript
import type { Set, SetType } from '../db/types';

// CreateSetDto : exclure set_type (DB DEFAULT 'normal' gère la valeur initiale)
export type CreateSetDto = Omit<Set, 'id' | 'duration_seconds' | 'weight_ratio' | 'set_type'>
  & { duration_seconds?: number | null; weight_ratio?: number | null };

// UpdateSetDto : set_type optionnel (les callers existants n'ont pas besoin de le passer)
export type UpdateSetDto = Pick<Set, 'reps_min' | 'weight' | 'weight_type' | 'rest_duration'>
  & { set_type?: SetType };
```

- [ ] **Step 6 : Mettre à jour `app/repositories/InMemorySetRepository.ts`**

```typescript
import type { Set as TrainingSet, SetType } from '../db/types';
import { ISetRepository, CreateSetDto, UpdateSetDto } from './ISetRepository';

export class InMemorySetRepository implements ISetRepository {
  private items: TrainingSet[] = [];
  private nextId = 1;

  async findByBlockId(blockId: number): Promise<TrainingSet[]> {
    return this.items.filter(i => i.block_id === blockId);
  }

  async findById(id: number): Promise<TrainingSet | null> {
    return this.items.find(i => i.id === id) ?? null;
  }

  async save(dto: CreateSetDto): Promise<TrainingSet> {
    const item: TrainingSet = {
      ...dto,
      id: this.nextId++,
      duration_seconds: dto.duration_seconds ?? null,
      weight_ratio: dto.weight_ratio ?? null,
      set_type: 'normal',
    };
    this.items.push(item);
    return item;
  }

  async update(id: number, dto: UpdateSetDto): Promise<TrainingSet> {
    const idx = this.items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error(`Set ${id} introuvable`);
    const updated: TrainingSet = {
      ...this.items[idx],
      reps_min: dto.reps_min,
      weight: dto.weight,
      weight_type: dto.weight_type,
      rest_duration: dto.rest_duration,
      ...(dto.set_type !== undefined ? { set_type: dto.set_type } : {}),
    };
    this.items[idx] = updated;
    return updated;
  }

  async delete(id: number): Promise<void> {
    this.items = this.items.filter(i => i.id !== id);
  }

  async swap(idA: number, idB: number): Promise<void> {
    const a = this.items.find(i => i.id === idA);
    const b = this.items.find(i => i.id === idB);
    if (!a || !b) throw new Error(`swap: id inconnu (${idA}, ${idB})`);
    const tmp = a.order_index;
    a.order_index = b.order_index;
    b.order_index = tmp;
  }
}
```

- [ ] **Step 7 : Mettre à jour `app/repositories/SQLiteSetRepository.ts`**

Seule la méthode `update` change — utiliser `COALESCE(?, set_type)` pour préserver la valeur existante quand `set_type` n'est pas fourni :

```typescript
async update(id: number, dto: UpdateSetDto): Promise<TrainingSet> {
  await this.db.runAsync(
    'UPDATE sets SET reps_min=?, weight=?, weight_type=?, rest_duration=?, set_type=COALESCE(?, set_type) WHERE id=?',
    [dto.reps_min, dto.weight, dto.weight_type, dto.rest_duration, dto.set_type ?? null, id]
  );
  const updated = await this.findById(id);
  if (!updated) throw new Error(`Set ${id} introuvable`);
  return updated;
}
```

Le reste du fichier (`save`, `findById`, `findByBlockId`, `delete`, `swap`) est inchangé. `save()` n'inclut pas `set_type` dans l'INSERT : le `DEFAULT 'normal'` de la migration s'applique, et `SELECT *` le retrouve via `findById`.

- [ ] **Step 8 : Lancer les tests TDD**

```bash
cd app && npm test -- --testPathPattern=setRepository --no-coverage 2>&1 | tail -20
```

Attendu : tous les tests `setRepository.contract.ts` passent, y compris les 2 nouveaux.

- [ ] **Step 9 : Corriger les fixtures `app/services/DeloadService.test.ts`**

Les 5 fixtures Set inline ont besoin de `set_type: 'normal' as const`. Chercher `weight_ratio: null }],` et remplacer chaque occurrence par `weight_ratio: null, set_type: 'normal' as const }],`.

Lignes concernées (environ) : 150, 164, 177, 190, 204. Utiliser `replace_all: true` sur le pattern exact.

Avant :
```typescript
sets: [{ id: 1, block_id: 1, order_index: 0, reps_min: 5, rest_duration: 120, weight: 100, weight_type: 'fixed' as const, duration_seconds: null, weight_ratio: null }],
```

Après (exemple ligne 150) :
```typescript
sets: [{ id: 1, block_id: 1, order_index: 0, reps_min: 5, rest_duration: 120, weight: 100, weight_type: 'fixed' as const, duration_seconds: null, weight_ratio: null, set_type: 'normal' as const }],
```

Répéter pour les 5 lignes (weight: 100, weight: 0, weight: 20, weight: 65, weight: null).

- [ ] **Step 10 : Corriger les fixtures `app/services/weightRatio.test.ts`**

Dans la fonction `makeSet`, ajouter `set_type: 'normal' as const` dans l'objet retourné :

```typescript
function makeSet(overrides: Partial<TrainingSet>): TrainingSet {
  return {
    id: 1,
    block_id: 1,
    reps_min: 8,
    weight: null,
    weight_ratio: null,
    weight_type: 'fixed',
    rest_duration: 120,
    order_index: 0,
    duration_seconds: null,
    set_type: 'normal',
    ...overrides,
  };
}
```

- [ ] **Step 11 : Corriger les fixtures `app/hooks/useSession.test.ts`**

Trois factories ont des Set objects inline. Ajouter `set_type: 'normal' as const` dans chacune.

**`makeExercise` (ligne ~34) — dans le `Array.from` :**
```typescript
sets: Array.from({ length: sets }, (_, i) => ({
  id: i + 1,
  block_id: 1,
  reps_min: 8,
  weight,
  weight_type: 'fixed' as const,
  rest_duration: 90,
  order_index: i,
  duration_seconds: null,
  weight_ratio: null,
  set_type: 'normal' as const,
})),
```

**`makeExerciseWithWeight` (ligne ~188) — le set inline :**
```typescript
sets: [
  {
    id: 100,
    block_id: 20,
    reps_min: 5,
    weight,
    weight_type: weightType,
    rest_duration: 180,
    order_index: 0,
    duration_seconds: null,
    weight_ratio: null,
    set_type: 'normal' as const,
  },
],
```

**`makeDetail` (ligne ~271) — dans le `Array.from` :**
```typescript
const sets = Array.from({ length: numSets }, (_, i) => ({
  id: exerciseIdx * 10 + i + 1,
  block_id: exerciseIdx + 1,
  reps_min: 5,
  weight: 80,
  weight_type: 'fixed' as const,
  rest_duration: 90,
  order_index: i,
  duration_seconds: null,
  weight_ratio: null,
  set_type: 'normal' as const,
}));
```

**Le set inline dans `advances to next block` (ligne ~100) :**
```typescript
{ id: 10, block_id: 2, reps_min: 10, weight: 60, weight_type: 'fixed' as const, rest_duration: 60, order_index: 0, duration_seconds: null, weight_ratio: null, set_type: 'normal' as const }
```

- [ ] **Step 12 : Ajouter tests régression dropset dans `app/hooks/useSession.test.ts`**

Ces tests vérifient le routage dropset déjà implémenté (ligne 280 de `useSession.ts`) — GREEN immédiatement, protègent contre les régressions.

Ajouter à la fin du fichier :

```typescript
// ---------------------------------------------------------------------------
// Dropset routing — régression
// ---------------------------------------------------------------------------

describe('useSession — dropset routing', () => {
  function makeDropsetExercise(): WorkoutExerciseDetail {
    return {
      id: 1,
      workout_id: 1,
      order_index: 0,
      superset_group_id: null,
      exercise: { id: 1, name: 'Curl biceps', type: 'musculation', technical_notes: null, muscle_groups: '[]', description: null },
      blocks: [{
        id: 1,
        name: 'Travail',
        order_index: 0,
        is_work_block: 1,
        sets: [
          { id: 1, block_id: 1, reps_min: 8, weight: 60, weight_type: 'fixed' as const, rest_duration: 0, order_index: 0, duration_seconds: null, weight_ratio: null, set_type: 'normal' as const },
          { id: 2, block_id: 1, reps_min: 8, weight: 50, weight_type: 'fixed' as const, rest_duration: 0, order_index: 1, duration_seconds: null, weight_ratio: null, set_type: 'normal' as const },
          { id: 3, block_id: 1, reps_min: 8, weight: 40, weight_type: 'fixed' as const, rest_duration: 90, order_index: 2, duration_seconds: null, weight_ratio: null, set_type: 'normal' as const },
        ],
      }],
    };
  }

  it('rest_duration=0 dans même bloc → phase running directement (pas de rest)', async () => {
    const { result } = renderHook(() =>
      useSession(1, [makeDropsetExercise()], {
        sessionLogId: 1,
        position: { exerciseIdx: 0, blockIdx: 0, setIdx: 0 },
        phase: 'running',
        startedAt: Date.now(),
        setsLogged: 0,
        volume: 0,
      })
    );
    await act(async () => {
      await result.current.validateSet({ repsDone: 8, weightDone: 60, rpe: null });
    });
    expect(result.current.phase).toBe('running');
    expect(result.current.position.setIdx).toBe(1);
  });

  it('rest_duration>0 après dropsets → phase rest normale', async () => {
    const { result } = renderHook(() =>
      useSession(1, [makeDropsetExercise()], {
        sessionLogId: 1,
        position: { exerciseIdx: 0, blockIdx: 0, setIdx: 2 },
        phase: 'running',
        startedAt: Date.now(),
        setsLogged: 2,
        volume: 880,
      })
    );
    await act(async () => {
      await result.current.validateSet({ repsDone: 8, weightDone: 40, rpe: null });
    });
    expect(result.current.phase).toBe('rest');
  });
});
```

- [ ] **Step 13 : Vérifier typecheck + tests complets**

```bash
cd app && npm run typecheck 2>&1 | tail -10
cd app && npm test -- --no-coverage 2>&1 | tail -15
```

Attendu : `0 errors`, tous les tests passent (inclus les 2 nouveaux régression).

- [ ] **Step 14 : Commit**

```bash
git add app/db/schema.ts app/db/types.ts app/repositories/ISetRepository.ts app/repositories/InMemorySetRepository.ts app/repositories/SQLiteSetRepository.ts app/repositories/setRepository.contract.ts app/services/DeloadService.test.ts app/hooks/useSession.test.ts app/services/weightRatio.test.ts
git commit -m "feat(sets): migration v14 + SetType + repo set_type (TDD)"
```

---

### Task 2 : EditSetModal — toggle AMRAP + hint dropset

**Files:**
- Modify: `app/components/workout/EditSetModal.tsx`

Context : `EditSetModal` affiche une modale avec 4 champs : `repsMin`, `weightType` (segmented), `weight`, `rest`. On ajoute un toggle Normal/AMRAP entre repsMin et le segmented weightType. Quand `rest === '0'`, on affiche un hint "Enchaîner directement avec la série suivante".

---

- [ ] **Step 1 : Remplacer le contenu complet de `app/components/workout/EditSetModal.tsx`**

```typescript
import { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet } from 'react-native';
import type { Set as TrainingSet, WeightType, SetType } from '@/db/types';
import type { UpdateSetDto } from '@/repositories/ISetRepository';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

const MODAL_OVERLAY_COLOR = 'rgba(0,0,0,0.4)' as const;
const BTN_PRIMARY_TEXT = '#fff' as const;

interface EditSetModalProps {
  set: TrainingSet;
  onSave: (dto: UpdateSetDto) => Promise<void>;
  onClose: () => void;
}

export function EditSetModal({ set, onSave, onClose }: EditSetModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [repsMin, setRepsMin] = useState(String(set.reps_min));
  const [weight, setWeight] = useState(set.weight != null ? String(set.weight) : '');
  const [weightType, setWeightType] = useState<WeightType>(set.weight_type);
  const [rest, setRest] = useState(String(set.rest_duration));
  const [setType, setSetType] = useState<SetType>(set.set_type);

  const weightDisabled = weightType === 'bodyweight' || weightType === 'bar';
  const isAmrap = setType === 'amrap';
  const isDropset = rest === '0';

  const SEGMENTS: { key: WeightType; label: string }[] = [
    { key: 'fixed', label: 'Fixe' },
    { key: 'bodyweight', label: 'PC' },
    { key: 'bar', label: 'Barre' },
  ];

  const SET_TYPE_SEGMENTS: { key: SetType; label: string }[] = [
    { key: 'normal', label: 'Normal' },
    { key: 'amrap', label: 'AMRAP' },
  ];

  async function handleSave() {
    const dto: UpdateSetDto = {
      reps_min: parseInt(repsMin, 10) || set.reps_min,
      weight: weightDisabled ? null : (weight.trim() ? parseFloat(weight) : null),
      weight_type: weightType,
      rest_duration: parseInt(rest, 10) || 0,
      set_type: setType,
    };
    await onSave(dto);
    onClose();
  }

  return (
    <Modal transparent animationType="slide" accessibilityViewIsModal>
      <View style={[styles.overlay, { backgroundColor: MODAL_OVERLAY_COLOR }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Modifier la série</Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {isAmrap ? 'Minimum (0 = open AMRAP)' : 'Répétitions'}
          </Text>
          <TextInput
            style={[styles.inputFull, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={repsMin}
            onChangeText={setRepsMin}
            keyboardType="numeric"
            accessibilityLabel={isAmrap ? 'Répétitions minimum, 0 pour open AMRAP' : 'Nombre de répétitions'}
          />

          <View style={styles.segmented}>
            {SET_TYPE_SEGMENTS.map(({ key, label }) => {
              const active = setType === key;
              return (
                <PressableA11y
                  key={key}
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active }}
                  onPress={() => setSetType(key)}
                  style={[
                    styles.segment,
                    { borderColor: colors.border },
                    active ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={{ color: active ? BTN_PRIMARY_TEXT : colors.text }}>{label}</Text>
                </PressableA11y>
              );
            })}
          </View>

          <View style={styles.segmented}>
            {SEGMENTS.map(({ key, label }) => {
              const active = weightType === key;
              return (
                <PressableA11y
                  key={key}
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active }}
                  onPress={() => setWeightType(key)}
                  style={[
                    styles.segment,
                    { borderColor: colors.border },
                    active ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={{ color: active ? BTN_PRIMARY_TEXT : colors.text }}>{label}</Text>
                </PressableA11y>
              );
            })}
          </View>

          <TextInput
            style={[
              styles.inputFull,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              weightDisabled && styles.disabled,
            ]}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            editable={!weightDisabled}
            accessibilityLabel="Poids en kilogrammes"
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Repos (s)</Text>
          <TextInput
            style={[styles.inputFull, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={rest}
            onChangeText={setRest}
            keyboardType="numeric"
            accessibilityLabel="Temps de repos en secondes"
          />
          {isDropset && (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Enchaîner directement avec la série suivante
            </Text>
          )}

          <View style={styles.buttons}>
            <PressableA11y
              accessibilityLabel="Annuler"
              onPress={onClose}
              style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
            >
              <Text style={{ color: colors.text }}>Annuler</Text>
            </PressableA11y>
            <PressableA11y
              accessibilityLabel="Enregistrer"
              onPress={handleSave}
              style={[styles.btn, { backgroundColor: colors.primary }]}
            >
              <Text style={{ color: BTN_PRIMARY_TEXT }}>Enregistrer</Text>
            </PressableA11y>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, gap: 14 },
  title: { fontSize: 17, fontWeight: '600' },
  fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: -8 },
  segmented: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.sm, borderWidth: 1 },
  inputFull: { borderWidth: 1, borderRadius: Radius.sm, padding: 10, fontSize: 16 },
  disabled: { opacity: 0.4 },
  hint: { fontSize: 12, fontStyle: 'italic', marginTop: -8 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.sm },
});
```

Note : `handleSave` utilise `parseInt(rest, 10) || 0` (pas `|| set.rest_duration`) pour que `rest_duration=0` soit bien sauvegardé quand l'utilisateur saisit `0`.

- [ ] **Step 2 : Vérifier typecheck + tests**

```bash
cd app && npm run typecheck 2>&1 | tail -10
cd app && npm test -- --no-coverage 2>&1 | tail -10
```

Attendu : 0 erreurs, tous les tests passent.

- [ ] **Step 3 : Commit**

```bash
git add app/components/workout/EditSetModal.tsx
git commit -m "feat(sets): EditSetModal — toggle AMRAP + hint dropset"
```

---

### Task 3 : BlockCard — affichage AMRAP dans formatSet

**Files:**
- Modify: `app/components/workout/BlockCard.tsx`

Context : la fonction `formatSet` (ligne 26) construit la string affichée pour chaque série dans l'éditeur. Pour AMRAP, `reps_min > 0` donne `"5+ rép"`, `reps_min === 0` donne `"MAX rép"`.

---

- [ ] **Step 1 : Mettre à jour `formatSet` dans `app/components/workout/BlockCard.tsx`**

Remplacer la ligne 27 :
```typescript
const reps = `${set.reps_min} rép`;
```

Par :
```typescript
const reps = set.set_type === 'amrap'
  ? (set.reps_min > 0 ? `${set.reps_min}+ rép` : 'MAX rép')
  : `${set.reps_min} rép`;
```

- [ ] **Step 2 : Vérifier typecheck + tests**

```bash
cd app && npm run typecheck 2>&1 | tail -10
cd app && npm test -- --no-coverage 2>&1 | tail -10
```

Attendu : 0 erreurs, tous les tests passent.

- [ ] **Step 3 : Commit**

```bash
git add app/components/workout/BlockCard.tsx
git commit -m "feat(sets): BlockCard — affichage AMRAP dans formatSet"
```

---

### Task 4 : RunningPhase — badges AMRAP + DROPSET + target + repsFeedback

**Files:**
- Modify: `app/components/session/RunningPhase.tsx`

Context : le fichier est long (~703 lignes). Les sections à modifier sont localisées. Le badge SUPERSET existant est au niveau du `blockBadge` — même pattern pour AMRAP et DROPSET. `rest_duration === 0` en session saute déjà le repos automatiquement (`useSession.validateSet` ligne ~280) : aucun changement de logique nécessaire ici, uniquement le visuel.

---

- [ ] **Step 1 : Mettre à jour `setLabel` et `repsFeedback` (lignes ~186-204)**

Remplacer :
```typescript
const setLabel = `${set.reps_min} rép`;
```

Par :
```typescript
const setLabel = set.set_type === 'amrap'
  ? (set.reps_min > 0 ? `${set.reps_min}+ rép` : 'MAX rép')
  : `${set.reps_min} rép`;
```

Remplacer :
```typescript
const repsFeedback = computeRepsFeedback(
  reps,
  set.reps_min,
  set.weight_type === 'bodyweight',
);
```

Par :
```typescript
const repsFeedback = (set.set_type === 'amrap' && set.reps_min === 0)
  ? null
  : computeRepsFeedback(reps, set.reps_min, set.weight_type === 'bodyweight');
```

- [ ] **Step 2 : Ajouter le badge AMRAP (après le badge SUPERSET, même pattern)**

Après le bloc JSX `{supersetPosition && (...)}` (ligne ~237), ajouter :

```tsx
{set.set_type === 'amrap' && (
  <View style={styles.amrapBadge}>
    <Text style={styles.amrapBadgeText}>AMRAP</Text>
  </View>
)}
{set.rest_duration === 0 && (
  <View style={styles.dropsetBadge}>
    <Text style={styles.dropsetBadgeText}>DROPSET</Text>
  </View>
)}
```

- [ ] **Step 3 : Ajouter le marqueur ⚡ dans les séries restantes**

Remplacer le `restSets.map` (ligne ~460 environ) :
```tsx
{restSets.map((s, i) => (
  <Text key={s.id} style={[styles.restSet, { color: colors.textSecondary }]}>
    {i + currentSetIndex + 2} ·{s.weight != null ? `${convert(s.weight)} ${unitLabel}` : 'PC'} × {s.reps_min}
  </Text>
))}
```

Par :
```tsx
{restSets.map((s, i) => {
  const prevSet = block.sets[currentSetIndex + i];
  const isChained = prevSet?.rest_duration === 0;
  return (
    <Text key={s.id} style={[styles.restSet, { color: colors.textSecondary }]}>
      {i + currentSetIndex + 2} · {s.weight != null ? `${convert(s.weight)} ${unitLabel}` : 'PC'} × {s.set_type === 'amrap' ? (s.reps_min > 0 ? `${s.reps_min}+` : 'MAX') : s.reps_min}{isChained ? ' ⚡' : ''}
    </Text>
  );
})}
```

- [ ] **Step 4 : Ajouter les styles AMRAP et DROPSET**

Dans `StyleSheet.create`, après le style `supersetBadgeText`, ajouter :

```typescript
amrapBadge: {
  alignSelf: 'flex-start',
  marginTop: 2,
  backgroundColor: '#ea580c',
  borderRadius: 4,
  paddingHorizontal: 8,
  paddingVertical: 2,
},
amrapBadgeText: {
  fontSize: 11,
  fontWeight: '700',
  color: '#fff',
  letterSpacing: 0.5,
},
dropsetBadge: {
  alignSelf: 'flex-start',
  marginTop: 2,
  backgroundColor: '#2563eb',
  borderRadius: 4,
  paddingHorizontal: 8,
  paddingVertical: 2,
},
dropsetBadgeText: {
  fontSize: 11,
  fontWeight: '700',
  color: '#fff',
  letterSpacing: 0.5,
},
```

- [ ] **Step 5 : Vérifier typecheck + tests complets**

```bash
cd app && npm run typecheck 2>&1 | tail -10
cd app && npm test -- --no-coverage 2>&1 | tail -15
```

Attendu : 0 erreurs TypeScript, tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
git add app/components/session/RunningPhase.tsx
git commit -m "feat(sets): RunningPhase — badges AMRAP/DROPSET + target + repsFeedback + ⚡"
```
