# Journal de projet — Training App

Journal chronologique du projet, du lancement à la release. Chaque session est documentée : ce qui a été demandé, les décisions prises, les problèmes rencontrés et les choix retenus avec leur raison.

---

## S51 — 2026-06-19 — Design polish + onboarding refonte + v1.24.0

### Livré

- **Standardisation CTA (18 fichiers)** : uppercase + `FontFamily.bold` + `LetterSpacing.max` sur tous les boutons primaires. Commit `ac36485`.
- **Dropset badge** : `#2563eb` (bleu lien) → `#be185d` (pink-700). Contraste blanc 5.6:1 WCAG AA. Commit `0d46e89`.
- **Onboarding refonte 8→4 écrans** : suppression PhilosophyScreen, ObjectiveScreen, SessionDemoScreen, ProgressionScreen. Flow : Welcome → Program → Settings → Ready. `WizardState.objective` retiré. ProgramScreen montre tous les templates sans filtrage. CTA IMPORTER ET CONTINUER uppercase. 7 tests passants. Commit `db062e5`.
- **Colors semantic tokens** : `primaryText`/`positiveText`/`negativeText`/`destructiveText` (dark+light). Exercise1RMCard, VolumeBarChart, reglages, _layout migrés de SemanticColors → colors.xxx. Commit `b78334b`.
- **Repository contract tests** : `deleteBySessionLogId` sur 3 repos (personalRecord, sessionLog, setLog) — interface + InMemory + SQLite + 12 contract tests. Commit `ff46d18`.
- **Home screen** : setLabel affiche durée (`Ns`) pour exercices durée. Liens "Créer/Configurer" → `colors.text` + underline (règle 1 élément lime). Brzycki service commité (`brzycki.ts` + `brzycki.test.ts`, 9 tests). Commit `0954458`.

### Décisions

- **Onboarding 4 écrans vs 8** : ObjectiveScreen enlevée → ProgramScreen montre tous les templates (`TEMPLATES` direct). Pas de perte fonctionnelle — filtrage par objectif était une friction inutile.
- **PhilosophyScreen supprimée** : trop abstraite pour un 1er lancement. La philosophie reste dans CLAUDE.md (filtre décision) mais pas imposée à l'utilisateur à l'onboarding.
- **Plans S49g stale** : tous les correctifs des plans audit-fonctionnel, usage-une-main, philosophie-ux, design-polish étaient déjà en place dans le codebase. Commit de nettoyage des fichiers en attente.

### Prochaine étape

Build APK v1.24.0 via EAS. Semaine test terrain. Audit RAAM 1.1 + Code Craft en fin de semaine.

---

## S50 — 2026-06-19 — Suppression séance + lime harmonisation + setup EAS Build

### Livré

- **Supprimer une séance** : cascade complète PRs → set_logs → session. `HistoryService.deleteSession()` TDD 5 tests (RED→GREEN). `SQLiteSetLogRepository.deleteBySessionLogId` + `SQLitePersonalRecordRepository.deleteBySessionLogId`. PRs `session_log_id=null` préservés. UI : bouton destructif en bas de `[sessionLogId].tsx` + `Alert.alert` confirmation. `HistoryService` 5e arg `IPersonalRecordRepository`. Callsites `useHistory.ts` + `[sessionLogId].tsx` mis à jour. Commit `b69c858`.
- **Lime harmonisation** : `ExerciseTransitionPhase` — suppression cas spécial étirement (`#16a34a`), tous non-cardio → `colors.primary`. `workout/[id].tsx` — bouton "Démarrer la séance" corrigé (`SemanticColors.stretch` → `colors.primary`, était un bug affectant tous les programmes). Même commit `b69c858`.
- **Setup EAS Build** : `app.json` → `android.package: "com.sylvain.trace"` + plugins `expo-notifications`/`expo-camera` manquants. `eas.json` créé avec profiles `preview`/`production` (buildType: apk). Commit `f510c42` (avec bump v1.21.2).

### Décisions

- **`eas.json` buildType apk** : APK direct (pas AAB) pour installation manuelle sur Android sans Play Store — usage personnel.
- **`deleteSession` ordre cascade** : PRs en premier (référencent session_log_id), puis set_logs, puis session_log. Ordre inverse des foreign keys.
- **PRs null préservés** : `deleteBySessionLogId` ne supprime que `session_log_id = ?` (pas null). Garantit que les anciens PRs sans lien de session ne sont pas effacés.

### Prochaine étape

Semaine de test terrain avec l'APK buildé via EAS. Retour : corrections ciblées → audit fonctionnel → audit RAAM 1.1 → audit Code Craft → v2.0.0.

---

## S49g — 2026-06-18 — Design polish : plan 5 tâches exécuté (subagent-driven)

### Livré

- **T1 — borderRadius 16/20 → tokens** : chips → `Radius.xs` (2), modales → `Radius.md` (8). 4 fichiers. Commit `9a3b8a6`.
- **T2 — SemanticColors** : ajout `positive`/`negative`/`prBadgeTint`. 7 composants tokenisés (Exercise1RMCard, VolumeBarChart, ProgramScreen, reglages, workoutId, workout/[id]). Commit `55cd716`.
- **prBadge → lime** : `SemanticColors.prBadge` `'#ca8a04'` → `'#84CC16'` (lime, directive accent unique). `prBadgeTint` → `rgba(0,0,0,0.65)` (texte sur lime). `prBadgeTitle` `'#fff'` → `'#000'`. Commit `ff29f4a`.
- **T5 — barres historiques** : `[exerciseId].tsx` barres non-actives `'#1E40AF'`/`'#BFDBFE'` → `colors.textDisabled`. Dark-first, plus de conditionnel colorScheme pour les couleurs. Commit `c3f9ad8`.
- **T4 — LetterSpacing négatifs** : ajout `display:-3` (96px+) et `hero:-2` (48-72px). Appliqué sur SessionDemoScreen (64px timer → hero, 32px title → tighter) et ReadyScreen (32px → tighter). Commit `8c9e51a`.
- **T3 — fontWeight → FontFamily** : 95 occurrences dans 32 fichiers. `'700'→FontFamily.bold`, `'600'→semibold`, `'500'→medium`, `'400'→regular`, `'900'→black`. Script Node.js, 0 doublons imports, typecheck 0 errors. Commit `968b31e`.

### Décisions

- **prBadge gold→lime** : le reviewer code quality a signalé l'incohérence avec la directive "accent unique" dans CLAUDE.md. Fix appliqué immédiatement à la demande de l'utilisateur.
- **chips Radius.xs=2** : 2px est intentionnellement plat (design system direction "flat"). Pas Radius.sm=4 — direction "chips = micro-badges" validée.
- **fontWeight '800'/'300' exclus** : pas de token FontFamily correspondant, laissés tels quels (rare, fonts custom Inter ne les supporte pas réellement).
- **LetterSpacing.display** : token créé mais non utilisé (aucun element 96px+ dans le codebase actuel). En attente future implémentation hero timer.

### Méthode

Subagent-Driven Development (écriture-plans → T1→T2→T5→T4→T3 séquentiels). Review spec + qualité après chaque tâche. 6 commits net.

---

## S49f — 2026-06-18 — Tokenisation design system complète (v1.20.0)

### Livré

- **`LetterSpacing` token** (`constants/Typography.ts`) : 7 clés (tighter/tight/wide/wider/widest/spaced/max). 41 occurrences remplacées dans 22 fichiers. Harmonisations : 0.4→wide, 1.2→widest, 1.5→spaced (delta ≤0.1).
- **`borderRadius: 10` → `Radius.lg`** (9 occurrences, 7 fichiers). `borderRadius: 4` → `Radius.sm` (5 occurrences, 3 fichiers).
- **Spacing rétroactif** : 54 fichiers, ~350 occurrences padding/margin/gap remplacées. Harmonisations hors-scale (multiples de 4) : 6→sm, 10→md, 14→lg, 18→xl.

### Décisions

- **Multiples de 4** : règle imposée par l'utilisateur. Tous les tokens Spacing sont des multiples de 4. Les valeurs hors-scale (6, 10, 14, 18) harmonisées vers le multiple de 4 le plus proche.
- **Typography hors ×4** : `fontSize` et `letterSpacing` ne suivent PAS la règle ×4 — ils obéissent à une échelle typographique modulaire. Exception justifiée par nature différente (pas des unités spatiales).
- **Exceptions documentées** : `Radius.xs=2` (micro-badge, 4px trop rond), micro-spacing 1-3px (barres progression), offsets layout 40/48/60/80/100px (hors design system, intentionnels).
- **`borderRadius: 16/20`** restent en raw — hors scale "rester flat", à harmoniser lors d'une prochaine passe design.
- **Bug regex Node.js** : `(?!\d)` dans template literal heredoc bash perdait le backslash → `(?!d)`. Contournement : utiliser `([^0-9]|$)` avec fonction de remplacement qui capture le char trailing.

### Version

`v1.20.0` — bump minor (tokenisation systématique = refactoring significatif), poussé avec tag.

---

## S49c — 2026-06-18 — Audit fonctionnel réel : 2 bugs corrigés

### Livré

- **T1 — DÉMARRER disabled si 0 exercices** (`app/(tabs)/index.tsx`) : bouton opacity 0.4, `accessibilityState.disabled`, `onPress=undefined`, hint text "Cette séance n'a pas encore d'exercices." sous le bouton. `accessibilityHint` pour screen readers. Commits `a833d10` + `1c825ad`.
- **T2 — ResumeSessionCard masquée si workout supprimé** (`services/SessionService.ts`) : `findAnyPausedSession()` abandonne la session fantôme (`sessionLogRepo.abandon(...)`) et retourne `null` si le workout lié n'existe plus. TDD : test RED/GREEN avec assertion `status === 'abandoned'`. Commits `16d7c8e` + `1c825ad`.

### Décisions

- **Session fantôme → abandon** : plutôt que simplement ignorer, on abandonne la session pour nettoyer l'état DB. Pas de boucle sur plusieurs sessions — invariant déjà garanti par `startSession` (throw si session en pause).
- **DÉMARRER toujours visible** : on choisit opacity 0.4 plutôt que masquer le bouton — l'utilisateur voit qu'il peut démarrer, comprend que quelque chose manque. Action disponible mais bloquée = meilleure affordance que bouton absent.
- **accessibilityLabel constant** : `"Démarrer [nom]"` toujours, raison dans `accessibilityHint` (pattern WCAG).

