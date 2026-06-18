# Design Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Trace design system (Tactique/Data, dark-first, lime accent, Inter) to all 8 screens, fixing all `colors.primary` usages broken by the `#FFFFFF → #84CC16` change.

**Architecture:** Screen-by-screen visual pass. No new services, no new routes. One new reusable component (`SeriesProgressBar`). All colours via `Colors.ts` tokens — zero hardcoded hex in new code.

**Tech Stack:** React Native, Expo, `constants/Colors.ts`, `constants/Typography.ts`, `constants/Radius.ts`

**Design refs:**
- Spec: `docs/superpowers/specs/2026-06-17-design-system-directives.md`
- Mocks: `C:/Users/sylva/Downloads/trace-design/`

---

## Key tokens (memorise before touching code)

```ts
colors.primary      // #84CC16 lime — CTA bg, selected chip bg, active indicator
colors.onPrimary    // #0D0D0D black — text ON a lime background (replaces all '#fff' on lime btns)
colors.text         // #FFFFFF dark / #0D0D0D light
colors.textSecondary // #888888 dark / #8A8A8A light
colors.textDisabled  // #444444 dark / #BCBCBC light
colors.surface       // #1A1A1A dark / #FFFFFF light
colors.surfaceElevated // #242424 dark / #EDEDED light
colors.border        // #2A2A2A dark / #E2E2E2 light
```

**Rule of gold: max 1 lime element visible per screen at rest.**

---

## Task 1: Commit Colors.ts (foundation)

**Files:**
- Modify (already done): `app/constants/Colors.ts`

The file already has the correct changes. Just commit.

- [ ] **Step 1: Verify the diff is correct**

```bash
git diff app/constants/Colors.ts
```

Expected: `primary` dark `#FFFFFF` → `#84CC16`, `primary` light `#0D0D0D` → `#84CC16`, `onPrimary: '#0D0D0D'` added to both, `tint` updated to match.

- [ ] **Step 2: Commit**

```bash
git add app/constants/Colors.ts
git commit -m "chore(design): update Colors.ts — lime primary + onPrimary token"
```

---

## Task 2: Home Screen

**Files:**
- Modify: `app/app/(tabs)/index.tsx`

**Changes:**
1. Remove barbell icon + "Prêt à s'entraîner ?" hero → replace with structured header
2. Add CycleDots (inline segmented dots)
3. Add exercise preview list using existing `useWorkoutExercises` hook
4. Fix chip selected text: `colors.onPrimary` (was `#fff`)
5. Fix start button: uppercase, `letterSpacing: 2`, `colors.onPrimary` text, `minHeight: 60`
6. Link text `colors.primary` → keep (lime links = valid action indicator)

- [ ] **Step 1: Add `useWorkoutExercises` import to index.tsx**

Add to existing imports:
```tsx
import { useWorkoutExercises } from '@/hooks/useWorkoutExercises';
```

- [ ] **Step 2: Add hook call inside HomeScreen component**

Add below the `useHomeWorkout()` call:
```tsx
const { exercises: previewExercises } = useWorkoutExercises(selectedWorkout?.id ?? 0);
```

- [ ] **Step 3: Replace the hero View**

Replace:
```tsx
<View style={styles.hero}>
  <Ionicons name="barbell-outline" size={52} color={colors.primary} importantForAccessibility="no" accessibilityElementsHidden={true} />
  <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Prêt à s&apos;entraîner ?</Text>
</View>
```

With nothing — delete it entirely. The card below will now be the primary content.

- [ ] **Step 4: Add CycleDots helper above the return statement**

Add this inline helper inside the component (above `return`):
```tsx
const cycleDoneCount = suggestedWorkout
  ? workouts.findIndex(w => w.id === suggestedWorkout.id)
  : 0;
```

- [ ] **Step 5: Replace the selected workout card content**

