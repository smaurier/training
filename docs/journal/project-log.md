# Journal de projet — Training App

Journal chronologique du projet, du lancement à la release. Chaque session est documentée : ce qui a été demandé, les décisions prises, les problèmes rencontrés et les choix retenus avec leur raison.

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
