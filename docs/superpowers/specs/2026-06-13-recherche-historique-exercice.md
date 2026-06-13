# Spec — Recherche historique exercice

**Date :** 2026-06-13
**Statut :** Approuvé

---

## Contexte

L'onglet Progression affiche le 1RM courant + delta par exercice (`Exercise1RMCard`). Mais il n'existe aucun moyen de consulter le détail d'une séance passée pour un exercice donné : "j'ai fait combien de reps à quel poids la dernière fois ?" est une question fréquente juste avant de commencer un exercice.

---

## Cas d'usage

1. **Avant séance** : "Squat — j'ai fait 80kg×5 la dernière fois, je pars à quel poids ?"
2. **Suivi progression** : "Est-ce que je progresse vraiment sur le Rowing ?"

---

## Design

### 1. Data layer — `ExerciseHistoryService`

Fichier `app/services/ExerciseHistoryService.ts`. Deux repos en constructeur : `ISetLogRepository` + `IExerciseRepository`.

#### Types

```typescript
export interface ExerciseSetRecord {
  reps: number;
  weight: number;
}

export interface ExerciseSession {
  sessionLogId: number;
  date: string;               // ISO — completed_at du premier set de la séance
  sets: ExerciseSetRecord[];  // toutes les séries de cet exercice dans la séance
  bestSet: ExerciseSetRecord; // série avec le poids le plus élevé
}

export interface ExerciseHistory {
  exercise: Exercise;
  lastSession: ExerciseSession | null;
  recentSessions: ExerciseSession[]; // triées DESC, limitées à N
}
```

#### Méthodes

**`getHistory(exerciseId: number, limit = 10): Promise<ExerciseHistory>`**

Algorithme :
1. `exerciseRepo.findById(exerciseId)` — récupère l'exercice
2. `setLogRepo.findByExerciseId(exerciseId)` — set_logs triés ASC par `completed_at`
3. Grouper par `session_log_id` → chaque groupe = `ExerciseSession`
4. `date` = `completed_at` du premier set du groupe
5. `bestSet` = set avec `weight_done` maximal
6. Trier sessions DESC → `lastSession = sessions[0]`, `recentSessions = sessions.slice(0, limit)`

Retourne `ExerciseHistory` avec `lastSession: null` si aucun set_log trouvé.

**`getLoggedExercises(): Promise<Exercise[]>`**

1. `setLogRepo.findDistinctExerciseIds()` → ensemble d'IDs loggés
2. `exerciseRepo.findAll()` → tous les exercices
3. Filtre client-side : garder uniquement les exercices dont l'id est dans l'ensemble
4. Retourne trié alphabétiquement par nom

---

### 2. Navigation

**2 nouveaux écrans Expo Router :**

| Écran | Route |
|---|---|
| Recherche | `app/app/exercice/search.tsx` |
| Détail historique | `app/app/exercice/[id].tsx` |

**2 points d'entrée :**

1. **Stats tab** — pressable "Rechercher un exercice ›" inséré après `<MuscleGroupCard>` dans `progression.tsx`
2. **Exercise1RMCard** — wrappé dans `PressableA11y` avec `onPress?` optionnel → `router.push('/exercice/${exerciceId}')`

---

### 3. Écran search (`app/app/exercice/search.tsx`)

- `TextInput` en haut, `autoFocus`, placeholder "Rechercher un exercice…"
- `FlatList` des exercices filtrés : `exercise.name.toLowerCase().includes(query.toLowerCase())`
- Source : `useLoggedExercises()` — uniquement les exercices ayant des set_logs
- Tap sur un exercice → `router.push('/exercice/${exercise.id}')`
- Empty state si `exercises.length === 0` (aucun log) ou si query ne matche rien
- Back button header → retour au tab Progression

---

### 4. Écran détail (`app/app/exercice/[id].tsx`)

Source : `useExerciseHistory(id)`.

**Structure visuelle :**

```
← Squat barre
────────────────────────────────
DERNIÈRE SÉANCE — lun. 9 juin 2026
  · 80 kg × 5 reps
  · 80 kg × 5 reps
  · 82.5 kg × 4 reps

HISTORIQUE
  2 juin     82.5 kg × 5    ← meilleur set
  26 mai     80 kg × 5
  19 mai     77.5 kg × 5
  12 mai     77.5 kg × 4
  ...
```

- Card "DERNIÈRE SÉANCE" : date formatée (jj mmmm yyyy) + liste de toutes les séries (weight × reps)
- Section "HISTORIQUE" : liste DESC, une ligne par séance (date courte + bestSet)
- Loading spinner pendant fetch
- Empty state si `lastSession === null`
- Volumes affichés via `useUnits` (kg ou lbs selon réglages)

---

### 5. Hooks

**`useExerciseHistory(exerciseId: number)`**
- Expose `{ history: ExerciseHistory | null, isLoading: boolean, error: string | null, refresh: () => Promise<void> }`
- Pattern identique à `useProgression`

**`useLoggedExercises()`**
- Expose `{ exercises: Exercise[], isLoading: boolean }`
- Utilisé dans `search.tsx`

---

## Architecture — fichiers

| Fichier | Action |
|---|---|
| `app/services/ExerciseHistoryService.ts` | Créer — types + 2 méthodes |
| `app/services/ExerciseHistoryService.test.ts` | Créer — TDD |
| `app/hooks/useExerciseHistory.ts` | Créer |
| `app/hooks/useLoggedExercises.ts` | Créer |
| `app/app/exercice/search.tsx` | Créer |
| `app/app/exercice/[id].tsx` | Créer |
| `app/components/progression/Exercise1RMCard.tsx` | Modifier — prop `onPress?: () => void` |
| `app/app/(tabs)/progression.tsx` | Modifier — pressable "Rechercher un exercice ›" |

---

## Hors scope

- Graphe 1RM temporel
- Filtres par période ou programme
- Comparaison entre exercices
- Export
