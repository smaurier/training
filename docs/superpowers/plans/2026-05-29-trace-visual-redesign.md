# Trace Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refonte visuelle complète — palette anthracite/blanc monochrome, dark mode automatique, typographie Inter, rayon Sharp (4px), app renommée "Trace".

**Architecture:** Trois nouveaux fichiers constants (Colors.ts réécriture, Radius.ts, Typography.ts) + chargement font @expo-google-fonts/inter + app.json + migration borderRadius mécanique sur ~47 occurrences dans 20+ fichiers. Pas de logique métier touchée.

**Tech Stack:** React Native + Expo SDK 54 + TypeScript strict + @expo-google-fonts/inter

**Spec:** `docs/superpowers/specs/2026-05-29-trace-visual-redesign.md`

---

## File Map

| Action | Fichier | Responsabilité |
|---|---|---|
| Réécriture | `app/constants/Colors.ts` | Palette monochrome anthracite/blanc |
| Création | `app/constants/Radius.ts` | Tokens borderRadius Sharp |
| Création | `app/constants/Typography.ts` | Tokens typo Inter |
| Modification | `app/app/_layout.tsx` | Chargement Inter (remplace SpaceMono) |
| Modification | `app/components/Themed.tsx` | fontFamily par défaut sur Text wrapper |
| Modification | `app/app.json` | Nom "Trace" + splash dark |
| Modification | 11 fichiers `app/components/**` | Migration borderRadius → Radius tokens |
| Modification | 11 fichiers `app/app/**` | Migration borderRadius → Radius tokens |

---

## Task 1: Design Tokens — Colors.ts + Radius.ts + Typography.ts

**Files:**
- Modify: `app/constants/Colors.ts`
- Create: `app/constants/Radius.ts`
- Create: `app/constants/Typography.ts`

Pas de tests unitaires pour les fichiers de constantes. Validation par `npx tsc --noEmit` à la fin.

- [ ] **Step 1: Réécrire `app/constants/Colors.ts`**

Remplacer le contenu entier du fichier par :

```typescript
const Colors = {
  light: {
    text: '#0D0D0D',
    textSecondary: '#666666',
    textDisabled: '#AAAAAA',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceElevated: '#F0F0F0',
    primary: '#0D0D0D',
    tint: '#0D0D0D',
    tabIconDefault: '#AAAAAA',
    tabIconSelected: '#0D0D0D',
    border: '#E5E5E5',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#888888',
    textDisabled: '#444444',
    background: '#0D0D0D',
    surface: '#1A1A1A',
    surfaceElevated: '#242424',
    primary: '#FFFFFF',
    tint: '#FFFFFF',
    tabIconDefault: '#444444',
    tabIconSelected: '#FFFFFF',
    border: '#2A2A2A',
  },
};

export default Colors;
```

- [ ] **Step 2: Créer `app/constants/Radius.ts`**

```typescript
export const Radius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  full: 999,
} as const;
```

- [ ] **Step 3: Créer `app/constants/Typography.ts`**

```typescript
export const Typography = {
  display:    { fontSize: 32, fontFamily: 'Inter_900Black' as const },
  title:      { fontSize: 20, fontFamily: 'Inter_700Bold' as const },
  heading:    { fontSize: 17, fontFamily: 'Inter_600SemiBold' as const },
  body:       { fontSize: 15, fontFamily: 'Inter_400Regular' as const },
  bodyMedium: { fontSize: 15, fontFamily: 'Inter_500Medium' as const },
  label:      { fontSize: 13, fontFamily: 'Inter_600SemiBold' as const },
  caption:    { fontSize: 11, fontFamily: 'Inter_400Regular' as const },
  micro:      { fontSize: 9,  fontFamily: 'Inter_700Bold' as const },
} as const;
```

- [ ] **Step 4: Vérifier TypeScript**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreurs (les nouveaux tokens sont additifs, aucun token supprimé).

- [ ] **Step 5: Commit**

```bash
git add app/constants/Colors.ts app/constants/Radius.ts app/constants/Typography.ts
git commit -m "feat(tokens): palette Trace monochrome + Radius + Typography tokens"
```

---

