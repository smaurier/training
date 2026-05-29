# Historique des séances — Design Spec
Date : 2026-05-29

## Contexte

Feature Session 10. Afficher toutes les séances passées dans l'onglet Progression (actuellement placeholder). Données déjà disponibles dans `session_logs` et `set_logs`.

Onglet "Progression" = historique seul pour l'instant. Graphiques / 1RM en Session 11.

---

## Décisions architecturales

### Navigation
L'onglet existant `(tabs)/progression.tsx` (placeholder) est réécrit pour afficher la liste historique. Aucun nouvel onglet, barre de navigation inchangée.

Écran détail : `history/[sessionLogId].tsx` — Stack screen poussé depuis la liste.

### Lazy loading
- **Liste** : charge `session_logs` + noms de workouts + comptes de sets au chargement.
- **Détail** : charge `set_logs` uniquement à l'ouverture du détail (non chargé dans la liste).

### Groupement par mois
Le hook transforme la liste plate en sections `{ title: string; data: SessionSummary[] }[]` pour `SectionList`. Format titre : `"Mai 2026 · 3 séances"`.

---

## Nouvelles méthodes repositories

### `ISessionLogRepository`
```typescript
findAll(): Promise<SessionLog[]>
// Retourne tous les logs ordonnés par started_at DESC
```
Contract tests : liste vide → [], plusieurs sessions → ordre DESC garanti.

### `ISetLogRepository`
```typescript
countBySessionLogIds(ids: number[]): Promise<Record<number, number>>
// SELECT session_log_id, COUNT(*) GROUP BY session_log_id
// Retourne { [sessionLogId]: count }. Ids absents → absent de la map (= 0).
```
Contract tests : ids vide → {}, sessions avec sets → comptes corrects, id sans sets → absent de la map.

---

## View models

```typescript
// services/HistoryService.ts

export interface SessionSummary {
  id: number;
  workoutName: string;
  startedAt: string;        // ISO string
  durationSeconds: number;  // 0 si ended_at null (session non terminée)
  totalSets: number;
}

export interface SetLogSummary {
  repsDone: number;
  weightDone: number;
  rpe: number | null;
}

export interface ExerciseHistory {
  exerciseId: number;
  exerciseName: string;
  sets: SetLogSummary[];    // ordonnés par completed_at ASC
}

export interface SessionDetail {
  id: number;
  workoutName: string;
  startedAt: string;
  durationSeconds: number;
  totalSets: number;
  checkinEnergy: 1 | 2 | 3 | null;
  checkinFatigue: 1 | 2 | 3 | null;
  checkinSleep: 1 | 2 | 3 | null;
  exercises: ExerciseHistory[]; // ordonnés par première completed_at de chaque exercice ASC
}
```

---

## HistoryService

```typescript
export class HistoryService {
  constructor(
    private sessionLogRepo: ISessionLogRepository,
    private setLogRepo: ISetLogRepository,
    private workoutRepo: IWorkoutRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async getSessionList(): Promise<SessionSummary[]>
  async getSessionDetail(sessionLogId: number): Promise<SessionDetail | null>
}
```

### `getSessionList` — algorithme
1. `sessionLogRepo.findAll()` → sessions[]
2. Dédupliquer workout_ids → `Promise.all(findById)` → Map<workoutId, name>
3. `setLogRepo.countBySessionLogIds(sessionIds)` → Map comptes
4. Construire `SessionSummary[]` :
   - `durationSeconds` = `ended_at` présent → `Math.round((new Date(ended_at) - new Date(started_at)) / 1000)`, sinon `0`
   - `totalSets` = count de la map, 0 si absent
   - `workoutName` = map workout, `'Séance inconnue'` si absent

### `getSessionDetail` — algorithme
1. `sessionLogRepo.findById(id)` → null si absent
2. `workoutRepo.findById(workout_id)` → nom
3. `setLogRepo.findBySessionLogId(id)` → set_logs
4. Dédupliquer exercise_ids → `Promise.all(exerciseRepo.findById)` → Map<exerciseId, name>
5. Grouper set_logs par exercise_id, trier groupes par première `completed_at` ASC
6. Retourner `SessionDetail`

