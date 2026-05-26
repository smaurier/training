# useExercises Hook + Écran Liste Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connecter `ExerciseService` à React via `useExercises`, afficher la liste des exercices dans un nouvel onglet, et permettre l'ajout via une modal.

**Architecture:** Hook `useExercises` wraps `ExerciseService(SQLiteExerciseRepository(getDb()))`. L'écran liste se re-fetch via `useFocusEffect` à chaque retour de modal. La modal crée via son propre appel à `useExercises`.

**Tech Stack:** React Native, Expo Router, expo-sqlite (`getDb()` singleton), TypeScript strict.

---

## File Map

| Fichier | Statut | Rôle |
|---|---|---|
| `hooks/useExercises.ts` | CREATE | Hook : state exercises + loading + error + create + refresh |
| `components/exercises/ExerciseCard.tsx` | CREATE | Composant carte d'un exercice |
| `app/(tabs)/exercices.tsx` | CREATE | Écran liste avec FAB |
| `app/add-exercise.tsx` | CREATE | Modal formulaire ajout |
| `app/(tabs)/_layout.tsx` | MODIFY | Ajouter onglet Exercices |
| `app/_layout.tsx` | MODIFY | Déclarer Stack.Screen add-exercise |

**Note :** Pas de test unitaire pour le hook (décision de design). La logique métier est couverte par les 31 tests du service. Comportement vérifié manuellement dans l'app.

---

### Task 1 : Hook `useExercises`

**Files:**
- Create: `hooks/useExercises.ts`

- [ ] **Step 1 : Créer le fichier**

```typescript
// hooks/useExercises.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { Exercise } from '../db/types';
import { ExerciseService, CreateExerciseInput } from '../services/ExerciseService';
import { SQLiteExerciseRepository } from '../repositories/SQLiteExerciseRepository';
import { getDb } from '../db';

export interface UseExercisesResult {
  exercises: Exercise[];
  loading: boolean;
  error: string | null;
  create: (input: CreateExerciseInput) => Promise<void>;
  refresh: () => Promise<void>;
}

function makeService(): ExerciseService {
  return new ExerciseService(new SQLiteExerciseRepository(getDb()));
}

export function useExercises(): UseExercisesResult {
  const serviceRef = useRef<ExerciseService | null>(null);
  if (!serviceRef.current) {
    serviceRef.current = makeService();
  }
  const service = serviceRef.current;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await service.listAll();
      setExercises(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (input: CreateExerciseInput): Promise<void> => {
    await service.create(input);
    await refresh();
  }, [service, refresh]);

  return { exercises, loading, error, create, refresh };
}
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/hooks/useExercises.ts
git commit -m "feat: hook useExercises — state exercises + create + refresh"
```

---

### Task 2 : Composant `ExerciseCard`

**Files:**
- Create: `components/exercises/ExerciseCard.tsx`

- [ ] **Step 1 : Créer le dossier et le composant**

```typescript
// components/exercises/ExerciseCard.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Exercise } from '@/db/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface ExerciseCardProps {
  exercise: Exercise;
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  let muscleGroups: string[] = [];
  try {
    muscleGroups = JSON.parse(exercise.muscle_groups || '[]');
  } catch {
    muscleGroups = [];
  }

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityLabel={`Exercice ${exercise.name}`}
    >
      <View style={styles.row}>
        <Text style={[styles.name, { color: colors.text }]}>{exercise.name}</Text>
        <Text style={[styles.badge, { color: colors.primary }]}>{exercise.type}</Text>
      </View>
      {muscleGroups.length > 0 && (
        <Text style={[styles.muscles, { color: colors.textSecondary }]}>
          {muscleGroups.join(' · ')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  muscles: {
    fontSize: 13,
  },
});
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/components/exercises/ExerciseCard.tsx
git commit -m "feat: composant ExerciseCard"
```

---

### Task 3 : Écran liste `exercices.tsx`

**Files:**
- Create: `app/(tabs)/exercices.tsx`

- [ ] **Step 1 : Créer l'écran**

```typescript
// app/(tabs)/exercices.tsx
import { FlatList, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useExercises } from '@/hooks/useExercises';
import { ExerciseCard } from '@/components/exercises/ExerciseCard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function ExercicesScreen() {
  const { exercises, loading, error, refresh } = useExercises();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={exercises}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ExerciseCard exercise={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            Aucun exercice. Appuie sur + pour en ajouter un.
          </Text>
        }
      />
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/add-exercise')}
        accessibilityLabel="Ajouter un exercice"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 15 },
  errorText: { fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/app/\(tabs\)/exercices.tsx
git commit -m "feat: écran liste exercices avec FAB"
```

