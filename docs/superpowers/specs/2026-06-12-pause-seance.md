# Pause Séance — Design Spec

**Date :** 2026-06-12
**Scope :** Interrompre une séance en cours et la reprendre plus tard, sans perte de données

---

## Contexte

`session_logs.ended_at = NULL` signale déjà une séance en cours. Les `set_logs` sont persistés en DB à chaque validation. Ce qui manque : sauvegarder la position exacte (exercice/bloc/série courante) et la restituer au redémarrage.

---

## Déclencheur de pause

Bouton **pause explicite** dans le header de `[workoutId].tsx`.
- Icône `pause-circle-outline`
- Visible si `phase !== 'checkin' && phase !== 'summary'`
- Tap → `session.pauseSession()` → `router.replace('/(tabs)')`

Pas de détection automatique background (hors scope V1).

---

## Reprise

**Home card** — `(tabs)/index.tsx` appelle `service.findAnyPausedSession()` au mount.
Si trouvé, affiche une card au-dessus des workouts :

```
⏸ Séance en pause
<Nom du workout> · reprise depuis Série X/Y
[Reprendre →]
```

**Page workout** — `[workoutId].tsx` appelle `service.findAnyPausedSession()` au mount :
- `pausedSession.workout_id === workoutId` → reprise directe (passe `initialSession` à `useSession`)
- `pausedSession.workout_id !== workoutId` → bottomsheet abandon (voir ci-dessous)
- `null` → comportement actuel (CheckIn)

Loading spinner pendant la query. Session pausée restaurée sans flash de la phase CheckIn.

---

## Conflit — nouvelle séance avec session en pause

BottomSheet (non bloquant) :

> **Séance en pause**
> Continuer abandonne la séance précédente.
> [Annuler] [Confirmer]

Confirmer → `service.abandonSession(pausedSessionId)` → démarre la nouvelle séance.
Annuler → `router.back()` (retour home, pas de session démarrée).

Règle : **1 seule séance en pause à la fois** max.

---

## Progression — séance abandonnée

`abandonSession` :
- Met `status='abandoned'`, `ended_at=now()`
- **Ne déclenche PAS `calculateProgressions`**
- Les `set_logs` restent en DB (historique/analytics préservés)

Raison : une interruption logistique ne doit pas déclencher progression ni deload.

---

## DB — Migration v8

```sql
ALTER TABLE session_logs ADD COLUMN paused_position TEXT;
-- JSON : { "exerciseIdx": number, "blockIdx": number, "setIdx": number, "phase": SessionPhase }

ALTER TABLE session_logs ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CHECK(status IN ('active', 'paused', 'completed', 'abandoned'));
```

Rétrocompat : enregistrements existants → `status='active'` via DEFAULT.
`completeSession` existant → ajoute `status='completed'`.

---

## SessionService — nouvelles méthodes

### `pauseSession(sessionLogId, position, phase)`
```typescript
await sessionLogRepo.update(sessionLogId, {
  status: 'paused',
  paused_position: JSON.stringify({ exerciseIdx, blockIdx, setIdx, phase }),
});
```

### `abandonSession(sessionLogId)`
```typescript
await sessionLogRepo.update(sessionLogId, {
  status: 'abandoned',
  ended_at: new Date().toISOString(),
});
// calculateProgressions NON appelé
```

### `findAnyPausedSession()`
```typescript
// SELECT sl.*, w.name as workout_name,
//   COUNT(sl2.id) as sets_logged,
//   COALESCE(SUM(sl2.reps_done * sl2.weight_done), 0) as volume
// FROM session_logs sl
// JOIN workouts w ON w.id = sl.workout_id
// LEFT JOIN set_logs sl2 ON sl2.session_log_id = sl.id
// WHERE sl.status = 'paused'
// ORDER BY sl.started_at DESC LIMIT 1
```
Retourne `{ sessionLog, workoutName, setsLogged, volume }` ou `null`.

