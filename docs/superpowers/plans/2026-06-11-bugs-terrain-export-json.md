# Bugs terrain + Export JSON — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger 3 bugs terrain (B1 inputs reset, B2 poids null, B3 robustesse confirm) et livrer l'export JSON complet via share sheet natif depuis l'écran Réglages.

**Architecture:** B1 = vérification/correction RunningPhase state init. B2 = poids conservateurs dans seeds PPL. B3 = error state inline dans ExerciseStartingWeightPhase (loading déjà implémenté). Export = `ExportService` (queries SQL directes sur `db`) + `expo-file-system` + `expo-sharing` + section DONNÉES dans `reglages.tsx`.

**Tech Stack:** React Native / Expo SDK 54, TypeScript strict, expo-sqlite, expo-file-system, expo-sharing, Jest

---

## File Map

| Action | Fichier |
|--------|---------|
| Modifier | `app/components/session/RunningPhase.tsx` (si B1 non stale) |
| Modifier | `app/db/seeds.ts` |
| Modifier | `app/components/session/ExerciseStartingWeightPhase.tsx` |
| Créer | `app/services/ExportService.ts` |
| Créer | `app/services/ExportService.test.ts` |
| Modifier | `app/app/(tabs)/reglages.tsx` |

---

## Task 1 — B1 : Vérifier (et corriger si besoin) l'état des inputs après validation

**Files:**
- Read: `app/components/session/RunningPhase.tsx` (section handleValidate)
- Read: `app/app/session/[workoutId].tsx` (section RunningPhase key prop)

### Contexte

`RunningPhase` est monté avec `key={session.currentSet.id}`. Quand `currentSet.id` change (série suivante), React démonte et remonte le composant → `useState(String(set.reps_max))` et `useState(convert(set.weight))` réinitialisent depuis les nouveaux props. Le bug "inputs non effacés" date d'avant l'ajout du `key` prop.

- [ ] **Step 1 : Confirmer que `key={session.currentSet.id}` est en place**

Lire `app/app/session/[workoutId].tsx` lignes 95–116. Vérifier :
```
key={session.currentSet.id}
```
présent sur `<RunningPhase>`.

Résultat attendu : oui, c'est en place (commit `2a35927`).

- [ ] **Step 2 : Confirmer l'init des states depuis les props**

Lire `app/components/session/RunningPhase.tsx` lignes 81–91. Vérifier :
```typescript
const [reps, setReps] = useState(String(set.reps_max));
const [weight, setWeight] = useState(
  set.weight_type === 'bodyweight' ? '0' : set.weight != null ? convert(set.weight) : ''
);
const [rpe, setRpe] = useState('');
```

Résultat attendu : states initialisés depuis props `set` → sur remount (nouveau `key`), ils prennent les valeurs du nouveau set.

- [ ] **Step 3 : Conclure**

Si les deux vérifications sont positives → **B1 est stale** (corrigé par le `key` prop). Aucun code à modifier. Continuer Task 2.

Si un des deux manque → identifier la cause, corriger les states, vérifier avec typecheck, commit `fix(session): reset RunningPhase inputs on set change`.

---

## Task 2 — B2 : Seeds poids conservateurs PPL

**Files:**
- Modify: `app/db/seeds.ts`

### Contexte

Tous les sets `f(reps_min, reps_max, rest)` sans 4e argument ont `weight: null`. La protection `preserveWeight` garantit que les utilisateurs avec des logs existants ne sont pas impactés. Les nouveaux utilisateurs (ou sets sans poids ni logs) recevront les poids seedés.

Les exercices `bodyweight` (`bw()`), `bar` (`barOnly()`), mobilité (`mob()`), étirements → poids `null` conservés.

Les back-off avec `weight_ratio` (`f(..., null, 0.8)`) → `null` conservé (calculé depuis Travail).

- [ ] **Step 1 : Modifier le bloc PUSH — Développé couché barre (Travail)**

Localiser dans `seeds.ts` le bloc Travail de Développé couché barre :
```typescript
            {
              name: 'Travail',
              is_work: true,
              sets: [f(8, 8, 120), f(8, 8, 120), f(8, 8, 120), f(8, 8, 120)],
            },
```
Remplacer par :
```typescript
            {
              name: 'Travail',
              is_work: true,
              sets: [f(8, 8, 120, 60), f(8, 8, 120, 60), f(8, 8, 120, 60), f(8, 8, 120, 60)],
            },
```

