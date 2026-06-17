// app/app/onboarding.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { usePrograms } from '@/hooks/usePrograms';
import { shouldSkip } from '@/services/onboardingUtils';
import type { OnboardingScreenId } from '@/services/onboardingUtils';
import { getDb } from '@/db';
import { SQLiteSettingsRepository } from '@/repositories/SQLiteSettingsRepository';

import { PhilosophyScreen } from '@/components/onboarding/PhilosophyScreen';
import { ObjectiveScreen } from '@/components/onboarding/ObjectiveScreen';
import { ProgramScreen } from '@/components/onboarding/ProgramScreen';
import { SessionDemoScreen } from '@/components/onboarding/SessionDemoScreen';
import { SettingsIntroScreen } from '@/components/onboarding/SettingsIntroScreen';
import { ProgressionScreen } from '@/components/onboarding/ProgressionScreen';
import { ReadyScreen } from '@/components/onboarding/ReadyScreen';

export type Objective = 'force' | 'hypertrophie' | 'maintien' | 'cardio' | null;

export type WizardState = {
  objective: Objective;
  selectedProgramId: number | null;
};

export type ScreenProps = {
  wizardState: WizardState;
  setWizardState: (patch: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
  isReview: boolean;
  isFirst: boolean;
  isLast: boolean;
};

const ALL_SCREENS: { id: OnboardingScreenId; component: React.ComponentType<ScreenProps> }[] = [
  { id: 'philosophy',    component: PhilosophyScreen },
  { id: 'objective',     component: ObjectiveScreen },
  { id: 'program',       component: ProgramScreen },
  { id: 'session-demo',  component: SessionDemoScreen },
  { id: 'settings-intro',component: SettingsIntroScreen },
  { id: 'progression',   component: ProgressionScreen },
  { id: 'ready',         component: ReadyScreen },
];

export default function OnboardingScreen() {
  const { review } = useLocalSearchParams<{ review?: string }>();
  const isReview = review === 'true';
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { programs } = usePrograms();

  const [step, setStep] = useState(0);
  const [wizardStateRaw, setWizardStateRaw] = useState<WizardState>({
    objective: null,
    selectedProgramId: null,
  });

  const setWizardState = (patch: Partial<WizardState>) =>
    setWizardStateRaw(prev => ({ ...prev, ...patch }));

  const activeScreens = useMemo(
    () => ALL_SCREENS.filter(s => !shouldSkip(s.id, programs, isReview)),
    [programs, isReview],
  );

  useEffect(() => {
    if (step >= activeScreens.length) {
      setStep(Math.max(0, activeScreens.length - 1));
    }
  }, [activeScreens.length, step]);

  const handleNext = async () => {
    if (step < activeScreens.length - 1) {
      setStep(s => s + 1);
      return;
    }
    // Dernier écran — terminer
    if (!isReview) {
      const repo = new SQLiteSettingsRepository(getDb());
      await repo.set('onboarding_done', 'true');
      router.replace('/(tabs)');
    } else {
      router.back();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const current = activeScreens[step];
  const Component = current.component;
  const showDots = step > 0 || current.id !== 'philosophy';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {showDots && (
        <View style={styles.dotsRow}>
          {activeScreens.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === step ? colors.primary : colors.border },
              ]}
            />
          ))}
        </View>
      )}
      <Component
        wizardState={wizardStateRaw}
        setWizardState={setWizardState}
        onNext={handleNext}
        onBack={handleBack}
        isReview={isReview}
        isFirst={step === 0}
        isLast={step === activeScreens.length - 1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 56,
    paddingBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