### Version

`v1.19.2` — bump patch, poussé avec tag.

---

## S49b — 2026-06-18 — Audit philosophie anti-perf + correctifs UX

### Livré

- **Audit anti-perf 6 axes** : aucun anti-pattern supplémentaire trouvé dans le code (copy PR/marques, présences ce mois, onglet Progression données tirées, home sans stats poussées, helpText reglages.tsx excellent). 3 violations identifiées et corrigées.
- **T1 — Notification inactivité** : `"Tu n'as pas fait de séance depuis X jours. C'est le moment de reprendre 💪"` → `"Prêt pour une séance ? Ton programme t'attend."`. TDD : test ajouté vérifiant que le body ne contient pas de pattern punitif. `InMemoryNotificationScheduler.getScheduled()` expose désormais `body`. Commit `39a0c86`.
- **T2 — Copy "Progression stagnante"** : `"Progression stagnante — ETA non calculable"` → `"ETA non calculable"` (deux occurrences dans `progression/[exerciseId].tsx`). Retire le jugement de valeur sur la progression. Commit `e368d31`.
- **T3 — PhilosophyScreen écran 0** : copy mise à jour avec le texte exact du manifeste validé — "Bienvenue." 40px Black, intro "Elle n'est pas là pour te juger", deux blocs neutres. Suppression des blocs "Ce que tu ne trouveras pas / Ce que tu vas trouver". CTA `colors.onPrimary`, `Inter_900Black`. Commit `0b158d5`.

### Décisions

- **PhilosophyScreen = écran 0** : le spec a été écrit avant l'implémentation du wizard. La PhilosophyScreen existante est l'écran 0 — update copy plutôt qu'ajout d'un 8e écran (YAGNI).
- **Weekly notif `"C'est l'heure de t'entraîner 💪"` conservée** : notification opt-in explicite (utilisateur a choisi jour+heure) — pas un anti-pattern.
- **`#22C55E`/`#EF4444` dans VolumeBarChart** : couleurs sémantiques data viz (delta ↑↓), conservées — déjà décidé session précédente.

### Résultats audit

- Axe 1 Architecture de l'information : ✅ home = action uniquement, Progression = données tirées
- Axe 2 Nommage : ✅ "MARQUES", "Présences ce mois", copy factuelle
- Axe 3 Mécanismes punition : ❌→✅ notification inactivité corrigée
- Axe 4 Flèche : ✅ PR célébré, absence ignorée, présences additives
- Axe 5 Onboarding : ❌→✅ PhilosophyScreen copy alignée avec manifeste
- Axe 6 Filtre décision : ✅ dans CLAUDE.md

---

## S49 — 2026-06-18 — Passe design : système Tactique/Data, lime accent, Inter

### Livré

- **Colors.ts foundation** : `primary` dark `#FFFFFF` → `#84CC16`, `primary` light `#0D0D0D` → `#84CC16`, token `onPrimary: '#0D0D0D'` ajouté aux deux palettes, `tint` aligné. Commit `7dce2e0`.
- **Home** : suppression hero barbell + titre. `CycleDots` inline (8px, lime=done, border=upcoming). Prévisualisation "AU PROGRAMME" (5 premiers exercices). Chips sélection séance : `surfaceElevated` inactive, `primary`/`onPrimary` active. CTA `DÉMARRER` pleine largeur, uppercase, `letterSpacing:2`, `minHeight:60`, `onPrimary`. Commits `82ae7a7` + `02d95b8`.
- **`SeriesProgressBar`** : nouveau composant `components/ui/SeriesProgressBar.tsx` — segments flex, lime=done, border=upcoming. Remplace les dots GestureDetector dans `RunningPhase`. Commit `f84fec5`.
- **RunningPhase** : `SeriesProgressBar` à la place des dots. `VALIDER` : `colors.primary` bg, `onPrimary` text, `minHeight:64`, uppercase `letterSpacing:2`. Cardio + durée : même traitement. RPE chips sélectionné : `onPrimary`. `blockBadge` text → `textSecondary`. Badges non-lime (`#7c3aed` superset, `#ea580c` AMRAP, `#2563eb` dropset, `#dc2626` destructif) **conservés intentionnellement** (couleurs sémantiques). Commit `f84fec5`.
- **CircularTimer + RestPhase** : suppression `arcColor()` traffic-light (vert/ambre/rouge). Arc toujours `colors.primary`. Texte timer toujours `colors.text`. RestPhase : suppression `phaseLabel` standalone ("REPOS"), fond toujours `background`, bouton toujours outline, timer 200→220. Commit `ce0c719`.
- **SummaryPhase** : hero compact (`heroLabel` uppercase + `heroDuration`). Grid 3 stats (Séries / Durée / Volume). PR card (`✦` lime, titre lime, sous-titre `textSecondary`, gate `progressionCount > 0`). Chips humeur/tags/RPE cardio → `surfaceElevated` sélectionné (non-lime). CTA `RETOUR AU PROGRAMME` `onPrimary`. Stats en `Inter_900Black`. Commits `7abf696` + `6d95041` + `46543a0` + `a030db7` + `11815dc`.
- **ProgramCard** : suppression badge "actif" lime + `ACTIVE_BADGE_TEXT_COLOR`. Programme actif = `borderLeftWidth:3, borderLeftColor:colors.primary`. Commits `7d8696c` + `432840b`.
- **Progression** : segment sélectionné `colors.onPrimary` (remplace `'#fff'`). Barres passées chart `colors.textDisabled` (remplace `#1E40AF`/`#BFDBFE`). Commits `0e411ca` + `18cc3bb`.
- **Réglages** : zéro lime. `SegmentedControl` sélectionné → `surfaceElevated`. Chips jours notif → `surfaceElevated`. `ActivityIndicator` + flèche export → `textSecondary`. Commits `013c0ec` + `1364c51`.
- **Audit global (T9)** : ~30 fichiers audités. Haiku pass → Opus repass (bugs haiku manqués). Onboarding CTAs utilisaient `colors.background`-on-lime (cassé light mode) → `onPrimary`. `ExerciseStartingWeightPhase` `#fff`-on-lime → `onPrimary`. `ExerciseTransitionPhase` texte dynamique (lime→`onPrimary`, orange/vert→`'#fff'` intentionnel). `colors.tint` → `colors.primary` (canonique). Session transition components : `fontWeight` strings → Inter fontFamily. Commits `bed2cb6` + `6b14312` + `55444d1`.

### Décisions

- **`colors.onPrimary` jamais `'#fff'`** : token dédié (`#0D0D0D`) sur fond lime. Raison : dark mode `'#fff'`-sur-lime fonctionne, light mode aussi, mais `onPrimary` est explicite et theme-aware.
- **Chips humeur/tags/RPE → `surfaceElevated` (non-lime)** : règle "1 seul élément lime par écran au repos" — libère le lime pour la CTA principale uniquement.
- **Traffic-light supprimé dans `CircularTimer`** : couleur rouge countdown = anxiogène, contraire à la philosophie anti-perf. Arc toujours lime.
- **`phaseLabel` "REPOS" supprimé** : redondant avec le label dans le timer circulaire. Réduction du bruit visuel.
- **Badges sémantiques conservés** : `#7c3aed` superset, `#ea580c` AMRAP/cardio, `#2563eb` dropset, `#dc2626` destructif — couleurs sémantiques intentionnelles, hors design system lime.
- **`#22C55E`/`#EF4444` dans VolumeBarChart** : couleurs data viz (delta ↑↓), pas de token équivalent dans Colors.ts — conservées.
- **`#dc2626` dans reglages.tsx** : message d'erreur export — couleur sémantique erreur, hors directive B&W.
- **Subagent-Driven Development** : T9 initialement confié à Haiku → Haiku a manqué `colors.background`-on-lime (pattern non-évident). Opus a détecté et corrigé. Règle : T9-type global audit = Sonnet minimum, Opus préférable.

### Problèmes rencontrés

- **Limite hebdomadaire Sonnet** : atteinte en cours de session sur T9. Workaround : Opus pour le repass critique. Haiku acceptable pour reviews mécaniques (spec/quality sur 1-2 fichiers).
- **Haiku T9 incomplet** : cherchait `'#fff'` littéral, n'a pas vu `colors.background` utilisé comme couleur de texte sur fond lime (cassé en light mode). Pattern subtil, nécessite compréhension sémantique.
- **Typecheck depuis mauvais répertoire** : les agents lançaient parfois `npm run typecheck` depuis la racine du monorepo au lieu de `app/`. Corriger en précisant `cd app/` dans chaque prompt.

---

## S48 — 2026-06-15 — Partage programme + Mesures corporelles + Notifications

### Livré

