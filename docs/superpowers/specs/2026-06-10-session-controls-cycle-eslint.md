# Spec — Contrôles séance + Cycle rotatif + ESLint

**Date :** 2026-06-10  
**Scope :** F1 Passer exercice · F2 Annuler dernière série · U10 Cycle rotatif · T1 ESLint

---

## Objectifs

| # | Feature | Valeur |
|---|---------|--------|
| F1 | Passer l'exercice entier | Skip fatigue/douleur sans interrompre la séance |
| F2 | Annuler dernière série | Corriger une erreur de saisie sans quitter |
| U10 | Cycle rotatif | Savoir quelle séance faire sans réfléchir |
| T1 | ESLint | Détecter erreurs logiques hors scope TypeScript |

---

## F1 — Passer l'exercice entier

### Comportement

Bouton "Passer l'exercice →" dans `RunningPhase`, sous le bouton "Passer →" série existant. Accessible pendant toute la séance (phase `running` uniquement).

Tap → `@gorhom/bottom-sheet` avec :
- Titre : nom de l'exercice courant
- Message : "Passer toutes les séries restantes ?"
- Bouton destructif : "Passer l'exercice"
- Bouton annuler : "Annuler"

On confirmation :
- `session.skipExercise()` appelé
- Phase → `exercise_transition` pour l'exercice suivant
- Si dernier exercice → phase `summary`

### Changements

**`useSession.ts`**
```ts
skipExercise(): void
```
- Avance `exerciseIdx + 1`, `blockIdx: 0`, `setIdx: 0`
- Si `exerciseIdx + 1 >= exercises.length` → `setPhase('summary')`
- Sinon → `setPhase('exercise_transition')`, `setPosition({...})`

**`RunningPhase.tsx`**
- Nouveau prop `onSkipExercise: () => void`
- Bouton "Passer l'exercice →" sous skipBtn existant
- BottomSheet local avec ref `bottomSheetRef`
- Confirmation dans le sheet avant appel `onSkipExercise`

**`app/session/[workoutId].tsx`**
- Passe `onSkipExercise={session.skipExercise}` à `<RunningPhase />`

---

## F2 — Annuler dernière série

### Comportement

Icône undo `↩` (Ionicons `arrow-undo-outline`) en haut à droite du header RunningPhase. Désactivée (`opacity: 0.3`, non-pressable) si `canUndo === false`.

Tap direct, pas de confirmation (action réversible — re-valider suffit).

Sur undo :
1. DELETE `set_log` pour `(setId, sessionLogId)` du dernier set validé
2. Restaure la position au set précédent
3. RunningPhase re-affiche ce set avec ses valeurs cibles (via remount `key={set.id}`)

Si l'utilisateur re-valide avec valeurs modifiées → INSERT normal (log propre supprimé à l'undo).

### Historique position

```ts
// Dans useSession
interface HistoryEntry {
  position: SessionPosition;
  setId: number;
}
const positionHistory = useRef<HistoryEntry[]>([]);
```

- `validateSet` success → push `{ position: {...currentPosition}, setId: currentSet.id }` avant d'avancer
- `undoLastSet()` → pop entry, DELETE set_log, restore position + phase `running`
- `canUndo = positionHistory.current.length > 0`

Un seul niveau d'undo exposé dans l'UI (le bouton ↩ dépile un niveau). L'array en ref permet plusieurs niveaux si besoin futur sans refactor.

### Changements

**`SQLiteSetLogRepository.ts`** (ou repo approprié)
```ts
deleteBySetAndSession(setId: number, sessionLogId: number): Promise<void>
```

**`useSession.ts`**
- `positionHistory` ref
- Push dans `validateSet` avant advance
- `undoLastSet()` + `canUndo` exposés dans `UseSessionResult`

**`RunningPhase.tsx`**
- Nouveaux props : `onUndo: () => void`, `canUndo: boolean`
- Icône ↩ dans le header, désactivée si `!canUndo`

**`app/session/[workoutId].tsx`**
- Passe `onUndo={session.undoLastSet}` + `canUndo={session.canUndo}`

---

## U10 — Cycle rotatif

### Comportement

Badge pill "→ Prochain" sur la carte `WorkoutCard` du workout recommandé dans `programme/[id].tsx`.

**Règle de sélection :**
1. Récupérer l'id du dernier workout complété (`ended_at IS NOT NULL`) pour ce programme
2. `nextIdx = (lastIdx + 1) % workouts.length`
3. Si aucun historique → `workouts[0]` est le prochain

Mise à jour au `useFocusEffect` (déjà présent dans l'écran).

### Changements

**`SQLiteSessionLogRepository.ts`**
```ts
getLastCompletedWorkoutId(workoutIds: number[]): Promise<number | null>
// SELECT workout_id FROM session_logs
// WHERE workout_id IN (...) AND ended_at IS NOT NULL
// ORDER BY ended_at DESC LIMIT 1
```

**`programme/[id].tsx`**
- Après chargement workouts → query `getLastCompletedWorkoutId(workoutIds)`
- Calcul `nextWorkoutId` avec modulo
- Passe `isNext={item.id === nextWorkoutId}` à chaque `WorkoutCard`

**`WorkoutCard.tsx`**
- Nouveau prop optionnel `isNext?: boolean`
- Si `true` : badge pill "→ Prochain" (`colors.primary`, fontSize 11, sous le nom workout)

---

## T1 — ESLint

### Setup

```bash
# Dans app/
npm install --save-dev eslint-config-expo
```

**`app/.eslintrc.js`** (legacy format — compatible SDK 54 / React Native toolchain)
```js
module.exports = {
  extends: 'expo',
  ignorePatterns: ['/dist/*', '/node_modules/*'],
};
```

Si `eslint-config-expo` requiert flat config → migrer vers `eslint.config.js` au moment de l'install (décision à l'implémentation).

**`app/package.json`** scripts :
```json
"lint": "eslint . --ext .ts,.tsx --max-warnings 0"
```

**`.github/workflows/ci.yml`** — ajouter step après typecheck :
```yaml
- name: Lint
  working-directory: app
  run: npm run lint
```

---

## Tests

| Feature | Stratégie |
|---------|-----------|
| F1 | Typecheck + test manuel séance |
| F2 | Typecheck + test manuel (valider → undo → re-valider) |
| U10 | Typecheck + vérification visuelle badge sur programme |
| T1 | `npm run lint` passe sans warnings |

Pas de nouveaux tests unitaires — logique métier F1/F2 dans `useSession` déjà couvert par tests existants sur `validateSet`/`skipSet`. U10 est une query SQL simple.

---

## Non-scope

- Multi-undo (plus d'un niveau) : ref array prête, UI limitée à 1 niveau
- Badge U10 sur écran home : hors scope (option B rejetée)
- Annulation après RestPhase : uniquement pendant RunningPhase
