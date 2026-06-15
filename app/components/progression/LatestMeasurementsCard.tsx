import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { BodyMeasurement } from '@/db/types';

interface Props {
  latest: BodyMeasurement | null;
  useKg?: boolean;
}

interface MetricRow {
  label: string;
  value: number | null;
  unit: string;
}

export function LatestMeasurementsCard({ latest, useKg = true }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];

  if (!latest) return null;

  const metrics: MetricRow[] = [
    { label: 'Poids', value: latest.weight_kg, unit: useKg ? 'kg' : 'lbs' },
    { label: 'Tour de taille', value: latest.waist_cm, unit: useKg ? 'cm' : 'in' },
    { label: 'Tour de bras', value: latest.arm_cm, unit: useKg ? 'cm' : 'in' },
    { label: 'Tour de cuisse', value: latest.thigh_cm, unit: useKg ? 'cm' : 'in' },
    { label: 'Tour de hanches', value: latest.hip_cm, unit: useKg ? 'cm' : 'in' },
  ].filter(m => m.value !== null);

  if (metrics.length === 0) return null;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`Dernières mesures du ${latest.date}`}
    >
      <Text style={[styles.title, { color: colors.text }]}>Dernières mesures</Text>
      <Text style={[styles.date, { color: colors.textSecondary }]}>{latest.date}</Text>
      {metrics.map(m => (
        <View key={m.label} style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{m.label}</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {m.value} {m.unit}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
});
