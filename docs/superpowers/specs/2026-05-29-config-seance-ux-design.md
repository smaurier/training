# Config Séance UX — Design Spec

## Context

4 features UX pour la configuration de séance (workout/[id]), revertées lors de la session 12 comme scope creep. Toutes touchent 1 fichier chacune, aucun nouveau fichier, aucune migration DB.

---

## 1. Badge TRAVAIL/REPOS — `app/components/workout/BlockCard.tsx`

### Comportement

À côté du nom de bloc dans le header, afficher un tag inline indiquant le type de bloc.

- `block.is_work_block === 1` → label **"TRAVAIL"**, fond `colors.primary + '20'`, texte `colors.primary`
- `block.is_work_block === 0` → label **"REPOS"**, fond `colors.border`, texte `colors.textSecondary`

### Structure JSX

Wrapper `blockNameRow` (`flexDirection: 'row', alignItems: 'center', gap: 6`) contenant :
1. `<Text style={blockName}>` — nom du bloc (existant, `marginBottom: 2` retiré car row)
2. `<View style={badge}><Text style={badgeText}>{label}</Text></View>`

### Styles

```typescript
blockNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
badge: { borderRadius: Radius.xs, paddingHorizontal: 5, paddingVertical: 1 },
badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
```

`Radius.xs` (2px) pour les badges/tags per convention Radius.ts.

---

## 2. Hint bloc unique — `app/components/workout/WorkoutExerciseCard.tsx`

### Comportement

Quand la carte est expanded ET `detail.blocks.length === 1`, afficher un texte hint sous les blocs :

> *"Ajoute des blocs pour structurer ta séance : Échauffement, Travail, Back-off…"*

Disparaît dès `blocks.length >= 2` ou quand la carte est collapsed.

### Position

Dans la `View style={styles.blocks}`, avant le `detail.blocks.length === 0` check, insérer :

```tsx
{detail.blocks.length === 1 && (
  <Text style={[styles.hint, { color: colors.textSecondary }]}>
    Ajoute des blocs pour structurer ta séance : Échauffement, Travail, Back-off…
  </Text>
)}
```

### Style

```typescript
hint: { fontSize: 12, fontStyle: 'italic', paddingVertical: 4, lineHeight: 18 },
```

---

## 3. Chips suggestions — `app/components/workout/EditBlockModal.tsx`

### Comportement

Uniquement à la **création** d'un bloc (`block === null`). Afficher 3 pills horizontaux scrollables entre le titre et le TextInput.

| Chip | isWork |
|---|---|
| Échauffement | `false` → `is_work_block: 0` |
| Travail | `true` → `is_work_block: 1` |
| Back-off | `true` → `is_work_block: 1` |

Tap sur un chip → `setName(chip.label)` + `setIsWorkBlock(chip.isWork)`. Chip active (nom === chip.label) → fond `colors.primary + '15'`.

### Structure

```typescript
const CHIPS = [
  { label: 'Échauffement', isWork: false },
  { label: 'Travail',      isWork: true  },
  { label: 'Back-off',     isWork: true  },
] as const;
```

`ScrollView horizontal showsHorizontalScrollIndicator={false}` wrappant les 3 `PressableA11y`.

Import ajouté : `ScrollView` depuis `react-native`.

### Styles

```typescript
chipsScroll:  { marginBottom: -4 },
chipsRow:     { flexDirection: 'row', gap: 8, paddingBottom: 4 },
chip:         { borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6 },
chipText:     { fontSize: 13, fontWeight: '500' },
```

Note : le style `chip` existe déjà dans `EditBlockModal.tsx` (héritage session 12, `borderRadius: Radius.full`). Ajouter `chipText`, `chipsScroll`, `chipsRow`.

---

## 4. Bouton "Créer un exercice" — `app/app/add-workout-exercise.tsx`

### Comportement

Quand `filtered.length === 0` (base vide ou recherche sans résultats), remplacer le `<Text>Aucun exercice trouvé.</Text>` par :

```
Aucun exercice trouvé.
[ + Créer un exercice ]   ← bouton outline
```

`onPress={() => router.push('/add-exercise')}`.

### Structure `ListEmptyComponent`

```tsx
ListEmptyComponent={
  <View style={styles.emptyContainer}>
    <Text style={[styles.empty, { color: colors.textSecondary }]}>
      Aucun exercice trouvé.
    </Text>
    <PressableA11y
      accessibilityLabel="Créer un exercice"
      accessibilityHint="Ouvre le formulaire de création d'exercice"
      onPress={() => router.push('/add-exercise')}
      style={[styles.createBtn, { borderColor: colors.primary }]}
    >
      <Text style={[styles.createBtnText, { color: colors.primary }]}>
        + Créer un exercice
      </Text>
    </PressableA11y>
  </View>
}
```

### Styles

```typescript
emptyContainer:  { alignItems: 'center', marginTop: 48, gap: 16 },
empty:           { textAlign: 'center', fontSize: 15 },
createBtn:       { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 20, paddingVertical: 10 },
createBtnText:   { fontSize: 15, fontWeight: '500' },
```

Style `empty` existant (`textAlign: 'center', marginTop: 48, fontSize: 15`) : retirer `marginTop: 48` (déplacé vers `emptyContainer`).

---

## 5. Tests

Pas de tests unitaires (composants UI purs). Validation par `npx tsc --noEmit` + checklist `tests-manuels-mvp.md` section 4.

---

## 6. Out of scope

- Drag-and-drop reorder (déjà implémenté)
- Déload automatique
- Corrélation RPE
- Tout autre changement dans ces fichiers