Find the `selectedWorkout ?` branch and replace the card body with:
```tsx
<View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
  <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
    {isSuggestion ? 'PROCHAINE SÉANCE' : 'SÉANCE CHOISIE'}
  </Text>
  <Text style={[styles.workoutName, { color: colors.text }]}>{selectedWorkout.name}</Text>

  {/* Cycle dots */}
  {workouts.length > 1 && (
    <View style={styles.cycleDots}>
      {workouts.map((_, i) => (
        <View
          key={i}
          style={[
            styles.cycleDot,
            i < cycleDoneCount
              ? { backgroundColor: colors.primary }
              : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border },
          ]}
        />
      ))}
    </View>
  )}

  <Text style={[styles.lastDate, { color: colors.textSecondary }]}>
    {formatRelativeDate(lastDates.get(selectedWorkout.id))}
  </Text>

  {/* Exercise preview */}
  {previewExercises.length > 0 && (
    <View style={styles.exercisePreview}>
      <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>AU PROGRAMME</Text>
      {previewExercises.slice(0, 5).map((we, i) => {
        const workBlock = we.blocks.find(b => b.is_work_block === 1);
        const setCount = workBlock ? workBlock.sets.length : 0;
        const repsMin = workBlock?.sets[0]?.reps_min ?? 0;
        const setLabel = setCount > 0 && repsMin > 0 ? `${setCount} × ${repsMin}` : `${setCount} séries`;
        return (
          <View key={we.id} style={[styles.exerciseRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Text style={[styles.exerciseRowName, { color: colors.text }]} numberOfLines={1}>
              {we.exercise.name}
            </Text>
            <Text style={[styles.exerciseRowSets, { color: colors.textSecondary }]}>{setLabel}</Text>
          </View>
        );
      })}
    </View>
  )}

  {/* Workout selector chips */}
  <View style={styles.chipsWrapper}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipsScroll}
      contentContainerStyle={styles.chipsRow}
    >
      <View style={styles.chipsInner}>
        {workouts.map((w: Workout) => {
          const isSelected = w.id === selectedWorkout.id;
          const isSug = w.id === suggestedWorkout?.id;
          return (
            <PressableA11y
              key={w.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${w.name}${isSug && !isSelected ? ' — suggéré par le cycle' : ''}`}
              onPress={() => selectWorkout(w)}
              style={[
                styles.chip,
                { borderColor: colors.border },
                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                !isSelected && isSug && { borderColor: colors.primary, opacity: 0.7 },
              ] as StyleProp<ViewStyle>}
            >
              <Text style={[
                styles.chipText,
                { color: colors.textSecondary },
                isSelected && { color: colors.onPrimary, fontWeight: '700' },
              ]}>
                {w.name}
              </Text>
            </PressableA11y>
          );
        })}
      </View>
    </ScrollView>
    <LinearGradient
      colors={[`${colors.surface}00`, colors.surface]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.chipsFade}
      pointerEvents="none"
    />
  </View>

  <PressableA11y
    accessibilityLabel={`Démarrer ${selectedWorkout.name}`}
    onPress={() => router.push({ pathname: '/session/[workoutId]' as any, params: { workoutId: String(selectedWorkout.id) } })}
    style={[styles.startBtn, { backgroundColor: colors.primary }]}
  >
    <Ionicons name="play" size={16} color={colors.onPrimary} importantForAccessibility="no" accessibilityElementsHidden={true} />
    <Text style={[styles.startBtnText, { color: colors.onPrimary }]}>DÉMARRER</Text>
  </PressableA11y>
</View>
```

- [ ] **Step 6: Update styles**

Replace the `styles` object at the bottom with:
```tsx
const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16 },
  card: { borderWidth: 1, borderRadius: Radius.sm, padding: 20, gap: 12 },
  cardLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.6 },
  workoutName: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  lastDate: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  cycleDots: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  cycleDot: { width: 8, height: 8, borderRadius: 999 },
  exercisePreview: { gap: 0, borderWidth: 1, borderRadius: Radius.sm, borderColor: 'transparent', marginTop: 4 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11 },
  exerciseRowName: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  exerciseRowSets: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  chipsWrapper: { position: 'relative' },
  chipsScroll: { marginHorizontal: -4 },
  chipsRow: { paddingHorizontal: 4 },
  chipsInner: { flexDirection: 'row', gap: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  chipsFade: { position: 'absolute', right: -4, top: 0, bottom: 0, width: 48 },
  chip: {
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: Radius.xs,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase' },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, minHeight: 60, borderRadius: Radius.sm,
  },
  startBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', letterSpacing: 2, textTransform: 'uppercase' },
  linkBtn: { paddingVertical: 4 },
  linkText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});