## Task 2: Font Loading — @expo-google-fonts/inter

**Files:**
- Modify: `app/package.json` (via install)
- Modify: `app/app/_layout.tsx`
- Modify: `app/components/Themed.tsx`

- [ ] **Step 1: Installer @expo-google-fonts/inter**

```bash
cd app && npx expo install @expo-google-fonts/inter
```

Attendu : package ajouté dans `package.json` dependencies. Pas d'erreur.

- [ ] **Step 2: Mettre à jour `app/app/_layout.tsx`**

Remplacer :
```typescript
import { useFonts } from 'expo-font';
```
par :
```typescript
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
```

Remplacer :
```typescript
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
```
par :
```typescript
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
  });
```

Le reste de `_layout.tsx` reste inchangé (SplashScreen, dbReady, Stack screens).

- [ ] **Step 3: Mettre à jour `app/components/Themed.tsx`**

Dans la fonction `Text`, ajouter `fontFamily: 'Inter_400Regular'` comme style de base :

```typescript
export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return <DefaultText style={[{ color, fontFamily: 'Inter_400Regular' }, style]} {...otherProps} />;
}
```

La fonction `View` reste inchangée.

- [ ] **Step 4: Vérifier TypeScript**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 5: Commit**

```bash
git add app/app/_layout.tsx app/components/Themed.tsx app/package.json
git commit -m "feat(font): chargement Inter via @expo-google-fonts/inter"
```

---

## Task 3: App Identity — app.json

**Files:**
- Modify: `app/app.json`

- [ ] **Step 1: Mettre à jour `app/app.json`**

Modifier les 3 champs suivants (laisser tout le reste inchangé) :

```json
{
  "expo": {
    "name": "Trace",
    ...
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#0D0D0D",
        ...
      }
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "resizeMode": "contain",
          "backgroundColor": "#0D0D0D"
        }
      ],
      ...
    ]
  }
}
```

Champs modifiés :
- `expo.name` : `"app"` → `"Trace"`
- `expo.android.adaptiveIcon.backgroundColor` : `"#E6F4FE"` → `"#0D0D0D"`
- `expo.plugins[1][1].backgroundColor` (expo-splash-screen) : `"#ffffff"` → `"#0D0D0D"`

- [ ] **Step 2: Commit**

```bash
git add app/app.json
git commit -m "feat(identity): renommer app → Trace, splash dark #0D0D0D"
```

---

## Task 4: BorderRadius Migration — components/

**Files:**
- Modify: `app/components/exercises/ExerciseCard.tsx`
- Modify: `app/components/history/ExerciseHistorySection.tsx`
- Modify: `app/components/programmes/ProgramCard.tsx`
- Modify: `app/components/programmes/WorkoutCard.tsx`
- Modify: `app/components/session/CheckInPhase.tsx`
- Modify: `app/components/session/RunningPhase.tsx`
- Modify: `app/components/session/SummaryPhase.tsx`
- Modify: `app/components/workout/BlockCard.tsx`
- Modify: `app/components/workout/EditBlockModal.tsx`
- Modify: `app/components/workout/EditSetModal.tsx`
- Modify: `app/components/workout/WorkoutExerciseCard.tsx`

**Règle :** toute valeur 4–16 → `Radius.sm`. Valeurs 20+ avec forme pill → `Radius.full`.

Ajouter en tête de chaque fichier modifié (après les imports existants) :
```typescript
import { Radius } from '@/constants/Radius';
```

- [ ] **Step 1: `app/components/exercises/ExerciseCard.tsx`**

Ajouter import `Radius`. Modifier :
```typescript
// avant
borderRadius: 12,
// après
borderRadius: Radius.sm,
```
(1 occurrence, dans `StyleSheet.create`)

- [ ] **Step 2: `app/components/history/ExerciseHistorySection.tsx`**

Ajouter import `Radius`. Modifier :
```typescript
// avant
borderRadius: 6,
// après
borderRadius: Radius.sm,
```
(1 occurrence)

- [ ] **Step 3: `app/components/programmes/ProgramCard.tsx`**

