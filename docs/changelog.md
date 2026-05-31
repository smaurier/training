# Changelog

## [Post-MVP] 2026-05-31 — Programme PPL + Cardio

### Ajouté
- Programme PPL complet auto-seedé : 6 séances (Push, Footing Mardi, Pull, Footing Jeudi, Legs, Bonus)
- Mode durée sur les séries (`duration_seconds`) : décompte auto, vibre + vert à 0
- Mode cardio pour l'exercice Footing : inputs durée (min) + distance (km)
- Bande colorée par type d'exercice dans WorkoutExerciseCard (bleu/vert/orange)
- Migration v3 : `sets.duration_seconds`
- Migration v4 : `set_logs.duration_seconds` + `set_logs.distance_meters`
- `exercise.type` exposé dans `WorkoutExerciseDetail`

### Corrigé
- Seeds re-seedent toujours le programme PPL (guard early-return supprimé)

---

## [v1.1.1] 2026-05-30 — UX corrections

### Ajouté
- Home : CTA "Configurer une séance →" quand programme actif sans séances
- Bouton "Démarrer la séance" masqué si liste exercices vide
- `+not-found.tsx` francisé

### Corrigé
- `RunningPhase` : champ Poids non éditable (bodyweight/barre) à opacité 0.4
- `TouchableOpacity` → `PressableA11y` sur tous les écrans restants
- `JSON.parse` muscle_groups protégé contre données corrompues
- Suppression artefacts template Expo (`modal.tsx`, `EditScreenInfo`, `Themed.tsx`, `StyledText.tsx`)

---

## [v1.1.0] 2026-05-30 — A11y + Workflow

### Ajouté
- Pre-commit hook TypeScript (`.githooks/pre-commit`)
- `npm run typecheck` dans les scripts
- `scripts/version-bump.sh`
- `CHANGELOG.md`

### Corrigé
- `TouchableOpacity` → `PressableA11y` (8 fichiers)
- `JSON.parse` muscle_groups (2 fichiers)
- Suppression `modal.tsx` + `EditScreenInfo`

---

## [v1.0.0] 2026-05-29 — MVP

### Fonctionnalités complètes
- **Bibliothèque exercices** : 17 prédéfinis + custom, recherche, types musculaires
- **Programmes** : CRUD, activation, séances avec exercices
- **Config séance** : blocs libres (Mobilité/Travail/Étirements), séries avec reps/poids/pause
- **Séance guidée** : machine d'états (check-in → running → rest → done), chrono repos, saisie reps/poids/RPE, progression automatique des poids, "Tout réussi ⚡"
- **Historique** : liste séances, détail par séance, résumé sets
- **Progression** : dashboard stats (séances/PRs/volume), graphique 1RM Epley, détail par exercice
- **UX** : auto-activation premier programme, pre-fill nom exercice, check-in segmented control, timer fond absolu (background-safe)
- **Design** : palette Trace monochrome, tokens Radius/Typography, Inter font, splash dark

### Architecture
- Repository Pattern (interfaces + SQLite + InMemory)
- Dependency Injection via constructeurs
- Service Layer (6 services)
- Migrations versionnées PRAGMA user_version (v1 → v2)
- TDD — ~232 tests GREEN
- TypeScript strict, zéro `any`
- WCAG 2.2 + EN 301 549, `PressableA11y` partout

---

## 2026-05-22 — Architecture SQLite

### Fait
- Schéma complet : 10 tables
- Migrations versionnées via PRAGMA user_version
- 17 exercices prédéfinis en seed
- TypeScript strict — zéro erreur

---

## 2026-05-22 — Initialisation du projet

### Fait
- Rédaction des spécifications complètes (`specs.md`)
- Initialisation du projet Expo avec TypeScript + Expo Router
- Mise en place de la documentation VitePress
