import { Spacing } from '@/constants/Spacing';
import { View, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface SeriesProgressBarProps {
  done: number;
  total: number;
  height?: number;
}

export function SeriesProgressBar({ done, total, height = 3 }: SeriesProgressBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.row, { gap: Spacing.xs }]}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            { height, backgroundColor: i < done ? colors.primary : colors.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', width: '100%' },
  segment: { flex: 1, borderRadius: 1 },
});
