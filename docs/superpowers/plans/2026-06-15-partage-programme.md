# Partage programme — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Partager un programme complet via QR code (programmes ≤ 2KB compressés) ou fichier JSON (fallback), importable par deep link ou scanner in-app.

**Architecture:** `ShareProgramService` sérialise/compresse (pako) et reconstruit le programme en DB. QR code encode `app://import?data=<base64>`. Deux chemins d'import : `_layout.tsx` (deep link) et `app/scan-programme.tsx` (caméra). Fallback fichier via `ExportService` existant.

**Tech Stack:** TypeScript strict, pako (deflate), react-native-qrcode-svg, expo-camera, expo-linking, expo-sqlite

**Spec:** `docs/superpowers/specs/2026-06-15-partage-programme.md`

---

### Task 1 : Installer les packages

**Files:**
- Modify: `app/package.json` (via npm)

- [ ] **Step 1 : Installer pako, react-native-qrcode-svg, expo-camera**

```bash
cd app && npx expo install pako react-native-qrcode-svg expo-camera
npm install --save-dev @types/pako
```

- [ ] **Step 2 : Vérifier que le scheme deep link est déjà configuré**

```bash
grep "scheme" app.json
```

Attendu : `"scheme": "app"` déjà présent. Le deep link sera `app://import?data=<base64>`. Aucune modification app.json nécessaire.

- [ ] **Step 3 : Typecheck**

```bash
npm run typecheck
```

Attendu : 0 erreurs.

- [ ] **Step 4 : Commit**

```bash
git add app/package.json app/package-lock.json
git commit -m "chore(deps): install pako + react-native-qrcode-svg + expo-camera"
```

---

### Task 2 : compressPayload / decompressPayload (TDD)

**Files:**
- Create: `app/services/ShareProgramService.ts`
- Create: `app/services/ShareProgramService.test.ts`

- [ ] **Step 1 : Écrire le test**

Créer `app/services/ShareProgramService.test.ts` :

```typescript
import { ShareProgramService } from './ShareProgramService';
import { InMemoryProgramRepository } from '../repositories/InMemoryProgramRepository';
import { InMemoryWorkoutRepository } from '../repositories/InMemoryWorkoutRepository';
import { InMemoryWorkoutExerciseRepository } from '../repositories/InMemoryWorkoutExerciseRepository';
import { InMemoryBlockRepository } from '../repositories/InMemoryBlockRepository';
import { InMemorySetRepository } from '../repositories/InMemorySetRepository';
import { InMemoryExerciseRepository } from '../repositories/InMemoryExerciseRepository';

function makeService() {
  return new ShareProgramService(
    new InMemoryProgramRepository(),
    new InMemoryWorkoutRepository(),
    new InMemoryWorkoutExerciseRepository(),
    new InMemoryBlockRepository(),
    new InMemorySetRepository(),
    new InMemoryExerciseRepository(),
  );
}

describe('ShareProgramService — helpers purs', () => {
  const svc = makeService();

  it('compressPayload produit une chaîne base64 non vide', () => {
    const json = JSON.stringify({ v: 1, program: { name: 'Test' }, workouts: [] });
    const result = svc.compressPayload(json);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('decompressPayload est l\'inverse de compressPayload', () => {
    const json = JSON.stringify({ v: 1, program: { name: 'Test' }, workouts: [] });
    const compressed = svc.compressPayload(json);
    const restored = svc.decompressPayload(compressed);
    expect(restored).toBe(json);
  });

  it('compressPayload réduit la taille d\'un gros JSON', () => {
    const big = JSON.stringify({ v: 1, data: 'x'.repeat(1000) });
    const compressed = svc.compressPayload(big);
    expect(compressed.length).toBeLessThan(big.length);
  });
});
```

- [ ] **Step 2 : Vérifier que le test échoue**

```bash
cd app && npx jest ShareProgramService --no-coverage
```

Attendu : FAIL — module introuvable.

- [ ] **Step 3 : Créer ShareProgramService avec les helpers purs**

Créer `app/services/ShareProgramService.ts` :