- [ ] **Step 2 : Modifier Développé incliné haltères**

Localiser :
```typescript
        { exercise: 'Développé incliné haltères',    blocks: [workBlock([f(8, 10, 60), f(8, 10, 60), f(8, 10, 60)])] },
```
Remplacer par :
```typescript
        { exercise: 'Développé incliné haltères',    blocks: [workBlock([f(8, 10, 60, 16), f(8, 10, 60, 16), f(8, 10, 60, 16)])] },
```

- [ ] **Step 3 : Modifier Élévations latérales haltères (PUSH)**

Localiser (ligne dans le bloc PUSH) :
```typescript
        { exercise: 'Élévations latérales haltères', blocks: [workBlock([f(15, 15, 60), f(15, 15, 60), f(15, 15, 60)])] },
```
Remplacer par :
```typescript
        { exercise: 'Élévations latérales haltères', blocks: [workBlock([f(15, 15, 60, 8), f(15, 15, 60, 8), f(15, 15, 60, 8)])] },
```

Note : il y a une deuxième occurrence dans le bloc BONUS — Step 10 la traite.

- [ ] **Step 4 : Modifier Extension triceps poulie haute (PUSH)**

Localiser (ligne dans le bloc PUSH) :
```typescript
        { exercise: 'Extension triceps poulie haute', blocks: [workBlock([f(10, 12, 60), f(10, 12, 60), f(10, 12, 60)])] },
```
Remplacer par :
```typescript
        { exercise: 'Extension triceps poulie haute', blocks: [workBlock([f(10, 12, 60, 20), f(10, 12, 60, 20), f(10, 12, 60, 20)])] },
```

Note : deuxième occurrence dans BONUS — Step 11 la traite.

- [ ] **Step 5 : Modifier Crunch poulie haute**

Localiser :
```typescript
        { exercise: 'Crunch poulie haute',           blocks: [workBlock([f(12, 15, 45), f(12, 15, 45), f(12, 15, 45)])] },
```
Remplacer par :
```typescript
        { exercise: 'Crunch poulie haute',           blocks: [workBlock([f(12, 15, 45, 25), f(12, 15, 45, 25), f(12, 15, 45, 25)])] },
```

- [ ] **Step 6 : Modifier Rowing barre**

Localiser :
```typescript
        { exercise: 'Rowing barre',        blocks: [workBlock([f(8, 8, 90), f(8, 8, 90), f(8, 8, 90), f(8, 8, 90)])] },
```
Remplacer par :
```typescript
        { exercise: 'Rowing barre',        blocks: [workBlock([f(8, 8, 90, 50), f(8, 8, 90, 50), f(8, 8, 90, 50), f(8, 8, 90, 50)])] },
```

- [ ] **Step 7 : Modifier Face pull**

Localiser :
```typescript
        { exercise: 'Face pull',           blocks: [workBlock([f(15, 15, 60), f(15, 15, 60), f(15, 15, 60)])] },
```
Remplacer par :
```typescript
        { exercise: 'Face pull',           blocks: [workBlock([f(15, 15, 60, 20), f(15, 15, 60, 20), f(15, 15, 60, 20)])] },
```

- [ ] **Step 8 : Modifier Curl barre EZ (PULL)**

Localiser (ligne dans le bloc PULL, 3 sets) :
```typescript
        { exercise: 'Curl barre EZ',       blocks: [workBlock([f(10, 12, 60), f(10, 12, 60), f(10, 12, 60)])] },
```
Remplacer par :
```typescript
        { exercise: 'Curl barre EZ',       blocks: [workBlock([f(10, 12, 60, 20), f(10, 12, 60, 20), f(10, 12, 60, 20)])] },
```

Note : deuxième occurrence dans BONUS (4 sets) — Step 12 la traite.

- [ ] **Step 9 : Modifier Tirage poulie basse**

Localiser :
```typescript
        { exercise: 'Tirage poulie basse', blocks: [workBlock([f(10, 12, 60), f(10, 12, 60), f(10, 12, 60)])] },
```
Remplacer par :
```typescript
        { exercise: 'Tirage poulie basse', blocks: [workBlock([f(10, 12, 60, 30), f(10, 12, 60, 30), f(10, 12, 60, 30)])] },
```

