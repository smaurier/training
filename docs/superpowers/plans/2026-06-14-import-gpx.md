# Import GPX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importer un fichier `.gpx` pour créer automatiquement une séance cardio avec durée + distance calculée par Haversine.

**Architecture:** `GpxImportService` contient trois éléments : `haversine()` (pure function), `parseGpxFile()` (utilise `fast-xml-parser`), et `importGpx()` (orchestration + find-or-create du workout footing). Un écran `import-gpx.tsx` expose le flow (picker → confirmation → import). Le bouton d'entrée est ajouté dans `progression.tsx` (segment stats, après "Rechercher un exercice").

**Tech Stack:** TypeScript strict, expo-sqlite, Jest TDD, `fast-xml-parser` (XML sans DOM), `expo-document-picker` (sélection fichier)

**Dépendance critique:** Requiert `findByName` sur `IExerciseRepository` (Plan doublons-exercices, Task 1). S'assurer que ce plan est implémenté d'abord.

---

## Fichiers impactés

- Create: `app/services/GpxImportService.ts`
- Create: `app/services/GpxImportService.test.ts`
- Create: `app/app/import-gpx.tsx`
- Modify: `app/app/(tabs)/progression.tsx`

---

## Task 1 — Installer les dépendances + `haversine` (TDD)

**Files:**
- Create: `app/services/GpxImportService.ts` (stub minimal)
- Create: `app/services/GpxImportService.test.ts`

### Context

`expo-file-system` est déjà installé (v~19.0.23 dans package.json). `expo-document-picker` et `fast-xml-parser` ne sont PAS installés.

`haversine(points: [number, number][]): number` calcule la somme des distances entre points consécutifs (latitude, longitude en degrés). Retourne les mètres (entier). Formule : `R = 6371000`m, distance Haversine classique. Exporter comme fonction nommée (sera réutilisée en test et en service).

- [ ] **Step 1 : Installer les dépendances**

```bash
cd C:/Users/sylva/projects/training-app/app && npm install fast-xml-parser && npx expo install expo-document-picker
```

Attendu : pas d'erreurs, `package.json` mis à jour

- [ ] **Step 2 : Créer le stub `GpxImportService.ts`**

Créer `app/services/GpxImportService.ts` :

```typescript
export interface GpxData {
  startedAt: string;
  durationSeconds: number;
  distanceMeters: number;
  points: [number, number][];
}

export function haversine(points: [number, number][]): number {
  throw new Error('not implemented');
}
```

- [ ] **Step 3 : Écrire les tests `haversine` RED**

Créer `app/services/GpxImportService.test.ts` :

```typescript
import { haversine } from './GpxImportService';

describe('haversine', () => {
  it('retourne 0 pour un seul point', () => {
    expect(haversine([[48.8566, 2.3522]])).toBe(0);
  });

  it('retourne 0 pour aucun point', () => {
    expect(haversine([])).toBe(0);
  });

  it('calcule ~111197m pour 1° de latitude (Nord/Sud)', () => {
    // De (0°, 0°) à (1°, 0°) — 1 degré lat à l'équateur
    const d = haversine([[0, 0], [1, 0]]);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });

  it('somme les segments : aller-retour = double distance point-à-point', () => {
    const A: [number, number] = [0, 0];
    const B: [number, number] = [1, 0];
    const aller = haversine([A, B]);
    const allerRetour = haversine([A, B, A]);
    expect(allerRetour).toBeCloseTo(aller * 2, -2); // ± 100m
  });
});
```

