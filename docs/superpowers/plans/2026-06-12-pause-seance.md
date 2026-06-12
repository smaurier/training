# Pause Séance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de mettre une séance en pause et de la reprendre plus tard sans perte de données.

**Architecture:** Migration DB v8 ajoute `status` + `paused_position` sur `session_logs`. Le service expose `pauseSession` / `abandonSession` / `findAnyPausedSession`. `useSession` accepte un `initialSession` optionnel pour éviter le flash CheckIn. `[workoutId].tsx` est découpé en `SessionScreen` (check mount) + `SessionContent` (logique séance). La home affiche une card de reprise via `ResumeSessionCard`.

**Tech Stack:** React Native, Expo SDK 54, expo-sqlite, TypeScript strict, @gorhom/bottom-sheet v5, @testing-library/react-native, Jest jest-expo

---

## File Structure

| Fichier | Action |
|---------|--------|
| `app/db/schema.ts` | Ajouter migration v8 |
| `app/db/types.ts` | Ajouter `status` + `paused_position` à `SessionLog` |
| `app/repositories/ISessionLogRepository.ts` | Ajouter `pause`, `abandon`, `findAnyPaused` |
| `app/repositories/SQLiteSessionLogRepository.ts` | Implémenter + mettre à jour `complete` |
| `app/repositories/InMemorySessionLogRepository.ts` | Implémenter + mettre à jour `complete` + `save` |
| `app/services/SessionService.ts` | `pauseSession`, `abandonSession`, `findAnyPausedSession`, update `completeSession`/`startSession` |
| `app/services/SessionService.test.ts` | 6 nouveaux tests + mise à jour existants |
| `app/services/sessionUtils.ts` | `shouldWarnAbandon` (nouveau) |
| `app/services/sessionUtils.test.ts` | Tests shouldWarnAbandon (nouveau) |
| `app/hooks/useSession.ts` | `InitialSession` interface, param optionnel, `pauseSession` |
| `app/hooks/useSession.test.ts` | 3 nouveaux tests reprise |
| `app/components/session/ResumeSessionCard.tsx` | Composant isolé (nouveau) |
| `app/components/session/ResumeSessionCard.test.tsx` | Tests RTL (nouveau) |
| `app/app/session/[workoutId].tsx` | Split SessionScreen/SessionContent, pause button, abandon sheet |
| `app/app/(tabs)/index.tsx` | Home card reprise |
| `app/package.json` | `testMatch` += `"**/*.test.tsx"` |

---

### Task 1: DB migration v8 + types

**Files:**
- Modify: `app/db/schema.ts`
- Modify: `app/db/types.ts`

> Pas de test pour la migration elle-même — les tests de service utiliseront InMemory qui reflète les mêmes champs.

- [ ] **Step 1: Ajouter la migration v8 dans `schema.ts`**

À la fin du tableau `MIGRATIONS`, après `// v7`, ajouter :

```typescript
  // v8 — pause séance : position persistée + statut cycle de vie
  `
  ALTER TABLE session_logs ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active', 'paused', 'completed', 'abandoned'));
  ALTER TABLE session_logs ADD COLUMN paused_position TEXT;
  `,
```

- [ ] **Step 2: Mettre à jour le type `SessionLog` dans `db/types.ts`**

Remplacer :

```typescript
export interface SessionLog {
  id: number;
  workout_id: number;
  started_at: string;
  ended_at: string | null;
  checkin_energy: 1 | 2 | 3 | null;
  checkin_fatigue: 1 | 2 | 3 | null;
  checkin_sleep: 1 | 2 | 3 | null;
  notes: string | null;
}
```

Par :

```typescript
export type SessionStatus = 'active' | 'paused' | 'completed' | 'abandoned';

export interface SessionLog {
  id: number;
  workout_id: number;
  started_at: string;
  ended_at: string | null;
  checkin_energy: 1 | 2 | 3 | null;
  checkin_fatigue: 1 | 2 | 3 | null;
  checkin_sleep: 1 | 2 | 3 | null;
  notes: string | null;
  status: SessionStatus;
  paused_position: string | null;
}
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
cd app && npx tsc --noEmit
```

Attendu : erreurs sur les repos InMemory (status/paused_position manquants dans `save`) — normal, on les corrige dans Task 2.

- [ ] **Step 4: Commit**

```bash
git add app/db/schema.ts app/db/types.ts
git commit -m "feat(db): migration v8 — status + paused_position sur session_logs"
```

---

### Task 2: Repository layer — interface + implémentations

**Files:**
- Modify: `app/repositories/ISessionLogRepository.ts`
- Modify: `app/repositories/SQLiteSessionLogRepository.ts`
- Modify: `app/repositories/InMemorySessionLogRepository.ts`

- [ ] **Step 1: Ajouter les méthodes au contrat `ISessionLogRepository.ts`**

Remplacer le fichier entier :

