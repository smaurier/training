# Architecture

> Ce document est mis à jour au fil du développement.

## Stack

| Couche | Technologie |
|--------|-------------|
| Framework | React Native + Expo |
| Navigation | Expo Router (file-based) |
| Stockage | SQLite (expo-sqlite) |
| Langage | TypeScript |
| Documentation | VitePress |

## Structure du projet

```
training-app/
├── docs/          ← documentation VitePress
└── app/           ← projet Expo
    ├── app/       ← routes Expo Router
    ├── components/
    ├── constants/
    └── assets/
```

## Décisions techniques

### Stockage local (SQLite)
Pas de backend pour le MVP. Toutes les données restent sur l'appareil. Un export JSON manuel sert de sauvegarde. La sync cloud est envisagée en V2.

### Expo Router
Navigation file-based pour une structure de routes lisible et maintenable. Chaque écran correspond à un fichier dans `app/`.