### Tests `HistoryService.test.ts` (~8 cas)
- `getSessionList` → liste vide si aucune session
- `getSessionList` → SessionSummary avec workoutName correct
- `getSessionList` → durationSeconds calculé depuis ended_at
- `getSessionList` → durationSeconds = 0 si ended_at null
- `getSessionList` → totalSets depuis countBySessionLogIds
- `getSessionDetail` → null si session inexistante
- `getSessionDetail` → SessionDetail avec check-in + exercises groupés
- `getSessionDetail` → sets ordonnés par completed_at ASC dans chaque exercice

---

## useHistory hook

```typescript
// hooks/useHistory.ts

export interface HistorySection {
  title: string; // "Mai 2026 · 3 séances"
  data: SessionSummary[];
}

export interface UseHistoryReturn {
  sections: HistorySection[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useHistory(): UseHistoryReturn
```

- Charge via `HistoryService.getSessionList()` au mount
- Groupe par mois (année + mois ISO → label français)
- Pattern identique aux hooks existants (mountedRef, error surfacé)
- Le hook n'intègre pas `useFocusEffect` — expose `refresh()` que l'écran appelle via son propre `useFocusEffect` (même pattern que `exercices.tsx` avec `isFirstFocus` guard)

**Groupement par mois :**
```typescript
// Clé de groupe : startedAt.slice(0, 7) → "2026-05"
// Label brut : new Date(startedAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
// → "mai 2026" (minuscule en fr-FR)
// Capitalisé : label.charAt(0).toUpperCase() + label.slice(1) + ' · N séances'
// → "Mai 2026 · 3 séances"
```

---

## Composants

### `components/history/SessionCard.tsx`
Props : `session: SessionSummary`, `onPress: () => void`

Affiche :
- Nom séance (bold)
- Date formatée (ex : `"29 mai 2026"`) + durée + nb séries
- Chevron `›`
- `PressableA11y` avec `accessibilityLabel={session.workoutName + ', ' + dateFormatée}`

**`formatDate(iso: string)`** : `new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })`
**`formatDuration(seconds: number)`** : même logique que `SummaryPhase` — définie localement.

### `components/history/ExerciseHistorySection.tsx`
Props : `exercise: ExerciseHistory`

Affiche :
- En-tête nom exercice (section header)
- Rangée de chips `"${weightDone} kg × ${repsDone}${rpe ? ' · RPE ' + rpe : ''}"`
- Chips en `flexWrap: 'wrap'`

---

## Écrans

### `(tabs)/progression.tsx` — réécriture complète

```
SectionList
  renderSectionHeader → label mois + compteur
  renderItem → SessionCard
  ListEmptyComponent → "Aucune séance enregistrée"
  keyExtractor → session.id.toString()
```

`useFocusEffect` → `refresh()` au focus (séance terminée depuis autre onglet doit apparaître).

### `history/[sessionLogId].tsx` — nouveau

Charge `HistoryService.getSessionDetail(id)` au mount. Affiche :

**Header stats :**
```
| 47 min  |  18 séries  |  RPE 7.4 moy. |
```
RPE moy. = moyenne des rpe non-null de tous les sets. Si aucun RPE → masqué.

**Check-in :**
```
| 💪 Énergie  |  😐 Fatigue  |  🌙 Sommeil |
```
Emojis identiques à `CheckInPhase` (énergie 1=😴/2=😐/3=💪, fatigue 1=💪/2=😐/3=😴, sommeil 1=😴/2=😐/3=🌙).
Masqué si les trois valeurs sont null.

**Exercices :**
`ScrollView` + `ExerciseHistorySection` par exercice.

---

## Modifications fichiers existants

### `app/_layout.tsx`
Ajouter :
```tsx
<Stack.Screen name="history/[sessionLogId]" options={{ title: 'Détail séance' }} />
```

### `app/(tabs)/_layout.tsx`
Aucune modification — l'onglet "Progression" existe déjà avec le bon titre et icône.

---

## Tests manuels à ajouter (`docs/tests-manuels-mvp.md`)

Section à créer **10. Historique** :
- Liste affiche les séances passées groupées par mois
- Tap séance → détail avec sets, durée, check-in
- Séance sans ended_at → durée = 0 ou masquée
- Séance sans RPE → colonne RPE masquée dans le détail
- Liste vide → message "Aucune séance enregistrée"

---

## Hors scope Session 10

- Graphiques / courbes de progression
- 1RM estimé par exercice
- Filtres par programme ou exercice
- Suppression de séances
- Export CSV / JSON
