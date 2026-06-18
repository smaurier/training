import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import Colors from '@/constants/Colors';
import { LetterSpacing, FontFamily  } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import type { WeeklyVolume } from '@/services/ProgressionService';

interface VolumeBarChartProps {
  data: WeeklyVolume[];
}

export function VolumeBarChart({ data }: VolumeBarChartProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (data.length === 0) return null;

  const currentWeek = data[data.length - 1];
  const prevWeek = data[data.length - 2];
  const delta = prevWeek && prevWeek.volume > 0
    ? Math.round((currentWeek.volume - prevWeek.volume) / prevWeek.volume * 100)
    : null;

  const maxVolume = Math.max(...data.map(w => w.volume), 1);

  const barData = data.map((week, i) => ({
    value: week.volume,
    label: week.weekLabel,
    frontColor: i === data.length - 1 ? colors.primary : colors.textDisabled,
    labelTextStyle: {
      color: i === data.length - 1 ? colors.primary : colors.textSecondary,
      fontSize: 10,
    },
  }));

  return (
    <View>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>VOLUME / SEMAINE</Text>
        {delta !== null && (
          <Text style={[styles.delta, { color: delta >= 0 ? '#22C55E' : '#EF4444' }]}>
            {delta >= 0 ? '↑' : '↓'} {delta >= 0 ? '+' : ''}{delta}% vs S-1
          </Text>
        )}
      </View>
      <View
        accessible={true}
        accessibilityLabel={`Graphique volume des 4 dernières semaines. Semaine en cours : ${currentWeek.volume.toLocaleString('fr-FR')} kg`}
      >
        <BarChart
          data={barData}
          barWidth={36}
          noOfSections={3}
          maxValue={maxVolume}
          hideRules
          xAxisThickness={0}
          yAxisThickness={0}
          barBorderRadius={3}
          yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          height={80}
          width={260}
        />
      </View>
      <Text style={[styles.total, { color: colors.text }]}>
        {currentWeek.volume.toLocaleString('fr-FR')} kg
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  label: { fontSize: 10, fontFamily: FontFamily.bold, textTransform: 'uppercase', letterSpacing: LetterSpacing.wide },
  delta: { fontSize: 10, fontFamily: FontFamily.semibold },
  total: { fontSize: 14, fontFamily: FontFamily.bold, marginTop: 4 },
});
