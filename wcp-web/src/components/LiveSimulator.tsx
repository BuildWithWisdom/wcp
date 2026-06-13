import React, { useState, useEffect, useRef } from "react";
import { Play, Share2, ArrowLeft, Lock } from "lucide-react";
import type { Match, MatchEvent } from "../utils/poisson";
import { getTeamRatings } from "../utils/poisson";
import type { Team } from "../utils/teams";
import type { TournamentState } from "../utils/state";
import { api } from "../utils/api";
import { PitchCanvas } from "./PitchCanvas";

interface LiveSimulatorProps {
  match: Match | null;
  teams: Record<string, Team>;
  onSimulateSingleMatch: (
    matchId: string,
    simulatedMatch: Match,
    updatedState: TournamentState
  ) => void;
  geminiKey: string;
  currentDay: number;
  onBack?: () => void;
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

const playGoalSound = () => {
  try {
    const audio = new Audio("/sounds/goal.mp3");
    audio.volume = 0.45;
    audio.play().catch((err) => {
      console.warn("Audio play blocked by browser auto-play policy:", err);
    });
  } catch (err) {
    console.error("Audio playback error:", err);
  }
};

export const LiveSimulator: React.FC<LiveSimulatorProps> = ({
  match,
  teams,
  onSimulateSingleMatch,
  geminiKey: _geminiKey,
  currentDay,
  onBack,
  className,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [tickMin, setTickMin] = useState(0);
  const [simulatedEvents, setSimulatedEvents] = useState<MatchEvent[]>([]);
  const [liveHomeScore, setLiveHomeScore] = useState(0);
  const [liveAwayScore, setLiveAwayScore] = useState(0);
  const [copied, setCopied] = useState(false);
  
  // Goal Flash Pop-up
  const [showGoalFlash, setShowGoalFlash] = useState(false);
  const [flashText, setFlashText] = useState("GOAL!");
  const [flashTeamName, setFlashTeamName] = useState("");

  const timerRef = useRef<any | null>(null);
  const prevGoalsCountRef = useRef(0);

  const handleShare = async () => {
    if (!match) return;
    const home = teams[match.homeTeamId];
    const away = teams[match.awayTeamId];
    if (!home || !away) return;

    let text = "";
    if (match.status === "COMPLETED") {
      text = `🏆 World Cup Oracle Prediction: ${home.flag} ${home.name} ${liveHomeScore} - ${liveAwayScore} ${away.name} ${away.flag}! Can you beat the Oracle?`;
    } else {
      text = `🔮 World Cup Oracle: Who wins between ${home.flag} ${home.name} and ${away.name} ${away.flag}? Predict now on the World Cup Oracle!`;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error: unknown) {
      console.error("Failed to copy prediction:", error);
    }
  };

  // Clean up timer on unmount/match change
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Reset local state when selected match changes
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(false);
    
    if (match) {
      if (match.status === "COMPLETED" && (match as any).simulatedByUser) {
        setTickMin(match.decidedBy === "PENALTIES" ? 125 : match.decidedBy === "EXTRA_TIME" ? 120 : 90);
        setLiveHomeScore(match.homeScore ?? 0);
        setLiveAwayScore(match.awayScore ?? 0);
        setSimulatedEvents(match.timeline);
      } else {
        setTickMin(0);
        setLiveHomeScore(0);
        setLiveAwayScore(0);
        setSimulatedEvents([]);
      }
      prevGoalsCountRef.current = 0;
    }
  }, [match]);

  if (!match) {
    return (
      <div className={`${className || ""} glass-card`} style={{ justifyContent: "center", alignItems: "center", minHeight: "350px", color: "var(--color-text-muted)" }}>
        <Play size={48} style={{ opacity: 0.15, marginBottom: "1rem" }} />
        <p style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>Select a match to Predict</p>
        <p style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>Watch the live visual clock simulation unfold in real-time.</p>
      </div>
    );
  }

  const home = teams[match.homeTeamId];
  const away = teams[match.awayTeamId];

  if (!home || !away) return null;

  // Expected stats for preview
  const homeRatings = getTeamRatings(home);
  const awayRatings = getTeamRatings(away);
  const totalQuality = Math.exp(homeRatings.quality * 2) + Math.exp(awayRatings.quality * 2);
  const homeChance = totalQuality > 0 ? Math.round((Math.exp(homeRatings.quality * 2) / totalQuality) * 75) : 33;
  const awayChance = totalQuality > 0 ? Math.round((Math.exp(awayRatings.quality * 2) / totalQuality) * 75) : 33;
  const drawChance = 100 - homeChance - awayChance;

