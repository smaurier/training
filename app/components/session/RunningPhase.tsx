// Stub — implemented in Task 10
import type { WorkoutExerciseDetail, BlockWithSets } from '@/services/WorkoutExerciseService';
import type { Set as TrainingSet } from '@/db/types';
import type { SetActual } from '@/services/SessionService';
import type { UseTimerResult } from '@/hooks/useTimer';

interface RunningPhaseProps {
  exercise: WorkoutExerciseDetail;
  block: BlockWithSets;
  set: TrainingSet;
  progressLabel: string;
  timer: UseTimerResult;
  onValidate: (actual: SetActual) => Promise<void>;
  onSkip: () => void;
}

export function RunningPhase(_props: RunningPhaseProps) {
  return null;
}
