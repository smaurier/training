# Présences ce mois — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher "X séances ce mois" dans le segment Stats — compteur additif des sessions `completed` du mois calendaire courant, caché si 0.

**Architecture:** `ProgressionService.getMonthlyPresences(now)` filtre `findAll()` par `status === 'completed'` et `started_at` dans le mois courant. `useProgression` ajoute un 6e slot dans le `Promise.all` existant. `progression.tsx` affiche un texte simple avant la `chipsRow`.

**Tech Stack:** React Native, Expo SDK 54, TypeScript strict, expo-sqlite, Jest

---

## Fichiers

| Fichier | Action |
|---|---|
| `app/services/ProgressionService.ts` | Modifier — ajouter `getMonthlyPresences` |
| `app/services/ProgressionService.test.ts` | Modifier — ajouter 4 tests TDD |
| `app/hooks/useProgression.ts` | Modifier — 6e slot Promise.all + état |
| `app/app/(tabs)/progression.tsx` | Modifier — afficher le compteur |

---

### Task 1 : `ProgressionService.getMonthlyPresences` (TDD)

**Files:**
- Modify: `app/services/ProgressionService.ts`
- Modify: `app/services/ProgressionService.test.ts`

**Contexte :**
- `InMemorySessionLogRepository.save()` crée une session avec `status = 'active'`
- `sessionLogRepo.complete(id, endedAt)` passe `status` à `'completed'`
- `sessionLogRepo.abandon(id, endedAt)` passe `status` à `'abandoned'`
- `NOW = new Date('2026-05-29T12:00:00.000Z')` est déjà défini dans le fichier de test
- `baseSessionDto` est déjà défini dans le fichier de test

- [ ] **Step 1 : Écrire les tests (RED)**

