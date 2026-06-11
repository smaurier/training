# Journal de projet — Training App

Journal chronologique du projet, du lancement à la release. Chaque session est documentée : ce qui a été demandé, les décisions prises, les problèmes rencontrés et les choix retenus avec leur raison.

---

## S29 — 2026-06-11 — Quick Wins Séance

### Livré
- **F1 Célébration PR** : `SessionService.logSet` retourne `{ setLog, isPR }`. Badge overlay 3s dans `[workoutId].tsx`, survit la transition RunningPhase→RestPhase. `AccessibilityInfo.announceForAccessibility`. `handleValidate` wrapper retourne `Promise<void>`, dép array `[session.validateSet, session.currentExercise]`.
- **F2 Feedback reps** : `computeRepsFeedback` pure function (8 tests TDD). Hint inline si écart > 25% cible, `accessibilityLiveRegion="polite"`, sous bouton Valider.
- **F3 RPE redesign** : TextInput remplacé par 3 chips Facile/Normal/Difficile (mapped 3/6/9). `accessibilityRole="radio"`, toggle deselect.
- **F4 Stepper poids** : bouton barbell dans header (non-bodyweight uniquement) → BottomSheet stepper ±2.5 kg (±5 lbs). `adjustedWeight` en kg interne, `convert()` pour affichage. Guard `adjusting` contre double-tap async. Message confirmation 2s. Appliqué aux séries suivantes via `session.setStartingWeight`.

### Décisions
- `validateSet` retourne `Promise<boolean>` (isPR) — timeout badge géré dans `[workoutId].tsx`, pas dans `useSession` (séparation responsabilités UI/métier)
- Threshold feedback reps ±25% proportionnel — adapté à toutes plages (5×1.25=6.25, 15×1.25=18.75)
- `adjustedWeight` en kg interne, `convert()` pour affichage — cohérent avec le reste de l'app
- RPE field ne bloque plus UX : chips optionnels remplacent TextInput

---

## Session 28 — 2026-06-11 — Bugs terrain + Export JSON

### Réalisé

**B1 — Inputs non effacés (stale)** : `key={session.currentSet.id}` déjà en place sur `<RunningPhase>` depuis S25 → remount à chaque nouveau set → states re-initialisés depuis les props. Bug résolu par le key prop. Aucun code modifié.

**B2 — Poids de départ null → "—kg"** : poids conservateurs seedés dans tous les exercices PPL à poids libre — Développé couché barre 60kg, Squat 60kg, Rowing barre 50kg, Romanian Deadlift 50kg, Pin Press 40kg, Tirage poulie basse 30kg, Leg curl poulie 30kg, Fentes bulgares 14kg, Développé incliné haltères 16kg, Extension triceps 20kg, Curl barre EZ 20kg, Face pull 20kg, Crunch poulie haute 25kg, Élévations latérales 8kg. Protection `preserveWeight` garantit que les utilisateurs avec des logs ou poids existants ne sont pas impactés. Commit `5a9daf9`.

**B3 — Robustesse confirm starting-weight** : `ExerciseStartingWeightPhase` avait déjà `loading` state + "Enregistrement…". Ajout `error: string | null` state + message rouge inline sous bouton si `onConfirm` throw. `setError(null)` au début de chaque tentative. Commit `969d942`.

**Export JSON complet** :
- `ExportService` (`app/services/ExportService.ts`) : `db.getAllAsync` sur 9 tables en `Promise.all`, JSON formaté avec `exportedAt`/`appVersion`/`schema: 7`/`data`. Écrit dans `FileSystem.cacheDirectory` via `expo-file-system/legacy`, déclenche share sheet via `expo-sharing`. 3 tests TDD (shape JSON, shareAsync appelé, throw si sharing indisponible). Commit `aa23278`.
- UI : section DONNÉES dans `reglages.tsx`, bouton `PressableA11y` avec spinner `ActivityIndicator` pendant export, erreur inline si échec. Commit `8ebeb5b`.

315/315 tests passent.

### Décisions techniques

- **`expo-file-system/legacy`** : `expo-file-system` v19 (SDK 54) a migré vers une nouvelle API (`File`/`Paths`). L'API legacy (`cacheDirectory`, `writeAsStringAsync`, `EncodingType`) est accessible via le sous-chemin `/legacy`. Import adapté pour éviter les erreurs TypeScript.
- **Queries SQL directes dans ExportService** : dump `SELECT * FROM table` — pas de logique métier, pas besoin de passer par les repos. Pattern différent de `SessionService` (qui injecte des repos) mais justifié pour un export one-shot.
- **Import JSON round-trip hors scope** : export livré, import gardé au backlog (gestion conflits IDs + migrations schema = session dédiée).
- **Fix lint pré-existant** : imports dupliqués `settingsUtils` dans `_layout.tsx` et `reglages.tsx` combinés en un seul import.

### Prochaine étape

Onboarding guidé (priorité haute, supervision utilisateur requise pour les choix de design).

---

## Session 27 — 2026-06-10 — 4 bugs session corrigés (TDD)

### Réalisé

**Fix 🔴 Poids non répercuté après ExerciseStartingWeightPhase** : `setStartingWeightDone(true)` se déclenchait dans `setStartingWeight()` AVANT `refresh()` → RunningPhase s'ouvrait avec `set.weight = null`. Fix : `setStartingWeightDone(true)` retiré de `setStartingWeight`, nouvelle méthode `markStartingWeightDone()` exposée dans `UseSessionResult`, appelée dans `[workoutId].tsx` après `await refresh()`. Commit `3816a2b`.

**Fix 🔴 Timer RestPhase (CircularTimer) ne comptait pas** : `useEffect` dans `[workoutId].tsx` avait `timer` entier dans les deps. L'objet `timer` change de référence à chaque tick 500ms (state `remaining` + `isRunning`) → `reset + start` appelés en boucle → timer figé. Fix : destructurer les fonctions stables `const { reset: timerReset, start: timerStart } = timer` et les utiliser dans les deps. Nouveau fichier `useTimer.test.ts` avec 3 tests (countdown, stop at zero, stable refs). Commit timer-fix.

**Fix exercices étirement affichent timer au lieu de reps** : `isDuration = !isCardio && duration_seconds > 0` → cat cow, rotation thoracique avec `duration_seconds > 0` en DB déclenchaient l'UI countdown. Fix : `exercise.exercise.type !== 'etirement'` ajouté en tête de `isDuration`. Nouveau fichier `isDuration.test.ts` (4 tests). Commit `58abaab`.

**Suppression ancien chronomètre repos (timerContainer)** : bloc JSX `timerContainer` (grande horloge 52px "CHRONO — tap pour lancer") supprimé de la branche reps de `RunningPhase`. Prop `timer: UseTimerResult` retiré de `RunningPhaseProps`, import retiré, styles orphelins supprimés. `timer={timer}` retiré de `<RunningPhase>` dans `[workoutId].tsx` (conservé sur `<RestPhase>`). Commit `8c175d8`.

**TDD appliqué à la lettre** : plan écrit en premier (`docs/superpowers/plans/2026-06-10-session-bugs.md`), tests écrits avant implémentation pour chaque tâche, RED vérifié avant GREEN.

### Décisions techniques

- **markStartingWeightDone séparé de setStartingWeight** : sépare la responsabilité DB (setStartingWeight) du signal de navigation (markStartingWeightDone). Permet au caller de contrôler l'ordre exact.
- **Stable refs dans useEffect** : pattern à réutiliser partout — ne jamais mettre un objet avec état dans les deps d'un useEffect, toujours destructurer les fonctions stables.
- **isDuration guard etirement** : les exercices étirement peuvent avoir duration_seconds > 0 dans la DB (héritage de la programmation), mais l'UI doit toujours afficher reps. Guard explicite plus robuste qu'un nettoyage DB.

### Prochaine étape

Backlog terrain (voir `docs/backlog/` ou memory backlog) : CircularTimer interactif, description exercice en séance, wording "charge de départ", progression visuelle séries.

---

## Session 26 — 2026-06-10 — Bugs terrain + Backlog enrichi

### Réalisé

**Séance de test terrain** : utilisateur a testé l'appli en conditions réelles. Remontée d'environ 15 bugs/UX à noter.

**Fix 🔴 Tractions bodyweight — écran poids de départ incorrect** : `ExerciseStartingWeightPhase` se déclenchait pour les exercices `weight_type = 'bodyweight'`. Fix : `needsStartingWeight` retourne `false` si tous les sets du bloc Travail sont bodyweight. RunningPhase initialise le champ poids à `"0"` (lest additionnel) au lieu de `''`. Commit `5f8d471`.

**Fix 🔴 Bouton Confirmer bloqué (global)** : après `setStartingWeight`, `needsStartingWeight` ne repassait pas à `false` à cause d'un timing React — `refresh()` n'avait pas encore mis à jour `workoutDetails` avant le recalcul du useMemo. Fix : flag `startingWeightDone` dans `useSession`, mis à `true` immédiatement après `setStartingWeight()`. `needsStartingWeight` bail-out sur ce flag. Reset au changement d'exercice. Commits `3717334`.

**Backlog enrichi** : ~15 items ajoutés au backlog terrain.

### Décisions techniques

- **startingWeightDone flag** : contournement d'un timing React. Fix définitif livré en session 27.
- **isDuration pour étirements** : fix livré en session 27.
- **Ordre de fix prioritaire** : (1) poids non répercuté post-confirm, (2) timer RestPhase useEffect deps, (3) ancien chrono + isDuration étirements — tous livrés session 27.

---

## Session 25 — 2026-06-10 — Thème + Réglages + Unités

### Réalisé

**Feature complète** : système de réglages thème (Système/Clair/Sombre) + unités (Système/kg/lbs) avec persistance DB, contextes React, et affichage cohérent partout.

**Seeds fix** : edge case idempotence — `preserveWeight` ne prenait pas en compte le cas où l'utilisateur avait saisi un poids de départ mais n'avait pas encore loggé de série. Fix : `preserveWeight = (hasLogs?.count ?? 0) > 0 || existingSet.weight !== null`. Commit `a3cf3e5`.

**Repository layer** : `ISettingsRepository` + `InMemorySettingsRepository` + `SQLiteSettingsRepository` + contrat TDD (4 tests). Pattern identique aux autres repos. Commits `ea37a0a`, `8c58dc9`.

**Fonctions pures** : `resolveTheme`, `resolveUnits`, `convertWeight`, `lbsToKg` dans `app/services/settingsUtils.ts`. 17 tests. `resolveUnits` : US/LR/MM → lbs, tout le reste → kg. Commits `717f94a`, `ec78aa4`.

