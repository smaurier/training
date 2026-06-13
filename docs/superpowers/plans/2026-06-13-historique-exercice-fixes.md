# Historique exercice fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer le cap silencieux à 10 séances dans l'historique exercice, et exposer les erreurs DB dans `useLoggedExercises`.

**Architecture:** Fix 1 — changer la signature de `ExerciseHistoryService.getHistory` pour rendre `limit` optionnel (défaut = illimité), protégé par un test TDD. Fix 2 — ajouter `error` state dans `useLoggedExercises`, l'afficher dans `search.tsx`. Aucun changement de schéma DB ni de routes.

**Tech Stack:** React Native, Expo SDK 54, TypeScript strict, expo-sqlite, Jest

---

## Fichiers

| Fichier | Action |
|---|---|
| `app/services/ExerciseHistoryService.ts` | Modifier — `limit?: number`, slice conditionnel |
| `app/services/ExerciseHistoryService.test.ts` | Modifier — ajouter 1 test TDD |
| `app/hooks/useLoggedExercises.ts` | Modifier — ajouter `error` state |
| `app/app/progression/search.tsx` | Modifier — afficher error state |

---

### Task 1 : `ExerciseHistoryService.getHistory` — limit optionnel (TDD)

**Files:**
- Modify: `app/services/ExerciseHistoryService.ts`
- Modify: `app/services/ExerciseHistoryService.test.ts`

**Contexte :**
- `makeService()` retourne `{ service, setLogRepo, exerciseRepo }` — pattern déjà utilisé dans les tests existants
- `baseExerciseDto` est déjà défini en haut du fichier test (lignes 5-14) — réutiliser sans redéfinir
- `setLogRepo.save(dto)` requiert : `session_log_id`, `set_id`, `exercise_id`, `reps_done`, `weight_done`, `rpe` (number | null), `completed_at` (ISO string)
- Le test `limit=2` existant (ligne 83) doit continuer à passer
- Insérer le nouveau test juste avant la fermeture `});` du `describe('ExerciseHistoryService.getHistory', ...)` (ligne 92)

- [ ] **Step 1 : Écrire le test RED**

Dans `app/services/ExerciseHistoryService.test.ts`, ajouter avant la fermeture `});` du `describe('ExerciseHistoryService.getHistory', ...)` :

```typescript
  it('retourne toutes les sessions quand limit omis', async () => {
    const { service, setLogRepo, exerciseRepo } = makeService();
    const ex = await exerciseRepo.save(baseExerciseDto);
    for (let i = 1; i <= 15; i++) {
      await setLogRepo.save({
        session_log_id: i, set_id: i, exercise_id: ex.id,
        reps_done: 5, weight_done: 80, rpe: null,
        completed_at: `2026-06-${String(i).padStart(2, '0')}T10:00:00.000Z`,
      });
    }
    const result = await service.getHistory(ex.id);
    expect(result.recentSessions).toHaveLength(15);
  });
```