- **Partage programme (8 tasks)** : `pako` + `react-native-qrcode-svg` + `expo-camera` installés. `ShareProgramService` : `compressPayload`/`decompressPayload` (deflate + base64, fix stack overflow via `Array.from`), `generatePayload(programId)` sérialise arbre complet (Programme → Workouts → Exercises → Blocks → Sets), `importPayload(base64)` reconstruit en DB avec gestion conflits noms (loop `" (importé-N)"`). `ShareQRModal` QR code. `scan-programme.tsx` scanner `CameraView` + guard `scanned`. Deep link `app://import?data=` dans `_layout.tsx` avec `lastImportedUrl` ref anti-doublon. Bouton partage dans `programme/[id].tsx`, bouton scanner dans `programmes.tsx`. Commits `34ebc31` → `0fd3ef1`.
- **Mesures corporelles (8 tasks)** : migration v15 `body_measurements` (UNIQUE date, metrics REAL nullable). `IBodyMeasurementRepository` + `InMemoryBodyMeasurementRepository` (upsert par date) + `SQLiteBodyMeasurementRepository` (ON CONFLICT DO UPDATE). Contract tests avec **factory async** (`createRepo: () => Repo | Promise<Repo>` + `beforeEach async`) — pattern requis car `runMigrations` est async. `BodyMeasurementService` thin delegation. `useBodyMeasurements` hook (serviceRef + mountedRef). `AddMeasurementSheet` (`forwardRef<AddMeasurementSheetRef>`, 6 champs optionnels). `LatestMeasurementsCard` (filtre nulls). `BodyMeasurementChart` (LineChart, ≥2 points, ordre ASC). Segment "Corps" dans `progression.tsx`. Commits sessions précédentes.
- **Notifications (7 tasks)** : `expo-notifications` installé. `INotificationScheduler` interface + `InMemoryNotificationScheduler` (Map + `setPermission`). `NotificationService` TDD 7 tests : `saveAndReschedule` (save → cancelAll → gate enabled/permission → `scheduleWeekly`), `scheduleInactivityCheck` (null → cancel, récente → once future, overdue → cancel). Conversion ISO→Expo weekday : `(isoDay % 7) + 1`. `ExpoNotificationScheduler` prod (type guards `isWeeklyTrigger` pour iOS `CalendarNotificationTrigger`). Section NOTIFICATIONS dans `reglages.tsx` (toggle, chips jours, HH:MM, chips 3/5/7/14j, `SQLiteSettingsRepository` JSON). `_layout.tsx` : `findMostRecent()` sur `SQLiteSessionLogRepository` (nouvelle méthode, TDD 3 tests) → `scheduleInactivityCheck`. `[workoutId].tsx` : `scheduleInactivityCheck(new Date())` à la fin de séance (gate `phase === 'summary'`). 557 tests, 0 TS errors.

### Décisions

- **`set_type` exclu du `CreateSetDto`** : DEFAULT DB géré par SQLite — `ShareProgramService.importPayload` ne passe pas `set_type` pour les sets importés.
- **`InMemoryNotificationScheduler.getScheduled()` sur l'interface** : méthode de test exposée sur l'interface pour permettre les assertions — pattern acceptable pour testabilité.
- **notifService singleton local par fichier** : `_layout.tsx`, `reglages.tsx`, `[workoutId].tsx` instancient chacun leur singleton local (pas de module partagé) — simple, pas d'over-engineering.
- **`SQLiteSettingsRepository` à la place d'AsyncStorage pour notif settings** : AsyncStorage non installé, `SQLiteSettingsRepository` KV déjà en place — zéro nouvelle dépendance.
- **axe-core ne tourne pas en RN** : pour CI accessibilité → `eslint-plugin-react-native-a11y` (statique RN-natif). Audit RAAM 1.1 reste manuel en fin de backlog.

### Problèmes rencontrés

- **`runMigrations` async → contract tests sync** : `beforeEach` synchrone ne complétait pas les migrations. Fix : factory `() => Promise<Repo>` + `beforeEach(async () => { repo = await createRepo(); })`. **Pattern obligatoire pour tous les futurs tests SQLite.**
- **`btoa(String.fromCharCode(...compressed))` stack overflow** sur large Uint8Array : fix `Array.from(compressed).map(b => String.fromCharCode(b)).join('')`.
- **Importation programme x3** : `includes()` simple ne gérait que le 1er doublon — fix loop `while (names.has(name))` + counter.
- **`ShareQRModal` dans `components/programmes/` (pluriel)** au lieu de `components/programme/` — détecté par spec reviewer, déplacé.
- **`ExpoNotificationScheduler.getScheduled()`** : type `NotificationTrigger` union complexe, trigger `null` possible, iOS retourne `CalendarNotificationTrigger` — type guards `unknown` requis.

### Livré (suite — fin session)

- **eslint-plugin-react-native-a11y en CI** : `has-valid-accessibility-descriptors` (error) + `no-nested-touchables` (warn). 14 problèmes pré-existants corrigés au passage (unescaped entities, unused vars, import order, pako named imports). CI lint exit 0. Commit `3e60249`.
- **v1.17.0** pushé (3 features majeures).

### Décisions (suite)

- **`has-accessibility-hint` désactivé** : 120 violations pré-existantes — à activer lors de l'audit RAAM 1.1 avec contexte VoiceOver/TalkBack réel. Hints écrits sans contexte = mauvaise qualité.
- **Ordre backlog finalisé** : 1. Onboarding → 2. Philosophie/UX → 3. Design pass (Claude Design, manuel) → 4. Audit fonctionnel → 5. RAAM 1.1 → 6. Audit global. Design avant audit fonctionnel : auditer sur la version designée finale.

### Prochaine étape

- **Onboarding** : wizard premier lancement (objectifs → programme → première séance), écran 0 philosophique, "Revoir l'onboarding" depuis Réglages.

---

## S47 — 2026-06-15 — Pack doublons exercices + Recueil cardio + Import GPX

### Livré

- **Doublons exercices** : `findByName(name): Promise<Exercise | null>` ajouté à `IExerciseRepository` (COLLATE NOCASE SQLite, trim+toLowerCase InMemory). `DuplicateExerciseError extends Error` exporté depuis `ExerciseService`. Guard dans `create()` après validation nom. 4 contrats TDD + 4 tests service. Commits `aae147d`, `d65db81`, `17aa974`.
- **Recueil cardio post-séance** : `updateCardioData(id, duration_seconds, distance_meters, rpe)` sur `ISetLogRepository` (InMemory mutation + SQLite UPDATE). `SessionService.saveCardioData` délègue. `SummaryPhase` reçoit `emptyCardioSetLogCount?` + `onSaveCardioData?` — card avec TextInput min/sec/km + chips Léger/Normal/Difficile + boutons Enregistrer/Ignorer. `[workoutId].tsx` : useEffect détecte sets cardio vides au passage en phase `summary`, câble `handleSaveCardioData` (apply sur premier set_log cardio seulement). Commits `2f0f149`, `f7991ce`, `cdbddbd`, `27fd59f`, `3c83fd8`.
- **Import GPX** : `fast-xml-parser` + `expo-document-picker` installés. `haversine(points)` TDD (R=6371000, Math.round). `parseGpxFile(xmlContent)` : XMLParser isArray trkpt/trkseg, tri chronologique, durée premier→dernier, distance Haversine. `GpxImportService` : `findOrCreateFootingSetup` find-or-create chain (Program "Activités libres" → Workout "Sorties libres" → Exercise "Course à pied" cardio → WorkoutExercise → Block → Set). `importGpx(xml)` + `importParsed(data, rpe)` (UI path sans re-parse). Écran `import-gpx.tsx` : picker → résumé (date/durée/distance éditable/sensation) → importParsed → navigation `/progression`. Bouton "Importer un footing" dans `progression.tsx` après "Rechercher un exercice". Commits `788edb8`, `728c492`, `7768124`, `50d4496`, `636852a`, `2f72665`.
- 521 tests, 0 erreurs TypeScript.

### Décisions

- **Pas de contrainte UNIQUE sur exercises.name** : des doublons peuvent exister en DB (données historiques). Guard applicatif uniquement, pas de migration.
- **Recueil cardio appliqué au premier set_log cardio vide seulement** : évite de multiplier les valeurs si plusieurs intervals cardio.
- **`importParsed` vs `importGpx`** : `importGpx` = chemin TDD (parse XML), `importParsed` = chemin UI (data pré-parsée, distance éditable + rpe choisi).
- **`findOrCreateFootingSetup` privée + testée via `(service as any)`** : méthode interne, accès via cast pour les tests.

### Problèmes rencontrés

- **T120 trim asymétrique** : quality reviewer a détecté `e.name.toLowerCase()` sans `.trim()` côté stored — fix `d65db81`.
- **Plan GPX T5 `handleImport` brisé** : plan initial appelait `importGpx(JSON.stringify(...))` — corrigé avant exécution en `importParsed(data, rpe)`.
- **`workoutDetails?.exercises` vs `exercises`** : dans `[workoutId].tsx`, le hook retourne `exercises` directement (pas de wrapper `workoutDetails`). Adaptation correcte.
- **`@/db/database` vs `@/db`** : `getDb` est exporté depuis `db/index.ts` — corrigé dans `import-gpx.tsx`.

---

## S46 — 2026-06-14 — Historique cardio + Suppression sécurisée (v1.15.0)

### Livré

- **Historique cardio** : `ExerciseSetRecord` étendu avec `duration_seconds?` + `distance_meters?`. `computeBestSet` branché sur `isCardio` : max distance → max durée → fallback premier set. Type predicates remplacent les `!` assertions. `formatCardioSet(s)` dans `[exerciseId].tsx` affiche km/durée pour sets et bestSet. Section OBJECTIF cachée si cardio (`!isBodyweight && !isCardio`). TDD 4 tests. Commits `7bf9851` + `50d7206` + `5bf1132` + `221e040`. 
- **`findByExerciseId` WorkoutExerciseRepository** : interface + SQLite (`ORDER BY order_index`) + InMemory (filter + sort). 2 contrats TDD. Commits `a20ef97` + `a5da871`.
- **`ExerciseService.safeDelete(id, force?)`** : `SafeDeleteConflict extends Error` exporté (`sessions`, `programs`, `this.name`). Guard `Promise.all([setLogRepo, weRepo].findByExerciseId)`. `remove()` supprimé (dead code). 5 tests TDD + spy `force=true`. Commits `fa441a0` + `84b48a4`.
- **`useExercises.deleteExercise`** : retourne `SafeDeleteConflict | null`. `makeService()` à 3 repos. `export type { SafeDeleteConflict }`. Commit `1586d89`.
- **`ExerciseCard` swipe-left** : `Swipeable` + `renderRightActions` → bouton rouge 80px (trash icon, `accessibilityLabel`, `accessibilityRole="button"`). Prop `onDelete?`. Commit `82f547f`.
- **`exercices.tsx`** : `handleDeleteExercise` — dry-run → conflit → `Alert.alert` "Supprimer quand même ?" → force-delete. `onDelete={handleDeleteExercise}` sur `ExerciseCard`. Commit `ab3a52f`.
- 492 tests, 0 erreurs TypeScript.

### Décisions

- **`temps moyen par séance` abandonné (YAGNI)** : use case = "est-ce que j'ai le temps ?", déjà couvert par la durée estimée au check-in.
- **`SafeDeleteConflict.sessions` = nombre de set_log rows** (pas de sessions distinctes) — copy UI "série(s) enregistrée(s)" cohérente.
- **`findByExerciseId` ORDER BY `order_index`** : cohérence SQLite/InMemory pour futurs callers dépendant de l'ordre.
- **`this.name = 'SafeDeleteConflict'`** : requis pour sérialisation et debug correcte des subclasses d'Error en JS.

