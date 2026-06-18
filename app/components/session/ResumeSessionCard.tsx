import React from 'react';
import { LetterSpacing } from '@/constants/Typography';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

export interface ResumeSessionCardProps {
  workoutName: string;
  serieLabel: string;
  onPress: () => void;
}

export function ResumeSessionCard({ workoutName, serieLabel, onPress }: ResumeSessionCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <PressableA11y
      accessibilityLabel={`Reprendre la séance en pause : ${workoutName}`}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.primary }]}
    >
      <View style={styles.row}>
        <Ionicons
          name="pause-circle-outline"
          size={16}
          color={colors.primary}
          importantForAccessibility="no"
          accessibilityElementsHidden
        />
        <Text style={[styles.label, { color: colors.primary }]}>SÉANCE EN PAUSE</Text>
      </View>
      <Text style={[styles.workoutName, { color: colors.text }]}>{workoutName}</Text>
      <Text style={[styles.serieLabel, { color: colors.textSecondary }]}>{serieLabel}</Text>
      <Text style={[styles.cta, { color: colors.primary }]}>Reprendre →</Text>
    </PressableA11y>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: Radius.md, padding: 16, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: LetterSpacing.wide },
  workoutName: { fontSize: 18, fontWeight: '700' },
  serieLabel: { fontSize: 13 },
  cta: { fontSize: 14, fontWeight: '600', marginTop: 4 },
});
