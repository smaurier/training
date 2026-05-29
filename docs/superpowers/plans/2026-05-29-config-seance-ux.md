# Config Séance UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter 4 features UX dans la configuration de séance : badge TRAVAIL/REPOS, hint bloc unique, chips suggestions, bouton créer exercice.

**Architecture:** 4 modifications indépendantes, 1 fichier chacune, aucune nouvelle interface, aucune migration DB. Radius tokens déjà importés dans tous les fichiers cibles depuis la session 12.

**Tech Stack:** React Native + Expo SDK 54 + TypeScript strict

**Spec:** `docs/superpowers/specs/2026-05-29-config-seance-ux-design.md`

---

## File Map

| Action | Fichier |
|---|---|
| Modify | `app/components/workout/BlockCard.tsx` |
| Modify | `app/components/workout/WorkoutExerciseCard.tsx` |
| Modify | `app/components/workout/EditBlockModal.tsx` |
| Modify | `app/app/add-workout-exercise.tsx` |

---

## Task 1: Badge TRAVAIL/REPOS — BlockCard.tsx

**Files:**
- Modify: `app/components/workout/BlockCard.tsx`

Le fichier a déjà `import { Radius } from '@/constants/Radius'` et un style `badge: { borderRadius: Radius.sm, ... }`. La tâche ajoute la logique de rendu et les styles manquants.

Pas de test unitaire (composant UI). Validation : `npx tsc --noEmit`.

- [ ] **Step 1: Lire le fichier pour localiser le point d'insertion**

Ouvrir `app/components/workout/BlockCard.tsx`. Repérer :
- ligne ~92 : `<Text style={[styles.blockName, { color: colors.textSecondary }]}>{block.name}</Text>`
- ligne ~185 : `badge: { borderRadius: Radius.sm, paddingHorizontal: 5, paddingVertical: 1 },`

- [ ] **Step 2: Modifier le JSX — wrapper + badge**

Remplacer le `<Text>` du nom de bloc (enfant direct de `PressableA11y`) par :

```tsx
<View style={styles.blockNameRow}>
  <Text style={[styles.blockName, { color: colors.textSecondary }]}>{block.name}</Text>
  <View style={[
    styles.badge,
    block.is_work_block === 1
      ? { backgroundColor: colors.primary + '20' }
      : { backgroundColor: colors.border },
  ]}>
    <Text style={[
      styles.badgeText,
      { color: block.is_work_block === 1 ? colors.primary : colors.textSecondary },
    ]}>
      {block.is_work_block === 1 ? 'TRAVAIL' : 'REPOS'}
    </Text>
  </View>
</View>
```

`View` est déjà importé (vérifier — si absent, l'ajouter à l'import `react-native`).

- [ ] **Step 3: Mettre à jour les styles**

Dans `StyleSheet.create`, modifier `blockName` (retirer `marginBottom: 2`), mettre à jour `badge` (changer `Radius.sm` → `Radius.xs`), ajouter `blockNameRow` et `badgeText` :

```typescript
blockNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
blockName: {
  fontSize: 11,
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  // marginBottom: 2 retiré — déplacé vers blockNameRow
},
badge: { borderRadius: Radius.xs, paddingHorizontal: 5, paddingVertical: 1 },
badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
```

- [ ] **Step 4: TypeScript check**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/sylva/projects/training-app add app/components/workout/BlockCard.tsx
git -C C:/Users/sylva/projects/training-app commit -m "feat(ux): badge TRAVAIL/REPOS sur les blocs"
```

---

## Task 2: Hint bloc unique — WorkoutExerciseCard.tsx

**Files:**
- Modify: `app/components/workout/WorkoutExerciseCard.tsx`

Quand un seul bloc est configuré et la carte est expanded, afficher un texte hint encourageant à structurer la séance.

- [ ] **Step 1: Localiser le point d'insertion**

Dans `app/components/workout/WorkoutExerciseCard.tsx`, trouver le bloc `{expanded && (<View style={styles.blocks}>...)}`.

À l'intérieur, le contenu actuel est :
```tsx
{detail.blocks.length === 0 ? (
  <Text style={[styles.empty, { color: colors.textSecondary }]}>Aucun bloc configuré.</Text>
) : (
  detail.blocks.map(...)
)}
```

- [ ] **Step 2: Ajouter le hint avant le check blocks.length === 0**

Insérer avant le ternaire `{detail.blocks.length === 0 ? ...}` :

```tsx
{detail.blocks.length === 1 && (
  <Text style={[styles.hint, { color: colors.textSecondary }]}>
    Ajoute des blocs pour structurer ta séance : Échauffement, Travail, Back-off…
  </Text>
)}
```

- [ ] **Step 3: Ajouter le style `hint` dans StyleSheet.create**

```typescript
hint: { fontSize: 12, fontStyle: 'italic', paddingVertical: 4, lineHeight: 18 },
```

- [ ] **Step 4: TypeScript check**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/sylva/projects/training-app add app/components/workout/WorkoutExerciseCard.tsx
git -C C:/Users/sylva/projects/training-app commit -m "feat(ux): hint bloc unique dans WorkoutExerciseCard"
```

---

## Task 3: Chips suggestions — EditBlockModal.tsx

