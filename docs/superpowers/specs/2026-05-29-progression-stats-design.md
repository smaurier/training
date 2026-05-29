# Progression Stats — Design Spec
Date : 2026-05-29

## Contexte

Feature Session 11. L'onglet Progression contient déjà l'historique des séances (Session 10). Cette session ajoute un segment "Stats" avec dashboard global, volume par semaine ISO, PRs récents et 1RM estimé (Epley) par exercice.

---

## Décisions architecturales

### Navigation dans l'onglet Progression

`(tabs)/progression.tsx` est modifié pour ajouter un **segmented control sticky** en haut :

```
[ Historique ]  [ Stats ]
```

- Tap sur segment → affiche le contenu correspondant (état React local `activeSegment`)
- **Pas de swipe** : conflit gestuel entre scroll horizontal et les listes verticales (`SectionList`, `ScrollView`) sur Android
- Le segment "Historique" renvoie le `SectionList` actuel (Session 10, inchangé)
- Le segment "Stats" affiche le nouveau dashboard scrollable

### Écran détail exercice

`progression/[exerciseId].tsx` — Stack screen poussé depuis la liste 1RM.

### Librairie de graphiques

```sh
npx expo install react-native-gifted-charts expo-linear-gradient react-native-svg
```

`react-native-gifted-charts` avec `expo-linear-gradient` est officiellement supporté dans Expo.

---

## Dashboard "Stats"

### Section 1 — Stats globales (3 chips)

| Chip | Valeur | Source |
|---|---|---|
| Séances | count sessions ce mois | `sessionLogRepo.findAll()` filtré par mois courant |
| PRs | count PRs ce mois | `personalRecordRepo.findRecent()` filtré par mois courant |
| Exercices | count exercices distincts loggés ce mois | `setLogRepo.findFromDate(début_mois)` filtré par mois courant |

### Section 2 — Volume par semaine ISO (4 barres)

4 dernières semaines ISO (lundi–dimanche). Semaine courante mise en avant (couleur primaire).

```typescript
export interface WeeklyVolume {
  weekLabel: string;  // "S-3", "S-2", "S-1", "Cette sem."
  volume: number;     // kg — Σ(reps_done × weight_done)
  sessionCount: number;
}
```

Delta : `+X% vs semaine précédente` — affiché uniquement si la semaine précédente a des données.

Algorithme :
1. `setLogRepo.findFromDate(28JoursAvant)` → set_logs
2. Grouper par semaine ISO (date ISO W numéro) de `completed_at`
3. Calculer `Σ(reps_done × weight_done)` par semaine
4. Générer les 4 dernières semaines ISO (même si vides = 0)

### Section 3 — PRs récents

5 derniers PRs tous exercices, ordonnés par `achieved_at DESC`.

```typescript
export interface RecentPR {
  exerciseId: number;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;  // déjà stocké dans personal_records
  achievedAt: string;    // ISO string
}
```

Source : `personalRecordRepo.findRecent(5)` → noms via `exerciseRepo.findById`.

### Section 4 — 1RM par exercice

Liste de tous les exercices ayant au moins un set loggé, ordonnée par 1RM DESC.

```typescript
export interface Exercise1RM {
  exerciseId: number;
  exerciseName: string;
  current1RM: number;    // max Epley sur tous les set_logs
  delta: number | null;  // null si < 30j de données
  deltaLabel: string;    // "+5 kg vs 30j" | "Depuis le début" | "stable"
}
```

**Delta :**
- Si `set_logs` pour cet exercice existent tous depuis moins de 30 jours → `deltaLabel = "Depuis le début"`, `delta = null`
- Sinon : `delta = current1RM − max1RM(set_logs où completed_at < now − 30j)`
  - `delta > 0` → `"+X kg vs 30j"`
  - `delta === 0` → `"stable"`
  - `delta < 0` → `"−X kg vs 30j"` (régression)

**Epley** : `weight × (1 + reps / 30)`. Si `reps === 0` : utiliser le poids direct.

---

## Écran détail exercice `progression/[exerciseId].tsx`

### Graphique 1RM par session

`BarChart` (gifted-charts) — une barre = max Epley par date calendaire (groupé par `date(completed_at)`). Deux séances le même jour → une seule barre (max des deux).

```typescript
export interface Session1RM {
  date: string;        // date calendaire groupée, formatée "JJ/MM"
  estimated1RM: number;
}
```

Ordre : ASC par date. Barres cliquables (optionnel MVP : désactivé).

### Meilleur PR

```
140 kg × 5 reps
1RM Epley : 163.3 kg · il y a 2 jours
```

Source : `personalRecordRepo.findBestByExerciseId(id)` (méthode existante).

### Historique PRs

Liste `PersonalRecord[]` ordonnée par `achieved_at DESC`. Chaque ligne : `weight kg × reps reps · date`.

Source : `personalRecordRepo.findAllByExerciseId(id)` (nouvelle méthode).

---

## Nouvelles méthodes repositories

### `ISetLogRepository`

```typescript
findByExerciseId(exerciseId: number): Promise<SetLog[]>
// Retourne tous les set_logs pour un exercice, triés par completed_at ASC

findFromDate(from: string): Promise<SetLog[]>
// Retourne tous les set_logs où completed_at >= from (ISO string), triés ASC

findDistinctExerciseIds(): Promise<number[]>
// Retourne les exercise_id distincts ayant au moins un set_log
```

