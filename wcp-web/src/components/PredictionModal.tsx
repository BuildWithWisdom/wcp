import React, { useEffect, useState } from "react";
import {
  Sparkles,
  RotateCw,
  X,
  Loader2,
  CircleDot,
  Square,
  HeartPulse,
} from "lucide-react";
import { api } from "../utils/api";
import type { Fixture, MatchEvent, Prediction } from "../utils/api";
import { TeamCrest } from "./FixtureCard";
import { MatchReplay } from "./MatchReplay";

const EVENT_META: Record<
  MatchEvent["type"],
  {
    bullet: string;
    Icon: React.ComponentType<{ size?: number | string; color?: string }>;
    iconColor?: string;
    label: string;
  }
> = {
  GOAL: { bullet: "goal", Icon: CircleDot, iconColor: "#38bdf8", label: "Goal" },
  YELLOW: { bullet: "yellow", Icon: Square, iconColor: "#fbbf24", label: "Yellow Card" },
  RED: { bullet: "red", Icon: Square, iconColor: "#ef4444", label: "Red Card" },
  INJURY: { bullet: "", Icon: HeartPulse, iconColor: "#f87171", label: "Injury" },
  MISS: { bullet: "", Icon: X, iconColor: "#9ca3af", label: "Chance Missed" },
};

interface PredictionModalProps {
  fixture: Fixture;
  onClose: () => void;
}

export const PredictionModal: React.FC<PredictionModalProps> = ({ fixture, onClose }) => {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictCount, setPredictCount] = useState(0);

  const { homeTeam, awayTeam } = fixture;

  const runPredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.predict(fixture.id);
      setPrediction(result);
      setPredictCount((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The Oracle is unreachable. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, loading]);

  if (!homeTeam || !awayTeam) return null;

  const kickoff = new Date(fixture.kickoffAt);
  const kickoffStr = kickoff.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const verdict = (() => {
    if (!prediction) return "";
    const { homeScore, awayScore, decidedBy, penaltyScores, winnerId } = prediction;
    let text: string;
    if (homeScore > awayScore) text = `${homeTeam.name} win`;
    else if (awayScore > homeScore) text = `${awayTeam.name} win`;
    else text = "It's a draw";
    if (decidedBy === "PENALTIES" && penaltyScores) {
      text += ` on penalties (${penaltyScores.home}–${penaltyScores.away})`;
    } else if (decidedBy === "EXTRA_TIME") {
      text += " after extra time";
    } else if (winnerId && homeScore === awayScore) {
      // winner via shootout already handled; ignore
    }
    return text;
  })();

  const teamNameById = (id: string) =>
    id === homeTeam.id ? homeTeam.name : id === awayTeam.id ? awayTeam.name : "";

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onClose}>
      <div
        className="modal-content prediction-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Oracle prediction"
      >
        <div className="prediction-modal-header">
          <h2 className="modal-title">Oracle Prediction</h2>
          <button className="icon-button" onClick={onClose} title="Close" disabled={loading}>
            <X size={16} />
          </button>
        </div>

        <div className="prediction-matchup">
          <div className="prediction-team">
            <TeamCrest team={homeTeam} size="lg" />
            <span className="prediction-team-name">{homeTeam.name}</span>
          </div>
          <span className="prediction-vs">VS</span>
          <div className="prediction-team">
            <TeamCrest team={awayTeam} size="lg" />
            <span className="prediction-team-name">{awayTeam.name}</span>
          </div>
        </div>
        <p className="prediction-kickoff">Kick-off {kickoffStr}</p>

        {!prediction && !loading && (
          <button className="btn-gold predict-cta" onClick={runPredict}>
            <Sparkles size={16} /> Predict this match
          </button>
        )}

        {loading && (
          <div className="oracle-loading">
            <Loader2 size={32} className="oracle-spinner" />
            <p>The Oracle is consulting the data…</p>
          </div>
        )}

        {error && !loading && (
          <div className="prediction-error">
            <p>{error}</p>
            <button className="btn-blue-outline" onClick={runPredict}>
              <RotateCw size={14} /> Try again
            </button>
          </div>
        )}

        {prediction && !loading && (
          <>
            <div className="scoreboard-card prediction-scoreboard">
              <div className="scoreboard-team">
                <TeamCrest team={homeTeam} size="lg" />
                <span className="scoreboard-name">{homeTeam.tla || homeTeam.name}</span>
              </div>
              <div className="scoreboard-score">
                {prediction.homeScore}
                <span style={{ color: "var(--color-text-muted)" }}>–</span>
                {prediction.awayScore}
              </div>
              <div className="scoreboard-team">
                <TeamCrest team={awayTeam} size="lg" />
                <span className="scoreboard-name">{awayTeam.tla || awayTeam.name}</span>
              </div>
              <span className="scoreboard-sim-badge completed">Oracle Pick</span>
            </div>

            <p className="prediction-verdict">{verdict}</p>

            <MatchReplay
              key={predictCount}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              prediction={prediction}
            />

            <div className="glass-card ai-summary-card">
              <div className="ai-summary-header">
                <Sparkles size={14} /> Oracle Says
              </div>
              <p className="ai-summary-text">{prediction.aiSummary}</p>
            </div>

            {prediction.timeline.length > 0 && (
              <div className="prediction-timeline">
                <div className="section-title-container">
                  <span className="section-title">Projected Timeline</span>
                </div>
                <div className="event-roadmap-container">
                  <div className="event-roadmap-node">
                    <span className="event-roadmap-bullet start" />
                    <div className="event-roadmap-card">
                      <div className="event-roadmap-details">
                        <div className="event-roadmap-title">Kick-off</div>
                        <div className="event-roadmap-desc">
                          {homeTeam.name} vs {awayTeam.name}
                        </div>
                      </div>
                    </div>
                  </div>

                  {prediction.timeline.map((event, i) => {
                    const meta = EVENT_META[event.type];
                    const team = teamNameById(event.teamId);
                    return (
                      <div className="event-roadmap-node" key={`${event.minute}-${event.type}-${i}`}>
                        <span className={`event-roadmap-bullet ${meta.bullet}`}>{event.minute}</span>
                        <div className={`event-roadmap-card ${meta.bullet}`}>
                          <div className="event-roadmap-icon-wrapper">
                            <meta.Icon size={16} color={meta.iconColor} />
                          </div>
                          <div className="event-roadmap-details">
                            <div className={`event-roadmap-title ${meta.bullet}`}>
                              {event.minute}' {meta.label}
                              {team ? ` — ${team}` : ""}
                            </div>
                            {(event.playerName || event.detail) && (
                              <div className="event-roadmap-desc">
                                {[event.playerName, event.detail].filter(Boolean).join(" · ")}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="event-roadmap-node">
                    <span className="event-roadmap-bullet end">FT</span>
                    <div className="event-roadmap-card">
                      <div className="event-roadmap-details">
                        <div className="event-roadmap-title end">
                          Full Time — {prediction.homeScore}–{prediction.awayScore}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="modal-buttons">
              <button className="btn-blue-outline" onClick={onClose}>
                Close
              </button>
              <button className="btn-gold" onClick={runPredict}>
                <RotateCw size={14} /> Predict again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
