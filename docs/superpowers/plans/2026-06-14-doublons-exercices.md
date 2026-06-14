# Doublons exercices — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bloquer la création d'un exercice dont le nom existe déjà (insensible à la casse), avec une erreur claire.

**Architecture:** `findByName` ajouté à `IExerciseRepository` (COLLATE NOCASE en SQLite, `.toLowerCase()` en InMemory). `DuplicateExerciseError` exportée depuis `ExerciseService`. Check dans `ExerciseService.create` avant l'insertion. L'UI affiche déjà les erreurs via `useExercises` — aucun changement UI requis.

**Tech Stack:** TypeScript strict, expo-sqlite, Jest TDD

---

## Fichiers impactés

- Modify: `app/repositories/IExerciseRepository.ts`
- Modify: `app/repositories/SQLiteExerciseRepository.ts`
- Modify: `app/repositories/InMemoryExerciseRepository.ts`
- Modify: `app/repositories/exerciseRepository.contract.ts`
- Modify: `app/services/ExerciseService.ts`
- Modify: `app/services/ExerciseService.test.ts`

---

## Task 1 — `findByName` sur les repos exercice (TDD)

**Files:**
- Modify: `app/repositories/IExerciseRepository.ts`
- Modify: `app/repositories/SQLiteExerciseRepository.ts`
- Modify: `app/repositories/InMemoryExerciseRepository.ts`
- Modify: `app/repositories/exerciseRepository.contract.ts`

### Context

`IExerciseRepository` a `findAll`, `findById`, `findByType`, `save`, `delete`. Pas de `findByName`. Le fichier contract `exerciseRepository.contract.ts` expose `runExerciseRepositoryContractTests(createRepo)` — les tests InMemory passent via ce mécanisme.

- [ ] **Step 1 : Ajouter les tests contract RED**

Dans `app/repositories/exerciseRepository.contract.ts`, ajouter avant la dernière accolade fermante de `runExerciseRepositoryContractTests` :

```typescript
  describe('findByName', () => {
    it('retourne null si aucun exercice avec ce nom', async () => {
      expect(await repo.findByName('Inconnu')).toBeNull();
    });

    it("retourne l'exercice si nom exact", async () => {
      await repo.save(squat);
      const found = await repo.findByName('Squat');
      expect(found?.name).toBe('Squat');
    });

    it('est insensible à la casse', async () => {
      await repo.save(squat);
      expect((await repo.findByName('squat'))?.name).toBe('Squat');
      expect((await repo.findByName('SQUAT'))?.name).toBe('Squat');
    });

    it('trim les espaces avant comparaison', async () => {
      await repo.save(squat);
      expect((await repo.findByName('  Squat  '))?.name).toBe('Squat');
    });
  });
```

- [ ] **Step 2 : Vérifier RED**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test -- --testPathPattern="InMemoryExercise" --no-coverage 2>&1 | tail -10
```

Attendu : FAIL — `repo.findByName is not a function`

- [ ] **Step 3 : Ajouter à l'interface**

Dans `app/repositories/IExerciseRepository.ts`, ajouter à la fin de l'interface :

```typescript
  findByName(name: string): Promise<Exercise | null>;
```

- [ ] **Step 4 : Implémenter dans `InMemoryExerciseRepository`**

Dans `app/repositories/InMemoryExerciseRepository.ts`, ajouter après `findByType` :

```typescript
  async findByName(name: string): Promise<Exercise | null> {
    return this.exercises.find(
      e => e.name.toLowerCase() === name.toLowerCase().trim()
    ) ?? null;
  }
```

- [ ] **Step 5 : Implémenter dans `SQLiteExerciseRepository`**

Dans `app/repositories/SQLiteExerciseRepository.ts`, ajouter après `findByType` :

```typescript
  async findByName(name: string): Promise<Exercise | null> {
    return this.db.getFirstAsync<Exercise>(
      'SELECT * FROM exercises WHERE name = ? COLLATE NOCASE',
      [name.trim()],
    );
  }
```

- [ ] **Step 6 : Vérifier GREEN**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test -- --testPathPattern="InMemoryExercise|ExerciseRepository" --no-coverage 2>&1 | tail -10
```

Attendu : tous passent

- [ ] **Step 7 : Typecheck**

```bash
cd C:/Users/sylva/projects/training-app/app && npm run typecheck 2>&1 | tail -5
```

Attendu : 0 erreurs

- [ ] **Step 8 : Commit**

