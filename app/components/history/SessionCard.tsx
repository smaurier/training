import { Spacing } from '@/constants/Spacing';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { SessionSummary } from '@/services/HistoryService';

interface SessionCardProps {
  session: SessionSummary;
  onPress: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min${s > 0 ? ` ${s} s` : ''}` : `${s} s`;
}

export function SessionCard({ session, onPress }: SessionCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const dateStr = formatDate(session.startedAt);
  const accessibilityLabel = `${session.workoutName}, ${dateStr}, ${formatDuration(session.durationSeconds)}, ${session.totalSets} séries`;

  return (
    <PressableA11y
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
    >
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.text }]}>{session.workoutName}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {dateStr} · {formatDuration(session.durationSeconds)} · {session.totalSets} séries
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.tabIconDefault}
        importantForAccessibility="no"
        accessibilityElementsHidden={true}
      />
    </PressableA11y>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  content: {
    flex: 1,
    gap: Spacing.xs,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
  },
});
