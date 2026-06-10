# Réglages — Thème & Unités : Spec Design

**Goal:** Permettre à l'utilisateur de forcer le thème (clair/sombre) et les unités (kg/lbs) depuis un écran Réglages, avec détection locale par défaut pour les deux.

**Architecture:** Deux contextes React (`ThemeContext`, `UnitsContext`) chargés au root depuis la table `settings` (déjà en DB). `useColorScheme()` modifié pour lire depuis `ThemeContext`. Nouveau `useUnits()` hook consommé par tous les affichages de poids.

**Tech Stack:** React Native, expo-localization (SDK 54), expo-sqlite (existant), React Context

---

## 1. Données

Table `settings` (clé/valeur TEXT, déjà présente depuis migration v1) :

| clé | valeurs possibles | défaut si absent |
|-----|-------------------|-----------------|
| `theme` | `'system'` \| `'light'` \| `'dark'` | `'system'` |
| `units` | `'system'` \| `'kg'` \| `'lbs'` | `'system'` |

Valeur absente en DB = traiter comme `'system'`. Pas de migration nécessaire.

---

## 2. Repository

### `ISettingsRepository`
```ts
interface ISettingsRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}
```

### `SQLiteSettingsRepository`
- `get` : `SELECT value FROM settings WHERE key = ?`
- `set` : `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`

### `InMemorySettingsRepository`
- `Map<string, string>` en mémoire.

### Contrat TDD (`settingsRepository.contract.ts`)
Tests : `get` retourne null si absent, `get` retourne valeur si présente, `set` crée, `set` remplace.

---

## 3. Contextes

### `ThemeContext`

```ts
type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: 'light' | 'dark';        // préférence résolue (system → OS)
  setTheme: (pref: ThemePreference) => Promise<void>;
}
```

`resolved` : si `preference === 'system'` → lire `useColorSchemeCore()` de React Native. Sinon retourner la valeur directement.

### `UnitsContext`

```ts
type UnitsPreference = 'system' | 'kg' | 'lbs';

interface UnitsContextValue {
  preference: UnitsPreference;
  resolved: 'kg' | 'lbs';           // unité résolue (system → locale)
  setUnit: (pref: UnitsPreference) => Promise<void>;
  convert: (kg: number) => string;   // "80" (kg) ou "176.4" (lbs, 1 décimale)
  label: 'kg' | 'lbs';
}
```

Résolution `'system'` → unités :
```ts
import * as Localization from 'expo-localization';
const region = Localization.getLocales()[0]?.regionCode ?? '';
const resolved = ['US', 'LR', 'MM'].includes(region) ? 'lbs' : 'kg';
```

`convert` :
- `kg` : `String(Math.round(kg * 10) / 10)` (1 décimale si non entier)
- `lbs` : `String(Math.round(kg * 2.20462 * 10) / 10)`

---

## 4. Chargement au démarrage

Dans `app/_layout.tsx`, `RootLayout` charge les deux settings en parallèle pendant `initDatabase()` :

```ts
const [theme, units] = await Promise.all([
  settingsRepo.get('theme'),
  settingsRepo.get('units'),
]);
```

Stocké en state `initialTheme` + `initialUnits`, passé aux providers avant le premier rendu. Aucun flash.

`RootLayoutNav` reçoit `settingsRepo`, `initialTheme`, `initialUnits` en props depuis `RootLayout` :

```tsx
<ThemeContextProvider initialPreference={initialTheme} repo={settingsRepo}>
  <UnitsContextProvider initialPreference={initialUnits} repo={settingsRepo}>
    <GestureHandlerRootView>
      <ThemeProvider value={resolvedScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>…</Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  </UnitsContextProvider>
</ThemeContextProvider>
```

---

## 5. `useColorScheme()` modifié

`app/components/useColorScheme.ts` → lit `resolved` depuis `ThemeContext` :

```ts
export const useColorScheme = (): 'light' | 'dark' => {
  const ctx = useContext(ThemeContext);
  return ctx?.resolved ?? useColorSchemeCore() ?? 'light';
};
```

Tous les composants existants fonctionnent sans modification.

---

## 6. `useUnits()` hook

```ts
export const useUnits = (): UnitsContextValue => {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error('useUnits must be used within UnitsContextProvider');
  return ctx;
};
```

---

## 7. Touchpoints poids

Partout où un poids en kg est affiché à l'utilisateur, remplacer `${weight}kg` par `${convert(weight)} ${label}` :

- `RunningPhase.tsx` : `weightLabel` (cible) + input label + `restSets` section
- `SummaryPhase.tsx` : poids dans les progressions (oldWeight, newWeight)
- `progression/[exerciseId].tsx` : historique poids

Input poids dans `RunningPhase` : initialisé avec `convert(set.weight)` si set.weight non null (affichage dans l'unité courante). À la validation : `parseFloat(input) / (unit === 'lbs' ? 2.20462 : 1)` pour re-convertir en kg avant stockage. Si l'utilisateur change d'unité en cours de série, le champ n'est pas réinitialisé — edge case hors scope, acceptable.

---

## 8. Écran Réglages (`reglages.tsx`)

Deux sections avec segmented controls 3 boutons chacun.

```
─────────────────────────────────
APPARENCE
[ Système ][ Clair ][ Sombre ]
Actuellement : Sombre             ← hint si 'system', sinon masqué

UNITÉS
[ Système ][ kg ][ lbs ]
Actuellement : kg                 ← hint si 'system', sinon masqué
─────────────────────────────────
```

- Changement immédiat → `setTheme()` / `setUnit()` → persist en DB + met à jour le contexte
- Pas de bouton "Sauvegarder"
- Hint sous "Système" uniquement : affiche la valeur résolue en gris

---

## 9. Tests

- Contrat repo : 4 tests (get null, get existant, set crée, set remplace)
- `resolveTheme(preference, osScheme)` : pure function → 3 tests (system→os, light→light, dark→dark)
- `resolveUnits(preference, regionCode)` : pure function → 5 tests (system US→lbs, system FR→kg, system MM→lbs, kg→kg, lbs→lbs)
- `convert(kg, unit)` : 4 tests (kg entier, kg décimal, lbs rounding, 0)

---

## 10. Hors scope

- Conversion à l'import template (poids des seeds restent en kg)
- Conversion dans les seeds PPL
- Notifications / rappels
