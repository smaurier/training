@AGENTS.md

# Training App

Application React Native personnelle de suivi d'entraînement musculaire. L'app conduit la séance du début à la fin : chrono de pause, saisie des reps, progression automatique des poids.

## Stack

- **React Native** + **Expo** (SDK 53)
- **Navigation** : Expo Router (file-based, dossier `app/`)
- **Stockage** : SQLite via `expo-sqlite`
- **Langage** : TypeScript strict
- **Doc** : VitePress dans `../docs/`

## Structure du projet

```
app/
├── app/              ← routes Expo Router (un fichier = un écran)
│   ├── (tabs)/       ← navigation principale par onglets
│   └── _layout.tsx   ← layout racine
├── components/       ← composants réutilisables
├── constants/        ← couleurs, thème, constantes
├── assets/           ← images, polices
└── .claude/          ← config Claude Code
```

## Commandes

```bash
npm start             # lancer le serveur Expo
npm run android       # lancer sur Android
npm run ios           # lancer sur iOS
npm run web           # lancer dans le navigateur
npx tsc --noEmit      # vérifier les types TypeScript
```

## Conventions

- Composants : PascalCase (`SessionTimer.tsx`)
- Hooks custom : `use` prefix (`useWorkout.ts`)
- Dossier par domaine dans `components/` (ex: `components/session/`, `components/exercises/`)
- Pas de `any` TypeScript — typage strict partout
- Thème centralisé dans `constants/Colors.ts` — pas de valeurs hardcodées
- Accessibilité : `accessibilityLabel` obligatoire sur tous les éléments interactifs

## Docs

- Spécifications fonctionnelles : `../docs/specs.md`
- Architecture technique : `../docs/architecture.md`
- Changelog : `../docs/changelog.md`

## Règles importantes

- **Début de session** : lire `../docs/journal/project-log.md` pour connaître l'état du projet et ce qui a été fait en dernière session
- **Fin de session** : mettre à jour `../docs/journal/project-log.md` avec ce qui a été fait, les décisions prises et la prochaine étape
- Mettre à jour `../docs/architecture.md` après chaque décision technique structurante
- Mettre à jour ce fichier si la stack, la structure ou les conventions changent
