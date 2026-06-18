// app/components/onboarding/SessionDemoScreen.tsx
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Radius } from '@/constants/Radius';
import { FontFamily } from '@/constants/Typography';
import type { ScreenProps } from '@/app/onboarding';

// ⚠️ Replica simplifiée de RunningPhase/RestPhase — découplée intentionnellement.
// Vérifier et mettre à jour lors de chaque changement significatif de l'UI de séance.

type DemoStep = 'input' | 'rest' | 'done';
const REST_DURATION_S = 5;
const DEMO_TOTAL_SETS = 3;

export function SessionDemoScreen({ onNext, onBack }: ScreenProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [setIndex, setSetIndex] = useState(0);
  const [demoStep, setDemoStep] = useState<DemoStep>('input');
  const [reps, setReps] = useState('');
  const [restSecs, setRestSecs] = useState(REST_DURATION_S);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (demoStep !== 'rest') return;
    setRestSecs(REST_DURATION_S);
    timerRef.current = setInterval(() => {
      setRestSecs(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          const next = setIndex + 1;
          if (next >= DEMO_TOTAL_SETS) {
            setDemoStep('done');
          } else {
            setSetIndex(next);
            setDemoStep('input');
            setReps('');
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [demoStep, setIndex]);

  const handleValidate = () => {
    if (!reps) return;
    if (setIndex >= DEMO_TOTAL_SETS - 1) {
      setDemoStep('done');
    } else {
      setDemoStep('rest');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.topRow}>
        <PressableA11y onPress={onBack} accessibilityLabel="Retour" accessibilityRole="button">
          <Text style={{ color: colors.textSecondary }}>← Retour</Text>
        </PressableA11y>
        <Text style={[styles.label, { color: colors.textSecondary }]}>COMMENT ÇA MARCHE</Text>
      </View>

      {demoStep === 'input' && (
        <View style={styles.content}>
          <Text style={[styles.exerciseName, { color: colors.text }]}>Développé couché</Text>
          <Text style={[styles.setInfo, { color: colors.textSecondary }]}>
            Série {setIndex + 1}/{DEMO_TOTAL_SETS} · 3×8 reps
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Entre le nombre de répétitions effectuées :
          </Text>
          <TextInput
            style={[styles.repsInput, { borderColor: colors.primary, color: colors.text, backgroundColor: colors.surface }]}
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            placeholder="8"
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel="Nombre de répétitions"
          />
          <PressableA11y
            onPress={handleValidate}
            disabled={!reps}
            style={[styles.button, { backgroundColor: colors.primary }, !reps && { opacity: 0.4 }]}
            accessibilityLabel="Valider la série"
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Valider ✓</Text>
          </PressableA11y>
        </View>
      )}

      {demoStep === 'rest' && (
        <View style={styles.content}>
          <Text style={[styles.restTitle, { color: colors.text }]}>REPOS</Text>
          <Text style={[styles.restTimer, { color: colors.primary }]}>{restSecs}s</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Le timer démarre automatiquement. En séance réelle, la durée est celle configurée dans ton programme.
          </Text>
        </View>
      )}

      {demoStep === 'done' && (
        <View style={styles.content}>
          <Text style={[styles.doneTitle, { color: colors.text }]}>✦ Séance terminée</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Après chaque séance : ton volume total, ton ressenti, tes notes.{'\n'}
            Les charges progressent automatiquement à la prochaine séance.
          </Text>
          <PressableA11y
            onPress={onNext}
            style={[styles.button, { backgroundColor: colors.primary }]}
            accessibilityLabel="Continuer"
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Continuer</Text>
          </PressableA11y>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  topRow: { gap: 16, marginBottom: 32 },
  label: { fontSize: 11, fontFamily: FontFamily.bold, letterSpacing: 1 },
  content: { gap: 16 },
  exerciseName: { fontSize: 26, fontFamily: FontFamily.bold },
  setInfo: { fontSize: 14, fontFamily: FontFamily.medium },
  hint: { fontSize: 14, fontFamily: FontFamily.regular, lineHeight: 20 },
  repsInput: {
    borderWidth: 2, borderRadius: Radius.lg, padding: 16,
    fontSize: 28, fontFamily: FontFamily.bold, textAlign: 'center',
  },
  button: { borderRadius: Radius.lg, padding: 16, alignItems: 'center' },
  buttonText: { fontSize: 16, fontFamily: FontFamily.bold },
  restTitle: { fontSize: 32, fontFamily: FontFamily.black },
  restTimer: { fontSize: 64, fontFamily: FontFamily.black },
  doneTitle: { fontSize: 24, fontFamily: FontFamily.bold },
});