```typescript
import pako from 'pako';
import type { IProgramRepository } from '../repositories/IProgramRepository';
import type { IWorkoutRepository } from '../repositories/IWorkoutRepository';
import type { IWorkoutExerciseRepository } from '../repositories/IWorkoutExerciseRepository';
import type { IBlockRepository } from '../repositories/IBlockRepository';
import type { ISetRepository } from '../repositories/ISetRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';

export interface SharePayload {
  v: number;
  program: { name: string; description: string | null };
  workouts: ShareWorkout[];
}

interface ShareWorkout {
  name: string;
  order_index: number;
  exercises: ShareExercise[];
}

interface ShareExercise {
  name: string;
  type: string;
  muscle_groups: string;
  blocks: ShareBlock[];
}

interface ShareBlock {
  name: string;
  is_work_block: 0 | 1;
  order_index: number;
  sets: ShareSet[];
}

interface ShareSet {
  reps_min: number;
  weight: number | null;
  weight_type: string;
  rest_duration: number;
  order_index: number;
  duration_seconds: number | null;
  set_type: string;
}

export class ShareProgramService {
  constructor(
    private programRepo: IProgramRepository,
    private workoutRepo: IWorkoutRepository,
    private workoutExerciseRepo: IWorkoutExerciseRepository,
    private blockRepo: IBlockRepository,
    private setRepo: ISetRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  compressPayload(json: string): string {
    const compressed = pako.deflate(json);
    return btoa(String.fromCharCode(...compressed));
  }

  decompressPayload(base64: string): string {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return pako.inflate(bytes, { to: 'string' });
  }

  async generatePayload(_programId: number): Promise<{ base64: string; sizeBytes: number }> {
    throw new Error('not implemented');
  }

  async importPayload(_base64: string): Promise<number> {
    throw new Error('not implemented');
  }
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
cd app && npx jest ShareProgramService --no-coverage
```

Attendu : 3 passed (helpers purs), 0 failed.

- [ ] **Step 5 : Commit**

```bash
git add app/services/ShareProgramService.ts app/services/ShareProgramService.test.ts
git commit -m "feat(ShareProgramService): compressPayload/decompressPayload TDD"
```

---

### Task 3 : generatePayload (TDD)

**Files:**
- Modify: `app/services/ShareProgramService.ts`
- Modify: `app/services/ShareProgramService.test.ts`

- [ ] **Step 1 : Ajouter les tests generatePayload**

Ajouter dans `ShareProgramService.test.ts`, après les tests existants :

```typescript
describe('generatePayload', () => {
  it('sérialise un programme complet et retourne base64 + sizeBytes', async () => {
    const svc = makeService();

    // Seed : programme → workout → exercise → workoutExercise → block → set
    const program = await (svc as any).programRepo.save({ name: 'PPL', description: null, is_active: 1 });
    const workout = await (svc as any).workoutRepo.save({ program_id: program.id, name: 'Push', order_index: 0 });
    const exercise = await (svc as any).exerciseRepo.save({
      name: 'Développé couché', type: 'musculation', muscle_groups: '["pectoraux"]',
      technical_notes: null, description: null, is_custom: 0, progression_step: 2.5, progression_threshold: 1,
    });
    const we = await (svc as any).workoutExerciseRepo.save({ workout_id: workout.id, exercise_id: exercise.id, order_index: 0 });
    const block = await (svc as any).blockRepo.save({ workout_exercise_id: we.id, name: 'Travail', order_index: 0, is_work_block: 1 });
    await (svc as any).setRepo.save({
      block_id: block.id, reps_min: 5, weight: 60, weight_type: 'fixed',
      rest_duration: 180, order_index: 0, set_type: 'normal',
    });

    const result = await svc.generatePayload(program.id);
    expect(typeof result.base64).toBe('string');
    expect(result.sizeBytes).toBeGreaterThan(0);

    const json = svc.decompressPayload(result.base64);
    const payload: SharePayload = JSON.parse(json);
    expect(payload.v).toBe(1);
    expect(payload.program.name).toBe('PPL');
    expect(payload.workouts).toHaveLength(1);
    expect(payload.workouts[0].exercises).toHaveLength(1);
    expect(payload.workouts[0].exercises[0].blocks).toHaveLength(1);
    expect(payload.workouts[0].exercises[0].blocks[0].sets).toHaveLength(1);
  });
});
```

- [ ] **Step 2 : Lancer pour vérifier l'échec**

```bash
cd app && npx jest ShareProgramService --no-coverage
```

Attendu : FAIL — "not implemented".

- [ ] **Step 3 : Implémenter generatePayload**

Remplacer la méthode `generatePayload` dans `ShareProgramService.ts` :

