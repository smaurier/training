import { Spacing } from '@/constants/Spacing';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Workout } from '@/db/types';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

interface WorkoutCardProps {
  workout: Workout;
  exerciseCount: number;
  isFirst: boolean;
  isLast: boolean;
  isNext?: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function WorkoutCard({ workout, exerciseCount, isFirst, isLast, isNext, onPress, onLongPress, onMoveUp, onMoveDown }: WorkoutCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <PressableA11y
        style={styles.main}
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityLabel={`Séance ${workout.name}${isNext ? ' — prochaine séance' : ''}`}
        accessibilityHint="Appuie pour configurer les exercices, maintiens pour modifier ou supprimer"
      >
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {workout.name}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {exerciseCount} exercice{exerciseCount !== 1 ? 's' : ''}
        </Text>
        {isNext && (
          <View style={[styles.nextBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.nextBadgeText, { color: colors.onPrimary }]}>→ Prochain</Text>
          </View>
        )}
      </PressableA11y>
      <View style={styles.reorderCol}>
        {!isFirst && (
          <PressableA11y
            accessibilityLabel={`Monter ${workout.name}`}
            onPress={onMoveUp}
            style={styles.reorderBtn}
          >
            <Ionicons name="chevron-up-outline" size={16} color={colors.textSecondary} />
          </PressableA11y>
        )}
        {!isLast && (
          <PressableA11y
            accessibilityLabel={`Descendre ${workout.name}`}
            onPress={onMoveDown}
            style={styles.reorderBtn}
          >
            <Ionicons name="chevron-down-outline" size={16} color={colors.textSecondary} />
          </PressableA11y>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
    minHeight: 44,
  },
  main: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
  },
  nextBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.lg,
    marginTop: Spacing.xs,
  },
  nextBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reorderCol: {
    paddingRight: Spacing.sm,
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderBtn: { padding: Spacing.sm, alignItems: 'center', justifyContent: 'center' },
});