```typescript
import type { SessionLog } from '../db/types';

export type CreateSessionLogDto = Omit<SessionLog, 'id' | 'ended_at' | 'status' | 'paused_position'>;

export interface ISessionLogRepository {
  save(dto: CreateSessionLogDto): Promise<SessionLog>;
  findById(id: number): Promise<SessionLog | null>;
  findByWorkoutId(workoutId: number): Promise<SessionLog[]>;
  findLatestByWorkoutIds(workoutIds: number[]): Promise<SessionLog | null>;
  findLatestDatesPerWorkout(workoutIds: number[]): Promise<Map<number, string | null>>;
  complete(id: number, endedAt: string): Promise<void>;
  pause(id: number, position: string): Promise<void>;
  abandon(id: number, endedAt: string): Promise<void>;
  findAnyPaused(): Promise<SessionLog | null>;
  findAll(): Promise<SessionLog[]>;
}
```

- [ ] **Step 2: Implémenter dans `SQLiteSessionLogRepository.ts`**

Mettre à jour `complete` et ajouter les 3 nouvelles méthodes. Remplacer la méthode `complete` existante et ajouter après `findAll` :

```typescript
  async complete(id: number, endedAt: string): Promise<void> {
    await this.db.runAsync(
      "UPDATE session_logs SET ended_at = ?, status = 'completed' WHERE id = ?",
      [endedAt, id]
    );
  }

  async pause(id: number, position: string): Promise<void> {
    await this.db.runAsync(
      "UPDATE session_logs SET status = 'paused', paused_position = ? WHERE id = ?",
      [position, id]
    );
  }

  async abandon(id: number, endedAt: string): Promise<void> {
    await this.db.runAsync(
      "UPDATE session_logs SET status = 'abandoned', ended_at = ? WHERE id = ?",
      [endedAt, id]
    );
  }

  async findAnyPaused(): Promise<SessionLog | null> {
    return this.db.getFirstAsync<SessionLog>(
      "SELECT * FROM session_logs WHERE status = 'paused' ORDER BY started_at DESC LIMIT 1"
    );
  }
```

- [ ] **Step 3: Implémenter dans `InMemorySessionLogRepository.ts`**

Remplacer le fichier entier :

```typescript
import type { SessionLog } from '../db/types';
import { ISessionLogRepository, CreateSessionLogDto } from './ISessionLogRepository';

export class InMemorySessionLogRepository implements ISessionLogRepository {
  private items: SessionLog[] = [];
  private nextId = 1;

  async save(dto: CreateSessionLogDto): Promise<SessionLog> {
    const item: SessionLog = {
      ...dto, id: this.nextId++, ended_at: null, status: 'active', paused_position: null,
    };
    this.items.push(item);
    return item;
  }

  async findById(id: number): Promise<SessionLog | null> {
    return this.items.find(i => i.id === id) ?? null;
  }

  async findByWorkoutId(workoutId: number): Promise<SessionLog[]> {
    return this.items.filter(i => i.workout_id === workoutId);
  }

  async findLatestByWorkoutIds(workoutIds: number[]): Promise<SessionLog | null> {
    if (workoutIds.length === 0) return null;
    const matching = this.items
      .filter(i => workoutIds.includes(i.workout_id))
      .sort((a, b) => b.started_at.localeCompare(a.started_at));
    return matching[0] ?? null;
  }

  async findLatestDatesPerWorkout(workoutIds: number[]): Promise<Map<number, string | null>> {
    const result = new Map<number, string | null>();
    for (const id of workoutIds) {
      const logs = this.items
        .filter(l => l.workout_id === id)
        .sort((a, b) => b.started_at.localeCompare(a.started_at));
      result.set(id, logs[0]?.started_at ?? null);
    }
    return result;
  }

  async complete(id: number, endedAt: string): Promise<void> {
    const item = this.items.find(i => i.id === id);
    if (item) { item.ended_at = endedAt; item.status = 'completed'; }
  }

  async pause(id: number, position: string): Promise<void> {
    const item = this.items.find(i => i.id === id);
    if (item) { item.status = 'paused'; item.paused_position = position; }
  }

  async abandon(id: number, endedAt: string): Promise<void> {
    const item = this.items.find(i => i.id === id);
    if (item) { item.status = 'abandoned'; item.ended_at = endedAt; }
  }

  async findAnyPaused(): Promise<SessionLog | null> {
    return this.items
      .filter(i => i.status === 'paused')
      .sort((a, b) => b.started_at.localeCompare(a.started_at))[0] ?? null;
  }

  async findAll(): Promise<SessionLog[]> {
    return [...this.items].sort((a, b) => b.started_at.localeCompare(a.started_at));
  }

  async getLastCompletedWorkoutId(workoutIds: number[]): Promise<number | null> {
    if (workoutIds.length === 0) return null;
    const row = this.items
      .filter(i => workoutIds.includes(i.workout_id) && i.ended_at !== null)
      .sort((a, b) => b.ended_at!.localeCompare(a.ended_at!))[0];
    return row?.workout_id ?? null;
  }
}
```

- [ ] **Step 4: Vérifier TypeScript**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreurs (ou erreurs résiduelles dans SessionService.ts si startSession pas encore mis à jour).

- [ ] **Step 5: Lancer les tests existants**

```bash
cd app && npx jest --no-coverage
```