```

- [ ] **Step 7: Add `Typography` import if not present and `Inter_600SemiBold` etc. are available**

Verify `Inter_600SemiBold` etc. are loaded in `_layout.tsx` (they should be — already used in Typography.ts). No change needed there.

- [ ] **Step 8: Typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
git add app/app/(tabs)/index.tsx
git commit -m "feat(design): home screen — structured header, cycle dots, exercise preview"
```

---

## Task 3: SeriesProgressBar component + RunningPhase

**Files:**
- Create: `app/components/ui/SeriesProgressBar.tsx`
- Modify: `app/components/session/RunningPhase.tsx`

### 3a — SeriesProgressBar component

- [ ] **Step 1: Create `app/components/ui/SeriesProgressBar.tsx`**

```tsx
import { View, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface SeriesProgressBarProps {
  done: number;
  total: number;
  height?: number;
}

export function SeriesProgressBar({ done, total, height = 3 }: SeriesProgressBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.row, { gap: 4 }]}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            { height, backgroundColor: i < done ? colors.primary : colors.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', width: '100%' },
  segment: { flex: 1, borderRadius: 1 },
});
```

### 3b — RunningPhase changes

- [ ] **Step 2: Add `SeriesProgressBar` import to RunningPhase.tsx**

```tsx
import { SeriesProgressBar } from '@/components/ui/SeriesProgressBar';
```

- [ ] **Step 3: Replace `seriesDots` GestureDetector block**

Find:
```tsx
<GestureDetector gesture={undoSwipe}>
  <View
    style={styles.seriesDots}
    accessible
    accessibilityLabel={`Série ${currentSetIndex + 1} sur ${block.sets.length}`}
  >
    {block.sets.map((_, i) => (
      <View
        key={i}
        style={[
          styles.dot,
          i < currentSetIndex && { backgroundColor: '#16a34a' },
          i === currentSetIndex && { backgroundColor: colors.primary, width: 10, height: 10, borderRadius: 5 },
          i > currentSetIndex && { borderColor: colors.border, borderWidth: 1.5 },
        ]}
      />
    ))}
  </View>
</GestureDetector>
```

Replace with:
```tsx
<GestureDetector gesture={undoSwipe}>
  <View
    accessible
    accessibilityLabel={`Série ${currentSetIndex + 1} sur ${block.sets.length}`}
  >
    <SeriesProgressBar done={currentSetIndex} total={block.sets.length} />
  </View>
</GestureDetector>
```

- [ ] **Step 4: Fix validate button (normal sets branch)**

Find:
```tsx
<PressableA11y
  accessibilityLabel="Valider la série avec les valeurs saisies"
  onPress={handleValidate}
  style={[styles.validateBtn, { backgroundColor: '#16a34a' }]}
>
  <Ionicons name="checkmark" size={20} color="#fff" />
  <Text style={styles.validateBtnText}>{loading ? 'Validation…' : 'Valider'}</Text>
</PressableA11y>
```

Replace with:
```tsx
<PressableA11y
  accessibilityLabel="Valider la série avec les valeurs saisies"
  onPress={handleValidate}
  style={[styles.validateBtn, { backgroundColor: colors.primary }]}
>
  <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
  <Text style={[styles.validateBtnText, { color: colors.onPrimary }]}>{loading ? 'Validation…' : 'VALIDER'}</Text>
</PressableA11y>
```

- [ ] **Step 5: Fix cardio validate button**

Find:
```tsx
style={[styles.validateBtn, { backgroundColor: '#ea580c' }]}
```
Replace with:
```tsx
style={[styles.validateBtn, { backgroundColor: colors.primary }]}
```
And its icon/text:
```tsx
<Ionicons name="checkmark" size={20} color={colors.onPrimary} />
<Text style={[styles.validateBtnText, { color: colors.onPrimary }]}>{loading ? 'Validation…' : 'Valider le footing'}</Text>
```

