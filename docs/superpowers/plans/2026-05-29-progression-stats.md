# Progression Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un dashboard "Stats" dans l'onglet Progression : 3 chips globales, volume par semaine ISO, PRs récents, liste 1RM par exercice, et un écran détail par exercice avec graphique d'évolution.

**Architecture:** Repository pattern existant étendu avec nouvelles méthodes de requête. `ProgressionService` encapsule toute la logique métier (Epley, ISO weeks, delta 30j). `useProgression` hook charge tout en parallèle via `Promise.all`. `progression.tsx` gagne un segmented control sticky `Historique | Stats` sans swipe.

**Tech Stack:** React Native + Expo SDK 54 + expo-sqlite + TypeScript strict + react-native-gifted-charts + expo-linear-gradient + react-native-svg

---

## File Map

**Créés :**
- `app/services/ProgressionService.ts` — service métier (Epley, volume ISO, delta 30j)
- `app/services/ProgressionService.test.ts` — 14 cas de test
- `app/hooks/useProgression.ts` — hook (Promise.all, mountedRef, refresh)
- `app/components/progression/VolumeBarChart.tsx` — bar chart 4 semaines
- `app/components/progression/Exercise1RMCard.tsx` — ligne liste 1RM
- `app/app/progression/[exerciseId].tsx` — écran détail exercice

**Modifiés :**
- `app/repositories/ISetLogRepository.ts` — +3 méthodes
- `app/repositories/InMemorySetLogRepository.ts` — +3 méthodes
- `app/repositories/setLogRepository.contract.ts` — +3 describe
- `app/repositories/IPersonalRecordRepository.ts` — +2 méthodes
- `app/repositories/InMemoryPersonalRecordRepository.ts` — +2 méthodes
- `app/repositories/personalRecordRepository.contract.ts` — +2 describe
- `app/repositories/SQLiteSetLogRepository.ts` — +3 méthodes
- `app/repositories/SQLitePersonalRecordRepository.ts` — +2 méthodes
- `app/app/(tabs)/progression.tsx` — segmented control + Stats view
- `app/app/_layout.tsx` — enregistrer `progression/[exerciseId]`
- `docs/tests-manuels-mvp.md` — section 11
- `README.md` — fonctionnalités implémentées

---

## Task 1: Installation des librairies graphiques

**Files:**
- Modify: `app/package.json` (via expo install)

- [ ] **Step 1: Installer les librairies**

```bash
cd app
npx expo install react-native-gifted-charts expo-linear-gradient react-native-svg
```

Expected output: packages added to `node_modules`, `package.json` mis à jour.

- [ ] **Step 2: Vérifier les types TypeScript**

```bash
cd app
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/package.json app/package-lock.json
git commit -m "chore: install react-native-gifted-charts, expo-linear-gradient, react-native-svg"
```

---

## Task 2: ISetLogRepository — extensions (interface + InMemory + contrats)

**Files:**
- Modify: `app/repositories/ISetLogRepository.ts`
- Modify: `app/repositories/setLogRepository.contract.ts`
- Modify: `app/repositories/InMemorySetLogRepository.ts`
- Test: `app/repositories/InMemorySetLogRepository.test.ts` (existant — pas modifié, utilise le contrat)

- [ ] **Step 1: Ajouter les 3 méthodes à l'interface**

Remplacer le contenu de `app/repositories/ISetLogRepository.ts` :

```typescript
import type { SetLog } from '../db/types';

export type CreateSetLogDto = Omit<SetLog, 'id'>;

export interface ISetLogRepository {
  save(dto: CreateSetLogDto): Promise<SetLog>;
  findBySessionLogId(sessionLogId: number): Promise<SetLog[]>;
  findBySetId(setId: number): Promise<SetLog[]>;
  countBySessionLogIds(ids: number[]): Promise<Record<number, number>>;
  findByExerciseId(exerciseId: number): Promise<SetLog[]>;
  findFromDate(from: string): Promise<SetLog[]>;
  findDistinctExerciseIds(): Promise<number[]>;
}
```

- [ ] **Step 2: Ajouter les tests de contrat**

Ajouter à la fin de `app/repositories/setLogRepository.contract.ts`, avant la dernière `}` de la fonction `runSetLogRepositoryContractTests` :

```typescript
  describe('findByExerciseId', () => {
    it('retourne [] si aucun log', async () => {
      expect(await repo.findByExerciseId(5)).toHaveLength(0);
    });
    it('retourne seulement les logs de cet exercice', async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, exercise_id: 7, set_id: 11, completed_at: '2026-01-01T10:06:00.000Z' });
      expect(await repo.findByExerciseId(5)).toHaveLength(1);
    });
    it('retourne les logs triés par completed_at ASC', async () => {
      await repo.save({ ...dto1, completed_at: '2026-01-02T10:05:00.000Z' });
      await repo.save({ ...dto1, set_id: 11, completed_at: '2026-01-01T10:05:00.000Z' });
      const logs = await repo.findByExerciseId(5);
      expect(logs[0].completed_at).toBe('2026-01-01T10:05:00.000Z');
    });
  });

  describe('findFromDate', () => {
    it('retourne [] si aucun log', async () => {
      expect(await repo.findFromDate('2026-01-01T00:00:00.000Z')).toHaveLength(0);
    });
    it('exclut les logs antérieurs à from', async () => {
      await repo.save({ ...dto1, completed_at: '2025-12-31T10:05:00.000Z' });
      await repo.save({ ...dto1, set_id: 11, completed_at: '2026-01-01T10:05:00.000Z' });
      const logs = await repo.findFromDate('2026-01-01T00:00:00.000Z');
      expect(logs).toHaveLength(1);
      expect(logs[0].completed_at).toBe('2026-01-01T10:05:00.000Z');
    });
    it('inclut les logs exactement à from', async () => {
      await repo.save({ ...dto1, completed_at: '2026-01-01T00:00:00.000Z' });
      expect(await repo.findFromDate('2026-01-01T00:00:00.000Z')).toHaveLength(1);
    });
  });

  describe('findDistinctExerciseIds', () => {
    it('retourne [] si aucun log', async () => {
      expect(await repo.findDistinctExerciseIds()).toHaveLength(0);
    });
    it('pas de doublons', async () => {
      await repo.save({ ...dto1, exercise_id: 5 });
      await repo.save({ ...dto1, set_id: 11, exercise_id: 5, completed_at: '2026-01-01T10:06:00.000Z' });
      await repo.save({ ...dto1, set_id: 12, exercise_id: 7, completed_at: '2026-01-01T10:07:00.000Z' });
      const ids = await repo.findDistinctExerciseIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain(5);
      expect(ids).toContain(7);
    });
  });
```

