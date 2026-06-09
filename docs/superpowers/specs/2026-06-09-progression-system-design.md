# Spec — Système de progression + fixes critiques

**Date :** 2026-06-09  
**Scope :** Bugs critiques (A) + Système de progression (C)  
**Statut :** Approuvé

---

## 1. Seeds idempotentes

### Problème
Seeds suppriment et recréent tout le programme à chaque lancement → `sets.weight` écrasé → progression perdue au redémarrage.

### Solution
Upsert par clé stable à chaque niveau :
- **Exercice** : clé = `name`
- **Workout** : clé = `name`
- **Block** : clé = `workout_id + name`
- **Set** : clé = `block_id + order_index`

Pour chaque set :
- Si des `set_logs` existent pour ce set → **ne pas toucher `weight`**, update uniquement `reps_min`, `reps_max`, `rest_duration`
- Si aucun `set_log` → insert normal avec `weight: null`

Résultat : structure du programme toujours fraîche, progression jamais écrasée.

### Fichiers concernés
- `db/seeds.ts` — logique upsert à la place du DELETE + INSERT

---

## 2. Timer reset entre exercices

### Problème
`RunningPhase` ne remonte pas entre exercices → état timer (et inputs) persiste.

### Solution
Ajouter `key={set.id}` sur `<RunningPhase>` dans `session/[workoutId].tsx` → remount forcé à chaque nouvelle série → timer et state inputs repartent à zéro.

### Fichiers concernés
- `app/session/[workoutId].tsx` — ajout `key={set.id}`

---

## 3. Pre-fill inputs + suppression "Tout réussi"

### Problème
Inputs vides à chaque série + bouton "Tout réussi" confus.

### Solution
- `useEffect` sur `set.id` dans `RunningPhase` : populate `reps` ← `set.reps_max`, `weight` ← `set.weight ?? ''`
- Supprimer `handleToutReussi` et le bouton "Tout réussi"
- Un seul bouton "Valider"
- Si `weight === null` (premier log) : input weight vide, placeholder "Poids de départ"

### Fichiers concernés
- `components/session/RunningPhase.tsx` — useEffect + suppression handleToutReussi

---

## 4. ExerciseStartingWeightPhase

### Déclencheur
Première fois qu'un exercice `weight_type === 'fixed'` est joué ET aucun `set_log` n'existe pour ses séries `is_work: true`.

Exercices bodyweight / étirements : phase skippée automatiquement.

### Pipeline
```
exercise change detected
  └─ hasNoHistory(exercise) && weight_type === 'fixed' ?
       ├─ oui → ExerciseStartingWeightPhase
       │    → Nom exercice + "Quel est ton poids de départ ?"
       │    → Input numérique + bouton "Confirmer"
       │    → onConfirm: UPDATE sets.weight pour tous les sets du bloc "Travail" uniquement
       │       (pas le Back-off — reps 12-15 — qui reste null jusqu'à weight_ratio)
       │    → passe à RunningPhase avec inputs pré-remplis
       └─ non → RunningPhase directement
```

### Composant
Nouveau `components/session/ExerciseStartingWeightPhase.tsx`

Props :
```ts
interface ExerciseStartingWeightPhaseProps {
  exercise: WorkoutExerciseDetail;
  onConfirm: (weight: number) => Promise<void>;
}
```

### Fichiers concernés
- `components/session/ExerciseStartingWeightPhase.tsx` — nouveau composant
- `app/session/[workoutId].tsx` — intégration dans le pipeline
- `hooks/useSession.ts` — detection `hasNoHistory`
- `services/SessionService.ts` — `setStartingWeight(exerciseId, weight)`

---

## 5. Double progression + déload automatique

### Seeds PPL — reps fixes
Tous les exercices composés passent à reps fixes 8 (sauf exceptions) :

| Exercice | Avant | Après |
|---|---|---|
| Développé couché barre (Travail) | 4-6 / 6-8 | **8** |
| Rowing barre | 6-8 | **8** |
| Squat barre | 6-8 | **8** |
| Romanian Deadlift | 8-8 | **8** (déjà fixe) |
| Tractions | 6-10 | **8** |
| Pin Press | 5-5 | **5** (force, garder) |
| Isolations (curls, lat raises, etc.) | inchangé | inchangé |

### Règle de progression
Après chaque séance, pour chaque exercice Travail :

```
si TOUS les sets : reps_done >= reps_target
  → progression : ceil(weight × 1.025 / 2) × 2
  → reset consecutiveFailures = 0

si AU MOINS UN set : reps_done <= (reps_target - 2)  [manque de 2+ reps]
  → consecutiveFailures += 1
  → si consecutiveFailures >= 2
       → déload : floor(weight × 0.9 / 2) × 2
       → reset consecutiveFailures = 0

sinon (manque de 1 rep)
  → hold, pas de changement
```

### Exemples
| Cible | Résultat | Action |
|---|---|---|
| 8 reps à 60kg | 8/8/8 | → 62kg |
| 8 reps à 60kg | 7/8/8 | → hold |
| 8 reps à 60kg | 6/8/8 | → consecutiveFailures +1 |
| 8 reps à 60kg | 6/8/8 (2e fois) | → 54kg (déload) |

### Formules
```ts
progression : Math.ceil(weight * 1.025 / 2) * 2
déload      : Math.floor(weight * 0.9  / 2) * 2
```

### Champ DB nécessaire
Aucun. `consecutive_failures` calculé depuis l'historique : regarder les 2 derniers `session_logs` de cet exercice + leurs `set_logs` — même approche que `consecutive_successes` existant. Pas de migration.

### Fichiers concernés
- `db/seeds.ts` — reps fixes PPL
- `services/progression.ts` — nouvelle logique `calculateProgression`
- `services/progression.test.ts` — tests mis à jour
- `services/SessionService.ts` — appel déload + progression
- `repositories/SetRepository.ts` — update `consecutive_failures`

---

## Récapitulatif des fichiers touchés

| Fichier | Changement |
|---|---|
| `db/seeds.ts` | Upsert idempotent + reps fixes PPL |
| `db/migrations.ts` | Aucun changement (pas de migration nécessaire) |
| `app/session/[workoutId].tsx` | `key={set.id}` + ExerciseStartingWeightPhase |
| `components/session/RunningPhase.tsx` | Pre-fill useEffect + suppr. Tout réussi |
| `components/session/ExerciseStartingWeightPhase.tsx` | Nouveau composant |
| `hooks/useSession.ts` | Detection hasNoHistory |
| `services/progression.ts` | Double progression + déload |
| `services/progression.test.ts` | Tests mis à jour |
| `services/SessionService.ts` | setStartingWeight + déload |
| `repositories/SetRepository.ts` | aucun changement |

---

## Hors scope (reporté)

- 1RM Epley + RPE-adjusted progression (fin de semaine)
- `weight_ratio` back-off sets
- ExerciseTransitionPhase (Bloc B)
- Cycle rotatif (Bloc F)
- Suggestion programme suivant (long terme)