**Contextes React** : `ThemeContextProvider` + `UnitsContextProvider` dans `app/contexts/`. Props `initialPreference` + `repo`. `ThemeContext` : `preference`, `resolved`, `setTheme`. `UnitsContext` : `preference`, `resolved`, `setUnit`, `convert`, `label`. Commits `5e52639`, `bee51f7`.

**_layout.tsx** : chargement settings depuis DB via `Promise.all` après `initDatabase()`. `settingsRepo` singleton au niveau module. `RootLayoutNav` lit `ThemeContext` directement pour `ThemeProvider`. `useColorScheme` modifié pour lire `ThemeContext` (fallback OS). Commits `264a0f5`, `287c353`.

**useUnits hook** : `app/hooks/useUnits.ts` — throw si hors provider. Commit `8aabe84`.

**Écran Réglages** : `SegmentedControl<T>` générique réutilisable, 2 sections APPARENCE + UNITÉS, hints "Actuellement : X" quand préférence = 'system'. Commit `21a369e`.

**Touchpoints poids** : `RunningPhase` (cible, input label, restSets, `handleValidate` lbs→kg, `formatLastLog`), `SummaryPhase` (oldWeight/newWeight), `progression/[exerciseId]` (bestPR weight + 1RM, historique), `ExerciseHistorySection` (chips). Commits `446fad7`, `fbabd65`, `ec78aa4`.

304/304 tests passent.

### Décisions techniques

- **Stockage toujours en kg** : l'input poids en séance est affiché dans l'unité choisie, mais `weightDone` stocké en kg après conversion `lbsToKg()`. Jamais de données en lbs en DB.
- **Edge case unit-switch mid-session hors scope** : si l'utilisateur change d'unité pendant une séance active, le champ poids n'est pas reconverti. Acte délibéré — documenté dans la spec.
- **expo-localization** : installé via `npx expo install expo-localization` (SDK-compatible v17.0.9). Régions lbs : US, LR, MM.
- **`label === resolved` dans UnitsContext** : redondance connue, conservée pour clarté des call sites.

### PostToolUse hook créé (session précédente)

Hook `~/.claude/settings.json` qui s'active sur `git commit` : injecte un rappel de mettre à jour le backlog V2 dans le contexte du modèle. Opérationnel.

---

## Session 24 — 2026-06-09 — Templates de programmes

### Réalisé

**Feature complète** : bibliothèque de 5 programmes importables depuis l'onglet Programmes.

**Migration v7** (`db/schema.ts`) : `ALTER TABLE programs ADD COLUMN template_id TEXT`. `Program.template_id: string | null` dans `types.ts`. `CreateProgramDto` : `template_id?` optionnel (non breaking). SQLite + InMemory repos mis à jour. Commit `c11fa30`.

**Nouveaux exercices** (`db/seeds.ts`) : 12 exercices ajoutés — Soulevé de terre jambes tendues, Tirage poitrine, Skull crusher, Oiseau haltères, Élévations frontales, Écarté couché haltères, Tractions lestées, Curl biceps barre, Élévations latérales, Mollets debout, Curl marteau haltères, Extensions quadriceps. Commits `08aef0b` → `1e17169`.

**Templates** (`data/templates.ts`) : 5 définitions TypeScript — 5×5 Stronglifts, Full Body 3j, Upper/Lower 4j, Bro Split 5j, Arnold Split 6j. Types : `TemplateDefinition`, `WorkoutTemplate`, `ExerciseTemplate`. Helpers `s()` / `repeat()` / `work()`. Commit `b384b68`.

**TemplateService** (`services/TemplateService.ts`) : TDD, 7 tests. `importTemplate(template, name, ...repos): Promise<number>` + `isTemplateImported(programs, templateId): boolean`. Validation exercices avant insertion, structure workout → workoutExercise → block → set. Commit `4380a99`.

**UI** :
- `@gorhom/bottom-sheet` + `GestureHandlerRootView` dans `_layout.tsx`. Commit `e40119d`.
- `AddProgrammeBottomSheet` : 2 choix (créer vide / importer). Commit `ab3ba87`.
- `import-template.tsx` : liste templates sélectionnables, input nom personnalisable, warning si doublon, bouton Importer. A11y : radiogroup, opacity disabled. Commits `0faa40a`, `af95ca9`.
- `programmes.tsx` : FAB → BottomSheet. Commit `1172cf6`.

280/280 tests passent.

### Décisions techniques
- Templates = objets TypeScript purs (pas de DB), lookup par nom d'exercice au moment de l'import
- `template_id` nullable dans `programs` — NULL = programme perso, non-null = importé
- Doublon non bloquant — warning + suggestion de nommer différemment
- Programme importé inactif par défaut (`is_active: 0`)
- `isTemplateImported` pure function (pas async) — programmes déjà en mémoire via `usePrograms()`

### Problèmes rencontrés
- "Soulevé de terre" déjà dans seeds (BASE_EXERCISES) → doublon détecté par review, retiré
- 8 exercices manquants au moment de la review des templates (noms différents dans seeds) → ajoutés itérativement
- Ordre des tâches plan : Task 4 (templates defs) doit précéder Task 5 (TemplateService) pour éviter erreur tsc sur module manquant

### Prochaine étape
- Onboarding guidé (priorité haute backlog)

---

## Session 25 — 2026-06-10 — Contrôles séance + Cycle rotatif + ESLint

### Réalisé

**T1 — ESLint** : `eslint-config-expo` installé, `eslint.config.js` (flat config ESLint 9), script `lint` dans `package.json`, step Lint dans CI (après typecheck, avant test). 22 violations pré-existantes corrigées (imports dupliqués, HTML entities non-échappées, hooks patterns). Commit `841e2e6`.

**F2 — Annuler dernière série** :
- `deleteBySetAndSession(setId, sessionLogId): Promise<void>` ajouté à `ISetLogRepository`, `InMemorySetLogRepository`, `SQLiteSetLogRepository` + 3 contrats TDD. Commit `493a035`.
- `SessionService.deleteSetLog` wrapper. `HistoryEntry` interface, `positionHistory: useRef<HistoryEntry[]>`, `historySize: useState(0)`. `validateSet` pousse dans l'historique avant advance. `undoLastSet()` : peek-before-async pattern (pop uniquement si DELETE réussit), restaure position + phase `running`, décrémente `totalSetsLogged`. `canUndo = historySize > 0`. Commits `4033656`, `5773fb7`.
- `RunningPhase` : bouton ↩ `arrow-undo-outline` dans header (row layout), `disabled + opacity 0.3` si `!canUndo`, `accessibilityState={{ disabled: !canUndo }}`. Commit `ef43d75`.

**F1 — Passer l'exercice entier** :
- `skipExercise()` dans `useSession` : clear `positionHistory`, advance `exerciseIdx+1 % length`, `exercise_transition` ou `summary` si dernier. Commit `45020d7`.
- `RunningPhase` : bouton "Passer l'exercice →" + `@gorhom/bottom-sheet` local (ref `skipExerciseSheetRef`, 30%, backdrop sans double-close). BottomSheet : nom exercice, "Passer toutes les séries restantes ?", bouton destructif rouge + Annuler. Commit `2a35927`.
- `[workoutId].tsx` : props `onSkipExercise`, `onUndo`, `canUndo` câblés. `Date.now()` déplacé de JSX vers `useEffect` + `summaryDurationSeconds` state. Commit inclus dans `2a35927`.

**U10 — Cycle rotatif** :
- `getLastCompletedWorkoutId(workoutIds): Promise<number | null>` dans `SQLiteSessionLogRepository` : `WHERE ended_at IS NOT NULL ORDER BY ended_at DESC LIMIT 1`. Commit `5dd3504`.
- `WorkoutCard` : prop `isNext?: boolean`, badge pill "→ Prochain" (`colors.primary`, fontSize 11), `accessibilityLabel` inclut "prochaine séance" si `isNext`. Commit `dafa2e2`.
- `programme/[id].tsx` : `nextWorkoutId` state, `useEffect([workouts])` avec cancel guard, modulo `(lastIdx + 1) % workouts.length`, fallback `workouts[0]` si aucun historique ou workout supprimé. Commits `dafa2e2`, `bf2f07c`.

283/283 tests passent.

### Décisions techniques
- Undo : DELETE au lieu d'UPSERT — log propre supprimé, re-validate = INSERT normal
- Peek-before-async pour `undoLastSet` : on ne pop qu'après succès DB, élimine tout besoin de rollback
- `positionHistory` = `useRef` (mutation synchrone, pas de re-render) + `historySize` = `useState` (réactivité pour `canUndo`)
- `skipExercise` clear positionHistory — pas d'undo cross-exercise boundary
- Cycle rotatif = badge sur écran programme (pas widget home), `ended_at IS NOT NULL` = séances complètes seulement
- ESLint flat config (SDK 54 + ESLint 9 imposent le format)

### Problèmes rencontrés
- Implémentation initiale `undoLastSet` : pop avant async → bug TOCTOU → corrigé peek pattern
- `eslint-disable-next-line react-hooks/purity` : règle inexistante, commentaire supprimé
- Backdrop BottomSheet : double-close Android supprimé (retrait `onPress` sur `BottomSheetBackdrop`)
- Cancel guards manquants sur `useEffect` async dans `programme/[id].tsx` → ajoutés

### Prochaine étape
- Onboarding guidé (priorité haute backlog)

---

## Session 23 — 2026-06-09 — Weight ratio back-off

### Réalisé

**Migration v6** (`db/schema.ts`) : `ALTER TABLE sets ADD COLUMN weight_ratio REAL`. Commit `797eae8`.

**Seeds + types** (`db/seeds.ts`, `ISetRepository.ts`, `InMemorySetRepository.ts`) :
- `SetSpec` et `f()` helper acceptent `weight_ratio?: number | null`
- Seul Back-off PPL : "Développé couché barre" → `f(12, 15, 60, null, 0.8)`
- INSERT et UPDATE SQL mis à jour
- `CreateSetDto` : `weight_ratio` optionnel (pas breaking pour les callers existants)
- Commit `9887dfe`

**`resolveWeights` pure function** (`services/weightRatio.ts`) : TDD, 6 tests.
- Trouve le poids du bloc "Travail" (premier set), applique `Math.round(travailWeight × ratio / 2) × 2`
- Si Travail null → pas de résolution. Si `weight` déjà défini → pas d'écrasement.
- Commit `58007dc`

