# Détection plateau Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Détecter quand un exercice stagne au même poids sur 3 séances consécutives et afficher un signal factuel dans `SummaryPhase`.

**Architecture:** `PlateauDetectionService` isolé (4 dépendances repo, 0 migration DB) + prop `plateaus?` dans `SummaryPhase` + `useEffect` dans `[workoutId].tsx` déclenché à l'entrée en phase `summary`.

**Tech Stack:** TypeScript strict, expo-sqlite, InMemory repos pour TDD, React Native StyleSheet.

---

## Fichiers

| Fichier | Action |
|---|---|
| `app/services/PlateauDetectionService.ts` | Créer |
| `app/services/PlateauDetectionService.test.ts` | Créer (TDD first) |
| `app/components/session/SummaryPhase.tsx` | Modifier — prop `plateaus?` + card |
| `app/app/session/[workoutId].tsx` | Modifier — instancier service + passer prop |

---

## Task 1: PlateauDetectionService — TDD

**Files:**
- Create: `app/services/PlateauDetectionService.test.ts`
- Create: `app/services/PlateauDetectionService.ts`

- [ ] **Step 1: Écrire le test (fichier vide au départ)**

Créer `app/services/PlateauDetectionService.test.ts` :

```typescript
import { PlateauDetectionService } from './PlateauDetectionService';
import { InMemorySetLogRepository } from '../repositories/InMemorySetLogRepository';
import { InMemorySessionLogRepository } from '../repositories/InMemorySessionLogRepository';
import { InMemoryWorkoutExerciseRepository } from '../repositories/InMemoryWorkoutExerciseRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';

const WORKOUT_ID = 1;
const EXERCISE_ID = 10;

async function makeCtx() {
  const setLogRepo = new InMemorySetLogRepository();
  const sessionLogRepo = new InMemorySessionLogRepository();
  const workoutExerciseRepo = new InMemoryWorkoutExerciseRepository();
  const exerciseRepo = new InMemoryExerciseRepository();

  await workoutExerciseRepo.save({ workout_id: WORKOUT_ID, exercise_id: EXERCISE_ID, order_index: 0 });
  await exerciseRepo.save({
    name: 'Développé couché',
    type: 'musculation',
    muscle_groups: '["pectoraux"]',
    technical_notes: null,
    description: null,
    is_custom: 0,
    progression_step: 2.5,
    progression_threshold: 1,
  });

  const service = new PlateauDetectionService(setLogRepo, sessionLogRepo, workoutExerciseRepo, exerciseRepo);
  return { setLogRepo, sessionLogRepo, service };
}

async function addCompletedSession(
  sessionLogRepo: InMemorySessionLogRepository,
  setLogRepo: InMemorySetLogRepository,
  startedAt: string,
  weightDone: number,
): Promise<number> {
  const session = await sessionLogRepo.save({
    workout_id: WORKOUT_ID,
    started_at: startedAt,
    checkin_energy: null,
    checkin_fatigue: null,
    checkin_sleep: null,
    notes: null,
  });
  await sessionLogRepo.complete(session.id, startedAt);
  await setLogRepo.save({
    session_log_id: session.id,
    set_id: 1,
    exercise_id: EXERCISE_ID,
    reps_done: 8,
    weight_done: weightDone,
    rpe: null,
    completed_at: startedAt,
  });
  return session.id;
}

describe('PlateauDetectionService', () => {
  it('détecte un plateau quand même poids sur 3 séances consécutives', async () => {
    const { setLogRepo, sessionLogRepo, service } = await makeCtx();
    await addCompletedSession(sessionLogRepo, setLogRepo, '2026-01-01T10:00:00Z', 60);
    await addCompletedSession(sessionLogRepo, setLogRepo, '2026-01-03T10:00:00Z', 60);
    const id3 = await addCompletedSession(sessionLogRepo, setLogRepo, '2026-01-05T10:00:00Z', 60);

    const result = await service.detectPlateaus(id3);
    expect(result).toHaveLength(1);
    expect(result[0].exerciseName).toBe('Développé couché');
    expect(result[0].currentWeight).toBe(60);
    expect(result[0].sessionsCount).toBe(3);
  });

  it('ne détecte pas de plateau si moins de 3 séances complétées', async () => {
    const { setLogRepo, sessionLogRepo, service } = await makeCtx();
    await addCompletedSession(sessionLogRepo, setLogRepo, '2026-01-01T10:00:00Z', 60);
    const id2 = await addCompletedSession(sessionLogRepo, setLogRepo, '2026-01-03T10:00:00Z', 60);

    const result = await service.detectPlateaus(id2);
    expect(result).toHaveLength(0);
  });

  it('ne détecte pas de plateau si le poids a progressé sur la 2e séance', async () => {
    const { setLogRepo, sessionLogRepo, service } = await makeCtx();
    await addCompletedSession(sessionLogRepo, setLogRepo, '2026-01-01T10:00:00Z', 60);
    await addCompletedSession(sessionLogRepo, setLogRepo, '2026-01-03T10:00:00Z', 62.5);
    const id3 = await addCompletedSession(sessionLogRepo, setLogRepo, '2026-01-05T10:00:00Z', 60);

    const result = await service.detectPlateaus(id3);
    expect(result).toHaveLength(0);
  });

  it('exclut les séances abandonnées du comptage', async () => {
    const { setLogRepo, sessionLogRepo, service } = await makeCtx();
    await addCompletedSession(sessionLogRepo, setLogRepo, '2026-01-01T10:00:00Z', 60);

    const abandoned = await sessionLogRepo.save({
      workout_id: WORKOUT_ID,
      started_at: '2026-01-02T10:00:00Z',
      checkin_energy: null, checkin_fatigue: null, checkin_sleep: null, notes: null,
    });
    await sessionLogRepo.abandon(abandoned.id, '2026-01-02T11:00:00Z');
    await setLogRepo.save({
      session_log_id: abandoned.id, set_id: 1, exercise_id: EXERCISE_ID,
      reps_done: 5, weight_done: 60, rpe: null, completed_at: '2026-01-02T10:00:00Z',
    });

    const id3 = await addCompletedSession(sessionLogRepo, setLogRepo, '2026-01-03T10:00:00Z', 60);

    // 2 complétées seulement → pas de plateau
    const result = await service.detectPlateaus(id3);
    expect(result).toHaveLength(0);
  });

  it('ignore les exercices bodyweight (weight_done = 0)', async () => {
    const { setLogRepo, sessionLogRepo, service } = await makeCtx();
    await addCompletedSession(sessionLogRepo, setLogRepo, '2026-01-01T10:00:00Z', 0);
    await addCompletedSession(sessionLogRepo, setLogRepo, '2026-01-03T10:00:00Z', 0);
    const id3 = await addCompletedSession(sessionLogRepo, setLogRepo, '2026-01-05T10:00:00Z', 0);

    const result = await service.detectPlateaus(id3);
    expect(result).toHaveLength(0);
  });

  it('retourne [] si sessionLogId inconnu', async () => {
    const { service } = await makeCtx();
    const result = await service.detectPlateaus(999);
    expect(result).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Lancer les tests — vérifier qu'ils échouent**

```
cd C:\Users\sylva\projects\training-app\app && npx jest PlateauDetection --no-coverage
```

Attendu : FAIL — `Cannot find module './PlateauDetectionService'`

- [ ] **Step 3: Implémenter `PlateauDetectionService`**

Créer `app/services/PlateauDetectionService.ts` :

```typescript
import type { ISetLogRepository } from '../repositories/ISetLogRepository';
import type { ISessionLogRepository } from '../repositories/ISessionLogRepository';
import type { IWorkoutExerciseRepository } from '../repositories/IWorkoutExerciseRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';