- [ ] **Step 6: Fix duration "C'est fait" button**

Find:
```tsx
style={[styles.validateBtn, { backgroundColor: timerDone ? '#16a34a' : colors.primary }]}
```
Replace with:
```tsx
style={[styles.validateBtn, { backgroundColor: colors.primary }]}
```
And fix icon/text color:
```tsx
<Ionicons name="checkmark" size={20} color={colors.onPrimary} />
<Text style={[styles.validateBtnText, { color: colors.onPrimary }]}>{loading ? 'Validation…' : "C'est fait"}</Text>
```

- [ ] **Step 7: Fix adjustWeight confirm button text color**

Find:
```tsx
style={[styles.validateBtn, { backgroundColor: colors.primary, opacity: adjusting ? 0.5 : 1 }]}
```
The button below it has `<Text style={styles.validateBtnText}>Confirmer</Text>`.
Replace:
```tsx
<Text style={[styles.validateBtnText, { color: colors.onPrimary }]}>Confirmer</Text>
```

- [ ] **Step 8: Fix RPE chips selected text color**

Find:
```tsx
<Text style={[styles.rpeChipText, { color: rpe === opt.value ? '#fff' : colors.text }]}>
```
Replace with:
```tsx
<Text style={[styles.rpeChipText, { color: rpe === opt.value ? colors.onPrimary : colors.text }]}>
```

- [ ] **Step 9: Fix blockBadge — remove lime text, use textSecondary**

The `blockBadgeText` currently uses `color: colors.primary` (now lime). Per design, the block name badge is informational context, not a primary action indicator. Change to `colors.textSecondary`:

Find:
```tsx
<Text style={[styles.blockBadgeText, { color: colors.primary }]}>{block.name.toUpperCase()}</Text>
```
Replace with:
```tsx
<Text style={[styles.blockBadgeText, { color: colors.textSecondary }]}>{block.name.toUpperCase()}</Text>
```

- [ ] **Step 10: Update styles — validateBtn and validateBtnText**

In the `StyleSheet.create` block, update:
```tsx
validateBtn: {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  gap: 8, minHeight: 64, borderRadius: Radius.sm,
},
validateBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', letterSpacing: 2, textTransform: 'uppercase' },
```

Remove the hardcoded `color: '#fff'` from `validateBtnText` (color is now passed inline per step 4–7).

Also remove unused dot styles:
```tsx
// Remove these:
seriesDots: { flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 6 },
dot: { width: 8, height: 8, borderRadius: 4 },
```

- [ ] **Step 11: Typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 12: Commit**

```bash
git add app/components/ui/SeriesProgressBar.tsx app/components/session/RunningPhase.tsx
git commit -m "feat(design): RunningPhase — lime CTA, SeriesProgressBar, fix hardcoded colors"
```

---

## Task 4: CircularTimer + RestPhase

**Files:**
- Modify: `app/components/ui/CircularTimer.tsx`
- Modify: `app/components/session/RestPhase.tsx`

### 4a — CircularTimer: lime arc always

- [ ] **Step 1: Replace `arcColor` function**

In `CircularTimer.tsx`, remove:
```tsx
function arcColor(progress: number): string {
  if (progress <= 0) return '#16a34a';
  if (progress > 0.6) return '#16a34a';
  if (progress > 0.3) return '#f59e0b';
  return '#ef4444';
}
```

The arc color will now come from `colors.primary` (lime). Update the component:

Find:
```tsx
const color = arcColor(clamped);
const isDone = clamped <= 0;
```

Replace with:
```tsx
const isDone = clamped <= 0;
```

Find the active arc `<Circle>`:
```tsx
stroke={color}
```
Replace with:
```tsx
stroke={colors.primary}
```

Find time text fill:
```tsx
fill={isDone ? '#16a34a' : colors.text}
```
Replace with:
```tsx
fill={colors.text}
```

Find label text fill:
```tsx
fill={isDone ? '#16a34a' : colors.textSecondary}
```
Replace with:
```tsx
fill={colors.textSecondary}
```

