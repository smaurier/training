import { Spacing } from '@/constants/Spacing';
import { View, Text, StyleSheet } from 'react-native';
import { LetterSpacing } from '@/constants/Typography';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { CircularTimer } from '@/components/ui/CircularTimer';
import type { UseTimerResult } from '@/hooks/useTimer';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

interface RestPhaseProps {
  durationSeconds: number;
  timer: UseTimerResult;
  nextLabel: string;
  onContinue: () => void;
}

export function RestPhase({ durationSeconds, timer, nextLabel, onContinue }: RestPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isDone = durationSeconds === 0 || (timer.remaining === 0 && !timer.isRunning);
  const progress = durationSeconds > 0 ? timer.remaining / durationSeconds : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        accessible={true}
        accessibilityLabel={`Temps de repos restant : ${timer.remaining} secondes`}
      >
        <CircularTimer
          progress={progress}
          remaining={timer.remaining}
          label={isDone ? "À toi" : 'REPOS'}
          size={220}
        />
      </View>

      <View style={styles.nextSection}>
        <Text style={[styles.nextSectionLabel, { color: colors.textSecondary }]}>PROCHAINE</Text>
        <Text style={[styles.nextLabel, { color: colors.text }]}>{nextLabel}</Text>
      </View>

      <PressableA11y
        accessibilityLabel={isDone ? "À toi — continuer la séance" : 'Passer le repos'}
        onPress={onContinue}
        style={[
          styles.continueBtn,
          { borderWidth: 1, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.continueBtnText, { color: colors.text }]}>
          {isDone ? "À toi →" : 'Passer →'}
        </Text>
      </PressableA11y>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    gap: Spacing.xl,
  },
  nextSection: { alignItems: 'center', gap: Spacing.xs },
  nextSectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: LetterSpacing.widest },
  nextLabel: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  continueBtn: {
    width: '100%',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginTop: 'auto',
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