- [ ] **Step 3: Lancer les tests — ils doivent échouer**

```bash
cd app && npx jest repositories/InMemorySetLogRepository --no-coverage
```

Expected: FAIL — `findByExerciseId is not a function` (ou similaire).

- [ ] **Step 4: Implémenter les 3 méthodes dans InMemorySetLogRepository**

Ajouter à la fin de la classe dans `app/repositories/InMemorySetLogRepository.ts` :

```typescript
  async findByExerciseId(exerciseId: number): Promise<SetLog[]> {
    return this.items
      .filter(i => i.exercise_id === exerciseId)
      .sort((a, b) => a.completed_at.localeCompare(b.completed_at));
  }

  async findFromDate(from: string): Promise<SetLog[]> {
    return this.items
      .filter(i => i.completed_at >= from)
      .sort((a, b) => a.completed_at.localeCompare(b.completed_at));
  }

  async findDistinctExerciseIds(): Promise<number[]> {
    return [...new Set(this.items.map(i => i.exercise_id))];
  }
```

- [ ] **Step 5: Lancer les tests — ils doivent passer**

```bash
cd app && npx jest repositories/InMemorySetLogRepository --no-coverage
```

Expected: PASS — tous les tests verts.

- [ ] **Step 6: Commit**

```bash
git add app/repositories/ISetLogRepository.ts app/repositories/InMemorySetLogRepository.ts app/repositories/setLogRepository.contract.ts
git commit -m "feat(repo): ISetLogRepository — findByExerciseId, findFromDate, findDistinctExerciseIds"
```

---

## Task 3: IPersonalRecordRepository — extensions (interface + InMemory + contrats)

**Files:**
- Modify: `app/repositories/IPersonalRecordRepository.ts`
- Modify: `app/repositories/personalRecordRepository.contract.ts`
- Modify: `app/repositories/InMemoryPersonalRecordRepository.ts`
- Test: `app/repositories/InMemoryPersonalRecordRepository.test.ts` (existant)

- [ ] **Step 1: Ajouter les 2 méthodes à l'interface**

Remplacer le contenu de `app/repositories/IPersonalRecordRepository.ts` :

```typescript
import type { PersonalRecord } from '../db/types';

export type CreatePersonalRecordDto = Omit<PersonalRecord, 'id'>;

export interface IPersonalRecordRepository {
  save(dto: CreatePersonalRecordDto): Promise<PersonalRecord>;
  findBestByExerciseId(exerciseId: number): Promise<PersonalRecord | null>;
  findAllByExerciseId(exerciseId: number): Promise<PersonalRecord[]>;
  findRecent(limit: number): Promise<PersonalRecord[]>;
}
```

- [ ] **Step 2: Ajouter les tests de contrat**

Ajouter à la fin de `app/repositories/personalRecordRepository.contract.ts`, avant la dernière `}` de la fonction `runPersonalRecordRepositoryContractTests` :

```typescript
  describe('findAllByExerciseId', () => {
    it('retourne [] si aucun PR', async () => {
      expect(await repo.findAllByExerciseId(1)).toHaveLength(0);
    });
    it('retourne seulement les PRs de cet exercice', async () => {
      await repo.save(dto1);
      await repo.save({ ...dto1, exercise_id: 2, achieved_at: '2026-01-02T10:00:00.000Z' });
      expect(await repo.findAllByExerciseId(1)).toHaveLength(1);
    });
    it('retourne les PRs triés par achieved_at DESC', async () => {
      await repo.save({ ...dto1, achieved_at: '2026-01-01T10:00:00.000Z' });
      await repo.save({ ...dto1, achieved_at: '2026-02-01T10:00:00.000Z' });
      const prs = await repo.findAllByExerciseId(1);
      expect(prs[0].achieved_at).toBe('2026-02-01T10:00:00.000Z');
    });
  });

  describe('findRecent', () => {
    it('retourne [] si aucun PR', async () => {
      expect(await repo.findRecent(5)).toHaveLength(0);
    });
    it('respecte la limite', async () => {
      await repo.save({ ...dto1, achieved_at: '2026-01-01T10:00:00.000Z' });
      await repo.save({ ...dto1, exercise_id: 2, achieved_at: '2026-02-01T10:00:00.000Z' });
      await repo.save({ ...dto1, exercise_id: 3, achieved_at: '2026-03-01T10:00:00.000Z' });
      expect(await repo.findRecent(2)).toHaveLength(2);
    });
    it('retourne les PRs triés par achieved_at DESC', async () => {
      await repo.save({ ...dto1, achieved_at: '2026-01-01T10:00:00.000Z' });
      await repo.save({ ...dto1, exercise_id: 2, achieved_at: '2026-03-01T10:00:00.000Z' });
      const prs = await repo.findRecent(5);
      expect(prs[0].achieved_at).toBe('2026-03-01T10:00:00.000Z');
    });
  });
```

- [ ] **Step 3: Lancer les tests — ils doivent échouer**

```bash
cd app && npx jest repositories/InMemoryPersonalRecordRepository --no-coverage
```

Expected: FAIL.

- [ ] **Step 4: Implémenter les 2 méthodes dans InMemoryPersonalRecordRepository**

Ajouter à la fin de la classe dans `app/repositories/InMemoryPersonalRecordRepository.ts` :

```typescript
  async findAllByExerciseId(exerciseId: number): Promise<PersonalRecord[]> {
    return this.items
      .filter(i => i.exercise_id === exerciseId)
      .sort((a, b) => b.achieved_at.localeCompare(a.achieved_at));
  }

  async findRecent(limit: number): Promise<PersonalRecord[]> {
    return [...this.items]
      .sort((a, b) => b.achieved_at.localeCompare(a.achieved_at))
      .slice(0, limit);
  }
```

- [ ] **Step 5: Lancer les tests — ils doivent passer**

