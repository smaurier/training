// app/components/session/CheckInPhase.tsx
import { Spacing } from '@/constants/Spacing';
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { CheckIn } from '@/services/SessionService';
import type { WorkoutExerciseDetail } from '@/services/WorkoutExerciseService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { LetterSpacing, FontFamily  } from '@/constants/Typography';

function estimateDurationSeconds(exercises: WorkoutExerciseDetail[]): number {
  let total = exercises.length * 30; // transition per exercise
  for (const ex of exercises) {
    for (const block of ex.blocks) {
      for (const set of block.sets) {
        total += 45 + set.rest_duration; // ~45s effort + rest
      }
    }
  }
  return total;
}

function formatDuration(seconds: number): string {
  const rounded = Math.max(5, Math.ceil(seconds / 300) * 5);
  return `~${rounded} min`;
}

interface CheckInRowConfig {
  label: string;
  options: readonly { value: 1 | 2 | 3; text: string }[];
}

const CHECKIN_ROWS: CheckInRowConfig[] = [
  { label: 'Énergie', options: [{ value: 1, text: 'Faible' }, { value: 2, text: 'Normale' }, { value: 3, text: 'Élevée' }] },
  { label: 'Fatigue', options: [{ value: 1, text: 'Reposé' }, { value: 2, text: 'Modérée' }, { value: 3, text: 'Élevée' }] },
  { label: 'Sommeil', options: [{ value: 1, text: 'Mauvais' }, { value: 2, text: 'Correct' }, { value: 3, text: 'Bon' }] },
];

interface CheckInPhaseProps {
  onStart: (checkin: CheckIn) => Promise<void>;
  exercises: WorkoutExerciseDetail[];
  deloadSuggested?: boolean;
  onDeloadApplied?: () => void;
}