```typescript
async generatePayload(programId: number): Promise<{ base64: string; sizeBytes: number }> {
  const program = await this.programRepo.findById(programId);
  if (!program) throw new Error(`Programme ${programId} introuvable`);

  const workouts = await this.workoutRepo.findByProgramId(programId);

  const shareWorkouts: ShareWorkout[] = await Promise.all(
    workouts.map(async (w) => {
      const wes = await this.workoutExerciseRepo.findByWorkoutId(w.id);
      const exercises: ShareExercise[] = await Promise.all(
        wes.map(async (we) => {
          const exercise = await this.exerciseRepo.findById(we.exercise_id);
          const blocks = await this.blockRepo.findByWorkoutExerciseId(we.id);
          const shareBlocks: ShareBlock[] = await Promise.all(
            blocks.map(async (b) => {
              const sets = await this.setRepo.findByBlockId(b.id);
              return {
                name: b.name,
                is_work_block: b.is_work_block,
                order_index: b.order_index,
                sets: sets.map(s => ({
                  reps_min: s.reps_min,
                  weight: s.weight,
                  weight_type: s.weight_type,
                  rest_duration: s.rest_duration,
                  order_index: s.order_index,
                  duration_seconds: s.duration_seconds,
                  set_type: s.set_type,
                })),
              };
            }),
          );
          return {
            name: exercise?.name ?? '',
            type: exercise?.type ?? 'musculation',
            muscle_groups: exercise?.muscle_groups ?? '[]',
            blocks: shareBlocks,
          };
        }),
      );
      return { name: w.name, order_index: w.order_index, exercises };
    }),
  );

  const payload: SharePayload = {
    v: 1,
    program: { name: program.name, description: program.description },
    workouts: shareWorkouts,
  };

  const json = JSON.stringify(payload);
  const base64 = this.compressPayload(json);
  return { base64, sizeBytes: base64.length };
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
cd app && npx jest ShareProgramService --no-coverage
```

Attendu : tous passent.

- [ ] **Step 5 : Commit**

```bash
git add app/services/ShareProgramService.ts app/services/ShareProgramService.test.ts
git commit -m "feat(ShareProgramService): generatePayload — sérialise programme complet"
```

---

### Task 4 : importPayload (TDD)

**Files:**
- Modify: `app/services/ShareProgramService.ts`
- Modify: `app/services/ShareProgramService.test.ts`

- [ ] **Step 1 : Ajouter les tests importPayload**

Ajouter dans `ShareProgramService.test.ts` :

```typescript
describe('importPayload', () => {
  it('crée programme + workouts + exercises + sets depuis le payload', async () => {
    const svc = makeService();
    const payload: SharePayload = {
      v: 1,
      program: { name: 'PPL', description: 'Push Pull Legs' },
      workouts: [{
        name: 'Push', order_index: 0,
        exercises: [{
          name: 'Développé couché', type: 'musculation', muscle_groups: '["pectoraux"]',
          blocks: [{
            name: 'Travail', is_work_block: 1, order_index: 0,
            sets: [{ reps_min: 5, weight: 60, weight_type: 'fixed', rest_duration: 180, order_index: 0, duration_seconds: null, set_type: 'normal' }],
          }],
        }],
      }],
    };
    const base64 = svc.compressPayload(JSON.stringify(payload));
    const newId = await svc.importPayload(base64);
    expect(newId).toBeGreaterThan(0);

    const programs = await (svc as any).programRepo.findAll();
    expect(programs).toHaveLength(1);
    expect(programs[0].name).toBe('PPL');
  });

  it('suffixe "(importé)" si nom de programme déjà existant', async () => {
    const svc = makeService();
    await (svc as any).programRepo.save({ name: 'PPL', description: null, is_active: 1 });

    const payload: SharePayload = {
      v: 1,
      program: { name: 'PPL', description: null },
      workouts: [],
    };
    const base64 = svc.compressPayload(JSON.stringify(payload));
    await svc.importPayload(base64);

    const programs = await (svc as any).programRepo.findAll();
    const names = programs.map((p: { name: string }) => p.name);
    expect(names).toContain('PPL (importé)');
  });

  it('round-trip : generatePayload → importPayload → structure identique', async () => {
    const svc = makeService();
    const program = await (svc as any).programRepo.save({ name: 'PPL', description: null, is_active: 1 });
    const workout = await (svc as any).workoutRepo.save({ program_id: program.id, name: 'Push', order_index: 0 });
    const exercise = await (svc as any).exerciseRepo.save({
      name: 'Développé couché', type: 'musculation', muscle_groups: '[]',
      technical_notes: null, description: null, is_custom: 0, progression_step: 2.5, progression_threshold: 1,
    });
    const we = await (svc as any).workoutExerciseRepo.save({ workout_id: workout.id, exercise_id: exercise.id, order_index: 0 });
    const block = await (svc as any).blockRepo.save({ workout_exercise_id: we.id, name: 'Travail', order_index: 0, is_work_block: 1 });
    await (svc as any).setRepo.save({ block_id: block.id, reps_min: 5, weight: 60, weight_type: 'fixed', rest_duration: 180, order_index: 0, set_type: 'normal' });

    const { base64 } = await svc.generatePayload(program.id);
    const newId = await svc.importPayload(base64);

    const imported = await (svc as any).programRepo.findById(newId);
    expect(imported.name).toBe('PPL (importé)');
    const importedWorkouts = await (svc as any).workoutRepo.findByProgramId(newId);
    expect(importedWorkouts).toHaveLength(1);
    expect(importedWorkouts[0].name).toBe('Push');
  });
});
```