```bash
cd app && npx jest repositories/InMemoryPersonalRecordRepository --no-coverage
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/repositories/IPersonalRecordRepository.ts app/repositories/InMemoryPersonalRecordRepository.ts app/repositories/personalRecordRepository.contract.ts
git commit -m "feat(repo): IPersonalRecordRepository — findAllByExerciseId, findRecent"
```

---

## Task 4: SQLite — implémenter les nouvelles méthodes

**Files:**
- Modify: `app/repositories/SQLiteSetLogRepository.ts`
- Modify: `app/repositories/SQLitePersonalRecordRepository.ts`

Pas de tests automatisés pour SQLite (besoin d'une vraie DB). TypeScript vérifie la complétude.

- [ ] **Step 1: Ajouter les 3 méthodes dans SQLiteSetLogRepository**

Ajouter dans la classe `SQLiteSetLogRepository` de `app/repositories/SQLiteSetLogRepository.ts` :

```typescript
  async findByExerciseId(exerciseId: number): Promise<SetLog[]> {
    return this.db.getAllAsync<SetLog>(
      'SELECT * FROM set_logs WHERE exercise_id = ? ORDER BY completed_at ASC',
      [exerciseId]
    );
  }

  async findFromDate(from: string): Promise<SetLog[]> {
    return this.db.getAllAsync<SetLog>(
      'SELECT * FROM set_logs WHERE completed_at >= ? ORDER BY completed_at ASC',
      [from]
    );
  }

  async findDistinctExerciseIds(): Promise<number[]> {
    const rows = await this.db.getAllAsync<{ exercise_id: number }>(
      'SELECT DISTINCT exercise_id FROM set_logs'
    );
    return rows.map(r => r.exercise_id);
  }
```

- [ ] **Step 2: Ajouter les 2 méthodes dans SQLitePersonalRecordRepository**

Ajouter dans la classe `SQLitePersonalRecordRepository` de `app/repositories/SQLitePersonalRecordRepository.ts` :

```typescript
  async findAllByExerciseId(exerciseId: number): Promise<PersonalRecord[]> {
    return this.db.getAllAsync<PersonalRecord>(
      'SELECT * FROM personal_records WHERE exercise_id = ? ORDER BY achieved_at DESC',
      [exerciseId]
    );
  }

  async findRecent(limit: number): Promise<PersonalRecord[]> {
    return this.db.getAllAsync<PersonalRecord>(
      'SELECT * FROM personal_records ORDER BY achieved_at DESC LIMIT ?',
      [limit]
    );
  }
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Lancer tous les tests**

```bash
cd app && npx jest --no-coverage
```

Expected: tous verts (203+ tests).

- [ ] **Step 5: Commit**

```bash
git add app/repositories/SQLiteSetLogRepository.ts app/repositories/SQLitePersonalRecordRepository.ts
git commit -m "feat(repo): SQLite — findByExerciseId, findFromDate, findDistinctExerciseIds, findAllByExerciseId, findRecent"
```

---

## Task 5: ProgressionService — service + tests

**Files:**
- Create: `app/services/ProgressionService.ts`
- Create: `app/services/ProgressionService.test.ts`

- [ ] **Step 1: Créer le fichier de test vide avec le premier cas (Red)**

Créer `app/services/ProgressionService.test.ts` :

```typescript
import { InMemorySessionLogRepository } from '../repositories/InMemorySessionLogRepository';
import { InMemorySetLogRepository } from '../repositories/InMemorySetLogRepository';
import { InMemoryPersonalRecordRepository } from '../repositories/InMemoryPersonalRecordRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';
import { ProgressionService } from './ProgressionService';

function makeService() {
  const sessionLogRepo = new InMemorySessionLogRepository();
  const setLogRepo = new InMemorySetLogRepository();
  const personalRecordRepo = new InMemoryPersonalRecordRepository();
  const exerciseRepo = new InMemoryExerciseRepository();
  const service = new ProgressionService(sessionLogRepo, setLogRepo, personalRecordRepo, exerciseRepo);
  return { service, sessionLogRepo, setLogRepo, personalRecordRepo, exerciseRepo };
}

const NOW = new Date('2026-05-29T12:00:00.000Z');

const baseExerciseDto = {
  name: 'Squat',
  type: 'musculation' as const,
  muscle_groups: '[]',
  technical_notes: null,
  is_custom: 0 as const,
  progression_step: 2.5,
  progression_threshold: 1,
};

const baseSessionDto = {
  workout_id: 1,
  started_at: '2026-05-01T10:00:00.000Z',
  checkin_energy: null,
  checkin_fatigue: null,
  checkin_sleep: null,
  notes: null,
};

describe('ProgressionService', () => {
  describe('getDashboardStats', () => {
    it('retourne 0 séances ce mois si aucune session', async () => {
      const { service } = makeService();
      const stats = await service.getDashboardStats(NOW);
      expect(stats.sessionCount).toBe(0);
    });

    it('compte les séances du mois courant uniquement', async () => {
      const { service, sessionLogRepo } = makeService();
      await sessionLogRepo.save({ ...baseSessionDto, started_at: '2026-05-10T10:00:00.000Z' });
      await sessionLogRepo.save({ ...baseSessionDto, started_at: '2026-05-15T10:00:00.000Z' });
      await sessionLogRepo.save({ ...baseSessionDto, started_at: '2026-04-10T10:00:00.000Z' });
      const stats = await service.getDashboardStats(NOW);
      expect(stats.sessionCount).toBe(2);
    });

    it('compte les PRs du mois courant uniquement', async () => {
      const { service, personalRecordRepo } = makeService();
      await personalRecordRepo.save({ exercise_id: 1, weight: 100, reps: 5, estimated_1rm: 116.7, achieved_at: '2026-05-10T10:00:00.000Z', session_log_id: null });
      await personalRecordRepo.save({ exercise_id: 1, weight: 105, reps: 5, estimated_1rm: 122.5, achieved_at: '2026-04-01T10:00:00.000Z', session_log_id: null });
      const stats = await service.getDashboardStats(NOW);
      expect(stats.prCount).toBe(1);
    });

    it('compte les exercices distincts loggés ce mois', async () => {
      const { service, setLogRepo } = makeService();
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: 5, reps_done: 8, weight_done: 80, rpe: null, completed_at: '2026-05-10T10:00:00.000Z' });
      await setLogRepo.save({ session_log_id: 1, set_id: 2, exercise_id: 5, reps_done: 8, weight_done: 80, rpe: null, completed_at: '2026-05-10T10:05:00.000Z' });
      await setLogRepo.save({ session_log_id: 1, set_id: 3, exercise_id: 7, reps_done: 8, weight_done: 60, rpe: null, completed_at: '2026-05-10T10:10:00.000Z' });
      await setLogRepo.save({ session_log_id: 2, set_id: 4, exercise_id: 9, reps_done: 8, weight_done: 100, rpe: null, completed_at: '2026-04-01T10:00:00.000Z' });
      const stats = await service.getDashboardStats(NOW);
      expect(stats.exerciseCount).toBe(2);
    });
  });

  describe('getVolumeByWeek', () => {
    it('retourne toujours 4 entrées même si vides', async () => {
      const { service } = makeService();
      const weeks = await service.getVolumeByWeek(NOW);
      expect(weeks).toHaveLength(4);
      expect(weeks[0].weekLabel).toBe('S-3');
      expect(weeks[3].weekLabel).toBe('Cette sem.');
    });

    it('calcule le volume Σ(reps × weight) par semaine ISO', async () => {
      const { service, setLogRepo } = makeService();
      // NOW = 2026-05-29 (vendredi) → lundi de cette semaine = 2026-05-25
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: 5, reps_done: 10, weight_done: 100, rpe: null, completed_at: '2026-05-26T10:00:00.000Z' });
      await setLogRepo.save({ session_log_id: 1, set_id: 2, exercise_id: 5, reps_done: 8, weight_done: 100, rpe: null, completed_at: '2026-05-26T10:05:00.000Z' });
      const weeks = await service.getVolumeByWeek(NOW);
      const thisSem = weeks.find(w => w.weekLabel === 'Cette sem.');
      expect(thisSem?.volume).toBe(1800); // (10+8) * 100
    });
  });

  describe('getRecentPRs', () => {
    it('retourne [] si aucun PR', async () => {
      const { service } = makeService();
      expect(await service.getRecentPRs(5)).toHaveLength(0);
    });

    it('retourne les N plus récents avec le nom de l exercice', async () => {
      const { service, personalRecordRepo, exerciseRepo } = makeService();
      const ex = await exerciseRepo.save(baseExerciseDto);
      await personalRecordRepo.save({ exercise_id: ex.id, weight: 100, reps: 5, estimated_1rm: 116.7, achieved_at: '2026-05-01T10:00:00.000Z', session_log_id: null });
      await personalRecordRepo.save({ exercise_id: ex.id, weight: 105, reps: 5, estimated_1rm: 122.5, achieved_at: '2026-05-15T10:00:00.000Z', session_log_id: null });
      const prs = await service.getRecentPRs(1);
      expect(prs).toHaveLength(1);
      expect(prs[0].exerciseName).toBe('Squat');
      expect(prs[0].weight).toBe(105);
    });
  });

  describe('getExercise1RMList', () => {
    it('retourne [] si aucun set_log', async () => {
      const { service } = makeService();
      expect(await service.getExercise1RMList(NOW)).toHaveLength(0);
    });

    it('calcule le 1RM Epley max par exercice', async () => {
      const { service, setLogRepo, exerciseRepo } = makeService();
      const ex = await exerciseRepo.save(baseExerciseDto);
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 100, rpe: null, completed_at: '2026-05-10T10:00:00.000Z' });
      await setLogRepo.save({ session_log_id: 1, set_id: 2, exercise_id: ex.id, reps_done: 3, weight_done: 110, rpe: null, completed_at: '2026-05-10T10:05:00.000Z' });
      const list = await service.getExercise1RMList(NOW);
      expect(list).toHaveLength(1);
      // Epley: 100*(1+5/30)=116.67, 110*(1+3/30)=121 → max = 121
      expect(list[0].current1RM).toBe(121);
    });

    it('delta null et "Depuis le début" si tous les logs < 30j', async () => {
      const { service, setLogRepo, exerciseRepo } = makeService();
      const ex = await exerciseRepo.save(baseExerciseDto);
      // NOW = 2026-05-29, log du 2026-05-10 → < 30j
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 100, rpe: null, completed_at: '2026-05-10T10:00:00.000Z' });
      const list = await service.getExercise1RMList(NOW);
      expect(list[0].delta).toBeNull();
      expect(list[0].deltaLabel).toBe('Depuis le début');
    });

    it('calcule le delta correct si des logs > 30j existent', async () => {
      const { service, setLogRepo, exerciseRepo } = makeService();
      const ex = await exerciseRepo.save(baseExerciseDto);
      // Log ancien (> 30j avant NOW=2026-05-29) : 2026-04-01
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: ex.id, reps_done: 5, weight_done: 100, rpe: null, completed_at: '2026-04-01T10:00:00.000Z' });
      // Log récent : 2026-05-10
      await setLogRepo.save({ session_log_id: 2, set_id: 2, exercise_id: ex.id, reps_done: 5, weight_done: 110, rpe: null, completed_at: '2026-05-10T10:00:00.000Z' });
      const list = await service.getExercise1RMList(NOW);
      // base = 100*(1+5/30)=116.7, current = 110*(1+5/30)=128.3
      // delta = 128.3 - 116.7 = 11.6 → arrondi: 11.7
      expect(list[0].delta).toBeGreaterThan(0);
      expect(list[0].deltaLabel).toMatch(/^\+/);
    });
  });

  describe('getExercise1RMHistory', () => {
    it('retourne une entrée par date calendaire (merge même jour)', async () => {
      const { service, setLogRepo } = makeService();
      // Deux logs le même jour → une seule barre (max)
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: 5, reps_done: 5, weight_done: 100, rpe: null, completed_at: '2026-05-10T10:00:00.000Z' });
      await setLogRepo.save({ session_log_id: 2, set_id: 2, exercise_id: 5, reps_done: 5, weight_done: 110, rpe: null, completed_at: '2026-05-10T15:00:00.000Z' });
      const history = await service.getExercise1RMHistory(5);
      expect(history).toHaveLength(1);
      expect(history[0].estimated1RM).toBe(Math.round(110 * (1 + 5 / 30) * 10) / 10);
    });

    it('retourne les entrées ordonnées ASC par date', async () => {
      const { service, setLogRepo } = makeService();
      await setLogRepo.save({ session_log_id: 1, set_id: 1, exercise_id: 5, reps_done: 5, weight_done: 100, rpe: null, completed_at: '2026-05-15T10:00:00.000Z' });
      await setLogRepo.save({ session_log_id: 2, set_id: 2, exercise_id: 5, reps_done: 5, weight_done: 90, rpe: null, completed_at: '2026-05-01T10:00:00.000Z' });
      const history = await service.getExercise1RMHistory(5);
      expect(history[0].estimated1RM).toBeLessThan(history[1].estimated1RM);
    });
  });
});
```

- [ ] **Step 2: Lancer les tests — ils doivent échouer**

```bash
cd app && npx jest services/ProgressionService --no-coverage
```

Expected: FAIL — `Cannot find module './ProgressionService'`.

- [ ] **Step 3: Créer ProgressionService.ts**

Créer `app/services/ProgressionService.ts` :

```typescript
import type { ISessionLogRepository } from '../repositories/ISessionLogRepository';
import type { ISetLogRepository } from '../repositories/ISetLogRepository';
import type { IPersonalRecordRepository } from '../repositories/IPersonalRecordRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';

