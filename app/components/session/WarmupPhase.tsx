import { Spacing } from '@/constants/Spacing';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LetterSpacing } from '@/constants/Typography';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useUnits } from '@/hooks/useUnits';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { computeWarmupSets } from '@/services/warmup';

interface WarmupPhaseProps {
  exerciseName: string;
  workWeight: number;
  plateStep?: number;
  onStart: () => void;
}

export function WarmupPhase({ exerciseName, workWeight, plateStep = 2, onStart }: WarmupPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { convert, label: unitLabel } = useUnits();
  const sets = computeWarmupSets(workWeight, plateStep);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.stripe, { backgroundColor: colors.primary }]} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.phaseLabel, { color: colors.textSecondary }]}>
          ÉCHAUFFEMENT
        </Text>
        <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={2}>
          {exerciseName}
        </Text>

        <View style={[styles.setsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {sets.map((s, i) => (
            <View
              key={s.percent}
              style={[
                styles.setRow,
                i < sets.length - 1 && [styles.setRowBorder, { borderBottomColor: colors.border }],
              ]}
            >
              <Text style={[styles.setWeight, { color: colors.text }]}>
                {convert(s.weight)} {unitLabel} × {s.reps}
              </Text>
              <Text style={[styles.setPercent, { color: colors.textSecondary }]}>
                {s.percent}%
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Repos ~60 s entre chaque série
        </Text>

        <PressableA11y
          accessibilityLabel={`Commencer le travail pour ${exerciseName}`}
          onPress={onStart}
          style={[styles.startBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.startBtnText, { color: colors.onPrimary }]}>Commencer le travail →</Text>
        </PressableA11y>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  stripe: { width: 4 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 80,
    paddingBottom: 40,
    gap: Spacing.lg,
  },
  phaseLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: LetterSpacing.spaced,
  },
  exerciseName: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  setsCard: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  setRowBorder: { borderBottomWidth: 1 },
  setWeight: { fontSize: 17, fontWeight: '600' },
  setPercent: { fontSize: 14 },
  hint: { fontSize: 14 },
  startBtn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  startBtnText: { fontSize: 17, fontWeight: '600' },
});
