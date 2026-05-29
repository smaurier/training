# Conduite de séance guidée — Design Spec
Date : 2026-05-29

## Contexte

Feature MVP core. L'app guide l'utilisateur série par série pendant la séance : check-in état du jour, timer de pause, saisie des reps/poids/RPE, "Tout réussi" shortcut, résumé avec progressions automatiques.

Schema DB déjà en place (`session_logs`, `set_logs`, `personal_records`). Zéro migration nécessaire.

---

## Décisions architecturales

### Entrée
Bouton **"▶ Démarrer la séance"** sur `workout/[id].tsx` (écran de config existant). Navigation vers `session/[workoutId].tsx`.

### Navigation home
`app/(tabs)/index.tsx` affiche la prochaine séance via `SessionService.getNextWorkout(activeProgramId)` — déterminé par le dernier `session_log` du programme actif (séquence circulaire).

### Structure écran session
**State machine** dans un seul écran `session/[workoutId].tsx`. Pas de routes séparées → impossible de casser la session avec le bouton Back.

```typescript
type SessionPhase = 'checkin' | 'running' | 'summary';

interface SessionPosition {
  exerciseIdx: number;
  blockIdx: number;
  setIdx: number;
}
```

---

## Couches nouvelles

### Repositories

**`ISessionLogRepository`**
```typescript
create(dto: CreateSessionLogDto): Promise<SessionLog>
findById(id: number): Promise<SessionLog | null>
findByWorkoutId(workoutId: number): Promise<SessionLog[]>
complete(id: number, endedAt: string): Promise<void>
```
Contract tests : create, findById, findByWorkoutId, complete.

**`ISetLogRepository`**
```typescript
create(dto: CreateSetLogDto): Promise<SetLog>
findBySessionLogId(sessionLogId: number): Promise<SetLog[]>
findBySetId(setId: number): Promise<SetLog[]>
```
Contract tests : create, findBySessionLogId, findBySetId.

### SessionService

| Méthode | Signature | Rôle |
|---|---|---|
| `startSession` | `(workoutId, checkin) → SessionLog` | Crée session_log avec started_at = now |
| `logSet` | `(sessionLogId, set, actual) → SetLog` | Crée set_log, détecte PR via Epley |
| `completeSession` | `(sessionLogId) → void` | Met ended_at = now |
| `getNextWorkout` | `(programId) → Workout \| null` | Dernier session_log → workout suivant en séquence |
| `calculateProgressions` | `(sessionLogId) → ProgressionResult[]` | Vérifie seuil, applique +weight si atteint |

**Règle de progression :**
- Pour chaque exercice du workout : récupérer tous les `set_logs` de la session pour les sets `is_work_block = 1`
- "Objectif atteint" = `reps_done >= reps_max` pour TOUTES les séries de travail
- Vérifier `exercise.progression_threshold` : compter les N derniers `session_logs` où l'objectif était atteint
- Si seuil atteint : `set.weight += exercise.progression_step` pour tous les sets de travail de l'exercice
- Retourne `ProgressionResult[]` : `{ exerciseName, oldWeight, newWeight, achieved: boolean }`

**Détection PR :**
- À chaque `logSet`, calculer 1RM estimé via Epley : `weight × (1 + reps / 30)`
- Si > dernier PR enregistré pour cet exercice → insérer dans `personal_records`

### useSession hook

```typescript
interface UseSessionReturn {
  phase: SessionPhase;
  sessionLogId: number | null;
  position: SessionPosition;
  currentSet: Set | null;
  currentBlock: BlockWithSets | null;
  currentExercise: WorkoutExerciseDetail | null;
  progressLabel: string; // "2 / 5 exercices"
  startSession: (checkin: CheckIn) => Promise<void>;
  validateSet: (actual: SetActual) => Promise<void>;
  skipSet: () => void;
  progressions: ProgressionResult[];
  sessionDuration: number; // secondes
  totalSetsLogged: number;
}
```

---

## Écran `session/[workoutId].tsx`

### Phase 1 : CheckIn

Trois lignes verticales :
- **Énergie** : 😴 (1) / 😐 (2) / 💪 (3)
- **Fatigue** : 💪 (1=peu) / 😐 (2) / 😴 (3=beaucoup)
- **Sommeil** : 😴 (1=mauvais) / 😐 (2) / 🌙 (3=bon)

Bouton **"Commencer"** (disabled tant que rien sélectionné) → `startSession(checkin)` → phase `running`.

### Phase 2 : Running

Layout hybride (option C retenue) :

