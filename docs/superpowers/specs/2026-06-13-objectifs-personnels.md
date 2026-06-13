# Spec — Objectifs personnels

**Date :** 2026-06-13
**Statut :** Approuvé

---

## Contexte

L'utilisateur veut pouvoir se fixer un objectif de poids de travail sur un exercice ("Squat 100kg") avec une date cible optionnelle, et voir l'ETA calculé depuis sa progression observée. L'app détecte automatiquement quand l'objectif est atteint.

Philosophie anti-perf (filtre 3 questions) :
- Célèbre la présence (✓) : ETA factuel, "✦ Atteint" — pas de punition si pas atteint
- Données tirées (✓) : l'utilisateur navigue vers l'écran pour voir, pas de notification push
- Soi-même (✓) : progression vs sa propre cible uniquement

---

## Règles de gestion

- **Un seul objectif par exercice** — UNIQUE(exercise_id) en DB. Créer un nouvel objectif remplace l'existant.
- **Cible = poids de travail** (kg) — `bestSet.weight` de l'historique, pas le 1RM estimé.
- **Bodyweight exclus** — pas d'objectif poids pour les exercices `weight_type = 'bodyweight'` (`bestSet.weight = 0` sans signification).
- **Date cible optionnelle** — chips "dans 1 mois / 3 mois / 6 mois / 1 an / Aucune". Convertie en ISO date (YYYY-MM-DD) à la création.
- **Objectif atteint** : détection automatique quand `bestSet.weight ≥ target_weight` — `achieved_at` rempli, ETA remplacé par "✦ Atteint le …". Pas de notification push.
- **Suppression manuelle** — l'utilisateur supprime explicitement si il veut.

---

## Algorithme ETA — `computeETA`

**Fonction pure**, testable sans DB. Entrées :
- `sessions: { date: string; weight: number }[]` — historique bestSet par session, trié ASC par date. Max 12 dernières sessions.
- `targetWeight: number`
- `targetDate?: string` — ISO date optionnelle

**Étapes :**
1. Filtrer sessions avec `weight > 0` (exclure bodyweight si jamais)
2. Si `< 3 sessions` → `{ status: 'no_data' }`
3. Si `sessions[sessions.length - 1].weight >= targetWeight` → `{ status: 'achieved' }`
4. Poser `x0 = Date.parse(sessions[0].date)`. Convertir chaque session en `xi = (Date.parse(sessions[i].date) - x0) / 86400000` (jours depuis la première session). `yi = sessions[i].weight`.
5. Régression linéaire sur (xi, yi) :
   - `slope = (n·Σxy - Σx·Σy) / (n·Σx² - (Σx)²)` kg/jour
   - `intercept = (Σy - slope·Σx) / n`
6. Si `slope ≤ 0` → `{ status: 'stagnant' }`
7. Calculer le poids estimé aujourd'hui : `x_today = (Date.now() - x0) / 86400000`, `weightToday = intercept + slope * x_today`
8. `daysUntilTarget = (targetWeight - weightToday) / slope`
9. `etaDate = new Date(Date.now() + daysUntilTarget * 86400000).toISOString().slice(0, 10)`
10. Si `targetDate` fournie → `x_target = (Date.parse(targetDate) - x0) / 86400000`, `projectedAtTargetDate = Math.round((intercept + slope * x_target) * 10) / 10`
11. Retourner `{ status: 'on_track', etaDate, ratePerWeek: Math.round(slope * 7 * 10) / 10, projectedAtTargetDate? }`

**Type `ETAResult` :**
```typescript
export type ETAResult =
  | { status: 'achieved' }
  | { status: 'on_track'; etaDate: string; ratePerWeek: number; projectedAtTargetDate?: number }
  | { status: 'stagnant' }
  | { status: 'no_data' };
```

---

## DB — migration v12

```sql
CREATE TABLE goals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id   INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  target_weight REAL    NOT NULL,
  target_date   TEXT,
  achieved_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(exercise_id)
);
```

**Interface `Goal` (types.ts) :**
```typescript
export interface Goal {
  id: number;
  exercise_id: number;
  target_weight: number;
  target_date: string | null;
  achieved_at: string | null;
  created_at: string;
}
```

---

## Architecture

### Repositories

**`IGoalRepository`** :
```typescript
interface IGoalRepository {
  save(dto: CreateGoalDto): Promise<Goal>;
  findByExerciseId(exerciseId: number): Promise<Goal | null>;
  findAllWithExercise(): Promise<GoalWithExercise[]>;  // JOIN goals + exercises
  update(id: number, patch: Partial<Pick<Goal, 'achieved_at' | 'target_weight' | 'target_date'>>): Promise<void>;
  delete(id: number): Promise<void>;
}

interface CreateGoalDto {
  exercise_id: number;
  target_weight: number;
  target_date: string | null;
}

interface GoalWithExercise {
  goal: Goal;
  exerciseName: string;
}
```

**`SQLiteGoalRepository`** : `save` utilise INSERT OR REPLACE (remplace grâce à UNIQUE).

**`InMemoryGoalRepository`** : pour les tests.

### GoalService