- [ ] **Step 2 : Lancer pour vérifier l'échec**

```bash
cd app && npx jest ShareProgramService --no-coverage
```

Attendu : FAIL — "not implemented".

- [ ] **Step 3 : Implémenter importPayload**

Remplacer la méthode `importPayload` dans `ShareProgramService.ts` :

```typescript
async importPayload(base64: string): Promise<number> {
  const json = this.decompressPayload(base64);
  const payload: SharePayload = JSON.parse(json);

  // Résoudre le nom (conflit)
  const existing = await this.programRepo.findAll();
  const names = existing.map(p => p.name);
  const programName = names.includes(payload.program.name)
    ? `${payload.program.name} (importé)`
    : payload.program.name;

  const program = await this.programRepo.save({
    name: programName,
    description: payload.program.description,
    is_active: 0,
  });

  for (const sw of payload.workouts) {
    const workout = await this.workoutRepo.save({
      program_id: program.id,
      name: sw.name,
      order_index: sw.order_index,
    });

    for (let exIdx = 0; exIdx < sw.exercises.length; exIdx++) {
      const se = sw.exercises[exIdx];

      // Réutiliser exercice existant ou créer
      let exercise = await this.exerciseRepo.findByName(se.name);
      if (!exercise) {
        exercise = await this.exerciseRepo.save({
          name: se.name,
          type: se.type as any,
          muscle_groups: se.muscle_groups,
          technical_notes: null,
          description: null,
          is_custom: 0,
          progression_step: 2.5,
          progression_threshold: 1,
        });
      }

      const we = await this.workoutExerciseRepo.save({
        workout_id: workout.id,
        exercise_id: exercise.id,
        order_index: exIdx,
      });

      for (const sb of se.blocks) {
        const block = await this.blockRepo.save({
          workout_exercise_id: we.id,
          name: sb.name,
          order_index: sb.order_index,
          is_work_block: sb.is_work_block,
        });

        for (const ss of sb.sets) {
          await this.setRepo.save({
            block_id: block.id,
            reps_min: ss.reps_min,
            weight: ss.weight,
            weight_type: ss.weight_type as any,
            rest_duration: ss.rest_duration,
            order_index: ss.order_index,
            duration_seconds: ss.duration_seconds,
            set_type: ss.set_type as any,
          });
        }
      }
    }
  }

  return program.id;
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
cd app && npx jest ShareProgramService --no-coverage
```

Attendu : tous passent.

- [ ] **Step 5 : Typecheck**

```bash
npm run typecheck
```

Attendu : 0 erreurs.

- [ ] **Step 6 : Commit**

```bash
git add app/services/ShareProgramService.ts app/services/ShareProgramService.test.ts
git commit -m "feat(ShareProgramService): importPayload TDD — round-trip + conflit nom"
```

---

### Task 5 : ShareQRModal

**Files:**
- Create: `app/components/programme/ShareQRModal.tsx`

- [ ] **Step 1 : Créer le composant**

Créer `app/components/programme/ShareQRModal.tsx` :

```typescript
import React from 'react';
import { View, Text, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface Props {
  visible: boolean;
  base64: string;         // payload compressé
  programName: string;
  onClose: () => void;
}

const QR_SIZE = 240;

export function ShareQRModal({ visible, base64, programName, onClose }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const url = `app://import?data=${base64}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Partager "{programName}"</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            L'autre personne scanne ce QR avec sa caméra ou l'app
          </Text>

          <View
            style={styles.qrWrapper}
            accessible
            accessibilityLabel={`QR code pour partager le programme ${programName}`}
          >
            <QRCode value={url} size={QR_SIZE} />
          </View>

          <PressableA11y
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.primary }]}
            accessibilityLabel="Fermer"
            accessibilityRole="button"
          >
            <Text style={styles.closeBtnText}>Fermer</Text>
          </PressableA11y>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { borderRadius: 16, padding: 24, alignItems: 'center', width: '100%', maxWidth: 340 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 13, textAlign: 'center', marginBottom: 24 },
  qrWrapper: { padding: 16, backgroundColor: '#fff', borderRadius: 12, marginBottom: 24 },
  closeBtn: { paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10 },
  closeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
