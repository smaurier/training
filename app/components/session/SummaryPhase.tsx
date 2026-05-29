// Stub — implemented in Task 11
import type { ProgressionResult } from '@/services/SessionService';

interface SummaryPhaseProps {
  progressions: ProgressionResult[];
  totalSets: number;
  durationSeconds: number;
  onClose: () => void;
}

export function SummaryPhase(_props: SummaryPhaseProps) {
  return null;
}
