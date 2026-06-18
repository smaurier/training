import { useState } from 'react';
import { LetterSpacing } from '@/constants/Typography';
import { View, Text, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import type { MacroGroupVolume, MacroCategory } from '@/services/muscleGroupUtils';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { useUnits } from '@/hooks/useUnits';

interface MuscleGroupCardProps {
  data: MacroGroupVolume[];
}

export function MuscleGroupCard({ data }: MuscleGroupCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { convert, label: unitLabel } = useUnits();
  const [expanded, setExpanded] = useState<Set<MacroCategory>>(new Set());

  if (data.length === 0) return null;

  function toggle(category: MacroCategory) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>VOLUME PAR STIMULUS</Text>
      {data.map(item => {
        const isExp = expanded.has(item.category);
        const volDisplay = Math.round(parseFloat(convert(item.volume))).toLocaleString();
        return (
          <View key={item.category}>
            <PressableA11y
              accessibilityLabel={`${item.category}, ${item.percentage}%, ${volDisplay} ${unitLabel}`}
              accessibilityState={{ expanded: isExp }}
              onPress={() => toggle(item.category)}
              style={styles.row}
            >
              <Text style={[styles.catLabel, { color: colors.text }]}>{item.category}</Text>
              <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.barFill,
                    { backgroundColor: colors.primary, width: `${item.percentage}%` as `${number}%` },
                  ]}
                />
              </View>
              <Text style={[styles.pct, { color: colors.textSecondary }]}>{item.percentage}%</Text>
              <Text style={[styles.vol, { color: colors.text }]}>{volDisplay} {unitLabel}</Text>
              <Text style={[styles.chevron, { color: colors.textSecondary }]}>{isExp ? '▼' : '▶'}</Text>
            </PressableA11y>
            {isExp && item.muscles.map(m => (
              <View key={m.muscle} style={styles.muscleRow}>
                <Text style={[styles.muscleLabel, { color: colors.textSecondary }]}>· {m.muscle}</Text>
                <Text style={[styles.muscleVol, { color: colors.textSecondary }]}>
                  {Math.round(parseFloat(convert(m.volume))).toLocaleString()} {unitLabel}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.sm, padding: 14, gap: 10 },
  title: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: LetterSpacing.wide, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  catLabel: { fontSize: 13, fontWeight: '600', width: 64 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  pct: { fontSize: 11, width: 30, textAlign: 'right' },
  vol: { fontSize: 12, fontWeight: '600', width: 80, textAlign: 'right' },
  chevron: { fontSize: 10, width: 14, textAlign: 'center' },
  muscleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 72, paddingVertical: 2 },
  muscleLabel: { fontSize: 12 },
  muscleVol: { fontSize: 12 },
});