### 4b — RestPhase cleanup

- [ ] **Step 2: Remove standalone `phaseLabel` Text**

Find and delete:
```tsx
<Text
  style={[styles.phaseLabel, { color: isDone ? '#16a34a' : colors.primary }]}
  accessibilityRole="header"
>
  {isDone ? "À toi ·" : 'REPOS'}
</Text>
```

- [ ] **Step 3: Remove green background**

Find:
```tsx
<View style={[styles.container, { backgroundColor: isDone ? '#16a34a15' : colors.background }]}>
```
Replace with:
```tsx
<View style={[styles.container, { backgroundColor: colors.background }]}>
```

- [ ] **Step 4: Increase timer size**

Find:
```tsx
<CircularTimer
  progress={progress}
  remaining={timer.remaining}
  label={isDone ? "À toi" : 'REPOS'}
  size={200}
/>
```
Replace with:
```tsx
<CircularTimer
  progress={progress}
  remaining={timer.remaining}
  label={isDone ? "À toi" : 'REPOS'}
  size={220}
/>
```

- [ ] **Step 5: Always outline button (never lime)**

Find:
```tsx
style={[
  styles.continueBtn,
  isDone
    ? { backgroundColor: colors.primary }
    : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
]}
```
Replace with:
```tsx
style={[
  styles.continueBtn,
  { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
]}
```

Find button text:
```tsx
<Text
  style={[
    styles.continueBtnText,
    { color: isDone ? (colorScheme === 'dark' ? '#000' : '#fff') : colors.textSecondary },
  ]}
>
  {isDone ? "À toi →" : 'Passer →'}
</Text>
```
Replace with:
```tsx
<Text style={[styles.continueBtnText, { color: colors.text }]}>
  {isDone ? "À toi →" : 'Passer →'}
</Text>
```

- [ ] **Step 6: Remove unused `phaseLabel` style**

In `StyleSheet.create`, remove:
```tsx
phaseLabel: {
  fontSize: 32,
  fontWeight: '800',
  letterSpacing: 1,
  textAlign: 'center',
},
```

- [ ] **Step 7: Typecheck + commit**

```bash
npm run typecheck
git add app/components/ui/CircularTimer.tsx app/components/session/RestPhase.tsx
git commit -m "feat(design): CircularTimer lime arc, RestPhase — remove phaseLabel, always outline button"
```

---

## Task 5: SummaryPhase

**Files:**
- Modify: `app/components/session/SummaryPhase.tsx`

**Changes:**
1. Remove 🎉 emoji hero → "SÉANCE TERMINÉE" label + title
2. Stats: 3-column grid (sets + duration + volume) — collapse volumeCard into stats
3. Add PR card (if progressions achieved)
4. Remove "PROGRESSIONS" count stat
5. Mood chips: neutral (no lime selected state)
6. Tags chips: neutral (no lime selected state)
7. CTA: `colors.onPrimary` text
8. Delta color: `colors.text` (not lime for positive delta)

- [ ] **Step 1: Replace hero section**

Find:
```tsx
<View style={styles.hero}>
  <Text style={styles.emoji}>🎉</Text>
  <Text style={[styles.heroTitle, { color: colors.text }]}>Séance terminée !</Text>
  <Text style={[styles.heroDuration, { color: colors.textSecondary }]}>
    {formatDuration(durationSeconds)}{rpeLabel ? ` · Effort : ${rpeLabel}` : ''}
  </Text>
</View>
```

Replace with:
```tsx
<View style={styles.hero}>
  <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>SÉANCE TERMINÉE</Text>
  <Text style={[styles.heroDuration, { color: colors.textSecondary }]}>
    {formatDuration(durationSeconds)}{rpeLabel ? ` · Effort : ${rpeLabel}` : ''}
  </Text>
</View>
```

- [ ] **Step 2: Replace 2-stat row + volumeCard with 3-stat row**