Ajouter le bloc `describe` suivant à la fin de `app/services/ProgressionService.test.ts` (à l'intérieur du `describe('ProgressionService', ...)` englobant) :

```typescript
  describe('getMonthlyPresences', () => {
    it('retourne 0 si aucune session', async () => {
      const { service } = makeService();
      expect(await service.getMonthlyPresences(NOW)).toBe(0);
    });

    it('compte les sessions completed du mois courant', async () => {
      const { service, sessionLogRepo } = makeService();
      const s1 = await sessionLogRepo.save({ ...baseSessionDto, started_at: '2026-05-10T10:00:00.000Z' });
      await sessionLogRepo.complete(s1.id, '2026-05-10T11:00:00.000Z');
      const s2 = await sessionLogRepo.save({ ...baseSessionDto, started_at: '2026-05-20T10:00:00.000Z' });
      await sessionLogRepo.complete(s2.id, '2026-05-20T11:00:00.000Z');
      expect(await service.getMonthlyPresences(NOW)).toBe(2);
    });

    it('exclut les sessions abandoned et active', async () => {
      const { service, sessionLogRepo } = makeService();
      await sessionLogRepo.save({ ...baseSessionDto, started_at: '2026-05-10T10:00:00.000Z' });
      const s2 = await sessionLogRepo.save({ ...baseSessionDto, started_at: '2026-05-15T10:00:00.000Z' });
      await sessionLogRepo.abandon(s2.id, '2026-05-15T11:00:00.000Z');
      expect(await service.getMonthlyPresences(NOW)).toBe(0);
    });

    it('exclut les sessions du mois précédent', async () => {
      const { service, sessionLogRepo } = makeService();
      const s1 = await sessionLogRepo.save({ ...baseSessionDto, started_at: '2026-04-10T10:00:00.000Z' });
      await sessionLogRepo.complete(s1.id, '2026-04-10T11:00:00.000Z');
      expect(await service.getMonthlyPresences(NOW)).toBe(0);
    });
  });
```

- [ ] **Step 2 : Vérifier que les tests échouent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="ProgressionService.test" --no-coverage 2>&1 | tail -5
```
Attendu : FAIL — `service.getMonthlyPresences is not a function`

- [ ] **Step 3 : Implémenter `getMonthlyPresences` dans `ProgressionService.ts`**

Ajouter la méthode suivante dans la classe `ProgressionService`, après `getVolumeByMuscleGroup` :

```typescript
  async getMonthlyPresences(now: Date = new Date()): Promise<number> {
    const monthPrefix = now.toISOString().slice(0, 7);
    const allSessions = await this.sessionLogRepo.findAll();
    return allSessions.filter(
      s => s.status === 'completed' && s.started_at.startsWith(monthPrefix),
    ).length;
  }
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /c/Users/sylva/projects/training-app/app && npx jest --testPathPattern="ProgressionService.test" --no-coverage 2>&1 | tail -5
```
Attendu : PASS — 4 nouveaux tests + tous les tests existants

- [ ] **Step 5 : Suite complète + TypeScript**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
cd /c/Users/sylva/projects/training-app/app && npx jest --no-coverage 2>&1 | tail -5
```
Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 6 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/services/ProgressionService.ts app/services/ProgressionService.test.ts && git commit -m "feat(stats): ProgressionService.getMonthlyPresences — sessions completed du mois (TDD)"
```

---

### Task 2 : Hook + UI

**Files:**
- Modify: `app/hooks/useProgression.ts`
- Modify: `app/app/(tabs)/progression.tsx`

**Contexte :**
- `useProgression.ts` fait déjà `const [s, v, p, e, m] = await Promise.all([...5 slots...])` ligne ~51
- `UseProgressionReturn` est l'interface de retour du hook — elle expose déjà `stats`, `volumeByWeek`, `recentPRs`, `exercise1RMList`, `volumeByMuscleGroup`
- Dans `progression.tsx`, le segment Stats démarre à la ligne `<ScrollView contentContainerStyle={styles.statsContent}>`. La `chipsRow` contient les chips SÉANCES / MARQUES / EXERCICES. Les nouvelles lignes s'insèrent **avant** la `chipsRow`.
- `Radius` est déjà importé dans `progression.tsx`

- [ ] **Step 1 : Mettre à jour `app/hooks/useProgression.ts`**

**1a. Ajouter `monthlyPresences` à l'interface `UseProgressionReturn` :**

Trouver :
```typescript
export interface UseProgressionReturn {
  stats: DashboardStats | null;
  volumeByWeek: WeeklyVolume[];
  recentPRs: RecentPR[];
  exercise1RMList: Exercise1RM[];
  volumeByMuscleGroup: MacroGroupVolume[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

Remplacer par :
```typescript
export interface UseProgressionReturn {
  stats: DashboardStats | null;
  volumeByWeek: WeeklyVolume[];
  recentPRs: RecentPR[];
  exercise1RMList: Exercise1RM[];
  volumeByMuscleGroup: MacroGroupVolume[];
  monthlyPresences: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

**1b. Ajouter l'état `monthlyPresences` dans le hook :**

Après `const [volumeByMuscleGroup, setVolumeByMuscleGroup] = useState<MacroGroupVolume[]>([]);`, ajouter :
```typescript
  const [monthlyPresences, setMonthlyPresences] = useState(0);
```

**1c. Étendre le `Promise.all` de 5 à 6 slots :**

Trouver :
```typescript
      const [s, v, p, e, m] = await Promise.all([
        service.getDashboardStats(),
        service.getVolumeByWeek(),
        service.getRecentPRs(5),
        service.getExercise1RMList(),
        service.getVolumeByMuscleGroup(),
      ]);
```

Remplacer par :
```typescript
      const [s, v, p, e, m, presences] = await Promise.all([
        service.getDashboardStats(),
        service.getVolumeByWeek(),
        service.getRecentPRs(5),
        service.getExercise1RMList(),
        service.getVolumeByMuscleGroup(),
        service.getMonthlyPresences(),
      ]);
```

**1d. Ajouter `setMonthlyPresences` dans le bloc `if (mountedRef.current)` :**

Trouver :
```typescript
      if (mountedRef.current) {
        setStats(s);
        setVolumeByWeek(v);
        setRecentPRs(p);
        setExercise1RMList(e);
        setVolumeByMuscleGroup(m);
      }
```

Remplacer par :
```typescript
      if (mountedRef.current) {
        setStats(s);
        setVolumeByWeek(v);
        setRecentPRs(p);
        setExercise1RMList(e);
        setVolumeByMuscleGroup(m);
        setMonthlyPresences(presences);
      }
```

**1e. Exposer `monthlyPresences` dans le return :**

Trouver :
```typescript
  return { stats, volumeByWeek, recentPRs, exercise1RMList, volumeByMuscleGroup, isLoading, error, refresh };
```

Remplacer par :
```typescript
  return { stats, volumeByWeek, recentPRs, exercise1RMList, volumeByMuscleGroup, monthlyPresences, isLoading, error, refresh };
```

- [ ] **Step 2 : Mettre à jour `app/app/(tabs)/progression.tsx`**

**2a. Destructurer `monthlyPresences` depuis `useProgression()` :**

Trouver la ligne (vers le haut du composant) :
```typescript
  const { stats, volumeByWeek, recentPRs, exercise1RMList, volumeByMuscleGroup, isLoading: statsLoading, error: statsError, refresh: refreshStats } = useProgression();
```

Remplacer par :
```typescript
  const { stats, volumeByWeek, recentPRs, exercise1RMList, volumeByMuscleGroup, monthlyPresences, isLoading: statsLoading, error: statsError, refresh: refreshStats } = useProgression();
```

**2b. Ajouter le compteur de présences avant la `chipsRow` :**

Trouver (dans le segment Stats, après `<ScrollView contentContainerStyle={styles.statsContent}>`) :
```tsx
        {stats && (
          <View style={styles.chipsRow}>
```

Insérer **juste avant** ce bloc :
```tsx
        {monthlyPresences > 0 && (
          <View style={[styles.presencesCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.presencesText, { color: colors.text }]}>
              {monthlyPresences} {monthlyPresences === 1 ? 'séance' : 'séances'} ce mois
            </Text>
          </View>
        )}

```

**2c. Ajouter les styles dans `StyleSheet.create({...})` :**

Dans le `StyleSheet.create` existant, ajouter :
```typescript
  presencesCard: { borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 12 },
  presencesText: { fontSize: 15, fontWeight: '600' },
```

- [ ] **Step 3 : TypeScript + ESLint + suite complète**

```bash
cd /c/Users/sylva/projects/training-app/app && npx tsc --noEmit 2>&1
cd /c/Users/sylva/projects/training-app/app && npx jest --no-coverage 2>&1 | tail -5
cd /c/Users/sylva/projects/training-app/app && npx eslint . --ext .ts,.tsx --max-warnings 0 2>&1 | grep -E "error|warning" || echo "OK"
```
Attendu : 0 erreurs TS, tous les tests passent, 0 warnings ESLint.

- [ ] **Step 4 : Commit**

```bash
cd /c/Users/sylva/projects/training-app && git add app/hooks/useProgression.ts "app/app/(tabs)/progression.tsx" && git commit -m "feat(stats): présences ce mois — hook + UI"
```

---

## Self-Review

**Spec coverage :**
- ✅ `getMonthlyPresences` filtre `status === 'completed'` — T1
- ✅ Mois calendaire courant (`started_at.startsWith(monthPrefix)`) — T1
- ✅ Retourne 0 si aucune session — T1
- ✅ Exclut abandoned/active — T1
- ✅ Exclut mois précédent — T1
- ✅ `monthlyPresences` exposé dans `useProgression` — T2
- ✅ Caché si 0 (`monthlyPresences > 0`) — T2
- ✅ Copy singulier/pluriel ("1 séance" / "3 séances ce mois") — T2
- ✅ Positionné avant `chipsRow` (= avant VolumeBarChart) — T2
- ✅ Aucune comparaison, aucun streak — T2

**Placeholders :** aucun.

**Type consistency :** `getMonthlyPresences(): Promise<number>` → `monthlyPresences: number` dans le hook → `{monthlyPresences}` dans l'UI. Cohérent.