- [ ] **Step 10 : Modifier Squat barre**

Localiser :
```typescript
        { exercise: 'Squat barre',       blocks: [workBlock([f(8, 8, 120), f(8, 8, 120), f(8, 8, 120), f(8, 8, 120)])] },
```
Remplacer par :
```typescript
        { exercise: 'Squat barre',       blocks: [workBlock([f(8, 8, 120, 60), f(8, 8, 120, 60), f(8, 8, 120, 60), f(8, 8, 120, 60)])] },
```

- [ ] **Step 11 : Modifier Romanian Deadlift**

Localiser :
```typescript
        { exercise: 'Romanian Deadlift', blocks: [workBlock([f(8, 8, 90), f(8, 8, 90), f(8, 8, 90)])] },
```
Remplacer par :
```typescript
        { exercise: 'Romanian Deadlift', blocks: [workBlock([f(8, 8, 90, 50), f(8, 8, 90, 50), f(8, 8, 90, 50)])] },
```

- [ ] **Step 12 : Modifier Fentes bulgares**

Localiser :
```typescript
        { exercise: 'Fentes bulgares',   blocks: [workBlock([f(10, 10, 60), f(10, 10, 60), f(10, 10, 60)])] },
```
Remplacer par :
```typescript
        { exercise: 'Fentes bulgares',   blocks: [workBlock([f(10, 10, 60, 14), f(10, 10, 60, 14), f(10, 10, 60, 14)])] },
```

- [ ] **Step 13 : Modifier Leg curl poulie**

Localiser :
```typescript
        { exercise: 'Leg curl poulie',   blocks: [workBlock([f(12, 12, 60), f(12, 12, 60), f(12, 12, 60)])] },
```
Remplacer par :
```typescript
        { exercise: 'Leg curl poulie',   blocks: [workBlock([f(12, 12, 60, 30), f(12, 12, 60, 30), f(12, 12, 60, 30)])] },
```

- [ ] **Step 14 : Modifier Pin Press (BONUS)**

Localiser :
```typescript
        { exercise: 'Pin Press',                     blocks: [workBlock([f(5, 5, 120), f(5, 5, 120), f(5, 5, 120), f(5, 5, 120)])] },
```
Remplacer par :
```typescript
        { exercise: 'Pin Press',                     blocks: [workBlock([f(5, 5, 120, 40), f(5, 5, 120, 40), f(5, 5, 120, 40), f(5, 5, 120, 40)])] },
```

- [ ] **Step 15 : Modifier Curl barre EZ (BONUS — 4 sets)**

Localiser (ligne dans le bloc BONUS, 4 sets) :
```typescript
        { exercise: 'Curl barre EZ',                 blocks: [workBlock([f(10, 12, 60), f(10, 12, 60), f(10, 12, 60), f(10, 12, 60)])] },
```
Remplacer par :
```typescript
        { exercise: 'Curl barre EZ',                 blocks: [workBlock([f(10, 12, 60, 20), f(10, 12, 60, 20), f(10, 12, 60, 20), f(10, 12, 60, 20)])] },
```

- [ ] **Step 16 : Modifier Extension triceps poulie haute (BONUS — 4 sets)**

Localiser (ligne dans le bloc BONUS, 4 sets) :
```typescript
        { exercise: 'Extension triceps poulie haute', blocks: [workBlock([f(10, 12, 60), f(10, 12, 60), f(10, 12, 60), f(10, 12, 60)])] },
```
Remplacer par :
```typescript
        { exercise: 'Extension triceps poulie haute', blocks: [workBlock([f(10, 12, 60, 20), f(10, 12, 60, 20), f(10, 12, 60, 20), f(10, 12, 60, 20)])] },
```

- [ ] **Step 17 : Modifier Élévations latérales haltères (BONUS — 4 sets)**

Localiser (ligne dans le bloc BONUS, 4 sets) :
```typescript
        { exercise: 'Élévations latérales haltères', blocks: [workBlock([f(15, 15, 60), f(15, 15, 60), f(15, 15, 60), f(15, 15, 60)])] },
```
Remplacer par :
```typescript
        { exercise: 'Élévations latérales haltères', blocks: [workBlock([f(15, 15, 60, 8), f(15, 15, 60, 8), f(15, 15, 60, 8), f(15, 15, 60, 8)])] },
```