Find:
```tsx
<View style={styles.statsRow}>
  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.statValue, { color: colors.text }]}>{totalSets}</Text>
    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>SÉRIES</Text>
  </View>
  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.statValue, { color: progressionCount > 0 ? '#16a34a' : colors.text }]}>↑ {progressionCount}</Text>
    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>PROGRESSIONS</Text>
  </View>
</View>

{totalVolumeKg != null && totalVolumeKg > 0 && (
  <View style={[styles.volumeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>VOLUME TOTAL</Text>
    <Text style={[styles.volumeValue, { color: colors.text }]}>
      {Math.round(parseFloat(convert(totalVolumeKg))).toLocaleString()} {unitLabel}
    </Text>
    {showDelta && (
      <Text style={[styles.volumeDelta, { color: deltaVolume! >= 0 ? colors.primary : colors.textSecondary }]}>
        {deltaVolume! >= 0 ? '+' : ''}{Math.round(parseFloat(convert(deltaVolume!))).toLocaleString()} {unitLabel}
        {' · '}
        {deltaSets! >= 0 ? '+' : ''}{deltaSets} série{Math.abs(deltaSets!) > 1 ? 's' : ''} vs séance préc.
      </Text>
    )}
  </View>
)}
```

Replace with:
```tsx
<View style={styles.statsRow}>
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
```

- [ ] **Step 3: Add PR card after stats row**

After the stats row, add:
```tsx
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
```

- [ ] **Step 4: Fix mood chips — neutral selected state**

Find all three occurrences of:
```tsx
selectedMood === mood
  ? { backgroundColor: colors.primary }
  : { backgroundColor: colors.surface },
```
Replace with:
```tsx
selectedMood === mood
  ? { backgroundColor: colors.surfaceElevated }
  : { backgroundColor: colors.surface },
```

Find:
```tsx
{ color: selectedMood === mood ? '#fff' : colors.text }
```
Replace with:
```tsx
{ color: colors.text }
```

- [ ] **Step 5: Fix tags chips — neutral selected state**

Find:
```tsx
selectedTags.includes(tag.slug)
  ? { backgroundColor: colors.primary }
  : { backgroundColor: colors.surface },
```
Replace with:
```tsx
selectedTags.includes(tag.slug)
  ? { backgroundColor: colors.surfaceElevated }
  : { backgroundColor: colors.surface },
```

Find:
```tsx
{ color: selectedTags.includes(tag.slug) ? '#fff' : colors.text },
```
Replace with:
```tsx
{ color: colors.text },
```

- [ ] **Step 6: Fix cardio RPE chips — neutral selected state**

Find:
```tsx
cardioRpe === rpe ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface },
```
Replace with:
```tsx
cardioRpe === rpe ? { backgroundColor: colors.surfaceElevated } : { backgroundColor: colors.surface },
```

Find:
```tsx
{ color: cardioRpe === rpe ? '#fff' : colors.text }
```
Replace with:
```tsx
{ color: colors.text }
```

- [ ] **Step 7: Fix CTA text color**

Find:
```tsx
<Text style={styles.closeBtnText}>Retour au programme</Text>
```
And in styles: `closeBtnText: { color: '#fff', ... }`.
Replace style with:
```tsx
closeBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', letterSpacing: 2, textTransform: 'uppercase' },
```
And inline:
```tsx
<Text style={[styles.closeBtnText, { color: colors.onPrimary }]}>RETOUR AU PROGRAMME</Text>
```

Same for cardioSaveBtnText:
```tsx
cardioSaveBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
```
And inline:
```tsx
<Text style={[styles.cardioSaveBtnText, { color: colors.onPrimary }]}>Enregistrer</Text>
```

- [ ] **Step 8: Update styles**

In `StyleSheet.create`, replace/add:
```tsx
hero: { paddingVertical: 8, gap: 4 },
heroLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.6 },
heroDuration: { fontSize: 13, fontFamily: 'Inter_400Regular' },
statsRow: { flexDirection: 'row', borderWidth: 1, borderRadius: Radius.sm, overflow: 'hidden', borderColor: 'transparent' },
statCell: { flex: 1, padding: 16, gap: 4, alignItems: 'flex-start' },
statCellBorder: { borderLeftWidth: 1 },
statValue: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
statLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 1.2, textTransform: 'uppercase' },
prCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderRadius: Radius.sm, padding: 14 },
prGlyph: { fontSize: 18, lineHeight: 22 },
prContent: { flex: 1, gap: 2 },
prTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
prSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
```