Ajouter import `Radius`. Modifier les 2 occurrences :
```typescript
// avant (ligne ~56)
borderRadius: 12,
// après
borderRadius: Radius.sm,

// avant (ligne ~84)
borderRadius: 10,
// après
borderRadius: Radius.sm,
```

- [ ] **Step 4: `app/components/programmes/WorkoutCard.tsx`**

Ajouter import `Radius`. Modifier :
```typescript
// avant
borderRadius: 12,
// après
borderRadius: Radius.sm,
```
(1 occurrence)

- [ ] **Step 5: `app/components/session/CheckInPhase.tsx`**

Ajouter import `Radius`. Modifier les 2 occurrences :
```typescript
// avant (option, ligne ~115)
borderRadius: 10,
// après
borderRadius: Radius.sm,

// avant (startBtn, ligne ~118)
borderRadius: 14,
// après
borderRadius: Radius.sm,
```

- [ ] **Step 6: `app/components/session/RunningPhase.tsx`**

Ajouter import `Radius`. Modifier les 5 occurrences :
```typescript
// targetCard (ligne ~196)
borderRadius: 12,  →  borderRadius: Radius.sm,

// timerContainer (ligne ~198)
borderRadius: 16,  →  borderRadius: Radius.sm,

// input (ligne ~204)
borderRadius: 8,   →  borderRadius: Radius.sm,

// validateBtn (ligne ~205)
borderRadius: 12,  →  borderRadius: Radius.sm,

// toutReussiBtn (ligne ~207)
borderRadius: 12,  →  borderRadius: Radius.sm,
```

- [ ] **Step 7: `app/components/session/SummaryPhase.tsx`**

Ajouter import `Radius`. Modifier les 3 occurrences :
```typescript
// statCard (ligne ~88)
borderRadius: 12,  →  borderRadius: Radius.sm,

// progressionSection (ligne ~91)
borderRadius: 12,  →  borderRadius: Radius.sm,

// closeBtn (ligne ~99)
borderRadius: 14,  →  borderRadius: Radius.sm,
```

- [ ] **Step 8: `app/components/workout/BlockCard.tsx`**

Ajouter import `Radius`. Modifier :
```typescript
// badge (ligne ~199)
borderRadius: 4,  →  borderRadius: Radius.sm,
```
(valeur identique mais devient un token)

- [ ] **Step 9: `app/components/workout/EditBlockModal.tsx`**

Ajouter import `Radius`. Modifier les 3 occurrences :
```typescript
// input (ligne ~114)
borderRadius: 8,   →  borderRadius: Radius.sm,

// btn (ligne ~118)
borderRadius: 8,   →  borderRadius: Radius.sm,

// chip (ligne ~121) — pill → full
borderRadius: 20,  →  borderRadius: Radius.full,
```

- [ ] **Step 10: `app/components/workout/EditSetModal.tsx`**

Ajouter import `Radius`. Modifier les 4 occurrences :
```typescript
// input (ligne ~141)
borderRadius: 8,  →  borderRadius: Radius.sm,

// segment (ligne ~144)
borderRadius: 8,  →  borderRadius: Radius.sm,

// inputFull (ligne ~145)
borderRadius: 8,  →  borderRadius: Radius.sm,

// btn (ligne ~148)
borderRadius: 8,  →  borderRadius: Radius.sm,
```

- [ ] **Step 11: `app/components/workout/WorkoutExerciseCard.tsx`**

Ajouter import `Radius`. Modifier :
```typescript
// card (ligne ~189)
borderRadius: 12,  →  borderRadius: Radius.sm,
```

- [ ] **Step 12: Vérifier TypeScript**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 13: Commit**

```bash
git add app/components/exercises/ExerciseCard.tsx \
  app/components/history/ExerciseHistorySection.tsx \
  app/components/programmes/ProgramCard.tsx \
  app/components/programmes/WorkoutCard.tsx \
  app/components/session/CheckInPhase.tsx \
  app/components/session/RunningPhase.tsx \
  app/components/session/SummaryPhase.tsx \
  app/components/workout/BlockCard.tsx \
  app/components/workout/EditBlockModal.tsx \
  app/components/workout/EditSetModal.tsx \
  app/components/workout/WorkoutExerciseCard.tsx
git commit -m "refactor(radius): migration borderRadius → Radius tokens (components/)"
```

