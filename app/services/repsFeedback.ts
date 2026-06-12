export function computeRepsFeedback(
  repsStr: string,
  repsMin: number,
  isBodyweight: boolean,
): string | null {
  if (isBodyweight) return null;
  const parsed = parseInt(repsStr, 10);
  if (isNaN(parsed)) return null;
  if (parsed > repsMin * 1.25) return "Tu dépasses la cible — envisage d'augmenter le poids.";
  if (parsed < repsMin * 0.75) return "Tu es en dessous de la cible — le poids est peut-être trop lourd.";
  return null;
}