- [ ] **Step 4 : Vérifier RED**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test -- --testPathPattern="GpxImportService" --no-coverage 2>&1 | tail -10
```

Attendu : FAIL — `haversine throws 'not implemented'`

- [ ] **Step 5 : Implémenter `haversine`**

Dans `app/services/GpxImportService.ts`, remplacer le stub `haversine` :

```typescript
export function haversine(points: [number, number][]): number {
  const R = 6371000;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const lat1 = (points[i - 1][0] * Math.PI) / 180;
    const lat2 = (points[i][0] * Math.PI) / 180;
    const lon1 = (points[i - 1][1] * Math.PI) / 180;
    const lon2 = (points[i][1] * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return Math.round(total);
}
```

- [ ] **Step 6 : Vérifier GREEN**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test -- --testPathPattern="GpxImportService" --no-coverage 2>&1 | tail -10
```

Attendu : 4 tests passent

- [ ] **Step 7 : Typecheck**

```bash
cd C:/Users/sylva/projects/training-app/app && npm run typecheck 2>&1 | tail -5
```

Attendu : 0 erreurs

- [ ] **Step 8 : Commit**

```bash
cd C:/Users/sylva/projects/training-app/app && git add services/GpxImportService.ts services/GpxImportService.test.ts package.json package-lock.json && git commit -m "feat(gpx): haversine TDD + install fast-xml-parser + expo-document-picker"
```

---

## Task 2 — `parseGpxFile` (TDD)

**Files:**
- Modify: `app/services/GpxImportService.ts`
- Modify: `app/services/GpxImportService.test.ts`

### Context

GPX standard : `<gpx><trk><trkseg><trkpt lat="..." lon="..."><time>ISO8601</time></trkpt>...</trkseg></trk></gpx>`. Un fichier peut avoir plusieurs `trkseg`. `fast-xml-parser` v5 : utiliser `XMLParser` avec `{ ignoreAttributes: false, attributeNamePrefix: '' }` pour avoir `trkpt.lat`, `trkpt.lon` (nombres) et `trkpt.time` (string).

`parseGpxFile` est une méthode privée de `GpxImportService` — mais pour les tests, l'exposer comme fonction exportée `parseGpxFile(xmlContent: string): GpxData` dans le fichier service (les classes peuvent exposer des helpers).

- [ ] **Step 1 : Ajouter les tests `parseGpxFile` RED**

Dans `app/services/GpxImportService.test.ts`, ajouter après les tests `haversine` :

```typescript
import { parseGpxFile } from './GpxImportService';

const GPX_MINIMAL = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="0" lon="0"><time>2026-01-01T08:00:00Z</time></trkpt>
      <trkpt lat="1" lon="0"><time>2026-01-01T08:30:00Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const GPX_SINGLE_POINT = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="48.8566" lon="2.3522"><time>2026-06-01T07:00:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`;

describe('parseGpxFile', () => {
  it('extrait startedAt depuis le premier trackpoint', () => {
    const data = parseGpxFile(GPX_MINIMAL);
    expect(data.startedAt).toBe('2026-01-01T08:00:00Z');
  });

  it('calcule durationSeconds entre premier et dernier point', () => {
    const data = parseGpxFile(GPX_MINIMAL);
    expect(data.durationSeconds).toBe(30 * 60); // 30 minutes
  });

  it('calcule distanceMeters via haversine', () => {
    const data = parseGpxFile(GPX_MINIMAL);
    // 1° de latitude ≈ 111197m
    expect(data.distanceMeters).toBeGreaterThan(110000);
    expect(data.distanceMeters).toBeLessThan(112000);
  });

  it('retourne les points sous forme [lat, lon][]', () => {
    const data = parseGpxFile(GPX_MINIMAL);
    expect(data.points).toHaveLength(2);
    expect(data.points[0]).toEqual([0, 0]);
    expect(data.points[1]).toEqual([1, 0]);
  });

  it('retourne durationSeconds = 0 et distance = 0 pour un seul point', () => {
    const data = parseGpxFile(GPX_SINGLE_POINT);
    expect(data.durationSeconds).toBe(0);
    expect(data.distanceMeters).toBe(0);
  });

  it('throw si aucun trackpoint', () => {
    const empty = `<?xml version="1.0"?><gpx version="1.1"><trk><trkseg></trkseg></trk></gpx>`;
    expect(() => parseGpxFile(empty)).toThrow('Aucun trackpoint trouvé');
  });
});
```

- [ ] **Step 2 : Vérifier RED**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test -- --testPathPattern="GpxImportService" --no-coverage 2>&1 | tail -10
```

Attendu : FAIL — `parseGpxFile is not a function`

- [ ] **Step 3 : Implémenter `parseGpxFile` dans `GpxImportService.ts`**

Ajouter en haut du fichier :

```typescript
import { XMLParser } from 'fast-xml-parser';
```

Ajouter la fonction exportée après `haversine` :

```typescript
export function parseGpxFile(xmlContent: string): GpxData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    isArray: (name) => name === 'trkpt' || name === 'trkseg',
  });
  const result = parser.parse(xmlContent);
  const trksegs: unknown[] = result?.gpx?.trk?.trkseg ?? [];
  const rawPoints: { lat: number; lon: number; time: string }[] = (trksegs as { trkpt?: unknown[] }[])
    .flatMap(seg => (seg.trkpt ?? []) as { lat: number; lon: number; time: string }[]);

  if (rawPoints.length === 0) throw new Error('Aucun trackpoint trouvé dans le fichier GPX');

  rawPoints.sort((a, b) => a.time.localeCompare(b.time));

  const first = rawPoints[0];
  const last = rawPoints[rawPoints.length - 1];
  const durationSeconds = rawPoints.length > 1
    ? Math.round((Date.parse(last.time) - Date.parse(first.time)) / 1000)
    : 0;
  const points: [number, number][] = rawPoints.map(p => [Number(p.lat), Number(p.lon)]);
  const distanceMeters = haversine(points);

  return { startedAt: first.time, durationSeconds, distanceMeters, points };
}
```

- [ ] **Step 4 : Vérifier GREEN**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test -- --testPathPattern="GpxImportService" --no-coverage 2>&1 | tail -10
```

Attendu : tous les tests passent (haversine + parseGpxFile)

- [ ] **Step 5 : Typecheck**

```bash
cd C:/Users/sylva/projects/training-app/app && npm run typecheck 2>&1 | tail -5
```

Attendu : 0 erreurs

- [ ] **Step 6 : Commit**

```bash
cd C:/Users/sylva/projects/training-app/app && git add services/GpxImportService.ts services/GpxImportService.test.ts && git commit -m "feat(gpx): parseGpxFile TDD avec fast-xml-parser"
```

---

## Task 3 — `GpxImportService` classe + `findOrCreateFootingSetup` (TDD)

**Files:**
- Modify: `app/services/GpxImportService.ts`
- Modify: `app/services/GpxImportService.test.ts`

### Context

`findOrCreateFootingSetup` crée une chaîne find-or-create :
1. Program "Activités libres" (`programRepo.findAll()` → filtre par nom → `save` si absent)
2. Workout "Sorties libres" (`workoutRepo.findByProgramId(program.id)` → filtre → `save` si absent)
3. Exercise "Course à pied" type `cardio` (`exerciseRepo.findByName('Course à pied')` → `save` si absent). ⚠️ Requiert `findByName` (Plan doublons-exercices T1).
4. WorkoutExercise (`weRepo.findByWorkoutId(workout.id)` → filtre `exercise_id === exercise.id` → `save` si absent)
5. Block (`blockRepo.findByWorkoutExerciseId(we.id)` → premier block ou `save`)
6. Set (`setRepo.findByBlockId(block.id)` → premier set ou `save`)

Signatures de create DTOs (d'après les interfaces) :
- `programRepo.save({ name: string, description: string | null, is_active: number })`
- `workoutRepo.save({ program_id: number, name: string, order_index: number })`
- `exerciseRepo.save({ name, type: 'cardio', muscle_groups: '[]', technical_notes: null, description: null, is_custom: 0, progression_step: 0, progression_threshold: 1 })`
- `weRepo.save({ workout_id, exercise_id, order_index: 0 })`
- `blockRepo.save({ workout_exercise_id, name: 'Cardio', order_index: 0, is_work_block: 0 })`
- `setRepo.save({ block_id, reps_min: 0, weight: null, weight_type: 'bodyweight', rest_duration: 0, order_index: 0 })`

Le constructeur de `GpxImportService` injecte 8 repos :
```typescript
constructor(
  private readonly programRepo: IProgramRepository,
  private readonly workoutRepo: IWorkoutRepository,
  private readonly exerciseRepo: IExerciseRepository,
  private readonly weRepo: IWorkoutExerciseRepository,
  private readonly blockRepo: IBlockRepository,
  private readonly setRepo: ISetRepository,
  private readonly sessionLogRepo: ISessionLogRepository,
  private readonly setLogRepo: ISetLogRepository,
)
```

- [ ] **Step 1 : Ajouter les tests RED**

Dans `app/services/GpxImportService.test.ts`, ajouter les imports nécessaires et le describe :

```typescript
import {
  haversine, parseGpxFile,
  GpxImportService,
} from './GpxImportService';
import { InMemoryProgramRepository } from '../repositories/InMemoryProgramRepository';
import { InMemoryWorkoutRepository } from '../repositories/InMemoryWorkoutRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';
import { InMemoryWorkoutExerciseRepository } from '../repositories/InMemoryWorkoutExerciseRepository';
import { InMemoryBlockRepository } from '../repositories/InMemoryBlockRepository';
import { InMemorySetRepository } from '../repositories/InMemorySetRepository';
import { InMemorySessionLogRepository } from '../repositories/InMemorySessionLogRepository';
import { InMemorySetLogRepository } from '../repositories/InMemorySetLogRepository';

function makeGpxService() {
  const programRepo = new InMemoryProgramRepository();
  const workoutRepo = new InMemoryWorkoutRepository();
  const exerciseRepo = new InMemoryExerciseRepository();
  const weRepo = new InMemoryWorkoutExerciseRepository();
  const blockRepo = new InMemoryBlockRepository();
  const setRepo = new InMemorySetRepository();
  const sessionLogRepo = new InMemorySessionLogRepository();
  const setLogRepo = new InMemorySetLogRepository();
  const service = new GpxImportService(
    programRepo, workoutRepo, exerciseRepo, weRepo,
    blockRepo, setRepo, sessionLogRepo, setLogRepo,
  );
  return { service, programRepo, workoutRepo, exerciseRepo, weRepo, blockRepo, setRepo, sessionLogRepo, setLogRepo };
}

describe('GpxImportService.findOrCreateFootingSetup', () => {
  it('crée program + workout + exercise + we + block + set si tout absent', async () => {
    const { service, programRepo, workoutRepo, exerciseRepo, setRepo } = makeGpxService();
    const { workoutId, exerciseId, setId } = await (service as any).findOrCreateFootingSetup();

    const programs = await programRepo.findAll();
    expect(programs).toHaveLength(1);
    expect(programs[0].name).toBe('Activités libres');

    const workouts = await workoutRepo.findByProgramId(programs[0].id);
    expect(workouts).toHaveLength(1);
    expect(workouts[0].name).toBe('Sorties libres');
    expect(workouts[0].id).toBe(workoutId);

    const ex = await exerciseRepo.findByName('Course à pied');
    expect(ex).not.toBeNull();
    expect(ex?.id).toBe(exerciseId);
    expect(ex?.type).toBe('cardio');

    const set = await setRepo.findById(setId);
    expect(set).not.toBeNull();
  });

  it('réutilise les structures existantes si déjà présentes', async () => {
    const { service, programRepo, workoutRepo } = makeGpxService();
    await (service as any).findOrCreateFootingSetup();
    await (service as any).findOrCreateFootingSetup();

    expect(await programRepo.findAll()).toHaveLength(1);
    const programs = await programRepo.findAll();
    const workouts = await workoutRepo.findByProgramId(programs[0].id);
    expect(workouts).toHaveLength(1);
  });
});
```

- [ ] **Step 2 : Vérifier RED**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test -- --testPathPattern="GpxImportService" --no-coverage 2>&1 | tail -15
```

Attendu : FAIL — `GpxImportService is not exported`

- [ ] **Step 3 : Ajouter les imports dans `GpxImportService.ts`**

En haut du fichier, ajouter :

```typescript
import type { IProgramRepository } from '../repositories/IProgramRepository';
import type { IWorkoutRepository } from '../repositories/IWorkoutRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';
import type { IWorkoutExerciseRepository } from '../repositories/IWorkoutExerciseRepository';
import type { IBlockRepository } from '../repositories/IBlockRepository';
import type { ISetRepository } from '../repositories/ISetRepository';
import type { ISessionLogRepository } from '../repositories/ISessionLogRepository';
import type { ISetLogRepository } from '../repositories/ISetLogRepository';
```

- [ ] **Step 4 : Créer la classe `GpxImportService` avec `findOrCreateFootingSetup`**

Ajouter après les fonctions exportées `haversine` et `parseGpxFile` :

```typescript
export class GpxImportService {
  constructor(
    private readonly programRepo: IProgramRepository,
    private readonly workoutRepo: IWorkoutRepository,
    private readonly exerciseRepo: IExerciseRepository,
    private readonly weRepo: IWorkoutExerciseRepository,
    private readonly blockRepo: IBlockRepository,
    private readonly setRepo: ISetRepository,
    private readonly sessionLogRepo: ISessionLogRepository,
    private readonly setLogRepo: ISetLogRepository,
  ) {}

  private async findOrCreateFootingSetup(): Promise<{ workoutId: number; exerciseId: number; setId: number }> {
    // 1. Program
    const programs = await this.programRepo.findAll();
    let program = programs.find(p => p.name === 'Activités libres') ?? null;
    if (!program) {
      program = await this.programRepo.save({ name: 'Activités libres', description: null, is_active: 1 });
    }

    // 2. Workout
    const workouts = await this.workoutRepo.findByProgramId(program.id);
    let workout = workouts.find(w => w.name === 'Sorties libres') ?? null;
    if (!workout) {
      workout = await this.workoutRepo.save({ program_id: program.id, name: 'Sorties libres', order_index: 0 });
    }

    // 3. Exercise
    let exercise = await this.exerciseRepo.findByName('Course à pied');
    if (!exercise) {
      exercise = await this.exerciseRepo.save({
        name: 'Course à pied',
        type: 'cardio',
        muscle_groups: '[]',
        technical_notes: null,
        description: null,
        is_custom: 0,
        progression_step: 0,
        progression_threshold: 1,
      });
    }

    // 4. WorkoutExercise
    const wes = await this.weRepo.findByWorkoutId(workout.id);
    let we = wes.find(w => w.exercise_id === exercise!.id) ?? null;
    if (!we) {
      we = await this.weRepo.save({ workout_id: workout.id, exercise_id: exercise.id, order_index: 0 });
    }

    // 5. Block
    const blocks = await this.blockRepo.findByWorkoutExerciseId(we.id);
    let block = blocks[0] ?? null;
    if (!block) {
      block = await this.blockRepo.save({ workout_exercise_id: we.id, name: 'Cardio', order_index: 0, is_work_block: 0 });
    }

    // 6. Set
    const sets = await this.setRepo.findByBlockId(block.id);
    let set = sets[0] ?? null;
    if (!set) {
      set = await this.setRepo.save({
        block_id: block.id,
        reps_min: 0,
        weight: null,
        weight_type: 'bodyweight',
        rest_duration: 0,
        order_index: 0,
      });
    }

    return { workoutId: workout.id, exerciseId: exercise.id, setId: set.id };
  }
}
```

- [ ] **Step 5 : Vérifier GREEN**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test -- --testPathPattern="GpxImportService" --no-coverage 2>&1 | tail -10
```

Attendu : tous passent

- [ ] **Step 6 : Typecheck**

```bash
cd C:/Users/sylva/projects/training-app/app && npm run typecheck 2>&1 | tail -5
```

Attendu : 0 erreurs

- [ ] **Step 7 : Commit**

```bash
cd C:/Users/sylva/projects/training-app/app && git add services/GpxImportService.ts services/GpxImportService.test.ts && git commit -m "feat(gpx): GpxImportService + findOrCreateFootingSetup TDD"
```

---

## Task 4 — `GpxImportService.importGpx` (TDD)

**Files:**
- Modify: `app/services/GpxImportService.ts`
- Modify: `app/services/GpxImportService.test.ts`

### Context

`importGpx(xmlContent: string): Promise<{ sessionLogId: number }>` orchestre : parse → find-or-create → create session_log → complete → create set_log avec durée/distance.

`ISessionLogRepository.save(dto: CreateSessionLogDto)` où `CreateSessionLogDto = Omit<SessionLog, 'id' | 'ended_at' | 'status' | 'paused_position' | 'mood_after' | 'tags'>`. Il faut donc passer `workout_id, started_at, checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null`.

`ISessionLogRepository.complete(id: number, endedAt: string): Promise<void>`.

`ISetLogRepository.save(dto)` où `CreateSetLogDto = Omit<SetLog, 'id' | 'duration_seconds' | 'distance_meters'> & { duration_seconds?: number | null; distance_meters?: number | null }`. Passer `duration_seconds` et `distance_meters`.

- [ ] **Step 1 : Ajouter les tests RED**

Dans `app/services/GpxImportService.test.ts`, ajouter dans le describe `GpxImportService` :

```typescript
describe('GpxImportService.importGpx', () => {
  it('crée un session_log complété avec workout_id correct', async () => {
    const { service, sessionLogRepo } = makeGpxService();
    const { sessionLogId } = await service.importGpx(GPX_MINIMAL);
    const log = await sessionLogRepo.findById(sessionLogId);
    expect(log).not.toBeNull();
    expect(log!.status).toBe('completed');
    expect(log!.ended_at).not.toBeNull();
  });

  it('crée un set_log avec duration_seconds et distance_meters', async () => {
    const { service, setLogRepo, sessionLogRepo } = makeGpxService();
    const { sessionLogId } = await service.importGpx(GPX_MINIMAL);
    const logs = await setLogRepo.findBySessionLogId(sessionLogId);
    expect(logs).toHaveLength(1);
    expect(logs[0].duration_seconds).toBe(30 * 60);
    expect(logs[0].distance_meters).toBeGreaterThan(110000);
  });

  it('réutilise le même workout si importGpx appelé deux fois', async () => {
    const { service, programRepo } = makeGpxService();
    await service.importGpx(GPX_MINIMAL);
    await service.importGpx(GPX_MINIMAL);
    expect(await programRepo.findAll()).toHaveLength(1);
  });

  it('started_at correspond au premier trackpoint', async () => {
    const { service, sessionLogRepo } = makeGpxService();
    const { sessionLogId } = await service.importGpx(GPX_MINIMAL);
    const log = await sessionLogRepo.findById(sessionLogId);
    expect(log!.started_at).toBe('2026-01-01T08:00:00Z');
  });
});
```

- [ ] **Step 2 : Vérifier RED**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test -- --testPathPattern="GpxImportService" --no-coverage 2>&1 | tail -10
```

Attendu : FAIL — `service.importGpx is not a function`

- [ ] **Step 3 : Implémenter `importGpx` dans la classe**

Dans `GpxImportService`, ajouter la méthode publique après `findOrCreateFootingSetup` :

```typescript
  async importGpx(xmlContent: string): Promise<{ sessionLogId: number }> {
    const gpxData = parseGpxFile(xmlContent);
    const { workoutId, exerciseId, setId } = await this.findOrCreateFootingSetup();

    const endedAt = new Date(
      Date.parse(gpxData.startedAt) + gpxData.durationSeconds * 1000,
    ).toISOString();

    const sessionLog = await this.sessionLogRepo.save({
      workout_id: workoutId,
      started_at: gpxData.startedAt,
      checkin_energy: null,
      checkin_fatigue: null,
      checkin_sleep: null,
      notes: null,
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

- [ ] **Step 4 : Ajouter `importParsed` (utilisé par l'écran UI pour data pré-parsée + rpe choisi)**

L'écran `import-gpx.tsx` a besoin d'importer avec distance éditée + rpe venant de l'UI — sans re-parser le XML. Ajouter dans la classe, après `importGpx` :

```typescript
  async importParsed(
    data: GpxData,
    rpe: 3 | 6 | 9 | null,
  ): Promise<{ sessionLogId: number }> {
    const { workoutId, exerciseId, setId } = await this.findOrCreateFootingSetup();
    const endedAt = new Date(
      Date.parse(data.startedAt) + data.durationSeconds * 1000,
    ).toISOString();
    const sessionLog = await this.sessionLogRepo.save({
      workout_id: workoutId,
      started_at: data.startedAt,
      checkin_energy: null,
      checkin_fatigue: null,
      checkin_sleep: null,
      notes: null,
    });
    await this.sessionLogRepo.complete(sessionLog.id, endedAt);
    await this.setLogRepo.save({
      session_log_id: sessionLog.id,
      set_id: setId,
      exercise_id: exerciseId,
      reps_done: 0,
      weight_done: 0,
      rpe,
      completed_at: endedAt,
      duration_seconds: data.durationSeconds,
      distance_meters: data.distanceMeters,
    });
    return { sessionLogId: sessionLog.id };
  }
```

- [ ] **Step 5 : Vérifier GREEN (tous les tests y compris importGpx)**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test -- --testPathPattern="GpxImportService" --no-coverage 2>&1 | tail -10
```

Attendu : tous passent

- [ ] **Step 6 : Suite complète + typecheck**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test --no-coverage 2>&1 | tail -5 && npm run typecheck 2>&1 | tail -5
```

Attendu : tous passent, 0 erreurs TS

- [ ] **Step 7 : Commit**

```bash
cd C:/Users/sylva/projects/training-app/app && git add services/GpxImportService.ts services/GpxImportService.test.ts && git commit -m "feat(gpx): GpxImportService.importGpx + importParsed TDD"
```

---

## Task 5 — Écran `import-gpx.tsx`

**Files:**
- Create: `app/app/import-gpx.tsx`

### Context

Expo Router file-based : créer `app/app/import-gpx.tsx` crée automatiquement la route `/import-gpx`. Pas besoin de modifier `_layout.tsx` (Expo Router découvre les routes dynamiquement).

Flow :
1. État initial : bouton "Choisir un fichier .gpx"
2. Après sélection : afficher résumé (date, durée, distance estimée, champ distance éditable, chips sensation)
3. Bouton "Importer" → `parseGpxFile` (déjà fait dans handlePickFile) puis `importParsed(data, rpe)` → navigation vers `/progression`
4. Bouton "Annuler" → reset état

`expo-document-picker` API : `DocumentPicker.getDocumentAsync({ type: ['*/*'], copyToCacheDirectory: true })`. Puis `FileSystem.readAsStringAsync(uri)` pour lire le fichier.

`useUnits()` est disponible (importé depuis `@/hooks/useUnits`). Le label distance utilise `unitLabel` (affiché en km dans le champ, conversion si lbs = non applicable pour distance).

`GpxImportService` doit être instancié avec tous les repos SQLite. Créer une factory `makeGpxService()` locale dans le fichier.

- [ ] **Step 1 : Créer `app/app/import-gpx.tsx`**

```typescript
import { useState, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { getDb } from '@/db/database';
import { GpxImportService, parseGpxFile, type GpxData } from '@/services/GpxImportService';
import { SQLiteProgramRepository } from '@/repositories/SQLiteProgramRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '@/repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '@/repositories/SQLiteSetRepository';
import { SQLiteSessionLogRepository } from '@/repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '@/repositories/SQLiteSetLogRepository';

function makeGpxService(): GpxImportService {
  const db = getDb();
  return new GpxImportService(
    new SQLiteProgramRepository(db),
    new SQLiteWorkoutRepository(db),
    new SQLiteExerciseRepository(db),
    new SQLiteWorkoutExerciseRepository(db),
    new SQLiteBlockRepository(db),
    new SQLiteSetRepository(db),
    new SQLiteSessionLogRepository(db),
    new SQLiteSetLogRepository(db),
  );
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} h ${m > 0 ? `${m} min` : ''}`.trim();
  return m > 0 ? `${m} min ${s > 0 ? `${s} s` : ''}`.trim() : `${s} s`;
}

export default function ImportGpxScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [gpxData, setGpxData] = useState<GpxData | null>(null);
  const [distanceKmEdited, setDistanceKmEdited] = useState('');
  const [selectedRpe, setSelectedRpe] = useState<3 | 6 | 9 | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || result.assets.length === 0) return;
    const uri = result.assets[0].uri;
    try {
      const content = await FileSystem.readAsStringAsync(uri);
      const data = parseGpxFile(content);
      setGpxData(data);
      setDistanceKmEdited((data.distanceMeters / 1000).toFixed(2));
      setSelectedRpe(null);
    } catch {
      Alert.alert('Erreur', 'Impossible de lire ce fichier GPX.');
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!gpxData) return;
    setLoading(true);
    try {
      const km = parseFloat(distanceKmEdited || '0');
      const dataWithEditedDistance: GpxData = {
        ...gpxData,
        distanceMeters: km > 0 ? Math.round(km * 1000) : gpxData.distanceMeters,
      };
      await makeGpxService().importParsed(dataWithEditedDistance, selectedRpe);
      router.replace('/(tabs)/progression' as any);
    } catch {
      Alert.alert('Erreur', "L'import a échoué. Vérifiez le fichier et réessayez.");
      setLoading(false);
    }
  }, [gpxData, distanceKmEdited, selectedRpe, router]);

  const handleReset = useCallback(() => {
    setGpxData(null);
    setDistanceKmEdited('');
    setSelectedRpe(null);
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: colors.text }]}>Importer un footing</Text>

      {!gpxData ? (
        <PressableA11y
          accessibilityLabel="Choisir un fichier GPX"
          onPress={handlePickFile}
          style={[styles.pickBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.pickBtnText}>Choisir un fichier .gpx</Text>
        </PressableA11y>
      ) : (
        <View style={styles.preview}>
          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>DATE</Text>
            <Text style={[styles.previewValue, { color: colors.text }]}>
              {new Date(gpxData.startedAt).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>
          </View>

          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>DURÉE</Text>
            <Text style={[styles.previewValue, { color: colors.text }]}>{formatDuration(gpxData.durationSeconds)}</Text>
          </View>

          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>DISTANCE (km)</Text>
            <TextInput
              style={[styles.distanceInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={distanceKmEdited}
              onChangeText={setDistanceKmEdited}
              keyboardType="decimal-pad"
              maxLength={6}
              accessibilityLabel="Distance en kilomètres"
            />
          </View>

          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>SENSATION (optionnel)</Text>
            <View style={styles.rpeRow}>
              {([
                { rpe: 3 as const, label: 'Léger' },
                { rpe: 6 as const, label: 'Normal' },
                { rpe: 9 as const, label: 'Difficile' },
              ] as const).map(({ rpe, label }) => (
                <PressableA11y
                  key={rpe}
                  accessibilityLabel={`Sensation : ${label}`}
                  accessibilityState={{ selected: selectedRpe === rpe }}
                  onPress={() => setSelectedRpe(selectedRpe === rpe ? null : rpe)}
                  style={[
                    styles.rpeChip,
                    { borderColor: colors.border },
                    selectedRpe === rpe ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={[styles.rpeLabel, { color: selectedRpe === rpe ? '#fff' : colors.text }]}>{label}</Text>
                </PressableA11y>
              ))}
            </View>
          </View>

          <PressableA11y
            accessibilityLabel="Importer cette séance"
            onPress={handleImport}
            disabled={loading}
            style={[styles.importBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
          >
            <Text style={styles.importBtnText}>{loading ? 'Import…' : 'Importer'}</Text>
          </PressableA11y>

          <PressableA11y
            accessibilityLabel="Annuler et choisir un autre fichier"
            onPress={handleReset}
            style={[styles.cancelBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Annuler</Text>
          </PressableA11y>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  pickBtn: { paddingVertical: 16, borderRadius: Radius.sm, alignItems: 'center' },
  pickBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  preview: { gap: 12 },
  previewCard: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 8 },
  previewLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  previewValue: { fontSize: 18, fontWeight: '600' },
  distanceInput: { borderWidth: 1, borderRadius: Radius.sm, padding: 10, fontSize: 18, fontWeight: '600' },
  rpeRow: { flexDirection: 'row', gap: 8 },
  rpeChip: { flex: 1, borderWidth: 1, borderRadius: Radius.sm, paddingVertical: 10, alignItems: 'center' },
  rpeLabel: { fontSize: 13, fontWeight: '500' },
  importBtn: { paddingVertical: 16, borderRadius: Radius.sm, alignItems: 'center', marginTop: 8 },
  importBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  cancelBtn: { paddingVertical: 14, borderRadius: Radius.sm, alignItems: 'center', borderWidth: 1 },
  cancelBtnText: { fontSize: 15 },
});
```

- [ ] **Step 2 : Typecheck**

```bash
cd C:/Users/sylva/projects/training-app/app && npm run typecheck 2>&1 | tail -10
```

Si erreur sur `SQLiteProgramRepository`, `SQLiteSessionLogRepository`, etc. — vérifier les noms exacts dans `app/repositories/`. Les noms SQLite repos peuvent varier (`SQLiteSessionLogRepository` ou `SqliteSessionLogRepository`). Corriger selon ce qui existe dans le dossier.

- [ ] **Step 3 : Typecheck final**

```bash
cd C:/Users/sylva/projects/training-app/app && npm run typecheck 2>&1 | tail -5
```

Attendu : 0 erreurs

- [ ] **Step 4 : Commit**

```bash
cd C:/Users/sylva/projects/training-app/app && git add app/import-gpx.tsx && git commit -m "feat(gpx): écran import-gpx"
```

---

## Task 6 — Bouton "Importer un footing" dans `progression.tsx`

**Files:**
- Modify: `app/app/(tabs)/progression.tsx`

### Context

Dans `progression.tsx`, le segment stats (ScrollView à partir de la ligne ~132) contient un `PressableA11y` "Rechercher un exercice" qui pointe vers `/progression/search`. Le bouton "Importer un footing" s'ajoute juste après, avec le même style de base (`searchEntry`).

- [ ] **Step 1 : Ajouter le bouton après "Rechercher un exercice"**

Dans `app/app/(tabs)/progression.tsx`, trouver le bloc :

```typescript
        <PressableA11y
          accessibilityLabel="Rechercher un exercice"
          onPress={() => router.push('/progression/search' as any)}
          style={[styles.searchEntry, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.searchEntryText, { color: colors.textSecondary }]}>Rechercher un exercice</Text>
          <Text style={[styles.searchEntryChevron, { color: colors.textSecondary }]}>›</Text>
        </PressableA11y>
```

Ajouter immédiatement après :

```typescript
        <PressableA11y
          accessibilityLabel="Importer un footing GPX"
          onPress={() => router.push('/import-gpx' as any)}
          style={[styles.searchEntry, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.searchEntryText, { color: colors.textSecondary }]}>Importer un footing</Text>
          <Text style={[styles.searchEntryChevron, { color: colors.textSecondary }]}>›</Text>
        </PressableA11y>
```

- [ ] **Step 2 : Typecheck + tests**

```bash
cd C:/Users/sylva/projects/training-app/app && npm run typecheck 2>&1 | tail -5 && npm test --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs, tous passent

- [ ] **Step 3 : Commit**

```bash
cd C:/Users/sylva/projects/training-app/app && git add app/(tabs)/progression.tsx && git commit -m "feat(gpx): bouton 'Importer un footing' dans progression.tsx"
```