Remove unused styles: `emoji`, `heroTitle`, `volumeCard`, `volumeValue`, `volumeDelta`.

- [ ] **Step 9: Typecheck + commit**

```bash
npm run typecheck
git add app/components/session/SummaryPhase.tsx
git commit -m "feat(design): SummaryPhase — 3-stat grid, PR card, neutral chips, lime CTA"
```

---

## Task 6: ProgramCard — active left border

**Files:**
- Modify: `app/components/programmes/ProgramCard.tsx`

- [ ] **Step 1: Remove activeBadge, add left border**

Replace the card `PressableA11y` style:
```tsx
<PressableA11y
  style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
```
With:
```tsx
<PressableA11y
  style={[
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.border },
    program.is_active === 1 && { borderLeftWidth: 3, borderLeftColor: colors.primary },
  ]}
```

- [ ] **Step 2: Remove activeBadge JSX**

Find and delete:
```tsx
{program.is_active === 1 && (
  <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}
    accessibilityLabel="Programme actif"
    accessibilityRole="text"
  >
    <Text style={styles.activeBadgeText}>actif</Text>
  </View>
)}
```

- [ ] **Step 3: Remove unused styles and constant**

Remove:
```tsx
const ACTIVE_BADGE_TEXT_COLOR = '#fff' as const;
```
Remove styles:
```tsx
activeBadge: { ... },
activeBadgeText: { ... },
```

- [ ] **Step 4: Typecheck + commit**

```bash
npm run typecheck
git add app/components/programmes/ProgramCard.tsx
git commit -m "feat(design): ProgramCard — active state via left lime border, remove badge"
```

---

## Task 7: Progression — segment + VolumeBarChart

**Files:**
- Modify: `app/app/(tabs)/progression.tsx`
- Modify: `app/components/progression/VolumeBarChart.tsx`

### 7a — Segment control text color

- [ ] **Step 1: Fix selected segment text**

In `progression.tsx`, find:
```tsx
<Text style={[styles.segmentText, { color: activeSegment === seg ? '#fff' : colors.textSecondary }]}>
```
Replace with:
```tsx
<Text style={[styles.segmentText, { color: activeSegment === seg ? colors.onPrimary : colors.textSecondary }]}>
```

### 7b — VolumeBarChart past bar color

- [ ] **Step 2: Fix past bar color**

In `VolumeBarChart.tsx`, find:
```tsx
frontColor: i === data.length - 1 ? colors.primary : (colorScheme === 'dark' ? '#1E40AF' : '#BFDBFE'),
```
Replace with:
```tsx
frontColor: i === data.length - 1 ? colors.primary : colors.textDisabled,
```

