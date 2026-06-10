import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

interface ExerciseStartingWeightPhaseProps {
  exercise: WorkoutExerciseDetail;
  onConfirm: (weight: number) => Promise<void>;
}

export function ExerciseStartingWeightPhase({
  exercise,
  onConfirm,
}: ExerciseStartingWeightPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);

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

  const isValid = weight.trim().length > 0 && !isNaN(parseFloat(weight.replace(',', '.')));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.exerciseName, { color: colors.text }]}>
        {exercise.exercise.name}
      </Text>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        Charge de départ
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Quel poids vas-tu utiliser pour commencer ?
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        placeholder="ex: 40"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel="Charge de départ en kilogrammes"
        autoFocus
      />
      <PressableA11y
        onPress={handleConfirm}
        style={[
          styles.btn,
          {
            backgroundColor: colors.tint,
            opacity: !isValid || loading ? 0.5 : 1,
          },
        ]}
        accessibilityLabel="Confirmer le poids de départ"
        disabled={!isValid || loading}
      >
        <Text style={styles.btnText}>
          {loading ? 'Enregistrement…' : 'Confirmer →'}
        </Text>
      </PressableA11y>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 20,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    marginTop: -8,
  },
  input: {
    height: 64,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 16,
    fontSize: 28,
    fontWeight: '600',
  },
  btn: {
    height: 56,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
