# Mesures corporelles — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un segment "Corps" dans l'onglet Progression pour saisir et visualiser les mesures corporelles (poids, tour de taille, bras, cuisse, hanches).

**Architecture:** Migration v15 → `IBodyMeasurementRepository` (InMemory + SQLite + contrats) → `BodyMeasurementService` → `useBodyMeasurements` hook → 3 composants UI → 3e segment dans `progression.tsx`. Toutes les métriques optionnelles, upsert par date.

**Tech Stack:** TypeScript strict, expo-sqlite, Jest TDD, react-native-gifted-charts (déjà installé)

**Spec:** `docs/superpowers/specs/2026-06-15-mesures-corporelles.md`

---

### Task 1 : Migration v15 + types

**Files:**
- Modify: `app/db/schema.ts`
- Modify: `app/db/types.ts`

- [ ] **Step 1 : Ajouter la migration v15 dans schema.ts**

Dans `app/db/schema.ts`, après le commentaire `// v14`, ajouter :

```typescript
  // v15 — mesures corporelles : poids + circonférences (toutes optionnelles)
  `
  CREATE TABLE IF NOT EXISTS body_measurements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL UNIQUE,
    weight_kg   REAL,
    waist_cm    REAL,
    arm_cm      REAL,
    thigh_cm    REAL,
    hip_cm      REAL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,
```

- [ ] **Step 2 : Ajouter les types dans types.ts**

Dans `app/db/types.ts`, ajouter à la fin :

```typescript
export interface BodyMeasurement {
  id: number;
  date: string;             // 'YYYY-MM-DD'
  weight_kg: number | null;
  waist_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  hip_cm: number | null;
  created_at: string;
}

export type CreateBodyMeasurementDto = Omit<BodyMeasurement, 'id' | 'created_at'>;
```

- [ ] **Step 3 : Typecheck**

```bash
cd app && npm run typecheck
```

Attendu : 0 erreurs.

- [ ] **Step 4 : Commit**

```bash
git add app/db/schema.ts app/db/types.ts
git commit -m "feat(db): migration v15 — table body_measurements"
```

---

### Task 2 : IBodyMeasurementRepository + InMemory + contrats

**Files:**
- Create: `app/repositories/IBodyMeasurementRepository.ts`
- Create: `app/repositories/InMemoryBodyMeasurementRepository.ts`
- Create: `app/repositories/bodyMeasurementRepository.contract.ts`

- [ ] **Step 1 : Créer l'interface**

Créer `app/repositories/IBodyMeasurementRepository.ts` :

```typescript
import type { BodyMeasurement, CreateBodyMeasurementDto } from '../db/types';

export interface IBodyMeasurementRepository {
  save(dto: CreateBodyMeasurementDto): Promise<BodyMeasurement>;   // upsert par date
  getHistory(limit?: number): Promise<BodyMeasurement[]>;          // DESC par date
  getLatest(): Promise<BodyMeasurement | null>;
}
```

- [ ] **Step 2 : Créer InMemoryBodyMeasurementRepository**

Créer `app/repositories/InMemoryBodyMeasurementRepository.ts` :

```typescript
import type { IBodyMeasurementRepository } from './IBodyMeasurementRepository';
import type { BodyMeasurement, CreateBodyMeasurementDto } from '../db/types';

export class InMemoryBodyMeasurementRepository implements IBodyMeasurementRepository {
  private records: BodyMeasurement[] = [];
  private nextId = 1;

  async save(dto: CreateBodyMeasurementDto): Promise<BodyMeasurement> {
    const existing = this.records.findIndex(r => r.date === dto.date);
    const record: BodyMeasurement = {
      id: existing !== -1 ? this.records[existing].id : this.nextId++,
      date: dto.date,
      weight_kg: dto.weight_kg,
      waist_cm: dto.waist_cm,
      arm_cm: dto.arm_cm,
      thigh_cm: dto.thigh_cm,
      hip_cm: dto.hip_cm,
      created_at: new Date().toISOString(),
    };
    if (existing !== -1) {
      this.records[existing] = record;
    } else {
      this.records.push(record);
    }
    return record;
  }