---

## Task 5: BorderRadius Migration — app/ screens

**Files:**
- Modify: `app/app/(tabs)/exercices.tsx`
- Modify: `app/app/(tabs)/index.tsx`
- Modify: `app/app/(tabs)/programmes.tsx`
- Modify: `app/app/(tabs)/progression.tsx`
- Modify: `app/app/add-exercise.tsx`
- Modify: `app/app/add-programme.tsx`
- Modify: `app/app/add-workout.tsx`
- Modify: `app/app/add-workout-exercise.tsx`
- Modify: `app/app/programme/[id].tsx`
- Modify: `app/app/workout/[id].tsx`
- Modify: `app/app/progression/[exerciseId].tsx`

Ajouter en tête de chaque fichier modifié :
```typescript
import { Radius } from '@/constants/Radius';
```

- [ ] **Step 1: `app/app/(tabs)/exercices.tsx`**

Modifier (FAB circulaire, width=height=56) :
```typescript
// avant (ligne ~85)
borderRadius: 28,
// après
borderRadius: Radius.full,
```

- [ ] **Step 2: `app/app/(tabs)/index.tsx`**

Modifier les 2 occurrences :
```typescript
// card (ligne ~114)
borderRadius: 16,  →  borderRadius: Radius.sm,

// startBtn (ligne ~117)
borderRadius: 12,  →  borderRadius: Radius.sm,
```

- [ ] **Step 3: `app/app/(tabs)/programmes.tsx`**

Modifier (FAB) :
```typescript
// avant (ligne ~138)
borderRadius: 28,  →  borderRadius: Radius.full,
```

- [ ] **Step 4: `app/app/(tabs)/progression.tsx`**

Modifier les 5 occurrences :
```typescript
// segmentTrack (ligne ~205)
borderRadius: 8,   →  borderRadius: Radius.sm,

// segmentButton (ligne ~206)
borderRadius: 6,   →  borderRadius: Radius.sm,

// chip (ligne ~212)
borderRadius: 8,   →  borderRadius: Radius.sm,

// card (ligne ~216)
borderRadius: 10,  →  borderRadius: Radius.sm,

// list (ligne ~224)
borderRadius: 10,  →  borderRadius: Radius.sm,
```

- [ ] **Step 5: `app/app/add-exercise.tsx`**

Modifier les 3 occurrences :
```typescript
// (ligne ~132)
borderRadius: 10,  →  borderRadius: Radius.sm,

// (ligne ~141)
borderRadius: 8,   →  borderRadius: Radius.sm,

// (ligne ~148)
borderRadius: 14,  →  borderRadius: Radius.sm,
```

- [ ] **Step 6: `app/app/add-programme.tsx`**

Modifier les 2 occurrences :
```typescript
// (ligne ~107)
borderRadius: 10,  →  borderRadius: Radius.sm,

// (ligne ~119)
borderRadius: 14,  →  borderRadius: Radius.sm,
```

- [ ] **Step 7: `app/app/add-workout.tsx`**

Modifier les 2 occurrences :
```typescript
// (ligne ~96)
borderRadius: 10,  →  borderRadius: Radius.sm,

// (ligne ~103)
borderRadius: 14,  →  borderRadius: Radius.sm,
```

- [ ] **Step 8: `app/app/add-workout-exercise.tsx`**

Modifier les 2 occurrences :
```typescript
// search (ligne ~99)
borderRadius: 8,  →  borderRadius: Radius.sm,

// createBtn (ligne ~106)
borderRadius: 8,  →  borderRadius: Radius.sm,
```

- [ ] **Step 9: `app/app/programme/[id].tsx`**

Modifier (FAB) :
```typescript
// (ligne ~156)
borderRadius: 28,  →  borderRadius: Radius.full,
```

- [ ] **Step 10: `app/app/workout/[id].tsx`**

Modifier les 2 occurrences :
```typescript
// FAB (ligne ~151)
borderRadius: 28,  →  borderRadius: Radius.full,

// card (ligne ~170)
borderRadius: 12,  →  borderRadius: Radius.sm,
```

