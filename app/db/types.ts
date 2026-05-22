export type ExerciseType = 'musculation' | 'etirement' | 'cardio';
export type WeightType = 'fixed' | 'bodyweight' | 'bar';

export interface Exercise {
  id: number;
  name: string;
  type: ExerciseType;
  muscle_groups: string; // JSON array
  technical_notes: string | null;
  is_custom: 0 | 1;
  progression_step: number;
  progression_threshold: number;
  created_at: string;
}

export interface Program {
  id: number;
  name: string;
  description: string | null;
  is_active: 0 | 1;
  created_at: string;
}

export interface Workout {
  id: number;
  program_id: number;
  name: string;
  order_index: number;
}

export interface WorkoutExercise {
  id: number;
  workout_id: number;
  exercise_id: number;
  order_index: number;
}

export interface Block {
  id: number;
  workout_exercise_id: number;
  name: string;
  order_index: number;
  is_work_block: 0 | 1;
}

export interface Set {
  id: number;
  block_id: number;
  reps_min: number;
  reps_max: number;
  weight: number | null;
  weight_type: WeightType;
  rest_duration: number;
  order_index: number;
}

export interface SessionLog {
  id: number;
  workout_id: number;
  started_at: string;
  ended_at: string | null;
  checkin_energy: 1 | 2 | 3 | null;
  checkin_fatigue: 1 | 2 | 3 | null;
  checkin_sleep: 1 | 2 | 3 | null;
  notes: string | null;
}

export interface SetLog {
  id: number;
  session_log_id: number;
  set_id: number;
  exercise_id: number;
  reps_done: number;
  weight_done: number;
  rpe: number | null;
  completed_at: string;
}

export interface PersonalRecord {
  id: number;
  exercise_id: number;
  weight: number;
  reps: number;
  estimated_1rm: number;
  achieved_at: string;
  session_log_id: number | null;
}
