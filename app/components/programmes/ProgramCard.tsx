import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Program } from '@/db/types';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

const ACTIVE_BADGE_TEXT_COLOR = '#fff' as const;

interface ProgramCardProps {
  program: Program;
  workoutCount: number;
  onPress: () => void;
  onLongPress: () => void;
}

export function ProgramCard({ program, workoutCount, onPress, onLongPress }: ProgramCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`Programme ${program.name}, ${workoutCount} séance${workoutCount !== 1 ? 's' : ''}`}
      accessibilityHint="Appuie pour voir les séances, maintiens pour modifier ou supprimer"
    >
      <View style={styles.row}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {program.name}
        </Text>
        {program.is_active === 1 && (
          <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}
            accessibilityLabel="Programme actif"
            accessibilityRole="text"
          >
            <Text style={styles.activeBadgeText}>actif</Text>
          </View>
        )}
      </View>
      {program.description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {program.description}
        </Text>
      ) : null}
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {workoutCount} séance{workoutCount !== 1 ? 's' : ''}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginBottom: 10,
    gap: 4,
    minHeight: 44,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  activeBadgeText: {
    color: ACTIVE_BADGE_TEXT_COLOR,
    fontSize: 11,
    fontWeight: '600',
  },
});
