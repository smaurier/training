# Pack — Doublons exercices + Recueil cardio + Import GPX

## Vue d'ensemble

Trois features indépendantes livrées ensemble :
1. **Doublons exercices** — bloquer la création d'un exercice dont le nom existe déjà (insensible à la casse)
2. **Recueil post-séance cardio** — card soft dans SummaryPhase pour saisir durée/distance/sensation sur les sets cardio vides
3. **Import GPX** — importer un fichier `.gpx` pour créer automatiquement une séance cardio avec durée + distance calculée par Haversine

---

## Feature 1 — Doublons exercices

### Contexte

`ExerciseService.create` valide le nom (non vide) et `progression_step` (> 0) mais ne vérifie pas les doublons. `IExerciseRepository` n'a pas de `findByName`. Des doublons peuvent déjà exister en DB — pas de migration `UNIQUE` pour éviter de casser ces données.

### Changements

**`IExerciseRepository`** — nouvelle méthode :
```typescript
findByName(name: string): Promise<Exercise | null>;
```

**`InMemoryExerciseRepository`** :
```typescript
async findByName(name: string): Promise<Exercise | null> {
  return this.exercises.find(
    e => e.name.toLowerCase() === name.toLowerCase().trim()
  ) ?? null;
}
```

**`SQLiteExerciseRepository`** :
```typescript
async findByName(name: string): Promise<Exercise | null> {
  return this.db.getFirstAsync<Exercise>(
    'SELECT * FROM exercises WHERE name = ? COLLATE NOCASE',
    [name.trim()]
  );
}
```

**`ExerciseService.ts`** — nouvelle erreur exportée :
```typescript
export class DuplicateExerciseError extends Error {
  constructor(name: string) {
    super(`Un exercice nommé "${name}" existe déjà`);
    this.name = 'DuplicateExerciseError';
  }
}
```

**`ExerciseService.create`** — check avant insert :
```typescript
const existing = await this.repo.findByName(input.name.trim());
if (existing) throw new DuplicateExerciseError(input.name.trim());
```

**UI** : `add-exercise.tsx` affiche déjà les erreurs via le state `error` de `useExercises`. Rien à changer côté UI — l'erreur remonte automatiquement.

### Tests TDD

Fichier : `app/services/ExerciseService.test.ts`

```typescript
describe('ExerciseService.create — doublons', () => {
  it('throw DuplicateExerciseError si nom identique (exact)', ...)
  it('throw DuplicateExerciseError si nom identique (casse différente)', ...)
  it('crée si nom différent', ...)
})
```

Contract test dans `app/repositories/exerciseRepository.contract.ts` :
```typescript
describe('findByName', () => {
  it('retourne null si aucun exercice avec ce nom', ...)
  it('retourne l\'exercice si nom exact', ...)
  it('retourne l\'exercice insensible à la casse', ...)
})
```

### Fichiers impactés

| Action | Fichier |
|--------|---------|
| Modifier | `app/repositories/IExerciseRepository.ts` |
| Modifier | `app/repositories/SQLiteExerciseRepository.ts` |
| Modifier | `app/repositories/InMemoryExerciseRepository.ts` |
| Modifier | `app/repositories/exerciseRepository.contract.ts` |
| Modifier | `app/services/ExerciseService.ts` |
| Modifier | `app/services/ExerciseService.test.ts` |

---

## Feature 2 — Recueil post-séance cardio

### Contexte