  async getHistory(limit?: number): Promise<BodyMeasurement[]> {
    const sorted = [...this.records].sort((a, b) => b.date.localeCompare(a.date));
    return limit !== undefined ? sorted.slice(0, limit) : sorted;
  }

  async getLatest(): Promise<BodyMeasurement | null> {
    if (this.records.length === 0) return null;
    return [...this.records].sort((a, b) => b.date.localeCompare(a.date))[0];
  }
}
```

- [ ] **Step 3 : Créer les contrats**

Créer `app/repositories/bodyMeasurementRepository.contract.ts` :

```typescript
import type { IBodyMeasurementRepository } from './IBodyMeasurementRepository';

const dto1 = { date: '2026-06-01', weight_kg: 75.5, waist_cm: 80, arm_cm: null, thigh_cm: null, hip_cm: null };
const dto2 = { date: '2026-06-08', weight_kg: 75.0, waist_cm: 79, arm_cm: 35, thigh_cm: null, hip_cm: null };

export function runBodyMeasurementRepositoryContractTests(createRepo: () => IBodyMeasurementRepository) {
  let repo: IBodyMeasurementRepository;
  beforeEach(() => { repo = createRepo(); });

  describe('save', () => {
    it('crée une mesure avec id généré', async () => {
      const result = await repo.save(dto1);
      expect(result.id).toBeGreaterThan(0);
      expect(result.weight_kg).toBe(75.5);
      expect(result.arm_cm).toBeNull();
    });

    it('upsert sur même date — met à jour sans dupliquer', async () => {
      const first = await repo.save(dto1);
      const updated = await repo.save({ ...dto1, weight_kg: 76.0 });
      expect(updated.id).toBe(first.id);
      expect(updated.weight_kg).toBe(76.0);
      const history = await repo.getHistory();
      expect(history).toHaveLength(1);
    });
  });

  describe('getHistory', () => {
    it('retourne tableau vide sans données', async () => {
      expect(await repo.getHistory()).toHaveLength(0);
    });

    it('retourne les mesures en ordre DESC par date', async () => {
      await repo.save(dto1);
      await repo.save(dto2);
      const history = await repo.getHistory();
      expect(history[0].date).toBe('2026-06-08');
      expect(history[1].date).toBe('2026-06-01');
    });

    it('retourne max N entrées si limit fourni', async () => {
      await repo.save(dto1);
      await repo.save(dto2);
      expect(await repo.getHistory(1)).toHaveLength(1);
    });
  });

  describe('getLatest', () => {
    it('retourne null sans données', async () => {
      expect(await repo.getLatest()).toBeNull();
    });

    it('retourne la mesure la plus récente', async () => {
      await repo.save(dto1);
      await repo.save(dto2);
      const latest = await repo.getLatest();
      expect(latest?.date).toBe('2026-06-08');
    });
  });
}
```

- [ ] **Step 4 : Créer le fichier de test InMemory**

Créer `app/repositories/InMemoryBodyMeasurementRepository.test.ts` :

```typescript
import { InMemoryBodyMeasurementRepository } from './InMemoryBodyMeasurementRepository';
import { runBodyMeasurementRepositoryContractTests } from './bodyMeasurementRepository.contract';

