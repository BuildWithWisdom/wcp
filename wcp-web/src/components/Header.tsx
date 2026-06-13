import React from "react";
import { Trophy, RefreshCw } from "lucide-react";

interface HeaderProps {
  currentStage: string;
  currentDay: number;
  onReset: () => void;
  onOpenSettings: () => void;
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

export const Header: React.FC<HeaderProps> = ({ currentStage, currentDay, onReset, onOpenSettings: _onOpenSettings }) => {
  const getStageDisplay = () => {
    switch (currentStage) {
      case "GROUPS":
        return `Group Stage — ${getMatchDateDisplay(currentDay)}`;
      case "R32":
        return `Round of 32 — ${getMatchDateDisplay(currentDay)}`;
      case "R16":
        return `Round of 16 — ${getMatchDateDisplay(currentDay)}`;
      case "QF":
        return `Quarter-Finals — ${getMatchDateDisplay(currentDay)}`;
      case "SF":
        return `Semi-Finals — ${getMatchDateDisplay(currentDay)}`;
      case "FINAL":
        return `The Final — ${getMatchDateDisplay(currentDay)}`;
      case "COMPLETED":
        return "Completed";
      default:
        return `${currentStage} — ${getMatchDateDisplay(currentDay)}`;
    }
  };

  return (
    <header className="app-header">
      <div className="logo-container">
        <Trophy size={26} color="#fbbf24" style={{ filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))" }} />
        <div className="logo-text">
          World Cup <span>Oracle</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span
          style={{
            background: "rgba(56, 189, 248, 0.08)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            color: "var(--color-accent-blue)",
            padding: "0.3rem 0.8rem",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {getStageDisplay()}
        </span>

        <button className="icon-button" title="Reset Tournament" onClick={onReset}>
          <RefreshCw size={18} />
        </button>

        {/*
        <button className="icon-button" title="Oracle Settings" onClick={onOpenSettings}>
          <Settings size={18} />
        </button>
        */}
      </div>
    </header>
  );
};