### Problèmes rencontrés

- **Quality review T2** : goal section visible pour cardio → `!isBodyweight && !isCardio` (fix `221e040`).
- **Quality review T3** : `ORDER BY order_index` manquant dans SQLite, InMemory non trié → fix `a5da871`.
- **Quality review T4** : revieweur a flaggé des items hors scope (validation create, rename weRepo) — ignorés. Seuls fix légitimes appliqués : `this.name` + spy test `force=true`.

---

## S45 — 2026-06-14 — Substitution rapide d'exercice (v1.14.0)

### Livré

- **`useSession` — état substitution** : `substitutions: Record<number, ExerciseStub>` + `effectiveDetails` (useMemo overlay — remplace uniquement `exercise`, jamais les blocks/sets). `substituteCurrentExercise(replacement)` + `isCurrentExerciseSubstituted`. Tous les callbacks (`validateSet`, `skipSet`, `skipExercise`, `confirmTransition`) consomment `effectiveDetails`. 3 tests TDD. Commit `5013f6b`.
- **`SubstituteSheet`** : picker lazy (chargé au premier open via `onAnimate` + `hasLoaded` ref), `BottomSheetFlatList`, `BottomSheetTextInput`, filtre muscle group (JSON.parse) puis fallback recherche nom, état `isLoading` pendant fetch DB, empty state "Aucun exercice — recherchez par nom", `accessibilityLabel` sur chaque row. Commits `a024b49`, `d6d41df`.
- **`RunningPhase`** : bouton "Remplacer cet exercice" dans skip sheet (conditionnel `onSubstituteExercise`), `substituteSheetRef`, indicateur ⇄ dans le header, `View accessible={true}` groupant icon+text pour TalkBack. Commit `bad7616`.
- **`[workoutId].tsx`** : `onSubstituteExercise` + `isSubstituted` passés à `RunningPhase`. Commit `253f3c9`.
- **Fix progression** : `SessionService.calculateProgressions` — si `set_log.exercise_id !== workout_exercise.exercise_id`, skip progression (neutral push, no weight advance, no deload). Commit `ab0cefa`.
- 483/483 tests, 0 erreurs TypeScript.

### Décisions

- **Overlay `effectiveDetails` (pas de mutation `workoutDetails`)** : préserve la structure programme intacte. Substitution = couche visuelle au-dessus des données.
- **`ExerciseStub` = `WorkoutExerciseDetail['exercise']`** : pas de nouveau type. Réutilise le pick existant (`id | name | type | technical_notes | muscle_groups | description`).
- **Clé = `exerciseIdx`** (pas `exercise_id`) : unique, stable pendant la séance, naturellement aligné avec `effectiveDetails`.
- **Fix progression par comparaison `exercise_id`** : pas de migration DB ni de paramètre supplémentaire. `set_logs.exercise_id` est déjà loggé avec l'id du remplaçant — un simple `some(sl => sl.exercise_id !== we.exercise_id)` suffit.
- **V1 hors scope** : persistance pause/resume, substitution per-série, historique/annulation.

### Problèmes rencontrés

- **`FlatList` cassait pan-down-to-close Android** : `@gorhom/bottom-sheet` v5 exige `BottomSheetFlatList` (découvert en code quality review).
- **`TextInput` clavier Android** : `BottomSheetTextInput` requis pour gérer le focus correctement dans un sheet — fix post-review.
- **`toIndex > 0` bug spec** : manquait snap index 0 (hauteur 75%) — corrigé avant écriture du plan.
- **Final reviewer** : "No — with fixes" → 1 critique (progression) + 3 importants (TextInput, loading state, a11y grouping). Tous fixés avant push.

---

## S44 — 2026-06-14 — Sets spéciaux : AMRAP + Dropsets

### Livré