  const handleStartSimulation = async () => {
    if (isPlaying || isCalculating) return;
    setIsCalculating(true);

    try {
      const data = await api.simulateMatch(match.id);
      const { match: simulatedMatch, state: updatedState } = data;

      setIsCalculating(false);
      setIsPlaying(true);
      setTickMin(0);
      setLiveHomeScore(0);
      setLiveAwayScore(0);
      setSimulatedEvents([]);
      prevGoalsCountRef.current = 0;

      const maxMinute = simulatedMatch.decidedBy === "PENALTIES" ? 125 : simulatedMatch.decidedBy === "EXTRA_TIME" ? 120 : 90;
      const tickDuration = 15000;
      const intervalMs = 60;
      const numTicks = tickDuration / intervalMs;
      const minPerTick = maxMinute / numTicks;

      let currentTick = 0;
      let isPausedForEvent = false;
      let lastProcessedEventMin = -1;

      timerRef.current = setInterval(() => {
        if (isPausedForEvent) return;

        currentTick++;
        const currentMin = Math.min(maxMinute, Math.floor(currentTick * minPerTick));
        setTickMin(currentMin);

        const currentEvents = simulatedMatch.timeline.filter((e) => e.minute <= currentMin);
        setSimulatedEvents(currentEvents);

        const newEventsInTick = simulatedMatch.timeline.filter((e) => e.minute === currentMin);
        const matchEvent = newEventsInTick.find(
          (e) => (e.type === "GOAL" || e.type === "MISS") && e.minute !== lastProcessedEventMin
        );

        if (matchEvent) {
          lastProcessedEventMin = matchEvent.minute;
          isPausedForEvent = true;

          if (matchEvent.type === "GOAL") {
            setTimeout(() => {
              isPausedForEvent = false;
            }, 3200);

            setTimeout(() => {
              const goalsHome = simulatedMatch.timeline.filter((e) => e.minute <= currentMin && e.type === "GOAL" && e.teamId === home.id).length;
              const goalsAway = simulatedMatch.timeline.filter((e) => e.minute <= currentMin && e.type === "GOAL" && e.teamId === away.id).length;
              setLiveHomeScore(goalsHome);
              setLiveAwayScore(goalsAway);

              const scoringTeam = matchEvent.teamId === home.id ? home : away;
              setFlashTeamName(scoringTeam.name.toUpperCase());
              setFlashText(Math.random() < 0.25 ? "GOLAZO!" : "GOAL!");
              setShowGoalFlash(true);
              
              // Play stadium crowd cheer sound effect
              playGoalSound();

              setTimeout(() => setShowGoalFlash(false), 1200);
            }, 850);
          } else {
            setTimeout(() => {
              isPausedForEvent = false;
            }, 1800);
          }
        }

        if (currentMin >= maxMinute && !isPausedForEvent) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsPlaying(false);

          onSimulateSingleMatch(match.id, simulatedMatch, updatedState);
        }
      }, intervalMs);
    } catch (error: unknown) {
      setIsCalculating(false);
      setIsPlaying(false);
      const errorMessage = error instanceof Error ? error.message : "Failed to simulate match on the server.";
      console.error("Simulation error:", error);
      alert(errorMessage);
    }
  };

  const getPlayerInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className={className}>
      {/* Simulation Header */}
      <div className="simulator-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ArrowLeft
            size={16}
            className="mobile-only-back"
            style={{ color: "var(--color-text-muted)", cursor: "pointer" }}
            onClick={onBack}
          />
          <span className="simulator-header-title">
            {match.groupName ? `Group ${match.groupName} Match` : match.stage}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {copied && (
            <span style={{ fontSize: "0.75rem", color: "var(--color-accent-blue)", fontWeight: 600 }}>
              Copied!
            </span>
          )}
          <Share2
            size={16}
            style={{ color: "var(--color-text-muted)", cursor: "pointer" }}
            onClick={handleShare}
          />
        </div>
      </div>

      {/* Scoreboard Widget */}
      {!isPlaying && !isCalculating && (
        <div className="scoreboard-card">
          {showGoalFlash && (
            <div className="goal-flash-overlay">
              <div className="goal-flash-text">{flashText}<br/><span style={{ fontSize: "1.2rem", fontWeight: "normal", letterSpacing: "1px" }}>{flashTeamName}</span></div>
            </div>
          )}

          {/* Home */}
          <div className="scoreboard-team">
            <span className="scoreboard-flag">{home.flag}</span>
            <span className="scoreboard-name">{home.name}</span>
          </div>

          {/* Live Score */}
          <div className="scoreboard-score">
            <span>{liveHomeScore}</span>
            <span style={{ fontSize: "1.25rem", color: "var(--color-text-muted)" }}>-</span>
            <span>{liveAwayScore}</span>
          </div>

          {/* Away */}
          <div className="scoreboard-team">
            <span className="scoreboard-flag">{away.flag}</span>
            <span className="scoreboard-name">{away.name}</span>
          </div>

          {/* Simulation Badge */}
          {match.status === "COMPLETED" && (match as any).simulatedByUser ? (
            <span className="scoreboard-sim-badge completed">Prediction Logged</span>
          ) : (
            <span className="scoreboard-sim-badge" style={{ background: "none", borderStyle: "dashed" }}>Oracle Idle</span>
          )}
        </div>
      )}

      {(isPlaying || isCalculating) && (
        <div style={{ marginBottom: "1.25rem", width: "100%", position: "relative" }}>
          {showGoalFlash && (
            <div className="goal-flash-overlay">
              <div className="goal-flash-text">{flashText}<br/><span style={{ fontSize: "1.2rem", fontWeight: "normal", letterSpacing: "1px" }}>{flashTeamName}</span></div>
            </div>
          )}
          <PitchCanvas
            homeTeam={home}
            awayTeam={away}
            isPlaying={isPlaying}
            currentMinute={tickMin}
            events={simulatedEvents}
            liveHomeScore={liveHomeScore}
            liveAwayScore={liveAwayScore}
          />
          {isCalculating && (
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(10, 17, 30, 0.65)",
              backdropFilter: "blur(5px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "12px",
              color: "#fbbf24",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              gap: "0.5rem",
              zIndex: 10
            }}>
              <span style={{ animation: "pulse 1.5s infinite", fontSize: "1.1rem" }}>🔮 Consulting the oracle...</span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Analyzing team tactics & Poisson distribution multipliers</span>
            </div>
          )}
        </div>
      )}

      {/* Time and Probability Tracker */}
      <div className="timeline-slider-container">
        <div className="timeline-progress-track">
          <div
            className="timeline-progress-fill"
            style={{ width: `${(tickMin / (match.decidedBy === "PENALTIES" ? 125 : match.decidedBy === "EXTRA_TIME" ? 120 : 90)) * 100}%` }}
          >
            <div className="timeline-progress-node">
              {tickMin > 90 && tickMin <= 120 ? `ET` : tickMin > 120 ? `Pen` : `${tickMin}'`}
            </div>
          </div>
        </div>

        {/* Probabilities preview before click / active status */}
        <div className="win-probability-bar">
          <div className="prob-home" style={{ width: `${homeChance}%` }}></div>
          <div className="prob-draw" style={{ width: `${drawChance}%` }}></div>
          <div className="prob-away" style={{ width: `${awayChance}%` }}></div>
        </div>
        <div className="win-probability-labels">
          <span>{home.name} <span className="prob-label-value">{homeChance}%</span></span>
          <span>Draw <span className="prob-label-value">{drawChance}%</span></span>
          <span>{away.name} <span className="prob-label-value">{awayChance}%</span></span>
        </div>
      </div>

      {/* Action CTA: Play or Loading */}
      {(!match.simulatedByUser || match.status === "PENDING") && !isPlaying && (() => {
        const now = new Date();
        const kickoff = new Date(match.kickoffTime);
        const isPast = now.getTime() >= kickoff.getTime() + 2 * 60 * 60 * 1000;

        if (isCalculating) {
          return (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem", width: "100%" }}>
              <button className="btn-gold" disabled style={{ width: "100%", justifyContent: "center", cursor: "wait", opacity: 0.85 }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", animation: "pulse 1.5s infinite" }}>
                  🔮 Consulting the oracle...
                </span>
              </button>
            </div>
          );
        }

        if (isPast) {
          return (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem", width: "100%" }}>
              <button className="btn-gold" disabled style={{ width: "100%", justifyContent: "center", opacity: 0.5, cursor: "not-allowed", borderStyle: "dashed" }}>
                Concluded
              </button>
            </div>
          );
        }

        if (match.day > currentDay + 1) {
          return (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem", width: "100%" }}>
              <button className="btn-gold" disabled style={{ width: "100%", justifyContent: "center", opacity: 0.5, cursor: "not-allowed", borderStyle: "dashed" }}>
                <Lock size={16} style={{ marginRight: "0.25rem" }} />
                Locked — Scheduled for {getMatchDateDisplay(match.day)}
              </button>
            </div>
          );
        }

        return (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem", width: "100%" }}>
            <button className="btn-gold" onClick={handleStartSimulation} style={{ width: "100%", justifyContent: "center" }}>
              <Play size={16} fill="currentColor" />
              Predict Simulation
            </button>
          </div>
        );
      })()}

      {/* Scrollable Content (AI Summary + Event Ticker) */}
      <div className="scroller" style={{ flex: 1, paddingRight: "0.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        

        {/* Event Roadmap Ticker */}
        <div style={{ display: "flex", flexDirection: "column", paddingBottom: "1.5rem" }}>
          <div className="section-title-container" style={{ marginBottom: "1rem" }}>
            <span className="section-title">Live Match Log</span>
            <span className="section-link">{simulatedEvents.length} Events</span>
          </div>

          {simulatedEvents.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.75rem", padding: "2rem" }}>
              {isPlaying ? "Kick-off pending..." : "Simulation has not started yet. Click 'Predict' to kick off!"}
            </div>
          ) : (
            <div className="event-roadmap-container">
              {/* Start node */}
              <div className="event-roadmap-node">
                <div className="event-roadmap-bullet start"></div>
                <div className="event-roadmap-card">
                  <div className="event-roadmap-icon-wrapper">
                    <span className="event-roadmap-icon">🏁</span>
                  </div>
                  <div className="event-roadmap-details">
                    <div className="event-roadmap-title">1' &nbsp; KICK OFF</div>
                    <div className="event-roadmap-desc">The match is underway!</div>
                  </div>
                </div>
              </div>

              {/* Match Events */}
              {(() => {
                let runningHomeScore = 0;
                let runningAwayScore = 0;
                return simulatedEvents.map((event, index) => {
                  const eventTeam = event.teamId === home.id ? home : away;
                  const isGoal = event.type === "GOAL";
                  const isYellow = event.type === "YELLOW";
                  const isRed = event.type === "RED";

                  if (isGoal) {
                    if (event.teamId === home.id) {
                      runningHomeScore++;
                    } else {
                      runningAwayScore++;
                    }
                  }

                  let bulletClass = "";
                  let icon = "⚡";
                  let title = "";
                  if (isGoal) {
                    bulletClass = "goal";
                    icon = "⚽";
                    title = `GOAL! ${home.name.toUpperCase()} ${runningHomeScore} - ${runningAwayScore} ${away.name.toUpperCase()}`;
                  } else if (isYellow) {
                    bulletClass = "yellow";
                    icon = "🟨";
                    title = `YELLOW CARD - ${eventTeam.name.toUpperCase()}`;
                  } else if (isRed) {
                    bulletClass = "red";
                    icon = "🟥";
                    title = `RED CARD - ${eventTeam.name.toUpperCase()}`;
                  } else if (event.type === "MISS") {
                    bulletClass = "miss";
                    icon = "❌";
                    title = `NEAR MISS - ${eventTeam.name.toUpperCase()}`;
                  } else if (event.type === "INJURY") {
                    bulletClass = "injury";
                    icon = "🩹";
                    title = `INJURY STOPPAGE - ${eventTeam.name.toUpperCase()}`;
                  }

                  return (
                    <div key={index} className="event-roadmap-node">
                      <div className={`event-roadmap-bullet ${bulletClass}`}>
                        {event.minute}'
                      </div>
                      <div className={`event-roadmap-card ${isGoal ? "goal" : ""}`}>
                        <div className="event-roadmap-icon-wrapper">
                          <span className="event-roadmap-icon">{icon}</span>
                        </div>
                        <div className="event-roadmap-details">
                          <div className={`event-roadmap-title ${isGoal ? "goal" : ""}`}>
                            {title}
                          </div>
                          <div className="event-roadmap-desc">
                            {event.playerName ? `${event.playerName}: ` : ""}
                            {event.detail}
                          </div>
                        </div>
                        {event.playerName && (
                          <div className="event-roadmap-avatar">
                            {getPlayerInitials(event.playerName)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}

              {/* End Node (only when clock matches full game duration) */}
              {((!isPlaying && match.status === "COMPLETED") ||
                (isPlaying &&
                  tickMin >=
                    (match.decidedBy === "PENALTIES"
                      ? 125
                      : match.decidedBy === "EXTRA_TIME"
                      ? 120
                      : 90))) && (
                <div className="event-roadmap-node">
                  <div className="event-roadmap-bullet end">FT</div>
                  <div className="event-roadmap-card">
                    <div className="event-roadmap-icon-wrapper">
                      <span className="event-roadmap-icon">📣</span>
                    </div>
                    <div className="event-roadmap-details">
                      <div className="event-roadmap-title end">FULL TIME</div>
                      <div className="event-roadmap-desc">
                        {match.homeScore === match.awayScore
                          ? "The match ends in a draw!"
                          : `${match.homeScore! > match.awayScore! ? home.name : away.name} secures the victory!`}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
