# Training App

Application mobile de suivi d'entraînement musculaire. Remplace le carnet papier : bibliothèque d'exercices, construction de séances par blocs libres, édition et réordonnancement des séries en live.

## Stack

- **React Native** + **Expo SDK 54**
- **Navigation** : Expo Router (file-based)
- **Stockage** : SQLite via `expo-sqlite` — 100 % local, zéro backend
- **Langage** : TypeScript strict
- **Tests** : Jest + jest-expo

## Prérequis

- Node.js ≥ 18
- [Expo CLI](https://docs.expo.dev/get-started/installation/) : `npm install -g expo-cli`
- Pour iOS : Xcode + Simulateur iOS **ou** application Expo Go sur un vrai appareil
- Pour Android : Android Studio + émulateur **ou** application Expo Go sur un vrai appareil

## Lancer l'app

```bash
cd app
npm install
npm start          # ouvre le menu Expo — choisir iOS / Android / Web
```

Raccourcis après `npm start` :

| Touche | Action |
|--------|--------|
| `i` | Ouvrir sur simulateur iOS |
| `a` | Ouvrir sur émulateur Android |
| `w` | Ouvrir dans le navigateur |

## Lancer les tests

```bash
cd app
npm test                   # une passe
npm run test:watch         # mode watch
```

## Vérifier les types

```bash
cd app
npx tsc --noEmit
```

## Structure

```
app/
├── app/              ← routes Expo Router (un fichier = un écran)
│   ├── (tabs)/       ← onglets principaux
│   └── workout/      ← écran détail séance
├── components/       ← composants UI réutilisables
├── constants/        ← couleurs et thème
├── db/               ← schéma SQLite + migrations + types
├── hooks/            ← hooks React (useWorkoutExercises, …)
├── repositories/     ← accès données (interfaces + InMemory + SQLite)
└── services/         ← logique métier (WorkoutExerciseService, …)
```

## Fonctionnalités implémentées

- Bibliothèque d'exercices (prédéfinis + custom)
- Construction de séances : exercices → blocs → séries
- Édition inline : modifier / ajouter / supprimer blocs et séries
- Réordonnancement ↑↓ : exercices, blocs et séries

## Documentation

- Specs fonctionnelles : `docs/specs.md`
- Architecture technique : `docs/architecture.md`
- Journal de développement : `docs/journal/project-log.md`