export interface DashboardStats {
  sessionCount: number;
  prCount: number;
  exerciseCount: number;
}

export interface WeeklyVolume {
  weekLabel: string;
  volume: number;
  sessionCount: number;
}

export interface RecentPR {
  exerciseId: number;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  achievedAt: string;
}

export interface Exercise1RM {
  exerciseId: number;
  exerciseName: string;
  current1RM: number;
  delta: number | null;
  deltaLabel: string;
}

export interface Session1RM {
  date: string;
  estimated1RM: number;
}

function epley(weight: number, reps: number): number {
  if (reps === 0) return weight;
  return weight * (1 + reps / 30);
}

function getWeekMonday(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function toWeekKey(date: Date): string {
  return getWeekMonday(date).toISOString().slice(0, 10);
}

export class ProgressionService {
  constructor(
    private sessionLogRepo: ISessionLogRepository,
    private setLogRepo: ISetLogRepository,
    private personalRecordRepo: IPersonalRecordRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async getDashboardStats(now: Date = new Date()): Promise<DashboardStats> {
    const monthPrefix = now.toISOString().slice(0, 7);
    const startOfMonth = `${monthPrefix}-01T00:00:00.000Z`;

    const allSessions = await this.sessionLogRepo.findAll();
    const sessionCount = allSessions.filter(s => s.started_at.startsWith(monthPrefix)).length;

    const monthSetLogs = await this.setLogRepo.findFromDate(startOfMonth);
    const exerciseCount = new Set(monthSetLogs.map(l => l.exercise_id)).size;

    const recentPRs = await this.personalRecordRepo.findRecent(200);
    const prCount = recentPRs.filter(pr => pr.achieved_at.startsWith(monthPrefix)).length;

    return { sessionCount, prCount, exerciseCount };
  }

  async getVolumeByWeek(now: Date = new Date()): Promise<WeeklyVolume[]> {
    const thisMonday = getWeekMonday(now);

    const weeks = Array.from({ length: 4 }, (_, i) => {
      const monday = new Date(thisMonday);
      monday.setUTCDate(monday.getUTCDate() - (3 - i) * 7);
      return monday;
    });

    const earliestMonday = new Date(thisMonday);
    earliestMonday.setUTCDate(earliestMonday.getUTCDate() - 21);
    const setLogs = await this.setLogRepo.findFromDate(earliestMonday.toISOString());

    const labels = ['S-3', 'S-2', 'S-1', 'Cette sem.'];

    return weeks.map((monday, i) => {
      const key = toWeekKey(monday);
      const weekLogs = setLogs.filter(log => toWeekKey(new Date(log.completed_at)) === key);
      const volume = weekLogs.reduce((sum, log) => sum + log.reps_done * log.weight_done, 0);
      const sessionCount = new Set(weekLogs.map(log => log.session_log_id)).size;
      return { weekLabel: labels[i], volume, sessionCount };
    });
  }

  async getRecentPRs(limit: number): Promise<RecentPR[]> {
    const prs = await this.personalRecordRepo.findRecent(limit);
    return Promise.all(prs.map(async pr => {
      const exercise = await this.exerciseRepo.findById(pr.exercise_id);
      return {
        exerciseId: pr.exercise_id,
        exerciseName: exercise?.name ?? 'Exercice inconnu',
        weight: pr.weight,
        reps: pr.reps,
        estimated1RM: pr.estimated_1rm,
        achievedAt: pr.achieved_at,
      };
    }));
  }

  async getExercise1RMList(now: Date = new Date()): Promise<Exercise1RM[]> {
    const exerciseIds = await this.setLogRepo.findDistinctExerciseIds();
    if (exerciseIds.length === 0) return [];

    const cutoffDate = new Date(now);
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 30);
    const cutoff = cutoffDate.toISOString();

    const results = await Promise.all(exerciseIds.map(async exerciseId => {
      const exercise = await this.exerciseRepo.findById(exerciseId);
      const logs = await this.setLogRepo.findByExerciseId(exerciseId);

      const current1RM = Math.round(Math.max(...logs.map(l => epley(l.weight_done, l.reps_done))) * 10) / 10;

      const oldLogs = logs.filter(l => l.completed_at < cutoff);

      let delta: number | null = null;
      let deltaLabel: string;

      if (oldLogs.length === 0) {
        deltaLabel = 'Depuis le début';
      } else {
        const base1RM = Math.max(...oldLogs.map(l => epley(l.weight_done, l.reps_done)));
        delta = Math.round((current1RM - base1RM) * 10) / 10;
        if (delta > 0) deltaLabel = `+${delta} kg vs 30j`;
        else if (delta === 0) deltaLabel = 'stable';
        else deltaLabel = `${delta} kg vs 30j`;
      }

      return {
        exerciseId,
        exerciseName: exercise?.name ?? 'Exercice inconnu',
        current1RM,
        delta,
        deltaLabel,
      };
    }));

    return results.sort((a, b) => b.current1RM - a.current1RM);
  }

  async getExercise1RMHistory(exerciseId: number): Promise<Session1RM[]> {
    const logs = await this.setLogRepo.findByExerciseId(exerciseId);

    const byDate = new Map<string, number>();
    for (const log of logs) {
      const dateKey = log.completed_at.slice(0, 10);
      const current = byDate.get(dateKey) ?? 0;
      const rm = epley(log.weight_done, log.reps_done);
      if (rm > current) byDate.set(dateKey, rm);
    }

    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, rm]) => ({
        date: new Date(dateKey + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        estimated1RM: Math.round(rm * 10) / 10,
      }));
  }
}
```

- [ ] **Step 4: Lancer les tests — ils doivent passer**

```bash
cd app && npx jest services/ProgressionService --no-coverage
```

Expected: PASS — 14 tests verts.

- [ ] **Step 5: Vérifier TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/services/ProgressionService.ts app/services/ProgressionService.test.ts
git commit -m "feat(service): ProgressionService — 1RM Epley, volume ISO, PRs, delta 30j"
```

