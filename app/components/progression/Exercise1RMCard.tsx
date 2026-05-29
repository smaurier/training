import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { Exercise1RM } from '@/services/ProgressionService';

interface Exercise1RMCardProps {
  item: Exercise1RM;
  onPress: () => void;
  isLast: boolean;
}

export function Exercise1RMCard({ item, onPress, isLast }: Exercise1RMCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const deltaColor =
    item.delta === null ? colors.textSecondary
    : item.delta > 0 ? '#22C55E'
    : item.delta < 0 ? '#EF4444'
    : colors.textSecondary;

  const cardStyles: ViewStyle[] = [styles.card];
  if (!isLast) {
    cardStyles.push({ borderBottomWidth: 1, borderBottomColor: colors.border });
  }

  return (
    <PressableA11y
      accessibilityLabel={`${item.exerciseName}, 1RM ${item.current1RM} kg, ${item.deltaLabel}`}
      onPress={onPress}
      style={cardStyles}
    >
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{item.exerciseName}</Text>
        <Text style={[styles.delta, { color: deltaColor }]}>{item.deltaLabel}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.value, { color: colors.text }]}>{item.current1RM} kg</Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={colors.tabIconDefault}
          importantForAccessibility="no"
          accessibilityElementsHidden={true}
        />
      </View>
    </PressableA11y>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '500' },
  delta: { fontSize: 12 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { fontSize: 16, fontWeight: '700' },
});