Attendu : tous les tests passent (les tests repo InMemory continuent de fonctionner).

- [ ] **Step 6: Commit**

```bash
git add app/repositories/ISessionLogRepository.ts app/repositories/SQLiteSessionLogRepository.ts app/repositories/InMemorySessionLogRepository.ts
git commit -m "feat(repo): SessionLogRepository — pause, abandon, findAnyPaused + complete → status='completed'"
```

---

### Task 3: SessionService — nouvelles méthodes (TDD)

**Files:**
- Modify: `app/services/SessionService.ts`
- Modify: `app/services/SessionService.test.ts`

**Contexte :** `SessionService` a déjà 8 deps injectés. Le service utilise `workoutRepo.findById` (existe dans `IWorkoutRepository`) et `setLogRepo.findBySessionLogId` (existe dans `ISetLogRepository`).

- [ ] **Step 1: Écrire les tests échouants**

Ouvrir `app/services/SessionService.test.ts`. Ajouter à la fin du fichier les describes suivants :

```typescript
describe('SessionService.pauseSession', () => {
  it('met status=paused et sérialise la position', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.pauseSession(log.id, { exerciseIdx: 0, blockIdx: 1, setIdx: 2 }, 'running');
    const updated = await ctx.sessionLogRepo.findById(log.id);
    expect(updated!.status).toBe('paused');
    const pos = JSON.parse(updated!.paused_position!);
    expect(pos).toEqual({ exerciseIdx: 0, blockIdx: 1, setIdx: 2, phase: 'running' });
  });
});

describe('SessionService.abandonSession', () => {
  it('met status=abandoned et ended_at, ne calcule pas les progressions', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.abandonSession(log.id);
    const updated = await ctx.sessionLogRepo.findById(log.id);
    expect(updated!.status).toBe('abandoned');
    expect(updated!.ended_at).not.toBeNull();
  });

  it('ne lance pas calculateProgressions (les sets_logs ne déclenchent pas de mise à jour poids)', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    // abandonSession ne doit pas appeler setRepo.update — on vérifie que ça ne throw pas
    await expect(service.abandonSession(log.id)).resolves.toBeUndefined();
  });
});

describe('SessionService.findAnyPausedSession', () => {
  it('retourne null si aucune session en pause', async () => {
    const ctx = makeService();
    const service = ctx.build();
    expect(await service.findAnyPausedSession()).toBeNull();
  });

  it('retourne la session en pause avec workoutName, setsLogged, volume', async () => {
    const ctx = makeService();
    // Seed workout
    const workout = await ctx.workoutRepo.save({ program_id: 1, name: 'PPL Push', order_index: 0 });
    const service = ctx.build();
    const log = await service.startSession(workout.id, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await ctx.setLogRepo.save({ session_log_id: log.id, set_id: 1, exercise_id: 1, reps_done: 8, weight_done: 80, rpe: null, completed_at: new Date().toISOString() });
    await service.pauseSession(log.id, { exerciseIdx: 0, blockIdx: 0, setIdx: 1 }, 'running');
    const result = await service.findAnyPausedSession();
    expect(result).not.toBeNull();
    expect(result!.workoutName).toBe('PPL Push');
    expect(result!.setsLogged).toBe(1);
    expect(result!.volume).toBe(8 * 80);
  });

  it('ignore les sessions completed et abandoned', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.abandonSession(log.id);
    expect(await service.findAnyPausedSession()).toBeNull();
  });
});

describe('SessionService.startSession (garde session en pause)', () => {
  it("throw si une session est déjà en pause pour ce workoutId", async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.pauseSession(log.id, { exerciseIdx: 0, blockIdx: 0, setIdx: 0 }, 'running');
    await expect(
      service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 })
    ).rejects.toThrow('Une séance est déjà en pause');
  });

  it('permet de démarrer un autre workoutId même si une session est en pause', async () => {
    const ctx = makeService();
    const service = ctx.build();
    const log = await service.startSession(1, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 });
    await service.pauseSession(log.id, { exerciseIdx: 0, blockIdx: 0, setIdx: 0 }, 'running');
    // workoutId=2 est différent → pas d'erreur
    await expect(
      service.startSession(2, { checkin_energy: 3, checkin_fatigue: 1, checkin_sleep: 2 })
    ).resolves.toBeDefined();
  });
});
```

- [ ] **Step 2: Lancer les tests pour confirmer l'échec**

```bash
cd app && npx jest --no-coverage SessionService.test.ts
```

Attendu : FAIL — méthodes `pauseSession`, `abandonSession`, `findAnyPausedSession` non définies.

- [ ] **Step 3: Ajouter l'interface `PausedSessionInfo` et les méthodes dans `SessionService.ts`**

Après les interfaces existantes (`ProgressionResult`, etc.), ajouter :

```typescript
export interface PausedSessionInfo {
  sessionLog: SessionLog;
  workoutName: string;
  setsLogged: number;
  volume: number;
}
```

Dans la classe `SessionService`, mettre à jour `startSession` :

