export type ETAResult =
  | { status: 'achieved' }
  | { status: 'on_track'; etaDate: string; ratePerWeek: number; projectedAtTargetDate?: number }
  | { status: 'stagnant' }
  | { status: 'no_data' };

export function computeETA(
  sessions: { date: string; weight: number }[],
  targetWeight: number,
  targetDate?: string,
  today: Date = new Date(),
): ETAResult {
  const valid = sessions.filter(s => s.weight > 0);
  if (valid.length < 3) return { status: 'no_data' };
  if (valid[valid.length - 1].weight >= targetWeight) return { status: 'achieved' };

  const x0 = Date.parse(valid[0].date);
  const points = valid.map(s => ({
    x: (Date.parse(s.date) - x0) / 86400000,
    y: s.weight,
  }));

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { status: 'stagnant' };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  if (slope <= 0) return { status: 'stagnant' };

  const xToday = (today.getTime() - x0) / 86400000;
  const weightToday = intercept + slope * xToday;
  const daysUntilTarget = Math.max(1, (targetWeight - weightToday) / slope);
  const etaDate = new Date(today.getTime() + daysUntilTarget * 86400000).toISOString().slice(0, 10);
  const ratePerWeek = Math.round(slope * 7 * 10) / 10;

  let projectedAtTargetDate: number | undefined;
  if (targetDate) {
    const xTarget = (Date.parse(targetDate) - x0) / 86400000;
    projectedAtTargetDate = Math.round((intercept + slope * xTarget) * 10) / 10;
  }

  return { status: 'on_track', etaDate, ratePerWeek, projectedAtTargetDate };
}
