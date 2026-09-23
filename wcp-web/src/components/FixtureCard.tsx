import React, { useState } from "react";
import type { Fixture, FixtureTeam } from "../utils/api";

const TeamCrest: React.FC<{ team: FixtureTeam; size?: "sm" | "lg" }> = ({ team, size = "sm" }) => {
  const [failed, setFailed] = useState(false);

  if (!team.crestUrl || failed) {
    return (
      <span className={size === "lg" ? "crest-fallback-lg" : "crest-fallback"} aria-hidden>
        {team.tla || team.name.slice(0, 3).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      className={size === "lg" ? "fixture-crest-lg" : "fixture-crest"}
      src={team.crestUrl}
      alt=""
      onError={() => setFailed(true)}
    />
  );
};

export { TeamCrest };

const statusLabel = (fixture: Fixture): { text: string; className: string } => {
  switch (fixture.status) {
    case "IN_PLAY":
      return { text: "LIVE", className: "fixture-stage live" };
    case "PAUSED":
      return { text: "HALF-TIME", className: "fixture-stage live" };
    case "FINISHED":
      return { text: "FT", className: "fixture-stage ft" };
    case "POSTPONED":
      return { text: "POSTPONED", className: "fixture-stage paused" };
    case "CANCELLED":
      return { text: "CANCELLED", className: "fixture-stage paused" };
    case "SUSPENDED":
      return { text: "SUSPENDED", className: "fixture-stage paused" };
    default:
      return {
        text: fixture.matchday ? `MD ${fixture.matchday}` : (fixture.stage ?? "UPCOMING"),
        className: "fixture-stage",
      };
  }
};

interface FixtureCardProps {
  fixture: Fixture;
  onSelect: (fixture: Fixture) => void;
}

export const FixtureCard: React.FC<FixtureCardProps> = ({ fixture, onSelect }) => {
  const { homeTeam, awayTeam } = fixture;
  if (!homeTeam || !awayTeam) return null;

  const kickoff = new Date(fixture.kickoffAt);
  const dateStr = kickoff.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeStr = kickoff.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const finished = fixture.status === "FINISHED";
  const disabled = finished || fixture.status === "CANCELLED";
  const status = statusLabel(fixture);

  return (
    <div
      className={`fixture-card${disabled ? "" : " fixture-card-clickable"}`}
      onClick={disabled ? undefined : () => onSelect(fixture)}
      role={disabled ? undefined : "button"}
      tabIndex={disabled ? undefined : 0}
      onKeyDown={
        disabled
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(fixture);
              }
            }
      }
    >
      <div className="fixture-teams">
        <div className="fixture-team">
          <TeamCrest team={homeTeam} />
          <span className="fixture-team-name">{homeTeam.name}</span>
        </div>
        <span className="fixture-vs">VS</span>
        <div className="fixture-team">
          <TeamCrest team={awayTeam} />
          <span className="fixture-team-name">{awayTeam.name}</span>
        </div>
      </div>

      <div className="fixture-info">
        <span className={status.className}>{status.text}</span>
        <span className="fixture-time">{timeStr}</span>
        <span className="fixture-date">{dateStr}</span>
      </div>

      {finished && fixture.homeScore !== null && fixture.awayScore !== null ? (
        <span className="fixture-completed-score">
          {fixture.homeScore} – {fixture.awayScore}
        </span>
      ) : !disabled ? (
        <button
          className="btn-predict"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(fixture);
          }}
        >
          Predict
        </button>
      ) : (
        <span className="fixture-completed-score muted">{status.text}</span>
      )}
    </div>
  );
};