```bash
cd C:/Users/sylva/projects/training-app/app && git add repositories/IExerciseRepository.ts repositories/SQLiteExerciseRepository.ts repositories/InMemoryExerciseRepository.ts repositories/exerciseRepository.contract.ts && git commit -m "feat(repo): findByName sur ExerciseRepository (COLLATE NOCASE)"
```

---

## Task 2 — `DuplicateExerciseError` + check dans `ExerciseService.create` (TDD)

**Files:**
- Modify: `app/services/ExerciseService.ts`
- Modify: `app/services/ExerciseService.test.ts`

### Context

`ExerciseService.ts` exporte déjà `SafeDeleteConflict`. `create` valide `name` (non vide) et `progression_step` (> 0). Ajouter `DuplicateExerciseError` et le check avant l'insertion.

`makeService()` dans les tests injecte 3 repos : `InMemoryExerciseRepository`, `InMemorySetLogRepository`, `InMemoryWorkoutExerciseRepository`.

- [ ] **Step 1 : Ajouter les tests RED**

Dans `app/services/ExerciseService.test.ts`, modifier l'import ligne 1 pour ajouter `DuplicateExerciseError` :

```typescript
import { ExerciseService, SafeDeleteConflict, DuplicateExerciseError } from './ExerciseService';
```

Puis ajouter un nouveau `describe` après le dernier describe existant :

```typescript
describe('ExerciseService.create — doublons', () => {
  const baseInput = {
    type: 'musculation' as const,
    muscle_groups: [],
    technical_notes: null,
    progression_step: 2.5,
    progression_threshold: 1,
  };

  it('throw DuplicateExerciseError si nom identique (exact)', async () => {
    const { service } = makeService();
    await service.create({ ...baseInput, name: 'Squat' });
    await expect(service.create({ ...baseInput, name: 'Squat' }))
      .rejects.toBeInstanceOf(DuplicateExerciseError);
  });

  it('throw DuplicateExerciseError si nom identique (casse différente)', async () => {
    const { service } = makeService();
    await service.create({ ...baseInput, name: 'Squat' });
    await expect(service.create({ ...baseInput, name: 'squat' }))
      .rejects.toBeInstanceOf(DuplicateExerciseError);
  });

  it('crée si nom différent', async () => {
    const { service } = makeService();
    await service.create({ ...baseInput, name: 'Squat' });
    const result = await service.create({ ...baseInput, name: 'Deadlift' });
    expect(result.name).toBe('Deadlift');
  });

  it('message erreur contient le nom', async () => {
    const { service } = makeService();
    await service.create({ ...baseInput, name: 'Squat' });
    const err = await service.create({ ...baseInput, name: 'Squat' }).catch(e => e);
    expect(err.message).toContain('Squat');
  });
});
```

- [ ] **Step 2 : Vérifier RED**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test -- --testPathPattern="ExerciseService" --no-coverage 2>&1 | tail -15
```

Attendu : FAIL — `DuplicateExerciseError is not exported`

- [ ] **Step 3 : Ajouter `DuplicateExerciseError` dans `ExerciseService.ts`**

Après la classe `SafeDeleteConflict`, ajouter :

```typescript
export class DuplicateExerciseError extends Error {
  constructor(name: string) {
    super(`Un exercice nommé "${name}" existe déjà`);
    this.name = 'DuplicateExerciseError';
  }
}
```

- [ ] **Step 4 : Ajouter le check dans `create`**

Dans `ExerciseService.create`, après la validation `if (!input.name.trim())`, ajouter :

```typescript
    const existing = await this.repo.findByName(input.name.trim());
    if (existing) throw new DuplicateExerciseError(input.name.trim());
```

- [ ] **Step 5 : Vérifier GREEN**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test -- --testPathPattern="ExerciseService" --no-coverage 2>&1 | tail -10
```

Attendu : tous passent

- [ ] **Step 6 : Suite complète + typecheck**

```bash
cd C:/Users/sylva/projects/training-app/app && npm test --no-coverage 2>&1 | tail -5 && npm run typecheck 2>&1 | tail -5
```

Attendu : tous passent, 0 erreurs TS

- [ ] **Step 7 : Commit**

```bash
cd C:/Users/sylva/projects/training-app/app && git add services/ExerciseService.ts services/ExerciseService.test.ts && git commit -m "feat(service): DuplicateExerciseError + guard doublons dans ExerciseService.create"
```
