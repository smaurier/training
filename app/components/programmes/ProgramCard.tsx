import { View, Text, StyleSheet } from 'react-native';
import { Program } from '@/db/types';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

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
    <PressableA11y
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        program.is_active === 1 && { borderLeftWidth: 3, borderLeftColor: colors.primary },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={`Programme ${program.name}, ${workoutCount} séance${workoutCount !== 1 ? 's' : ''}`}
      accessibilityHint="Appuie pour voir les séances, maintiens pour modifier ou supprimer"
    >
      <View style={styles.row}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {program.name}
        </Text>
      </View>
      {program.description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
          {program.description}
        </Text>
      ) : null}
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {workoutCount} séance{workoutCount !== 1 ? 's' : ''}
      </Text>
    </PressableA11y>
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
});
