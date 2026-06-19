# Usage une main — Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger 3 vrais problèmes ergonomiques one-handed identifiés par l'audit : "Passer →" enfoui dans le ScrollView, actionBtn visuellement trop petit, bouton Confirmer masqué par le clavier.

**Architecture:** Correctifs chirurgicaux UI — 2 composants. Zéro nouvelle logique, zéro nouveau test (UI pure).

**Tech Stack:** React Native, Expo, TypeScript

---

## Contexte design system

```ts
colors.border       // #2A2A2A dark / #E2E2E2 light
colors.textSecondary // muted text
colors.background   // fond écran
colors.primary      // lime #84CC16
colors.onPrimary    // #0D0D0D
```

Radius : `Radius.sm` = 4px.  
Typography : toujours `fontFamily` Inter, jamais `fontWeight` string.

---

## Task 1: RunningPhase — "Passer →" footer fixe + actionBtn padding

**Bug 1 :** `app/components/session/RunningPhase.tsx` — le bouton "Passer →" (ligne ~502) est à l'intérieur du `<ScrollView>`, après la liste des sets de repos. En séance avec un haltère en main, l'utilisateur doit scroller vers le bas pour le trouver — friction critique.

**Bug 2 :** `styles.actionBtn: { padding: 8 }` (ligne 680) — padding visuel trop faible pour les 3 icônes header (barbell, help, undo). PressableA11y garantit 44px de touch target, mais 8px de padding visuel crée une zone de tap confuse.

**Fix 1 :** Déplacer le skipBtn hors du ScrollView, en footer fixe sous le contenu.

**Fix 2 :** `padding: 8` → `padding: 12` sur `actionBtn`.

**Files:**
- Modify: `app/components/session/RunningPhase.tsx`

Pas de test — UI pure.

### Changements détaillés

#### Fix 1 — Structure du return

Le return actuel est :
```tsx
return (
  <>
    <ScrollView ...>
      {/* ... tout le contenu ... */}
      <PressableA11y style={styles.skipBtn}>Passer →</PressableA11y>
    </ScrollView>
    <BottomSheet ref={skipExerciseSheetRef} ... />
    <BottomSheet ref={descriptionSheetRef} ... />
    <BottomSheet ref={adjustWeightSheetRef} ... />
  </>
);
```

Après le fix :
```tsx
return (
  <View style={styles.wrapper}>
    <ScrollView ...>
      {/* ... tout le contenu SANS skipBtn ... */}
    </ScrollView>
    <PressableA11y
      accessibilityLabel="Passer — ouvrir les options"
      onPress={() => skipExerciseSheetRef.current?.expand()}
      style={[styles.skipBtn, { borderTopColor: colors.border }]}
    >
      <Text style={[styles.skipText, { color: colors.textSecondary }]}>Passer →</Text>
    </PressableA11y>
    <BottomSheet ref={skipExerciseSheetRef} ... />
    <BottomSheet ref={descriptionSheetRef} ... />
    <BottomSheet ref={adjustWeightSheetRef} ... />
  </View>
);
```

Nouveaux styles :
```tsx
wrapper: { flex: 1 },
skipBtn: { alignItems: 'center', paddingVertical: 14, borderTopWidth: 1 },
// (remplace l'ancien skipBtn: { alignItems: 'center', paddingVertical: 8 })
```

`<View>` wrapper est nécessaire pour que `flex: 1` + footer non-scrollable fonctionnent correctement. Le Fragment `<>` ne peut pas être le root d'un layout flex.

#### Fix 2 — actionBtn padding

```tsx
// Avant
actionBtn: { padding: 8 },

// Après
actionBtn: { padding: 12 },
```

### Steps

- [ ] **Step 1: Lire RunningPhase.tsx**

Lire `app/components/session/RunningPhase.tsx` pour confirmer :
- La ligne exacte du skipBtn (vers 502)
- La structure du return (Fragment `<>`)
- La ligne du style `actionBtn` (vers 680)
- La ligne du style `skipBtn` (vers 705)

- [ ] **Step 2: Ajouter l'import `View`**