### `startSession` (mise à jour)
Guard : si session `status='paused'` existe pour ce `workoutId` → throw `"Une séance est déjà en pause"` (défense en profondeur, l'UI bloque déjà).

### `completeSession` (mise à jour)
Ajoute `status='completed'` en plus de `ended_at`.

---

## useSession — changements

### Signature
```typescript
useSession(
  workoutId: number,
  workoutDetails: WorkoutExerciseDetail[],
  initialSession?: {
    sessionLogId: number;
    position: SessionPosition;
    phase: SessionPhase;
    startedAt: number;
    setsLogged: number;
    volume: number;
  }
)
```

Si `initialSession` fourni → hook s'initialise directement avec ces valeurs (pas de phase `checkin`).

### Nouveau dans `UseSessionResult`
```typescript
pauseSession: () => Promise<void>;
```
Appelle `service.pauseSession(sessionLogId, position, phase)`.

### Limitation V1 connue
`positionHistory` (undo) non restauré après reprise → `canUndo = false` au redémarrage. Acceptable.

---

## Utilitaires extraits

### `shouldWarnAbandon(pausedWorkoutId, targetWorkoutId): boolean`
```typescript
export function shouldWarnAbandon(
  pausedWorkoutId: number,
  targetWorkoutId: number,
): boolean {
  return pausedWorkoutId !== targetWorkoutId;
}
```
Fonction pure, testable indépendamment.

### `ResumeSessionCard` (composant isolé)
Props : `{ workoutName: string; serieLabel: string; onPress: () => void }`
Rendu conditionnel depuis `index.tsx` si `findAnyPausedSession()` retourne une session.

---

## Tests

### SessionService (InMemory repos, TDD)
- `pauseSession` → `status='paused'`, `paused_position` JSON correct
- `abandonSession` → `status='abandoned'`, `ended_at` défini, progressions non calculées
- `findAnyPausedSession` → retourne `{ sessionLog, workoutName, setsLogged, volume }` si session pausée
- `findAnyPausedSession` → retourne `null` si aucune session `paused` (completed/abandoned ignorées)
- `completeSession` → `status='completed'` (test existant mis à jour)
- `startSession` avec session `paused` existante → throw `"Une séance est déjà en pause"`

### useSession
- `initialSession` fourni → phase initiale = `initialSession.phase` (pas `checkin`)
- `totalSetsLogged` initialisé depuis `initialSession.setsLogged`
- `totalVolume` initialisé depuis `initialSession.volume`
- `pauseSession()` → appelle `service.pauseSession` avec `position` et `phase` courants

### UI components (`.test.tsx` — update `testMatch`)
- `ResumeSessionCard` → render avec données, appel `onPress`, snapshot du label
- `ResumeSessionCard` → non rendu si données nulles
- `shouldWarnAbandon(1, 2)` → `true`
- `shouldWarnAbandon(1, 1)` → `false`

---

## Fichiers touchés

| Fichier | Action |
|---------|--------|
| `db/schema.ts` | Migration v8 — `paused_position`, `status` |
| `db/types.ts` | Ajouter `paused_position`, `status` au type `SessionLog` |
| `repositories/ISessionLogRepository.ts` | Ajouter `update(id, partial)` si absent |
| `repositories/SQLiteSessionLogRepository.ts` | Implémenter `update` |
| `services/SessionService.ts` | `pauseSession`, `abandonSession`, `findAnyPausedSession`, update `completeSession`/`startSession` |
| `services/SessionService.test.ts` | Tests nouveaux + mise à jour existants |
| `services/sessionUtils.ts` | `shouldWarnAbandon` (nouveau fichier) |
| `services/sessionUtils.test.ts` | Tests `shouldWarnAbandon` |
| `hooks/useSession.ts` | `initialSession` prop, `pauseSession`, init depuis `initialSession` |
| `hooks/useSession.test.ts` | Tests reprise |
| `components/session/ResumeSessionCard.tsx` | Nouveau composant |
| `components/session/ResumeSessionCard.test.tsx` | Tests composant |
| `app/session/[workoutId].tsx` | Mount check, `initialSession`, bouton pause, bottomsheet abandon |
| `app/(tabs)/index.tsx` | Home card reprise |
| `package.json` | `testMatch` += `"**/*.test.tsx"` |
