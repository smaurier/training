# Sets spéciaux — AMRAP & Dropsets

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter le support des séries AMRAP (As Many Reps As Possible) et des dropsets (enchaînement sans repos) dans l'éditeur de workout et la séance.

**Architecture:** Un seul nouveau champ `set_type` sur la table `sets` couvre AMRAP. Les dropsets sont détectés structurellement via `rest_duration === 0` — aucun nouveau champ DB. Pyramid n'est pas en scope : le nom de bloc existant suffit comme label visuel.

**Tech Stack:** React Native + Expo SDK 54, TypeScript strict, expo-sqlite, Jest TDD.

---

## Décisions de design

### AMRAP
- `set_type TEXT NOT NULL DEFAULT 'normal' CHECK(set_type IN ('normal', 'amrap'))` sur `sets`
- `reps_min` conservé comme **minimum** (classique 5/3/1 : `reps_min=5` = "5+ reps"). `reps_min=0` = open AMRAP sans minimum.
- Progression automatique inchangée : `calculateProgression` compare `reps_done >= reps_min` — fonctionne nativement pour AMRAP avec minimum.
- PR detection inchangée : le 1RM estimé s'applique sur les sets AMRAP comme sur les sets normaux.
- `repsFeedback` désactivé si `set_type === 'amrap' && reps_min === 0` (pas de cible à comparer).

### Dropsets
- Détection : `currentSet.rest_duration === 0` ET next position dans le même bloc (`exerciseIdx`, `blockIdx` identiques).
- Dans `useSession.validateSet` : si condition dropset → `setPhase('running')` directement, sans rest.
- Aucun changement DB. L'utilisateur configure `rest_duration=0` dans EditSetModal.
- Hint dans EditSetModal sous le champ repos : quand `rest === '0'`, afficher `"Enchaîner directement avec la série suivante"`.

### Pyramid
- Hors scope : le bloc badge existant (`block.name.toUpperCase()`) affiche déjà "PYRAMIDE" si l'utilisateur nomme son bloc ainsi. Aucun code supplémentaire.

---

## Modèle de données

### Migration v14

```sql
ALTER TABLE sets ADD COLUMN set_type TEXT NOT NULL DEFAULT 'normal'
  CHECK(set_type IN ('normal', 'amrap'));
```

### `types.ts`

```typescript
export type SetType = 'normal' | 'amrap';

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
  set_type: SetType;  // nouveau
}
```

### `ISetRepository`

```typescript
export type UpdateSetDto = Pick<Set, 'reps_min' | 'weight' | 'weight_type' | 'rest_duration' | 'set_type'>;
```

---

## Repository

### `InMemorySetRepository.save`

```typescript
const item: Set = { ...dto, id: this.nextId++, set_type: 'normal' };
```

### `InMemorySetRepository.update`

```typescript
const updated: Set = { ...existing, ...dto };
this.items[idx] = updated;
return updated;
```
(spread couvre `set_type` si présent dans dto)

### `SQLiteSetRepository.update`

```sql
UPDATE sets SET reps_min=?, weight=?, weight_type=?, rest_duration=?, set_type=? WHERE id=?
```
Paramètres : `[dto.reps_min, dto.weight, dto.weight_type, dto.rest_duration, dto.set_type, id]`

---

## Éditeur — `EditSetModal`

Nouveau toggle `Normal | AMRAP` entre le champ reps et le segmented weight_type.

```
┌─────────────────────────────┐
│ Modifier la série           │
├─────────────────────────────┤
│ [     5      ] ← reps_min  │
│                             │
│ [  Normal  ] [  AMRAP  ]   │ ← nouveau
│                             │
│ [ Fixe ] [  PC  ] [Barre]  │
│ [     80     ] ← poids     │
│                             │
│ Repos (s)                   │
│ [    120     ]              │
│ (hint si 0: "Enchaîner…")  │ ← nouveau
│                             │
│ [Annuler]  [Enregistrer]   │
└─────────────────────────────┘
```

Quand AMRAP sélectionné :
- Label reps devient `"Minimum (0 = open AMRAP)"`
- Segmented AMRAP actif : fond `colors.primary`

`handleSave` inclut `set_type` dans le dto.

---

## Séance — `RunningPhase`