`View` est déjà importé de `react-native` (c'est déjà le cas dans le fichier) — vérifier.

- [ ] **Step 3: Modifier la structure du return**

3a. Changer `<>` → `<View style={styles.wrapper}>` au début du return.

3b. Supprimer le bloc skipBtn de l'intérieur du ScrollView (les ~6 lignes `<PressableA11y style={styles.skipBtn}...>`).

3c. Ajouter le skipBtn ENTRE `</ScrollView>` et le premier `<BottomSheet>` :
```tsx
<PressableA11y
  accessibilityLabel="Passer — ouvrir les options"
  onPress={() => skipExerciseSheetRef.current?.expand()}
  style={[styles.skipBtn, { borderTopColor: colors.border }]}
>
  <Text style={[styles.skipText, { color: colors.textSecondary }]}>Passer →</Text>
</PressableA11y>
```

3d. Changer `</>` → `</View>` à la fin du return.

- [ ] **Step 4: Mettre à jour les styles**

Dans `StyleSheet.create(...)` :

```tsx
// Modifier :
wrapper: { flex: 1 },
actionBtn: { padding: 12 },
skipBtn: { alignItems: 'center', paddingVertical: 14, borderTopWidth: 1 },
```

Note : ajouter `wrapper` (nouveau style), modifier `actionBtn` et `skipBtn`.

- [ ] **Step 5: Typecheck**

```bash
cd C:/Users/sylva/projects/training-app/app && npm run typecheck 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
git add app/components/session/RunningPhase.tsx
git commit -m "fix(ux): Passer → footer fixe en séance, actionBtn padding 12"
```

---

## Task 2: ExerciseStartingWeightPhase — bouton Confirmer en footer fixe

**Bug :** `app/components/session/ExerciseStartingWeightPhase.tsx` — le layout est `{ flex: 1, justifyContent: 'center' }`. Tout le contenu (nom, titre, input, bouton Confirmer) est centré verticalement. Quand le clavier numérique s'ouvre (déclenché par `autoFocus`), il réduit la zone disponible — le contenu centré peut pousser le bouton "Confirmer →" hors de l'écran visible.

**Fix :** Séparer le layout en deux zones :
- Zone contenu (flex: 1, justifyContent: 'center') : exerciseName, title, subtitle, input
- Footer fixe (bas de l'écran) : bouton Confirmer + message d'erreur

Le bouton reste toujours visible en bas, le clavier pousse uniquement la zone contenu vers le haut.

**Files:**
- Modify: `app/components/session/ExerciseStartingWeightPhase.tsx`

Pas de test — UI pure.

### Changements JSX

**Avant :**
```tsx
<View style={[styles.container, { backgroundColor: colors.background }]}>
  <Text ... exerciseName ... />
  <Text ... title ... />
  <Text ... subtitle ... />
  <TextInput ... />
  <PressableA11y ... btn ... />
  {error && <Text ... errorText ... />}
</View>
```

**Après :**
```tsx
<View style={[styles.container, { backgroundColor: colors.background }]}>
  <View style={styles.content}>
    <Text ... exerciseName ... />
    <Text ... title ... />
    <Text ... subtitle ... />
    <TextInput ... />
  </View>
  <View style={styles.footer}>
    <PressableA11y ... btn ... />
    {error && <Text ... errorText ... />}
  </View>
</View>
```

### Changements styles

**Avant :**
```tsx
container: {
  flex: 1,
  justifyContent: 'center',
  paddingHorizontal: 32,
  gap: 20,
},
```

**Après :**
```tsx
container: {
  flex: 1,
  paddingHorizontal: 32,
},
content: {
  flex: 1,
  justifyContent: 'center',
  gap: 20,
},
footer: {
  paddingBottom: 32,
  paddingTop: 12,
  gap: 12,
},
```

Note : `gap: 20` est retiré du `container` et placé dans `content`. Le `footer` a son propre espacement.

### Steps

- [ ] **Step 1: Lire le fichier**

Lire `app/components/session/ExerciseStartingWeightPhase.tsx` pour confirmer la structure JSX actuelle et les styles.

- [ ] **Step 2: Modifier le JSX**

Entourer les 4 éléments de contenu (exerciseName, title, subtitle, TextInput) dans un `<View style={styles.content}>`.

Entourer le bouton et le message d'erreur dans un `<View style={styles.footer}>`.

- [ ] **Step 3: Mettre à jour les styles**

Remplacer le style `container` et ajouter `content` + `footer` comme décrit ci-dessus.

- [ ] **Step 4: Typecheck**

```bash
cd C:/Users/sylva/projects/training-app/app && npm run typecheck 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add app/components/session/ExerciseStartingWeightPhase.tsx
git commit -m "fix(ux): Confirmer footer fixe — bouton visible quand clavier ouvert"
```

---

## Self-review

**1. Couverture :**
- ✅ "Passer →" toujours visible sans scroll → T1
- ✅ actionBtn padding visuel amélioré → T1
- ✅ Bouton Confirmer visible malgré clavier → T2

**2. Placeholders :** Aucun.

**3. Régression risk :**
- T1 : le wrapper `<View style={{flex:1}}>` ne change pas le comportement des BottomSheets (déjà rendus en overlay). Les BottomSheets utilisent `position: absolute` ou portal, pas affectés par le wrapper.
- T2 : layout split est backward-compatible — l'écran affiche exactement les mêmes éléments, juste repositionnés.