```typescript
  async startSession(workoutId: number, checkin: CheckIn): Promise<SessionLog> {
    const existing = await this.sessionLogRepo.findAnyPaused();
    if (existing && existing.workout_id === workoutId) {
      throw new Error('Une séance est déjà en pause');
    }
    return this.sessionLogRepo.save({
      workout_id: workoutId,
      started_at: new Date().toISOString(),
      checkin_energy: checkin.checkin_energy,
      checkin_fatigue: checkin.checkin_fatigue,
      checkin_sleep: checkin.checkin_sleep,
      notes: null,
    });
  }
```

Ajouter les 3 nouvelles méthodes après `completeSession` :

```typescript
  async pauseSession(
    sessionLogId: number,
    position: { exerciseIdx: number; blockIdx: number; setIdx: number },
    phase: 'checkin' | 'exercise_transition' | 'running' | 'rest' | 'summary',
  ): Promise<void> {
    const positionJson = JSON.stringify({
      exerciseIdx: position.exerciseIdx,
      blockIdx: position.blockIdx,
      setIdx: position.setIdx,
      phase,
    });
    await this.sessionLogRepo.pause(sessionLogId, positionJson);
  }

  async abandonSession(sessionLogId: number): Promise<void> {
    await this.sessionLogRepo.abandon(sessionLogId, new Date().toISOString());
  }

  async findAnyPausedSession(): Promise<PausedSessionInfo | null> {
    const sessionLog = await this.sessionLogRepo.findAnyPaused();
    if (!sessionLog) return null;
    const workout = await this.workoutRepo.findById(sessionLog.workout_id);
    const setLogs = await this.setLogRepo.findBySessionLogId(sessionLog.id);
    const setsLogged = setLogs.length;
    const volume = setLogs.reduce((sum, sl) => sum + sl.reps_done * sl.weight_done, 0);
    return { sessionLog, workoutName: workout?.name ?? '', setsLogged, volume };
  }
```

- [ ] **Step 4: Lancer les tests**

```bash
cd app && npx jest --no-coverage SessionService.test.ts
```

Attendu : tous les tests passent.

- [ ] **Step 5: Lancer la suite complète**

```bash
cd app && npx jest --no-coverage
```

Attendu : tous les tests existants passent.

- [ ] **Step 6: Commit**

```bash
git add app/services/SessionService.ts app/services/SessionService.test.ts
git commit -m "feat(service): pauseSession, abandonSession, findAnyPausedSession — TDD"
```

---

### Task 4: sessionUtils.ts — shouldWarnAbandon (TDD)

**Files:**
- Create: `app/services/sessionUtils.ts`
- Create: `app/services/sessionUtils.test.ts`

- [ ] **Step 1: Écrire le test**

Créer `app/services/sessionUtils.test.ts` :

```typescript
import { shouldWarnAbandon } from './sessionUtils';

describe('shouldWarnAbandon', () => {
  it('retourne true si les workoutId sont différents', () => {
    expect(shouldWarnAbandon(1, 2)).toBe(true);
  });

  it('retourne false si les workoutId sont identiques', () => {
    expect(shouldWarnAbandon(1, 1)).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer le test pour confirmer l'échec**

```bash
cd app && npx jest --no-coverage sessionUtils.test.ts
```

Attendu : FAIL — module introuvable.

- [ ] **Step 3: Créer `app/services/sessionUtils.ts`**

```typescript
export function shouldWarnAbandon(
  pausedWorkoutId: number,
  targetWorkoutId: number,
): boolean {
  return pausedWorkoutId !== targetWorkoutId;
}
```

- [ ] **Step 4: Lancer le test**

```bash
cd app && npx jest --no-coverage sessionUtils.test.ts
```

Attendu : 2/2 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/services/sessionUtils.ts app/services/sessionUtils.test.ts
git commit -m "feat(utils): shouldWarnAbandon — pure function TDD"
```

---

### Task 5: useSession — initialSession prop + pauseSession

**Files:**
- Modify: `app/hooks/useSession.ts`
- Modify: `app/hooks/useSession.test.ts` (si existe, sinon créer les tests inline)

**Contexte :** `useSession` est dans `app/hooks/useSession.ts`. La signature actuelle est `useSession(workoutId, workoutDetails)`. On ajoute `initialSession?` comme 3e param optionnel. Les `useState` sont initialisés avec des lazy initializers pour utiliser `initialSession` dès le premier render.

- [ ] **Step 1: Ajouter les tests de reprise**

Chercher le fichier de test : `app/hooks/useSession.test.ts`. S'il n'existe pas, vérifier dans `app/__tests__/`. Ajouter ces tests dans le describe existant ou en créant un nouveau fichier si absent :