### Badge AMRAP

Affiché si `set.set_type === 'amrap'`. Couleur orange `#ea580c`. Placé après le badge bloc, avant les dots — même pattern que badge SUPERSET.

```typescript
{set.set_type === 'amrap' && (
  <View style={styles.amrapBadge}>
    <Text style={styles.amrapBadgeText}>AMRAP</Text>
  </View>
)}
```

### Target card

```typescript
const setLabel = set.set_type === 'amrap'
  ? (set.reps_min > 0 ? `${set.reps_min}+ rép` : 'MAX rép')
  : `${set.reps_min} rép`;
```

### repsFeedback

Désactivé si `set.set_type === 'amrap' && set.reps_min === 0` :
```typescript
const repsFeedback = (set.set_type === 'amrap' && set.reps_min === 0)
  ? null
  : computeRepsFeedback(reps, set.reps_min, set.weight_type === 'bodyweight');
```

### Badge DROPSET

Affiché si `set.rest_duration === 0`. Couleur bleue `#2563eb`.

```typescript
{set.rest_duration === 0 && (
  <View style={styles.dropsetBadge}>
    <Text style={styles.dropsetBadgeText}>DROPSET</Text>
  </View>
)}
```

### Séries restantes — marquage ⚡

`restSets[i]` est marqué ⚡ si `block.sets[currentSetIndex + i].rest_duration === 0` (le set qui précède n'a pas de repos).

```typescript
{restSets.map((s, i) => (
  <Text key={s.id} style={[styles.restSet, { color: colors.textSecondary }]}>
    {i + currentSetIndex + 2} · {s.weight != null ? `${convert(s.weight)} ${unitLabel}` : 'PC'} × {s.reps_min}
    {block.sets[currentSetIndex + i]?.rest_duration === 0 ? '  ⚡' : ''}
  </Text>
))}
```

---

## Séance — `useSession.validateSet`

Ajout après les checks superset, avant la logique rest normale :

```typescript
// Dropset : même bloc, pas de repos → rester en running
// Placé après les checks superset, avant la logique rest normale.
// `next` est déjà calculé et non-null à ce stade (null = fin de séance, géré avant).
const currentSet = details[exerciseIdx]?.blocks[blockIdx]?.sets[setIdx];
const nextInSameBlock = next !== null &&
  next.exerciseIdx === exerciseIdx &&
  next.blockIdx === blockIdx;
if (nextInSameBlock && currentSet?.rest_duration === 0) {
  updatePosition(next);
  setPhase('running');
  return false;
}
```

---

## Tests TDD

### `useSession.test.ts` — dropset routing (nouveaux)

```typescript
describe('dropset routing', () => {
  it('set_type normal + rest=0 → phase running directement (pas de rest)', () => { ... });
  it('dernier set du dropset (rest>0) → phase rest normale', () => { ... });
  it('set normal avec rest=0 entre blocs → pas considéré dropset (exerciseIdx diff)', () => { ... });
});
```

### `EditSetModal` — (tests existants à mettre à jour)

Ajouter `set_type` dans les fixtures `Set` existantes : `set_type: 'normal'`.

### Fixtures de test

Tous les fichiers de test qui construisent des objets `Set` devront ajouter `set_type: 'normal'`. Utiliser `replace_all` ciblé.

---

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `app/db/schema.ts` | Ajouter migration v14 |
| `app/db/types.ts` | `SetType` + `Set.set_type` |
| `app/repositories/ISetRepository.ts` | `UpdateSetDto` inclut `set_type` |
| `app/repositories/InMemorySetRepository.ts` | `save()` init `set_type: 'normal'`, `update()` spread |
| `app/repositories/SQLiteSetRepository.ts` | `update()` inclut `set_type` |
| `app/components/workout/EditSetModal.tsx` | Toggle Normal/AMRAP + hint dropset |
| `app/components/session/RunningPhase.tsx` | Badge AMRAP + badge DROPSET + target card + repsFeedback + ⚡ restSets |
| `app/hooks/useSession.ts` | `validateSet` dropset short-circuit |
| `app/hooks/useSession.test.ts` | 3 nouveaux tests dropset routing |
| Fichiers de test avec fixtures `Set` | Ajouter `set_type: 'normal'` |
