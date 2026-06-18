// app/add-exercise.tsx
import {
  View, Text, TextInput,
  StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useState } from 'react';
import { useExercises } from '@/hooks/useExercises';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { ExerciseType } from '@/db/types';

const TYPES: ExerciseType[] = ['musculation', 'cardio', 'etirement'];

export default function AddExerciseModal() {
  const router = useRouter();
  const { initialName } = useLocalSearchParams<{ initialName?: string }>();
  const { create } = useExercises();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [name, setName] = useState(initialName ?? '');
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
      setSubmitting(false);
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de créer l\'exercice.');
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
          <PressableA11y
            key={t}
            style={[
              styles.typeBtn,
              { borderColor: colors.border, backgroundColor: type === t ? colors.primary : colors.surface },
            ]}
            onPress={() => setType(t)}
            accessibilityLabel={`Type ${t}`}
            accessibilityState={{ selected: type === t }}
          >
            <Text style={{ color: type === t ? colors.onPrimary : colors.text, fontSize: 13, fontWeight: '500' }}>
              {t}
            </Text>
          </PressableA11y>
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

      <PressableA11y
        style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}
        onPress={handleSubmit}
        disabled={submitting}
        accessibilityLabel="Créer l'exercice"
        accessibilityState={{ disabled: submitting }}
      >
        {submitting
          ? <ActivityIndicator color={colors.onPrimary} />
          : <Text style={[styles.submitText, { color: colors.onPrimary }]}>Créer l&apos;exercice</Text>
        }
      </PressableA11y>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    fontSize: 15,
    marginTop: 4,
  },
  typeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  typeBtn: {
    flex: 1,
    height: 40,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    height: 52,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitText: { fontSize: 16, fontWeight: '600' },
});
