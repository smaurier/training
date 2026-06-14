# Changelog

Toutes les modifications notables sont documentées ici.
Format : [Semantic Versioning](https://semver.org/). Types : `feat`, `fix`, `ux`, `refactor`, `docs`, `chore`.

---

## [1.13.0] — 2026-06-14

92b4d40 docs(journal): S44 — sets spéciaux AMRAP + dropsets livré
4cbfe66 fix(sets): reps_min empty field garde original + 3ème test régression dropset cross-bloc
88bedb3 feat(sets): RunningPhase — badges AMRAP/DROPSET + target + repsFeedback + ⚡
9cfd154 feat(sets): BlockCard — affichage AMRAP dans formatSet
3a9c05a fix(sets): EditSetModal — reps_min 0 valid pour open AMRAP + accessibilityRole radio
251f903 feat(sets): EditSetModal — toggle AMRAP + hint dropset
cf58a52 chore(sets): remove unused SetType import in InMemorySetRepository
50b0a3b feat(sets): migration v14 + SetType + repo set_type (TDD)
27ca2cf docs(plan): sets spéciaux — AMRAP + dropsets — plan d'implémentation (4 tâches TDD)
d1cb032 docs(spec): sets spéciaux — fix CreateSetDto + BlockCard + SELECT *
70c05b7 docs(spec): sets spéciaux — AMRAP + dropsets
eef8691 docs(journal): S43 — Supersets feature (v1.12.0)

---

## [1.12.0] — 2026-06-14

37617c2 fix(supersets): superset_group_id dans fixtures DeloadService + weightRatio + doc limitation multi-block
d4647e3 fix(supersets): onLinkToNext dans superset uniquement sur le dernier membre
e7f5ad0 feat(supersets): éditeur workout — bouton Grouper + container violet + Délier
9bfb190 feat(supersets): ExerciseTransitionPhase preview A→B→C
6fe5b7e feat(supersets): badge SUPERSET session + texte skip groupe
369cb3b fix(supersets): skipExercise dep array workoutDetails.length → workoutDetails
49fceff feat(supersets): validateSet + skipExercise superset routing wiring
93f7d3b feat(supersets): advancePosition superset routing + isSupersetForward/NextRound (TDD)
1df3ed3 feat(supersets): useWorkoutExercises expose linkToNext + unlink
825bd8e feat(supersets): WorkoutExerciseService.linkToNext + unlink (TDD)
41b8a25 feat(supersets): updateSuperset — InMemory + SQLite (TDD)
f1492fa feat(supersets): migration v13 + types superset_group_id + IWorkoutExerciseRepository.updateSuperset
10ec139 docs(spec): supersets — fix FlatList grouping + skipSet hors-scope V1
ff0dbba docs(spec): supersets — A+B+C, repos après dernier, badge SUPERSET session

---

## [1.11.1] — 2026-06-13

e95b2a4 docs(journal): S42 comparaison séance vs précédente
7cb04a6 feat(summary): delta volume + séries vs séance précédente dans SummaryPhase
efea492 feat(summary): getPreviousSessionSummary — delta volume + séries (TDD)
21b2b24 docs: plan comparaison séance vs précédente
0e41581 docs: spec comparaison séance vs précédente

---

## [1.11.0] — 2026-06-13

5da6eb9 docs(journal): S41 objectifs personnels — ETA, GoalService, migration v12
e86e0ba feat(goals): section OBJECTIFS dans Stats — liste + navigation exercice
1f928d0 feat(goals): section OBJECTIF dans détail exercice + BottomSheet création
93469ae feat(goals): useGoals hook — GoalWithExercise[] pour Stats
139401e feat(goals): GoalService — CRUD objectifs (TDD)
55e98d3 feat(goals): computeETA — régression linéaire ETA par poids de travail (TDD)
d045eb6 feat(goals): migration v12 + types + IGoalRepository + InMemory + SQLite
77712fe docs: spec objectifs — fix algo ETA, gate bodyweight, hook useGoals
58c2b58 docs: spec objectifs personnels — ETA regression + UI
63b39b3 docs: journal S40 — historique exercice fixes v1.10.3

---

## [1.10.3] — 2026-06-13

82f6965 feat(progression): useLoggedExercises — error state + affichage dans search
b31de5d feat(progression): ExerciseHistoryService.getHistory — limit optionnel, retourne tout par défaut (TDD)
08cc141 docs: plan historique exercice fixes — limit optionnel + error state
77c19d3 docs: spec — ajouter test TDD manquant pour getHistory sans limit
2d2e2cd docs: spec historique exercice — voir tout + error state useLoggedExercises

---

## [1.10.2] — 2026-06-13

193f38f docs: journal S39 — RPE moyen SummaryPhase
628bc25 feat(session): RPE moyen affiché dans SummaryPhase hero
139c8ed feat(session): SessionService.getSessionRPELabel — moyenne RPE par séance (TDD)
2b2262f docs: plan RPE moyen en SummaryPhase
daca5b5 docs: spec RPE moyen en SummaryPhase

---

## [1.10.1] — 2026-06-13

316a1fc docs: journal S38 — présences ce mois
156f08f fix(a11y): accessibilityLabel sur presencesCard dans Stats
2596ac2 feat(stats): présences ce mois — hook + UI
4485993 feat(stats): ProgressionService.getMonthlyPresences — sessions completed du mois (TDD)
dea56b3 docs: spec présences ce mois
b0fb1d4 docs: journal S37 — recherche historique exercice
17471a9 fix(history): escape apostrophe in JSX (ESLint no-unescaped-entities)
c189df8 fix(history): no duplicate session in historique, guard empty state, expose histError
0fd4e86 fix(history): restore 1RM chart + add dernière séance + historique séances sections
bad2a0f feat(history): écrans recherche + historique exercice
31f8769 feat(history): useExerciseHistory + useLoggedExercises hooks
db30437 fix(history): pin localeCompare locale, fix typo, add throw test
fb443b5 feat(history): ExerciseHistoryService — getHistory, getLoggedExercises (TDD)
858091b docs: spec recherche historique exercice
a4e70b7 chore: add pre-push hook — lint + tests (miroir CI)
e279b95 fix(lint): resolve 9 ESLint warnings — dedupe imports, unused vars, missing deps

---

## [1.10.0] — 2026-06-13

75e30a5 docs: journal S36 — volume par groupe musculaire
480357a feat(stats): MuscleGroupCard — volume par stimulus Push/Pull/Jambes/Gainage
6782611 feat(stats): ProgressionService.getVolumeByMuscleGroup — 4 semaines glissantes (TDD)
4ee1f3b feat(stats): muscleGroupUtils — mapping, getMacroCategory, computeVolumeByMuscleGroup (TDD)
2878ea8 docs: spec + plan volume par groupe musculaire

---

## [1.9.0] — 2026-06-13

b355126 style(tags): espace manquant avant category dans PREDEFINED_TAGS
5604a71 feat(session): tags + notes séance — state, handleTagToggle, handleBack async
8a53d58 fix(ui): SummaryPhase — onChangeText guard pour notes optionnel
7208ca0 feat(ui): SummaryPhase — section tags + champ notes
68963cd feat(session): SessionService.saveSessionMeta — tags + notes (TDD)
002aa10 feat(repo): saveSessionMeta — tags + notes sur session_logs
0e6825d feat(db): migration v11 — tags TEXT sur session_logs
ba5484e feat(tags): sessionTagsUtils — PREDEFINED_TAGS, parseTags, serializeTags (TDD)
a53b97e docs(plan): tags séance — 6 tasks TDD
fbcb790 docs(spec): tags séance — migration v11, sessionTagsUtils, SummaryPhase
6179046 fix(lint): apostrophes JSX + plateStep dans deps useCallback + import inutilisé
28d8316 docs(journal): S35 — plate_step configurable v1.8.1

---

## [1.8.1] — 2026-06-13

ade9102 feat(reglages): plate_step configurable — SegmentedControl kg/lbs
b284392 feat(warmup,session): thread plateStep dans WarmupPhase + useSession
bb0f0ef feat(session): calculateProgressions accepte plateStep — défaut 2
75e4f1f feat(deload): applyDeloadToExercises accepte plateStep — défaut 2
ebb05ab feat(warmup): computeWarmupSets accepte plateStep — défaut 2
6e52277 feat(progression): applyDeload accepte plateStep — défaut 2
e0040d8 feat(settings): getPlateStep — TDD
d0c51cb docs(plan): plate_step configurable — 7 tasks TDD
403fc1b fix(spec): correction calcul applyDeload(60, 2.5) → 52.5
137d08a docs(spec): plate_step configurable — réglages + fonctions pures

---

## [1.8.0] — 2026-06-13

f2217c9 refactor(session): handleMoodSelect — réutiliser makeServiceForCheck
d67210b fix(copy): micro-copy audit — langage factuel, sans compétitif
c4f263e feat(summary): section humeur post-séance — 3 chips mood_after
56172b2 feat(service): SessionService.saveMoodAfter — TDD
636902f feat(db): migration v10 — mood_after sur session_logs + repos
b733ca0 fix(RunningPhase): nommer constante seuil swipe undo
81ee5d4 feat(RunningPhase): undo conditionnel + swipe dots pour annuler
9f9eef5 docs(plan): Pack A séance — 5 tasks (undo swipe, humeur, micro-copy)
0b7467d docs(spec): Pack A séance — annuler série + humeur + micro-copy audit

---

## [1.7.0] — 2026-06-13

bb62981 docs(journal): S34 échauffement auto — decisions + livraisons
24cf549 fix(warmup): warmupWorkWeight depuis useSession + tests flow warmup
ae1fb03 feat(warmup): seeds — supprimer bloc Échauffement hardcodé bench + DELETE cleanup
9097c4e feat(warmup): [workoutId].tsx — render WarmupPhase entre transition et travail
cd3a8dc fix(warmup): confirmTransition — guard phase + commentaire fallback
2f1f05d feat(warmup): useSession — phase 'warmup' + confirmWarmup + confirmTransition check
ae9a97b fix(warmup): WarmupPhase — clé stable + style setRowBorder extrait
cb3ffbc feat(warmup): WarmupPhase — écran échauffement dédié
10bbcee feat(warmup): computeWarmupSets + shouldShowWarmup — TDD 11 tests
dd278f3 docs(plan): échauffement auto — 5 tasks, TDD, WarmupPhase, useSession, seeds cleanup
953735b docs(spec): échauffement auto — phase dédiée, protocole 3 séries 40/60/80%
63951c5 docs(journal): S33 — décharge automatique
ec0b5d5 fix(deload): fallback global findAll + guard bar type + copy + reglages guard
f388216 feat(reglages): config décharge automatique — segmented control 4/6/8 semaines
9629443 feat(session): intégrer DeloadService — isDeloadSession + poids déchargés + record + bannière
aa66b6f feat(SummaryPhase): card anticipation décharge — suggestion prochaine séance
e42a675 feat(CheckInPhase): card décharge — suggestion + appliquer/passer
1c11d0b fix(deload): tests applyDeloadToExercises + date comparison + MS_PER_DAY constant
60689fc feat(deload): DeloadService TDD — shouldSuggestDeload + recordDeload + applyDeloadToExercises
bf7229f docs(plan): décharge automatique — 5 tâches TDD + intégration
7391b31 docs(spec): clarifier CheckInPhase callback onDeloadApplied — signature onStart inchangée
791cbd1 docs(spec): décharge automatique — trigger calendaire + flow UX + architecture
41c6a55 docs: journal S32 — détection plateau
5717836 fix(session): gérer erreur detectPlateaus avec .catch
b206347 feat(session): détecter et afficher plateaux en SummaryPhase
6449cce feat(SummaryPhase): card plateau — même charge depuis 3 séances
36d92bc fix(plateau): sessionsCount from map size, add exerciseId assertion
b0371da feat(plateau): PlateauDetectionService TDD — détecte même poids × 3 séances
282901f docs: plan implémentation détection plateau — 3 tasks
ecad035 docs: spec détection plateau — PlateauDetectionService + SummaryPhase
3ddede6 docs(philosophie): design doc + CLAUDE.md — entraînement sérieux sans mécaniques toxiques
0e745a7 docs: journal S31 — double progression + suppression reps_max
b4a2736 fix(UI): supprimer reps_max — ExerciseTransitionPhase, BlockCard, EditSetModal
d55e061 fix(RunningPhase): supprimer reps_max — cible fixe reps_min
09ff147 fix(types): 0 erreurs TypeScript hors UI (reps_max supprimé)
dc3d3d5 test: supprimer reps_max résiduel dans WorkoutExerciseService.test.ts
bbd936d test: supprimer reps_max des fixtures weightRatio + useSession
4fbebde feat(SessionService): câbler calculateProgression avec exercise.progression_step
09a88e1 refactor(WorkoutExerciseService): supprimer reps_max des DTOs
88618d6 refactor(templates): supprimer reps_max — SetTemplate + helpers s()/work() + TemplateService
4a11102 refactor(seeds): supprimer reps_max — SetSpec + helpers f/bw/barOnly/mob + call sites
60a9697 refactor(repositories): supprimer reps_max — ISetRepository + SQLite + InMemory
7611537 feat(db): migration v9 — suppression reps_max de la table sets
fc3faca refactor(progression): supprimer applyProgression — remplacée par calculateProgression
8e04e38 refactor(repsFeedback): supprimer paramètre repsMax — cible fixe unique
2712ad8 docs(journal): S30 pause séance — décisions + architecture
ab09c15 fix(pause): abandon nav, deload filter, pause error, null guard, cycle rotation
5de731c feat(home): card reprise séance en pause
8e2f8f7 feat(session): pause button + abandon sheet + mount check reprise
9463a92 feat(ui): ResumeSessionCard + testMatch *.test.tsx
19d565a feat(hook): useSession — initialSession prop + pauseSession
ab81f7b feat(utils): shouldWarnAbandon — pure function TDD
67f31dc feat(service): pauseSession, abandonSession, findAnyPausedSession — TDD
a503534 test(repo): contrats pause/abandon/findAnyPaused + complete status
51487ea feat(repo): SessionLogRepository — pause, abandon, findAnyPaused + complete → status=completed
f4db4b3 feat(db): migration v8 — status + paused_position sur session_logs
dd9c1fd docs(plan): pause séance — 8 tâches TDD, migration v8, SessionService, useSession, UI
523ec8b docs(spec): pause séance — DB migration v8, SessionService, useSession, UI
302df21 docs(journal): S29 post-review fixes + known limitation setStartingWeight
c1df3a7 fix(session): badge nom exercice capturé avant await, rpeSection flex:1, cleanup timeout adjustSuccess
ff10bdc chore(release): v1.6.0 — quick wins séance (PR badge, feedback reps, RPE chips, stepper poids)

---

## [1.6.0] — 2026-06-11

013bb2e fix(session): guard Confirmer poids contre double-tap async
f4ceed5 feat(session): stepper poids — modifier charge séries suivantes depuis RunningPhase
f352a98 feat(session): feedback reps — hint inline si écart > 25% cible
7049cd8 feat(session): RPE — remplace TextInput libre par chips Facile/Normal/Difficile
bf2f151 fix(session): handleValidate dep array — [session.validateSet, session.currentExercise]
6052e7c feat(session): badge PR flash — overlay 3s non-bloquant après validation série
dce8995 feat(session): useSession.validateSet retourne isPR
3a60656 feat(session): SessionService.logSet retourne isPR — détection PR en temps réel
af6c8ed feat(session): computeRepsFeedback — feedback proportionnel écart reps
3667583 docs(plan): quick wins séance — plan implémentation 8 tâches TDD
92d0700 docs(spec): quick wins séance — PR badge, feedback reps, RPE chips, redéfinir poids
b151412 docs: journal S28 + nettoyage plans livrés

---

## [1.5.1] — 2026-06-11

8ebeb5b feat(ui): section DONNÉES dans Réglages — bouton export JSON avec share sheet
aa23278 feat(export): ExportService — full JSON dump via share sheet (TDD, 3 tests)
969d942 fix(session): ExerciseStartingWeightPhase — inline error message on confirm failure
5a9daf9 fix(seeds): seed conservative starter weights for all PPL fixed-weight exercises
fb99261 docs(plan): bugs terrain + export JSON — plan 2026-06-11
d6b070a docs(spec): bugs terrain + export JSON — design 2026-06-11
3b21896 feat(summary): volume total séance — SummaryPhase + useSession
82f4bf2 feat(session): aperçu séance + durée estimée dans CheckInPhase
e60e271 feat(session): refonte flow skip — un seul 'Passer →' → BottomSheet série / exercice entier
3e920eb chore: fix eslint-config-expo duplicate — move to devDependencies only (v10→v56)
0e2ccb6 feat(session): bouton '?' + BottomSheet description exercice dans RunningPhase

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
