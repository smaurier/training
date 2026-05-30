// app/components/session/CheckInPhase.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { CheckIn } from '@/services/SessionService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

interface CheckInRowConfig {
  label: string;
  options: readonly { value: 1 | 2 | 3; text: string }[];
}

const CHECKIN_ROWS: CheckInRowConfig[] = [
  { label: 'Énergie', options: [{ value: 1, text: 'Faible' }, { value: 2, text: 'Normale' }, { value: 3, text: 'Élevée' }] },
  { label: 'Fatigue', options: [{ value: 1, text: 'Reposé' }, { value: 2, text: 'Modérée' }, { value: 3, text: 'Élevée' }] },
  { label: 'Sommeil', options: [{ value: 1, text: 'Mauvais' }, { value: 2, text: 'Correct' }, { value: 3, text: 'Bon' }] },
];

interface CheckInPhaseProps {
  onStart: (checkin: CheckIn) => Promise<void>;
}

export function CheckInPhase({ onStart }: CheckInPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [energy, setEnergy] = useState<1 | 2 | 3 | null>(null);
  const [fatigue, setFatigue] = useState<1 | 2 | 3 | null>(null);
  const [sleep, setSleep] = useState<1 | 2 | 3 | null>(null);
  const [loading, setLoading] = useState(false);

  const canStart = energy !== null && fatigue !== null && sleep !== null;

  const setters = [setEnergy, setFatigue, setSleep];
  const values = [energy, fatigue, sleep];

  async function handleStart() {
    if (!canStart || loading) return;
    setLoading(true);
    try {
      await onStart({ checkin_energy: energy!, checkin_fatigue: fatigue!, checkin_sleep: sleep! });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <Text style={[styles.title, { color: colors.text }]}>Comment tu te sens ?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>3 questions avant de commencer</Text>
      </View>

      {CHECKIN_ROWS.map((row, i) => (
        <View key={row.label} style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{row.label.toUpperCase()}</Text>
          <View style={[styles.segment, { borderColor: colors.border }]}>
            {row.options.map((opt, j) => {
              const isSelected = values[i] === opt.value;
              const isFirst = j === 0;
              const isLast = j === row.options.length - 1;
              return (
                <PressableA11y
                  key={opt.value}
                  accessibilityLabel={`${row.label} : ${opt.text}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setters[i](opt.value)}
                  style={[
                    styles.segmentBtn,
                    { backgroundColor: isSelected ? colors.primary : colors.surface },
                    isFirst ? styles.segmentFirst : undefined as unknown as ViewStyle,
                    isLast ? styles.segmentLast : undefined as unknown as ViewStyle,
                    (!isLast ? { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border } : undefined) as ViewStyle,
                  ]}
                >
                  <Text style={[
                    styles.segmentText,
                    { color: isSelected ? '#fff' : colors.textSecondary },
                    isSelected && styles.segmentTextSelected,
                  ]}>
                    {opt.text}
                  </Text>
                </PressableA11y>
              );
            })}
          </View>
        </View>
      ))}

      <PressableA11y
        accessibilityLabel="Commencer la séance"
        accessibilityState={{ disabled: !canStart }}
        onPress={handleStart}
        style={[styles.startBtn, { backgroundColor: colors.primary, opacity: canStart ? 1 : 0.4 }]}
      >
        <Text style={styles.startBtnText}>{loading ? 'Démarrage…' : 'Commencer la séance'}</Text>
      </PressableA11y>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 28 },
  hero: { alignItems: 'center', paddingTop: 32, gap: 6 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center' },
  row: { gap: 10 },
  rowLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: Radius.sm, overflow: 'hidden' },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  segmentFirst: { borderTopLeftRadius: Radius.sm, borderBottomLeftRadius: Radius.sm },
  segmentLast: { borderTopRightRadius: Radius.sm, borderBottomRightRadius: Radius.sm },
  segmentText: { fontSize: 14, fontWeight: '500' },
  segmentTextSelected: { fontWeight: '700' },
  startBtn: { marginTop: 8, paddingVertical: 16, borderRadius: Radius.sm, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
