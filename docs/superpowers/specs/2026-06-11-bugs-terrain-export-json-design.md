# Design — Bugs terrain + Export JSON

**Date :** 2026-06-11  
**Scope :** 3 bugs terrain (B1, B2, B3) + export JSON complet vers share sheet  
**Durée cible :** 2h autonome  
**Hors scope :** import JSON (backlog), redéfinir poids en cours de séance (backlog), onboarding

---

## B1 — Inputs non effacés après validation série

**Fichier :** `app/components/session/RunningPhase.tsx`

**Contexte :** `RunningPhase` a déjà `key={session.currentSet.id}` dans `[workoutId].tsx` → remount à chaque nouveau set → `useState(String(set.reps_max))` et `useState(convert(set.weight))` se ré-initialisent depuis les props. Le bug réel est peut-être que `set` prop contient encore l'ancienne valeur au moment du remount (timing React), ou que `rpe` n'est pas reset (state interne non lié au prop).

**Fix :** Avant de toucher quoi que ce soit, lire `[workoutId].tsx` pour confirmer la source du bug. Pistes :
- Si `set` prop est stale au remount → s'assurer que `currentSet` est bien mis à jour AVANT le remount
- Si `rpe` seul ne reset pas → `rpe` init à `''` est correct, vérifier si un `useEffect` le re-remplit
- Si states persistent malgré le remount → vérifier que `key` est bien `currentSet.id` (et non un index)

**Test :** Valider une série avec reps=10, poids=80kg → vérifier que la série suivante affiche les valeurs cibles du nouveau set, pas 10/80kg.

---

## B2 — Poids de départ null → "—kg" (première séance)

**Fichier :** `app/db/seeds.ts`

**Contexte :** `f(reps_min, reps_max, rest)` sans 4e argument → `weight: null`. Protection `preserveWeight` empêche l'écrasement pour les utilisateurs existants. Première séance : tous les sets Travail affichent "—kg".

**Fix :** Ajouter des poids conservateurs (poids débutant raisonnable) sur tous les sets `f()` sans weight dans le template PPL. Poids à déterminer exercice par exercice en lisant les seeds. Exemples typiques :
- Barbell compounds (Développé couché, Squat, Rowing barre) → 40–60kg
- Haltères isolation (Élévations latérales, Curl) → 6–12kg
- Poulies (Extension triceps, Face pull, Tirage poulie basse) → 20–30kg
- `back_off` avec `weight_ratio` → laisser null (calculé automatiquement depuis Travail)
- Exercices `bodyweight` → laisser null (0 = lest additionnel)
- Exercices `bar` → laisser null (juste la barre = poids variable)

**Note :** Audit complet des exercices `null` en lisant les seeds avant de modifier.

**Test :** Seeds idempotentes — `preserveWeight` ne doit pas écraser les poids existants (déjà couvert par tests existants).

---

## B3 — Robustesse bouton Confirmer (ExerciseStartingWeightPhase)

**Fichier :** `app/components/session/ExerciseStartingWeightPhase.tsx`

**Contexte :** Bouton "Confirmer" déclenche une opération async DB. Pas de feedback visuel pendant l'attente. Pas de gestion d'erreur visible.

**Fix :**
- Ajouter `isLoading: boolean` state local (`useState(false)`)
- `handleConfirm` : `setIsLoading(true)` → await → `setIsLoading(false)` dans finally
- Bouton : `disabled={isLoading}` + remplacer texte "Confirmer" par `ActivityIndicator` si `isLoading`
- Ajouter `error: string | null` state local
- Si erreur : message rouge inline sous le bouton (`"Erreur lors de la sauvegarde. Réessaie."`)

**Test :** Pas de test unitaire pour ce cas d'erreur rare — vérification visuelle suffit.

---

## Export JSON complet

### Architecture

**Nouveau fichier :** `app/services/ExportService.ts`

Pattern identique à `SessionService` / `TemplateService` : injection des repos via constructeur.

```typescript
export class ExportService {
  constructor(private readonly db: SQLiteDatabase) {}
  async exportAll(): Promise<void>
}
```

Prend `db: SQLiteDatabase` directement — pas de repos injectés. L'export est un dump `SELECT * FROM table`, pas de logique métier. Queries SQL directes plus simples que 8 repos injectés.

**Séquence dans `exportAll()` :**
1. `SELECT * FROM` chaque table en `Promise.all` — exercises, programs, workouts, workout_exercises, blocks, sets, session_logs, set_logs, settings
2. Assemble le JSON :
```json
{
  "exportedAt": "2026-06-11T...",
  "appVersion": "x.y.z",
  "schema": 7,
  "data": {
    "exercises": [...],
    "programs": [...],
    "workouts": [...],
    "workoutExercises": [...],
    "blocks": [...],
    "sets": [...],
    "sessionLogs": [...],
    "setLogs": [...],
    "settings": { "theme": "...", "units": "..." }
  }
}
```
3. Écrit dans `FileSystem.cacheDirectory + 'training-export-YYYY-MM-DD.json'` via `expo-file-system`
4. `Sharing.shareAsync(uri)` — share sheet natif iOS/Android

**Dépendances à installer :** `expo-file-system` + `expo-sharing` (absents du package.json) via `npx expo install expo-file-system expo-sharing`.

**Version app :** `require('../app.json').expo.version` depuis `app/services/ExportService.ts` (app.json est à `app/app.json`).

### Tests

**Fichier :** `app/services/ExportService.test.ts` — 2 tests TDD :
1. `exportAll()` produit un JSON avec toutes les clés attendues (`exercises`, `programs`, `sessionLogs`, etc.) — mock `db.getAllAsync` retournant des tableaux vides, mock `FileSystem` + `Sharing`
2. `Sharing.shareAsync` appelé avec un URI contenant `'training-export'`

Mocks : `expo-sqlite`, `expo-file-system`, `expo-sharing` mockés via `jest.mock()`.

### UI — `reglages.tsx`

Nouvelle section **DONNÉES** sous APPARENCE + UNITÉS :

```
── DONNÉES ─────────────────────────
  Exporter mes données        [→]
  Sauvegarde complète (JSON)
```

- `PressableA11y` avec `accessibilityLabel="Exporter toutes mes données d'entraînement"`
- State local `isExporting: boolean` → bouton disabled + `ActivityIndicator` pendant l'export
- State local `exportError: string | null` → message rouge inline si échec
- `ExportService` instancié avec `getDb()` (singleton DB, pattern identique aux autres écrans)

---

## Ordre d'implémentation

| # | Tâche | Fichiers | Durée est. |
|---|-------|----------|-----------|
| 1 | B1 — debug + fix inputs reset | `RunningPhase.tsx`, `[workoutId].tsx` | 20 min |
| 2 | B2 — seeds poids conservateurs PPL | `db/seeds.ts` | 20 min |
| 3 | B3 — spinner + erreur confirm | `ExerciseStartingWeightPhase.tsx` | 20 min |
| 4 | Export — install deps + ExportService TDD | `ExportService.ts`, `.test.ts` | 30 min |
| 5 | Export — UI reglages.tsx | `reglages.tsx` | 20 min |
| 6 | Typecheck + tests + commit | — | 10 min |

**Total estimé : ~2h**

---

## Hors scope (backlog)

- Import JSON (round-trip) — session dédiée, gestion conflits IDs + migrations schema
- Redéfinir poids de travail en cours de séance — feature complète, session dédiée
- Test d'intégration starting-weight — cas rare, coût setup > bénéfice
