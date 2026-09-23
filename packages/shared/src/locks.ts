/**
 * A prediction is open strictly before kickoff.
 */
export function isPredictionOpen(kickoffAt: string | Date, now: Date = new Date()): boolean {
  const kickoff = typeof kickoffAt === "string" ? new Date(kickoffAt) : kickoffAt;
  if (Number.isNaN(kickoff.getTime())) {
    throw new Error(`Invalid kickoff time: ${String(kickoffAt)}`);
  }
  return now.getTime() < kickoff.getTime();
}