- [ ] **Step 18 : Typecheck**

```bash
cd app && npm run typecheck
```

Résultat attendu : aucune erreur.

- [ ] **Step 19 : Tests — pas de régression**

```bash
cd app && npm test -- --no-coverage 2>&1 | tail -5
```

Résultat attendu : `312 passed, 312 total`

- [ ] **Step 20 : Commit**

```bash
git add app/db/seeds.ts
git commit -m "fix(seeds): seed conservative starter weights for all PPL fixed-weight exercises"
```

---

## Task 3 — B3 : Error state inline dans ExerciseStartingWeightPhase

**Files:**
- Modify: `app/components/session/ExerciseStartingWeightPhase.tsx`

### Contexte

`loading` state est déjà implémenté (lignes 21, 26–31, 70, 77). Il manque uniquement : `error: string | null` state + affichage inline sous le bouton.

- [ ] **Step 1 : Ajouter le state error**

Dans `ExerciseStartingWeightPhase.tsx`, ajouter après `const [loading, setLoading] = useState(false);` :

```typescript
  const [error, setError] = useState<string | null>(null);
```

- [ ] **Step 2 : Mettre à jour handleConfirm pour capturer l'erreur**

Remplacer la fonction `handleConfirm` existante :
```typescript
  async function handleConfirm() {
    const w = parseFloat(weight.replace(',', '.'));
    if (isNaN(w) || w <= 0) return;
    setLoading(true);
    try {
      await onConfirm(w);
    } finally {
      setLoading(false);
    }
  }
```
Par :
```typescript
  async function handleConfirm() {
    const w = parseFloat(weight.replace(',', '.'));
    if (isNaN(w) || w <= 0) return;
    setLoading(true);
    setError(null);
    try {
      await onConfirm(w);
    } catch {
      setError('Erreur lors de la sauvegarde. Réessaie.');
    } finally {
      setLoading(false);
    }
  }
```

- [ ] **Step 3 : Ajouter l'affichage de l'erreur dans le JSX**

Après le `<PressableA11y>` du bouton Confirmer (après la fermeture `</PressableA11y>`), ajouter :

```tsx
      {error && (
        <Text style={[styles.errorText, { color: '#dc2626' }]}>{error}</Text>
      )}
```

- [ ] **Step 4 : Ajouter le style errorText**

Dans `StyleSheet.create({...})`, ajouter :

```typescript
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: -8,
  },
```

- [ ] **Step 5 : Typecheck**

```bash
cd app && npm run typecheck
```

Résultat attendu : aucune erreur.

- [ ] **Step 6 : Tests — pas de régression**

```bash
cd app && npm test -- --no-coverage 2>&1 | tail -5
```

Résultat attendu : `312 passed, 312 total`

- [ ] **Step 7 : Commit**

```bash
git add app/components/session/ExerciseStartingWeightPhase.tsx
git commit -m "fix(session): ExerciseStartingWeightPhase — inline error message on confirm failure"
```

---

## Task 4 — Export : Installer les dépendances

**Files:** aucun fichier modifié manuellement — `npm install` met à jour `package.json` et `package-lock.json`

- [ ] **Step 1 : Installer expo-file-system et expo-sharing**

```bash
cd app && npx expo install expo-file-system expo-sharing
```

Résultat attendu : les deux packages ajoutés dans `dependencies` de `package.json`.

- [ ] **Step 2 : Vérifier les imports TypeScript disponibles**

```bash
cd app && npm run typecheck
```

Résultat attendu : aucune erreur.

---

## Task 5 — Export : ExportService TDD

**Files:**
- Create: `app/services/ExportService.ts`
- Create: `app/services/ExportService.test.ts`

- [ ] **Step 1 : Écrire les tests (RED)**

Créer `app/services/ExportService.test.ts` :

