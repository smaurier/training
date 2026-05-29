# Trace Visual Redesign — Design Spec

## Context

L'app s'appelle désormais **Trace**. Refonte visuelle complète : palette anthracite/blanc monochrome, dark mode automatique, typographie Inter, rayon Sharp (4px). Aucune couleur d'accent — blanc sur fond sombre, noir sur fond clair.

---

## 1. Design Tokens

### 1.1 `constants/Colors.ts` — Réécriture complète

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

Tokens supprimés : `icon` (non utilisé dans l'app). Token `tint` = alias de `primary` pour compatibilité tab bar Expo.

### 1.2 `constants/Radius.ts` — Nouveau fichier

```typescript
export const Radius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  full: 999,
} as const;
```

Usage : `sm` → cartes, boutons, inputs, tags. `md` → modals. `full` → pills, avatars. `none` → séparateurs.

### 1.3 `constants/Typography.ts` — Nouveau fichier

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

React Native n'applique pas `fontWeight` sur une police custom — il faut `fontFamily` explicite. Typography.ts intègre donc directement la bonne variante Inter.

---

## 2. Typographie — Inter

Package : `@expo-google-fonts/inter`.

Variantes chargées : `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold`, `Inter_900Black`.

**`app/_layout.tsx`** : remplacer `useFonts({ SpaceMono })` par le chargement Inter. Garder `SplashScreen.preventAutoHideAsync()` / `hideAsync()` existant.

**`components/Themed.tsx`** : le wrapper `Text` existant reçoit `fontFamily: 'Inter_400Regular'` comme style de base. Utiliser les tokens `Typography.*` (qui encodent déjà la bonne variante Inter) plutôt que `fontWeight` seul — React Native ignore `fontWeight` sur une police custom.

SpaceMono reste dans `StyledText.tsx` / `MonoText` mais n'est plus chargé dans `_layout.tsx` si `EditScreenInfo` n'est plus utilisé. Supprimer uniquement si aucun écran ne l'importe (vérifier à l'implémentation).

---

## 3. App Identity

**`app.json`** :
- `name`: `"Trace"`
- `slug`: inchangé (`"app"` ou adapter si souhaité — hors scope)
- `backgroundColor` (splash) : `"#0D0D0D"`
- `userInterfaceStyle`: `"automatic"` (déjà en place)

---

## 4. Borderradius — Migration vers Radius tokens

**23 fichiers** ont des `borderRadius` hardcodés (8, 10, 12, 16, 20). Tous migrent vers `Radius.sm` (4) sauf exceptions.

### Règle de migration

| Valeur actuelle | Nouveau token | Note |
|---|---|---|
| 4–8 | `Radius.sm` (4) | Standard Sharp |
| 10–12 | `Radius.sm` (4) | Arrondi → Sharp |
| 16–20 | `Radius.md` (8) | Modals uniquement |
| `borderRadius: 999` ou `full` | `Radius.full` | Pills, avatars |

### Exceptions — ne PAS toucher

- Couleurs sémantiques `#22C55E` / `#EF4444` (delta positif/négatif) : convention projet = overrides sémantiques explicites autorisés.
- Couleurs chart `#BFDBFE` / `#1E40AF` (barres dim VolumeBarChart) : idem.
- `borderRadius` dans les libs tierces (`react-native-gifted-charts`, etc.).

### Fichiers concernés (grep `borderRadius: [0-9]`)

À identifier précisément à l'implémentation via :
```bash
grep -rn "borderRadius:" app/components app/app --include="*.tsx" --include="*.ts"
```

Résultat attendu ≈ 23 occurrences dans : WorkoutExerciseCard, ExerciseCard, ProgramCard, SetRow, BlockCard, ProgressionCard, VolumeBarChart, Exercise1RMCard, et les écrans.

---

## 5. Couleurs sémantiques — Règle explicite

Convention projet déjà établie en session 11 :

> Les overrides sémantiques explicites (vert/rouge pour statut, bleu pour état désactivé de graphique) restent en hexadécimal hardcodé. Ils NE passent PAS par Colors.ts.

Exemples maintenus :
- `color: '#22C55E'` → delta positif
- `color: '#EF4444'` → delta négatif
- `frontColor: '#BFDBFE'` / `'#1E40AF'` → barres chart semaines passées vs courante

---

## 6. Scope complet (Option B)

| Tâche | Fichiers |
|---|---|
| Design tokens | `constants/Colors.ts` (réécriture), `constants/Radius.ts` (nouveau), `constants/Typography.ts` (nouveau) |
| Font loading | `app/_layout.tsx`, `components/Themed.tsx`, `package.json` |
| App identity | `app.json` |
| BorderRadius migration | ~23 fichiers composants + écrans |

---

## 7. Out of scope

- Nouveau splash screen graphique (logo Trace) — phase ultérieure
- Icône app — phase ultérieure
- Animations / transitions — non demandé
- Light mode UI polish — tokens suffisent, pas de refonte layout
- Renommer le slug dans app.json — non critique

---

## 8. Tests

Pas de tests unitaires pour les tokens (fichiers constants). Tests manuels :

- [ ] Dark mode : background `#0D0D0D`, surface `#1A1A1A`, texte blanc
- [ ] Light mode : background `#F5F5F5`, surface `#FFFFFF`, texte `#0D0D0D`
- [ ] Tab bar : icônes actives blanc (dark) / noir (light), inactives grises
- [ ] Toutes les cartes : `borderRadius: 4` (Sharp)
- [ ] Police Inter visible sur tous les écrans
- [ ] Splash screen fond `#0D0D0D`
- [ ] Titre app "Trace" dans header natif
- [ ] Couleurs delta vert/rouge inchangées