Contract tests :
- `findByExerciseId` : vide si aucun log, retourne seulement les logs de l'exercice ciblé
- `findFromDate` : exclut les logs antérieurs à `from`, inclut les logs exactement à `from`
- `findDistinctExerciseIds` : vide si aucun log, pas de doublons, uniquement les ids présents

### `IPersonalRecordRepository`

```typescript
findAllByExerciseId(exerciseId: number): Promise<PersonalRecord[]>
// Retourne tous les PRs pour un exercice, triés par achieved_at DESC

findRecent(limit: number): Promise<PersonalRecord[]>
// Retourne les N derniers PRs tous exercices, triés par achieved_at DESC
```

Contract tests :
- `findAllByExerciseId` : vide si aucun PR, retourne seulement les PRs de l'exercice, ordre DESC
- `findRecent` : vide si aucun PR, respecte la limite, ordre DESC

---

## ProgressionService

```typescript
// services/ProgressionService.ts

export class ProgressionService {
  constructor(
    private sessionLogRepo: ISessionLogRepository,
    private setLogRepo: ISetLogRepository,
    private personalRecordRepo: IPersonalRecordRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async getDashboardStats(): Promise<DashboardStats>
  async getVolumeByWeek(): Promise<WeeklyVolume[]>   // toujours 4 semaines ISO
  async getRecentPRs(limit: number): Promise<RecentPR[]>
  async getExercise1RMList(): Promise<Exercise1RM[]>
  async getExercise1RMHistory(exerciseId: number): Promise<Session1RM[]>  // groupé par date calendaire
}
```

### Tests `ProgressionService.test.ts` (~12 cas)

- `getDashboardStats` → 0 séances ce mois si aucune session
- `getDashboardStats` → compte correct séances ce mois
- `getVolumeByWeek` → toujours 4 entrées même si semaines vides
- `getVolumeByWeek` → somme correcte reps × weight par semaine ISO
- `getRecentPRs` → vide si aucun PR
- `getRecentPRs` → retourne les N plus récents avec nom exercice
- `getExercise1RMList` → vide si aucun set_log
- `getExercise1RMList` → 1RM = max Epley par exercice
- `getExercise1RMList` → delta null si tous logs < 30j
- `getExercise1RMList` → delta correct si logs > 30j
- `getExercise1RMHistory` → une entrée par date calendaire (deux séances même jour → max des deux)
- `getExercise1RMHistory` → ordonné ASC par date

---

## useProgression hook

```typescript
// hooks/useProgression.ts

export interface UseProgressionReturn {
  stats: DashboardStats | null;
  volumeByWeek: WeeklyVolume[];
  recentPRs: RecentPR[];
  exercise1RMList: Exercise1RM[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProgression(): UseProgressionReturn
```

- `mountedRef` pattern (identique `useHistory`)
- `useRef` guard pour instanciation service
- Charge tout en parallèle (`Promise.all`) au mount
- Expose `refresh()` — l'écran appelle via `useFocusEffect` + `isFirstFocus`

---

## Composants

### `components/progression/VolumeBarChart.tsx`
Props : `data: WeeklyVolume[]`
`BarChart` de gifted-charts. Barres solides couleur `colors.primary`, semaine courante mise en avant.

### `components/progression/Exercise1RMCard.tsx`
Props : `item: Exercise1RM`, `onPress: () => void`
Ligne liste : nom exercice · `current1RM kg` · `deltaLabel` · chevron `›`.

---

## Écrans modifiés / créés

### `(tabs)/progression.tsx` — modification

Ajouter le segmented control sticky `Historique | Stats` en haut. Garder le `SectionList` historique intact. Ajouter la vue Stats (dashboard scrollable avec `useProgression`).

### `progression/[exerciseId].tsx` — nouveau

Charge `ProgressionService.getExercise1RMHistory(id)` + `personalRecordRepo.findBestByExerciseId(id)` + `personalRecordRepo.findAllByExerciseId(id)` au mount.

### `app/_layout.tsx` — modification

Ajouter :
```tsx
<Stack.Screen name="progression/[exerciseId]" options={{ title: 'Progression' }} />
```

---

## Modifications `docs/tests-manuels-mvp.md`

Section `## 11. Progression Stats` à ajouter :

- Onglet Progression → segment Stats → dashboard visible
- Stats globales : séances, PRs, exercices ce mois corrects
- Volume 4 semaines ISO : barres affichées, semaine courante en bleu
- PRs récents : 5 derniers PRs avec nom exercice et 1RM
- Liste 1RM : exercices loggés avec valeur et delta
- Delta `"Depuis le début"` si moins de 30j de données
- Tap exercice → écran détail avec graphique barres par session
- Meilleur PR + historique PRs dans le détail

---

## Hors scope Session 11

- Corrélation RPE / performance
- Filtre par période (mois / année / all-time) sur les chips du dashboard
- Graphique ligne (1RM lissé)
- Export CSV
- Comparaison entre exercices
- Avertissement "deux séances le même jour" (UX — fusionnées silencieusement dans le graphique)
