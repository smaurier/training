// app/components/session/RestPhase.tsx
import { View, Text, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import type { UseTimerResult } from '@/hooks/useTimer';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';

interface RestPhaseProps {
  durationSeconds: number;
  timer: UseTimerResult;
  nextLabel: string;
  onContinue: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RestPhase({ durationSeconds, timer, nextLabel, onContinue }: RestPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isDone = timer.remaining === 0 && !timer.isRunning;
  const progress = durationSeconds > 0 ? timer.remaining / durationSeconds : 0;

  return (
    <View style={[styles.container, { backgroundColor: isDone ? '#16a34a15' : colors.background }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>REPOS</Text>

      <Text
        style={[styles.timerText, { color: isDone ? '#16a34a' : colors.primary }]}
        accessibilityLabel={`Temps de repos restant : ${timer.remaining} secondes`}
      >
        {formatTime(timer.remaining)}
      </Text>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: isDone ? '#16a34a' : colors.primary,
              width: `${Math.round(progress * 100)}%`,
            },
          ]}
        />
      </View>

      <Text style={[styles.nextLabel, { color: colors.textSecondary }]}>{nextLabel}</Text>

      <PressableA11y
        accessibilityLabel={isDone ? "C'est parti, continuer la séance" : 'Passer le repos'}
        onPress={onContinue}
        style={[
          styles.continueBtn,
          isDone
            ? { backgroundColor: colors.primary }
            : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            styles.continueBtnText,
            { color: isDone ? (colorScheme === 'dark' ? '#000' : '#fff') : colors.textSecondary },
          ]}
        >
          {isDone ? "C'est parti →" : 'Passer →'}
        </Text>
      </PressableA11y>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  timerText: {
    fontSize: 72,
    fontWeight: '700',
    letterSpacing: -2,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
  },
  nextLabel: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
  },
  continueBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: Radius.sm,
    alignItems: 'center',
    marginTop: 'auto',
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
