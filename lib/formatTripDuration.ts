export function formatTripDuration(durationMs: number): string {
  const totalMin = Math.max(0, Math.round(durationMs / 60_000));
  if (totalMin < 60) {
    return `${totalMin} min`;
  }
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
