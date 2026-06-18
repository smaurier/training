import { Spacing } from '@/constants/Spacing';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import Colors from '@/constants/Colors';
import { Radius } from '@/constants/Radius';
import { useColorScheme } from '@/components/useColorScheme';
import type { BodyMeasurement } from '@/db/types';

type MetricKey = 'weight_kg' | 'waist_cm' | 'arm_cm' | 'thigh_cm' | 'hip_cm';

const METRIC_LABELS: Record<MetricKey, string> = {
  weight_kg: 'Poids',
  waist_cm: 'Tour de taille',
  arm_cm: 'Tour de bras',
  thigh_cm: 'Tour de cuisse',
  hip_cm: 'Tour de hanches',
};

interface Props {
  measurements: BodyMeasurement[]; // triées DESC — on reverse pour affichage chronologique
  metric: MetricKey;
  unit: string;
}

export function BodyMeasurementChart({ measurements, metric, unit }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];

  const points = [...measurements]
    .reverse()
    .map(m => ({ value: m[metric] as number | null, label: m.date.slice(5) }))
    .filter((p): p is { value: number; label: string } => p.value !== null);

  if (points.length < 2) return null;

  const chartData = points.map(p => ({ value: p.value, label: p.label }));

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`Graphique ${METRIC_LABELS[metric]} sur ${points.length} mesures`}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        {METRIC_LABELS[metric]} ({unit})
      </Text>
      <LineChart
        data={chartData}
        width={280}
        height={120}
        color={colors.primary}
        thickness={2}
        dataPointsColor={colors.primary}
        hideDataPoints={points.length > 10}
        yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
        noOfSections={3}
        curved
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
});
