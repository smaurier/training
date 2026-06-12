@AGENTS.md

# Training App

Application React Native personnelle de suivi d'entraînement musculaire. L'app conduit la séance du début à la fin : chrono de pause, saisie des reps, progression automatique des poids.

## Stack

- **React Native** + **Expo** (SDK 54)
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
npm run typecheck     # vérifier les types TypeScript (tsc --noEmit)
npm test              # lancer la suite de tests Jest
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

## Git hooks

Pre-commit TypeScript check installé dans `.githooks/`. Activer une fois :

```bash
git config core.hooksPath .githooks
```

## Philosophie UX — Entraînement sérieux, sans les mécaniques toxiques

Référence complète : `../docs/superpowers/specs/2026-06-12-philosophie-entrainement-sain.md`

### Principe fondateur
> *Ta progression est visible, motivante, et personnelle. Elle ne te compare à personne. Elle ne te punit jamais.*

### Filtre de décision — poser pour chaque feature/copy
1. **Flèche :** célèbre la présence (✓) ou punit l'absence (✗) ?
2. **Direction :** donnée tirée par l'utilisateur (✓) ou poussée vers lui (✗) ?
3. **Comparaison :** compare à soi-même (✓) ou à d'autres (✗) ?

Trois ✓ = go. Un ✗ = revoir avant d'implémenter.

### Règle de copy
- ❌ Jamais : "tu n'as pas fait de séance depuis X jours", "streak perdue", "tes perfs baissent", "comparé à la moyenne"
- ✓ Toujours : factuel, additif, personnel — "3 séances ce mois", "nouvelle meilleure marque", "cible atteinte"

### Anti-patterns à éviter absolument
- **Strava Effect** : ne jamais ajouter classements, challenges publics, comparaisons externes
- **Noom Effect** : si le discours dit "bienveillant" mais l'accueil pousse des stats perf → contradiction
- **Apple Rings Effect** : aucun élément visuel rouge/incomplet/manquant qui peut culpabiliser passivement

---

## Règles importantes

- **Début de session** : annoncer le scope explicitement + lire `../docs/journal/project-log.md`
- **Scope creep** : signaler toute dérive hors scope avant d'agir, proposer de reporter
- **Fin de session** : mettre à jour `../docs/journal/project-log.md` avec ce qui a été fait, les décisions prises et la prochaine étape
- Mettre à jour `../docs/architecture.md` après chaque décision technique structurante
- Mettre à jour ce fichier si la stack, la structure ou les conventions changent