**Câblage** (`app/session/[workoutId].tsx`) : `useMemo(() => exercises.map(resolveWeights), [exercises])` avant `useSession`. Commit `2d1549b`.

273/273 tests passent.

### Décisions techniques
- Résolution en mémoire uniquement — DB jamais modifiée à la résolution
- `weight_ratio` optionnel dans `CreateSetDto` → zéro changement dans WorkoutExerciseService
- Un seul Back-off seedé (Développé couché barre) — les autres composés sans Back-off n'ont pas ce bloc

### Prochaine étape
- Templates de programmes (bibliothèque PPL/Full Body/Upper-Lower importable)
- Puis onboarding guidé (priorité haute backlog)

---

## Session 22 — 2026-06-09 — Timer circulaire SVG

### Réalisé

**CircularTimer** (`app/components/ui/CircularTimer.tsx`) :
- Arc SVG via `stroke-dasharray`/`stroke-dashoffset`, rotation -90°, `strokeLinecap="round"`
- Couleur arc : vert >60%, orange 30–60%, rouge <30%, vert à 0 (terminé)
- `formatTime` avec guard `Math.max(0, Math.round(...))` contre valeurs négatives/décimales
- Label proportionnel au `size` (`size * 0.07`)
- Accessibilité : `accessibilityElementsHidden` + `importantForAccessibility="no"` (parent fournit le label)
- Commits `c1f4c2b` → `27274af`

**RestPhase** (`app/components/session/RestPhase.tsx`) :
- Supprimé : grand nombre 72px (`timerText`), barre horizontale (`progressTrack`/`progressFill`), `formatTime` local
- Ajouté : `CircularTimer` size=200, `label` dynamique ("REPOS" / "C'EST PARTI")
- Accessibilité : View wrapper avec `accessibilityLabel` en secondes
- Commit `9535dbb`

**RunningPhase** (`app/components/session/RunningPhase.tsx`) :
- Remplacé `timerContainer` dans le mode durée par `CircularTimer` size=160
- Préservé : `formatTime`, `timerContainer`/`timerText`/`timerLabel` styles (utilisés par mode CHRONO/reps)
- Commit `59864c7`

### Décisions techniques
- `progress <= 0` dans `arcColor` est intentionnel (état "terminé" distinct du vert >60%) — pas du dead code
- `?? 1` fallback sur `set.duration_seconds` dans RunningPhase : défensif mais spec-requis, `isDuration` garantit >0
- Commentaires inline retirés (convention projet : pas de commentaires évidents)
- 267/267 tests passent

### Prochaine étape
- `weight_ratio` back-off (algorithme suggestion séance)
- Puis templates de programmes, puis onboarding

---

## Session 21 — 2026-06-09 — CI + backlog audit

### Réalisé

**Backlog audit** : 3 items signalés critiques étaient déjà implémentés dans les sessions précédentes :
- Timer reset entre exercices → déjà fixé par `key={session.currentSet.id}` dans `[workoutId].tsx`
- Inputs non effacées après validation → même fix
- Seeds écrasant les poids → déjà protégé lignes 748-775 de `seeds.ts` (`COUNT(*) set_logs` avant UPDATE)
- "Tout réussi" / inputs pré-remplis → déjà implémenté

**CI GitHub Actions** (`.github/workflows/ci.yml`) :
- Push sur `main` → typecheck + Jest (267 tests) sur `ubuntu-latest` Node 20
- Pas de cache, pas de PR trigger — projet solo, overhead non justifié
- Commit `62f0172`

### Décisions techniques
- CI minimal (option A) — un seul job, pas de cache, trigger push main uniquement
- `working-directory: app` dans chaque step (le code est dans le sous-dossier `app/`)

### Prochaine étape
- Timer circulaire SVG (RestPhase + mode durée) — react-native-svg déjà installé
- Puis `weight_ratio` back-off, puis templates

---

## Session 20 — 2026-06-09 — Cycle rotatif : home screen chips + MCP config

### Réalisé

**Cycle rotatif — carte home interactive** : remplace la carte statique "PROCHAINE SÉANCE" par une carte avec chips de sélection par workout.

- **`findLatestDatesPerWorkout`** (`ISessionLogRepository`, `InMemorySessionLogRepository`, `SQLiteSessionLogRepository`, `sessionLogRepository.contract.ts`) : nouvelle méthode `SELECT workout_id, MAX(started_at) GROUP BY workout_id`. 4 tests contrat. Type SQLite corrigé `string | null` pour `MAX()` nullable.
- **`useHomeWorkout`** (`hooks/useHomeWorkout.ts` + `useHomeWorkout.test.ts`) : hook encapsulant chargement programme actif + workouts triés + suggestion `getNextWorkout` + `lastDates`. `selectWorkout(w)` local sans persistance. Guard race condition via `refreshIdRef` (latest-wins). 6 tests `@testing-library/react-native` (loading, no program, sorted workouts, selectWorkout, lastDates, error path).
- **`(tabs)/index.tsx`** : réécriture complète. Chips horizontal ScrollView, label "PROCHAINE SÉANCE" / "SÉANCE CHOISIE", `formatRelativeDate` (calendar midnight diff), `useFocusEffect` dans l'écran. A11y : `accessibilityRole="radio"` + `accessibilityState.selected` sur chips, `minHeight: 44`, icônes décoratives masquées, titre `accessibilityRole="header"`.
- **`PressableA11y`** : `style` élargi à `StyleProp<ViewStyle>`, `accessibilityRole` prop explicite.

### Décisions techniques
- `useFocusEffect` dans l'écran (pas dans le hook) — cohérent avec tous les autres onglets.
- Pas de persistance de la sélection manuelle : retour à la suggestion du cycle au focus-out. Intentionnel.
- `borderStyle: 'dashed'` non utilisé — Android unreliable. Chip suggérée non sélectionnée : `borderColor: colors.primary + opacity: 0.7`.
- `accessibilityRole="radiogroup"` invalide en RN (web ARIA only) — supprimé. Chips avec `radio` + `selected` suffisent.
- `refreshIdRef` pattern (latest-wins token) vs `cancelled` flag — plus robuste sur appels concurrents.
- `formatRelativeDate` : midnight calendar comparison (`setHours(0,0,0,0)`) vs elapsed ms — évite "Aujourd'hui" pour séance d'hier à 23h.

### Fin de session précédente (Session 19 suite)
- **Task #26** : fix timer durée auto-start + affichage `lastSetLog` dans RunningPhase. Commit `2c98e5d`.

### MCP config
- `caveman-shrink` standalone supprimé (manquait upstream arg).
- Ajout `github` MCP (caveman-shrink → @modelcontextprotocol/server-github).
- Ajout `sqlite` MCP (caveman-shrink → @modelcontextprotocol/server-sqlite → `dev.db`).

### Process
- Subagent-driven development : 3 tâches, spec review + code quality review par tâche + final review.
- 267/267 tests, typecheck clean, pushé sur `main`.

### Prochaine étape
- Tester en conditions réelles : vérifier chips, dates, suggestion cycle après vraies séances
- Vérifier sur Android : `opacity: 0.7` chip suggérée lisible

---

## Session 19 — 2026-06-09 — Bloc B UX Pipeline : RestPhase + ExerciseTransitionPhase + descriptions

### Réalisé

**Pipeline séance explicite** : `checkin → exercise_transition → running → rest → summary`

- **Migration v5** (`db/schema.ts`) : `ALTER TABLE exercises ADD COLUMN description TEXT` — version DB passe à 6.
- **Types** (`db/types.ts`, `services/WorkoutExerciseService.ts`) : `description: string | null` exposé dans `Exercise` et `WorkoutExerciseDetail`.
- **Seeds — 44 descriptions** (`db/seeds.ts`) : 36 EXTRA_EXERCISES upsert avec description + 8 BASE_EXERCISES patchés par nom. Descriptions françaises détaillées pour tous les exercices PPL (technique, points clés).
- **computeNextLabel** (`hooks/useSession.ts`) : helper pur exporté, testé TDD. Retourne `"Exercice suivant : <nom>"` si changement d'exercice, sinon `"Série N/T — Xkg"`.
- **useSession — nouvelles phases** (`hooks/useSession.ts`) : `SessionPhase` étendu à 5 valeurs. `startSession` → `exercise_transition`. `validateSet` capture `restDuration` avant avance position, calcule `pendingPhase` et `nextLabel`, passe en `rest`. `confirmRest` → `pendingPhase`. `confirmTransition` → `running`.
- **RestPhase** (`components/session/RestPhase.tsx`) : timer + barre de progression, bouton "Passer →" / "C'est parti →" (fond vert à zéro), vibration à expiration. Pas d'auto-avance.
- **ExerciseTransitionPhase** (`components/session/ExerciseTransitionPhase.tsx`) : bande couleur 4px type exercice, nom exercice 28px, résumé bloc Travail, description si disponible, bouton "C'est parti →".
- **Session screen** (`app/session/[workoutId].tsx`) : `useEffect` phase-based pour timer rest, rendu des 5 phases, suppression ancien `useRef`/`useEffect` position-based.

### Décisions techniques
- `restDuration` capturé avant `setPosition(next)` dans `validateSet` — évite lecture du mauvais set après avance.
- `pendingPhase: 'running' | 'exercise_transition'` — routage réactif dans `confirmRest`, sans logic conditionnelle dans le composant.
- `isDone` dans RestPhase : `remaining === 0 && !isRunning` — distingue timer fini de timer non démarré.
- `skipSet` inchangé — bypass direct sans passer par rest ni exercise_transition (intentionnel, urgence).
- Couleurs type hardcodées `#16a34a` / `#ea580c` — pattern établi dans WorkoutExerciseCard, pas de nouveau token Colors.

### Process
- Brainstorm Session 18 Phase 2 → spec (`docs/superpowers/specs/2026-06-09-bloc-b-ux-pipeline.md`) → plan (`docs/superpowers/plans/2026-06-09-bloc-b-ux-pipeline.md`) → subagent-driven development (8 tâches, spec review + code quality review par tâche).
- 249/250 tests — 1 échec `ProgramService.test.ts` (is_active) pré-existant, non lié au Bloc B.

### Prochaine étape
- Tester en conditions réelles (séances Push + Pull + Legs cette semaine)
- Vérifier le flow complet : checkin → transition → série → repos → transition → ...
- Vérifier descriptions exercices à l'écran (ScrollView, lisibilité)

