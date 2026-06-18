import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableA11y } from '@/components/ui/PressableA11y';
import type { ProgressionResult } from '@/services/SessionService';
import type { PlateauResult } from '@/services/PlateauDetectionService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/Radius';
import { useUnits } from '@/hooks/useUnits';
import type { SessionTagSlug } from '@/services/sessionTagsUtils';
import { PREDEFINED_TAGS } from '@/services/sessionTagsUtils';

interface SummaryPhaseProps {
  progressions: ProgressionResult[];
  totalSets: number;
  durationSeconds: number;
  totalVolumeKg?: number;
  plateaus?: PlateauResult[];
  rpeLabel?: 'Facile' | 'Normal' | 'Difficile' | null;
  previousSession?: { volume: number; sets: number } | null;
  suggestNextDeload?: boolean;
  onMoodSelect?: (mood: 1 | 2 | 3) => void;
  selectedMood?: 1 | 2 | 3;
  selectedTags?: SessionTagSlug[];
  onTagToggle?: (slug: SessionTagSlug) => void;
  notes?: string;
  onNotesChange?: (text: string) => void;
  onClose: () => void | Promise<void>;
  emptyCardioSetLogCount?: number;
  onSaveCardioData?: (
    durationSeconds: number | null,
    distanceMeters: number | null,
    rpe: number | null,
  ) => Promise<void>;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s > 0 ? `${s} s` : ''}`.trim() : `${s} s`;
}

export function SummaryPhase({ progressions, totalSets, durationSeconds, totalVolumeKg, plateaus, rpeLabel, previousSession, suggestNextDeload, onMoodSelect, selectedMood, selectedTags = [], onTagToggle, notes = '', onNotesChange, onClose, emptyCardioSetLogCount, onSaveCardioData }: SummaryPhaseProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { convert, label: unitLabel } = useUnits();

  const [cardioDismissed, setCardioDismissed] = useState(false);
  const [cardioMinutes, setCardioMinutes] = useState('');
  const [cardioSeconds, setCardioSeconds] = useState('');
  const [cardioDistanceKm, setCardioDistanceKm] = useState('');
  const [cardioRpe, setCardioRpe] = useState<3 | 6 | 9 | null>(null);

  const showCardioCard = (emptyCardioSetLogCount ?? 0) > 0 && !cardioDismissed;

  const handleCardioSubmit = async () => {
    const mins = parseInt(cardioMinutes || '0', 10);
    const secs = parseInt(cardioSeconds || '0', 10);
    const totalSeconds = mins * 60 + secs;
    const km = parseFloat(cardioDistanceKm || '0');
    await onSaveCardioData?.(
      totalSeconds > 0 ? totalSeconds : null,
      km > 0 ? Math.round(km * 1000) : null,
      cardioRpe,
    );
    setCardioDismissed(true);
  };

  const progressionCount = progressions.filter(p => p.achieved).length;

  const deltaVolume = previousSession != null && totalVolumeKg != null
    ? totalVolumeKg - previousSession.volume
    : null;
  const deltaSets = previousSession != null
    ? totalSets - previousSession.sets
    : null;
  const showDelta = deltaVolume !== null && deltaSets !== null
    && !(deltaVolume === 0 && deltaSets === 0);

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.hero}>
        <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>SÉANCE TERMINÉE</Text>
        <Text style={[styles.heroDuration, { color: colors.textSecondary }]}>
          {formatDuration(durationSeconds)}{rpeLabel ? ` · Effort : ${rpeLabel}` : ''}
        </Text>
      </View>

      <View style={[styles.statsRow, { borderColor: colors.border }]}>
        <View style={styles.statCell}>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalSets}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>SÉRIES</Text>
        </View>
        <View style={[styles.statCell, styles.statCellBorder, { borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{formatDuration(durationSeconds)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>DURÉE</Text>
        </View>
        {totalVolumeKg != null && totalVolumeKg > 0 && (
          <View style={[styles.statCell, styles.statCellBorder, { borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {Math.round(parseFloat(convert(totalVolumeKg))).toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{unitLabel.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {progressionCount > 0 && (
        <View style={[styles.prCard, { borderColor: colors.border }]}>
          <Text style={[styles.prGlyph, { color: colors.primary }]}>✦</Text>
          <View style={styles.prContent}>
            <Text style={[styles.prTitle, { color: colors.primary }]}>Nouvelle meilleure marque</Text>
            <Text style={[styles.prSub, { color: colors.textSecondary }]}>
              {progressions.filter(p => p.achieved).map(p => p.exerciseName).join(', ')}
            </Text>
          </View>
        </View>
      )}

      {progressions.length > 0 && (
        <View style={[styles.progressionSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Progressions</Text>
          {progressions.map(p => (
            <View key={p.exerciseId} style={[styles.progressionRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.progressionName, { color: colors.text }]} numberOfLines={1}>{p.exerciseName}</Text>
              {p.achieved ? (
                <View style={styles.progressionValues}>
                  <Text style={[styles.progressionOld, { color: colors.textSecondary }]}>
                    {p.oldWeight != null ? `${convert(p.oldWeight)} ${unitLabel}` : '—'}
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color="#16a34a" />
                  <Text style={styles.progressionNew}>{p.newWeight != null ? `${convert(p.newWeight)} ${unitLabel}` : '—'}</Text>
                </View>
              ) : (
                <Text style={[styles.progressionPending, { color: colors.textSecondary }]}>
                  {p.consecutiveSuccesses}/{p.threshold} séances
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {plateaus && plateaus.length > 0 && (
        <View style={[styles.plateauSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Même charge depuis 3 séances</Text>
          {plateaus.map(p => (
            <View key={p.exerciseId} style={[styles.plateauRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.plateauName, { color: colors.text }]} numberOfLines={1}>{p.exerciseName}</Text>
              <Text style={[styles.plateauWeight, { color: colors.textSecondary }]}>
                {convert(p.currentWeight)} {unitLabel}
              </Text>
            </View>
          ))}
          <Text style={[styles.plateauHint, { color: colors.textSecondary }]}>
            {"Tu peux tenter d'augmenter à la prochaine séance."}
          </Text>
        </View>
      )}

      {suggestNextDeload && (
        <View style={[styles.deloadHintSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Bientôt une semaine de décharge</Text>
          <Text style={[styles.deloadHintBody, { color: colors.textSecondary }]}>
            {"Tu t'entraînes depuis plusieurs semaines. À la prochaine séance, pense à décharger — les poids seront réduits de 10% pour que tes muscles récupèrent."}
          </Text>
        </View>
      )}

      {showCardioCard && (
        <View style={[styles.cardioCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tu as fait du cardio ?</Text>
          <View style={styles.cardioRow}>
            <View style={styles.cardioField}>
              <Text style={[styles.cardioFieldLabel, { color: colors.textSecondary }]}>Min</Text>
              <TextInput
                style={[styles.cardioInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={cardioMinutes}
                onChangeText={setCardioMinutes}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="Durée en minutes"
              />
            </View>
            <View style={styles.cardioField}>
              <Text style={[styles.cardioFieldLabel, { color: colors.textSecondary }]}>Sec</Text>
              <TextInput
                style={[styles.cardioInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={cardioSeconds}
                onChangeText={setCardioSeconds}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="Durée en secondes"
              />
            </View>
            <View style={styles.cardioField}>
              <Text style={[styles.cardioFieldLabel, { color: colors.textSecondary }]}>km</Text>
              <TextInput
                style={[styles.cardioInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={cardioDistanceKm}
                onChangeText={setCardioDistanceKm}
                keyboardType="decimal-pad"
                maxLength={6}
                placeholder="0.0"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="Distance en kilomètres"
              />
            </View>
          </View>
          <View style={styles.cardioRpeRow}>
            {([
              { rpe: 3 as const, label: 'Léger' },
              { rpe: 6 as const, label: 'Normal' },
              { rpe: 9 as const, label: 'Difficile' },
            ] as const).map(({ rpe, label }) => (
              <PressableA11y
                key={rpe}
                accessibilityLabel={`Sensation : ${label}`}
                accessibilityState={{ selected: cardioRpe === rpe }}
                onPress={() => setCardioRpe(cardioRpe === rpe ? null : rpe)}
                style={[
                  styles.cardioRpeChip,
                  { borderColor: colors.border },
                  cardioRpe === rpe ? { backgroundColor: colors.surfaceElevated } : { backgroundColor: colors.surface },
                ]}
              >
                <Text style={[styles.cardioRpeLabel, { color: colors.text }]}>{label}</Text>
              </PressableA11y>
            ))}
          </View>
          <View style={styles.cardioBtnRow}>
            <PressableA11y
              accessibilityLabel="Enregistrer les données cardio"
              onPress={handleCardioSubmit}
              style={[styles.cardioSaveBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.cardioSaveBtnText, { color: colors.onPrimary }]}>Enregistrer</Text>
            </PressableA11y>
            <PressableA11y
              accessibilityLabel="Ignorer le recueil cardio"
              onPress={() => setCardioDismissed(true)}
              style={[styles.cardioIgnoreBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cardioIgnoreBtnText, { color: colors.textSecondary }]}>Ignorer</Text>
            </PressableA11y>
          </View>
        </View>
      )}

      <View style={[styles.moodSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Comment tu te sens ?</Text>
        <View style={styles.moodRow}>
          {([
            { mood: 1 as const, emoji: '😓', label: 'Épuisé' },
            { mood: 2 as const, emoji: '😌', label: 'Bien' },
            { mood: 3 as const, emoji: '⚡', label: 'En forme' },
          ] as const).map(({ mood, emoji, label }) => (
            <PressableA11y
              key={mood}
              accessibilityLabel={`Humeur : ${label}`}
              accessibilityState={{ selected: selectedMood === mood }}
              onPress={() => onMoodSelect?.(mood)}
              style={[
                styles.moodChip,
                { borderColor: colors.border },
                selectedMood === mood
                  ? { backgroundColor: colors.surfaceElevated }
                  : { backgroundColor: colors.surface },
              ]}
            >
              <Text style={styles.moodEmoji}>{emoji}</Text>
              <Text style={[styles.moodLabel, { color: colors.text }]}>{label}</Text>
            </PressableA11y>
          ))}
        </View>
      </View>

      <View style={[styles.tagsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes de séance</Text>
        <View style={styles.tagsWrap}>
          {PREDEFINED_TAGS.map(tag => (
            <PressableA11y
              key={tag.slug}
              accessibilityLabel={tag.label}
              accessibilityState={{ selected: selectedTags.includes(tag.slug) }}
              onPress={() => onTagToggle?.(tag.slug)}
              style={[
                styles.tagChip,
                { borderColor: colors.border },
                selectedTags.includes(tag.slug)
                  ? { backgroundColor: colors.surfaceElevated }
                  : { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[
                styles.tagLabel,
                { color: colors.text },
              ]}>
                {tag.label}
              </Text>
            </PressableA11y>
          ))}
        </View>
        <TextInput
          style={[styles.notesInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          value={notes}
          onChangeText={onNotesChange ?? (() => {})}
          placeholder="Observations…"
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={200}
          accessibilityLabel="Notes de séance"
        />
      </View>

      <PressableA11y
        accessibilityLabel="Retour au programme"
        onPress={onClose}
        style={[styles.closeBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.closeBtnText, { color: colors.onPrimary }]}>RETOUR AU PROGRAMME</Text>
      </PressableA11y>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 20 },
  hero: { paddingVertical: 8, gap: 4 },
  heroLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.6 },
  heroDuration: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  statsRow: { flexDirection: 'row', borderWidth: 1, borderRadius: Radius.sm, overflow: 'hidden' },
  statCell: { flex: 1, padding: 16, gap: 4 },
  statCellBorder: { borderLeftWidth: 1 },
  prCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: Radius.sm, padding: 14 },
  prGlyph: { fontSize: 18, lineHeight: 22 },
  prContent: { flex: 1, gap: 2 },
  prTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  prSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  statValue: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  statLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2, textTransform: 'uppercase' },
  progressionSection: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  progressionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  progressionName: { flex: 1, fontSize: 14 },
  progressionValues: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressionOld: { fontSize: 13 },
  progressionNew: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  progressionPending: { fontSize: 12 },
  plateauSection: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 10 },
  plateauRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1 },
  plateauName: { flex: 1, fontSize: 14 },
  plateauWeight: { fontSize: 13 },
  plateauHint: { fontSize: 13, fontStyle: 'italic', marginTop: 2 },
  deloadHintSection: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 8 },
  deloadHintBody: { fontSize: 13, lineHeight: 18 },
  moodSection: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 12 },
  moodRow: { flexDirection: 'row', gap: 8 },
  moodChip: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: Radius.sm, paddingVertical: 12, gap: 4 },
  moodEmoji: { fontSize: 22 },
  moodLabel: { fontSize: 12, fontWeight: '600' },
  tagsSection: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 12 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  tagLabel: { fontSize: 13, fontWeight: '500' },
  notesInput: { borderWidth: 1, borderRadius: Radius.sm, padding: 12, fontSize: 14, minHeight: 72, textAlignVertical: 'top' },
  closeBtn: { paddingVertical: 16, borderRadius: Radius.sm, alignItems: 'center', marginTop: 8 },
  closeBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', letterSpacing: 2, textTransform: 'uppercase' },
  cardioCard: { borderWidth: 1, borderRadius: Radius.sm, padding: 16, gap: 12 },
  cardioRow: { flexDirection: 'row', gap: 8 },
  cardioField: { flex: 1, gap: 4 },
  cardioFieldLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  cardioInput: { borderWidth: 1, borderRadius: Radius.sm, padding: 10, fontSize: 16, textAlign: 'center' },
  cardioRpeRow: { flexDirection: 'row', gap: 8 },
  cardioRpeChip: { flex: 1, borderWidth: 1, borderRadius: Radius.sm, paddingVertical: 10, alignItems: 'center' },
  cardioRpeLabel: { fontSize: 13, fontWeight: '500' },
  cardioBtnRow: { flexDirection: 'row', gap: 8 },
  cardioSaveBtn: { flex: 2, paddingVertical: 14, borderRadius: Radius.sm, alignItems: 'center' },
  cardioSaveBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  cardioIgnoreBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.sm, alignItems: 'center', borderWidth: 1 },
  cardioIgnoreBtnText: { fontSize: 15 },
});