runBodyMeasurementRepositoryContractTests(() => new InMemoryBodyMeasurementRepository());
```

- [ ] **Step 5 : Lancer les tests**

```bash
cd app && npx jest InMemoryBodyMeasurement --no-coverage
```

Attendu : 6 tests passent.

- [ ] **Step 6 : Commit**

```bash
git add app/repositories/IBodyMeasurementRepository.ts app/repositories/InMemoryBodyMeasurementRepository.ts app/repositories/bodyMeasurementRepository.contract.ts app/repositories/InMemoryBodyMeasurementRepository.test.ts
git commit -m "feat(repo): IBodyMeasurementRepository + InMemory + contrats TDD"
```

---

### Task 3 : SQLiteBodyMeasurementRepository

**Files:**
- Create: `app/repositories/SQLiteBodyMeasurementRepository.ts`
- Create: `app/repositories/SQLiteBodyMeasurementRepository.test.ts`

- [ ] **Step 1 : Créer SQLiteBodyMeasurementRepository**

Créer `app/repositories/SQLiteBodyMeasurementRepository.ts` :

```typescript
import type { SQLiteDatabase } from 'expo-sqlite';
import type { IBodyMeasurementRepository } from './IBodyMeasurementRepository';
import type { BodyMeasurement, CreateBodyMeasurementDto } from '../db/types';

export class SQLiteBodyMeasurementRepository implements IBodyMeasurementRepository {
  constructor(private db: SQLiteDatabase) {}

  async save(dto: CreateBodyMeasurementDto): Promise<BodyMeasurement> {
    await this.db.runAsync(
      `INSERT INTO body_measurements (date, weight_kg, waist_cm, arm_cm, thigh_cm, hip_cm)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         weight_kg = excluded.weight_kg,
         waist_cm  = excluded.waist_cm,
         arm_cm    = excluded.arm_cm,
         thigh_cm  = excluded.thigh_cm,
         hip_cm    = excluded.hip_cm`,
      [dto.date, dto.weight_kg, dto.waist_cm, dto.arm_cm, dto.thigh_cm, dto.hip_cm],
    );
    const row = await this.db.getFirstAsync<BodyMeasurement>(
      'SELECT * FROM body_measurements WHERE date = ?',
      [dto.date],
    );
    return row!;
  }

  async getHistory(limit?: number): Promise<BodyMeasurement[]> {
    const sql = limit !== undefined
      ? 'SELECT * FROM body_measurements ORDER BY date DESC LIMIT ?'
      : 'SELECT * FROM body_measurements ORDER BY date DESC';
    const params = limit !== undefined ? [limit] : [];
    return this.db.getAllAsync<BodyMeasurement>(sql, params);
  }

  async getLatest(): Promise<BodyMeasurement | null> {
    return (await this.db.getFirstAsync<BodyMeasurement>(
      'SELECT * FROM body_measurements ORDER BY date DESC LIMIT 1',
    )) ?? null;
  }
}
```

- [ ] **Step 2 : Créer le test SQLite**

Créer `app/repositories/SQLiteBodyMeasurementRepository.test.ts` :

```typescript
import { SQLiteBodyMeasurementRepository } from './SQLiteBodyMeasurementRepository';
import { runBodyMeasurementRepositoryContractTests } from './bodyMeasurementRepository.contract';
import { openDatabaseSync } from 'expo-sqlite';
import { runMigrations } from '../db/schema';

runBodyMeasurementRepositoryContractTests(() => {
  const db = openDatabaseSync(':memory:');
  runMigrations(db);
  return new SQLiteBodyMeasurementRepository(db);
});
```

- [ ] **Step 3 : Lancer les tests SQLite**

```bash
cd app && npx jest SQLiteBodyMeasurement --no-coverage
```

Attendu : 6 tests passent.

- [ ] **Step 4 : Commit**

```bash
git add app/repositories/SQLiteBodyMeasurementRepository.ts app/repositories/SQLiteBodyMeasurementRepository.test.ts
git commit -m "feat(repo): SQLiteBodyMeasurementRepository — upsert par date"
```

---

### Task 4 : BodyMeasurementService (TDD)

**Files:**
- Create: `app/services/BodyMeasurementService.ts`
- Create: `app/services/BodyMeasurementService.test.ts`

- [ ] **Step 1 : Écrire les tests**

Créer `app/services/BodyMeasurementService.test.ts` :

```typescript
import { BodyMeasurementService } from './BodyMeasurementService';
import { InMemoryBodyMeasurementRepository } from '../repositories/InMemoryBodyMeasurementRepository';

