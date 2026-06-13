import React from "react";
import { Sparkles, Trophy, Lock } from "lucide-react";
import type { Match } from "../utils/poisson";
import type { Team } from "../utils/teams";

interface UpcomingMatchesProps {
  matches: Match[];
  teams: Record<string, Team>;
  activeMatchId: string | null;
  onSelectMatch: (matchId: string) => void;
  onSimulateDay: () => void;
  currentStage: string;
  currentDay: number;
  className?: string;
}

const getMatchDateDisplay = (day: number): string => {
  const dates: Record<number, string> = {
    1: "June 11", 2: "June 12", 3: "June 13", 4: "June 14", 5: "June 15",
    6: "June 16", 7: "June 17", 8: "June 18", 9: "June 19", 10: "June 20",
    11: "June 21", 12: "June 22", 13: "June 23", 14: "June 24", 15: "June 25",
    16: "June 26", 17: "June 27",
    18: "June 28", 19: "June 29", 20: "June 30", 21: "July 1", 22: "July 2", 23: "July 3",
    24: "July 4", 25: "July 5", 26: "July 6", 27: "July 7",
    28: "July 9", 29: "July 10", 30: "July 11",
    31: "July 14", 32: "July 15",
    33: "July 19"
  };
  return dates[day] || `Day ${day}`;
};

const getMatchKickoffTime = (match: Match): string => {
  if (match.status === "COMPLETED") return "FT";
  if (!match.kickoffTime) return "19:00";
  return match.kickoffTime.split("T")[1]?.substring(0, 5) || "19:00";
};


export const UpcomingMatches: React.FC<UpcomingMatchesProps> = ({
  matches,
  teams,
  activeMatchId,
  onSelectMatch,
  onSimulateDay,
  currentStage,
  currentDay,
  className,
}) => {
  const getStageTitle = (stage: string) => {
    switch (stage) {
      case "GROUPS":
        return "Group Stage Fixtures";
      case "R32":
        return "Round of 32 Matches";
      case "R16":
        return "Round of 16 Matches";
      case "QF":
        return "Quarter-Final Matches";
      case "SF":
        return "Semi-Final Matches";
      case "FINAL":
        return "The Grand Final";
      default:
        return "Upcoming Matches";
    }
  };

  // Find matches that are still pending
  const pendingCount = matches.filter((m) => m.status === "PENDING").length;

  return (
    <div className={className}>
      {/* Hero Card Banner */}
      <div className="glass-card hero-card">
        <Trophy className="hero-trophy" color="#fbbf24" />
        <h2 className="hero-title">Predicting the Future of Football</h2>
        <p className="hero-subtitle">AI-POWERED. DATA-DRIVEN. IMMERSIVE.</p>
        
        {pendingCount > 0 ? (
          <button className="btn-gold" onClick={onSimulateDay}>
            <Sparkles size={16} />
            Simulate {getMatchDateDisplay(currentDay)}
          </button>
        ) : (
          <div style={{ fontSize: "0.8rem", color: "var(--color-accent-blue)", fontWeight: 700, textTransform: "uppercase" }}>
            All matches simulated in this stage!
          </div>
        )}
      </div>

      {/* Upcoming Matches Ticker List */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
        <div className="section-title-container">
          <span className="section-title">{getStageTitle(currentStage)}</span>
          <span className="section-link">{pendingCount} Pending</span>
        </div>

        <div className="match-feed scroller" style={{ paddingRight: "0.25rem" }}>
          {matches.map((match) => {
            const home = teams[match.homeTeamId];
            const away = teams[match.awayTeamId];

            if (!home || !away) return null;

            const isSelected = activeMatchId === match.id;
            const showScore = match.status === "COMPLETED" && (match as any).simulatedByUser;
            
            const now = new Date();
            const kickoff = new Date(match.kickoffTime);
            const isLocked = !showScore && match.day > currentDay + 1;
            const isConcluded = !showScore && now.getTime() >= kickoff.getTime() + 2 * 60 * 60 * 1000;
            const isDisabled = isLocked || isConcluded;

            return (
              <div
                key={match.id}
                className={`fixture-card ${isSelected ? "active" : ""}`}
                style={{
                  opacity: isDisabled ? 0.6 : 1,
                  borderColor: isSelected
                    ? "var(--color-accent-blue)"
                    : isDisabled
                    ? "rgba(255, 255, 255, 0.05)"
                    : undefined,
                  background: isSelected
                    ? "rgba(56, 189, 248, 0.05)"
                    : isDisabled
                    ? "rgba(255, 255, 255, 0.01)"
                    : undefined,
                  boxShadow: isSelected ? "0 0 12px rgba(56, 189, 248, 0.15)" : undefined,
                  cursor: "pointer",
                }}
                onClick={() => onSelectMatch(match.id)}
              >
                <div className="fixture-teams">
                  {/* Home Team */}
                  <div className="fixture-team">
                    <span className="fixture-flag">{home.flag}</span>
                    <span className="fixture-team-name">{home.name}</span>
                  </div>

                  <span className="fixture-vs">VS</span>

                  {/* Away Team */}
                  <div className="fixture-team">
                    <span className="fixture-flag">{away.flag}</span>
                    <span className="fixture-team-name">{away.name}</span>
                  </div>
                </div>

                <div className="fixture-info">
                  <span className="fixture-stage">
                    {match.groupName ? `Grp ${match.groupName}` : match.stage}
                  </span>
                  <span className="fixture-time">
                    {getMatchKickoffTime(match)}
                  </span>
                  <span
                    className="fixture-date"
                    style={{
                      color:
                        match.day === currentDay
                          ? "#10b981"
                          : match.day === currentDay + 1
                          ? "#38bdf8"
                          : "var(--color-text-muted)",
                      fontWeight: match.day === currentDay || match.day === currentDay + 1 ? "bold" : "normal",
                    }}
                  >
                    {match.day === currentDay
                      ? "Today"
                      : match.day === currentDay + 1
                      ? "Tomorrow"
                      : getMatchDateDisplay(match.day)}
                  </span>
                </div>

                {/* Score or Predict CTA */}
                {showScore ? (
                  <div className="fixture-completed-score">
                    {match.homeScore} - {match.awayScore}
                    {match.decidedBy === "PENALTIES" && match.penaltyScores && (
                      <span style={{ display: "block", fontSize: "0.6rem", color: "var(--color-text-muted)", marginTop: "2px", fontWeight: "normal" }}>
                        ({match.penaltyScores.home} - {match.penaltyScores.away} Pen)
                      </span>
                    )}
                  </div>
                ) : isLocked ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--color-text-muted)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
                    <Lock size={12} /> Locked
                  </div>
                ) : isConcluded ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--color-text-muted)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
                    Concluded
                  </div>
                ) : (
                  <button className="btn-predict">
                    Predict
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