---

## Session 18 — 2026-06-09 — Double progression + seeds idempotentes + bugs critiques

### Réalisé

**Bloc A — Bugs critiques**
- **Seeds idempotentes** (`db/seeds.ts`) : remplace DELETE+INSERT par upsert-by-name à chaque niveau (program → workout → workout_exercise → block → set). Si un set a des `set_logs` → poids préservé. Plus jamais de perte de progression au redémarrage.
- **Timer reset entre exercices** (`session/[workoutId].tsx`) : `key={session.currentSet.id}` sur `<RunningPhase>` → remount forcé à chaque nouvelle série → timer et inputs repartent à zéro.
- **Pre-fill inputs + suppression "Tout réussi"** (`RunningPhase.tsx`) : weight init `''` au lieu de `'0'`, placeholder "Poids de départ" si weight null, `handleToutReussi` supprimé, seul bouton "Valider" reste.

**Bloc C — Système de progression**
- **Double progression** (`progression.ts`) : 4 nouvelles fonctions pures testées TDD — `applyProgression` (+2.5% arrondi 2kg sup), `applyDeload` (-10% arrondi 2kg inf), `isSessionFullSuccess`, `isSessionSignificantFailure`.
- **Algorithme SessionService** (`SessionService.ts`) : `calculateProgressions` remplacé — succès complet → progression immédiate, 2 échecs significatifs consécutifs → déload, manque d'1 rep → hold.
- **setStartingWeight** (`SessionService.ts`) : met à jour tous les sets du bloc "Travail" d'un exercice avec le poids de départ.
- **ExerciseStartingWeightPhase** (nouveau composant) : s'intercale avant le premier set Travail si tous les poids sont null — demande le poids de départ, confirme, reload les exercises.
- **PPL reps fixes** (`db/seeds.ts`) : Développé couché, Tractions, Rowing barre, Squat barre → cibles fixes à 8 reps (place à reps 4-6/6-8).

### Décisions techniques
- Double progression : progression dès le premier succès complet (pas de seuil N sessions). Déload après 2 échecs significatifs consécutifs (manque ≥ 2 reps sur au moins 1 set).
- Formules arrondies au 2kg : `Math.ceil(w * 1.025 / 2) * 2` et `Math.floor(w * 0.9 / 2) * 2`.
- Seeds : clé upsert par niveau — exercice=name, workout=(program_id+name), block=(we_id+name), set=(block_id+order_index).
- ExerciseStartingWeightPhase ne touche que les blocs `name='Travail'` (pas Back-off ni Échauffement).
- `SetResult` type exporté depuis `progression.ts` — partagé entre progression.ts et SessionService.

### Process
- Brainstorm → spec (`docs/superpowers/specs/2026-06-09-progression-system-design.md`) → plan (`docs/superpowers/plans/2026-06-09-progression-system.md`) → subagent-driven development (7 tâches, spec review + code quality review par tâche).

### Prochaine étape
- Tester en conditions réelles (séances Push + Pull + Legs cette semaine)
- Vérifier le flow ExerciseStartingWeightPhase au premier exercice
- Bloc B (reporté) : ExerciseTransitionPhase, RestPhase redesign, ExerciseTransitionPhase

---

## Session 17 — 2026-05-31 — Programme PPL complet + mode durée + cardio

### Réalisé
- **Migration v3** : `sets.duration_seconds INTEGER` — mode durée sur les séries
- **Migration v4** : `set_logs.duration_seconds` + `set_logs.distance_meters` — log cardio
- **types.ts** : `Set.duration_seconds: number | null` + `SetLog.duration_seconds/distance_meters`
- **Repository layer** : `CreateSetDto.duration_seconds` + `CreateSetLogDto` optionnels, normalisés dans InMemory + SQLite
- **SetActual** : + `durationSeconds?` + `distanceMeters?` propagés dans `SessionService.logSet()`
- **Seeds PPL complet** : programme 6 séances auto-rechargé à chaque démarrage (guard supprimé)
  - Push, Pull, Legs, Bonus — blocs Mobilité + Travail + Étirements
  - Footing Mardi (récupération) + Footing Jeudi (mobilité) — étirements post-course
  - Exercice `Footing` (type: 'cardio') en tête de chaque séance footing
  - Helpers `mob(seconds)`, `mobilityBlock()`, `stretchBlock()`, `workBlock()`
- **RunningPhase** : 3 modes selon contexte
  - `isCardio` (`exercise.type === 'cardio'`) → inputs durée (min) + distance (km), bouton orange
  - `isDuration` (`duration_seconds > 0`) → décompte auto, vert + vibre à 0, "C'est fait"
  - Reps (défaut) → inputs reps/poids/RPE existants
- **WorkoutExerciseCard** : bande 3px couleur à gauche selon `exercise.type`
  - Bleu = musculation, vert = étirement, orange = cardio
- **WorkoutExerciseService** : `exercise.type` exposé dans `WorkoutExerciseDetail`

### Décisions techniques
- `duration_seconds` colonne DB (pas hack `reps=secondes`) — sémantique correcte, évolutive
- Mode cardio prioritaire sur mode durée dans le ternaire RunningPhase
- Footing comme 2 séances PPL (pas programme séparé) — programme semaine cohérent en un bloc
- Seeds toujours re-seedent : pas de guard early-return, programme recréé à chaque lancement
- Vibration `[0,300,100,300]` : double pulse pour fin durée

### Prochaine étape
- Test réel sur une semaine — séances Push/Pull/Legs + footings + étirements
- Remonter bugs → session V2

---

## Session 16 — 2026-05-30 — Audit workflow + fixes MVP + UX

### Réalisé
- **Audit workflow Claude** : plans superpowers archivés supprimés (10 fichiers), pre-commit hook tsc ajouté (`.githooks/pre-commit`), task #14 stale supprimée, règle scope creep ajoutée en mémoire + CLAUDE.md
- **Audit MVP technique** : 3 fixes livrés en v1.1.0
  - `modal.tsx` + `EditScreenInfo` (artefacts template) supprimés
  - `JSON.parse` muscle_groups protégé dans try/catch (2 fichiers)
  - `TouchableOpacity` → `PressableA11y` sur 8 fichiers restants
- **Audit UX utilisateur** : 5 corrections livrées en v1.1.1
  - Home : CTA "Configurer une séance →" quand programme actif sans séances
  - `workout/[id]` : bouton "Démarrer" masqué si liste exercices vide
  - RunningPhase : opacité 0.4 sur champ Poids non éditable (bodyweight/barre)
  - `+not-found.tsx` : francisé + `Themed.tsx` / `StyledText.tsx` supprimés
  - `progression.tsx` : `Pressable` → `PressableA11y` sur segmented control
- **CHANGELOG.md** + script `scripts/version-bump.sh` ajoutés
- Versioning : v1.0.0 → v1.1.0 → v1.1.1

### Décisions techniques
- Hook pre-commit commité dans `.githooks/` — activation manuelle `git config core.hooksPath .githooks`
- Bump version = décision humaine via script, proposé proactivement en fin de session
- `Themed.tsx`/`StyledText.tsx` : artefacts template Expo, supprimés proprement après vérification 0 usage

### Prochaine étape
- Semaine de test réel (v1.1.1)
- Remonter bugs → session V2

---

## Session 15 — 2026-05-30 — Backlog UX post-tests

### Réalisé
- **Auto-activation premier programme** : `ProgramService.create()` crée avec `is_active=1` si aucun programme actif — fini la friction manuelle au premier lancement
- **Pre-fill nom exercice** : `add-exercise.tsx` lit `initialName` depuis les params Expo Router ; `add-workout-exercise.tsx` passe le `search` en param à `/add-exercise`
- **Timer background** : `useTimer` remplacé par timestamp absolu `endTime` + `AppState` listener pour recalculer au retour foreground + vibration `[0,400,150,400]` à la fin
- **Check-in redesign** : emojis remplacés par segmented control texte pur — cohérent avec design monochrome de l'app
- **Flèches séries supprimées** : `BlockCard` n'a plus ↑↓ par série — delete+recréer suffisant. Séparateur hairline entre blocs ajouté
- Plans docs archivés : `2026-05-28-set-block-editing.md`, `2026-05-29-conduite-seance.md`

### Statut MVP
MVP déclaré complet. Tous les bugs bloquants résolus, aucun code manquant. Les `[ ]` restants dans `parcours-test-utilisateur.md` sont des vérifications manuelles nécessitant des données réelles (progressions, historique, stats) — pas du code à écrire.

### Backlog V2
- Hiérarchie infos RunningPhase
- Type de séance running/stretching (DB schema change nécessaire)
- Drag & drop réordonnancement (replace ↑↓)
- Feedback couleur timer pendant le décompte
- Long-press affordance visuelle sur les cartes

### Prochaine étape
- Semaine de test réelle — utilisation quotidienne sur de vraies séances
- Remonter les bugs trouvés → session V2

---

## Session 14 — 2026-05-30 — Tests manuels + correctifs bugs

### Réalisé
- Tests manuels complets sur device (parcours 7 parties documenté dans `docs/parcours-test-utilisateur.md`)
- **B1** : résumé absent après dernière série — `calculateProgressions` isolé dans try/catch imbriqué dans `useSession.ts` → `setPhase('summary')` garanti après `completeSession`
- **B3** : toggle se fermait à l'ajout de série — `workout/[id].tsx` affiche spinner uniquement si `loading && exercises.length === 0`, plus de démontage de la FlatList au refresh
- **B4** : compteur "0 exercice" hardcodé dans `WorkoutCard` — requête réelle via `SQLiteWorkoutExerciseRepository.findByWorkoutId` dans `programme/[id].tsx`
- **B5** : liste exercices périmée après création — `useFocusEffect` + `refresh` dans `add-workout-exercise.tsx`
- **RPE** : label rendu explicite "RPE (1–10)" + sous-titre "Effort perçu — optionnel"

### Décisions techniques
- Spinner initial seulement : `loading && exercises.length === 0` plutôt que split `isFirstLoad` ref dans le hook — plus simple, même résultat
- `calculateProgressions` défaillant ne bloque plus la phase summary : progressions vides préférables à résumé absent
- Compteur exercices chargé côté écran (useEffect dans `programme/[id].tsx`) sur le même pattern que `workoutCounts` dans `programmes.tsx`