```typescript
import { ExportService } from './ExportService';

jest.mock('expo-file-system', () => ({
  cacheDirectory: '/cache/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

const mockDb = {
  getAllAsync: jest.fn().mockResolvedValue([]),
};

describe('ExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.getAllAsync as jest.Mock).mockResolvedValue([]);
  });

  describe('exportAll', () => {
    it('assembles JSON with all required top-level keys and data sections', async () => {
      const service = new ExportService(mockDb as any);
      await service.exportAll();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FileSystem = require('expo-file-system');
      const [, content] = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0];
      const parsed = JSON.parse(content as string);

      expect(parsed).toMatchObject({
        exportedAt: expect.any(String),
        appVersion: expect.any(String),
        schema: 7,
        data: {
          exercises: [],
          programs: [],
          workouts: [],
          workoutExercises: [],
          blocks: [],
          sets: [],
          sessionLogs: [],
          setLogs: [],
          settings: [],
        },
      });
    });

    it('calls Sharing.shareAsync with a URI containing training-export', async () => {
      const service = new ExportService(mockDb as any);
      await service.exportAll();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sharing = require('expo-sharing');
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        expect.stringContaining('training-export'),
        expect.any(Object),
      );
    });

    it('throws if sharing is not available', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sharing = require('expo-sharing');
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);

      const service = new ExportService(mockDb as any);
      await expect(service.exportAll()).rejects.toThrow('partage');
    });
  });
});
```

- [ ] **Step 2 : Run pour vérifier RED**

```bash
cd app && npm test -- --testPathPattern=ExportService --no-coverage
```

Résultat attendu : erreur `Cannot find module './ExportService'`

- [ ] **Step 3 : Créer ExportService.ts**

Créer `app/services/ExportService.ts` :

```typescript
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import appJson from '../app.json';

export class ExportService {
  constructor(private readonly db: SQLiteDatabase) {}

  async exportAll(): Promise<void> {
    const [
      exercises,
      programs,
      workouts,
      workoutExercises,
      blocks,
      sets,
      sessionLogs,
      setLogs,
      settings,
    ] = await Promise.all([
      this.db.getAllAsync('SELECT * FROM exercises'),
      this.db.getAllAsync('SELECT * FROM programs'),
      this.db.getAllAsync('SELECT * FROM workouts'),
      this.db.getAllAsync('SELECT * FROM workout_exercises'),
      this.db.getAllAsync('SELECT * FROM blocks'),
      this.db.getAllAsync('SELECT * FROM sets'),
      this.db.getAllAsync('SELECT * FROM session_logs'),
      this.db.getAllAsync('SELECT * FROM set_logs'),
      this.db.getAllAsync('SELECT * FROM settings'),
    ]);

    const now = new Date().toISOString();
    const dateStr = now.slice(0, 10);

    const payload = JSON.stringify(
      {
        exportedAt: now,
        appVersion: appJson.expo.version,
        schema: 7,
        data: {
          exercises,
          programs,
          workouts,
          workoutExercises,
          blocks,
          sets,
          sessionLogs,
          setLogs,
          settings,
        },
      },
      null,
      2,
    );

    const uri = `${FileSystem.cacheDirectory}training-export-${dateStr}.json`;
    await FileSystem.writeAsStringAsync(uri, payload, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: "Exporter mes données d'entraînement",
    });
  }
}
```

- [ ] **Step 4 : Run pour vérifier GREEN**

```bash
cd app && npm test -- --testPathPattern=ExportService --no-coverage
```

Résultat attendu : `3 passed, 3 total`

- [ ] **Step 5 : Typecheck**

```bash
cd app && npm run typecheck
```

Résultat attendu : aucune erreur. Si erreur sur `import appJson` : `expo/tsconfig.base` a déjà `resolveJsonModule: true` donc ça doit passer.

- [ ] **Step 6 : Run tous les tests**

```bash
cd app && npm test -- --no-coverage 2>&1 | tail -5
```

Résultat attendu : `315 passed, 315 total`

- [ ] **Step 7 : Commit**

```bash
git add app/services/ExportService.ts app/services/ExportService.test.ts app/package.json app/package-lock.json
git commit -m "feat(export): ExportService — full JSON dump via share sheet (TDD, 3 tests)"
```

---

## Task 6 — Export : UI dans reglages.tsx

**Files:**
- Modify: `app/app/(tabs)/reglages.tsx`

- [ ] **Step 1 : Mettre à jour les imports**