```typescript
class GoalService {
  constructor(private goalRepo: IGoalRepository) {}

  async setGoal(exerciseId: number, targetWeight: number, targetDate: string | null): Promise<Goal>
  async getGoal(exerciseId: number): Promise<Goal | null>
  async getAllGoalsWithExercise(): Promise<GoalWithExercise[]>
  async markAchieved(id: number, achievedAt: string): Promise<void>
  async deleteGoal(id: number): Promise<void>
}
```

`computeETA` est une fonction pure exportée depuis `services/goalETA.ts`, pas une méthode de `GoalService`.

---

## Tests TDD

### `computeETA` (goalETA.test.ts) — 7 cas minimum

1. `< 3 sessions` → `'no_data'`
2. `sessions vides` → `'no_data'`
3. Dernière session weight ≥ target → `'achieved'`
4. Pente ≤ 0 (même poids partout) → `'stagnant'`
5. Progression régulière (+2kg/sem sur 8 sessions) → `'on_track'` avec `etaDate` et `ratePerWeek ≈ 2`
6. Avec `targetDate` → `projectedAtTargetDate` présent dans le résultat
7. Fenêtre 12 sessions : l'appelant passe `recentSessions.slice(-12).map(s => ({ date: s.date, weight: s.bestSet.weight }))` — `computeETA` reçoit exactement 12 points, résultat cohérent avec les 12 dernières séances uniquement

### `GoalService` (GoalService.test.ts) — 4 cas

1. `setGoal` crée un objectif
2. `setGoal` sur même exercice remplace l'existant (INSERT OR REPLACE)
3. `markAchieved` remplit `achieved_at`
4. `deleteGoal` supprime

---

## UI

### `progression/[exerciseId].tsx` — section OBJECTIF

Après la section "HISTORIQUE SÉANCES", nouvelle section "OBJECTIF" :

**État — pas d'objectif :**
```
[Définir un objectif]   (PressableA11y, ouvre BottomSheet)
```
*(Masqué entièrement si `exerciseHistory?.recentSessions.every(s => s.bestSet.weight === 0)` — proxy bodyweight, pas de colonne weight_type sur exercises)*

**État — en cours :**
```
OBJECTIF
100 kg  ·  ETA : août 2026  (+1.5 kg/sem)
[Supprimer]
```
Si `targetDate` fournie et `projectedAtTargetDate` disponible :
```
100 kg  ·  ETA : août 2026  (+1.5 kg/sem)
À la date cible (juin) : ~92 kg estimés
```

**État — stagnant :**
```
100 kg  ·  Progression stagnante — ETA non calculable
```

**État — pas assez de données :**
```
100 kg  ·  Trop peu de séances pour estimer
```

**État — atteint :**
```
✦ 100 kg atteint le 15 août 2026
[Supprimer]
```

**BottomSheet création :**
- TextInput numérique "Poids cible (kg)"
- Chips date : [1 mois] [3 mois] [6 mois] [1 an] [Sans date] (sélection exclusive)
- Aperçu ETA en temps réel (recalculé à chaque changement du TextInput)
- Bouton "Enregistrer"

**Détection atteinte** (`useEffect` au chargement de l'écran) :
```typescript
if (goal && !goal.achieved_at && bestSet && bestSet.weight >= goal.target_weight) {
  goalService.markAchieved(goal.id, new Date().toISOString());
}
```

### `(tabs)/progression.tsx` — section OBJECTIFS dans Stats

Avant "Rechercher un exercice", nouvelle section "OBJECTIFS" :

```
OBJECTIFS
Squat              100 kg  ·  août 2026
Développé couché   ✦ 80 kg atteint
```

Masqué si `goals.length === 0`. Chaque ligne est un `PressableA11y` qui navigue vers `/progression/[exerciseId]`.

**Source de données :** hook `useGoals()` → `{ goals: GoalWithExercise[], isLoading, refresh }`. Appelé dans `progression.tsx` avec `useFocusEffect` + `refresh` (même pattern que `useHistory` / `useProgression`). GoalService construit inline avec `SQLiteGoalRepository`.

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `app/db/schema.ts` | Modifier — ajouter migration v12 |
| `app/db/types.ts` | Modifier — ajouter `Goal`, `CreateGoalDto`, `GoalWithExercise` |
| `app/repositories/IGoalRepository.ts` | Créer |
| `app/repositories/InMemoryGoalRepository.ts` | Créer |
| `app/repositories/SQLiteGoalRepository.ts` | Créer |
| `app/services/goalETA.ts` | Créer — `computeETA` pure function + types |
| `app/services/goalETA.test.ts` | Créer — 7 tests TDD |
| `app/services/GoalService.ts` | Créer |
| `app/services/GoalService.test.ts` | Créer — 4 tests TDD |
| `app/app/progression/[exerciseId].tsx` | Modifier — section OBJECTIF + BottomSheet |
| `app/hooks/useGoals.ts` | Créer — `useGoals()` → `{ goals: GoalWithExercise[], isLoading, refresh }` |
| `app/app/(tabs)/progression.tsx` | Modifier — section OBJECTIFS Stats |

---

## Hors scope

- Objectifs en reps (ex: "20 tractions") — bodyweight ou reps cibles
- Notifications push ("tu approches de ton objectif")
- Partage d'objectif
- Plusieurs objectifs par exercice
- Historique des objectifs accomplis (archive)
- Objectifs cardio (durée/distance)
