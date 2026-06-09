import { View, Text, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { CircularTimer } from '@/components/ui/CircularTimer';
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

export function RestPhase({ durationSeconds, timer, nextLabel, onContinue }: RestPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isDone = durationSeconds === 0 || (timer.remaining === 0 && !timer.isRunning);
  const progress = durationSeconds > 0 ? timer.remaining / durationSeconds : 0;

  return (
    <View style={[styles.container, { backgroundColor: isDone ? '#16a34a15' : colors.background }]}>
      <View
        accessible={true}
        accessibilityLabel={`Temps de repos restant : ${timer.remaining} secondes`}
      >
        <CircularTimer
          progress={progress}
          remaining={timer.remaining}
          label={isDone ? "C'EST PARTI" : 'REPOS'}
          size={200}
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
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 20,
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