function make() {
  return new BodyMeasurementService(new InMemoryBodyMeasurementRepository());
}

describe('BodyMeasurementService', () => {
  it('save délègue au repo', async () => {
    const svc = make();
    const result = await svc.save({ date: '2026-06-01', weight_kg: 75, waist_cm: null, arm_cm: null, thigh_cm: null, hip_cm: null });
    expect(result.weight_kg).toBe(75);
  });

  it('save avec valeurs partielles (champs null)', async () => {
    const svc = make();
    const result = await svc.save({ date: '2026-06-01', weight_kg: null, waist_cm: 80, arm_cm: null, thigh_cm: null, hip_cm: null });
    expect(result.waist_cm).toBe(80);
    expect(result.weight_kg).toBeNull();
  });

  it('getHistory retourne les mesures triées DESC', async () => {
    const svc = make();
    await svc.save({ date: '2026-06-01', weight_kg: 75, waist_cm: null, arm_cm: null, thigh_cm: null, hip_cm: null });
    await svc.save({ date: '2026-06-08', weight_kg: 74.5, waist_cm: null, arm_cm: null, thigh_cm: null, hip_cm: null });
    const history = await svc.getHistory();
    expect(history[0].date).toBe('2026-06-08');
  });

  it('getLatest retourne null sans données', async () => {
    expect(await make().getLatest()).toBeNull();
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

```bash
cd app && npx jest BodyMeasurementService --no-coverage
```

Attendu : FAIL — module introuvable.

- [ ] **Step 3 : Créer BodyMeasurementService**

Créer `app/services/BodyMeasurementService.ts` :

```typescript
import type { IBodyMeasurementRepository } from '../repositories/IBodyMeasurementRepository';
import type { BodyMeasurement, CreateBodyMeasurementDto } from '../db/types';

export class BodyMeasurementService {
  constructor(private repo: IBodyMeasurementRepository) {}

  save(dto: CreateBodyMeasurementDto): Promise<BodyMeasurement> {
    return this.repo.save(dto);
  }

  getHistory(limit?: number): Promise<BodyMeasurement[]> {
    return this.repo.getHistory(limit);
  }

  getLatest(): Promise<BodyMeasurement | null> {
    return this.repo.getLatest();
  }
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
cd app && npx jest BodyMeasurementService --no-coverage
```

Attendu : 4 tests passent.

- [ ] **Step 5 : Commit**

```bash
git add app/services/BodyMeasurementService.ts app/services/BodyMeasurementService.test.ts
git commit -m "feat(BodyMeasurementService): TDD — save/getHistory/getLatest"
```

---

### Task 5 : useBodyMeasurements hook

**Files:**
- Create: `app/hooks/useBodyMeasurements.ts`

- [ ] **Step 1 : Créer le hook**

Créer `app/hooks/useBodyMeasurements.ts` :

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { BodyMeasurementService } from '../services/BodyMeasurementService';
import { SQLiteBodyMeasurementRepository } from '../repositories/SQLiteBodyMeasurementRepository';
import { getDb } from '../db';
import type { BodyMeasurement, CreateBodyMeasurementDto } from '../db/types';

function makeService() {
  return new BodyMeasurementService(new SQLiteBodyMeasurementRepository(getDb()));
}

export function useBodyMeasurements() {
  const serviceRef = useRef<BodyMeasurementService | null>(null);
  if (serviceRef.current == null) serviceRef.current = makeService();
  const service = serviceRef.current;

  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [latest, setLatest] = useState<BodyMeasurement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [all, lat] = await Promise.all([service.getHistory(), service.getLatest()]);
      if (mountedRef.current) {
        setMeasurements(all);
        setLatest(lat);
      }
    } catch (err) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [service]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(async (dto: CreateBodyMeasurementDto) => {
    await service.save(dto);
    await refresh();
  }, [service, refresh]);

  return { measurements, latest, isLoading, error, refresh, save };
}
```

- [ ] **Step 2 : Typecheck**

```bash
cd app && npm run typecheck
```

Attendu : 0 erreurs.

- [ ] **Step 3 : Commit**

```bash
git add app/hooks/useBodyMeasurements.ts
git commit -m "feat(useBodyMeasurements): hook — measurements + latest + save + refresh"
```

---

### Task 6 : AddMeasurementSheet

**Files:**
- Create: `app/components/progression/AddMeasurementSheet.tsx`

- [ ] **Step 1 : Créer le composant**

Créer `app/components/progression/AddMeasurementSheet.tsx` :

```typescript
import { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { CreateBodyMeasurementDto } from '@/db/types';

interface Props {
  onSave: (dto: CreateBodyMeasurementDto) => Promise<void>;
  useKg?: boolean;    // true = kg/cm, false = lbs/in
}

export interface AddMeasurementSheetRef {
  expand: () => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const AddMeasurementSheet = forwardRef<AddMeasurementSheetRef, Props>(
function AddMeasurementSheet({ onSave, useKg = true }, ref) {
  const sheetRef = useRef<BottomSheet>(null);

  useImperativeHandle(ref, () => ({
    expand: () => sheetRef.current?.expand(),
  }));
  const colors = Colors[useColorScheme() ?? 'light'];

  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [arm, setArm] = useState('');
  const [thigh, setThigh] = useState('');
  const [hip, setHip] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const weightLabel = useKg ? 'Poids (kg)' : 'Poids (lbs)';
  const circumLabel = useKg ? 'cm' : 'in';

  const parseOptional = (v: string): number | null => {
    const n = parseFloat(v.replace(',', '.'));
    return isNaN(n) ? null : n;
  };

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave({
        date,
        weight_kg: parseOptional(weight),
        waist_cm: parseOptional(waist),
        arm_cm: parseOptional(arm),
        thigh_cm: parseOptional(thigh),
        hip_cm: parseOptional(hip),
      });
      setWeight(''); setWaist(''); setArm(''); setThigh(''); setHip('');
      setDate(todayISO());
      sheetRef.current?.close();
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, onSave, date, weight, waist, arm, thigh, hip]);

  const field = (label: string, value: string, setter: (v: string) => void, a11yLabel: string) => (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
        value={value}
        onChangeText={setter}
        keyboardType="decimal-pad"
        placeholder="—"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={a11yLabel}
      />
    </View>
  );

  return (
    <BottomSheet ref={sheetRef} index={-1} snapPoints={['70%']} enablePanDownToClose>
      <BottomSheetScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>Ajouter une mesure</Text>

        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Date</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel="Date de la mesure"
          />
        </View>

        {field(weightLabel, weight, setWeight, `Valeur ${weightLabel}`)}
        {field(`Tour de taille (${circumLabel})`, waist, setWaist, `Tour de taille en ${circumLabel}`)}
        {field(`Tour de bras (${circumLabel})`, arm, setArm, `Tour de bras en ${circumLabel}`)}
        {field(`Tour de cuisse (${circumLabel})`, thigh, setThigh, `Tour de cuisse en ${circumLabel}`)}
        {field(`Tour de hanches (${circumLabel})`, hip, setHip, `Tour de hanches en ${circumLabel}`)}

        <PressableA11y
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          accessibilityLabel="Enregistrer la mesure"
          accessibilityRole="button"
        >
          <Text style={styles.saveBtnText}>{isSaving ? 'Enregistrement…' : 'Enregistrer'}</Text>
        </PressableA11y>
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

// Pour ouvrir depuis le parent : sheetRef.current?.expand()
// Exposer via forwardRef si nécessaire

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  fieldLabel: { fontSize: 14, flex: 1 },
  input: { flex: 0, width: 110, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, textAlign: 'right' },
  saveBtn: { marginTop: 24, padding: 14, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
```

- [ ] **Step 2 : Typecheck**

```bash
cd app && npm run typecheck
```

Attendu : 0 erreurs.

- [ ] **Step 3 : Commit**

```bash
git add app/components/progression/AddMeasurementSheet.tsx
git commit -m "feat(AddMeasurementSheet): BottomSheet saisie mesures corporelles"
```

---

### Task 7 : LatestMeasurementsCard + BodyMeasurementChart

**Files:**
- Create: `app/components/progression/LatestMeasurementsCard.tsx`
- Create: `app/components/progression/BodyMeasurementChart.tsx`

- [ ] **Step 1 : Créer LatestMeasurementsCard**

Créer `app/components/progression/LatestMeasurementsCard.tsx` :

```typescript
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { BodyMeasurement } from '@/db/types';

interface Props {
  latest: BodyMeasurement | null;
  useKg?: boolean;
}

interface MetricRow { label: string; value: number | null; unit: string }

export function LatestMeasurementsCard({ latest, useKg = true }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];

  if (!latest) return null;

  const metrics: MetricRow[] = [
    { label: 'Poids', value: latest.weight_kg, unit: useKg ? 'kg' : 'lbs' },
    { label: 'Tour de taille', value: latest.waist_cm, unit: useKg ? 'cm' : 'in' },
    { label: 'Tour de bras', value: latest.arm_cm, unit: useKg ? 'cm' : 'in' },
    { label: 'Tour de cuisse', value: latest.thigh_cm, unit: useKg ? 'cm' : 'in' },
    { label: 'Tour de hanches', value: latest.hip_cm, unit: useKg ? 'cm' : 'in' },
  ].filter(m => m.value !== null);

  if (metrics.length === 0) return null;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`Dernières mesures du ${latest.date}`}
    >
      <Text style={[styles.title, { color: colors.text }]}>Dernières mesures</Text>
      <Text style={[styles.date, { color: colors.textSecondary }]}>{latest.date}</Text>
      {metrics.map(m => (
        <View key={m.label} style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{m.label}</Text>
          <Text style={[styles.value, { color: colors.text }]}>{m.value} {m.unit}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  date: { fontSize: 12, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '600' },
});
```

- [ ] **Step 2 : Créer BodyMeasurementChart**

Créer `app/components/progression/BodyMeasurementChart.tsx` :

```typescript
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { BodyMeasurement } from '@/db/types';

type MetricKey = 'weight_kg' | 'waist_cm' | 'arm_cm' | 'thigh_cm' | 'hip_cm';

const METRIC_LABELS: Record<MetricKey, string> = {
  weight_kg: 'Poids',
  waist_cm: 'Tour de taille',
  arm_cm: 'Tour de bras',
  thigh_cm: 'Tour de cuisse',
  hip_cm: 'Tour de hanches',
};

interface Props {
  measurements: BodyMeasurement[];  // déjà triées DESC — on reverse pour affichage chronologique
  metric: MetricKey;
  unit: string;
}

export function BodyMeasurementChart({ measurements, metric, unit }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];

  const points = [...measurements]
    .reverse()
    .map(m => ({ value: m[metric] as number | null, label: m.date.slice(5) }))
    .filter((p): p is { value: number; label: string } => p.value !== null);

  if (points.length < 2) return null;

  const chartData = points.map(p => ({ value: p.value, label: p.label }));

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`Graphique ${METRIC_LABELS[metric]} sur ${points.length} mesures`}
    >
      <Text style={[styles.title, { color: colors.text }]}>{METRIC_LABELS[metric]} ({unit})</Text>
      <LineChart
        data={chartData}
        width={280}
        height={120}
        color={colors.primary}
        thickness={2}
        dataPointsColor={colors.primary}
        hideDataPoints={points.length > 10}
        yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
        noOfSections={3}
        curved
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  title: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
});
```

- [ ] **Step 3 : Typecheck**

```bash
cd app && npm run typecheck
```

Attendu : 0 erreurs.

- [ ] **Step 4 : Commit**

```bash
git add app/components/progression/LatestMeasurementsCard.tsx app/components/progression/BodyMeasurementChart.tsx
git commit -m "feat(progression): LatestMeasurementsCard + BodyMeasurementChart"
```

---

### Task 8 : Segment "Corps" dans progression.tsx

**Files:**
- Modify: `app/app/(tabs)/progression.tsx`

- [ ] **Step 1 : Étendre le type Segment**

Dans `app/app/(tabs)/progression.tsx`, trouver la définition du type `Segment` :

```typescript
// Avant
type Segment = 'historique' | 'stats';
const SEGMENTS: Segment[] = ['historique', 'stats'];

// Après
type Segment = 'historique' | 'stats' | 'corps';
const SEGMENTS: Segment[] = ['historique', 'stats', 'corps'];
```

- [ ] **Step 2 : Ajouter les imports**

En haut de `progression.tsx`, ajouter :

```typescript
import { useRef } from 'react';
import { useBodyMeasurements } from '@/hooks/useBodyMeasurements';
import { LatestMeasurementsCard } from '@/components/progression/LatestMeasurementsCard';
import { BodyMeasurementChart } from '@/components/progression/BodyMeasurementChart';
import { AddMeasurementSheet, type AddMeasurementSheetRef } from '@/components/progression/AddMeasurementSheet';
```

- [ ] **Step 3 : Ajouter le hook et le ref sheet**

Dans le composant, ajouter :

```typescript
const { measurements, latest, save: saveMeasurement } = useBodyMeasurements();
const addSheetRef = useRef<AddMeasurementSheetRef>(null);
```

- [ ] **Step 4 : Corriger les accessibilityLabels du segmented control**

Le segmented control existant a `accessibilityLabel` hardcodé pour 2 segments. Mettre à jour :

```typescript
accessibilityLabel={
  seg === 'historique' ? 'Historique' :
  seg === 'stats' ? 'Stats' : 'Corps'
}
```

- [ ] **Step 5 : Ajouter la section Corps**

Après le bloc `if (activeSegment === 'stats') { ... }`, ajouter :

```typescript
if (activeSegment === 'corps') {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <LatestMeasurementsCard latest={latest} />

      {(['weight_kg', 'waist_cm', 'arm_cm', 'thigh_cm', 'hip_cm'] as const).map(metric => (
        <BodyMeasurementChart
          key={metric}
          measurements={measurements}
          metric={metric}
          unit={metric === 'weight_kg' ? 'kg' : 'cm'}
        />
      ))}

      {measurements.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Aucune mesure enregistrée. Appuie sur + pour commencer.
        </Text>
      )}

      <PressableA11y
        onPress={() => addSheetRef.current?.expand()}
        style={[styles.addBtn, { backgroundColor: colors.primary }]}
        accessibilityLabel="Ajouter une mesure corporelle"
        accessibilityRole="button"
      >
        <Text style={styles.addBtnText}>+ Ajouter une mesure</Text>
      </PressableA11y>

      <AddMeasurementSheet ref={addSheetRef} onSave={saveMeasurement} />
    </ScrollView>
  );
}
```

Note : `AddMeasurementSheet` doit exposer son `ref` via `forwardRef`. Si ce n'est pas encore le cas, modifier `AddMeasurementSheet.tsx` pour wrapper avec `forwardRef<BottomSheet, Props>` et appeler `forwardRef` sur le `sheetRef` interne.

- [ ] **Step 6 : Typecheck + tests complets**

```bash
cd app && npm run typecheck && npx jest --no-coverage
```

Attendu : 0 erreurs TS, tous les tests passent.

- [ ] **Step 7 : Commit**

```bash
git add app/app/(tabs)/progression.tsx
git commit -m "feat(progression): segment Corps — mesures corporelles avec graphiques"
```
