import { Spacing } from '@/constants/Spacing';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LetterSpacing, FontFamily } from '@/constants/Typography';
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
        <Text style={[styles.phaseLabel, { color: colors.primary }]}>
          ÉCHAUFFEMENT
        </Text>
        <Text style={[styles.exerciseName, { color: colors.text }]} numberOfLines={2}>
          {exerciseName}
        </Text>

        <View style={[styles.setsTable, { borderColor: colors.border }]}>
          <View style={[styles.tableHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.tableHeaderCell, { color: colors.textSecondary }]}>CHARGE</Text>
            <Text style={[styles.tableHeaderCell, styles.tableHeaderRight, { color: colors.textSecondary }]}>REPS</Text>
            <Text style={[styles.tableHeaderCell, styles.tableHeaderRight, { color: colors.textSecondary }]}>%</Text>
          </View>
          {sets.map((s, i) => (
            <View
              key={s.percent}
              style={[
                styles.setRow,
                i < sets.length - 1 && [styles.setRowBorder, { borderBottomColor: colors.border }],
              ]}
            >
              <Text style={[styles.setWeight, { color: colors.text }]}>
                {convert(s.weight)} {unitLabel}
              </Text>
              <Text style={[styles.setReps, { color: colors.text }]}>
                {s.reps}
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
          <Text style={[styles.startBtnText, { color: colors.onPrimary }]}>COMMENCER LE TRAVAIL →</Text>
        </PressableA11y>

        <PressableA11y
          accessibilityLabel="Passer l'échauffement"
          onPress={onStart}
          style={styles.skipLink}
        >
          <Text style={[styles.skipLinkText, { color: colors.textSecondary }]}>Passer l'échauffement</Text>
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
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  phaseLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    letterSpacing: LetterSpacing.spaced,
  },
  exerciseName: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    lineHeight: 34,
  },
  setsTable: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontFamily: FontFamily.bold,
    letterSpacing: LetterSpacing.wider,
  },
  tableHeaderRight: { textAlign: 'right' },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  setRowBorder: { borderBottomWidth: 1 },
  setWeight: { flex: 1, fontSize: 16, fontFamily: FontFamily.semibold },
  setReps: { flex: 1, fontSize: 16, fontFamily: FontFamily.semibold, textAlign: 'right' },
  setPercent: { flex: 1, fontSize: 13, textAlign: 'right' },
  hint: { fontSize: 13 },
  startBtn: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
    marginTop: Spacing.sm,
  },
  startBtnText: { fontSize: 15, fontFamily: FontFamily.bold, letterSpacing: LetterSpacing.max },
  skipLink: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  skipLinkText: { fontSize: 13 },
});
