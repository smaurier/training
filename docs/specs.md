# Training App — Specifications

## Objectif

Application React Native personnelle pour remplacer le carnet d'entraînement. L'app conduit la séance du début à la fin : l'utilisateur n'a qu'à la suivre. Elle assure le suivi des poids utilisés et gère automatiquement la progression au fil des séances.

---

## Stack technique

- **React Native** avec **Expo**
- **Stockage local** : SQLite (via expo-sqlite)
- **Export de secours** : JSON (import/export manuel)
- **Accessibilité** : conformité WCAG, labels, contrastes, navigation clavier
- **Thème** : mode Light et Dark (respect du thème système + switch manuel)

---

## MVP — V1

### 1. Bibliothèque d'exercices

- Base d'exercices prédéfinis (classiques muscu + étirements)
- Ajout d'exercices custom
- Chaque exercice contient :
  - Nom
  - Type : `musculation` | `étirement` | `cardio`
  - Groupes musculaires ciblés
  - Points techniques (notes libres)
  - Paramètres de progression (pas de poids, seuil de déclenchement)

### 2. Programmes

- Création et édition de programmes (ex : Push / Pull / Legs / Full body)
- Un programme contient une liste de séances
- Une séance contient une liste d'exercices ordonnés
- Chaque exercice dans une séance est configuré avec des **blocs libres** :
  - Nom du bloc (ex : "Échauffement", "Travail", "Back-off") — libre
  - Chaque bloc contient des séries :
    - Nombre de répétitions cible (valeur fixe ou fourchette ex: `6–8`)
    - Charge cible (poids en kg, ou `barre`, ou `PC` pour poids de corps)
    - Temps de pause après la série (en secondes, configurable par série)

**Exemple de configuration d'exercice :**
```
Développé couché barre
├── Échauffement
│   ├── barre × 10
│   ├── 40 kg × 5
│   └── 45 kg × 3
├── Travail
│   ├── 1 × 4–6 reps  |  pause 3 min
│   └── 3 × 6–8 reps  |  pause 2 min
└── Back-off
    └── −20% charge × 12–15 reps
```

### 3. Conduite de séance

Le mode séance guide l'utilisateur pas à pas.

**Déroulement :**
1. Check-in rapide au lancement : ressenti du jour (forme / fatigue / sommeil — 3 taps max)
2. Affichage du premier exercice et de la première série
3. L'utilisateur effectue la série
4. Il tape l'écran → le chrono de pause démarre
5. À la fin du chrono → affichage de la série suivante
6. Saisie des reps réellement faites + poids utilisé + RPE (1–10, optionnel)
7. Raccourci **"Tout réussi"** pour valider en un tap si toutes les reps cibles sont atteintes
8. Enchaînement automatique jusqu'à la fin de la séance
9. PR badge : notification discrète si un record est battu pendant la séance

**Affichage pendant la séance :**
- Exercice en cours + bloc en cours
- Numéro de série (ex : Série 2/4)
- Cible : reps + charge
- **Plate calculator** : affichage des plaques à mettre sur la barre pour la charge cible
- Chrono de pause (grand, lisible, tap pour start/stop)
- Historique de la dernière séance pour cet exercice (poids + reps)

### 4. Suivi des poids et progression automatique

- Chaque série réalisée est enregistrée : date, poids, reps effectuées, RPE (si renseigné)
- **Règle de progression** : si l'objectif est atteint lors d'une séance, la charge est augmentée pour la séance suivante
- **Paramètres configurables (globaux, surchargeables par exercice) :**
  - Pas de progression : `+2 kg` par défaut
  - Seuil de déclenchement : `1 séance réussie` par défaut (configurable à 2 ou 3)
- "Objectif atteint" = toutes les séries de travail dans la fourchette de reps cible
- **Déload automatique** : après X semaines consécutives sans progression (ou sur indication manuelle), l'app propose une semaine de décharge (-40% sur les charges). Configurable dans les réglages.

### 5. Historique

- Liste des séances passées (date, programme, durée)
- Détail d'une séance : tous les exercices avec les poids et reps réalisés

### 6. Progression

Page dédiée au suivi des performances, accessible depuis la navigation principale.

**Navigation :**
- Liste de tous les exercices pratiqués
- Tap sur un exercice → vue détaillée

**Vue détaillée par exercice :**
- Graphique d'évolution du poids (ou 1RM estimé) au fil du temps
- 1RM estimé (calculé via formule d'Epley : `poids × (1 + reps / 30)`)
- Historique des PRs avec la date
- Volume par séance (séries × reps × poids) — courbe secondaire optionnelle
- Corrélation RPE / performance : visualiser si les séances difficiles (RPE élevé) coïncident avec des stagnations

**Indicateurs globaux (vue synthèse) :**
- Consistance : fréquence d'entraînement sur les 4 dernières semaines (séances / semaine)
- Ressenti moyen (basé sur les check-ins avant séance)

---

## V2 — Itérations futures

### Agenda & planification
- Agenda interne hebdomadaire pour organiser les séances
- Synchronisation avec Google Calendar (OAuth) : l'app est la source de vérité, elle modifie le Google Agenda
- Notifications push : rappel de séance

### Cardio / Footing
- Bloc dans l'agenda identifié visuellement comme cardio
- Saisie libre : durée, distance, notes
- Pas de tracking GPS (hors scope)

### Étirements
- Même logique que la muscu (blocs + séries)
- Différenciation visuelle (code couleur, icône) dans la bibliothèque et pendant la séance

### Supersets
- Possibilité de lier deux exercices en superset (exécution en alternance)

### Widget écran d'accueil
- Affichage de la prochaine séance planifiée
- Bouton "Démarrer" accessible directement depuis l'écran d'accueil

### Cloud sync
- Compte utilisateur
- Sauvegarde et synchronisation multi-appareils

---

## Accessibilité & UI

- Labels accessibles sur tous les éléments interactifs
- Contrastes conformes WCAG AA minimum
- Tailles de police respectant les préférences système
- Navigation au lecteur d'écran (VoiceOver / TalkBack)
- Mode Light / Dark : respect du thème système + switch manuel dans les réglages
- Ergonomie séance : le moins de taps possible, les éléments critiques (chrono, validation) sont grands et facilement accessibles

---

## Réglages

- Pas de progression par défaut (kg)
- Seuil de déclenchement de la progression (1 / 2 / 3 séances)
- Déload automatique : activé / désactivé + seuil de semaines sans progression
- Barre olympique configurée (poids de la barre utilisé par le plate calculator)
- Thème (Light / Dark / Système)
- Export / Import des données (JSON)