**Files:**
- Modify: `app/components/workout/EditBlockModal.tsx`

Afficher 3 pills cliquables uniquement à la création d'un bloc (pas en édition). Tap → pré-remplit le nom et le type.

- [ ] **Step 1: Ajouter `ScrollView` à l'import react-native**

Ligne 2 actuelle :
```typescript
import { Modal, View, Text, TextInput, Switch, StyleSheet } from 'react-native';
```
Remplacer par :
```typescript
import { Modal, View, Text, TextInput, Switch, StyleSheet, ScrollView } from 'react-native';
```

- [ ] **Step 2: Ajouter la constante CHIPS après les imports**

Juste avant la déclaration de `EditBlockModal` (après les imports, avant la fonction) :

```typescript
const CHIPS = [
  { label: 'Échauffement', isWork: false },
  { label: 'Travail',      isWork: true  },
  { label: 'Back-off',     isWork: true  },
] as const;
```

- [ ] **Step 3: Ajouter le rendu des chips dans le JSX**

Dans la fonction `EditBlockModal`, après le `<Text style={styles.title}>` et avant le `<TextInput>`, insérer :

```tsx
{!block && (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.chipsScroll}
    contentContainerStyle={styles.chipsRow}
  >
    {CHIPS.map(chip => (
      <PressableA11y
        key={chip.label}
        accessibilityLabel={`Suggérer ${chip.label}`}
        onPress={() => { setName(chip.label); setIsWorkBlock(chip.isWork); }}
        style={[
          styles.chip,
          { borderColor: colors.primary },
          name === chip.label && { backgroundColor: colors.primary + '15' },
        ]}
      >
        <Text style={[styles.chipText, { color: colors.primary }]}>{chip.label}</Text>
      </PressableA11y>
    ))}
  </ScrollView>
)}
```

- [ ] **Step 4: Ajouter les styles manquants dans StyleSheet.create**

Le style `chip` existe déjà (`borderRadius: Radius.full`). Ajouter :

```typescript
chipsScroll: { marginBottom: -4 },
chipsRow:    { flexDirection: 'row', gap: 8, paddingBottom: 4 },
chipText:    { fontSize: 13, fontWeight: '500' },
```

- [ ] **Step 5: TypeScript check**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 6: Commit**

```bash
git -C C:/Users/sylva/projects/training-app add app/components/workout/EditBlockModal.tsx
git -C C:/Users/sylva/projects/training-app commit -m "feat(ux): chips suggestions dans EditBlockModal (création bloc)"
```

---

## Task 4: Bouton "Créer un exercice" — add-workout-exercise.tsx

**Files:**
- Modify: `app/app/add-workout-exercise.tsx`

Quand la liste filtrée est vide, afficher un bouton outline "Créer un exercice" sous le message texte.

État actuel du fichier (après session 12) :
- `ListEmptyComponent` = `<Text style={[styles.empty, ...]}>Aucun exercice trouvé.</Text>`
- `styles.empty` = `{ textAlign: 'center', marginTop: 48, fontSize: 15 }`
- Pas de `emptyContainer`, `createBtn`, `createBtnText`

- [ ] **Step 1: Modifier `ListEmptyComponent`**

Remplacer :
```tsx
ListEmptyComponent={
  <Text style={[styles.empty, { color: colors.textSecondary }]}>
    Aucun exercice trouvé.
  </Text>
}
```
par :
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

- [ ] **Step 2: Mettre à jour les styles**

Remplacer :
```typescript
empty: { textAlign: 'center', marginTop: 48, fontSize: 15 },
```
par :
```typescript
emptyContainer:  { alignItems: 'center', marginTop: 48, gap: 16 },
empty:           { textAlign: 'center', fontSize: 15 },
createBtn:       { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 20, paddingVertical: 10 },
createBtnText:   { fontSize: 15, fontWeight: '500' },
```

Note : `marginTop: 48` déplacé de `empty` vers `emptyContainer`. `Radius` est déjà importé.

- [ ] **Step 3: TypeScript check**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 4: Commit**

```bash
git -C C:/Users/sylva/projects/training-app add "app/app/add-workout-exercise.tsx"
git -C C:/Users/sylva/projects/training-app commit -m "feat(ux): bouton créer exercice sur liste vide"
```

---

## Task 5: Journal

**Files:**
- Modify: `docs/journal/project-log.md`

- [ ] **Step 1: Ajouter entrée session 13 en tête du journal**

```markdown
## Session 13 — 2026-05-29 — Config séance UX

### Réalisé
- Badge TRAVAIL/REPOS sur les blocs (BlockCard.tsx)
- Hint "Ajoute des blocs..." si 1 seul bloc (WorkoutExerciseCard.tsx)
- Chips suggestions Échauffement/Travail/Back-off dans EditBlockModal (création uniquement)
- Bouton "Créer un exercice" sur liste vide dans add-workout-exercise.tsx

### Prochaine étape
- Tests manuels complets sur device (tests-manuels-mvp.md)
- Déload automatique (V2 ou prioritaire selon retour tests)
```

- [ ] **Step 2: Commit**

```bash
git -C C:/Users/sylva/projects/training-app add docs/journal/project-log.md
git -C C:/Users/sylva/projects/training-app commit -m "docs: session 13 — journal config séance UX"
```
