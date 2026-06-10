# Changelog

Toutes les modifications notables sont documentées ici.
Format : [Semantic Versioning](https://semver.org/). Types : `feat`, `fix`, `ux`, `refactor`, `docs`, `chore`.

---

## [1.5.0] — 2026-06-10

02fb2e6 refactor(session): remove pause from CircularTimer — tap start or validate only
cfdaad3 feat(session): CircularTimer interactif — tap start/pause/resume/valider, size 220
82a7b62 feat(session): pack polish — exerciseName hierarchy, dumbbell hint, CircularTimer centered, RestPhase REPOS header + next label
035a7f5 feat(session): series progress dots in RunningPhase header
f3b03cd fix(session): wording 'Charge de départ' — titre clair + sous-titre explicite
92a8430 feat(home): fade scroll indicator on workout chips

---

## [1.4.2] — 2026-06-10

8c175d8 refactor(session): remove legacy timerContainer from RunningPhase — rest timer lives in RestPhase only
946c2a0 fix(session): destructure stable timer.reset/start in useEffect deps — rest countdown now works
58abaab fix(session): etirement exercises use reps UI regardless of duration_seconds
3816a2b fix(session): markStartingWeightDone called after refresh — weight now visible in RunningPhase

---

## [1.4.1] — 2026-06-10

3717334 fix(session): starting-weight confirm now reliably navigates to RunningPhase
5f8d471 fix(session): skip starting-weight screen for bodyweight exercises

---

## [1.4.0] — 2026-06-10

f5f69eb docs(journal): session 25 — thème + réglages + unités (14 commits, 304 tests)
ec78aa4 fix(settings): lbsToKg util, formatLastLog unit-aware, ExerciseHistorySection useUnits
fbabd65 feat(settings): SummaryPhase + progression affichent poids dans unité choisie
446fad7 feat(settings): RunningPhase affiche poids dans unité choisie
21a369e feat(settings): écran Réglages — segmented controls thème + unités
8aabe84 feat(settings): useUnits hook
287c353 feat(settings): useColorScheme lit ThemeContext (fallback OS)
264a0f5 feat(settings): _layout charge theme+units depuis DB, wrap ThemeContext+UnitsContext
bee51f7 feat(settings): UnitsContext + UnitsContextProvider, install expo-localization
5e52639 feat(settings): ThemeContext + ThemeContextProvider
717f94a feat(settings): fonctions pures resolveTheme, resolveUnits, convertWeight
8c58dc9 feat(settings): SQLiteSettingsRepository
ea37a0a feat(settings): ISettingsRepository + InMemory + contrat TDD
8ec831d docs(spec): réglages thème + unités — ThemeContext, UnitsContext, ISettingsRepository
a3cf3e5 fix(seeds): preserve weight when user set starting weight but quit before logging

---

## [1.3.0] — 2026-06-10

a509d61 docs(journal): session 25 — F1 passer exercice, F2 undo série, U10 cycle rotatif, T1 ESLint
bf2f07c fix(ui): programme — cancel async on cleanup, a11y label for isNext badge
dafa2e2 feat(ui): U10 — badge cycle rotatif 'Prochain' sur WorkoutCard
5dd3504 feat(repo): U10 — getLastCompletedWorkoutId
ef43d75 fix(a11y): RunningPhase — remove backdrop onPress double-close, add accessibilityState to undo button
2a35927 feat(ui): F1+F2 — bouton ↩ undo, passer exercice + BottomSheet confirmation
45020d7 feat(session): F1 — skipExercise (passer exercice entier)
5773fb7 fix(session): undoLastSet — peek before async, pop after success
4033656 feat(session): F2 — positionHistory, undoLastSet, canUndo
493a035 feat(repo): add deleteBySetAndSession to SetLogRepository
65cf96e fix(lint): remove non-functional react-hooks/purity disable comment
841e2e6 feat(tooling): add ESLint with eslint-config-expo + CI step
4635119 docs(spec): session controls + cycle rotatif + ESLint — F1/F2/U10/T1
0ee67c1 docs(journal): session 24 — templates de programmes (5 templates, TemplateService, UI import)

---

## [1.2.0] — 2026-06-09

1172cf6 feat(programmes): FAB -> BottomSheet — Créer vide / Importer template
af95ca9 fix(a11y): import-template — radiogroup role, TextInput editable, bouton disabled opacity
0faa40a feat(ui): écran import template — liste + nom personnalisable + warning doublon
ab3ba87 feat(ui): AddProgrammeBottomSheet — 2 choix via @gorhom/bottom-sheet
4380a99 feat(services): TemplateService — importTemplate + isTemplateImported
1e17169 fix(seeds): ajouter Curl marteau haltères + Extensions quadriceps
ccf881a fix(seeds): ajouter Tractions lestées, Curl biceps barre, Élévations latérales, Mollets debout
b384b68 feat(data): 5 templates — Stronglifts 5x5, Full Body, Upper/Lower, Bro Split, Arnold Split
e69a759 fix(seeds): retirer Soulevé de terre en doublon (existe déjà en base)
08aef0b feat(seeds): 7 nouveaux exercices pour les templates (SDT, Tirage poitrine, Skull crusher...)
c11fa30 feat(db): migration v7 — template_id TEXT sur programs
e40119d feat(setup): @gorhom/bottom-sheet + GestureHandlerRootView
ad0f703 docs(plan): fix ordre tasks + mkdir app/data
fe8ced0 docs(plan): programme templates — 8 tâches, TDD, @gorhom/bottom-sheet
585a121 docs(spec): fix TemplateService — repos complets, sans db direct
36cef28 docs(spec): programme templates — design complet 5 programmes
470b24b docs(journal): session 23 — weight_ratio back-off
2d1549b feat(session): résolution automatique poids Back-off via resolveWeights
58007dc feat(services): resolveWeights — calcul poids Back-off depuis ratio Travail
9887dfe feat(seeds): weight_ratio 0.8 sur Back-off + fix types repositories/tests
797eae8 feat(db): migration v6 — weight_ratio REAL sur sets
e7462c8 docs(plan): weight_ratio back-off — 4 tasks, TDD, migration v6
ac49149 docs(spec): weight_ratio back-off — resolveWeights pure function + migration v6
7b5741d docs(journal): session 22 — timer circulaire SVG
59864c7 feat(session): RunningPhase durée — remplace timerContainer par CircularTimer
9535dbb feat(session): RestPhase — remplace barre + texte par CircularTimer
27274af refactor(ui): CircularTimer — remove obvious comments, guard formatTime, proportional label size
c1f4c2b feat(ui): CircularTimer — arc SVG avec feedback couleur vert/orange/rouge
ef5deb1 docs(spec): timer circulaire SVG — CircularTimer + RestPhase + RunningPhase durée
5dc7dca docs(journal): session 21 — CI + backlog audit
62f0172 ci: add GitHub Actions workflow — typecheck + test on push to main
5fc87a8 docs(spec): CI GitHub Actions — typecheck + test on push to main
39d70bd docs(journal): session 20 — cycle rotatif + MCP config
18ac360 fix(home): remove invalid radiogroup role + calendar-day diff + null type fix
ed75269 fix(home): style array guards + radiogroup on ScrollView + a11y icons
be172d5 feat(home): cycle rotatif — chips séances + date dernière fois + accessibilité
6790b19 fix(hook): unmount guard + typed mocks + error test in useHomeWorkout
f6a8b12 feat(hook): useHomeWorkout — workouts + suggestion + dates + selectWorkout
8322d8a feat(repo): findLatestDatesPerWorkout — MAX(started_at) GROUP BY workout_id
3ed6acf docs(plan): cycle rotatif — implementation plan 3 tasks
f1435ab docs(spec): cycle rotatif home screen — chips inline + date dernière séance
2c98e5d feat(session): timer durée explicite + historique dernière série
6582dd6 test: audit — 5 tests manquants ajoutés
b36a86c fix(session): audit — 6 bugs + 3 missing tests
fad8e3f fix(service): create program with is_active=0 by default
746555b docs(journal): session 19 — Bloc B UX pipeline complet
3955251 docs(plan): Bloc B UX pipeline implementation plan
6f39f67 feat(session): wire RestPhase + ExerciseTransitionPhase — refactor timer to phase-based
694fcb0 feat(session): ExerciseTransitionPhase component — exercise preview + description
e7e3d72 feat(session): RestPhase component — timer display + progress bar
950037a feat(session): new phases exercise_transition + rest — confirmRest/confirmTransition
43d4805 feat(session): export computeNextLabel — TDD
c0308cb feat(seeds): add 44 exercise descriptions — upsert on every seedProgram run
b765d2c feat(service): expose exercise description in WorkoutExerciseDetail
bf19fd0 feat(db): migration v5 — add description column to exercises
e90debd docs(spec): Bloc B UX pipeline — RestPhase + ExerciseTransitionPhase + descriptions exercices
e22b663 docs(journal): session 18 — double progression + seeds idempotentes + bugs critiques
7bddec1 fix(session): comma handling in weight input + resilient refresh
92b48d4 test(progression): update SessionService tests for double-progression algorithm
22c5048 feat(session): wire ExerciseStartingWeightPhase + setStartingWeight
a218503 feat(session): add ExerciseStartingWeightPhase component
5eefef0 fix(session): key remount, pre-fill inputs, remove Tout réussi button
0381e91 fix(seeds): fixed 8-rep target on compound movements (PPL)
d27948b fix(seeds): idempotent upsert — preserve set weights across restarts
bebd961 refactor(progression): static type import + Map optimization in calculateProgressions
c7c1349 feat(progression): double-progression + auto-deload + setStartingWeight
bee7cbe feat(progression): add applyProgression, applyDeload, isSessionFullSuccess, isSessionSignificantFailure
7c997a9 docs(plan): progression system + critical fixes implementation plan
c088913 docs(spec): progression system + critical fixes design
c9b9d78 docs: mise à jour complète — architecture, changelog, journal, choix architecturaux
3a50146 feat(cardio): log durée + distance sur les séances footing
51caf91 feat(workout): color stripe by exercise type + Footing cardio exercise
a285b4d fix(seeds): always re-seed PPL program on startup
2abdcfd docs(journal): session 17 — PPL complet + mode durée sets
8511c5e feat(session): duration mode for mobility/stretch sets + PPL program with footing
0165534 feat(seed): programme PPL complet — 4 séances, 28 exercices, blocs/séries configurés
a35fef3 docs: architecture exhaustive + design patterns + Zustand/Redux — qualité npm run typecheck
7fa302b docs: justification pédagogique des choix architecturaux
77e8a7a chore: supprimer artefacts template Expo (ExternalLink, useClientOnlyValue)
f17bcd6 docs: journal session 16 — audit workflow + fixes MVP + UX

---

## [1.1.1] — 2026-05-30

687799e ux: corrections ergonomie — CTA séance vide, poids disabled, 404 FR, Themed supprimé, PressableA11y unifié

---

## [1.1.0] — 2026-05-30

68608d3 fix(a11y): migrer TouchableOpacity → PressableA11y sur tous les écrans restants
6daf07b fix: protéger JSON.parse muscle_groups contre données corrompues
1f0624c chore: supprimer modal.tsx + EditScreenInfo (artefacts template Expo)
c9e1185 chore(workflow): pre-commit tsc hook + suppr plans archivés + scope creep rules
faefadf chore: add CHANGELOG.md + version-bump script

---

## [1.0.0] — 2026-05-30 — MVP

### feat
- Programmes : création, activation, séquence de séances
- Configuration séance : exercices, blocs (travail/repos), séries avec poids/reps cibles
- Conduite de séance : check-in, phase active (timer pause, RPE, "Tout réussi"), résumé
- Progression automatique des poids (seuil configurable par exercice)
- Historique des séances groupé par mois
- Dashboard stats : volume 4 semaines, PRs récents, liste 1RM par exercice
- Détail exercice : graphique 1RM, meilleur PR, historique PRs
- Design system Trace : palette monochrome anthracite/blanc, tokens Radius, police Inter

### fix
- Résumé de séance toujours affiché (`calculateProgressions` isolé en try/catch)
- Toggle exercice ne se ferme plus à l'ajout de série
- Compteur exercices réel dans WorkoutCard (requête SQLite)
- Liste exercices rafraîchie après création depuis la recherche
- Timer pause survive au suspend OS (timestamp absolu + AppState)
- Vibration à la fin du timer de repos
- ON DELETE CASCADE sur session_logs / set_logs / personal_records

### ux
- Check-in : segmented control texte (sans emojis)
- Badge TRAVAIL/REPOS sur les blocs
- Hint "ajouter un bloc" si exercice sans bloc
- Chips suggestions dans EditBlockModal
- Bouton "Créer un exercice" sur liste vide dans la recherche
- Auto-activation du premier programme créé
- Pre-fill nom exercice depuis la recherche
- "Tout réussi ⚡" avant "Valider" (fond ambre)
- Séparateur visuel entre blocs, flèches séries supprimées
- Réordonnancement ↑/↓ exercices, blocs, séances

---