---

## Task 6: useProgression hook

**Files:**
- Create: `app/hooks/useProgression.ts`

Pas de tests unitaires pour ce hook (même politique que `useHistory`).

- [ ] **Step 1: Créer le hook**

Créer `app/hooks/useProgression.ts` :

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { ProgressionService, DashboardStats, WeeklyVolume, RecentPR, Exercise1RM } from '../services/ProgressionService';
import { SQLiteSessionLogRepository } from '../repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '../repositories/SQLiteSetLogRepository';
import { SQLitePersonalRecordRepository } from '../repositories/SQLitePersonalRecordRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { getDb } from '../db';

export interface UseProgressionReturn {
  stats: DashboardStats | null;
  volumeByWeek: WeeklyVolume[];
  recentPRs: RecentPR[];
  exercise1RMList: Exercise1RM[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function makeService(): ProgressionService {
  const db = getDb();
  return new ProgressionService(
    new SQLiteSessionLogRepository(db),
    new SQLiteSetLogRepository(db),
    new SQLitePersonalRecordRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

export function useProgression(): UseProgressionReturn {
  const serviceRef = useRef<ProgressionService | null>(null);
  if (!serviceRef.current) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [volumeByWeek, setVolumeByWeek] = useState<WeeklyVolume[]>([]);
  const [recentPRs, setRecentPRs] = useState<RecentPR[]>([]);
  const [exercise1RMList, setExercise1RMList] = useState<Exercise1RM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [s, v, p, e] = await Promise.all([
        service.getDashboardStats(),
        service.getVolumeByWeek(),
        service.getRecentPRs(5),
        service.getExercise1RMList(),
      ]);
      if (mountedRef.current) {
        setStats(s);
        setVolumeByWeek(v);
        setRecentPRs(p);
        setExercise1RMList(e);
      }
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [service]);

  useEffect(() => { refresh(); }, [refresh]);

  return { stats, volumeByWeek, recentPRs, exercise1RMList, isLoading, error, refresh };
}
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useProgression.ts
git commit -m "feat(hook): useProgression — Promise.all, mountedRef, refresh"
```

---

## Task 7: Composants VolumeBarChart + Exercise1RMCard

**Files:**
- Create: `app/components/progression/VolumeBarChart.tsx`
- Create: `app/components/progression/Exercise1RMCard.tsx`

- [ ] **Step 1: Créer VolumeBarChart**

Créer `app/components/progression/VolumeBarChart.tsx` :

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { WeeklyVolume } from '@/services/ProgressionService';

interface VolumeBarChartProps {
  data: WeeklyVolume[];
}

export function VolumeBarChart({ data }: VolumeBarChartProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (data.length === 0) return null;

  const currentWeek = data[data.length - 1];
  const prevWeek = data[data.length - 2];
  const delta = prevWeek && prevWeek.volume > 0
    ? Math.round((currentWeek.volume - prevWeek.volume) / prevWeek.volume * 100)
    : null;

  const maxVolume = Math.max(...data.map(w => w.volume), 1);

  const barData = data.map((week, i) => ({
    value: week.volume,
    label: week.weekLabel,
    frontColor: i === data.length - 1 ? colors.primary : (colorScheme === 'dark' ? '#1E40AF' : '#BFDBFE'),
    labelTextStyle: {
      color: i === data.length - 1 ? colors.primary : colors.textSecondary,
      fontSize: 10,
    },
  }));

  return (
    <View>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>VOLUME / SEMAINE</Text>
        {delta !== null && (
          <Text style={[styles.delta, { color: delta >= 0 ? '#22C55E' : '#EF4444' }]}>
            {delta >= 0 ? '↑' : '↓'} {delta >= 0 ? '+' : ''}{delta}% vs S-1
          </Text>
        )}
      </View>
      <BarChart
        data={barData}
        barWidth={36}
        noOfSections={3}
        maxValue={maxVolume}
        hideRules
        xAxisThickness={0}
        yAxisThickness={0}
        barBorderRadius={3}
        yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
        height={80}
        width={260}
      />
      <Text style={[styles.total, { color: colors.text }]}>
        {currentWeek.volume.toLocaleString('fr-FR')} kg
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  label: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  delta: { fontSize: 10, fontWeight: '600' },
  total: { fontSize: 14, fontWeight: '700', marginTop: 4 },
});
```

- [ ] **Step 2: Créer Exercise1RMCard**

Créer `app/components/progression/Exercise1RMCard.tsx` :

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { Exercise1RM } from '@/services/ProgressionService';

interface Exercise1RMCardProps {
  item: Exercise1RM;
  onPress: () => void;
  isLast: boolean;
}

export function Exercise1RMCard({ item, onPress, isLast }: Exercise1RMCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const deltaColor =
    item.delta === null ? colors.textSecondary
    : item.delta > 0 ? '#22C55E'
    : item.delta < 0 ? '#EF4444'
    : colors.textSecondary;

  return (
    <PressableA11y
      accessibilityLabel={`${item.exerciseName}, 1RM ${item.current1RM} kg, ${item.deltaLabel}`}
      onPress={onPress}
      style={[styles.card, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
    >
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{item.exerciseName}</Text>
        <Text style={[styles.delta, { color: deltaColor }]}>{item.deltaLabel}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.value, { color: colors.text }]}>{item.current1RM} kg</Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.tabIconDefault}
          importantForAccessibility="no"
          accessibilityElementsHidden={true}
        />
      </View>
    </PressableA11y>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '500' },
  delta: { fontSize: 12 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 3: Vérifier TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/components/progression/VolumeBarChart.tsx app/components/progression/Exercise1RMCard.tsx
git commit -m "feat(components): VolumeBarChart + Exercise1RMCard"
```

---

## Task 8: progression.tsx — segmented control + vue Stats

**Files:**
- Modify: `app/app/(tabs)/progression.tsx`

Remplacer le fichier entier. Le segmented control est rendu en dehors des deux ScrollContainers pour être naturellement sticky.

- [ ] **Step 1: Réécrire progression.tsx**

Contenu complet de `app/app/(tabs)/progression.tsx` :

```typescript
import { SectionList, View, Text, ScrollView, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useHistory } from '@/hooks/useHistory';
import { useProgression } from '@/hooks/useProgression';
import { SessionCard } from '@/components/history/SessionCard';
import { VolumeBarChart } from '@/components/progression/VolumeBarChart';
import { Exercise1RMCard } from '@/components/progression/Exercise1RMCard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { SessionSummary } from '@/services/HistoryService';
import type { Exercise1RM } from '@/services/ProgressionService';

type Segment = 'historique' | 'stats';

export default function ProgressionScreen() {
  const { sections, isLoading: histLoading, error: histError, refresh: refreshHist } = useHistory();
  const { stats, volumeByWeek, recentPRs, exercise1RMList, isLoading: statsLoading, error: statsError, refresh: refreshStats } = useProgression();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeSegment, setActiveSegment] = useState<Segment>('historique');

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refreshHist();
      refreshStats();
    }, [refreshHist, refreshStats])
  );

