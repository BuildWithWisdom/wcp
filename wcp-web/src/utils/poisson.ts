export interface MatchEvent {
  type: "GOAL" | "YELLOW" | "RED" | "INJURY" | "MISS";
  minute: number;
  teamId: string;
  playerName?: string;
  detail?: string;
}
