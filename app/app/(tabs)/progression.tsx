import { SectionList, View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useHistory } from '@/hooks/useHistory';
import { useProgression } from '@/hooks/useProgression';
import { SessionCard } from '@/components/history/SessionCard';
import { VolumeBarChart } from '@/components/progression/VolumeBarChart';
import { Exercise1RMCard } from '@/components/progression/Exercise1RMCard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import type { SessionSummary } from '@/services/HistoryService';
import type { Exercise1RM } from '@/services/ProgressionService';

type Segment = 'historique' | 'stats';

export default function ProgressionScreen() {
  const { sections, isLoading: histLoading, error: histError, refresh: refreshHist } = useHistory();
  const { stats, volumeByWeek, recentPRs, exercise1RMList, isLoading: statsLoading, error: statsError, refresh: refreshStats } = useProgression();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeSegment, setActiveSegment] = useState<Segment>('historique');

  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refreshHist();
      refreshStats();
    }, [refreshHist, refreshStats])
  );

  const segmentControl = (
    <View style={[styles.segmentContainer, { backgroundColor: colors.background }]} accessibilityRole="tablist">
      <View style={[styles.segmentTrack, { backgroundColor: colors.surface }]}>
        {(['historique', 'stats'] as Segment[]).map(seg => (
          <PressableA11y
            key={seg}
            style={activeSegment === seg ? [styles.segmentButton, { backgroundColor: colors.primary }] : styles.segmentButton}
            onPress={() => setActiveSegment(seg)}
            accessibilityLabel={seg === 'historique' ? 'Historique' : 'Stats'}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeSegment === seg }}
          >
            <Text style={[styles.segmentText, { color: activeSegment === seg ? '#fff' : colors.textSecondary }]}>
              {seg === 'historique' ? 'Historique' : 'Stats'}
            </Text>
          </PressableA11y>
        ))}
      </View>
    </View>
  );

  if (activeSegment === 'historique') {
    if (histLoading) {
      return (
        <View style={[styles.flex, { backgroundColor: colors.background }]}>
          {segmentControl}
          <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
        </View>
      );
    }
    if (histError) {
      return (
        <View style={[styles.flex, { backgroundColor: colors.background }]}>
          {segmentControl}
          <View style={styles.center}>
            <Text style={[styles.message, { color: colors.text }]}>{histError}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        {segmentControl}
        <SectionList
          sections={sections}
          keyExtractor={(item: SessionSummary) => String(item.id)}
          renderItem={({ item }) => (
            <SessionCard
              session={item}
              onPress={() => router.push({ pathname: '/history/[sessionLogId]' as any, params: { sessionLogId: String(item.id) } })}
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]} accessibilityRole="header">{title}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.message, { color: colors.textSecondary }]}>Aucune séance enregistrée</Text>
            </View>
          }
          contentContainerStyle={sections.length === 0 ? styles.emptyContainer : undefined}
          stickySectionHeadersEnabled
        />
      </View>
    );
  }

  // Stats segment
  if (statsLoading) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        {segmentControl}
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }
  if (statsError) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        {segmentControl}
        <View style={styles.center}>
          <Text style={[styles.message, { color: colors.text }]}>{statsError}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {segmentControl}
      <ScrollView contentContainerStyle={styles.statsContent}>

        {stats && (
          <View style={styles.chipsRow}>
            {[
              { label: 'SÉANCES', value: stats.sessionCount },
              { label: 'PRs', value: stats.prCount },
              { label: 'EXERCICES', value: stats.exerciseCount },
            ].map(chip => (
              <View key={chip.label} style={[styles.chip, { backgroundColor: colors.surface }]}>
                <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>{chip.label}</Text>
                <Text style={[styles.chipValue, { color: colors.text }]}>{chip.value}</Text>
                <Text style={[styles.chipSub, { color: colors.textSecondary }]}>ce mois</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <VolumeBarChart data={volumeByWeek} />
        </View>

        {recentPRs.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>PRs RÉCENTS</Text>
            {recentPRs.map((pr, i) => (
              <View
                key={`${pr.exerciseId}-${i}`}
                style={[styles.prRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}
              >
                <View style={styles.prInfo}>
                  <Text style={[styles.prName, { color: colors.text }]}>{pr.exerciseName}</Text>
                  <Text style={[styles.prMeta, { color: colors.textSecondary }]}>
                    {pr.weight} kg × {pr.reps} · ~{pr.estimated1RM} kg 1RM
                  </Text>
                </View>
                <Text style={[styles.prDate, { color: colors.textSecondary }]}>
                  {new Date(pr.achievedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {exercise1RMList.length > 0 && (
          <View>
            <Text style={[styles.listTitle, { color: colors.textSecondary }]}>1RM PAR EXERCICE</Text>
            <View style={[styles.list, { backgroundColor: colors.surface }]}>
              {exercise1RMList.map((item: Exercise1RM, i) => (
                <Exercise1RMCard
                  key={item.exerciseId}
                  item={item}
                  isLast={i === exercise1RMList.length - 1}
                  onPress={() => router.push({
                    pathname: '/progression/[exerciseId]' as any,
                    params: { exerciseId: String(item.exerciseId), exerciseName: item.exerciseName },
                  })}
                />
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 60 },
  emptyContainer: { flex: 1 },
  message: { fontSize: 15, textAlign: 'center' },
  segmentContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  segmentTrack: { flexDirection: 'row', borderRadius: Radius.sm, padding: 3 },
  segmentButton: { flex: 1, borderRadius: Radius.sm, paddingVertical: 6, alignItems: 'center' },
  segmentText: { fontSize: 13, fontWeight: '600' },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  statsContent: { paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, borderRadius: Radius.sm, padding: 10, alignItems: 'center', gap: 2 },
  chipLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipValue: { fontSize: 22, fontWeight: '700' },
  chipSub: { fontSize: 9 },
  card: { borderRadius: Radius.sm, padding: 14 },
  cardLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  prRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  prInfo: { flex: 1, gap: 2 },
  prName: { fontSize: 14, fontWeight: '500' },
  prMeta: { fontSize: 12 },
  prDate: { fontSize: 12 },
  listTitle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  list: { borderRadius: Radius.sm, overflow: 'hidden' },
});
