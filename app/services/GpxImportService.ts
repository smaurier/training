import { XMLParser } from 'fast-xml-parser';

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

export function parseGpxFile(xmlContent: string): GpxData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    isArray: (name) => name === 'trkpt' || name === 'trkseg',
  });
  const result = parser.parse(xmlContent);
  const trksegs: unknown[] = result?.gpx?.trk?.trkseg ?? [];
  const rawPoints: { lat: number; lon: number; time: string }[] = (trksegs as { trkpt?: unknown[] }[])
    .flatMap(seg => (seg.trkpt ?? []) as { lat: number; lon: number; time: string }[]);

  if (rawPoints.length === 0) throw new Error('Aucun trackpoint trouvé dans le fichier GPX');

  rawPoints.sort((a, b) => a.time.localeCompare(b.time));

  const first = rawPoints[0];
  const last = rawPoints[rawPoints.length - 1];
  const durationSeconds = rawPoints.length > 1
    ? Math.round((Date.parse(last.time) - Date.parse(first.time)) / 1000)
    : 0;
  const points: [number, number][] = rawPoints.map(p => [Number(p.lat), Number(p.lon)]);
  const distanceMeters = haversine(points);

  return { startedAt: first.time, durationSeconds, distanceMeters, points };
}
