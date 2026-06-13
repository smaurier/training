import type { ISessionLogRepository } from '../repositories/ISessionLogRepository';
import type { ISetLogRepository } from '../repositories/ISetLogRepository';
import type { IPersonalRecordRepository } from '../repositories/IPersonalRecordRepository';
import type { IExerciseRepository } from '../repositories/IExerciseRepository';
import { computeVolumeByMuscleGroup } from './muscleGroupUtils';
import type { MacroGroupVolume } from './muscleGroupUtils';

export interface DashboardStats {
  sessionCount: number;
  prCount: number;
  exerciseCount: number;
}

export interface WeeklyVolume {
  weekLabel: string;
  volume: number;
  sessionCount: number;
}

export interface RecentPR {
  exerciseId: number;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  achievedAt: string;
}

export interface Exercise1RM {
  exerciseId: number;
  exerciseName: string;
  current1RM: number;
  delta: number | null;
  deltaLabel: string;
}

export interface Session1RM {
  date: string;
  estimated1RM: number;
}

function epley(weight: number, reps: number): number {
  if (reps === 0) return weight;
  return weight * (1 + reps / 30);
}

function getWeekMonday(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function toWeekKey(date: Date): string {
  return getWeekMonday(date).toISOString().slice(0, 10);
}

const WEEK_LABELS = ['S-3', 'S-2', 'S-1', 'Cette sem.'] as const;
// findRecent sorts DESC so this month is always in the top 200; no findFromDate on PersonalRecord
const PR_FETCH_LIMIT = 200;

export class ProgressionService {
  constructor(
    private sessionLogRepo: ISessionLogRepository,
    private setLogRepo: ISetLogRepository,
    private personalRecordRepo: IPersonalRecordRepository,
    private exerciseRepo: IExerciseRepository,
  ) {}

  async getDashboardStats(now: Date = new Date()): Promise<DashboardStats> {
    const monthPrefix = now.toISOString().slice(0, 7);
    const startOfMonth = `${monthPrefix}-01T00:00:00.000Z`;

    const allSessions = await this.sessionLogRepo.findAll();
    const sessionCount = allSessions.filter(s => s.started_at.startsWith(monthPrefix)).length;

    const monthSetLogs = await this.setLogRepo.findFromDate(startOfMonth);
    const exerciseCount = new Set(monthSetLogs.map(l => l.exercise_id)).size;

    const recentPRs = await this.personalRecordRepo.findRecent(PR_FETCH_LIMIT);
    const prCount = recentPRs.filter(pr => pr.achieved_at.startsWith(monthPrefix)).length;

    return { sessionCount, prCount, exerciseCount };
  }

  async getVolumeByWeek(now: Date = new Date()): Promise<WeeklyVolume[]> {
    const thisMonday = getWeekMonday(now);

    const weeks = Array.from({ length: 4 }, (_, i) => {
      const monday = new Date(thisMonday);
      monday.setUTCDate(monday.getUTCDate() - (3 - i) * 7);
      return monday;
    });

    const earliestMonday = new Date(thisMonday);
    earliestMonday.setUTCDate(earliestMonday.getUTCDate() - 21);
    const setLogs = await this.setLogRepo.findFromDate(earliestMonday.toISOString());

    const labels = WEEK_LABELS;

    return weeks.map((monday, i) => {
      const key = toWeekKey(monday);
      const weekLogs = setLogs.filter(log => toWeekKey(new Date(log.completed_at)) === key);
      const volume = weekLogs.reduce((sum, log) => sum + log.reps_done * log.weight_done, 0);
      const sessionCount = new Set(weekLogs.map(log => log.session_log_id)).size;
      return { weekLabel: labels[i], volume, sessionCount };
    });
  }

  async getVolumeByMuscleGroup(now: Date = new Date()): Promise<MacroGroupVolume[]> {
    const thisMonday = getWeekMonday(now);
    const earliestMonday = new Date(thisMonday);
    earliestMonday.setUTCDate(earliestMonday.getUTCDate() - 21);

    const [setLogs, exercises] = await Promise.all([
      this.setLogRepo.findFromDate(earliestMonday.toISOString()),
      this.exerciseRepo.findAll(),
    ]);

    const exerciseMap = new Map(exercises.map(e => [e.id, e]));
    return computeVolumeByMuscleGroup(setLogs, exerciseMap);
  }

  async getRecentPRs(limit: number): Promise<RecentPR[]> {
    const prs = await this.personalRecordRepo.findRecent(limit);
    return Promise.all(prs.map(async pr => {
      const exercise = await this.exerciseRepo.findById(pr.exercise_id);
      return {
        exerciseId: pr.exercise_id,
        exerciseName: exercise?.name ?? 'Exercice inconnu',
        weight: pr.weight,
        reps: pr.reps,
        estimated1RM: pr.estimated_1rm,
        achievedAt: pr.achieved_at,
      };
    }));
  }

  async getExercise1RMList(now: Date = new Date()): Promise<Exercise1RM[]> {
    const exerciseIds = await this.setLogRepo.findDistinctExerciseIds();
    if (exerciseIds.length === 0) return [];

    const cutoffDate = new Date(now);
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 30);
    const cutoff = cutoffDate.toISOString();

    const results = await Promise.all(exerciseIds.map(async exerciseId => {
      const exercise = await this.exerciseRepo.findById(exerciseId);
      const logs = await this.setLogRepo.findByExerciseId(exerciseId);
      if (logs.length === 0) return null;

      const current1RM = Math.round(Math.max(...logs.map(l => epley(l.weight_done, l.reps_done))) * 10) / 10;

      const oldLogs = logs.filter(l => l.completed_at < cutoff);

      let delta: number | null = null;
      let deltaLabel: string;

      if (oldLogs.length === 0) {
        deltaLabel = 'Depuis le début';
      } else {
        const base1RM = Math.max(...oldLogs.map(l => epley(l.weight_done, l.reps_done)));
        delta = Math.round((current1RM - base1RM) * 10) / 10;
        if (delta > 0) deltaLabel = `+${delta} kg vs 30j`;
        else if (delta === 0) deltaLabel = 'stable';
        else deltaLabel = `${delta} kg vs 30j`;
      }

      return {
        exerciseId,
        exerciseName: exercise?.name ?? 'Exercice inconnu',
        current1RM,
        delta,
        deltaLabel,
      };
    }));

    return (results.filter(Boolean) as Exercise1RM[]).sort((a, b) => b.current1RM - a.current1RM);
  }

  async getExercise1RMHistory(exerciseId: number): Promise<Session1RM[]> {
    const logs = await this.setLogRepo.findByExerciseId(exerciseId);

    const byDate = new Map<string, number>();
    for (const log of logs) {
      const dateKey = log.completed_at.slice(0, 10);
      const current = byDate.get(dateKey) ?? 0;
      const rm = epley(log.weight_done, log.reps_done);
      if (rm > current) byDate.set(dateKey, rm);
    }

    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, rm]) => ({
        date: new Date(dateKey + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        estimated1RM: Math.round(rm * 10) / 10,
      }));
  }

  async getMonthlyPresences(now: Date = new Date()): Promise<number> {
    const monthPrefix = now.toISOString().slice(0, 7);
    const allSessions = await this.sessionLogRepo.findAll();
    return allSessions.filter(
      s => s.status === 'completed' && s.started_at.startsWith(monthPrefix),
    ).length;
  }
}