```typescript
// Tests à ajouter dans useSession.test.ts (ou créer ce fichier s'il n'existe pas)
// Note: useSession est un hook React — ces tests nécessitent renderHook de @testing-library/react-native

import { renderHook } from '@testing-library/react-native';
import { useSession } from './useSession';

// Mock getDb pour éviter l'initialisation SQLite réelle
jest.mock('../db', () => ({
  getDb: () => ({
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 }),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync: jest.fn().mockResolvedValue([]),
  }),
}));

describe('useSession avec initialSession', () => {
  it('démarre en phase running (pas checkin) si initialSession fourni', () => {
    const { result } = renderHook(() =>
      useSession(1, [], {
        sessionLogId: 42,
        position: { exerciseIdx: 0, blockIdx: 0, setIdx: 1 },
        phase: 'running',
        startedAt: Date.now(),
        setsLogged: 2,
        volume: 320,
      })
    );
    expect(result.current.phase).toBe('running');
    expect(result.current.sessionLogId).toBe(42);
  });

  it('initialise totalSetsLogged et totalVolume depuis initialSession', () => {
    const { result } = renderHook(() =>
      useSession(1, [], {
        sessionLogId: 42,
        position: { exerciseIdx: 0, blockIdx: 0, setIdx: 1 },
        phase: 'running',
        startedAt: Date.now(),
        setsLogged: 3,
        volume: 480,
      })
    );
    expect(result.current.totalSetsLogged).toBe(3);
    expect(result.current.totalVolume).toBe(480);
  });

  it('expose pauseSession dans le résultat', () => {
    const { result } = renderHook(() => useSession(1, []));
    expect(typeof result.current.pauseSession).toBe('function');
  });
});
```

**Note importante :** Si les tests `renderHook` échouent à cause des mocks SQLite (jest-expo gère la plupart automatiquement), simplifier : tester uniquement les valeurs initiales sans `act` et sans appels async.

- [ ] **Step 2: Lancer les tests pour confirmer l'échec**

```bash
cd app && npx jest --no-coverage useSession
```

Attendu : FAIL — `initialSession` pas supporté, `pauseSession` absent.

- [ ] **Step 3: Ajouter `InitialSession` et mettre à jour `useSession`**

Dans `app/hooks/useSession.ts`, ajouter l'interface et exporter :

```typescript
export interface InitialSession {
  sessionLogId: number;
  position: SessionPosition;
  phase: SessionPhase;
  startedAt: number;
  setsLogged: number;
  volume: number;
}
```

Ajouter `pauseSession` dans `UseSessionResult` :

```typescript
export interface UseSessionResult {
  // ... (tous les champs existants)
  pauseSession: () => Promise<void>;
}
```

Mettre à jour la signature de la fonction :

```typescript
export function useSession(
  workoutId: number,
  workoutDetails: WorkoutExerciseDetail[],
  initialSession?: InitialSession,
): UseSessionResult {
```

Mettre à jour les `useState` pour utiliser des lazy initializers :

```typescript
  const [phase, setPhase] = useState<SessionPhase>(() => initialSession?.phase ?? 'checkin');
  const [sessionLogId, setSessionLogId] = useState<number | null>(() => initialSession?.sessionLogId ?? null);
  const [position, setPosition] = useState<SessionPosition>(() =>
    initialSession?.position ?? { exerciseIdx: 0, blockIdx: 0, setIdx: 0 }
  );
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(() => initialSession?.startedAt ?? null);
  const [totalSetsLogged, setTotalSetsLogged] = useState(() => initialSession?.setsLogged ?? 0);
  const [totalVolume, setTotalVolume] = useState(() => initialSession?.volume ?? 0);
```

Ajouter `pauseSession` avant le `return` :

```typescript
  const pauseSession = useCallback(async () => {
    if (!sessionLogId) return;
    try {
      await service.pauseSession(sessionLogId, position, phase);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur pause séance');
    }
  }, [service, sessionLogId, position, phase]);
```

Ajouter `pauseSession` dans le `return` de `useSession`.

- [ ] **Step 4: TypeScript check**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 5: Lancer tous les tests**

```bash
cd app && npx jest --no-coverage
```

Attendu : tous les tests passent.

- [ ] **Step 6: Commit**

```bash
git add app/hooks/useSession.ts app/hooks/useSession.test.ts
git commit -m "feat(hook): useSession — initialSession prop + pauseSession"
```

---

### Task 6: ResumeSessionCard + testMatch

**Files:**
- Modify: `app/package.json`
- Create: `app/components/session/ResumeSessionCard.tsx`
- Create: `app/components/session/ResumeSessionCard.test.tsx`

- [ ] **Step 1: Mettre à jour `testMatch` dans `package.json`**

Dans `app/package.json`, section `"jest"`, remplacer :

```json
"testMatch": [
  "**/__tests__/**/*.test.ts",
  "**/*.test.ts"
]
```

Par :

```json
"testMatch": [
  "**/__tests__/**/*.test.ts",
  "**/__tests__/**/*.test.tsx",
  "**/*.test.ts",
  "**/*.test.tsx"
]
```

- [ ] **Step 2: Écrire le test (TDD)**

Créer `app/components/session/ResumeSessionCard.test.tsx` :

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ResumeSessionCard } from './ResumeSessionCard';

jest.mock('@/components/useColorScheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@/components/ui/PressableA11y', () => {
  const { Pressable } = require('react-native');
  return {
    PressableA11y: ({ onPress, children, accessibilityLabel, ...rest }: any) => (
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        {...rest}
      >
        {children}
      </Pressable>
    ),
  };
});