---

### Task 4 : Modal `add-exercise.tsx`

**Files:**
- Create: `app/add-exercise.tsx`

- [ ] **Step 1 : Créer la modal**

```typescript
// app/add-exercise.tsx
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useExercises } from '@/hooks/useExercises';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { ExerciseType } from '@/db/types';

const TYPES: ExerciseType[] = ['musculation', 'cardio', 'etirement'];

export default function AddExerciseModal() {
  const router = useRouter();
  const { create } = useExercises();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [name, setName] = useState('');
  const [type, setType] = useState<ExerciseType>('musculation');
  const [muscleGroupsRaw, setMuscleGroupsRaw] = useState('');
  const [progressionStep, setProgressionStep] = useState('2.5');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const step = parseFloat(progressionStep);
    if (!name.trim()) {
      Alert.alert('Champ requis', 'Le nom de l\'exercice est obligatoire.');
      return;
    }
    if (isNaN(step) || step <= 0) {
      Alert.alert('Valeur invalide', 'Le pas de progression doit être un nombre positif.');
      return;
    }

    const muscle_groups = muscleGroupsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      setSubmitting(true);
      await create({ name: name.trim(), type, muscle_groups, progression_step: step, progression_threshold: 1 });
      router.back();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de créer l\'exercice.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.label, { color: colors.text }]}>Nom *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={name}
        onChangeText={setName}
        placeholder="ex. Squat"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Nom de l'exercice"
      />

      <Text style={[styles.label, { color: colors.text }]}>Type</Text>
      <View style={styles.typeRow}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[
              styles.typeBtn,
              { borderColor: colors.border, backgroundColor: type === t ? colors.primary : colors.surface },
            ]}
            onPress={() => setType(t)}
            accessibilityLabel={`Type ${t}`}
            accessibilityRole="button"
          >
            <Text style={{ color: type === t ? '#fff' : colors.text, fontSize: 13, fontWeight: '500' }}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Groupes musculaires</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={muscleGroupsRaw}
        onChangeText={setMuscleGroupsRaw}
        placeholder="ex. quadriceps, fessiers"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Groupes musculaires, séparés par des virgules"
      />

      <Text style={[styles.label, { color: colors.text }]}>Pas de progression (kg)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={progressionStep}
        onChangeText={setProgressionStep}
        keyboardType="decimal-pad"
        placeholder="2.5"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Pas de progression en kilogrammes"
      />

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={submitting}
        accessibilityLabel="Créer l'exercice"
        accessibilityRole="button"
      >
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>Créer l'exercice</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    marginTop: 4,
  },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  typeBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 2 : Vérifier la compilation TypeScript**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 3 : Commit**

```bash
git add app/app/add-exercise.tsx
git commit -m "feat: modal ajout exercice"
```

---

### Task 5 : Wiring Expo Router

**Files:**
- Modify: `app/(tabs)/_layout.tsx` — ajouter onglet Exercices
- Modify: `app/_layout.tsx` — déclarer Stack.Screen add-exercise

- [ ] **Step 1 : Ajouter l'onglet dans `(tabs)/_layout.tsx`**

Ajouter après le `Tabs.Screen` "index" existant :

```typescript
<Tabs.Screen
  name="exercices"
  options={{
    title: 'Exercices',
    tabBarIcon: ({ color }) => <TabIcon name="list-outline" color={color} />,
  }}
/>
```

- [ ] **Step 2 : Déclarer la modal dans `app/_layout.tsx`**

Dans `RootLayoutNav`, ajouter dans le `<Stack>` après le Screen "modal" existant :

```typescript
<Stack.Screen
  name="add-exercise"
  options={{ presentation: 'modal', title: 'Nouvel exercice' }}
/>
```

- [ ] **Step 3 : Vérifier la compilation TypeScript**

```bash
cd app && npx tsc --noEmit
```

Attendu : 0 erreur.

- [ ] **Step 4 : Lancer l'app et tester manuellement**

```bash
cd app && npx expo start
```

Vérifier :
- Onglet "Exercices" visible dans la tab bar
- Liste chargée (exercices seeds affichés)
- FAB "+" ouvre la modal
- Formulaire valide : nom vide → alerte, step ≤ 0 → alerte
- Création OK → retour liste → nouvel exercice visible

- [ ] **Step 5 : Commit final**

```bash
git add app/app/\(tabs\)/_layout.tsx app/app/_layout.tsx
git commit -m "feat: wiring Expo Router — onglet Exercices + modal add-exercise"
```