### Bugs restants / backlog UX
- Session running : 0 exercice affiché (lié à données de test vides — à vérifier avec vraie séance)
- Timer s'arrête en background (OS suspend le JS thread) — V2
- Vibration/son fin de timer — V2
- Auto-activation premier programme — V2
- Hiérarchie infos RunningPhase — V2
- Smileys check-in plus stylisés — V2

### Prochaine étape
- Test séance complète sur device (vérifier B1 résolu, résumé visible)
- Semaine d'utilisation réelle pour identifier autres bugs

---

## Session 13 — 2026-05-29 — Config séance UX

### Réalisé
- Badge TRAVAIL/REPOS sur les blocs (BlockCard.tsx)
- Hint "Ajoute des blocs..." si 1 seul bloc (WorkoutExerciseCard.tsx)
- Chips suggestions Échauffement/Travail/Back-off dans EditBlockModal (création uniquement)
- Bouton "Créer un exercice" sur liste vide dans add-workout-exercise.tsx

### Prochaine étape
- Tests manuels complets sur device (tests-manuels-mvp.md)
- Déload automatique (V2 ou prioritaire selon retour tests)

---

## Session 12 — 2026-05-29 — Refonte visuelle Trace

### Réalisé
- Design tokens : Colors.ts réécriture (anthracite/blanc monochrome), Radius.ts (Sharp sm=4px), Typography.ts (Inter fontFamily)
- Font Inter chargée via @expo-google-fonts/inter (_layout.tsx + Themed.tsx Text wrapper)
- app.json : name "Trace", splash backgroundColor #0D0D0D, android adaptiveIcon #0D0D0D
- Migration borderRadius → Radius tokens : ~47 occurrences dans 22 fichiers
  - 4 FABs (exercices, programmes, programme/[id], workout/[id]) → Radius.full
  - 1 chip pill (EditBlockModal) → Radius.full
  - Tout le reste → Radius.sm (4px)

