import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useExerciseHistory } from '@/hooks/useExerciseHistory';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { useUnits } from '@/hooks/useUnits';
import type { ExerciseSession } from '@/services/ExerciseHistoryService';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function ExerciseHistoryScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const { history, isLoading, error } = useExerciseHistory(Number(exerciseId));
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { convert, label: unitLabel } = useUnits();

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !history) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {error ?? 'Exercice introuvable'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      {history.lastSession ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            DERNIÈRE SÉANCE — {formatDate(history.lastSession.date)}
          </Text>
          {history.lastSession.sets.map((s, i) => (
            <Text key={i} style={[styles.setRow, { color: colors.text }]}>
              · {s.weight > 0 ? `${convert(s.weight)} ${unitLabel}` : 'Poids de corps'} × {s.reps} reps
            </Text>
          ))}
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Aucune séance enregistrée
          </Text>
        </View>
      )}

      {history.recentSessions.length > 1 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>HISTORIQUE</Text>
          {history.recentSessions.map((session: ExerciseSession, i) => (
            <View
              key={session.sessionLogId}
              style={[
                styles.historyRow,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              ]}
            >
              <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                {formatDateShort(session.date)}
              </Text>
              <Text style={[styles.historyBest, { color: colors.text }]}>
                {session.bestSet.weight > 0
                  ? `${convert(session.bestSet.weight)} ${unitLabel} × ${session.bestSet.reps}`
                  : `${session.bestSet.reps} reps`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: Radius.sm, padding: 14, gap: 8 },
  cardLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  setRow: { fontSize: 14 },
  message: { fontSize: 14, textAlign: 'center' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  historyDate: { fontSize: 13 },
  historyBest: { fontSize: 14, fontWeight: '600' },
});