export interface PlateauResult {
  exerciseId: number;
  exerciseName: string;
  currentWeight: number;
  sessionsCount: number;
}

const PLATEAU_THRESHOLD = 3;

export class PlateauDetectionService {
  constructor(
    private setLogRepo: ISetLogRepository,
    private sessionLogRepo: ISessionLogRepository,
    private workoutExerciseRepo: IWorkoutExerciseRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async detectPlateaus(sessionLogId: number): Promise<PlateauResult[]> {
    const sessionLog = await this.sessionLogRepo.findById(sessionLogId);
    if (!sessionLog) return [];

    const allSessions = await this.sessionLogRepo.findByWorkoutId(sessionLog.workout_id);
    const completedSessions = allSessions
      .filter(s => s.status === 'completed')
      .sort((a, b) => b.started_at.localeCompare(a.started_at));

    if (completedSessions.length < PLATEAU_THRESHOLD) return [];

    const last3Ids = new Set(
      completedSessions.slice(0, PLATEAU_THRESHOLD).map(s => s.id),
    );

    const workoutExercises = await this.workoutExerciseRepo.findByWorkoutId(sessionLog.workout_id);
    const plateaus: PlateauResult[] = [];

    for (const we of workoutExercises) {
      const exercise = await this.exerciseRepo.findById(we.exercise_id);
      if (!exercise) continue;

      const setLogs = await this.setLogRepo.findByExerciseId(we.exercise_id);

      const maxWeightPerSession = new Map<number, number>();
      for (const log of setLogs) {
        if (!last3Ids.has(log.session_log_id)) continue;
        const current = maxWeightPerSession.get(log.session_log_id) ?? 0;
        maxWeightPerSession.set(log.session_log_id, Math.max(current, log.weight_done));
      }

      if (maxWeightPerSession.size < PLATEAU_THRESHOLD) continue;

      const weights = [...maxWeightPerSession.values()];
      const referenceWeight = weights[0];

      if (referenceWeight === 0) continue;
      if (!weights.every(w => w === referenceWeight)) continue;

      plateaus.push({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        currentWeight: referenceWeight,
        sessionsCount: PLATEAU_THRESHOLD,
      });
    }

    return plateaus;
  }
}
```

- [ ] **Step 4: Lancer les tests — vérifier qu'ils passent**

```
cd C:\Users\sylva\projects\training-app\app && npx jest PlateauDetection --no-coverage
```

Attendu : 6/6 PASS

- [ ] **Step 5: Commit**

```bash
git -C C:\Users\sylva\projects\training-app add app/services/PlateauDetectionService.ts app/services/PlateauDetectionService.test.ts
git -C C:\Users\sylva\projects\training-app commit -m "feat(plateau): PlateauDetectionService TDD — détecte même poids × 3 séances"
```

---

## Task 2: SummaryPhase — prop plateaus + card

**Files:**
- Modify: `app/components/session/SummaryPhase.tsx`

- [ ] **Step 1: Ajouter prop `plateaus?` et import**

Dans `app/components/session/SummaryPhase.tsx`, mettre à jour l'interface et les imports :

```typescript
// Ajouter en haut du fichier, après les imports existants :
import type { PlateauResult } from '@/services/PlateauDetectionService';

// Mettre à jour SummaryPhaseProps :
interface SummaryPhaseProps {
  progressions: ProgressionResult[];
  totalSets: number;
  durationSeconds: number;
  totalVolumeKg?: number;
  plateaus?: PlateauResult[];
  onClose: () => void;
}

// Mettre à jour la destructuration :
export function SummaryPhase({ progressions, totalSets, durationSeconds, totalVolumeKg, plateaus, onClose }: SummaryPhaseProps) {
```

- [ ] **Step 2: Ajouter la card plateau dans le JSX**

Insérer **avant** le bouton `closeBtn`, après la section `progressionSection` :

```tsx
{plateaus && plateaus.length > 0 && (
  <View style={[styles.plateauSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>Même charge depuis 3 séances</Text>
    {plateaus.map(p => (
      <View key={p.exerciseId} style={[styles.plateauRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.plateauName, { color: colors.text }]} numberOfLines={1}>{p.exerciseName}</Text>
        <Text style={[styles.plateauWeight, { color: colors.textSecondary }]}>
          {convert(p.currentWeight)} {unitLabel}
        </Text>
      </View>
    ))}
    <Text style={[styles.plateauHint, { color: colors.textSecondary }]}>
      Tu peux tenter d'augmenter à la prochaine séance.
    </Text>
  </View>
)}
```

- [ ] **Step 3: Ajouter les styles**

Dans `StyleSheet.create({...})`, ajouter :

```typescript
plateauSection: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 10 },
plateauRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1 },
plateauName: { flex: 1, fontSize: 14 },
plateauWeight: { fontSize: 13 },
plateauHint: { fontSize: 13, fontStyle: 'italic', marginTop: 2 },
```

- [ ] **Step 4: Vérifier TypeScript + commit**

```
cd C:\Users\sylva\projects\training-app\app && npm run typecheck
```

Attendu : 0 erreurs.

```bash
git -C C:\Users\sylva\projects\training-app add app/components/session/SummaryPhase.tsx
git -C C:\Users\sylva\projects\training-app commit -m "feat(SummaryPhase): card plateau — même charge depuis 3 séances"
```

---

## Task 3: Intégration dans `[workoutId].tsx`

**Files:**
- Modify: `app/app/session/[workoutId].tsx`

- [ ] **Step 1: Ajouter les imports**

Dans `app/app/session/[workoutId].tsx`, ajouter après les imports SQLite existants :

```typescript
import { PlateauDetectionService } from '@/services/PlateauDetectionService';
import type { PlateauResult } from '@/services/PlateauDetectionService';
```

- [ ] **Step 2: Ajouter state + useEffect dans `SessionContent`**

Dans la fonction `SessionContent`, après le state `summaryDurationSeconds` (ligne ~164) :

```typescript
const [plateaus, setPlateaus] = useState<PlateauResult[]>([]);

useEffect(() => {
  if (session.phase !== 'summary' || !session.sessionLogId) return;
  const db = getDb();
  const service = new PlateauDetectionService(
    new SQLiteSetLogRepository(db),
    new SQLiteSessionLogRepository(db),
    new SQLiteWorkoutExerciseRepository(db),
    new SQLiteExerciseRepository(db),
  );
  service.detectPlateaus(session.sessionLogId).then(setPlateaus);
}, [session.phase, session.sessionLogId]);
```

- [ ] **Step 3: Passer `plateaus` à `SummaryPhase`**

Trouver le rendu `SummaryPhase` (~ligne 283) et ajouter la prop :

```tsx
{!session.error && session.phase === 'summary' && (
  <SummaryPhase
    progressions={session.progressions}
    totalSets={session.totalSetsLogged}
    durationSeconds={summaryDurationSeconds}
    totalVolumeKg={session.totalVolume}
    plateaus={plateaus}
    onClose={handleBack}
  />
)}
```

- [ ] **Step 4: Vérifier TypeScript + tests + commit**

```
cd C:\Users\sylva\projects\training-app\app && npm run typecheck
```

Attendu : 0 erreurs.

```
npx jest --no-coverage
```

Attendu : toutes les suites passent (incluant PlateauDetection 6/6).

```bash
git -C C:\Users\sylva\projects\training-app add app/app/session/[workoutId].tsx
git -C C:\Users\sylva\projects\training-app commit -m "feat(session): intégrer PlateauDetectionService — afficher plateaux en SummaryPhase"
```
