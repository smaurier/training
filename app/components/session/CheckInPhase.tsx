// app/components/session/CheckInPhase.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { CheckIn } from '@/services/SessionService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

interface CheckInOption {
  value: 1 | 2 | 3;
  emoji: string;
  text: string;
}

interface CheckInRowConfig {
  label: string;
  options: readonly CheckInOption[];
}

const CHECKIN_LABELS: Record<string, CheckInRowConfig> = {
  energy: { label: 'Énergie', options: [{ value: 1, emoji: '😴', text: 'Faible' }, { value: 2, emoji: '😐', text: 'Normale' }, { value: 3, emoji: '💪', text: 'Élevée' }] },
  fatigue: { label: 'Fatigue', options: [{ value: 1, emoji: '🟢', text: 'Reposé' }, { value: 2, emoji: '🟡', text: 'Modérée' }, { value: 3, emoji: '🔴', text: 'Élevée' }] },
  sleep: { label: 'Sommeil', options: [{ value: 1, emoji: '😴', text: 'Mauvais' }, { value: 2, emoji: '😐', text: 'Correct' }, { value: 3, emoji: '🌙', text: 'Bon' }] },
} as const;

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

  async function handleStart() {
    if (!canStart || loading) return;
    setLoading(true);
    try {
      await onStart({ checkin_energy: energy, checkin_fatigue: fatigue, checkin_sleep: sleep });
    } finally {
      setLoading(false);
    }
  }

  function renderRow(
    config: CheckInRowConfig,
    selected: 1 | 2 | 3 | null,
    onSelect: (v: 1 | 2 | 3) => void
  ) {
    return (
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{config.label}</Text>
        <View style={styles.options}>
          {config.options.map(opt => {
            const isSelected = selected === opt.value;
            const optStyle: ViewStyle[] = [
              styles.option,
              { borderColor: isSelected ? colors.primary : colors.border },
              ...(isSelected ? [{ backgroundColor: colors.primary + '15' } as ViewStyle] : []),
            ];
            return (
            <PressableA11y
              key={opt.value}
              accessibilityLabel={`${config.label} : ${opt.text}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(opt.value)}
              style={optStyle}
            >
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
              <Text style={[styles.optionText, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                {opt.text}
              </Text>
            </PressableA11y>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Comment tu te sens ?</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>3 questions rapides avant de commencer</Text>

      {renderRow(CHECKIN_LABELS.energy, energy, setEnergy)}
      {renderRow(CHECKIN_LABELS.fatigue, fatigue, setFatigue)}
      {renderRow(CHECKIN_LABELS.sleep, sleep, setSleep)}

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
  container: { flexGrow: 1, padding: 24, gap: 24 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 32 },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: -16 },
  row: { gap: 10 },
  rowLabel: { fontSize: 16, fontWeight: '600' },
  options: { flexDirection: 'row', gap: 10 },
  option: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.sm, borderWidth: 1.5, gap: 4 },
  optionEmoji: { fontSize: 22 },
  optionText: { fontSize: 11, fontWeight: '500' },
  startBtn: { marginTop: 8, paddingVertical: 16, borderRadius: Radius.sm, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