- [ ] **Step 2 : Vérifier que le test échoue**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="ExerciseHistoryService.test" --no-coverage 2>&1 | tail -15
```

Attendu : FAIL — `Expected: 15, Received: 10` (le default actuel coupe à 10).

- [ ] **Step 3 : Modifier `ExerciseHistoryService.getHistory`**

Dans `app/services/ExerciseHistoryService.ts`, remplacer la signature et le return :

Trouver :
```typescript
  async getHistory(exerciseId: number, limit = 10): Promise<ExerciseHistory> {
```

Remplacer par :
```typescript
  async getHistory(exerciseId: number, limit?: number): Promise<ExerciseHistory> {
```

Trouver (dans le même fichier, vers la fin de la méthode) :
```typescript
    return {
      exercise,
      lastSession: sessions[0] ?? null,
      recentSessions: sessions.slice(0, limit),
    };
```

Remplacer par :
```typescript
    return {
      exercise,
      lastSession: sessions[0] ?? null,
      recentSessions: limit !== undefined ? sessions.slice(0, limit) : sessions,
    };
```

- [ ] **Step 4 : Vérifier que tous les tests passent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="ExerciseHistoryService.test" --no-coverage 2>&1 | tail -10
```

Attendu : PASS — tous les tests existants + le nouveau (12 tests au total dans ce fichier).

- [ ] **Step 5 : Suite complète + TypeScript**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -10 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/services/ExerciseHistoryService.ts app/services/ExerciseHistoryService.test.ts && git commit -m "feat(progression): ExerciseHistoryService.getHistory — limit optionnel, retourne tout par défaut (TDD)"
```

---

### Task 2 : `useLoggedExercises` — error state + UI

**Files:**
- Modify: `app/hooks/useLoggedExercises.ts`
- Modify: `app/app/progression/search.tsx`

**Contexte :**
- `useLoggedExercises` retourne actuellement `{ exercises, isLoading, refresh }` — `error` est absent
- `search.tsx` ligne 15 : `const { exercises, isLoading } = useLoggedExercises();`
- `search.tsx` bloc ternaire (lignes 34-64) : `isLoading ? spinner : filtered.length === 0 ? empty : FlatList`
- L'error state doit s'intercaler entre `isLoading` et `filtered.length === 0`
- Pas de test : comportement observable uniquement en UI

- [ ] **Step 1 : Mettre à jour `app/hooks/useLoggedExercises.ts`**

Remplacer le contenu entier du fichier par :

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { ExerciseHistoryService } from '../services/ExerciseHistoryService';
import { SQLiteSetLogRepository } from '../repositories/SQLiteSetLogRepository';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { getDb } from '../db';
import type { Exercise } from '../db/types';

function makeService(): ExerciseHistoryService {
  const db = getDb();
  return new ExerciseHistoryService(
    new SQLiteSetLogRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

export function useLoggedExercises() {
  const serviceRef = useRef<ExerciseHistoryService | null>(null);
  if (serviceRef.current == null) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await service.getLoggedExercises();
      if (mountedRef.current) setExercises(result);
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [service]);

  useEffect(() => { refresh(); }, [refresh]);

  return { exercises, isLoading, error, refresh };
}
```

- [ ] **Step 2 : Mettre à jour `app/app/progression/search.tsx`**

**2a. Mettre à jour la ligne de destructuration (ligne 15) :**

Trouver :
```typescript
  const { exercises, isLoading } = useLoggedExercises();
```

Remplacer par :
```typescript
  const { exercises, isLoading, error } = useLoggedExercises();
```

**2b. Mettre à jour le bloc ternaire (lignes 34-64) :**

Trouver :
```tsx
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {exercises.length === 0 ? 'Aucun exercice loggé' : 'Aucun résultat'}
          </Text>
        </View>
      ) : (
```

Remplacer par :
```tsx
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            Impossible de charger les exercices
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {exercises.length === 0 ? 'Aucun exercice loggé' : 'Aucun résultat'}
          </Text>
        </View>
      ) : (
```

- [ ] **Step 3 : TypeScript + suite complète**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1 | head -10 && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 4 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/hooks/useLoggedExercises.ts "app/app/progression/search.tsx" && git commit -m "feat(progression): useLoggedExercises — error state + affichage dans search"
```

---

## Self-Review

**Spec coverage :**
- ✅ `getHistory` sans limit retourne toutes les sessions — Task 1 (test + impl)
- ✅ Test TDD protège contre régression — Task 1 Step 1-4
- ✅ `limit=2` existant passe toujours — vérifié Step 4
- ✅ `useLoggedExercises` expose `error` — Task 2 Step 1
- ✅ `search.tsx` affiche "Impossible de charger les exercices" sur error — Task 2 Step 2
- ✅ "Aucun exercice loggé" inchangé — Task 2 Step 2 (cas conservé)
- ✅ `[exerciseId].tsx` inchangé — aucune modification prévue ni nécessaire

**Placeholders :** aucun.

**Type consistency :** `error: string | null` dans hook → `error` destructuré dans search.tsx → `error ?` dans ternaire. Cohérent.