```

- [ ] **Step 2 : Typecheck**

```bash
npm run typecheck
```

Attendu : 0 erreurs.

- [ ] **Step 3 : Commit**

```bash
git add app/components/programme/ShareQRModal.tsx
git commit -m "feat(ShareQRModal): modal QR code partage programme"
```

---

### Task 6 : Écran scan-programme.tsx

**Files:**
- Create: `app/app/scan-programme.tsx`

- [ ] **Step 1 : Créer l'écran scanner**

Créer `app/app/scan-programme.tsx` :

```typescript
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { getDb } from '@/db';
import { ShareProgramService } from '@/services/ShareProgramService';
import { SQLiteProgramRepository } from '@/repositories/SQLiteProgramRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '@/repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '@/repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

function makeService() {
  const db = getDb();
  return new ShareProgramService(
    new SQLiteProgramRepository(db),
    new SQLiteWorkoutRepository(db),
    new SQLiteWorkoutExerciseRepository(db),
    new SQLiteBlockRepository(db),
    new SQLiteSetRepository(db),
    new SQLiteExerciseRepository(db),
  );
}

export default function ScanProgrammeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();
  const colors = Colors[useColorScheme() ?? 'light'];

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission, requestPermission]);

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    try {
      const url = new URL(data);
      const base64 = url.searchParams.get('data');
      if (!base64) throw new Error('QR invalide');

      const svc = makeService();
      const programId = await svc.importPayload(base64);
      router.replace(`/programme/${programId}`);
    } catch {
      Alert.alert('Erreur', 'QR code invalide ou programme corrompu.', [
        { text: 'Réessayer', onPress: () => setScanned(false) },
        { text: 'Annuler', onPress: () => router.back() },
      ]);
    }
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.msg, { color: colors.text }]}>
          Autorise l'accès à la caméra dans les Réglages de ton téléphone.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
      <View style={styles.overlay}>
        <Text style={styles.hint}>Pointe la caméra vers le QR code du programme</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    position: 'absolute', bottom: 60, left: 0, right: 0,
    alignItems: 'center', paddingHorizontal: 24,
  },
  hint: {
    color: '#fff', fontSize: 15, textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
  },
  msg: { fontSize: 16, textAlign: 'center', margin: 32 },
});
```

- [ ] **Step 2 : Enregistrer la route dans _layout.tsx**

Dans `app/app/_layout.tsx`, dans le Stack, ajouter :

```typescript
<Stack.Screen name="scan-programme" options={{ title: 'Scanner un programme', headerShown: true }} />
```

- [ ] **Step 3 : Typecheck**

```bash
npm run typecheck
```

Attendu : 0 erreurs.

- [ ] **Step 4 : Commit**

```bash
git add app/app/scan-programme.tsx app/app/_layout.tsx
git commit -m "feat(scan-programme): scanner QR code pour importer un programme"
```

---

### Task 7 : Deep link handler dans _layout.tsx

**Files:**
- Modify: `app/app/_layout.tsx`

- [ ] **Step 1 : Ajouter le handler deep link**

Dans `app/app/_layout.tsx`, ajouter après les imports existants :

```typescript
import { useURL } from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { getDb } from '@/db';
import { ShareProgramService } from '@/services/ShareProgramService';
import { SQLiteProgramRepository } from '@/repositories/SQLiteProgramRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '@/repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '@/repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
```

Dans le composant racine (avant le return), ajouter :

```typescript
const url = useURL();
const router = useRouter();

useEffect(() => {
  if (!url) return;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'import') {
      const data = parsed.searchParams.get('data');
      if (!data) return;
      const db = getDb();
      const svc = new ShareProgramService(
        new SQLiteProgramRepository(db),
        new SQLiteWorkoutRepository(db),
        new SQLiteWorkoutExerciseRepository(db),
        new SQLiteBlockRepository(db),
        new SQLiteSetRepository(db),
        new SQLiteExerciseRepository(db),
      );
      svc.importPayload(data).then(programId => {
        router.push(`/programme/${programId}`);
      }).catch(console.error);
    }
  } catch {
    // URL non parseable — ignorer
  }
}, [url, router]);
```

Note : `app://import?data=...` → `parsed.hostname === 'import'`.

