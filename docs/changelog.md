# Changelog

## 2026-05-22 — Initialisation du projet

### Fait
- Rédaction des spécifications complètes (`specs.md`)
- Initialisation du projet Expo avec TypeScript + Expo Router (template tabs)
- Mise en place de la documentation VitePress

### Périmètre MVP défini
- Bibliothèque d'exercices (base prédéfinie + custom)
- Programmes avec blocs libres et séries configurables
- Séance guidée avec chrono de pause et saisie des reps
- Progression automatique des poids
- Historique et vue progression par exercice (1RM, RPE, PRs)

### Prochaine étape
- Implémentation des services (CRUD exercises, programs, sessions, progression)
- Navigation et premiers écrans

## 2026-05-22 — Architecture SQLite

### Fait
- Installation expo-sqlite
- Schéma complet : 10 tables (exercises, programs, workouts, workout_exercises, blocks, sets, session_logs, set_logs, personal_records, settings)
- Système de migrations versionnées via PRAGMA user_version
- 17 exercices prédéfinis en seed (musculation classique)
- Initialisation de la DB branchée sur le splash screen (`_layout.tsx`)
- TypeScript strict — zéro erreur