Quand une séance se termine, des exercices cardio peuvent avoir des `set_logs` sans `duration_seconds` ni `distance_meters` (l'utilisateur a validé le set sans saisir les données). Il doit pouvoir les renseigner depuis la `SummaryPhase`, sans obligation.

`ISetLogRepository` n'a pas de méthode `update` — à ajouter.

### Changements

**`ISetLogRepository`** — nouvelle méthode :
```typescript
updateCardioData(
  id: number,
  duration_seconds: number | null,
  distance_meters: number | null,
  rpe: number | null,
): Promise<void>;
```

**`SQLiteSetLogRepository`** :
```typescript
async updateCardioData(id, duration_seconds, distance_meters, rpe) {
  await this.db.runAsync(
    'UPDATE set_logs SET duration_seconds = ?, distance_meters = ?, rpe = ? WHERE id = ?',
    [duration_seconds, distance_meters, rpe, id],
  );
}
```

**`InMemorySetLogRepository`** :
```typescript
async updateCardioData(id, duration_seconds, distance_meters, rpe) {
  const item = this.items.find(s => s.id === id);
  if (item) {
    item.duration_seconds = duration_seconds;
    item.distance_meters = distance_meters;
    item.rpe = rpe;
  }
}
```

**`SessionService`** — nouvelle méthode :
```typescript
async saveCardioData(
  setLogId: number,
  duration_seconds: number | null,
  distance_meters: number | null,
  rpe: number | null,
): Promise<void> {
  await this.setLogRepo.updateCardioData(setLogId, duration_seconds, distance_meters, rpe);
}
```

**`[workoutId].tsx`** — détection et câblage :

À la transition vers `summary`, récupérer les set_logs cardio vides :
```typescript
const [emptyCardioSetLogIds, setEmptyCardioSetLogIds] = useState<number[]>([]);

useEffect(() => {
  if (session.phase !== 'summary' || !session.sessionLogId) return;
  const cardioExerciseIds = new Set(
    workoutDetails?.exercises
      .filter(we => we.exercise.type === 'cardio')
      .map(we => we.exercise.id) ?? []
  );
  setLogRepo.findBySessionLogId(session.sessionLogId).then(logs => {
    const empty = logs.filter(
      l => cardioExerciseIds.has(l.exercise_id) &&
           l.duration_seconds == null &&
           l.distance_meters == null
    );
    setEmptyCardioSetLogIds(empty.map(l => l.id));
  });
}, [session.phase, session.sessionLogId]);
```

Handler (applique au **premier** set_log cardio vide uniquement — évite de multiplier les données si l'utilisateur a fait plusieurs intervalles) :
```typescript
const handleSaveCardioData = useCallback(async (
  durationSeconds: number | null,
  distanceMeters: number | null,
  rpe: number | null,
) => {
  if (emptyCardioSetLogIds.length === 0) return;
  await makeServiceForCheck().saveCardioData(
    emptyCardioSetLogIds[0],
    durationSeconds,
    distanceMeters,
    rpe,
  );
  setEmptyCardioSetLogIds([]);
}, [emptyCardioSetLogIds]);
```

**`SummaryPhase`** — nouvelles props :
```typescript
emptyCardioSetLogCount?: number;
onSaveCardioData?: (
  durationSeconds: number | null,
  distanceMeters: number | null,
  rpe: number | null,
) => Promise<void>;
```

Card affichée si `emptyCardioSetLogCount > 0` :
- Label : "Tu as fait du cardio sans données — ajouter ?"
- Champ durée (minutes + secondes)
- Champ distance (km ou miles selon réglage units)
- Chips sensation : **Léger** (rpe=3) / **Normal** (rpe=6) / **Difficile** (rpe=9) — optionnel
- Bouton "Enregistrer" + bouton "Ignorer" (dismiss)

### Tests TDD

```typescript
describe('ISetLogRepository.updateCardioData', () => {
  it('met à jour duration_seconds, distance_meters, rpe', ...)
  it('accepte null pour tous les champs', ...)
})

describe('SessionService.saveCardioData', () => {
  it('délègue à setLogRepo.updateCardioData', ...)
})
```

### Fichiers impactés

| Action | Fichier |
|--------|---------|
| Modifier | `app/repositories/ISetLogRepository.ts` |
| Modifier | `app/repositories/SQLiteSetLogRepository.ts` |
| Modifier | `app/repositories/InMemorySetLogRepository.ts` |
| Modifier | `app/repositories/setLogRepository.contract.ts` |
| Modifier | `app/services/SessionService.ts` |
| Modifier | `app/services/SessionService.test.ts` |
| Modifier | `app/components/session/SummaryPhase.tsx` |
| Modifier | `app/app/session/[workoutId].tsx` |

---

## Feature 3 — Import GPX

### Contexte

Aucune infrastructure GPX n'existe. `session_logs.workout_id` est `NOT NULL` — toute session importée doit être associée à un workout. Solution : find-or-create d'un workout "Sorties libres" contenant un exercice "Course à pied" (cardio).

Dépendance externe : `fast-xml-parser` (pas de DOM en React Native, bibliothèque légère sans dépendances natives).

### Architecture

```
GpxImportService
  ├── parseGpxFile(xmlContent: string): GpxData
  │     ├── extrait <trkpt lat lon> et <time> de tous les trackpoints
  │     └── retourne { startedAt: string, durationSeconds: number, points: [number, number][] }
  ├── haversine(points: [number, number][]): number
  │     └── somme distances Haversine entre trackpoints consécutifs → mètres
  └── importGpx(xmlContent: string): Promise<{ sessionLogId: number }>
        ├── parseGpxFile + haversine
        ├── findOrCreateFootingSetup() → { workoutId, exerciseId, setId }
        └── crée session_log + set_log
```

### Types

```typescript
export interface GpxData {
  startedAt: string;        // ISO8601, premier <time>
  durationSeconds: number;  // dernier <time> − premier <time>
  distanceMeters: number;   // calculé par haversine
  points: [number, number][]; // [lat, lon][]
}
```

### `haversine` — pure function

```typescript
export function haversine(points: [number, number][]): number {
  const R = 6371000; // mètres
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const [lat1, lon1] = points[i - 1].map(d => (d * Math.PI) / 180);
    const [lat2, lon2] = points[i].map(d => (d * Math.PI) / 180);
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return Math.round(total);
}
```

### `parseGpxFile`

Utilise `fast-xml-parser` pour parser le XML. Extrait :
- `trk > trkseg > trkpt` → array de `{ lat, lon, time }`
- Trie par time (ordre chronologique)
- `startedAt` = premier `time`
- `durationSeconds` = `(Date.parse(dernierTime) - Date.parse(premierTime)) / 1000`
- `distanceMeters` = `haversine(points)`

### `findOrCreateFootingSetup`

`workout.program_id` est NOT NULL → nécessite un program. Chaîne find-or-create :

1. `programRepo.findAll()` → filtre `name === 'Activités libres'` → crée si absent
2. `workoutRepo.findByProgramId(program.id)` → filtre `name === 'Sorties libres'` → crée si absent
3. `exerciseRepo.findByName('Course à pied')` (ajouté en Feature 1) → crée si absent (`type: 'cardio'`, `progression_step: 0`, `progression_threshold: 1`, `muscle_groups: '[]'`)
4. `workoutExerciseRepo.findByWorkoutId(workout.id)` → filtre `exercise_id === exercise.id` → crée si absent
5. `blockRepo.findByWorkoutExerciseId(we.id)` → crée block si absent → `setRepo.findByBlockId(block.id)` → crée set si absent (`reps_min: 0`, `rest_duration: 0`, `weight_type: 'bodyweight'`, `set_type: 'normal'`)

Retourne `{ workoutId, exerciseId, setId }`.

### `importGpx` — méthode principale

```typescript
async importGpx(xmlContent: string): Promise<{ sessionLogId: number }> {
  const gpxData = this.parseGpxFile(xmlContent);
  const { workoutId, exerciseId, setId } = await this.findOrCreateFootingSetup();
  const endedAt = new Date(
    Date.parse(gpxData.startedAt) + gpxData.durationSeconds * 1000
  ).toISOString();
  const sessionLog = await this.sessionLogRepo.save({
    workout_id: workoutId,
    started_at: gpxData.startedAt,
  });
  await this.sessionLogRepo.complete(sessionLog.id, endedAt);
  await this.setLogRepo.save({
    session_log_id: sessionLog.id,
    set_id: setId,
    exercise_id: exerciseId,
    reps_done: 0,
    weight_done: 0,
    rpe: null,
    completed_at: endedAt,
    duration_seconds: gpxData.durationSeconds,
    distance_meters: gpxData.distanceMeters,
  });
  return { sessionLogId: sessionLog.id };
}
```

### UI — écran import

Nouvelle route : `app/app/import-gpx.tsx`

Flow :
1. Bouton "Choisir un fichier GPX" (`expo-document-picker`, type `*/*`, extension `.gpx`)
2. Lecture du fichier (`expo-file-system`)
3. Parse + haversine → écran confirmation
4. Confirmation affiche : date, durée formatée, distance (km), champ distance éditable, chips sensation
5. Bouton "Importer" → `importGpx()` → toast/navigation vers progression

**Entrée** : bouton "Importer un footing" dans `app/app/(tabs)/progression.tsx`, section HISTORIQUE (à côté du bouton "Rechercher un exercice").

### Tests TDD

Fichier : `app/services/GpxImportService.test.ts`

```typescript
describe('haversine', () => {
  it('retourne 0 pour un seul point', ...)
  it('calcule distance correcte entre deux points connus', ...)  // Paris → Lyon ~ 391km
  it('somme les segments (aller-retour = double distance)', ...)
})

describe('parseGpxFile', () => {
  it('extrait startedAt, durationSeconds, distanceMeters depuis GPX minimal', ...)
  it('throw si aucun trackpoint', ...)
})

describe('GpxImportService.importGpx', () => {
  it('crée session_log + set_log avec données correctes', ...)
  it('find-or-create : réutilise workout/exercice existants si déjà présents', ...)
})
```

### Dépendance externe

```bash
npm install fast-xml-parser
```

### Fichiers impactés

| Action | Fichier |
|--------|---------|
| Créer | `app/services/GpxImportService.ts` |
| Créer | `app/services/GpxImportService.test.ts` |
| Créer | `app/app/import-gpx.tsx` |
| Modifier | `app/app/(tabs)/progression.tsx` |
| Modifier | `app/app/_layout.tsx` (register new route si besoin) |
