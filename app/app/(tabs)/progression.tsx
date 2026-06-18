import { Spacing } from '@/constants/Spacing';
import { SectionList, View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { PressableA11y } from '@/components/ui/PressableA11y';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useHistory } from '@/hooks/useHistory';
import { useProgression } from '@/hooks/useProgression';
import { useGoals } from '@/hooks/useGoals';
import { useBodyMeasurements } from '@/hooks/useBodyMeasurements';
import { LatestMeasurementsCard } from '@/components/progression/LatestMeasurementsCard';
import { BodyMeasurementChart } from '@/components/progression/BodyMeasurementChart';
import { AddMeasurementSheet, type AddMeasurementSheetRef } from '@/components/progression/AddMeasurementSheet';
import { SessionCard } from '@/components/history/SessionCard';
import { VolumeBarChart } from '@/components/progression/VolumeBarChart';
import { Exercise1RMCard } from '@/components/progression/Exercise1RMCard';
import { MuscleGroupCard } from '@/components/progression/MuscleGroupCard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { LetterSpacing, FontFamily  } from '@/constants/Typography';
import type { SessionSummary } from '@/services/HistoryService';
import type { Exercise1RM } from '@/services/ProgressionService';

type Segment = 'historique' | 'stats' | 'corps';

export default function ProgressionScreen() {
  const { sections, isLoading: histLoading, error: histError, refresh: refreshHist } = useHistory();
  const { stats, volumeByWeek, recentPRs, exercise1RMList, volumeByMuscleGroup, monthlyPresences, isLoading: statsLoading, error: statsError, refresh: refreshStats } = useProgression();
  const router = useRouter();
  const { goals, refresh: refreshGoals } = useGoals();
  const { measurements, latest, save: saveMeasurement } = useBodyMeasurements();
  const addSheetRef = useRef<AddMeasurementSheetRef>(null);
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
      refreshGoals();
    }, [refreshHist, refreshStats, refreshGoals])
  );

  const segmentControl = (
    <View style={[styles.segmentContainer, { backgroundColor: colors.background }]} accessibilityRole="tablist">
      <View style={[styles.segmentTrack, { backgroundColor: colors.surface }]}>
        {(['historique', 'stats', 'corps'] as Segment[]).map(seg => (
          <PressableA11y
            key={seg}
            style={activeSegment === seg ? [styles.segmentButton, { backgroundColor: colors.primary }] : styles.segmentButton}
            onPress={() => setActiveSegment(seg)}
            accessibilityLabel={
              seg === 'historique' ? 'Historique' :
              seg === 'stats' ? 'Stats' : 'Corps'
            }
            accessibilityRole="tab"
            accessibilityState={{ selected: activeSegment === seg }}
          >
            <Text style={[styles.segmentText, { color: activeSegment === seg ? colors.onPrimary : colors.textSecondary }]}>
              {seg === 'historique' ? 'Historique' : seg === 'stats' ? 'Stats' : 'Corps'}
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

  // Corps segment
  if (activeSegment === 'corps') {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        {segmentControl}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <LatestMeasurementsCard latest={latest} />

          {(['weight_kg', 'waist_cm', 'arm_cm', 'thigh_cm', 'hip_cm'] as const).map(metric => (
            <BodyMeasurementChart
              key={metric}
              measurements={measurements}
              metric={metric}
              unit={metric === 'weight_kg' ? 'kg' : 'cm'}
            />
          ))}

          {measurements.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucune mesure enregistrée. Appuie sur + pour commencer.
            </Text>
          )}

          <PressableA11y
            onPress={() => addSheetRef.current?.expand()}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            accessibilityLabel="Ajouter une mesure corporelle"
            accessibilityRole="button"
          >
            <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>+ Ajouter une mesure</Text>
          </PressableA11y>

          <AddMeasurementSheet ref={addSheetRef} onSave={saveMeasurement} />
        </ScrollView>
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

        {monthlyPresences > 0 && (
          <View
            style={[styles.presencesCard, { backgroundColor: colors.surface }]}
            accessible={true}
            accessibilityLabel={`${monthlyPresences} ${monthlyPresences === 1 ? 'séance' : 'séances'} ce mois`}
          >
            <Text style={[styles.presencesText, { color: colors.text }]}>
              {monthlyPresences} {monthlyPresences === 1 ? 'séance' : 'séances'} ce mois
            </Text>
          </View>
        )}

        {stats && (
          <View style={styles.chipsRow}>
            {[
              { label: 'SÉANCES', value: stats.sessionCount },
              { label: 'MARQUES', value: stats.prCount },
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

        <MuscleGroupCard data={volumeByMuscleGroup} />

        {goals.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>OBJECTIFS</Text>
            {goals.map(({ goal, exerciseName }, i) => (
              <PressableA11y
                key={goal.id}
                accessibilityLabel={`Objectif ${exerciseName} : ${goal.target_weight} kg${goal.achieved_at ? ', atteint' : ''}`}
                onPress={() => router.push({
                  pathname: '/progression/[exerciseId]' as any,
                  params: { exerciseId: String(goal.exercise_id), exerciseName },
                })}
                style={[styles.goalRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <Text style={[styles.goalRowName, { color: colors.text }]}>{exerciseName}</Text>
                <Text style={[styles.goalRowTarget, { color: goal.achieved_at ? colors.primary : colors.textSecondary }]}>
                  {goal.achieved_at ? `✦ ${goal.target_weight} kg atteint` : `→ ${goal.target_weight} kg`}
                </Text>
              </PressableA11y>
            ))}
          </View>
        )}

        <PressableA11y
          accessibilityLabel="Rechercher un exercice"
          onPress={() => router.push('/progression/search' as any)}
          style={[styles.searchEntry, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.searchEntryText, { color: colors.textSecondary }]}>Rechercher un exercice</Text>
          <Text style={[styles.searchEntryChevron, { color: colors.textSecondary }]}>›</Text>
        </PressableA11y>

        <PressableA11y
          accessibilityLabel="Importer un footing GPX"
          onPress={() => router.push('/import-gpx' as any)}
          style={[styles.searchEntry, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.searchEntryText, { color: colors.textSecondary }]}>Importer un footing</Text>
          <Text style={[styles.searchEntryChevron, { color: colors.textSecondary }]}>›</Text>
        </PressableA11y>

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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl, marginTop: 60 },
  emptyContainer: { flex: 1 },
  message: { fontSize: 15, textAlign: 'center' },
  segmentContainer: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  segmentTrack: { flexDirection: 'row', borderRadius: Radius.sm, padding: 3 },
  segmentButton: { flex: 1, borderRadius: Radius.sm, paddingVertical: Spacing.sm, alignItems: 'center' },
  segmentText: { fontSize: 13, fontFamily: FontFamily.semibold },
  sectionHeader: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  sectionTitle: { fontSize: 12, fontFamily: FontFamily.bold, textTransform: 'uppercase', letterSpacing: LetterSpacing.widest },
  statsContent: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, gap: Spacing.md },
  scrollContent: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, gap: Spacing.md },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: Spacing.xxl },
  addBtn: { borderRadius: Radius.sm, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.sm },
  addBtnText: { fontSize: 15, fontFamily: FontFamily.semibold },
  chipsRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: { flex: 1, borderRadius: Radius.sm, padding: Spacing.md, alignItems: 'center', gap: 2 },
  chipLabel: { fontSize: 9, fontFamily: FontFamily.bold, textTransform: 'uppercase', letterSpacing: LetterSpacing.wide },
  chipValue: { fontSize: 22, fontFamily: FontFamily.bold },
  chipSub: { fontSize: 9 },
  card: { borderRadius: Radius.sm, padding: Spacing.lg },
  cardLabel: { fontSize: 10, fontFamily: FontFamily.bold, textTransform: 'uppercase', letterSpacing: LetterSpacing.wide, marginBottom: Spacing.md },
  prRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  prInfo: { flex: 1, gap: 2 },
  prName: { fontSize: 14, fontFamily: FontFamily.regular },
  prMeta: { fontSize: 12 },
  prDate: { fontSize: 12 },
  listTitle: { fontSize: 10, fontFamily: FontFamily.bold, textTransform: 'uppercase', letterSpacing: LetterSpacing.wide, marginBottom: Spacing.sm },
  list: { borderRadius: Radius.sm, overflow: 'hidden' },
  presencesCard: { borderRadius: Radius.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  presencesText: { fontSize: 15, fontFamily: FontFamily.semibold },
  searchEntry: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: Radius.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  searchEntryText: { fontSize: 14 },
  searchEntryChevron: { fontSize: 18 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  goalRowName: { fontSize: 14, fontFamily: FontFamily.regular, flex: 1 },
  goalRowTarget: { fontSize: 13 },
});
