import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import type { ProgressionResult } from '@/services/SessionService';
import type { PlateauResult } from '@/services/PlateauDetectionService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { useUnits } from '@/hooks/useUnits';

interface SummaryPhaseProps {
  progressions: ProgressionResult[];
  totalSets: number;
  durationSeconds: number;
  totalVolumeKg?: number;
  plateaus?: PlateauResult[];
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s > 0 ? `${s} s` : ''}`.trim() : `${s} s`;
}

export function SummaryPhase({ progressions, totalSets, durationSeconds, totalVolumeKg, plateaus, onClose }: SummaryPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { convert, label: unitLabel } = useUnits();

  const progressionCount = progressions.filter(p => p.achieved).length;

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={[styles.heroTitle, { color: colors.text }]}>Séance terminée !</Text>
        <Text style={[styles.heroDuration, { color: colors.textSecondary }]}>{formatDuration(durationSeconds)}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalSets}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>SÉRIES</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: progressionCount > 0 ? '#16a34a' : colors.text }]}>↑ {progressionCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>PROGRESSIONS</Text>
        </View>
      </View>

      {totalVolumeKg != null && totalVolumeKg > 0 && (
        <View style={[styles.volumeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>VOLUME TOTAL</Text>
          <Text style={[styles.volumeValue, { color: colors.text }]}>
            {Math.round(parseFloat(convert(totalVolumeKg))).toLocaleString()} {unitLabel}
          </Text>
        </View>
      )}

      {progressions.length > 0 && (
        <View style={[styles.progressionSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Progressions</Text>
          {progressions.map(p => (
            <View key={p.exerciseId} style={[styles.progressionRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.progressionName, { color: colors.text }]} numberOfLines={1}>{p.exerciseName}</Text>
              {p.achieved ? (
                <View style={styles.progressionValues}>
                  <Text style={[styles.progressionOld, { color: colors.textSecondary }]}>
                    {p.oldWeight != null ? `${convert(p.oldWeight)} ${unitLabel}` : '—'}
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color="#16a34a" />
                  <Text style={styles.progressionNew}>{p.newWeight != null ? `${convert(p.newWeight)} ${unitLabel}` : '—'}</Text>
                </View>
              ) : (
                <Text style={[styles.progressionPending, { color: colors.textSecondary }]}>
                  {p.consecutiveSuccesses}/{p.threshold} séances
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {plateaus && plateaus.length > 0 && (
        <View style={[styles.plateauSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Même charge depuis 3 séances</Text>
          {plateaus.map(p => (
            <View key={p.exerciseId} style={[styles.plateauRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.plateauName, { color: colors.text }]} numberOfLines={1}>{p.exerciseName}</Text>
              <Text style={[styles.plateauWeight, { color: colors.textSecondary }]}>
                {convert(p.currentWeight)} {unitLabel}
              </Text>
            </View>
          ))}
          <Text style={[styles.plateauHint, { color: colors.textSecondary }]}>
            Tu peux tenter d'augmenter à la prochaine séance.
          </Text>
        </View>
      )}

      <PressableA11y
        accessibilityLabel="Retour au programme"
        onPress={onClose}
        style={[styles.closeBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.closeBtnText}>Retour au programme</Text>
      </PressableA11y>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 20 },
  hero: { alignItems: 'center', paddingVertical: 16, gap: 6 },
  emoji: { fontSize: 48 },
  heroTitle: { fontSize: 26, fontWeight: '700' },
  heroDuration: { fontSize: 16 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: Radius.sm, padding: 16, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  volumeCard: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  volumeValue: { fontSize: 22, fontWeight: '700' },
  progressionSection: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  progressionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  progressionName: { flex: 1, fontSize: 14 },
  progressionValues: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressionOld: { fontSize: 13 },
  progressionNew: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  progressionPending: { fontSize: 12 },
  plateauSection: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 10 },
  plateauRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1 },
  plateauName: { flex: 1, fontSize: 14 },
  plateauWeight: { fontSize: 13 },
  plateauHint: { fontSize: 13, fontStyle: 'italic', marginTop: 2 },
  closeBtn: { paddingVertical: 16, borderRadius: Radius.sm, alignItems: 'center', marginTop: 8 },
  closeBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
