# Changelog

Toutes les modifications notables sont documentées ici.
Format : [Semantic Versioning](https://semver.org/). Types : `feat`, `fix`, `ux`, `refactor`, `docs`, `chore`.

---

## [1.24.5] — 2026-06-19

94fe547 fix(session): decompte 3-2-1 via Modal (centrage garanti)
f63d589 fix(session): decompte 3-2-1 centre horizontalement
069f044 fix(session): decompte 3-2-1 centre en overlay plein ecran

---

## [1.24.4] — 2026-06-19

a1c4057 feat(android): navigation bar suit le theme dark/light
2706d79 feat(reglages): long-press version => reset donnees de test

---

## [1.24.3] — 2026-06-19

b35fae9 fix(session): pause button safe area via SafeAreaView edges top

---

## [1.24.2] — 2026-06-19

6a35a97 fix(session): description sheet — titre dans BottomSheetScrollView
e9fed96 feat(session): exercices étirement — vue simplifiée sans saisie ni RPE
bd85da3 fix(copy): PC → Poids de corps partout (RunningPhase, BlockCard, EditSetModal)
f990ccf fix(session): bouton pause inline — supprime position:absolute

---

## [1.24.1] — 2026-06-19

a935da8 feat(session): finir la séance + décompte 3-2-1 chrono durée
636d0ba fix(session): 6 bugs terrain — layout, timer, badge, RPE, sheet
1b7f0e2 docs(plans): archiver plans S51 — audit fonctionnel + design polish + philosophie-ux + usage une main
f573445 docs(journal): session S51 — design polish + onboarding refonte 8→4 + v1.24.0

---

## [1.24.0] — 2026-06-19

0954458 feat(home): setLabel affiche durée + liens texte non-lime + service Brzycki 1RM
ff46d18 test(repos): contract tests + InMemory/SQLite impls pour deleteBySessionLogId (3 repos)
b78334b refactor(design): SemanticColors → Colors semantic tokens (primaryText/positiveText/negativeText/destructiveText)
db062e5 refactor(onboarding): réduire de 8 à 4 écrans (welcome/program/settings/ready)

---

## [1.23.0] — 2026-06-19

0d46e89 design: dropset badge pink-700 #be185d (était bleu lien #2563eb)
ac36485 design: standardiser labels CTA — uppercase + FontFamily.bold + LetterSpacing.max
1407541 fix(session): RunningPhase — centrage vertical, CircularTimer done state, guard cardio starting weight
1717ab6 refactor(warmup): redesign WarmupPhase — safe area, table layout, skip option, CTA design system

---

## [1.22.0] — 2026-06-19

034b22b refactor(session): redesign phase — bouton pause + sheets mutex + check-in + timer résistant à la pause
0525f47 fix(session): batch terrain bugs — timer, seeds, emojis, safe area, layout
220b2f2 fix(onboarding): affiche l'unité système résolue (kg/lbs) sous le contrôle Système
3dba2ac fix(onboarding): bouton Passer visible sur tous les écrans (pas seulement le premier)
458e9fd fix(onboarding): safe area bottom — boutons Commencer/Continuer cachés par nav Android
7f99044 chore(eas): add projectId + Android camera permissions
a347a50 chore: setup EAS Build + journal S50

---

## [1.21.2] — 2026-06-19

b69c858 feat(history): supprimer une séance + harmonisation couleur lime

---

## [1.21.1] — 2026-06-18

cd29365 feat(history): afficher ressenti post-séance (moodAfter) dans le détail séance
a59287c docs(journal): session 12 — RGAA audit + Brzycki 1RM + WelcomeScreen

---

## [1.21.0] — 2026-06-18

01cdb57 feat(onboarding): bouton Passer sur premier écran
29a9d6e fix(home): ScrollView sur écran Séance — contenu plus jamais coupé
d8082e2 fix(a11y): status bar light-content dark mode + tab bar contrast RGAA AA
3dc6469 docs(claude): LetterSpacing scale complète + règle fontWeight interdit
968b31e fix(tokens): fontWeight strings → FontFamily tokens (32 fichiers)
8c9e51a feat(tokens): LetterSpacing display/hero négatifs + appliquer sur éléments Black
ff29f4a fix(design): prBadge → lime #84CC16 + texte noir (directive accent unique)
c3f9ad8 fix(tokens): barres historiques exercice → colors.textDisabled (dark-first)
55cd716 fix(tokens): SemanticColors positive/negative/prBadgeTint + appliquer dans composants
9a3b8a6 fix(tokens): borderRadius 16/20 → Radius.md / Radius.xs
3773e03 docs: CLAUDE.md tokens + journal S49f (v1.20.0 tokenisation)

---

## [1.20.0] — 2026-06-18

abb4a9c refactor(tokens): borderRadius 4 → Radius.sm (manqué en T1)
973c876 refactor(tokens): Spacing rétroactif — 54 fichiers, multiples de 4
5c9892e refactor(tokens): LetterSpacing token — 41 occurrences, harmonise 0.4/1.2/1.5
0e7fb64 refactor(tokens): borderRadius 10 → Radius.lg (harmonise à multiple de 4)

---

## [1.19.5] — 2026-06-18

252f13c refactor(tokens): FontFamily — remplacer strings Inter_ par constantes
25dce6e refactor(tokens): Radius.lg=12 — centraliser borderRadius dans composants

---

## [1.19.4] — 2026-06-18

561defc refactor(tokens): centraliser couleurs sémantiques dans SemanticColors.ts
b0e4116 feat(tokens): ajouter Spacing.ts — scale xs/sm/md/lg/xl/xxl/xxxl

---

## [1.19.3] — 2026-06-18

3cf5deb fix(ux): Confirmer footer fixe — bouton visible quand clavier ouvert
2924f61 fix(ux): Passer → footer fixe en séance, actionBtn padding 12

---

## [1.19.2] — 2026-06-18

1c825ad fix(a11y): accessibilityHint sur DÉMARRER désactivé; renforcer test session fantôme
16d7c8e fix(session): masquer ResumeCard si workout supprimé, abandonner session fantôme
a833d10 fix(home): désactiver DÉMARRER si workout sans exercices

---

## [1.19.1] — 2026-06-18

0b158d5 feat(onboarding): PhilosophyScreen — copy manifeste validé, titre 40px Black
e368d31 fix(copy): supprimer 'Progression stagnante' — ETA non calculable suffit
39a0c86 fix(notif): message inactivité factuel, sans punition de l'absence

---

## [1.19.0] — 2026-06-18

55444d1 fix(design): Inter fontFamily + colors.primary in session transition components
6b14312 feat(design): T9 global audit complete — onPrimary + Inter fontFamily
bed2cb6 feat(design): global audit — colors.onPrimary on all lime button text
1364c51 fix(design): Réglages — Inter fontFamily replaces fontWeight strings
013c0ec feat(design): Réglages — full B&W, zero lime
18cc3bb fix(design): Progression — onPrimary text, Inter fontFamily
0e411ca feat(design): Progression — onPrimary segment text, textDisabled past bars
432840b fix(ui): replace fontWeight with Inter_600SemiBold in ProgramCard
7d8696c feat(design): ProgramCard — active state via left lime border, remove badge
11815dc fix(session): use Inter_700Bold font instead of fontWeight in progressionNew style
a030db7 fix(style): align cardio form styles with design system
46543a0 fix(typography): align SummaryPhase to design system
6d95041 fix(SummaryPhase): Use colors.primary for green accent elements
7abf696 feat(design): SummaryPhase — 3-stat grid, PR card, neutral chips, lime CTA
ce0c719 feat(design): CircularTimer lime arc always, RestPhase cleanup
f84fec5 feat(design): RunningPhase — lime CTA (minH 64), SeriesProgressBar, fix hardcoded colors
02d95b8 fix(design): cycle dots — remove hardcoded transparent backgroundColor
82ae7a7 feat(design): home — structured header, cycle dots, exercise preview, lime CTA
48ed05d docs(design): plan passe design v1
7dce2e0 chore(design): update Colors.ts — lime primary + onPrimary token
8772fd2 docs(design): nom app Trace (provisoire) dans directives design
c22291b docs(design): add UI design system directives — Tactique/Data + Lime accent

---

## [1.18.0] — 2026-06-17

7bc8cf5 fix(a11y): accessibilityLabel Revoir l'introduction dans réglages
49c02b7 feat(onboarding): Réglages — aide contextuelle (?) + bouton revoir l'introduction
037c860 feat(onboarding): ReadyScreen — résumé wizard + CTA
4891b76 feat(onboarding): ProgressionScreen — aperçu onglet progression
0da04a1 feat(onboarding): SettingsIntroScreen — unités + pas de plaque configurables inline
66d4dea feat(onboarding): SessionDemoScreen — démo séance interactive (replica autonome)
cba4256 feat(onboarding): ProgramScreen — templates filtrés par objectif, import inline
23b7ed6 feat(onboarding): ObjectiveScreen — 4 chips objectif
edbece3 feat(onboarding): PhilosophyScreen — manifeste valeurs
6944da0 fix(onboarding): showDots condition + step clamp on activeScreens change
cb30d46 feat(onboarding): wizard shell + screen stubs
a012d65 feat(onboarding): redirect to /onboarding if flag absent
66b3bbf feat(onboarding): shouldSkip pure function TDD
5999284 docs(plan): onboarding — 11 tasks TDD, wizard 7 écrans
416a7d9 docs(spec): onboarding wizard — 7 screens, single-route, living demo
62f59d8 feat(templates): add PPL Push/Pull/Legs template

---

## [1.17.1] — 2026-06-17

ab542e5 chore(deps): eslint-config-expo 56 → 10.x (SDK 54 compatible)
e78a9f3 fix(session): BottomSheetModalProvider manquant dans _layout
d4fa531 fix(notifications): createNotificationScheduler — fallback InMemory dans Expo Go
0323a52 docs(journal): S48 fin — eslint-a11y CI + ordre backlog
3e60249 fix(lint): eslint-plugin-react-native-a11y + fix 0 warnings
c365cde ci(a11y): add eslint-plugin-react-native-a11y to ESLint config

---

## [1.17.0] — 2026-06-15

d927951 docs(journal): S48 — Partage programme + Mesures corporelles + Notifications
6b4afb5 feat(notifications): reschedule inactivité après fin de séance
47f4e08 feat(notifications): vérification inactivité au lancement
95751cf feat(notifications): section notifications dans réglages
4a673d6 feat(notifications): ExpoNotificationScheduler — prod impl
54efd64 feat(notifications): NotificationService TDD — 7 tests
ed5d07a feat(notifications): INotificationScheduler + InMemoryNotificationScheduler
519e8bf chore(deps): install expo-notifications
e6ac995 feat(progression): segment Corps — mesures corporelles avec graphiques
884bf99 feat(progression): LatestMeasurementsCard + BodyMeasurementChart
7269585 feat(AddMeasurementSheet): BottomSheet saisie mesures corporelles
2d87a38 feat(useBodyMeasurements): hook — measurements + latest + save + refresh
2a7e110 feat(BodyMeasurementService): TDD — save/getHistory/getLatest
660f0f0 fix(repo): contract async factory + SQLiteBodyMeasurementRepository tests passants
891185c feat(repo): SQLiteBodyMeasurementRepository — upsert par date
53116ac feat(repo): IBodyMeasurementRepository + InMemory + contrats TDD
6483750 feat(db): migration v15 — table body_measurements
8c94774 feat(partage-programme): bouton Partager + scanner QR intégrés
e9d5c90 fix(_layout): deep link import guard — évite les imports doublons
0fd3ef1 feat(_layout): deep link handler app://import pour importer programme via QR
19ac880 feat(scan-programme): scanner QR code pour importer un programme
4eaba16 fix(ShareQRModal): correct directory path from programmes/ to programme/
c5bc8a9 feat(ShareQRModal): modal QR code partage programme
1152cdf fix(ShareProgramService): importPayload — noms uniques pour imports multiples
efead2c feat(ShareProgramService): importPayload TDD — round-trip + conflit nom
59cb845 feat(ShareProgramService): generatePayload — sérialise programme complet
e15402c feat(ShareProgramService): compressPayload/decompressPayload TDD
6ef293f chore(deps): install pako + react-native-qrcode-svg + expo-camera

---

## [1.16.0] — 2026-06-15

59cd866 docs(journal): S47 — pack doublons + recueil cardio + import GPX
2f72665 feat(gpx): bouton 'Importer un footing' dans progression.tsx
636852a feat(gpx): écran import-gpx.tsx
50d4496 feat(gpx): GpxImportService.importGpx + importParsed TDD
7768124 feat(gpx): GpxImportService + findOrCreateFootingSetup TDD
728c492 feat(gpx): parseGpxFile TDD avec fast-xml-parser
788edb8 feat(gpx): haversine TDD + install fast-xml-parser + expo-document-picker
3c83fd8 fix(session): add .catch on cardio detection useEffect
27fd59f feat(session): détection sets cardio vides + câblage recueil post-séance
cdbddbd feat(session): card recueil cardio dans SummaryPhase
f7991ce feat(service): SessionService.saveCardioData
2f0f149 feat(repo): updateCardioData sur ISetLogRepository
17aa974 feat(service): DuplicateExerciseError + guard doublons dans ExerciseService.create
d65db81 fix(repo): trim both sides in InMemoryExerciseRepository.findByName
aae147d feat(repo): findByName sur ExerciseRepository (COLLATE NOCASE)
9df7ce2 docs(plans): pack doublons-exercices + recueil-cardio + import-gpx
0a5f408 docs(spec): fix recueil cardio — premier set_log uniquement
cf03f70 docs(spec): pack doublons + recueil cardio + import GPX
b93b831 docs(journal): S46 — historique cardio + suppression sécurisée v1.15.0

---

## [1.15.0] — 2026-06-14

ab3a52f feat(ui): suppression exercice — swipe + guard sessions/programmes
82f547f feat(ui): ExerciseCard — swipe-left pour supprimer
1586d89 feat(hook): useExercises — expose deleteExercise avec SafeDeleteConflict
84b48a4 fix(service): SafeDeleteConflict.name + spy test force=true
fa441a0 feat(service): ExerciseService.safeDelete + SafeDeleteConflict
a5da871 fix(repo): findByExerciseId — ORDER BY order_index (SQLite + InMemory)
a20ef97 feat(repo): findByExerciseId sur WorkoutExerciseRepository
221e040 fix(progression): hide goal section for cardio exercises
5bf1132 feat(history): affichage cardio km/durée dans historique exercice
50d7206 fix(history): computeBestSet — type predicate narrowing + test assertion
7bf9851 feat(history): ExerciseHistoryService — cardio fields + computeBestSet
d8dba08 docs(plan): historique cardio + suppression sécurisée exercice
94249f4 docs(spec): historique cardio + suppression sécurisée exercice
d09778f docs(journal): S45 — substitution rapide + post-review fixes

---

## [1.14.0] — 2026-06-14

ab0cefa fix(session): substitution — progression guard + BottomSheetTextInput + loading state + a11y
253f3c9 feat(session): wiring substitution rapide dans SessionContent
bad7616 feat(session): RunningPhase — bouton Remplacer + indicateur substitution
d6d41df fix(session): SubstituteSheet — BottomSheetFlatList + catch sur findAll
a024b49 feat(session): SubstituteSheet — picker exercice lazy avec filtre muscle group
5013f6b feat(session): substituteCurrentExercise — effectiveDetails override dans useSession
f23a112 docs(plan): substitution rapide — plan implémentation 4 tâches
3b5437c docs(spec): fix hasLoaded useRef + empty state SubstituteSheet
066ea46 docs(spec): substitution rapide exercice en séance — design v1

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