Find (label color for past bars):
```tsx
color: i === data.length - 1 ? colors.primary : colors.textSecondary,
```
Keep as-is (textSecondary for labels is correct).

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add app/app/(tabs)/progression.tsx app/components/progression/VolumeBarChart.tsx
git commit -m "feat(design): Progression — onPrimary segment text, textDisabled past bars"
```

---

## Task 8: Réglages — full B&W (zero lime)

**Files:**
- Modify: `app/app/(tabs)/reglages.tsx`

Per directive: "Réglages — full B&W, zéro lime." Every `colors.primary` usage becomes neutral.

- [ ] **Step 1: Fix SegmentedControl selected state**

In the `SegmentedControl` component (inside reglages.tsx), find:
```tsx
selected === opt.value && { backgroundColor: colors.primary },
```
Replace with:
```tsx
selected === opt.value && { backgroundColor: colors.surfaceElevated },
```

Find:
```tsx
{ color: selected === opt.value ? (isDark ? '#000' : '#fff') : colors.text },
```
Replace with:
```tsx
{ color: colors.text },
```

- [ ] **Step 2: Fix export arrow and ActivityIndicator**

Find:
```tsx
<ActivityIndicator size="small" color={colors.primary} />
```
Replace with:
```tsx
<ActivityIndicator size="small" color={colors.textSecondary} />
```

Find:
```tsx
<Text style={[styles.exportArrow, { color: colors.primary }]}>→</Text>
```
Replace with:
```tsx
<Text style={[styles.exportArrow, { color: colors.textSecondary }]}>→</Text>
```

- [ ] **Step 3: Fix notification day chips**

Find the day chips selection:
```tsx
{ borderColor: selected ? colors.primary : colors.border },
selected && { backgroundColor: colors.primary },
```
Replace with:
```tsx
{ borderColor: selected ? colors.border : colors.border },
selected && { backgroundColor: colors.surfaceElevated },
```

Find text color on selected day chip:
```tsx
style={[styles.chipText, { color: selected ? (isDark ? '#000' : '#fff') : colors.text }]}
```
Replace with:
```tsx
style={[styles.chipText, { color: colors.text }]}
```

- [ ] **Step 4: Fix any remaining `colors.primary` in reglages.tsx**

Run:
```bash
grep -n "colors\.primary" app/app/(tabs)/reglages.tsx
```

For each remaining occurrence, change to `colors.surfaceElevated` (backgrounds) or `colors.textSecondary` (text/arrows).

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add app/app/(tabs)/reglages.tsx
git commit -m "feat(design): Réglages — full B&W, remove all lime (zéro primary)"
```

---

## Task 9: Global audit — remaining files

**Files:** remaining files using `colors.primary`

- [ ] **Step 1: Audit list**

```bash
grep -rn "colors\.primary" app/ --include="*.tsx" --include="*.ts" | grep -v "test\|spec\|mock\|Colors\.ts" | grep -v "index\.tsx\|RunningPhase\|RestPhase\|SummaryPhase\|CircularTimer\|ProgramCard\|progression\|reglages\|SeriesProgressBar"
```

- [ ] **Step 2: Fix `#fff` text on lime buttons**

For each file that has a `Text` or `Ionicons` with hardcoded `'#fff'` color inside a `colors.primary` background container, change to `colors.onPrimary`.

Key files to check:
- `app/add-exercise.tsx` — submit button
- `app/add-programme.tsx` — submit button  
- `app/add-workout.tsx` — submit button
- `app/import-gpx.tsx` — import button, RPE chips
- `app/import-template.tsx` — import button
- `app/onboarding.tsx` — dots indicator
- `app/programme/[id].tsx` — edit icon
- `app/app/+not-found.tsx` — link text

Pattern to fix in each:
```tsx
// Before
<Text style={{ color: '#fff' }}>Label</Text>  // inside colors.primary bg
// After  
<Text style={{ color: colors.onPrimary }}>Label</Text>
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Run tests**

```bash
npm test -- --passWithNoTests
```

Expected: all green (visual-only changes, no logic touched in service/hook tests).

- [ ] **Step 5: Final commit**

```bash
git add -p  # stage only changed UI files
git commit -m "feat(design): global audit — colors.onPrimary on all lime button text"
```

---

## Self-review

**Spec coverage:**
- ✅ Colors.ts foundation (T1)
- ✅ Home: CycleDots, exercise list, lime CTA (T2)
- ✅ Running: SeriesProgressBar, lime VALIDER, neutral badges (T3)
- ✅ Rest: lime arc, no traffic lights, always outline button (T4)
- ✅ Summary: 3-stat grid, PR card, neutral mood/tag chips (T5)
- ✅ Programmes: left lime border for active (T6)
- ✅ Progression: segment text, past bar color (T7)
- ✅ Réglages: full B&W (T8)
- ✅ Global: onPrimary text on lime buttons (T9)

**Rule "1 lime element per screen":**
- Home: CTA lime OR chip selected lime (chips not visible when CTA visible — ✅)
- Running: VALIDER button lime ✅ (progress bar lime = ok, functional not decorative)
- Rest: arc lime only ✅
- Summary: PR card text lime (only if PR achieved) ✅
- Programmes: left border lime (active program only) ✅
- Exercices: chip selected lime (replaces CTA) ✅
- Progression: current-period bar lime ✅
- Réglages: zero lime ✅