### Décisions techniques
- Inter via @expo-google-fonts/inter (package officiel Expo) — pas de chargement local
- fontFamily explicite dans Typography.ts (fontWeight ignoré par React Native sur polices custom)
- Overrides sémantiques (#22C55E, #EF4444, #BFDBFE, #1E40AF) maintenus hardcodés (convention projet)
- EditScreenInfo.tsx (boilerplate non utilisé) laissé tel quel

### Prochaine étape
- Tester visuellement sur device/simulateur
- Capturer screenshots pour le manager

---

## Session 1 — 2026-05-22 · Specs & initialisation

### Ce qui a été demandé
Partir de rien : rédiger les specs d'une app React Native de suivi d'entraînement musculaire pour remplacer un carnet papier.

### Décisions prises
- **Périmètre MVP** : séance guidée + suivi des poids + progression automatique. Pas d'agenda, pas de cloud pour la v1.
- **Structure des exercices** : blocs libres nommés (pas de structure imposée Échauffement/Travail/Back-off). Chaque bloc contient des séries configurables.
- **Progression automatique** : +2kg par défaut si objectif atteint. Seuil configurable (1/2/3 séances).
- **Stockage** : SQLite local via expo-sqlite. Pas de backend MVP. Export JSON comme filet de sécurité.
- **Navigation** : Expo Router (file-based).
- **Supersets** : repoussés en V2 (complexité du flow de séance).

### Features retenues MVP
- Bibliothèque d'exercices (base prédéfinie + custom)
- Programmes avec blocs libres
- Séance guidée : chrono de pause, saisie des reps, raccourci "tout réussi"
- Plate calculator affiché pendant la séance
- RPE (1–10) par série
- Check-in avant séance (forme/fatigue/sommeil)
- Progression automatique des poids
- Déload automatique suggéré
- Historique des séances
- Page Progression : 1RM estimé (Epley), PRs, volume, corrélation RPE

### Features V2
- Agenda interne + sync Google Calendar + notifs push
- Supersets
- Footing (log simple)
- Étirements (différenciation visuelle)
- Cloud sync + compte utilisateur
- Widget écran d'accueil

### Stack décidée
- React Native + Expo SDK 53
- Expo Router
- TypeScript strict
- SQLite (expo-sqlite)
- VitePress pour la documentation

### Ce qui a été fait
- `docs/specs.md` rédigé complet
- Projet Expo initialisé (`app/`) avec TypeScript + tabs template
- Documentation VitePress configurée (`docs/`)
- `CLAUDE.md` écrit avec contexte projet, conventions, commandes
- Permissions Claude Code configurées (npm, npx, git…)
- Hook TypeScript post-edit configuré
- `.claudeignore` créé
- Auto-compact activé
- Mis sur GitHub : https://github.com/smaurier/training

---

## Session 2 — 2026-05-22 · Architecture SQLite

### Ce qui a été demandé
Concevoir et implémenter la couche base de données.

### Décisions prises
- **10 tables** : exercises, programs, workouts, workout_exercises, blocks, sets, session_logs, set_logs, personal_records, settings
- **Migrations** via `PRAGMA user_version` — ajouter une migration = ajouter une entrée dans le tableau `MIGRATIONS`
- **Poids cible** stocké dans `sets.weight`, écrasé après progression (l'historique réel est dans `set_logs`)
- **Flag `is_work_block`** sur `blocks` pour identifier les blocs qui comptent pour la progression
- **Seeds** : 17 exercices prédéfinis (musculation classique)

### Ce qui a été fait
- `db/types.ts` — interfaces TypeScript pour les 10 tables
- `db/schema.ts` — SQL versionné
- `db/migrations.ts` — runner automatique
- `db/seeds.ts` — 17 exercices prédéfinis
- `db/index.ts` — singleton `getDb()` + `initDatabase()`
- `_layout.tsx` — splash screen maintenu jusqu'à DB prête
- `docs/architecture.md` mis à jour

---

## Session 3 — 2026-05-24 · Outillage & configuration IA

### Ce qui a été demandé
Optimiser l'environnement de travail avec Claude Code : token management, outils IA, plugins.

### Décisions prises
- **Caveman** : installé mais non activé. À activer via `/caveman` sur les sessions de coding pur pour économiser ~65% de tokens de sortie.
- **Context7** : installé comme MCP server HTTP (`https://mcp.context7.com/mcp`). Utilisé automatiquement par Claude sur les libs qui changent souvent (Expo, React Native, expo-sqlite). À déclencher via `use context7` dans les prompts.
- **Superpowers** : installé (`superpowers@claude-plugins-official`). Skills disponibles : `/brainstorming`, `/execute-plan`, revue de code intégrée. Utilisés de façon autonome par Claude selon le contexte.
- **Journal de projet** : ce fichier. Mis à jour automatiquement en fin de chaque session via hook Stop.

### Ce qui a été fait
- `.claudeignore` créé (node_modules, lock files, assets binaires, build artifacts)
- `autoCompactEnabled: true` dans `.claude/settings.json`
- Caveman installé (plugin + hooks + MCP shrink)
- Context7 ajouté comme MCP server HTTP
- Superpowers installé depuis le marketplace officiel Anthropic
- Hook Stop configuré pour rappel journal
- Ce journal créé

### Discussions notables
- **Conseil IA à 5 personnalités** (concept du collègue) : utile comme outil de structuration de réflexion, mais la diversité cognitive est limitée car les LLMs partagent largement les mêmes données d'entraînement — même avec plusieurs modèles différents.

---

## Session 4 — 2026-05-24 · TDD + Repository pattern

### Ce qui a été demandé
- Explication des différents types de tests (TU, TI, composants, E2E)
- Implémentation du pattern Repository avec TDD
- Approche pédagogique renforcée : explication avant/pendant/après chaque étape

### Décisions prises
- **Repository pattern** avant tout service CRUD — découple la logique métier de SQLite, permet les tests sans DB
- **Contract tests** (`exerciseRepository.contract.ts`) — les tests sont écrits contre l'interface `IExerciseRepository`, pas une implémentation. Même suite de tests utilisable pour InMemory ET SQLite.
- **Injection de dépendance** — `SQLiteExerciseRepository` reçoit `SQLiteDatabase` en constructeur (pas de `getDb()` hardcodé)
- **CreateExerciseDto = Omit<Exercise, 'id' | 'created_at'>** — DRY, dérivé du type existant

### Ce qui a été fait
- `repositories/IExerciseRepository.ts` — interface contrat
- `repositories/InMemoryExerciseRepository.ts` — implémentation mémoire (tests rapides, zéro DB)
- `repositories/SQLiteExerciseRepository.ts` — implémentation réelle pour l'app
- `repositories/exerciseRepository.contract.ts` — suite de tests partagée (11 cas)
- `repositories/InMemoryExerciseRepository.test.ts` — branche InMemory, 11 tests GREEN
- `services/ExerciseService.test.ts` — tests RED écrits (service pas encore implémenté)
- `tsconfig.json` — ajout `"types": ["jest"]` pour résoudre les erreurs tsc sur les globals Jest

### Où on en est
- Cycle RED → GREEN → REFACTOR du Repository terminé (11 tests GREEN)
- `ExerciseService.test.ts` écrit et en RED — prochain GREEN à faire
- L'approche pédagogique renforcée a été demandée : expliquer le POURQUOI avant/pendant/après, adapter au niveau frontend (React/JS fort, backend/BDD/Craft à apprendre)

### Leçons Code Craft de la session
- **SRP** : chaque couche a une responsabilité (Repository = données, Service = métier, Composant = UI)
- **DRY sur les tests** : contract tests évitent la duplication quand plusieurs implémentations existent
- **YAGNI** : on n'anticipe pas les règles métier qui n'existent pas encore

## Prochaine session (après session 4)
1. Écrire `ExerciseService.ts` (GREEN sur les 9 tests RED existants)
2. Expliquer : validation, SRP, pourquoi le service ne fait pas du SQL
3. Réfléchir à la couche "useExercise" hook React pour connecter service → composant
4. Premiers écrans (liste d'exercices)

---

## Session 5 — 2026-05-26 · ExerciseService + useExercises hook + écran liste

### Ce qui a été demandé
- Reprendre où on en était (session 4 : ExerciseService en RED)
- Migrer les fichiers mémoire vers le bon chemin projet
- Implémenter ExerciseService.ts (GREEN)
- Brainstormer et implémenter le hook useExercises + écran liste exercices

### Décisions prises
- **ExerciseService** : `CreateExerciseInput` distinct de `CreateExerciseDto` — le service parle domaine (`muscle_groups: string[]`), le repo parle stockage (JSON string). Frontière de couche explicite.
- **Hook `useExercises`** : Option B (pas de test unitaire, logique déjà testée dans le service). `getDb()` singleton plutôt que `useSQLiteContext`.
- **Unmount guard** dans `refresh` via `mountedRef` — évite setState sur composant démonté.
- **create** catch + re-throw — erreurs surfacées dans `error` state ET propagées au caller.
- **`isFirstFocus` ref** dans `exercices.tsx` — évite double-fetch au premier mount (hook + useFocusEffect).
- **Modal `add-exercise`** : `setSubmitting(false)` uniquement dans `catch` (pas `finally`) — évite setState après unmount via `router.back()`.
- **Suppression exercices** : repoussée en V2 (dépendances à vérifier).

### Ce qui a été fait
- `app/services/ExerciseService.ts` — 9 tests GREEN (+ 22 existants = 31 total)
- `app/hooks/useExercises.ts` — hook complet avec mountedRef + create error surfacing
- `app/components/exercises/ExerciseCard.tsx` — carte exercice thémée
- `app/app/(tabs)/exercices.tsx` — écran liste avec FlatList + FAB + useFocusEffect
- `app/app/add-exercise.tsx` — modal formulaire (name, type, muscle_groups, progression_step)
- `app/app/(tabs)/_layout.tsx` — onglet Exercices (fitness-outline)
- `app/app/_layout.tsx` — Stack.Screen add-exercise (modal)
- Spec + plan sauvegardés dans `docs/superpowers/`
- Poussé sur GitHub

### Leçons Code Craft de la session
- **Frontière de couche** : UI parle `string[]`, service convertit en JSON, repo stocke. Chaque couche a son vocabulaire.
- **YAGNI** : pas de test unitaire pour le hook (logique métier déjà couverte), pas de suppression avant V2
- **Unmount guard** : pattern `mountedRef` pour tout hook avec async + state
- **`finally` vs `catch`** : si le happy path démonte le composant, ne pas mettre setState en `finally`

## Prochaine session
1. Tester l'app manuellement (npm start) — vérifier onglet Exercices, liste seeds, ajout via modal
2. V2 exercices : suppression avec vérification dépendances
3. Écran Programmes — même pattern Repository + Service + hook + écran

---

## Session 6 — 2026-05-27/28 · SDK upgrade + Programmes CRUD

### Ce qui a été demandé
- Reprendre le downgrade SDK (session précédente partielle) + tester sur Expo Go
- Implémenter l'écran Programmes complet (CRUD Programme + Workout, 4 écrans)
- Approche : brainstorming → spec → plan → subagent-driven development

### Décisions prises
- **SDK 54** : downgrade 56→53 depuis une session précédente, mais Expo Go nécessitait SDK 54 → upgrade 53→54. Stack finale : Expo 54, RN 0.81.5, expo-router 6, reanimated 4.x + worklets.
- **PRAGMA foreign_keys = ON** dans `getDb()` (singleton, pas dans les migrations) — SQLite ignore ON DELETE CASCADE par défaut.
- **Repository pattern identique Exercices** : Interface → InMemory (tests) → SQLite (prod). Contract tests partagés.
- **update() vérifie `result.changes === 0`** avant re-fetch — distingue "row manquante" vs "bug DB".
- **setActive() valide l'id** avant la boucle — évite de tout désactiver sur un id inexistant.
- **WorkoutCard `onPress`** → Alert "Bientôt disponible" (workout detail = Session 7, pas encore implémenté).
- **workoutCount dynamique** dans ProgrammesScreen — `Promise.all` sur `findByProgramId` par programme au lieu de `0` hardcodé.
- **NaN guard** sur `programId` dans `add-workout.tsx` et `programme/[id].tsx` : `Number(x) || 0`.
- **Accessibilité** : `accessibilityRole`, `accessibilityLabel`, `accessibilityHint` sur tous les éléments interactifs. Touch targets `minHeight: 44`. Constantes pour couleurs littérales (`'#fff'`, `'#000'`).
- **`--dangerously-skip-permissions`** : documenté comme option pour sessions non surveillées (évite les prompts d'approbation).

### Ce qui a été fait
- Upgrade SDK 53 → 54 (expo, react-native, expo-router, reanimated 4.x, worklets)
- `app/db/index.ts` — `PRAGMA foreign_keys = ON` dans `getDb()`
- `app/repositories/` — IProgramRepository, InMemory+SQLite impls, contract tests (11 cas)
- `app/repositories/` — IWorkoutRepository, InMemory+SQLite impls, contract tests (11 cas)
- `app/services/ProgramService.ts` + 13 tests GREEN
- `app/services/WorkoutService.ts` + 10 tests GREEN
- `app/hooks/usePrograms.ts` + `useWorkouts.ts`
- `app/components/programmes/ProgramCard.tsx` + `WorkoutCard.tsx`
- `app/app/_layout.tsx` — nouvelles routes (add-programme, programme/[id], add-workout)
- `app/app/(tabs)/programmes.tsx` — FlatList + FAB + long-press + isFirstFocus
- `app/app/add-programme.tsx` — modal create/edit (pré-remplissage si id présent)
- `app/app/programme/[id].tsx` — détail programme + liste séances + Stack.Screen dynamique
- `app/app/add-workout.tsx` — modal create/edit séance
- **75 tests GREEN** au total (7 suites)
- Poussé sur GitHub

### Architecture finale en place
```
Program ──< Workout ──< WorkoutExercise (Session 7)
Interface → InMemory (tests) → SQLite (prod)
Screens → Hooks → Services → Repositories → SQLite
```

### Leçons Code Craft de la session
- **`result.changes === 0`** après UPDATE SQL — détecter les rows manquantes proprement
- **Validate before mutate** — `setActive` valide l'id avant de toucher les autres rows
- **Contract tests** — même suite InMemory + SQLite, les deux doivent passer
- **Constantes pour couleurs littérales** — `'#fff'` inline dans StyleSheet = code smell détecté en review
- **Subagent-driven development** : fresh subagent par tâche + spec review + quality review = qualité élevée sans context pollution

### Prochaine session (Session 7)
1. Tester l'app sur Expo Go (vérifier les 4 écrans Programmes)
2. WorkoutExercise + Block + Set — `workout/[id].tsx` + `workout-exercise/[id].tsx`
3. `docs/accessibilite.md` — doc formelle WCAG 2.2 + EN 301 549 + iOS/Android

---

## Session 7 — 2026-05-28 · Accessibilité + WorkoutExercise layer complet

### Ce qui a été demandé
- Créer `docs/accessibilite.md` — doc formelle WCAG 2.2 + EN 301 549 + iOS/Android
- Créer `PressableA11y` composant pour enforcer les contrats d'accessibilité au niveau TypeScript
- Implémenter la couche complète WorkoutExercise + Block + Set (3 repos + 1 service + 1 hook + 2 composants + 2 écrans)

### Décisions prises
- **`PressableA11y`** : `accessibilityLabel` obligatoire à la compilation (TypeScript strict). `minHeight/minWidth: 44` dans les styles de base. Remplace `TouchableOpacity` pour tous les éléments interactifs.
- **TransactionRunner injectable** : `type TransactionRunner = (fn: () => Promise<void>) => Promise<void>`. En tests : `noopTransaction = async (fn) => fn()`. En prod : `db.withTransactionAsync`. Découple le service de SQLite sans sacrifier l'atomicité.
- **View models dans le service** : `BlockWithSets` et `WorkoutExerciseDetail` définis dans `WorkoutExerciseService.ts`, pas dans `db/types.ts`. Les types DB restent purs.
- **`Set as TrainingSet`** : alias d'import pour éviter conflit avec le global JS `Set`.
- **`remove()` délègue au CASCADE DB** : le service appelle uniquement `weRepo.delete(id)`. `ON DELETE CASCADE` SQLite supprime blocks et sets automatiquement. Les InMemory repos ne cascadent pas (comportement acceptable — non observable via l'API publique).
- **Accordéon WorkoutExerciseCard** : collapsed par défaut, long press → Alert confirmation avant suppression, `accessibilityState={{ expanded }}` sur le Pressable.
- **JSON.parse muscle_groups sans try/catch** : conforme à la convention "no error handling for scenarios that can't happen" — muscle_groups est toujours du JSON valide produit par l'app.
- **parseMuscleGroups avec guard null** : `raw ? JSON.parse(raw) : []` dans add-workout-exercise (muscle_groups peut être vide sur certains exercices).
- **Nom de séance via WorkoutService.getById** dans un useEffect — pas besoin de prop programId sur l'écran workout/[id].

### Ce qui a été fait
- `docs/accessibilite.md` — référentiel formel complet (10 sections, WCAG 2.2 AA + EN 301 549 + iOS VoiceOver + Android TalkBack)
- `app/components/ui/PressableA11y.tsx` — composant accessibilité enforced
- `app/repositories/` — IWorkoutExerciseRepository, IBlockRepository, ISetRepository (interfaces + InMemory + SQLite + contract tests) — 63 tests via 3 suites contract
- `app/services/WorkoutExerciseService.ts` + 6 tests GREEN — addToWorkout, getWithDetails, remove
- `app/hooks/useWorkoutExercises.ts` — pattern identique useWorkouts/usePrograms
- `app/components/workout/BlockCard.tsx` — formatSet() avec tous les cas weight_type + reps_min===reps_max
- `app/components/workout/WorkoutExerciseCard.tsx` — accordéon, long press, a11y complète (hint, state, icon caché)
- `app/app/workout/[id].tsx` — FlatList + FAB (PressableA11y) + useFocusEffect + isFirstFocus
- `app/app/add-workout-exercise.tsx` — modal recherche/sélection, error feedback via Alert
- `app/app/_layout.tsx` — +2 Stack.Screen (workout/[id], add-workout-exercise modal)
- `app/app/programme/[id].tsx` — WorkoutCard.onPress branché sur `/workout/${item.id}`
- **108 tests GREEN** au total (11 suites)
- Poussé sur GitHub

### Architecture finale
```
Program ──< Workout ──< WorkoutExercise ──< Block ──< Set
Interface → InMemory (tests) → SQLite (prod)
Screens → Hooks → Services → Repositories → SQLite
```

### Leçons Code Craft de la session
- **TransactionRunner pattern** : injectable → testable sans SQLite, prod garde l'atomicité
- **CASCADE DB vs InMemory** : trade-off conscient. InMemory simule assez pour les tests de service, SQLite gère l'intégrité référentielle en prod
- **Decorative icons** : `importantForAccessibility="no"` + `accessibilityElementsHidden={true}` sur les icônes purement visuelles
- **accessibilityHint** sur les actions non-évidentes (long press destructif)
- **Subagent-driven development** : spec reviewer + quality reviewer par tâche = 0 régression en production

### Prochaine session (Session 8)
1. Tester manuellement le flow complet : Programmes → programme → séance → ajouter exercice → accordéon → supprimer
2. Édition inline blocks/sets (modifier reps, poids directement dans l'accordéon)
3. Réordonnancement drag-and-drop des exercices dans une séance

---

## Session 8A — 2026-05-28 · Édition inline sets + blocs

### Ce qui a été demandé
Ajouter l'édition complète sets et blocs depuis l'accordéon `workout/[id].tsx` : modifier/ajouter/supprimer des séries et des blocs directement (tap série → modale édition, long press → suppression, bouton + → ajout direct, long press bloc → renommer/supprimer, bouton "Ajouter un bloc").

### Décisions prises
- **UpdateSetDto non-Partial** : la modal fournit toujours les 5 champs (reps_min, reps_max, weight, weight_type, rest_duration). Pas de merge côté SQLite pour les sets — UPDATE direct.
- **UpdateBlockDto Partial** : rename seul ou toggle seul possibles. SQLite fait read-modify-write (findById → merge → UPDATE).
- **EditSetModal** : rendu conditionnel `{editingSet && <EditSetModal .../>}` — pas de prop `visible`. Le parent monte/démonte.
- **EditBlockModal** : prop `visible` — toujours monté dans WorkoutExerciseCard, visible selon état.
- **addBlock dans transaction** : `findByWorkoutExerciseId` déplacé DANS `runInTransaction` pour éviter TOCTOU sur `order_index` (bug détecté en quality review).
- **Rename flow dans WorkoutExerciseCard** : `onRenameBlock(block)` reçu de BlockCard → `setEditingBlock(block)` local → `EditBlockModal` en mode renommage. BlockWithSets manque `workout_exercise_id` → construit un `Block` en injectant `detail.id`.
- **Bouton "+" ajoute directement** : pas de modal pour créer une série, crée avec defaults (reps 3–8, pas de poids, 120s repos).
- **Assertions de test complètes** : quality review a détecté assertions manquantes (weight_type, null weight, defaults complets) → ajoutées.

### Ce qui a été fait
- `ISetRepository.ts` + `UpdateSetDto` + `update()` — contract + InMemory + SQLite
- `IBlockRepository.ts` + `UpdateBlockDto` + `update()` — contract + InMemory + SQLite (read-modify-write)
- `WorkoutExerciseService.ts` — 6 méthodes : updateSet, addSet, removeSet, addBlock, updateBlock, removeBlock
- `WorkoutExerciseService.test.ts` — 6 nouveaux describe, 12 tests supplémentaires
- `hooks/useWorkoutExercises.ts` — interface + 6 useCallback (pattern service + refresh + error + rethrow)
- `components/workout/EditSetModal.tsx` — nouveau, modale bottom-sheet (segmented weight_type, champ désactivé si PC/Barre)
- `components/workout/EditBlockModal.tsx` — nouveau, modale dual-mode (création/renommage), Switch is_work_block, canSave guard
- `components/workout/BlockCard.tsx` — refactoré avec PressableA11y partout, EditSetModal inline, bouton +
- `components/workout/WorkoutExerciseCard.tsx` — 6 nouvelles props, showAddBlock/editingBlock state, EditBlockModal, bouton "Ajouter un bloc"
- `app/workout/[id].tsx` — 6 méthodes passées à WorkoutExerciseCard
- **120 tests GREEN** au total (11 suites)
- Poussé sur GitHub

### Architecture finale
```
ISetRepository.update() / IBlockRepository.update()
WorkoutExerciseService : 9 méthodes (add, get, remove + 6 CRUD)
useWorkoutExercises : 9 callbacks
BlockCard → EditSetModal
WorkoutExerciseCard → EditBlockModal
workout/[id].tsx → WorkoutExerciseCard (câblage complet)
```

### Leçons Code Craft de la session
- **TOCTOU sur order_index** : `findByWorkoutExerciseId` hors de `runInTransaction` = race condition. Toujours calculer order_index à l'intérieur de la transaction.
- **Assertions complètes** : un test qui vérifie seulement `reps_min` peut masquer un bug sur `weight_type`. Couvrir tous les champs du DTO dans au moins un test.
- **Partial vs non-Partial DTOs** : UpdateSetDto non-Partial → UPDATE direct ; UpdateBlockDto Partial → read-modify-write. Le choix est dicté par les cas d'usage réels (modal vs actions indépendantes).
- **Capture ID avant await** : `const setId = editingSet.id; await onUpdateSet(setId, dto)` — défensif contre les stale references dans les closures async.
- **BlockWithSets ≠ Block** : BlockWithSets n'a pas `workout_exercise_id`. Construire un `Block` explicitement quand le type complet est nécessaire.

### Prochaine session (Session 8B)
1. Tester manuellement le flow complet d'édition (séries + blocs)
2. Réordonnancement drag-and-drop des exercices dans une séance (Session 8B)
3. Réordonnancement des blocs dans un exercice et des séries dans un bloc

---

## Session 8B — 2026-05-28 · Réordonnancement ↑/↓

### Ce qui a été demandé
Implémenter les boutons ↑/↓ pour réordonner : exercices dans une séance, blocs dans un exercice, séries dans un bloc, séances dans un programme.

### Décisions prises
- **Boutons ↑/↓ plutôt que drag-and-drop** : plus accessible, plus simple, conforme WCAG. Drag-and-drop envisageable en V2.
- **swap() dans les 4 repositories** (workout, workoutExercise, block, set) : échange les `order_index` entre deux entités adjacentes en une seule opération transactionnelle.
- **Contract tests swap** : cas swap premier/dernier/adjacent ajoutés aux 4 suites contract.

### Ce qui a été fait
- `swap()` dans `IWorkoutRepository`, `IWorkoutExerciseRepository`, `IBlockRepository`, `ISetRepository` — interfaces + InMemory + SQLite
- Contract tests swap (~3 cas chacun) — 4 suites mises à jour
- Boutons ↑/↓ sur `WorkoutCard` (programme/[id].tsx), `WorkoutExerciseCard`, `BlockCard`, `SetRow`
- Callbacks `onMoveUp/onMoveDown` câblés via hooks + services
- Poussé sur GitHub

### Prochaine session (Session 9)
Conduite de séance guidée : check-in, timer, saisie reps/poids réels, "Tout réussi ⚡", progression automatique post-séance, résumé.

---

## Session 9 — 2026-05-29 · Conduite de séance guidée (MVP core)

### Ce qui a été demandé
Implémenter la conduite de séance complète : state machine (check-in → running → summary), timer pause/reprend, saisie des reps/poids/RPE, "Tout réussi ⚡", progression automatique, accueil dynamique (next workout).

### Décisions prises
- **State machine dans un seul écran** `session/[workoutId].tsx` — `SessionPhase = 'checkin' | 'running' | 'summary'`. Pas de routes séparées → bouton Back système ne casse pas la session.
- **3 nouveaux repos** : `ISessionLogRepository` (5 méthodes, dont `findLatestByWorkoutIds`), `ISetLogRepository` (3 méthodes), `IPersonalRecordRepository` (2 méthodes).
- **`CreateSessionLogDto = Omit<SessionLog, 'id' | 'ended_at'>`** — omit les deux champs auto-générés (contrairement aux autres repos qui omettent seulement `id`).
- **SessionService** : 5 méthodes publiques. Injecte 8 repositories (toutes les dépendances explicites).
- **Détection PR via Epley** : `weight × (1 + reps/30)`. PR sauvegardé seulement si `weight > 0 && reps > 0 && estimated1RM > currentBest`.
- **Progression** : filtre sur `is_work_block === 1`, comptage sessions consécutives, `+progression_step` sur tous les sets de travail si `consecutiveSuccesses >= progression_threshold`.
- **`getNextWorkout`** : trie par `order_index`, trouve le dernier log parmi tous les workouts du programme, retourne `workouts[(lastIdx + 1) % workouts.length]`.
- **`advancePosition` fonction pure exportée** : priorité setIdx+1 → blockIdx+1 → exerciseIdx+1 → null. Testable indépendamment du hook.
- **`useRef` guard** pour instancier le service une seule fois (évite la re-création à chaque re-render).
- **`key={setKey}` sur ScrollView** de RunningPhase : reset l'état des champs reps/poids/RPE à chaque changement de série.
- **Stubs RunningPhase/SummaryPhase** créés en Task 9, remplacés en Tasks 10/11 — débloque la compilation TypeScript pendant l'implémentation.
- **Accueil dynamique** `(tabs)/index.tsx` : `useFocusEffect` + `getNextWorkout` sur le programme actif. 3 états : aucun programme / prochaine séance / aucune séance configurée.

### Ce qui a été fait
- `repositories/ISessionLogRepository.ts` + InMemory + SQLite + contract tests (11 cas)
- `repositories/ISetLogRepository.ts` + InMemory + SQLite + contract tests (7 cas)
- `repositories/IPersonalRecordRepository.ts` + InMemory + SQLite + contract tests (4 cas)
- `services/SessionService.ts` — 5 méthodes, 18 tests GREEN
- `hooks/useTimer.ts` — `setInterval` + `useRef`, auto-stop à 0, callbacks `useCallback`
- `hooks/useSession.ts` — `advancePosition` pure + `useSession` hook complet
- `app/session/[workoutId].tsx` — écran state machine (3 phases)
- `components/session/CheckInPhase.tsx` — 3 lignes (énergie/fatigue/sommeil), bouton disabled tant que non rempli
- `components/session/RunningPhase.tsx` — timer tap pause/reprend, Valider + "Tout réussi ⚡", séries restantes
- `components/session/SummaryPhase.tsx` — durée, stats, progressions (achieved + pending)
- `app/_layout.tsx` — Stack.Screen session/[workoutId] sans header
- `app/workout/[id].tsx` — bouton "▶ Démarrer la séance" (vert, bas de l'écran)
- `app/(tabs)/index.tsx` — réécriture complète, accueil dynamique
- `docs/tests-manuels-mvp.md` — suite de tests manuels MVP complète (9 sections, à exécuter uniquement quand le MVP est finalisé)
- **182 tests GREEN** au total (14 suites), TypeScript clean
- 13 commits poussés sur main (`f166a48..2161f93`)

### Architecture finale
```
SessionService ← 8 repos injectés
useSession → SessionService, advancePosition (pure)
useTimer → setInterval + useRef
session/[workoutId].tsx → useSession + useTimer + CheckIn/Running/SummaryPhase
(tabs)/index.tsx → useFocusEffect + getNextWorkout
```

### Leçons Code Craft de la session
- **Fonction pure `advancePosition`** : navigation = transformation de données → exportée, testée isolément, pas d'effets de bord
- **`useRef` guard** : services créés une fois, pas à chaque re-render. Critère : dépendances stables (repos + workoutDetails) → `if (!serviceRef.current) { serviceRef.current = new ... }`
- **Stubs typage-compatible** : créer des stubs qui compilent permet de débloquer la CI pendant l'implémentation incrémentale
- **`key` prop pour reset local state** : `key={setKey}` sur le composant racine reset ses champs sans `useEffect`
- **Injection massive** : 8 dépendances dans un constructeur = signal à surveiller. Pour ce MVP, acceptable — la couche service est le seul endroit qui connaît l'ensemble des tables.

### Prochaine session (Session 10)
1. Tester manuellement le flow complet sur device/émulateur (tests-manuels-mvp.md)
2. Historique des séances
3. Page Progression / graphiques (1RM estimé, PRs, volume)
4. (Futur) Session dédiée polish visuel après MVP complet

---

## Session 10 — 2026-05-29 · Historique des séances

### Ce qui a été demandé
Implémenter l'historique des séances passées dans l'onglet Progression : liste groupée par mois + écran détail avec sets, durée, check-in.

### Décisions prises
- **Onglet Progression réécrit** (placeholder) → `SectionList` groupée par mois. Aucun nouvel onglet.
- **Écran détail** `history/[sessionLogId].tsx` — Stack screen poussé depuis la liste.
- **Lazy loading** : `session_logs` + noms workouts + comptes sets au chargement liste ; `set_logs` uniquement à l'ouverture du détail.
- **`countBySessionLogIds`** : batch `SELECT session_log_id, COUNT(*) GROUP BY` pour totalSets — évite N+1.
- **Groupement par mois** : `startedAt.slice(0, 7)` → clé `"2026-05"` → `toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })` → capitalisé + `" · N séances"`. `new Date(key + '-01T12:00:00')` pour éviter bug timezone UTC−X.
- **`computeDuration` helper privé** dans `HistoryService` — élimine duplication entre `getSessionList` et `getSessionDetail`.
- **`isFirstFocus` guard** + `useFocusEffect` → `refresh()` quand on revient sur Progression après une séance. Pattern identique à `exercices.tsx`.
- **RPE moyen** calculé dans l'écran détail (pas dans le service) — masqué si aucun RPE saisi.
- **Check-in masqué** si les trois valeurs sont null.
- **Singular/plural** : "1 séance" vs "N séances" — extra par rapport à la spec, meilleure UX.

### Ce qui a été fait
- `repositories/ISessionLogRepository.ts` — ajout `findAll(): Promise<SessionLog[]>`
- `repositories/sessionLogRepository.contract.ts` — 2 nouveaux tests `findAll`
- `repositories/InMemorySessionLogRepository.ts` + `SQLiteSessionLogRepository.ts` — implémentation `findAll`
- `repositories/ISetLogRepository.ts` — ajout `countBySessionLogIds(ids: number[]): Promise<Record<number, number>>`
- `repositories/setLogRepository.contract.ts` — 3 nouveaux tests `countBySessionLogIds`
- `repositories/InMemorySetLogRepository.ts` + `SQLiteSetLogRepository.ts` — implémentation `countBySessionLogIds`
- `services/HistoryService.ts` — nouveau service, view models `SessionSummary/SetLogSummary/ExerciseHistory/SessionDetail`, `getSessionList` + `getSessionDetail` + `computeDuration` helper
- `services/HistoryService.test.ts` — 8 tests GREEN
- `hooks/useHistory.ts` — `groupByMonth` + `mountedRef` + `refresh()` exposé
- `hooks/useHistory.test.ts` — 8 tests GREEN
- `components/history/SessionCard.tsx` — carte liste avec `PressableA11y`, `formatDate`, `formatDuration`
- `components/history/ExerciseHistorySection.tsx` — en-tête exercice + chips sets `flexWrap`
- `app/(tabs)/progression.tsx` — réécriture complète `SectionList`
- `app/history/[sessionLogId].tsx` — écran détail (stats + check-in + exercices)
- `app/_layout.tsx` — Stack.Screen `history/[sessionLogId]`
- `docs/tests-manuels-mvp.md` — section 10 ajoutée (10A liste + 10B détail)
- **203 tests GREEN** (17 suites), TypeScript clean

### Architecture finale
```
HistoryService ← 4 repos injectés
useHistory → HistoryService, groupByMonth
(tabs)/progression.tsx → useHistory + SectionList + SessionCard
history/[sessionLogId].tsx → HistoryService direct (load at mount)
```

### Leçons Code Craft de la session
- **`computeDuration` private helper** : duplication détectée en code review → extraction immédiate avant que d'autres callers ne s'ajoutent
- **`key + '-01T12:00:00'` vs `key + '-01'`** : date ISO sans heure = UTC midnight = bug timezone dans les fusceaux UTC−. Toujours injecter un midi pour les labels de date
- **Timezone reviewer finding** : la revue de code est là pour attraper les bugs subtils — timezone off-by-one est exactement le genre de bug qui ne se manifeste pas dans les tests
- **Clé stable dans les listes** : `key={i}` refusé par le reviewer → `key={exerciseId + '-' + i}` — la spec n'a pas de `id` dans `SetLogSummary`, la composition d'identifiants est la bonne approche

### Prochaine session (Session 11)
1. Tester manuellement l'historique sur device/émulateur (tests-manuels-mvp.md section 10)
2. Page Progression — graphiques 1RM estimé (Epley), PRs par exercice, volume par semaine
3. (Optionnel) Filtres historique par exercice ou période

---

## Session 11 — 2026-05-29 · Progression Stats (dashboard + détail exercice)

### Ce qui a été demandé
Ajouter un dashboard "Stats" dans l'onglet Progression : segmented control `Historique | Stats`, 3 chips globales (séances/PRs/exercices ce mois), volume par semaine ISO, 5 derniers PRs, liste 1RM par exercice avec delta 30j, écran détail exercice avec graphique d'évolution 1RM.

### Décisions prises
- **Segmented control sans swipe** : conflit gestuel scroll horizontal vs SectionList/ScrollView verticaux sur Android. État local `activeSegment`.
- **Fusion deux séances même jour dans le graphique 1RM** : `completed_at.slice(0, 10)` comme clé → max Epley du jour. Silencieux (pas d'avertissement).
- **Chips toutes "ce mois"** : cohérence — les 3 chips filtrées par mois courant. Filtre période (mois/année/all-time) repoussé hors scope.
- **PR_FETCH_LIMIT = 200** : `findRecent` trie DESC donc le mois courant est toujours dans le top 200 ; pas de `findFromDate` sur `PersonalRecord`.
- **UTC noon** dans `getExercise1RMHistory` : `T12:00:00Z` pour cohérence avec les autres calculs UTC du service.
- **`Math.max` guard** : `logs.length === 0` → `return null` dans `getExercise1RMList`, filtré avant tri. Protège contre race condition `findDistinctExerciseIds` / `findByExerciseId`.
- **BarChart accessible** : wrappé dans `<View accessible accessibilityLabel="...">` — WCAG 2.2 SC 1.1.1.
- **Semantic color overrides** : `#22C55E` / `#EF4444` autorisés (status positif/négatif) — exception explicite à la convention "Colors.ts seulement".

### Ce qui a été fait
- `react-native-gifted-charts` + `expo-linear-gradient` + `react-native-svg` installés
- `ISetLogRepository` — +3 méthodes (`findByExerciseId`, `findFromDate`, `findDistinctExerciseIds`) + InMemory + SQLite + contract tests
- `IPersonalRecordRepository` — +2 méthodes (`findAllByExerciseId`, `findRecent`) + InMemory + SQLite + contract tests
- `services/ProgressionService.ts` — 5 interfaces + 5 méthodes, 15 tests GREEN
- `hooks/useProgression.ts` — `Promise.all` 4 sources, `mountedRef`, `refresh()`
- `components/progression/VolumeBarChart.tsx` — BarChart 4 semaines, semaine courante `colors.primary`, delta `+X%`
- `components/progression/Exercise1RMCard.tsx` — ligne liste 1RM, `PressableA11y`, delta coloré
- `app/(tabs)/progression.tsx` — segmented control `Historique|Stats` + dashboard Stats complet
- `app/progression/[exerciseId].tsx` — graphique 1RM par session, meilleur PR, historique PRs
- `app/_layout.tsx` — Stack.Screen `progression/[exerciseId]`
- `docs/tests-manuels-mvp.md` — section 11 (8 items)
- `README.md` — section Fonctionnalités mise à jour
- **232 tests GREEN** (18 suites), TypeScript clean
- Poussé sur GitHub (`d1f96d0..8e84a0e`)

### Architecture finale
```
ProgressionService ← 4 repos injectés
useProgression → ProgressionService, Promise.all
(tabs)/progression.tsx → useHistory + useProgression + segmented control
progression/[exerciseId].tsx → ProgressionService direct (mount)
```

### Leçons Code Craft de la session
- **`Math.max(...[]) = -Infinity`** : `findDistinctExerciseIds` puis `findByExerciseId` = deux requêtes séparées = race condition possible. Guard `logs.length === 0` indispensable avant `Math.max`.
- **UTC noon pattern** : `T12:00:00Z` (UTC) vs `T12:00:00` (local) — les deux semblent équivalents mais divergent dans les fuseaux UTC−. Utiliser systématiquement le suffixe `Z`.
- **Error state vs empty state** : une `.catch()` qui ne set pas d'error state masque les erreurs DB derrière un "Aucune donnée" — toujours distinguer erreur vs vide.
- **Comment factuel** : un commentaire qui justifie une constante doit être exact. "200 covers > 10 years" était faux → corrigé en décrivant le mécanisme réel (tri DESC).
- **Segmented control a11y** : `accessibilityRole="tablist"` sur le container + `role="tab"` + `accessibilityState={{ selected }}` sur chaque bouton — structure complète pour screen readers.

### Prochaine session (Session 12)
1. Tests manuels sur device/émulateur (tests-manuels-mvp.md — toutes les sections)
2. Polish final (animations, transitions, edge cases visuels)
3. Si tout est bon : MVP terminé