export function CheckInPhase({ onStart, exercises, deloadSuggested, onDeloadApplied }: CheckInPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const estimatedDuration = formatDuration(estimateDurationSeconds(exercises));
  const PREVIEW_MAX = 4;
  const previewNames = exercises.slice(0, PREVIEW_MAX).map(e => e.exercise.name);
  const overflow = exercises.length - PREVIEW_MAX;

  const [energy, setEnergy] = useState<1 | 2 | 3 | null>(null);
  const [fatigue, setFatigue] = useState<1 | 2 | 3 | null>(null);
  const [sleep, setSleep] = useState<1 | 2 | 3 | null>(null);
  const [loading, setLoading] = useState(false);
  const [deloadAccepted, setDeloadAccepted] = useState(false);
  const [deloadDismissed, setDeloadDismissed] = useState(false);

  const canStart = energy !== null && fatigue !== null && sleep !== null;

  const setters = [setEnergy, setFatigue, setSleep];
  const values = [energy, fatigue, sleep];

  async function handleStart() {
    if (!canStart || loading) return;
    setLoading(true);
    try {
      await onStart({ checkin_energy: energy!, checkin_fatigue: fatigue!, checkin_sleep: sleep! });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <Text style={[styles.title, { color: colors.text }]}>Comment tu te sens ?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>3 questions avant de commencer</Text>
      </View>

      {exercises.length > 0 && (
        <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.previewMeta}>
            <Text style={[styles.previewStat, { color: colors.text }]}>
              {exercises.length} exercice{exercises.length > 1 ? 's' : ''}
            </Text>
            <Text style={[styles.previewDuration, { color: colors.primary }]}>{estimatedDuration}</Text>
          </View>
          <View style={styles.previewList}>
            {previewNames.map((name, i) => (
              <Text key={i} style={[styles.previewItem, { color: colors.textSecondary }]} numberOfLines={1}>
                · {name}
              </Text>
            ))}
            {overflow > 0 && (
              <Text style={[styles.previewItem, { color: colors.textSecondary }]}>
                + {overflow} de plus
              </Text>
            )}
          </View>
        </View>
      )}

      {deloadSuggested && !deloadDismissed && (
        <View style={[styles.deloadCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.deloadTitle, { color: colors.text }]}>
            {deloadAccepted ? 'Décharge appliquée ✓' : 'Semaine de décharge suggérée'}
          </Text>
          {!deloadAccepted && (
            <Text style={[styles.deloadBody, { color: colors.textSecondary }]}>
              {"Après plusieurs semaines d'entraînement, une semaine à charge réduite (-10%) permet aux muscles et tendons de récupérer et de repartir plus forts."}
            </Text>
          )}
          {!deloadAccepted && (
            <View style={styles.deloadButtons}>
              <PressableA11y
                accessibilityLabel="Appliquer la décharge — poids réduits de 10% pour cette séance"
                onPress={() => {
                  setDeloadAccepted(true);
                  onDeloadApplied?.();
                }}
                style={[styles.deloadBtn, styles.deloadBtnPrimary, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.deloadBtnPrimaryText, { color: colors.onPrimary }]}>Appliquer la décharge</Text>
              </PressableA11y>
              <PressableA11y
                accessibilityLabel="Passer — continuer sans décharge"
                onPress={() => setDeloadDismissed(true)}
                style={[styles.deloadBtn, styles.deloadBtnSecondary, { borderColor: colors.border }]}
              >
                <Text style={[styles.deloadBtnSecondaryText, { color: colors.text }]}>Passer</Text>
              </PressableA11y>
            </View>
          )}
        </View>
      )}

      {CHECKIN_ROWS.map((row, i) => (
        <View key={row.label} style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{row.label.toUpperCase()}</Text>
          <View style={[styles.segment, { borderColor: colors.border }]}>
            {row.options.map((opt, j) => {
              const isSelected = values[i] === opt.value;
              const isFirst = j === 0;
              const isLast = j === row.options.length - 1;
              return (
                <PressableA11y
                  key={opt.value}
                  accessibilityLabel={`${row.label} : ${opt.text}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setters[i](opt.value)}
                  style={[
                    styles.segmentBtn,
                    { backgroundColor: isSelected ? colors.primary : colors.surface },
                    isFirst ? styles.segmentFirst : undefined as unknown as ViewStyle,
                    isLast ? styles.segmentLast : undefined as unknown as ViewStyle,
                    (!isLast ? { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border } : undefined) as ViewStyle,
                  ]}
                >
                  <Text style={[
                    styles.segmentText,
                    { color: isSelected ? colors.onPrimary : colors.textSecondary },
                    isSelected && styles.segmentTextSelected,
                  ]}>
                    {opt.text}
                  </Text>
                </PressableA11y>
              );
            })}
          </View>
        </View>
      ))}

      <PressableA11y
        accessibilityLabel="Commencer la séance"
        accessibilityState={{ disabled: !canStart }}
        onPress={handleStart}
        style={[styles.startBtn, { backgroundColor: colors.primary, opacity: canStart ? 1 : 0.4 }]}
      >
        <Text style={[styles.startBtnText, { color: colors.onPrimary }]}>{loading ? 'Démarrage…' : 'Commencer la séance'}</Text>
      </PressableA11y>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: Spacing.xxl, gap: 28 },
  hero: { alignItems: 'center', paddingTop: Spacing.xxxl, gap: Spacing.sm },
  title: { fontSize: 24, fontFamily: FontFamily.bold, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center' },
  row: { gap: Spacing.md },
  rowLabel: { fontSize: 11, fontFamily: FontFamily.bold, letterSpacing: LetterSpacing.wider },
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: Radius.sm, overflow: 'hidden' },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg },
  segmentFirst: { borderTopLeftRadius: Radius.sm, borderBottomLeftRadius: Radius.sm },
  segmentLast: { borderTopRightRadius: Radius.sm, borderBottomRightRadius: Radius.sm },
  segmentText: { fontSize: 14, fontFamily: FontFamily.regular },
  segmentTextSelected: { fontFamily: FontFamily.bold },
  startBtn: { marginTop: Spacing.sm, paddingVertical: Spacing.lg, borderRadius: Radius.sm, alignItems: 'center' },
  startBtnText: { fontSize: 17, fontFamily: FontFamily.semibold },
  previewCard: { borderWidth: 1, borderRadius: Radius.sm, padding: Spacing.lg, gap: Spacing.md },
  previewMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewStat: { fontSize: 14, fontFamily: FontFamily.semibold },
  previewDuration: { fontSize: 14, fontFamily: FontFamily.bold },
  previewList: { gap: 3 },
  previewItem: { fontSize: 13 },
  deloadCard: { borderWidth: 1, borderRadius: Radius.sm, padding: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.sm },
  deloadTitle: { fontSize: 15, fontFamily: FontFamily.semibold },
  deloadBody: { fontSize: 14, lineHeight: 20 },
  deloadButtons: { flexDirection: 'column', gap: Spacing.sm },
  deloadBtn: { paddingVertical: Spacing.md, borderRadius: Radius.sm, alignItems: 'center' },
  deloadBtnPrimary: {},
  deloadBtnPrimaryText: { fontSize: 15, fontFamily: FontFamily.semibold },
  deloadBtnSecondary: { borderWidth: 1 },
  deloadBtnSecondaryText: { fontSize: 15 },
});