Remplacer :
```typescript
import { useContext } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
```
Par :
```typescript
import { useContext, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
```

Ajouter après les imports existants :
```typescript
import { getDb } from '@/db';
import { ExportService } from '@/services/ExportService';
```

- [ ] **Step 2 : Ajouter les states et le handler dans ReglagesScreen**

Dans la fonction `ReglagesScreen`, après `const { preference: unitsPref, resolved: resolvedUnits, setUnit } = useUnits();`, ajouter :

```typescript
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const service = new ExportService(getDb());
      await service.exportAll();
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Export impossible. Réessaie.');
    } finally {
      setIsExporting(false);
    }
  }, []);
```

- [ ] **Step 3 : Ajouter la section DONNÉES dans le JSX**

Dans le `<ScrollView>`, après la section UNITÉS (après la fermeture `</View>` de la card UNITÉS), ajouter :

```tsx
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DONNÉES</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <PressableA11y
          accessibilityLabel="Exporter toutes mes données d'entraînement au format JSON"
          onPress={handleExport}
          disabled={isExporting}
          style={[styles.exportRow, { opacity: isExporting ? 0.5 : 1 }]}
        >
          <View style={styles.exportInfo}>
            <Text style={[styles.exportLabel, { color: colors.text }]}>Exporter mes données</Text>
            <Text style={[styles.exportMeta, { color: colors.textSecondary }]}>Sauvegarde complète (JSON)</Text>
          </View>
          {isExporting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.exportArrow, { color: colors.primary }]}>→</Text>
          )}
        </PressableA11y>
        {exportError && (
          <Text style={[styles.exportError, { color: '#dc2626' }]}>{exportError}</Text>
        )}
      </View>
```

- [ ] **Step 4 : Ajouter les styles**

Dans `StyleSheet.create({...})`, ajouter :

```typescript
  exportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exportInfo: { flex: 1, gap: 2 },
  exportLabel: { fontSize: 15, fontWeight: '500' },
  exportMeta: { fontSize: 12 },
  exportArrow: { fontSize: 18, fontWeight: '600', marginLeft: 8 },
  exportError: { fontSize: 13, marginTop: 4 },
```

- [ ] **Step 5 : Typecheck**

```bash
cd app && npm run typecheck
```

Résultat attendu : aucune erreur.

- [ ] **Step 6 : Run tous les tests**

```bash
cd app && npm test -- --no-coverage 2>&1 | tail -5
```

Résultat attendu : `315 passed, 315 total`

- [ ] **Step 7 : Commit**

```bash
git add app/app/(tabs)/reglages.tsx
git commit -m "feat(ui): section DONNÉES dans Réglages — bouton export JSON avec share sheet"
```

---

## Vérification finale

- [ ] **Typecheck global**

```bash
cd app && npm run typecheck
```

- [ ] **Lint**

```bash
cd app && npm run lint
```

- [ ] **Tests complets**

```bash
cd app && npm test -- --no-coverage 2>&1 | tail -5
```

Résultat attendu : `315 passed, 315 total`

- [ ] **Mettre à jour le journal**

Ajouter une entrée Session 28 dans `docs/journal/project-log.md` avec : bugs B2+B3 corrigés (B1 stale si vérifié), ExportService livré, section DONNÉES dans Réglages.

- [ ] **Mettre à jour le backlog mémoire**

Marquer dans la mémoire :
- B1 inputs → stale / corrigé par key prop
- B2 poids null → ✅ LIVRÉ
- B3 robustesse confirm → ✅ LIVRÉ
- Export JSON complet → ✅ LIVRÉ

- [ ] **Bump version**

```bash
bash scripts/version-bump.sh patch
```

- [ ] **Commit final journal + version**

```bash
git add docs/journal/project-log.md app/app.json
git commit -m "chore: journal S28 + version bump"
```

---

## Post-session — Backlog mis à jour

**Livré dans cette session :**
- B2 — Poids de départ null → poids conservateurs seedés
- B3 — Robustesse confirm → error state inline
- Export JSON — `ExportService` + UI Réglages

**Reste ouvert :**
- Redéfinir le poids de travail en cours de séance (feature complète, session dédiée)
- Onboarding guidé (priorité haute, supervision utilisateur requise)
- Import JSON (round-trip, session dédiée)
