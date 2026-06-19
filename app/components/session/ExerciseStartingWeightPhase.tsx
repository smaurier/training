import { Spacing } from '@/constants/Spacing';
import { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { PressableA11y } from '@/components/ui/PressableA11y';
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { FontFamily, LetterSpacing } from '@/constants/Typography';
import { BrzyckiCalibrationSheet } from './BrzyckiCalibrationSheet';

interface ExerciseStartingWeightPhaseProps {
  exercise: WorkoutExerciseDetail;
  plateStep: number;
  onConfirm: (weight: number) => Promise<void>;
}

export function ExerciseStartingWeightPhase({
  exercise,
  plateStep,
  onConfirm,
}: ExerciseStartingWeightPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const calibrationSheetRef = useRef<BottomSheet>(null);

  const workBlock = exercise.blocks.find(b => b.is_work_block === 1);
  const targetReps = workBlock?.sets[0]?.reps_min ?? 8;

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

  const isValid = weight.trim().length > 0 && !isNaN(parseFloat(weight.replace(',', '.')));

  return (
    <>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
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
          accessibilityLabel="Calibrer scientifiquement ma charge de départ avec la formule Brzycki"
          onPress={() => calibrationSheetRef.current?.expand()}
          style={styles.calibrateLink}
        >
          <Text style={[styles.calibrateLinkText, { color: colors.primaryText }]}>
            Calibrer scientifiquement →
          </Text>
        </PressableA11y>
      </View>
      <View style={styles.footer}>
        <PressableA11y
          onPress={handleConfirm}
          style={[
            styles.btn,
            {
              backgroundColor: colors.primary,
              opacity: !isValid || loading ? 0.5 : 1,
            },
          ]}
          accessibilityLabel="Confirmer le poids de départ"
          disabled={!isValid || loading}
        >
          <Text style={[styles.btnText, { color: colors.onPrimary }]}>
            {loading ? 'Enregistrement…' : 'CONFIRMER →'}
          </Text>
        </PressableA11y>
        {error && (
          <Text style={[styles.errorText, { color: colors.destructiveText }]}>{error}</Text>
        )}
      </View>
    </View>
    <BrzyckiCalibrationSheet
      sheetRef={calibrationSheetRef}
      targetReps={targetReps}
      plateStep={plateStep}
      onConfirm={(suggested) => setWeight(String(suggested))}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xxxl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  footer: {
    paddingBottom: Spacing.xxxl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  exerciseName: {
    fontSize: 18,
    fontFamily: FontFamily.regular,
  },
  title: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
  },
  subtitle: {
    fontSize: 16,
    marginTop: -8,
  },
  input: {
    height: 64,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: 28,
    fontFamily: FontFamily.semibold,
  },
  btn: {
    height: 56,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    letterSpacing: LetterSpacing.max,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: -8,
  },
  calibrateLink: { alignSelf: 'flex-start' },
  calibrateLinkText: { fontSize: 14, fontFamily: FontFamily.medium },
});