- [ ] **Step 11: `app/app/progression/[exerciseId].tsx`**

Modifier :
```typescript
// section (ligne ~154)
borderRadius: 10,  →  borderRadius: Radius.sm,
```

- [ ] **Step 12: Vérifier TypeScript**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 13: Commit**

```bash
git add "app/app/(tabs)/exercices.tsx" \
  "app/app/(tabs)/index.tsx" \
  "app/app/(tabs)/programmes.tsx" \
  "app/app/(tabs)/progression.tsx" \
  app/app/add-exercise.tsx \
  app/app/add-programme.tsx \
  app/app/add-workout.tsx \
  app/app/add-workout-exercise.tsx \
  "app/app/programme/[id].tsx" \
  "app/app/workout/[id].tsx" \
  "app/app/progression/[exerciseId].tsx"
git commit -m "refactor(radius): migration borderRadius → Radius tokens (screens)"
```

---

## Task 6: Vérification finale + Journal

**Files:**
- Modify: `docs/journal/project-log.md`
- Modify: `docs/tests-manuels-mvp.md`

- [ ] **Step 1: TypeScript check global**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 2: Vérification grep — aucun borderRadius hardcodé résiduel**

```bash
grep -rn "borderRadius: [0-9]" app/components app/app --include="*.tsx" --include="*.ts"
```

Attendu : seul résultat acceptable = `app/components/EditScreenInfo.tsx` (composant boilerplate non utilisé dans l'app) et éventuellement des libs tierces. Tout autre résultat est un oubli à corriger.

- [ ] **Step 3: Mettre à jour `docs/tests-manuels-mvp.md`**

Ajouter une section 12 :

```markdown
## 12. Trace — Refonte visuelle (session 12)

- [ ] Dark mode : fond #0D0D0D, surface #1A1A1A, texte blanc pur
- [ ] Light mode : fond #F5F5F5, surface #FFFFFF, texte #0D0D0D
- [ ] Tab bar : icône active = blanc (dark) / noir (light) ; icône inactive = grise
- [ ] Toutes les cartes et boutons : borderRadius 4px (Sharp)
- [ ] Police Inter visible sur tous les écrans (pas de system font / SF Pro)
- [ ] Splash screen : fond #0D0D0D
- [ ] Titre app "Trace" dans header natif (Settings > Général sur iOS, About sur Android)
- [ ] Couleurs delta vert #22C55E / rouge #EF4444 inchangées (Progression)
- [ ] Segmented control Progression : shape Sharp, contraste correct dark/light
```

- [ ] **Step 4: Mettre à jour `docs/journal/project-log.md`**

Ajouter entrée session 12 :

```markdown
## Session 12 — 2026-05-29 — Refonte visuelle Trace

### Réalisé
- Design tokens : Colors.ts réécriture (anthracite/blanc monochrome), Radius.ts (Sharp sm=4px), Typography.ts (Inter)
- Font Inter chargée via @expo-google-fonts/inter (_layout.tsx + Themed.tsx)
- app.json : name "Trace", splash backgroundColor #0D0D0D, android adaptiveIcon #0D0D0D
- Migration borderRadius → Radius tokens : ~47 occurrences dans 22 fichiers
- 4 FABs (exercices, programmes, programme/[id], workout/[id]) → Radius.full
- 1 chip pill (EditBlockModal) → Radius.full
- Tout le reste → Radius.sm (4px)

### Décisions techniques
- Inter via @expo-google-fonts/inter (pas chargement local) — package maintenu par Expo
- fontFamily explicite dans Typography.ts (pas fontWeight — React Native ignore fontWeight sur police custom)
- Overrides sémantiques (#22C55E, #EF4444, #BFDBFE, #1E40AF) maintenus hardcodés (convention projet)
- EditScreenInfo.tsx (boilerplate non utilisé) laissé tel quel

### Prochaine étape
- Tester visuellement sur device/simulateur
- Capturer screenshots pour le manager
```

- [ ] **Step 5: Commit final**

```bash
git add docs/journal/project-log.md docs/tests-manuels-mvp.md
git commit -m "docs: session 12 — journal + tests manuels refonte Trace"
```