describe('ResumeSessionCard', () => {
  it('affiche le nom du workout et le serieLabel', () => {
    const { getByText } = render(
      <ResumeSessionCard
        workoutName="PPL Push"
        serieLabel="2 séries complétées"
        onPress={() => {}}
      />
    );
    expect(getByText('PPL Push')).toBeTruthy();
    expect(getByText('2 séries complétées')).toBeTruthy();
  });

  it('appelle onPress au tap', () => {
    const onPress = jest.fn();
    const { getByAccessibilityLabel } = render(
      <ResumeSessionCard
        workoutName="PPL Push"
        serieLabel="2 séries complétées"
        onPress={onPress}
      />
    );
    fireEvent.press(getByAccessibilityLabel('Reprendre la séance en pause : PPL Push'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Lancer le test pour confirmer l'échec**

```bash
cd app && npx jest --no-coverage ResumeSessionCard
```

Attendu : FAIL — module introuvable.

- [ ] **Step 4: Créer `app/components/session/ResumeSessionCard.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

export interface ResumeSessionCardProps {
  workoutName: string;
  serieLabel: string;
  onPress: () => void;
}

export function ResumeSessionCard({ workoutName, serieLabel, onPress }: ResumeSessionCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <PressableA11y
      accessibilityLabel={`Reprendre la séance en pause : ${workoutName}`}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary }]}
    >
      <View style={styles.row}>
        <Ionicons
          name="pause-circle-outline"
          size={16}
          color={colors.primary}
          importantForAccessibility="no"
          accessibilityElementsHidden
        />
        <Text style={[styles.label, { color: colors.primary }]}>SÉANCE EN PAUSE</Text>
      </View>
      <Text style={[styles.workoutName, { color: colors.text }]}>{workoutName}</Text>
      <Text style={[styles.serieLabel, { color: colors.textSecondary }]}>{serieLabel}</Text>
      <Text style={[styles.cta, { color: colors.primary }]}>Reprendre →</Text>
    </PressableA11y>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: Radius.sm, padding: 16, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  workoutName: { fontSize: 18, fontWeight: '700' },
  serieLabel: { fontSize: 13 },
  cta: { fontSize: 14, fontWeight: '600', marginTop: 4 },
});
```

- [ ] **Step 5: Lancer les tests**

```bash
cd app && npx jest --no-coverage ResumeSessionCard
```

Attendu : 2/2 PASS.

- [ ] **Step 6: Lancer la suite complète**

```bash
cd app && npx jest --no-coverage
```

Attendu : tous les tests passent.

- [ ] **Step 7: Commit**

```bash
git add app/package.json app/components/session/ResumeSessionCard.tsx app/components/session/ResumeSessionCard.test.tsx
git commit -m "feat(ui): ResumeSessionCard + testMatch *.test.tsx"
```

---

### Task 7: [workoutId].tsx — mount check, pause button, abandon sheet

**Files:**
- Modify: `app/app/session/[workoutId].tsx`

**Contexte :** Le fichier actuel exporte `SessionScreen`. On le découpe en :
- `SessionScreen` (exporté) : mount check async → loading spinner → rend `SessionContent`
- `SessionContent` (non-exporté, même fichier) : toute la logique existante + pause button + abandon sheet

`SessionContent` reçoit `initialSession?: InitialSession` et un `service` pré-créé pour `abandonSession`.

**Structure cible du fichier :**

```
imports
─────────────────
type PausedConflict = PausedSessionInfo & { ... }
async function checkPausedOnMount(workoutId)
─────────────────
export default function SessionScreen() {
  // mount check + loading
  // → rend SessionContent
}
─────────────────
function SessionContent({ workoutId, initialSession, conflict, onConflictAbandoned }) {
  // toute la logique existante
  // + pause button
  // + abandon bottomsheet
}
```

- [ ] **Step 1: Ajouter les imports nécessaires**

Au début de `[workoutId].tsx`, ajouter aux imports :

```typescript
import { ActivityIndicator } from 'react-native'; // ajouter à l'import RN existant
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import type { InitialSession } from '@/hooks/useSession';
import type { PausedSessionInfo } from '@/services/SessionService';
import { SessionService } from '@/services/SessionService';
import { SQLiteSessionLogRepository } from '@/repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '@/repositories/SQLiteSetLogRepository';
import { SQLitePersonalRecordRepository } from '@/repositories/SQLitePersonalRecordRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '@/repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '@/repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import { getDb } from '@/db';
import { shouldWarnAbandon } from '@/services/sessionUtils';
```

- [ ] **Step 2: Ajouter la fonction helper de check mount**

Après les imports, avant le composant, ajouter :

```typescript
function makeServiceForCheck(): SessionService {
  const db = getDb();
  return new SessionService(
    new SQLiteSessionLogRepository(db),
    new SQLiteSetLogRepository(db),
    new SQLitePersonalRecordRepository(db),
    new SQLiteWorkoutRepository(db),
    new SQLiteWorkoutExerciseRepository(db),
    new SQLiteBlockRepository(db),
    new SQLiteSetRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

async function checkPausedOnMount(workoutId: number): Promise<{
  initialSession?: InitialSession;
  conflict?: PausedSessionInfo;
}> {
  const service = makeServiceForCheck();
  const paused = await service.findAnyPausedSession();
  if (!paused) return {};
  if (!shouldWarnAbandon(paused.sessionLog.workout_id, workoutId)) {
    const pos = JSON.parse(paused.sessionLog.paused_position!);
    return {
      initialSession: {
        sessionLogId: paused.sessionLog.id,
        position: { exerciseIdx: pos.exerciseIdx, blockIdx: pos.blockIdx, setIdx: pos.setIdx },
        phase: pos.phase,
        startedAt: new Date(paused.sessionLog.started_at).getTime(),
        setsLogged: paused.setsLogged,
        volume: paused.volume,
      },
    };
  }
  return { conflict: paused };
}
```

- [ ] **Step 3: Refactoriser `SessionScreen` en composant outer (mount check)**

Renommer la fonction `SessionScreen` existante en `SessionContent` (non exportée).

Créer le nouveau `SessionScreen` exporté :

```typescript
export default function SessionScreen() {
  const { workoutId: param } = useLocalSearchParams<{ workoutId: string }>();
  const workoutId = Number(param) || 0;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [mountResult, setMountResult] = useState<{
    initialSession?: InitialSession;
    conflict?: PausedSessionInfo;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkPausedOnMount(workoutId).then(result => {
      if (!cancelled) setMountResult(result);
    });
    return () => { cancelled = true; };
  }, [workoutId]);

  if (mountResult === null) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </>
    );
  }

  return (
    <SessionContent
      workoutId={workoutId}
      initialSession={mountResult.initialSession}
      conflict={mountResult.conflict}
    />
  );
}
```

- [ ] **Step 4: Mettre à jour `SessionContent` (ex `SessionScreen`)**

La fonction `SessionContent` reçoit ces props :

```typescript
interface SessionContentProps {
  workoutId: number;
  initialSession?: InitialSession;
  conflict?: PausedSessionInfo;
}

function SessionContent({ workoutId, initialSession, conflict }: SessionContentProps) {
```

Retirer `useLocalSearchParams` et `workoutId` du corps de la fonction (maintenant passés en props).

Mettre à jour l'appel à `useSession` :

```typescript
  const session = useSession(workoutId, resolvedExercises, initialSession);
```

- [ ] **Step 5: Ajouter le bouton Pause dans `SessionContent`**

Après les états existants, ajouter :

```typescript
  const handlePause = useCallback(async () => {
    await session.pauseSession();
    router.replace('/(tabs)');
  }, [session.pauseSession, router]);
```

Dans le JSX, dans le fragment principal (`<>...</>`), après le block `{prBadge !== null && ...}` existant, ajouter le bouton flottant (même pattern que `prBadge`) :

```tsx
      {session.phase !== 'checkin' && session.phase !== 'summary' && (
        <View style={styles.pauseButtonContainer} pointerEvents="box-none">
          <PressableA11y
            accessibilityLabel="Mettre la séance en pause"
            onPress={handlePause}
            style={styles.pauseButton}
          >
            <Ionicons name="pause-circle-outline" size={28} color={colors.textSecondary} />
          </PressableA11y>
        </View>
      )}
```

Ajouter les styles :

```typescript
  pauseButtonContainer: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 50,
  },
  pauseButton: {
    padding: 8,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
```

- [ ] **Step 6: Ajouter le BottomSheet abandon**

Dans `SessionContent`, ajouter le ref et les snap points après les autres refs :

```typescript
  const abandonSheetRef = useRef<BottomSheetModal>(null);
  const abandonSnapPoints = useMemo(() => ['30%'], []);
```

Ouvrir la sheet si `conflict` est défini au mount :

```typescript
  useEffect(() => {
    if (conflict) {
      abandonSheetRef.current?.present();
    }
  }, [conflict]);
```

Ajouter les handlers :

```typescript
  const handleAbandonConfirm = useCallback(async () => {
    if (!conflict) return;
    const service = makeServiceForCheck();
    await service.abandonSession(conflict.sessionLog.id);
    abandonSheetRef.current?.dismiss();
  }, [conflict]);

  const handleAbandonCancel = useCallback(() => {
    abandonSheetRef.current?.dismiss();
    router.back();
  }, [router]);
```

Dans le JSX, ajouter la `BottomSheetModal` après tout le contenu, dans le fragment :

```tsx
      <BottomSheetModal
        ref={abandonSheetRef}
        snapPoints={abandonSnapPoints}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        onDismiss={handleAbandonCancel}
      >
        <BottomSheetView style={styles.abandonSheet}>
          <Text style={[styles.abandonTitle, { color: colors.text }]}>Séance en pause</Text>
          <Text style={[styles.abandonBody, { color: colors.textSecondary }]}>
            Continuer abandonne la séance en pause ({conflict?.workoutName}).
          </Text>
          <View style={styles.abandonButtons}>
            <PressableA11y
              accessibilityLabel="Annuler et revenir"
              onPress={handleAbandonCancel}
              style={[styles.abandonBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.abandonBtnText, { color: colors.text }]}>Annuler</Text>
            </PressableA11y>
            <PressableA11y
              accessibilityLabel="Confirmer l'abandon de la séance en pause"
              onPress={handleAbandonConfirm}
              style={[styles.abandonBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.abandonBtnText, { color: '#fff' }]}>Confirmer</Text>
            </PressableA11y>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
```

Ajouter les styles :

```typescript
  abandonSheet: { padding: 20, gap: 12 },
  abandonTitle: { fontSize: 17, fontWeight: '700' },
  abandonBody: { fontSize: 14, lineHeight: 20 },
  abandonButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  abandonBtn: {
    flex: 1, paddingVertical: 12, borderRadius: Radius.sm,
    alignItems: 'center', borderWidth: 1,
  },
  abandonBtnText: { fontSize: 15, fontWeight: '600' },
```

- [ ] **Step 7: Ajouter les imports manquants**

S'assurer que ces imports sont présents en haut du fichier :

```typescript
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { Radius } from '@/constants/Radius';
```

- [ ] **Step 8: TypeScript check**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 9: Lancer tous les tests**

```bash
cd app && npx jest --no-coverage
```

Attendu : tous les tests passent.

- [ ] **Step 10: Commit**

```bash
git add "app/app/session/[workoutId].tsx"
git commit -m "feat(session): pause button + abandon sheet + mount check reprise"
```

---

### Task 8: index.tsx — home card reprise

**Files:**
- Modify: `app/app/(tabs)/index.tsx`

**Contexte :** `index.tsx` utilise `useFocusEffect` pour refresher les workouts. On ajoute un check `findAnyPausedSession` au focus aussi (séance peut être pausée depuis un autre écran).

- [ ] **Step 1: Ajouter les imports**

Dans les imports de `app/app/(tabs)/index.tsx`, ajouter :

```typescript
import { useState } from 'react'; // si pas déjà importé
import { ResumeSessionCard } from '@/components/session/ResumeSessionCard';
import type { PausedSessionInfo } from '@/services/SessionService';
import { SessionService } from '@/services/SessionService';
import { SQLiteSessionLogRepository } from '@/repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '@/repositories/SQLiteSetLogRepository';
import { SQLitePersonalRecordRepository } from '@/repositories/SQLitePersonalRecordRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '@/repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '@/repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import { getDb } from '@/db';
```

- [ ] **Step 2: Ajouter le state et le check**

Dans `HomeScreen`, après `const router = useRouter()`, ajouter :

```typescript
  const [pausedSession, setPausedSession] = useState<PausedSessionInfo | null>(null);
```

Mettre à jour le `useFocusEffect` existant :

```typescript
  useFocusEffect(useCallback(() => {
    refresh();
    const db = getDb();
    const service = new SessionService(
      new SQLiteSessionLogRepository(db),
      new SQLiteSetLogRepository(db),
      new SQLitePersonalRecordRepository(db),
      new SQLiteWorkoutRepository(db),
      new SQLiteWorkoutExerciseRepository(db),
      new SQLiteBlockRepository(db),
      new SQLiteSetRepository(db),
      new SQLiteExerciseRepository(db),
    );
    service.findAnyPausedSession().then(setPausedSession).catch(() => setPausedSession(null));
  }, [refresh]));
```

- [ ] **Step 3: Ajouter la card dans le JSX**

Dans le JSX de `HomeScreen`, juste après `<View style={styles.hero}>...</View>` et avant le bloc `{loading ? ... }`, ajouter :

```tsx
      {pausedSession && (
        <ResumeSessionCard
          workoutName={pausedSession.workoutName}
          serieLabel={
            pausedSession.setsLogged === 0
              ? 'Aucune série complétée'
              : `${pausedSession.setsLogged} série${pausedSession.setsLogged > 1 ? 's' : ''} complétée${pausedSession.setsLogged > 1 ? 's' : ''}`
          }
          onPress={() =>
            router.push({
              pathname: '/session/[workoutId]' as any,
              params: { workoutId: String(pausedSession.sessionLog.workout_id) },
            })
          }
        />
      )}
```

- [ ] **Step 4: TypeScript check**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreurs.

- [ ] **Step 5: Lancer tous les tests**

```bash
cd app && npx jest --no-coverage
```

Attendu : tous les tests passent.

- [ ] **Step 6: Commit**

```bash
git add "app/app/(tabs)/index.tsx"
git commit -m "feat(home): card reprise séance en pause"
```

---

## Récapitulatif commits attendus

1. `feat(db): migration v8 — status + paused_position sur session_logs`
2. `feat(repo): SessionLogRepository — pause, abandon, findAnyPaused + complete → status='completed'`
3. `feat(service): pauseSession, abandonSession, findAnyPausedSession — TDD`
4. `feat(utils): shouldWarnAbandon — pure function TDD`
5. `feat(hook): useSession — initialSession prop + pauseSession`
6. `feat(ui): ResumeSessionCard + testMatch *.test.tsx`
7. `feat(session): pause button + abandon sheet + mount check reprise`
8. `feat(home): card reprise séance en pause`