  const segmentControl = (
    <View style={[styles.segmentContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.segmentTrack, { backgroundColor: colors.surface }]}>
        {(['historique', 'stats'] as Segment[]).map(seg => (
          <Pressable
            key={seg}
            style={[styles.segmentButton, activeSegment === seg && { backgroundColor: colors.primary }]}
            onPress={() => setActiveSegment(seg)}
            accessibilityLabel={seg === 'historique' ? 'Historique' : 'Stats'}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeSegment === seg }}
          >
            <Text style={[styles.segmentText, { color: activeSegment === seg ? '#fff' : colors.textSecondary }]}>
              {seg === 'historique' ? 'Historique' : 'Stats'}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  if (activeSegment === 'historique') {
    if (histLoading) {
      return (
        <View style={[styles.flex, { backgroundColor: colors.background }]}>
          {segmentControl}
          <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
        </View>
      );
    }
    if (histError) {
      return (
        <View style={[styles.flex, { backgroundColor: colors.background }]}>
          {segmentControl}
          <View style={styles.center}>
            <Text style={[styles.message, { color: colors.text }]}>{histError}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        {segmentControl}
        <SectionList
          sections={sections}
          keyExtractor={(item: SessionSummary) => String(item.id)}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              onPress={() => router.push({ pathname: '/history/[sessionLogId]' as any, params: { sessionLogId: String(item.id) } })}
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">{title}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.message, { color: colors.textSecondary }]}>Aucune séance enregistrée</Text>
            </View>
          }
          contentContainerStyle={sections.length === 0 ? styles.emptyContainer : undefined}
          stickySectionHeadersEnabled
        />
      </View>
    );
  }

  // Stats segment
  if (statsLoading) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        {segmentControl}
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }
  if (statsError) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        {segmentControl}
        <View style={styles.center}>
          <Text style={[styles.message, { color: colors.text }]}>{statsError}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {segmentControl}
      <ScrollView contentContainerStyle={styles.statsContent}>

        {stats && (
          <View style={styles.chipsRow}>
            {[
              { label: 'SÉANCES', value: stats.sessionCount },
              { label: 'PRs', value: stats.prCount },
              { label: 'EXERCICES', value: stats.exerciseCount },
            ].map(chip => (
              <View key={chip.label} style={[styles.chip, { backgroundColor: colors.surface }]}>
                <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>{chip.label}</Text>
                <Text style={[styles.chipValue, { color: colors.text }]}>{chip.value}</Text>
                <Text style={[styles.chipSub, { color: colors.textSecondary }]}>ce mois</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <VolumeBarChart data={volumeByWeek} />
        </View>

        {recentPRs.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>PRs RÉCENTS</Text>
            {recentPRs.map((pr, i) => (
              <View
                key={`${pr.exerciseId}-${i}`}
                style={[styles.prRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
              >
                <View style={styles.prInfo}>
                  <Text style={[styles.prName, { color: colors.text }]}>{pr.exerciseName}</Text>
                  <Text style={[styles.prMeta, { color: colors.textSecondary }]}>
                    {pr.weight} kg × {pr.reps} · ~{pr.estimated1RM} kg 1RM
                  </Text>
                </View>
                <Text style={[styles.prDate, { color: colors.textSecondary }]}>
                  {new Date(pr.achievedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {exercise1RMList.length > 0 && (
          <View>
            <Text style={[styles.listTitle, { color: colors.textSecondary }]}>1RM PAR EXERCICE</Text>
            <View style={[styles.list, { backgroundColor: colors.surface }]}>
              {exercise1RMList.map((item: Exercise1RM, i) => (
                <Exercise1RMCard
                  key={item.exerciseId}
                  item={item}
                  isLast={i === exercise1RMList.length - 1}
                  onPress={() => router.push({
                    pathname: '/progression/[exerciseId]' as any,
                    params: { exerciseId: String(item.exerciseId), exerciseName: item.exerciseName },
                  })}
                />
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 60 },
  emptyContainer: { flex: 1 },
  message: { fontSize: 15, textAlign: 'center' },
  segmentContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  segmentTrack: { flexDirection: 'row', borderRadius: 8, padding: 3 },
  segmentButton: { flex: 1, borderRadius: 6, paddingVertical: 6, alignItems: 'center' },
  segmentText: { fontSize: 13, fontWeight: '600' },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  statsContent: { paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center', gap: 2 },
  chipLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipValue: { fontSize: 22, fontWeight: '700' },
  chipSub: { fontSize: 9 },
  card: { borderRadius: 10, padding: 14 },
  cardLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  prRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  prInfo: { flex: 1, gap: 2 },
  prName: { fontSize: 14, fontWeight: '500' },
  prMeta: { fontSize: 12 },
  prDate: { fontSize: 12 },
  listTitle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  list: { borderRadius: 10, overflow: 'hidden' },
});
```

- [ ] **Step 2: Vérifier TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Lancer tous les tests**

```bash
cd app && npx jest --no-coverage
```

Expected: tous verts.

- [ ] **Step 4: Commit**

```bash
git add "app/app/(tabs)/progression.tsx"
git commit -m "feat(screen): progression — segmented control Historique/Stats + dashboard stats"
```

---

## Task 9: progression/[exerciseId].tsx + _layout.tsx + docs

**Files:**
- Create: `app/app/progression/[exerciseId].tsx`
- Modify: `app/app/_layout.tsx`
- Modify: `docs/tests-manuels-mvp.md`
- Modify: `README.md`

- [ ] **Step 1: Créer l'écran détail exercice**

Créer `app/app/progression/[exerciseId].tsx` :

```typescript
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BarChart } from 'react-native-gifted-charts';
import { ProgressionService, Session1RM } from '@/services/ProgressionService';
import type { PersonalRecord } from '@/db/types';
import { SQLiteSessionLogRepository } from '@/repositories/SQLiteSessionLogRepository';
import { SQLiteSetLogRepository } from '@/repositories/SQLiteSetLogRepository';
import { SQLitePersonalRecordRepository } from '@/repositories/SQLitePersonalRecordRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getDb } from '@/db';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ExerciseProgressionScreen() {
  const { exerciseId, exerciseName } = useLocalSearchParams<{ exerciseId: string; exerciseName: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [history, setHistory] = useState<Session1RM[]>([]);
  const [bestPR, setBestPR] = useState<PersonalRecord | null>(null);
  const [allPRs, setAllPRs] = useState<PersonalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    const db = getDb();
    const prRepo = new SQLitePersonalRecordRepository(db);
    const service = new ProgressionService(
      new SQLiteSessionLogRepository(db),
      new SQLiteSetLogRepository(db),
      prRepo,
      new SQLiteExerciseRepository(db),
    );
    const id = Number(exerciseId);
    Promise.all([
      service.getExercise1RMHistory(id),
      prRepo.findBestByExerciseId(id),
      prRepo.findAllByExerciseId(id),
    ]).then(([h, best, prs]) => {
      if (!mountedRef.current) return;
      setHistory(h);
      setBestPR(best);
      setAllPRs(prs);
      setIsLoading(false);
    }).catch(() => {
      if (mountedRef.current) setIsLoading(false);
    });
  }, [exerciseId]);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const barData = history.map((entry, i) => ({
    value: entry.estimated1RM,
    label: entry.date,
    frontColor: i === history.length - 1 ? colors.primary : (colorScheme === 'dark' ? '#1E40AF' : '#BFDBFE'),
    labelTextStyle: { color: colors.textSecondary, fontSize: 9 },
  }));

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>{exerciseName}</Text>

      {history.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ÉVOLUTION 1RM ESTIMÉ</Text>
          <BarChart
            data={barData}
            barWidth={history.length <= 6 ? 32 : 20}
            noOfSections={3}
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            barBorderRadius={3}
            yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
            height={100}
          />
        </View>
      )}

      {bestPR && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>MEILLEUR PR</Text>
          <Text style={[styles.prValue, { color: colors.text }]}>
            {bestPR.weight} kg × {bestPR.reps} reps
          </Text>
          <Text style={[styles.prMeta, { color: colors.textSecondary }]}>
            1RM Epley : {bestPR.estimated_1rm} kg · {formatDate(bestPR.achieved_at)}
          </Text>
        </View>
      )}

      {allPRs.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>HISTORIQUE PRs</Text>
          {allPRs.map((pr, i) => (
            <View
              key={pr.id}
              style={[styles.prRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
            >
              <Text style={[styles.prRowValue, { color: colors.text }]}>
                {pr.weight} kg × {pr.reps} reps
              </Text>
              <Text style={[styles.prRowDate, { color: colors.textSecondary }]}>
                {formatDate(pr.achieved_at)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {history.length === 0 && !bestPR && (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune donnée pour cet exercice</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  section: { borderRadius: 10, padding: 14, gap: 8 },
  sectionLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  prValue: { fontSize: 18, fontWeight: '700' },
  prMeta: { fontSize: 13 },
  prRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  prRowValue: { fontSize: 14, fontWeight: '500' },
  prRowDate: { fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
```

- [ ] **Step 2: Enregistrer le screen dans _layout.tsx**

Dans `app/app/_layout.tsx`, ajouter après la ligne `<Stack.Screen name="history/[sessionLogId]"` :

```tsx
        <Stack.Screen
          name="progression/[exerciseId]"
          options={{ title: 'Progression' }}
        />
```

- [ ] **Step 3: Ajouter la section 11 dans tests-manuels-mvp.md**

Ajouter à la fin de `docs/tests-manuels-mvp.md` :

```markdown
## 11. Progression Stats

- Onglet Progression → segment Stats → dashboard visible
- Stats globales : séances, PRs, exercices ce mois corrects
- Volume 4 semaines ISO : barres affichées, semaine courante en bleu
- PRs récents : 5 derniers PRs avec nom exercice et 1RM estimé
- Liste 1RM : exercices loggés avec valeur et delta
- Delta "Depuis le début" si moins de 30j de données
- Tap exercice → écran détail avec graphique barres par session
- Meilleur PR + historique PRs dans le détail
- Segment Historique → liste des séances toujours intacte
```

- [ ] **Step 4: Mettre à jour README.md**

Dans `README.md`, remplacer la section `## Fonctionnalités implémentées` :

```markdown
## Fonctionnalités implémentées

- Bibliothèque d'exercices (prédéfinis + custom)
- Construction de séances : exercices → blocs → séries
- Édition inline : modifier / ajouter / supprimer blocs et séries
- Réordonnancement ↑↓ : exercices, blocs et séries
- Conduite de séance : chrono de pause, saisie reps/poids, check-in énergie/fatigue/sommeil
- Progression automatique des poids (Epley)
- Historique des séances avec détail par exercice
- Dashboard stats : volume hebdomadaire ISO, PRs récents, 1RM estimé par exercice
```

- [ ] **Step 5: Vérifier TypeScript**

```bash
cd app && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Lancer tous les tests**

```bash
cd app && npx jest --no-coverage
```

Expected: tous verts.

- [ ] **Step 7: Commit**

```bash
git add app/app/progression app/app/_layout.tsx docs/tests-manuels-mvp.md README.md
git commit -m "feat(screen): progression/[exerciseId] — graphique 1RM, meilleur PR, historique PRs"
```
