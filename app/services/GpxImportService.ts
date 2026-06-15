export interface GpxData {
  startedAt: string;
  durationSeconds: number;
  distanceMeters: number;
  points: [number, number][];
}

export function haversine(points: [number, number][]): number {
  const R = 6371000;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const lat1 = (points[i - 1][0] * Math.PI) / 180;
    const lat2 = (points[i][0] * Math.PI) / 180;
    const lon1 = (points[i - 1][1] * Math.PI) / 180;
    const lon2 = (points[i][1] * Math.PI) / 180;
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return Math.round(total);
}