- **Migration v14** : `ALTER TABLE sets ADD COLUMN set_type TEXT NOT NULL DEFAULT 'normal' CHECK(set_type IN ('normal', 'amrap'))`. Commit `50b0a3b`.
- **Types** : `SetType = 'normal' | 'amrap'`, `Set.set_type: SetType`. `CreateSetDto` exclut `set_type` (DB DEFAULT). `UpdateSetDto` a `set_type?: SetType` (optionnel — callers existants inchangés). Commit `50b0a3b`.
- **Repos** : `InMemorySetRepository.save()` initialise `set_type: 'normal'` explicitement. `update()` spread conditionnel (pas `...dto` qui écraserait avec undefined). `SQLiteSetRepository.update()` utilise `COALESCE(?, set_type)`. Commit `50b0a3b`.
- **TDD** : 2 tests contrat (`preserve set_type`, `met à jour set_type vers amrap`). 3 tests régression dropset routing dans `useSession.test.ts`. Commits `50b0a3b`, `4cbfe66`.
- **Fixtures** : `DeloadService.test.ts` × 5, `weightRatio.test.ts` makeSet, `useSession.test.ts` × 4 — tous avec `set_type: 'normal' as const`. Commit `50b0a3b`.
- **`EditSetModal`** : toggle Normal/AMRAP (entre reps et weightType). Label reps dynamique "Minimum (0 = open AMRAP)" si AMRAP. Hint "Enchaîner directement..." si `rest === '0'`. `reps_min` : `isNaN(parseInt) ? original : parsed` pour préserver si champ vide. `accessibilityRole="radio"` sur le toggle. Commits `251f903`, `3a9c05a`, `4cbfe66`.
- **`BlockCard.formatSet`** : AMRAP → "5+ rép" (reps_min > 0) ou "MAX rép" (reps_min = 0). Commit `9cfd154`.
- **`RunningPhase`** : `setLabel` AMRAP, `repsFeedback` null pour open AMRAP, badge AMRAP orange `#ea580c`, badge DROPSET bleu `#2563eb`, ⚡ dans restSets (sets précédés d'un `rest_duration=0`). Commit `88bedb3`.
- 480/480 tests, 0 erreurs TypeScript.

### Décisions

- **Dropsets sans nouveau champ DB** : `rest_duration === 0` est le signal. Le routage session (skip repos → phase 'running') était déjà implémenté dans `useSession.validateSet` ligne 280 — aucun code de session à écrire.
- **Pyramid hors scope** : le nom de bloc existant (`block.name`) suffit comme label visuel. Aucun code supplémentaire.
- **`UpdateSetDto.set_type` optionnel** (déviation du spec) : évite de modifier ~10 callsites existants (SessionService × 3, contrats, tests). COALESCE côté SQLite préserve la valeur stockée quand non fourni.
- **`reps_min: isNaN(parseInt) ? original : parsed`** : permet de sauvegarder 0 explicitement (open AMRAP) tout en préservant la valeur originale si le champ est vidé.

---

## S43 — 2026-06-13/14 — Supersets (v1.12.0)

### Livré

- **Migration v13** : `ALTER TABLE workout_exercises ADD COLUMN superset_group_id INTEGER`. Commit `f1492fa`.
- **Types propagés** : `WorkoutExercise.superset_group_id: number | null`, `WorkoutExerciseDetail.superset_group_id`, `CreateWorkoutExerciseDto` exclut le champ (NULL à la création). `IWorkoutExerciseRepository.updateSuperset(id, groupId)`.
- **Repository TDD** : `InMemoryWorkoutExerciseRepository.save()` initialise `superset_group_id: null`. `updateSuperset` InMemory + SQLite. 2 tests TDD. Commit `41b8a25`.
- **`WorkoutExerciseService.linkToNext(aId, bId)`** : priorité groupId B → A → MAX+1. **`unlink(id)`** : dissout tout le groupe. 4 tests TDD. Commit `825bd8e`.
- **`useWorkoutExercises`** : expose `linkToNext(aId, bId)` et `unlink(id)` avec le pattern try/catch/refresh standard. Commit `1df3ed3`.
- **`advancePosition` superset routing** : A→B→C round-robin (même setIdx), C→A tour suivant (setIdx+1), C→exercice suivant après tours épuisés. Helpers exportés : `isSupersetForward` (A→B, même groupe, ordre croissant) et `isSupersetNextRound` (C→A, même groupe, ordre décroissant). 8 tests TDD. Commit `93f7d3b`.
- **`validateSet`** : `isSupersetForward` → setPhase('running') directement (pas de repos, pas de transition). `isSupersetNextRound` → repos autorisé mais pas d'`exercise_transition`. Commit `49fceff`.
- **`skipExercise`** : saute tout le groupe (`max(groupIndices) + 1`). Fix dep array `workoutDetails.length → workoutDetails`. Commits `49fceff`, `369cb3b`.
- **`RunningPhase`** : badge `SUPERSET · 1/2` (fond `#7c3aed`, 11px bold). Texte skip conditionnel : "Passer le superset entier (A · B)" quand en superset. Commits `6fe5b7e`.
- **Helpers session** : `getSupersetPosition(position, details)` et `getSupersetExerciseNames(position, details)` dans `[workoutId].tsx`. Commit `6fe5b7e`.
- **`ExerciseTransitionPhase`** : prop `supersetGroup?: string[]`. Preview "Tu vas enchaîner : A → B · repos après B" en bloc violet bordé. Commit `9bfb190`.
- **`WorkoutExerciseCard`** : 4 nouvelles props optionnelles. Bouton "🔗 Grouper avec le suivant" (standalone, pas dernier). Badge "SUPERSET · A" + "✕ Délier" (en groupe). Commit `e7f5ad0`.
- **`workout/[id].tsx`** : `buildRenderItems()` transforme le tableau flat en `RenderItem[]` (standalone | superset). FlatList utilise `buildRenderItems(exercises)`. Container violet bordé (`#7c3aed`) pour les groupes superset avec label absolu "SUPERSET". Commits `e7f5ad0`, `d4647e3`.
- **Fixes post-review** : `onLinkToNext` sur superset uniquement sur le dernier membre (`d4647e3`). Fixtures `DeloadService.test.ts` + `weightRatio.test.ts` — `superset_group_id: null` ajouté. Doc limitation multi-block dans `advancePosition`. Commit `37617c2`.
- 475/475 tests, 0 erreurs TypeScript. Tag `v1.12.0`.

### Décisions

- **`unlink` dissout tout le groupe** : pas de "délier un seul membre" — plus simple, pas d'états partiels orphelins.
- **`isSupersetForward` compare la position dans le groupe ordonné** (pas les exerciseIdx bruts) — correct si les exercices sont réordonnés.
- **`buildRenderItems` groupe les exercices contigus** avec le même `superset_group_id`. Si deux exercices du même groupe sont séparés (bug de données), ils forment deux containers distincts. Acceptable pour V1 (l'UI ne permet pas cet état).
- **Supersets à un seul bloc** : limitation documentée dans un commentaire — `advancePosition` réinitialise toujours `blockIdx: 0` entre les membres, donc les blocs Back-off ne sont pas atteints dans un superset. Design intentionnel pour V1.
- **Couleur superset `#7c3aed`** codée en dur dans 4 fichiers — refacto vers `Colors.ts` reporté au backlog.
- **Subagent-driven development** : 9 tâches, 3 subagents par tâche (implémenteur + spec reviewer + quality reviewer). Review qualité T3 a demandé des tests supplémentaires non spécifiés → rejetés (scope plan). Review qualité T9 a trouvé un vrai bug (`onLinkToNext` sur tous les membres au lieu du dernier) → corrigé inline.

### Hors scope → backlog

- Supersets multi-blocs (Back-off dans un superset)
- Couleur superset dans `Colors.ts`
- Test d'intégration `validateSet` complet avec superset (hook renderHook)
- Constante `SUPERSET_COLOR` dans `Colors.ts`

---

## S42 — 2026-06-13 — Comparaison séance vs précédente

### Livré
- **`SessionService.getPreviousSessionSummary(workoutId, currentSessionLogId)`** : filtre sessions `completed` du même workout, exclut la séance courante, trie DESC par `started_at`, calcule `volume = Σ(reps_done × weight_done)` + `sets = length`. Retourne `{ volume, sets } | null`. 3 tests TDD (null, correct, ignore abandoned). Commit `efea492`.
- **SummaryPhase** : prop `previousSession?: { volume, sets } | null`. Deltas calculés dans le composant. Ligne delta inline dans la volume card : `+1 250 kg · +3 séries vs séance préc.`. Positif → `colors.primary`, négatif → `colors.textSecondary`. Masqué si les deux deltas = 0 ou si pas de séance préc. Commit `7cb04a6`.
- **`[workoutId].tsx`** : state `prevSummary` + useEffect sur `session.phase === 'summary'` (pattern identique à `rpeLabel`). Commit `7cb04a6`.
- 461/461 tests, 0 erreurs TypeScript.

### Décisions
- **Delta négatif en textSecondary (gris)** : pas de rouge, pas de punition — philosophie anti-perf. Un delta négatif peut être intentionnel (décharge, blessure, séance courte).
- **Masquer si deux deltas = 0** : afficher "+0 kg · +0 séries" n'apporte rien. Un seul delta à 0 est informatif (ex: même volume, moins de séries = séries plus lourdes).
- **Pattern useEffect** : calqué sur `rpeLabel` et `detectPlateaus` — même guard `session.phase !== 'summary'`, même `makeServiceForCheck()`, pas de nouveau hook.
- **Tri DESC par `started_at`** dans le service pour garantir la séance la plus récente (InMemory n'ordonne pas).

### Hors scope → backlog
- Comparaison par exercice ("Squat : +5 kg vs préc.")
- Tendance N séances (graphe)

---

## S41 — 2026-06-13 — Objectifs personnels

### Livré
- **Migration v12** : table `goals` (id, exercise_id FK CASCADE, target_weight, target_date, achieved_at, created_at, UNIQUE exercise_id). Commit `d045eb6`.
- **IGoalRepository + InMemoryGoalRepository + SQLiteGoalRepository** : CRUD avec `INSERT OR REPLACE` pour unicité par exercice. Commit `d045eb6`.
- **computeETA** : fonction pure, régression linéaire OLS sur (jours, poids), fenêtre 12 sessions passée par l'appelant. Retourne `ETAResult` : `no_data` (< 3 sessions), `achieved` (dernier weight ≥ cible), `stagnant` (pente ≤ 0), `on_track` (etaDate, ratePerWeek, projectedAtTargetDate optionnel). 7 tests TDD. Commit `55e98d3`.
- **GoalService** : setGoal, getGoal, getAllGoalsWithExercise (N+1 via IExerciseRepository), markAchieved, deleteGoal. 4 tests TDD. Commit `139401e`.
- **useGoals** : hook `GoalWithExercise[]` avec mountedRef + refresh, même pattern que useLoggedExercises. Commit `93469ae`.
- **[exerciseId].tsx** : section OBJECTIF après HISTORIQUE SÉANCES. 3 états : bouton "Définir", ETA affiché (on_track/stagnant/no_data), "✦ Atteint le …". Gate bodyweight (`recentSessions.every(s => bestSet.weight === 0)`). BottomSheet création : TextInput poids, chips date (1m/3m/6m/1y/aucune), aperçu ETA temps réel, bouton Enregistrer. Auto-détection achievement au chargement. Commit `1f928d0`.
- **progression.tsx** : section OBJECTIFS dans Stats (avant "Rechercher un exercice"). Liste cliquable, navigue vers détail. `refreshGoals` branché au `useFocusEffect`. Commit `e86e0ba`.
- 458/458 tests, 0 erreurs TypeScript. 6 tâches, subagent-driven.

### Décisions
- **Un seul objectif par exercice** (`UNIQUE exercise_id` + `INSERT OR REPLACE`) : simplifie l'UX, évite la prolifération.
- **Poids de travail (bestSet.weight)** plutôt que 1RM estimé : plus naturel, moins abstrait, directement observable en séance.
- **ETA factuel sans étiquette "irréaliste"** : pas de jugement. Si pente ≤ 0 → "stagnant". Si target déjà atteint → "achieved". Sinon → date estimée. Anti-perf philosophy.
- **today injecté dans computeETA** : `today: Date = new Date()` — testable de façon déterministe sans mocker `Date.now()`.
- **N+1 en service, pas de JOIN en repo** : GoalService prend IGoalRepository + IExerciseRepository, résout les noms en service layer. IGoalRepository reste simple (pas de JOIN). Testable avec InMemory.
- **Pas d'ETA dans Stats** (progression.tsx) : trop coûteux en N queries history par goal. Stats affiche objectif + statut atteint ou non, le détail ETA est dans [exerciseId].tsx.
- **Gate bodyweight par proxy** (`bestSet.weight === 0`) : pas de colonne `weight_type` sur exercises, seulement sur `sets`. Proxy fiable pour "cet exercice n'a jamais eu de poids enregistré".

### Hors scope → backlog
- Objectifs en reps (tractions bodyweight, etc.)
- Notifications push à l'approche de l'objectif
- Historique des objectifs accomplis (archive)
- Plusieurs objectifs par exercice

---

## S40 — 2026-06-13 — Historique exercice : voir tout + error state

### Livré
- **ExerciseHistoryService.getHistory** : signature `(exerciseId, limit = 10)` → `(exerciseId, limit?: number)`. Sans limit → retourne toutes les séances. Avec limit → comportement actuel préservé. TDD RED/GREEN, test existant `limit=2` non touché, nouveau test 15 sessions. Commit `b31de5d`.
- **useLoggedExercises** : error state ajouté (`error: string | null`). Catch block expose l'erreur au lieu de la swallower. `setError(null)` au début de chaque refresh. Exposé dans le return. Commit `82f6965`.
- **search.tsx** : affiche "Impossible de charger les exercices" si `error` truthy (priorité sur état vide). "Aucun exercice loggé" et "Aucun résultat" inchangés. Commit `82f6965`.
- 447/447 tests, 0 erreurs TypeScript. Subagent-driven, 2 tâches, 2 reviewers chacune + 1 final reviewer.

### Décisions
- **Supprimer le cap plutôt qu'ajouter "Voir plus"** : l'écran détail exercice est une page de consultation intentionnelle — cacher des données derrière un tap est du paternalisme UX. Afficher tout dès le premier coup d'œil. Moins de code (pas d'état `expanded`), plus honnête.
- **limit?: number plutôt que supprimer le paramètre** : rétrocompatibilité avec le test `limit=2` existant, et la signature reste utile pour d'éventuels appels ciblés futurs.
- **Pas de test pour error state hook** : comportement observable en UI, pattern standard déjà couvert par `useExerciseHistory` (même implémentation).

### Hors scope → backlog
- Historique cardio (km/durée loggés en DB, pas affichés)
- Temps moyen par séance (ended_at - started_at, jamais affiché)

---

## S39 — 2026-06-13 — RPE moyen en SummaryPhase

### Livré
- **SessionService.getSessionRPELabel(sessionLogId)** : moyenne des `rpe` non-null du `set_logs` via `findBySessionLogId`, mapping < 4.5 → 'Facile', 4.5–7.5 → 'Normal', ≥ 7.5 → 'Difficile', null si aucun set coté. TDD 5 tests. Commit `139c8ed`.
- **[workoutId].tsx** : state `rpeLabel` + useEffect au passage en phase `summary` (pattern `detectPlateaus`), prop passée à `<SummaryPhase />`. Commit `628bc25`.
- **SummaryPhase.tsx** : prop `rpeLabel?` + affichage inline dans hero : `"47 min · Effort : Normal"` (caché si null). Commit `628bc25`.
- 446/446 tests, 0 erreurs TypeScript, 0 warnings ESLint. Subagent-driven, 2 tâches, 2 reviewers chacune + 1 final reviewer.

### Décisions
- **Agrégation par moyenne** : plus simple que mode ou max, acceptable pour V1. Si utilisateur signale que "Normal" masque un exercice difficile, on pourra passer au mode ou max.
- **Inline hero** (pas de card dédiée) : données secondaires — `"47 min · Effort : Normal"` sous le titre suffit sans alourdir l'UI.
- **Null = rien affiché** : si l'utilisateur n'a coté aucun set, pas d'interpolation, pas de valeur par défaut.

### Hors scope → backlog
- Tests boundary exact (avg=4.5 → 'Normal', avg=7.5 → 'Difficile') — documentaires, implémentation correcte
- Historique RPE moyen par séance dans l'onglet Stats
- RPE par exercice (agrégat plus fin)

---

## S37 — 2026-06-13 — Recherche historique exercice

### Livré
- **ExerciseHistoryService.ts** : `getHistory(exerciseId, limit=10)` — groupe les set_logs par `session_log_id`, tri DESC, `bestSet` = poids max ou reps max (bodyweight), `date` = premier set du groupe. `getLoggedExercises()` — filtre exercices ayant ≥1 log, tri alpha `localeCompare('fr')`. TDD 11 tests (incl. test throw exercice introuvable). Commits `fb443b5`, `db30437`.
- **useExerciseHistory.ts** + **useLoggedExercises.ts** : hooks fins suivant pattern `useProgression` — `useRef` service stable, `mountedRef` anti-setState après unmount, `useCallback refresh`. Commit `31f8769`.
- **progression/search.tsx** : écran recherche — `TextInput` autoFocus, `FlatList` exercices loggés filtrés client-side, empty states différenciés ("Aucun exercice loggé" vs "Aucun résultat"), `keyboardShouldPersistTaps="handled"`.
- **progression/[exerciseId].tsx** : enrichi — sections "ÉVOLUTION 1RM" + "MEILLEURE MARQUE" + "HISTORIQUE PRs" conservées intactes ; sections "DERNIÈRE SÉANCE" (liste sets) + "HISTORIQUE SÉANCES" (sessions, `slice(1)` pour éviter doublon) ajoutées via `useExerciseHistory`. Guard `!histLoading` sur empty state anti-flash. `histError` exposé.
- **_layout.tsx** : Stack.Screen `progression/search` ajouté.
- **progression.tsx** : pressable "Rechercher un exercice" inséré après `MuscleGroupCard`, avant `recentPRs`.
- 437/437 tests, 0 erreurs TypeScript, 0 warnings ESLint. Poussé sur main.

### Décisions
- **Route `progression/[exerciseId]` déjà existante** — le fichier existait avec 1RM chart + PRs. Implémenteur l'a écrasé → détecté en review → restauré + enrichi (merge des deux features en un écran). Meilleure UX que deux routes séparées.
- **`recentSessions[0]` = `lastSession`** — la section HISTORIQUE SÉANCES utilise `.slice(1)` pour ne pas dupliquer la dernière séance déjà affichée ci-dessus.
- **Locale `'fr'` forcée** dans `localeCompare` pour garantir l'ordre des accents (Développé < Squat) indépendamment du device.
- **Subagent-driven** : 3 tâches, 2 reviewers chacune (spec + qualité) + 1 final reviewer. Tâche 3 : un timeout subagent → exécution directe par le contrôleur pour le merge de `[exerciseId].tsx`.

### Hors scope → backlog
- Graphe évolution temporelle bestSet par exercice
- Export historique CSV
- "Voir plus" si > 10 séances (limite actuelle silencieuse)
- Error state dans `useLoggedExercises` (silent catch actuel)

---

## S38 — 2026-06-13 — Présences ce mois (Stats)

### Livré
- **ProgressionService.getMonthlyPresences(now)** : compte les sessions `status === 'completed'` du mois calendaire courant via `monthPrefix = now.toISOString().slice(0, 7)` + `findAll()` + `startsWith`. TDD 4 tests (aucune session, sessions completed comptées, abandoned/active exclues, mois précédent exclu). Commit `4485993`.
- **useProgression.ts** : `monthlyPresences: number` ajouté comme 6e slot dans `Promise.all`, exposé dans `UseProgressionReturn`, `useState(0)`. Commit `2596ac2`.
- **progression.tsx** : `presencesCard` affiché avant `chipsRow` si `monthlyPresences > 0` — "1 séance ce mois" / "N séances ce mois". `accessible={true}` + `accessibilityLabel` WCAG 2.2. Fix a11y commit `156f08f`.
- 441/441 tests, 0 erreurs TypeScript, 0 warnings ESLint. Subagent-driven, 2 tâches, 2 reviewers chacune + 1 final reviewer.

### Décisions
- **`status === 'completed'` uniquement** : une présence = séance terminée. Sessions abandonnées ou en cours non comptées. Sémantique délibérément plus stricte que `stats.sessionCount` (chip SÉANCES) qui compte toutes les sessions.
- **Caché si 0** : pas d'état vide / "0 séance" — philosophie anti-streak, aucun élément de culpabilisation.
- **Compteur additif uniquement** : pas de comparaison mois précédent, pas de streak, pas d'objectif.

### Hors scope → backlog
- Fusionner double `findAll()` : `getDashboardStats` + `getMonthlyPresences` appellent chacun `findAll()` — performance acceptable (<500 sessions), mais à consolider si DB croît
- Test "mois suivant exclu" manquant dans `ProgressionService.test.ts` (implémentation correcte, test documentaire absent)
- `accessibilityRole="text"` sur presencesCard (announced par VoiceOver mais sans rôle explicite)

---

## S36 — 2026-06-13 — Volume par groupe musculaire (Stats)

### Livré
- **muscleGroupUtils.ts** : `MacroCategory`, `MuscleDetail`, `MacroGroupVolume`, `MUSCLE_CATEGORY_MAP` (20 muscles → 4 catégories), `getMacroCategory`, `computeVolumeByMuscleGroup`. Attribution : volume une seule fois par catégorie distincte par set, volume complet par muscle individuel. TDD 13 tests. Commit `4ee1f3b`.
- **ProgressionService.getVolumeByMuscleGroup** : fenêtre 4 semaines glissantes (lundi courant - 21 jours), `Promise.all` setLogs + exercises, délègue à `computeVolumeByMuscleGroup`. TDD 2 nouveaux tests (426/426 total). Commit `6782611`.
- **MuscleGroupCard.tsx** : card expandable "VOLUME PAR STIMULUS", barre `width: \`${percentage}%\``, expand/collapse par `useState<Set<MacroCategory>>`, `accessibilityState={{ expanded }}`, volumes via `useUnits`. Retourne `null` si données vides. Commit `480357a`.
- **useProgression.ts** : état `volumeByMuscleGroup: MacroGroupVolume[]`, 5e slot dans `Promise.all`, exposé dans `UseProgressionReturn`.
- **progression.tsx** : `<MuscleGroupCard data={volumeByMuscleGroup} />` inséré après VolumeBarChart, avant PRs récents.
- 426/426 tests, 0 erreurs TypeScript, 0 erreurs ESLint.

### Décisions
- **Règle attribution** : volume ajouté une seule fois par macro-catégorie par set (Bench → Push×1, pas ×3 muscles Push). Volume complet par muscle individuel pour le détail expandable. Conséquence : somme des catégories ≠ volume total VolumeBarChart → titre "VOLUME PAR STIMULUS" pour éviter confusion.
- **Pas de réconciliation avec VolumeBarChart** : métriques différentes (stimulus musculaire vs tonnage total). Labels distincts suffisent.
- **`MacroCategory`** inclut `'Autre'` pour muscles non mappés — affiché seulement si volume > 0.
- **Subagent-driven** : 3 tâches, 2 reviewers chacune (spec + qualité), + 1 final reviewer.

### Hors scope → backlog
- Historique temporel de la répartition (stacked chart par semaine)
- Configuration du mapping muscle → catégorie
- Alertes déséquilibre automatiques

---

## S35 — 2026-06-13 — Pack B : plate_step configurable (v1.8.1)

### Livré
- **Pack A** (rappel, livré v1.8.0) : annuler série (swipe dots), humeur après séance (mood_after DB + SummaryPhase chips 😓/😌/⚡), micro-copy (10 strings auditées).
- **T1 settingsUtils.ts** : `getPlateStep(stored: string | null): number` — validation liste blanche `[1, 1.25, 2, 2.5, 5]`, défaut 2. `PlateStepValue` type union. TDD 8 tests. Commit `e0040d8`.
- **T2 progression.ts** : `applyDeload(weight, plateStep = 2)` — param optionnel, rétrocompat totale. TDD 4 nouveaux tests. Commit `6e52277`.
- **T3 warmup.ts** : `computeWarmupSets(workWeight, plateStep = 2)` — `round2` renommé `roundPlate`, paramétrique. TDD 3 nouveaux tests. Commit `ebb05ab`.
- **T4 DeloadService.ts** : `applyDeloadToExercises(exercises, plateStep = 2)` — passe plateStep à `applyDeload`. TDD 1 nouveau test. Commit `75e4f1f`.
- **T5 SessionService.ts** : `calculateProgressions(sessionLogId, plateStep = 2)` — passe plateStep à `applyDeload` dans la branche décharge. TDD 1 nouveau test. Commit `bb0f0ef`.
- **T6 WarmupPhase.tsx + useSession.ts** : prop `plateStep?: number` (défaut 2), 4e param useSession, 3 appels calculateProgressions mis à jour. Commit `b284392`.
- **T7 reglages.tsx + [workoutId].tsx** : section PROGRESSION entre DÉCHARGE AUTOMATIQUE et DONNÉES. `SegmentedControl` options kg (1/2/2.5/5) ou lbs (2.5/5/10 → stockés 1.25/2.5/5 kg). State `plateStep` lu au mount depuis settings KV, passé à useSession/WarmupPhase/applyDeloadToExercises. Commit `ade9102`.
- 402/402 tests, 0 erreurs TypeScript. **v1.8.1**.

### Décisions
- **lbs mapping** : 2.5 lbs→1.25 kg, 5 lbs→2.5 kg, 10 lbs→5 kg. Approximation <5% (pas de conversion exacte) — sans impact pratique pour des arrondis de rondelles. Valeur toujours stockée en kg.
- **Défaut 2 partout** : rétrocompat totale, tous tests existants passent inchangés.
- **Options kg affichées** : 1/2/2.5/5 (exclut 1.25 kg car pas standard en salle standard).
- **Subagent-driven** pour T1-T2, puis exécution directe pour T3-T7 (contexte déjà chargé, économie de tokens).

### Hors scope → backlog
- Conversion dynamique si changement unités en cours de séance
- plate_step différent par exercice
- Micro-rondelles lbs (1.25 lbs)

---

## S34 — 2026-06-13 — Échauffement auto

### Livré
- **warmup.ts** : `computeWarmupSets(workWeight)` — 3 séries NSCA (40%×8 + 60%×5 + 80%×2), arrondi 2kg inférieur (`Math.floor(w/2)*2`). `shouldShowWarmup(weight, type)` — `fixed` ET ≥ 40kg. TDD 11 tests (cas limites : 65kg rounding, 40kg exact, bodyweight, bar).
- **WarmupPhase.tsx** : écran dédié (pattern ExerciseTransitionPhase). Props `exerciseName / workWeight / onStart`. Tableau 3 lignes (poids + reps + %). Bouton unique "Commencer le travail →". Pas de timer, pas de check-off.
- **useSession.ts** : phase `'warmup'` ajoutée au type union. `confirmWarmup()` → `'running'`. `confirmTransition` vérifie `shouldShowWarmup` → `'warmup'` ou `'running'`. `warmupWorkWeight` state exposé dans `UseSessionResult` (source unique).
- **[workoutId].tsx** : render `<WarmupPhase>` sur `phase === 'warmup'`. Consomme `session.warmupWorkWeight` (plus de memo dupliqué).
- **seeds.ts** : bloc `Échauffement` retiré de bench press. `seedProgram` DELETE cascade (idempotent après premier run).
- 383/383 tests, 0 erreurs TypeScript.

### Exercices qualifiés (PPL seed)
Développé couché barre 60kg, Squat barre 60kg, Rowing barre 50kg, Romanian Deadlift 50kg, Pin Press 40kg.

### Décisions
- Bloc virtuel (pas de DB) : warmup = préparation, toujours synchronisé avec poids courant
- Seuil 40kg fixe : couvre composés lourds, exclut isolations légères
- Arrondi 2kg (pas 2.5kg) : matériel standard salle — futur : `plate_step` configurable en settings (backlog)
- `warmupWorkWeight` dans `useSession` state (set dans `confirmTransition`) : source unique, élimine divergence risk avec [workoutId].tsx
- WarmupPhase n'apparaît qu'une fois par exercice (avant 1er set Travail)
- Issues reviewer (#1 DELETE chaque démarrage, #2 pause corruption) → YAGNI : idempotent + edge case infime

### Hors scope → backlog V2/V3
- `plate_step` configurable en settings
- Timer entre séries échauffement
- Check-off par série
- Désactiver par exercice

### Version
v2.0.0 recommandé — feature majeure. Bump avec `bash scripts/version-bump.sh major`

---

## S33 — 2026-06-12 — Décharge automatique

### Livré
- **DeloadService** : TDD (19 tests). `shouldSuggestDeload(workoutId)` — calendaire global (findAll sessions), seuil configurable (`deload_weeks`, défaut 4). `recordDeload(date)` persiste `last_deload_at` dans table `settings` KV existante. `applyDeloadToExercises()` — 10% réduction, arrondi ×2 kg, guard `weight_type === 'fixed'` seulement (bodyweight + bar exclus).
- **CheckInPhase** : card décharge optionnelle (`deloadSuggested?` + `onDeloadApplied?`). Boutons "Appliquer la décharge" / "Passer" (per-séance). Explication médicale factuelle.
- **SummaryPhase** : card anticipation (`suggestNextDeload?`) — "Tu t'entraînes depuis plusieurs semaines. À la prochaine séance, pense à décharger."
- **[workoutId].tsx** : `isDeloadSession` state, `deloadedExercises` memo (`applyDeloadToExercises` si flag actif), `recordDeload` useEffect à phase `summary`. Bannière "Séance décharge" dans RunningPhase. `suggestNextDeload = deloadSuggested && !isDeloadSession`.
- **Réglages** : section "Décharge automatique" — SegmentedControl 4/6/8 sem. persisté via `SQLiteSettingsRepository`.
- 369/369 tests, 0 erreurs TypeScript. 0 migration DB (settings table déjà en v1).

### Décisions
- Trigger calendaire (vs plateau) : scientifiquement validé (Israetel, Helms), proactif, indépendant des performances
- Global (pas per-workout) : `last_deload_at` + fallback `findAll()` — une décharge = récup systémique
- `onStart` inchangé : `onDeloadApplied?` callback séparé → pas de breaking change CheckInPhase
- "Passer" per-séance : la suggestion réapparaît jusqu'à décharge effective (corps ne récupère pas parce qu'on a cliqué Passer)
- Limitation connue : si séance décharge interrompue par OS kill, `isDeloadSession` remet à false → `recordDeload` ne fire pas. YAGNI — edge case rare, conséquence faible (suggestion réapparaît).

### Version
v1.9.0 recommandé — bump avec `bash scripts/version-bump.sh minor`

---

## S32 — 2026-06-12 — Détection plateau

### Livré
- **PlateauDetectionService** : service isolé TDD (6 tests). Détecte exercices stagnants au même poids × 3 séances complétées consécutives. Basé sur `set_logs.weight_done` via `findByExerciseId()`. Exclut bodyweight (weight_done=0) et séances abandonnées/pausées.
- **SummaryPhase** : card plateau conditionnelle. Copy factuelle et bienveillante ("Même charge depuis 3 séances — Tu peux tenter d'augmenter"). Conforme philosophie UX anti-perf.
- **[workoutId].tsx** : `useEffect` déclenché à `phase='summary'`, instancie `PlateauDetectionService`, passe `plateaus` à `SummaryPhase`.
- 351/351 tests, 0 erreurs TypeScript. 0 migration DB.

### Décisions
- Seuil 3 fixe (Rippetoe, Barbell Medicine, NSCA)
- `max(weight_done)` par séance = proxy poids travail (évite IBlockRepository)
- Signal en SummaryPhase uniquement — CheckInPhase nécessiterait persistance état (YAGNI)

### Version
v1.8.0 → bump recommandé groupé avec S31 (double progression + détection plateau).

---

## S31 — 2026-06-12 — Double progression + suppression reps_max

### Livré
- **Migration v9** : table `sets` recréée sans `reps_max` (pattern SQLite). `reps_min` = cible canonique unique.
- **progression.ts** : `applyProgression` (×1.025 fixe, bugué) supprimée. `calculateProgression` câblée dans `SessionService`.
- **Règle métier** : tous les sets travail ≥ reps_min → `poids + progression_step`. Sinon hold. Step par défaut : 2.0 kg (DB DEFAULT).
- **RPE chips** : collecte DB uniquement (`set_logs.rpe`), pas de gate progression. Pour détection plateau (#2) et décharge auto (#3).
- **repsFeedback.ts** : signature 3 args (`repsStr, repsMin, isBodyweight`). Seuils : >repsMin×1.25 / <repsMin×0.75.
- **UI** : `RunningPhase` (useState init reps_min, setLabel fixe, séries restantes simplifiées), `ExerciseTransitionPhase`, `BlockCard`, `EditSetModal` (champ repsMax supprimé, input repsMin pleine largeur).
- 12 commits, 345/345 tests, 0 erreurs TypeScript.

### Décisions
- `reps_max` supprimé : objectif rond en séance, `reps_min` déjà utilisé dans toute la logique de progression
- RPE gate session-par-session scientifiquement non validé — collecte seulement, exploité ultérieurement
- `consecutive_successes` toujours 0 : tous les exercices ont `progression_threshold = 1` (DB DEFAULT) → progress à chaque succès

### Architecture
- `calculateProgression` lit `exercise.progression_step` directement — fin du 1.025 hardcodé
- `isSessionFullSuccess` conservée (doublon de `isSessionAchieved`, suppression reportée à l'audit clean code)

### Version
v1.8.0 — bump recommandé (minor : algorithme de progression corrigé + suppression reps_max).

---

## S30 — 2026-06-12 — Pause Séance

### Livré
- **Migration v8** : `session_logs` + colonnes `status TEXT CHECK(active|paused|completed|abandoned)` + `paused_position TEXT`. Rétrocompat via DEFAULT 'active'.
- **Repository layer** : `ISessionLogRepository` + `pause`, `abandon`, `findAnyPaused`. `complete` met désormais `status='completed'`. InMemory + SQLite + 6 tests contrats TDD.
- **SessionService** : `pauseSession` (sérialise position+phase JSON), `abandonSession` (ended_at, pas de calcul progressions), `findAnyPausedSession` (retourne `{sessionLog, workoutName, setsLogged, volume}`). Guard `startSession` : throw si même workout déjà en pause. TDD 8 tests.
- **sessionUtils** : `shouldWarnAbandon(pausedId, targetId)` pure function TDD.
- **useSession** : `InitialSession` interface, param optionnel 3e arg, lazy initializers sur 6 `useState`, `pauseSession()` callback.
- **ResumeSessionCard** : composant isolé `{workoutName, serieLabel, onPress}`, accessibilité complète. Tests RTL. `testMatch` += `*.test.tsx`.
- **`[workoutId].tsx`** : split `SessionScreen` (outer, mount check async → spinner) + `SessionContent` (inner, reçoit `initialSession`/`conflict`). Bouton pause flottant (hors checkin/summary). BottomSheet abandon (avec flag `abandoningRef` pour éviter `router.back()` après confirm).
- **`index.tsx`** : `ResumeSessionCard` sur focus si session pausée, navigue vers `/session/[workoutId]`.

### Bugs corrigés (review finale)
- `handleAbandonConfirm` → `dismiss()` déclenchait `onDismiss` → `router.back()` (fix: `abandoningRef`)
- `checkPreviousSignificantFailure` incluait sessions abandonnées (fix: filtre `status='completed'`)
- `handlePause` naviguait même si DB write échoué (fix: re-throw + try/catch)
- `JSON.parse(paused_position!)` crash si null (fix: null guard)
- `findLatestByWorkoutIds` comptait paused/abandoned dans rotation cycle (fix: `status='completed'` en SQL + InMemory)

### Décisions
- `abandonSession` ne calcule PAS `calculateProgressions` — interruption logistique ≠ échec entraînement
- Pas de détection background automatique (V1)
- `positionHistory` (undo) non restauré après reprise — `canUndo=false` au redémarrage, acceptable V1
- Split SessionScreen/SessionContent : seule façon d'éviter le flash CheckIn sans `useEffect` de correction

### Architecture
- `SessionPhase`/`SessionPosition` restent dans `hooks/useSession.ts` — SessionService.ts utilise types inline pour éviter dépendance circulaire
- 9 commits, 348/348 tests

### Version
v1.7.0 — prochain bump recommandé (minor : nouvelle feature complète).

---

## S29 — 2026-06-11 — Quick Wins Séance

### Livré
- **F1 Célébration PR** : `SessionService.logSet` retourne `{ setLog, isPR }`. Badge overlay 3s dans `[workoutId].tsx`, survit la transition RunningPhase→RestPhase. `AccessibilityInfo.announceForAccessibility`. `handleValidate` wrapper retourne `Promise<void>`, dép array `[session.validateSet, session.currentExercise]`.
- **F2 Feedback reps** : `computeRepsFeedback` pure function (8 tests TDD). Hint inline si écart > 25% cible, `accessibilityLiveRegion="polite"`, sous bouton Valider.
- **F3 RPE redesign** : TextInput remplacé par 3 chips Facile/Normal/Difficile (mapped 3/6/9). `accessibilityRole="radio"`, toggle deselect.
- **F4 Stepper poids** : bouton barbell dans header (non-bodyweight uniquement) → BottomSheet stepper ±2.5 kg (±5 lbs). `adjustedWeight` en kg interne, `convert()` pour affichage. Guard `adjusting` contre double-tap async. Message confirmation 2s. Appliqué aux séries suivantes via `session.setStartingWeight`.

### Fixes post-review (2026-06-12)
- `exerciseName` capturé AVANT `await validateSet` dans `handleValidate` — évite badge avec nom exercice suivant
- `rpeSection: { flex: 1 }` — chips RPE ne se compressent plus sur petits écrans
- `adjustSuccessTimeout` ref + cleanup `useEffect` — évite state update sur composant démonté

### Décisions
- `validateSet` retourne `Promise<boolean>` (isPR) — timeout badge géré dans `[workoutId].tsx`, pas dans `useSession` (séparation responsabilités UI/métier)
- Threshold feedback reps ±25% proportionnel — adapté à toutes plages (5×1.25=6.25, 15×1.25=18.75)
- `adjustedWeight` en kg interne, `convert()` pour affichage — cohérent avec le reste de l'app
- RPE field ne bloque plus UX : chips optionnels remplacent TextInput
- `setStartingWeight` modifie toutes les séries (y compris validées) — connu, hors scope, à adresser si progression algorithm impacté

### Version
v1.6.0 — 11 commits, 327/327 tests.

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

---

## Session Philosophie — 2026-06-12 · Design doc "Entraînement sérieux, sans les mécaniques toxiques"

### Ce qui a été fait
- Brainstorm complet : 4 couches (architecture, nommage, onboarding, features), personnalité "ami bienveillant", positionnement affiné
- Positionnement final : **"entraînement sérieux, sans les mécaniques toxiques"** — pas anti-perf au sens minimaliste, mais full tracking sans compétition/culpabilisation
- Design doc créé : `docs/superpowers/specs/2026-06-12-philosophie-entrainement-sain.md`
- Section Philosophie + filtre de décision 3 questions ajoutés dans `app/CLAUDE.md`
- Backlog mis à jour : 4 features cohérentes (humeur après séance, présences ce mois, onboarding écran 0, micro-copy audit)

### Décisions clés
- Stats restent visibles et motivantes dans l'onglet Progression — pas secondaires
- Accueil = action (zéro stats perf), Progression = récompense (courbes riches)
- Flèche additive uniquement : célébrer la présence, ignorer l'absence
- Filtre permanent dans CLAUDE.md — actif pour toute future feature
- Anti-patterns nommés : Strava Effect, Noom Effect, Apple Rings Effect

### Fondements scientifiques intégrés
- Self-Determination Theory (Deci & Ryan) — autonomie + compétence
- Renforcement positif (Fogg) — streaks additives uniquement
- Adhérence long terme (Teixeira et al.) — ressenti post-séance = prédicteur
- Effet de surjustification (Lepper) — pas de gamification compétitive

### Prochaine session
- Implémenter micro-copy audit (~1h) : "Tout réussi" → "Tout fait", "Objectif" → "Cible", badge PR, RestPhase
- Onboarding écran 0 (s'insère dans le wizard priorité haute)
- Humeur après séance (extension SummaryPhase)

---

## Session 12 — 2026-06-18 · Audit RGAA/WCAG contrastes + Brzycki 1RM + WelcomeScreen

### Ce qui a été demandé
- Audit systématique contrastes RGAA/WCAG 2.1 sur toute l'app (dark + light)
- Corriger toutes les violations (règle : "sous le seuil c'est sous le seuil, on ne discrimine pas")
- Fix warmup preview "0 séries" dans l'accueil
- Feature Brzycki : calibration scientifique de la charge de départ (1RM Brzycki)
- WelcomeScreen : écran 0 onboarding philosophique

### Décisions prises

**Tokens sémantiques dans Colors.ts (vs SemanticColors)**
- `SemanticColors` est mode-agnostique (fond superset/cardio/etc.) → pas refactorisé
- 4 nouveaux tokens ajoutés dans `Colors.ts` dark+light : `primaryText`, `positiveText`, `negativeText`, `destructiveText`
- Raison : évite breaking change sur tous les usages fond, résout le dual-mode proprement

**Lime interdit comme texte courant**
- `tabBarActiveTintColor: colors.tint` (lime, 2.0:1 sur blanc) → `colors.tabIconSelected` (#0D0D0D)
- Liens accueil : `colors.primary` → `colors.text` + `textDecorationLine: 'underline'`
- `primaryText` = `#3A5A00` (light, 7.97:1) / `#84CC16` (dark, 9.8:1) pour texte accent lisible

**Contraste badge AMRAP/stretch**
- Blanc sur orange `#ea580c` = 3.6:1 (< 4.5:1) → `#000` (6.4:1)
- Blanc sur vert `#16a34a` = 3.3:1 → `#000` (5.9:1)

**textSecondary/tabIconDefault corrigés**
- `#888888` → `#8C8C8C` dark (`textSecondary` 4.62:1 sur surfaceElevated, `tabIconDefault` 5.17:1)
- `#8A8A8A` → `#6B6B6B` light (`textSecondary` 4.89:1 sur blanc)

**Brzycki : pure function TDD first**
- `compute1RM(weight, reps)` : formule `weight / (1.0278 - 0.0278 × min(reps, 12))`
- `suggestWorkingWeight(1RM, targetReps, plateStep)` : inversée + arrondi au pas
- 9 tests GREEN avant tout composant (Red/Green/Refactor)
- Sheet 3 étapes : poids → reps → résultat (1RM estimé + charge suggérée)
- Câblé dans `ExerciseStartingWeightPhase` via `sheetRef.current?.expand()`

**WelcomeScreen**
- Inséré en position 0 dans `ALL_SCREENS`, `shouldSkip` toujours false
- 3 valeurs dot lime : Présence / Progression / Autonomie
- Nom app "Trace." (provisoire) comme titre héros 56px Black

### Ce qui a été fait

**Audit contrastes**
- `constants/Colors.ts` — `textSecondary` (dark+light), `tabIconDefault`, +4 tokens sémantiques
- `app/(tabs)/_layout.tsx` — `tabBarActiveTintColor` lime → `tabIconSelected`
- `app/(tabs)/index.tsx` — lime → text+underline sur liens, fix warmup preview (hide si 0 sets)
- `components/session/RunningPhase.tsx` — badge AMRAP text `#fff` → `#000`
- `app/workout/[id].tsx` — badge stretch text + icon `#fff` → `#000`
- `components/progression/Exercise1RMCard.tsx` — SemanticColors → `colors.positiveText/negativeText`
- `components/progression/VolumeBarChart.tsx` — SemanticColors → tokens Colors
- `app/(tabs)/reglages.tsx` — SemanticColors → `colors.destructiveText`
- `components/session/ExerciseStartingWeightPhase.tsx` — SemanticColors → `colors.destructiveText`
- `components/onboarding/ProgramScreen.tsx` — SemanticColors → `colors.negativeText` inline

**Brzycki 1RM**
- `services/brzycki.ts` — `compute1RM` + `suggestWorkingWeight` (TDD, 9 tests)
- `services/brzycki.test.ts` — 9 cas (smoke, limites, circularité, arrondi, minimum)
- `components/session/BrzyckiCalibrationSheet.tsx` — BottomSheet 3 étapes gorhom
- `components/session/ExerciseStartingWeightPhase.tsx` — prop `plateStep`, lien calibration, sheet intégré
- `app/session/[workoutId].tsx` — passage `plateStep` à `ExerciseStartingWeightPhase`

**WelcomeScreen**
- `components/onboarding/WelcomeScreen.tsx` — créé
- `services/onboardingUtils.ts` — `'welcome'` ajouté à `OnboardingScreenId`
- `app/onboarding.tsx` — `WelcomeScreen` en position 0 de `ALL_SCREENS`

**TypeScript clean. 9/9 tests GREEN.**

### Architecture Brzycki
```
brzycki.ts (pure fn) ← TDD first
BrzyckiCalibrationSheet ← compute1RM + suggestWorkingWeight
ExerciseStartingWeightPhase ← BrzyckiCalibrationSheet + plateStep prop
session/[workoutId].tsx ← plateStep from settings DB
```

### Leçons Code Craft
- **Token dual-mode** : quand un token sémantique doit varier selon le thème, l'ajouter directement dans `Colors.ts` (dark/light séparément) plutôt que de rendre `SemanticColors` mode-aware — évite de casser tous les usages fond existants.
- **Lime text = violation** : lime (#84CC16) sur fond clair = 2.0:1 → toujours un token `primaryText` distinct. La règle CLAUDE.md "interdit texte courant" est strictement justifiée par les contrastes.
- **Fragment JSX obligatoire** : un composant qui rend `<ViewA/><BottomSheet/>` côte à côte doit wrapper dans `<>...</>` — erreur TS2657 "JSX expressions must have one parent element".

### Prochaine session
- Micro-copy audit : "Tout réussi" → "Tout fait", "Objectif" → "Cible", badge PR, RestPhase
- Humeur après séance (extension SummaryPhase)
- Tests manuels sur device (tests-manuels-mvp.md)