```
┌─────────────────────────────────┐
│ ← [nom exercice]  2/5 exercices │  ← header
│ TRAVAIL — Série 2/4             │
├─────────────────────────────────┤
│        80 kg × 6–8 reps         │  ← cible
│  Dernière fois : 80 kg × 7 ✓   │
├─────────────────────────────────┤
│            2:30                 │  ← grand timer (tap=pause)
│           PAUSE                 │
├─────────────────────────────────┤
│  Reps [7]  Poids [80]  RPE [8] │  ← saisie
│                                 │
│    [✓ Valider]  [Tout réussi ⚡]│
├─────────────────────────────────┤
│ Séries restantes                │
│ 3 · 80 kg × 6–8 (grisé)       │  ← aperçu
│ 4 · 80 kg × 6–8 (grisé)       │
│              [Passer →]         │
└─────────────────────────────────┘
```

**Comportements :**
- Poids pré-rempli depuis `set.weight`, reps pré-rempli depuis `set.reps_max`
- "Tout réussi ⚡" : reps = `reps_max`, poids = `set.weight`, RPE non renseigné → valide directement
- Timer démarre automatiquement après validation (décompte depuis `set.rest_duration`)
- Tap sur timer = pause/reprendre
- Dernière série validée → `advancePosition()` → si `null` → phase `summary`

**`advancePosition()` — fonction pure :**
1. setIdx + 1 dans le bloc courant → si existe → ok
2. blockIdx + 1 dans l'exercice courant → setIdx = 0 → si existe → ok
3. exerciseIdx + 1 → blockIdx = 0, setIdx = 0 → si existe → ok
4. Retourne `null` → séance terminée

### Phase 3 : Summary

```
🎉 Séance terminée !
[nom séance] · [durée]

[5 exercices]  [18 séries]  [4 280 kg total]  [RPE 8.2]

── Progressions ──────────────────
↑ Développé couché   80 → 82 kg
↑ Écarté poulie      15 → 17 kg
  Triceps corde      pas encore (1/2 séances)

[Retour au programme]
```

---

## Accueil `app/(tabs)/index.tsx`

- Appelle `SessionService.getNextWorkout(activeProgramId)` au focus
- Si programme actif + séance trouvée :
  ```
  ┌────────────────────────────────┐
  │ Prochaine séance               │
  │ Push A · 5 exercices           │
  │              [▶ Démarrer]      │
  └────────────────────────────────┘
  ```
- Si aucun programme actif : "Crée un programme pour commencer" + lien Programmes

---

## Modifications existantes

- `workout/[id].tsx` : bouton **"▶ Démarrer la séance"** en bas de l'écran (primary, pleine largeur)
- `app/_layout.tsx` : ajout `<Stack.Screen name="session/[workoutId]" options={{ headerShown: false }} />`
- `app/(tabs)/_layout.tsx` : si nécessaire, renommer l'onglet index

---

## Tests

**Contract tests `ISessionLogRepository`** (~4 cas) :
- create → retourne SessionLog avec id
- findById → retourne ou null
- findByWorkoutId → retourne liste ordonnée par started_at
- complete → met ended_at

**Contract tests `ISetLogRepository`** (~4 cas) :
- create → retourne SetLog
- findBySessionLogId → liste
- findBySetId → liste

**`SessionService.test.ts`** (~15 cas) :
- startSession → crée session_log
- logSet → crée set_log
- logSet → détecte PR si 1RM amélioré
- logSet → pas de PR si 1RM inchangé
- completeSession → ended_at mis à jour
- getNextWorkout → retourne workout suivant en séquence
- getNextWorkout → boucle sur le premier si dernier workout fait
- getNextWorkout → premier workout si aucun session_log
- getNextWorkout → null si programme sans workouts
- calculateProgressions → progression si objectif atteint + seuil 1
- calculateProgressions → pas de progression si objectif non atteint
- calculateProgressions → pas de progression si seuil 2 non atteint (1 séance réussie sur 2)
- calculateProgressions → progression si seuil 2 atteint (2 séances réussies consécutives)
- calculateProgressions → retourne achieved: false si seuil pas encore là

**useTimer hook** : testé manuellement (tick, pause, reset).

---

## Hors scope Session 9

- Plate calculator (V2 ou Session 10)
- Historique des séances (Session 10)
- Page Progression / graphiques (Session 10)
- Drag-and-drop reorder (déjà fait en 8B)

---

## Note design

Après complétion du MVP (conduite de séance), session dédiée au polish visuel avant V2.
