import { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { compute1RM, suggestWorkingWeight } from '@/services/brzycki';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Spacing } from '@/constants/Spacing';
import { Radius } from '@/constants/Radius';
import { FontFamily, LetterSpacing } from '@/constants/Typography';
import { PressableA11y } from '@/components/ui/PressableA11y';

type Step = 'weight' | 'reps' | 'result';

interface BrzyckiCalibrationSheetProps {
  sheetRef: React.RefObject<BottomSheet | null>;
  targetReps: number;
  plateStep: number;
  onConfirm: (weight: number) => void;
}

export function BrzyckiCalibrationSheet({
  sheetRef,
  targetReps,
  plateStep,
  onConfirm,
}: BrzyckiCalibrationSheetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [step, setStep] = useState<Step>('weight');
  const [testWeight, setTestWeight] = useState('');
  const [testReps, setTestReps] = useState('');
  const [suggestion, setSuggestion] = useState<number | null>(null);
  const [oneRM, setOneRM] = useState<number | null>(null);

  const snapPoints = useMemo(() => ['60%'], []);

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
  );

  function reset() {
    setStep('weight');
    setTestWeight('');
    setTestReps('');
    setSuggestion(null);
    setOneRM(null);
  }

  function handleWeightNext() {
    const w = parseFloat(testWeight.replace(',', '.'));
    if (isNaN(w) || w <= 0) return;
    setStep('reps');
  }

  function handleCalculate() {
    const w = parseFloat(testWeight.replace(',', '.'));
    const r = parseInt(testReps, 10);
    if (isNaN(w) || isNaN(r) || r < 1) return;
    const rm = compute1RM(w, r);
    setSuggestion(suggestWorkingWeight(rm, targetReps, plateStep));
    setOneRM(Math.round(rm * 10) / 10);
    setStep('result');
  }

  function handleConfirm() {
    if (suggestion === null) return;
    sheetRef.current?.close();
    reset();
    onConfirm(suggestion);
  }

  const weightValid = (() => {
    const w = parseFloat(testWeight.replace(',', '.'));
    return !isNaN(w) && w > 0;
  })();

  const repsValid = (() => {
    const r = parseInt(testReps, 10);
    return !isNaN(r) && r >= 1 && r <= 12;
  })();

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onChange={(index) => { if (index === -1) reset(); }}
    >
      <BottomSheetView style={styles.container}>
        {step === 'weight' && (
          <>
            <Text style={[styles.title, { color: colors.text }]}>Calibration scientifique</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Prends une charge que tu peux soulever environ 10 fois. Quel poids ?
            </Text>
            <BottomSheetTextInput
              style={[styles.input, {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surfaceElevated,
              }]}
              value={testWeight}
              onChangeText={setTestWeight}
              keyboardType="decimal-pad"
              placeholder="ex: 60"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Poids du test en kilogrammes"
            />
            <PressableA11y
              accessibilityLabel="Passer à l'étape suivante"
              onPress={handleWeightNext}
              style={[styles.btn, { backgroundColor: colors.primary, opacity: weightValid ? 1 : 0.4 }]}
              disabled={!weightValid}
            >
              <Text style={[styles.btnText, { color: colors.onPrimary }]}>SUIVANT →</Text>
            </PressableA11y>
          </>
        )}

        {step === 'reps' && (
          <>
            <Text style={[styles.title, { color: colors.text }]}>Combien de reps ?</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Réalise tes reps jusqu'à l'échec (max 12). Note le nombre complété.
            </Text>
            <BottomSheetTextInput
              style={[styles.input, {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surfaceElevated,
              }]}
              value={testReps}
              onChangeText={setTestReps}
              keyboardType="number-pad"
              placeholder="ex: 8"
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel="Nombre de répétitions complétées"
              autoFocus
            />
            <PressableA11y
              accessibilityLabel="Calculer la charge de départ"
              onPress={handleCalculate}
              style={[styles.btn, { backgroundColor: colors.primary, opacity: repsValid ? 1 : 0.4 }]}
              disabled={!repsValid}
            >
              <Text style={[styles.btnText, { color: colors.onPrimary }]}>CALCULER</Text>
            </PressableA11y>
            <PressableA11y
              accessibilityLabel="Retour — modifier le poids"
              onPress={() => setStep('weight')}
              style={styles.backBtn}
            >
              <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>← Modifier le poids</Text>
            </PressableA11y>
          </>
        )}

        {step === 'result' && suggestion !== null && oneRM !== null && (
          <>
            <Text style={[styles.title, { color: colors.text }]}>Résultat</Text>
            <View style={[styles.resultCard, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>1RM ESTIMÉ</Text>
              <Text style={[styles.resultValue, { color: colors.text }]}>{oneRM} kg</Text>
            </View>
            <View style={[styles.resultCard, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
                CHARGE SUGGÉRÉE ({targetReps} REPS)
              </Text>
              <Text style={[styles.resultValue, { color: colors.primaryText }]}>{suggestion} kg</Text>
            </View>
            <PressableA11y
              accessibilityLabel={`Démarrer avec ${suggestion} kilogrammes`}
              onPress={handleConfirm}
              style={[styles.btn, { backgroundColor: colors.primary, marginTop: Spacing.sm }]}
            >
              <Text style={[styles.btnText, { color: colors.onPrimary }]}>DÉMARRER · {suggestion} kg</Text>
            </PressableA11y>
            <PressableA11y
              accessibilityLabel="Refaire le test"
              onPress={reset}
              style={styles.backBtn}
            >
              <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Refaire le test</Text>
            </PressableA11y>
          </>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.xxl, gap: Spacing.lg },
  title: { fontSize: 20, fontFamily: FontFamily.bold },
  body: { fontSize: 14, lineHeight: 20 },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: 24,
    fontFamily: FontFamily.semibold,
  },
  btn: {
    height: 52,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: { fontSize: 16, fontFamily: FontFamily.bold, letterSpacing: LetterSpacing.max },
  backBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  backBtnText: { fontSize: 14 },
  resultCard: { borderRadius: Radius.sm, padding: Spacing.lg, gap: Spacing.xs },
  resultLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: LetterSpacing.spaced,
  },
  resultValue: { fontSize: 32, fontFamily: FontFamily.bold },
});