- [ ] **Step 2 : Typecheck**

```bash
npm run typecheck
```

Attendu : 0 erreurs.

- [ ] **Step 3 : Commit**

```bash
git add app/app/_layout.tsx
git commit -m "feat(_layout): deep link handler app://import pour importer programme via QR"
```

---

### Task 8 : Bouton "Partager" dans programme/[id].tsx + lien scanner dans programmes.tsx

**Files:**
- Modify: `app/app/programme/[id].tsx`
- Modify: `app/app/(tabs)/programmes.tsx`

- [ ] **Step 1 : Ajouter le bouton Partager dans programme/[id].tsx**

En haut de `app/app/programme/[id].tsx`, ajouter les imports :

```typescript
import { useState, useCallback } from 'react';
import * as Sharing from 'expo-sharing';
import { getDb } from '@/db';
import { ShareProgramService } from '@/services/ShareProgramService';
import { SQLiteProgramRepository } from '@/repositories/SQLiteProgramRepository';
import { SQLiteWorkoutRepository } from '@/repositories/SQLiteWorkoutRepository';
import { SQLiteWorkoutExerciseRepository } from '@/repositories/SQLiteWorkoutExerciseRepository';
import { SQLiteBlockRepository } from '@/repositories/SQLiteBlockRepository';
import { SQLiteSetRepository } from '@/repositories/SQLiteSetRepository';
import { SQLiteExerciseRepository } from '@/repositories/SQLiteExerciseRepository';
import { ExportService } from '@/services/ExportService';
import { ShareQRModal } from '@/components/programme/ShareQRModal';
```

Dans le composant, ajouter le state et le handler :

```typescript
const [shareBase64, setShareBase64] = useState<string | null>(null);
const [isSharing, setIsSharing] = useState(false);

const handleShare = useCallback(async () => {
  if (isSharing || !program) return;
  setIsSharing(true);
  try {
    const db = getDb();
    const svc = new ShareProgramService(
      new SQLiteProgramRepository(db),
      new SQLiteWorkoutRepository(db),
      new SQLiteWorkoutExerciseRepository(db),
      new SQLiteBlockRepository(db),
      new SQLiteSetRepository(db),
      new SQLiteExerciseRepository(db),
    );
    const { base64, sizeBytes } = await svc.generatePayload(programId);
    if (sizeBytes <= 2048) {
      setShareBase64(base64);
    } else {
      // Fallback : partage fichier JSON
      const exportSvc = new ExportService(db);
      await exportSvc.exportAll();
    }
  } catch {
    // silencieux — l'utilisateur voit juste rien
  } finally {
    setIsSharing(false);
  }
}, [isSharing, program, programId]);
```

Ajouter le bouton dans le header (avant ou après le bouton existant d'édition) :

```tsx
<PressableA11y
  onPress={handleShare}
  disabled={isSharing}
  accessibilityLabel="Partager ce programme"
  accessibilityRole="button"
>
  <Ionicons name="share-outline" size={24} color={colors.text} />
</PressableA11y>
```

Ajouter le modal en bas du composant (avant le `</View>` final) :

```tsx
{shareBase64 && program && (
  <ShareQRModal
    visible={!!shareBase64}
    base64={shareBase64}
    programName={program.name}
    onClose={() => setShareBase64(null)}
  />
)}
```

- [ ] **Step 2 : Ajouter le lien scanner dans programmes.tsx**

Dans `app/app/(tabs)/programmes.tsx`, ajouter un bouton "Scanner un programme" (icône `qr-code-outline`) dans le header ou en FAB secondaire :

```typescript
import { useRouter } from 'expo-router';
// ...dans le composant :
const router = useRouter();
// ...dans le JSX :
<PressableA11y
  onPress={() => router.push('/scan-programme')}
  accessibilityLabel="Scanner un programme partagé"
  accessibilityRole="button"
>
  <Ionicons name="qr-code-outline" size={24} color={colors.text} />
</PressableA11y>
```

- [ ] **Step 3 : Typecheck + tests complets**

```bash
npm run typecheck && npx jest --no-coverage
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 4 : Commit**

```bash
git add app/app/programme/[id].tsx app/app/(tabs)/programmes.tsx
git commit -m "feat(partage-programme): bouton Partager + scanner QR intégrés"
```
