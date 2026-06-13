import React, { useState } from "react";
import { BarChart, Trophy, Grid, Sparkles } from "lucide-react";
import type { TournamentState } from "../utils/state";
import { calculateStandings, getWinnerChances } from "../utils/state";
import type { Team } from "../utils/teams";
import type { Match } from "../utils/poisson";
import { getTeamRatings } from "../utils/poisson";

interface StatsPanelProps {
  state: TournamentState;
  teams: Record<string, Team>;
  activeMatch: Match | null;
  className?: string;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ state, teams, activeMatch, className }) => {
  const [activeSubTab, setActiveSubTab] = useState<"standings" | "forecast" | "bracket">("standings");
  const [selectedGroup, setSelectedGroup] = useState<string>("A");

  const groupsList = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  const getWinnerChancesList = () => {
    return getWinnerChances(state);
  };

  return (
    <div className={className}>
      {/* AI Match Summary Card */}
      {activeMatch && activeMatch.status === "COMPLETED" && activeMatch.aiSummary && (
        <div className="glass-card ai-summary-card" style={{ marginBottom: "1rem" }}>
          <div className="ai-summary-header">
            <Sparkles size={16} />
            <span>AI Match Summary</span>
          </div>
          <p className="ai-summary-text">{activeMatch.aiSummary}</p>
          
          <div className="mini-stats-grid">
            <div className="mini-stat-item">
              <div className="mini-stat-label">Possession</div>
              <div className="mini-stat-value">
                {activeMatch.homeScore !== null && activeMatch.awayScore !== null
                  ? `${50 + (activeMatch.homeScore - activeMatch.awayScore) * 3}%`
                  : "50%"}
              </div>
            </div>
            <div className="mini-stat-item">
              <div className="mini-stat-label">Shots</div>
              <div className="mini-stat-value">
                {activeMatch.homeScore !== null && activeMatch.awayScore !== null
                  ? `${10 + activeMatch.homeScore * 2} - ${8 + activeMatch.awayScore * 2}`
                  : "0 - 0"}
              </div>
            </div>
            <div className="mini-stat-item">
              <div className="mini-stat-label">xG</div>
              <div className="mini-stat-value">
                {teams[activeMatch.homeTeamId] && teams[activeMatch.awayTeamId]
                  ? `${((getTeamRatings(teams[activeMatch.homeTeamId]).attack * (activeMatch.homeAttackModifier ?? 1.0)) * (getTeamRatings(teams[activeMatch.awayTeamId]).defense * (activeMatch.awayDefenseModifier ?? 1.0)) * 1.35).toFixed(2)} - ${((getTeamRatings(teams[activeMatch.awayTeamId]).attack * (activeMatch.awayAttackModifier ?? 1.0)) * (getTeamRatings(teams[activeMatch.homeTeamId]).defense * (activeMatch.homeDefenseModifier ?? 1.0)) * 1.35).toFixed(2)}`
                  : "0.00 - 0.00"}
              </div>
            </div>
          </div>

          {/* Oracle Modifiers */}
          {activeMatch.homeAttackModifier !== undefined &&
           activeMatch.homeDefenseModifier !== undefined &&
           activeMatch.awayAttackModifier !== undefined &&
           activeMatch.awayDefenseModifier !== undefined && (
            <div style={{ marginTop: "1rem", borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem", fontSize: "0.7rem", textTransform: "uppercase", color: "var(--color-accent-gold)", fontWeight: 700, fontFamily: "var(--font-heading)" }}>
                <span>Oracle Modifiers</span>
                <span>Poisson Scaling</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.75rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                  <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{teams[activeMatch.homeTeamId]?.flag} {teams[activeMatch.homeTeamId]?.name}</span>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.7rem" }}>
                    Attack: <span style={{ color: activeMatch.homeAttackModifier > 1 ? "var(--color-accent-green)" : activeMatch.homeAttackModifier < 1 ? "var(--color-accent-red)" : "var(--color-text-muted)", fontWeight: 600 }}>x{activeMatch.homeAttackModifier.toFixed(2)}</span> | 
                    Defense: <span style={{ color: activeMatch.homeDefenseModifier < 1 ? "var(--color-accent-green)" : activeMatch.homeDefenseModifier > 1 ? "var(--color-accent-red)" : "var(--color-text-muted)", fontWeight: 600 }}>x{activeMatch.homeDefenseModifier.toFixed(2)}</span>
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", alignItems: "flex-end", textAlign: "right" }}>
                  <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{teams[activeMatch.awayTeamId]?.name} {teams[activeMatch.awayTeamId]?.flag}</span>
                  <span style={{ color: "var(--color-text-muted)", fontSize: "0.7rem" }}>
                    Attack: <span style={{ color: activeMatch.awayAttackModifier > 1 ? "var(--color-accent-green)" : activeMatch.awayAttackModifier < 1 ? "var(--color-accent-red)" : "var(--color-text-muted)", fontWeight: 600 }}>x{activeMatch.awayAttackModifier.toFixed(2)}</span> | 
                    Defense: <span style={{ color: activeMatch.awayDefenseModifier < 1 ? "var(--color-accent-green)" : activeMatch.awayDefenseModifier > 1 ? "var(--color-accent-red)" : "var(--color-text-muted)", fontWeight: 600 }}>x{activeMatch.awayDefenseModifier.toFixed(2)}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab navigation */}
      <div className="sub-tabs-container">
        <button
          className={`btn-sub-tab ${activeSubTab === "standings" ? "active" : ""}`}
          onClick={() => setActiveSubTab("standings")}
        >
          <Grid size={14} />
          Standings
        </button>

        <button
          className={`btn-sub-tab ${activeSubTab === "forecast" ? "active" : ""}`}
          onClick={() => setActiveSubTab("forecast")}
        >
          <BarChart size={14} />
          Forecast
        </button>

        <button
          className={`btn-sub-tab ${activeSubTab === "bracket" ? "active" : ""}`}
          onClick={() => setActiveSubTab("bracket")}
        >
          <Trophy size={14} />
          Bracket
        </button>
      </div>

      {/* 1. STANDINGS TAB */}
      {activeSubTab === "standings" && (
        <div className="glass-card" style={{ flex: 1, overflow: "hidden" }}>
          <div className="section-title-container" style={{ marginBottom: "1rem" }}>
            <span className="section-title">Group Standings</span>
          </div>

          {/* Group pills selector */}
          <div className="scroller" style={{ display: "flex", gap: "0.4rem", paddingBottom: "0.5rem", marginBottom: "1rem", overflowX: "auto", whiteSpace: "nowrap" }}>
            {groupsList.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGroup(g)}
                style={{
                  background: selectedGroup === g ? "var(--color-accent-blue)" : "rgba(255, 255, 255, 0.03)",
                  border: "1px solid " + (selectedGroup === g ? "var(--color-accent-blue)" : "var(--border-color)"),
                  color: selectedGroup === g ? "#030712" : "var(--color-text)",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "4px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Grp {g}
              </button>
            ))}
          </div>

          {/* Standings table */}
          <div className="scroller" style={{ flex: 1, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--color-text-muted)", height: "2rem" }}>
                  <th style={{ paddingLeft: "0.25rem" }}>Pos</th>
                  <th>Team</th>
                  <th style={{ textAlign: "center" }}>PL</th>
                  <th style={{ textAlign: "center" }}>GD</th>
                  <th style={{ textAlign: "center", paddingRight: "0.25rem" }}>PTS</th>
                </tr>
              </thead>
              <tbody>
                {calculateStandings(state.groups[selectedGroup]).map((standing, index) => {
                  const team = teams[standing.teamId];
                  if (!team) return null;

                  const isQualifying = index < 2; // Top 2 qualify
                  
                  return (
                    <tr
                      key={standing.teamId}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.02)",
                        height: "2.25rem",
                        background: isQualifying ? "rgba(56, 189, 248, 0.01)" : "transparent",
                      }}
                    >
                      <td style={{ paddingLeft: "0.25rem", fontWeight: 700, color: isQualifying ? "var(--color-accent-blue)" : "var(--color-text-muted)" }}>
                        {index + 1}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        <span style={{ marginRight: "0.3rem" }}>{team.flag}</span>
                        {team.name}
                      </td>
                      <td style={{ textAlign: "center", color: "var(--color-text-muted)" }}>{standing.played}</td>
                      <td style={{ textAlign: "center", color: standing.goalDifference > 0 ? "var(--color-accent-green)" : standing.goalDifference < 0 ? "var(--color-accent-red)" : "var(--color-text-muted)" }}>
                        {standing.goalDifference > 0 ? `+${standing.goalDifference}` : standing.goalDifference}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "var(--color-accent-gold)", paddingRight: "0.25rem" }}>
                        {standing.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. FORECAST TAB */}
      {activeSubTab === "forecast" && (
        <div className="glass-card" style={{ flex: 1, overflow: "hidden" }}>
          <div className="section-title-container" style={{ marginBottom: "1rem" }}>
            <span className="section-title">Tournament Oracle Forecast</span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
            Oracle's calculated probability of lifting the trophy, simulated over current team parameters.
          </p>

          <div className="forecast-list scroller" style={{ flex: 1 }}>
            {getWinnerChancesList().map((item) => {
              const team = teams[item.teamId];
              if (!team) return null;
              return (
                <div key={item.teamId} className="forecast-row">
                  <span className="forecast-flag">{team.flag}</span>
                  <span className="forecast-name">{team.name}</span>
                  <div className="forecast-bar-track">
                    <div className="forecast-bar-fill" style={{ width: `${item.chance}%` }}></div>
                  </div>
                  <span className="forecast-percentage">{item.chance}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. BRACKET TAB */}
      {activeSubTab === "bracket" && (
        <div className="glass-card" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="section-title-container" style={{ marginBottom: "0.5rem" }}>
            <span className="section-title">Knockout Bracket</span>
          </div>

          <div className="scroller" style={{ flex: 1, overflowX: "auto", display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "1rem", minWidth: "500px", padding: "0.5rem" }}>
              {/* QF Column */}
              <div className="mini-bracket-round">
                <span style={{ fontSize: "0.6rem", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "center", fontWeight: 700 }}>QF</span>
                {state.bracket.QF.matches.map((m) => {
                  const h = teams[m.homeTeamId];
                  const a = teams[m.awayTeamId];
                  return (
                    <div key={m.id} className="mini-bracket-node">
                      <div className={`mini-bracket-team ${m.winnerId === m.homeTeamId ? "winner" : ""}`}>
                        <span>{h?.flag || "🏳️"}</span>
                        <span>{h?.code || "TBD"}</span>
                        {m.homeScore !== null && <span style={{ marginLeft: "auto" }}>{m.homeScore}</span>}
                      </div>
                      <div className={`mini-bracket-team ${m.winnerId === m.awayTeamId ? "winner" : ""}`}>
                        <span>{a?.flag || "🏳️"}</span>
                        <span>{a?.code || "TBD"}</span>
                        {m.awayScore !== null && <span style={{ marginLeft: "auto" }}>{m.awayScore}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SF Column */}
              <div className="mini-bracket-round" style={{ gap: "2.5rem" }}>
                <span style={{ fontSize: "0.6rem", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "center", fontWeight: 700 }}>SF</span>
                {state.bracket.SF.matches.map((m) => {
                  const h = teams[m.homeTeamId];
                  const a = teams[m.awayTeamId];
                  return (
                    <div key={m.id} className="mini-bracket-node">
                      <div className={`mini-bracket-team ${m.winnerId === m.homeTeamId ? "winner" : ""}`}>
                        <span>{h?.flag || "🏳️"}</span>
                        <span>{h?.code || "TBD"}</span>
                        {m.homeScore !== null && <span style={{ marginLeft: "auto" }}>{m.homeScore}</span>}
                      </div>
                      <div className={`mini-bracket-team ${m.winnerId === m.awayTeamId ? "winner" : ""}`}>
                        <span>{a?.flag || "🏳️"}</span>
                        <span>{a?.code || "TBD"}</span>
                        {m.awayScore !== null && <span style={{ marginLeft: "auto" }}>{m.awayScore}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Final Column */}
              <div className="mini-bracket-round" style={{ justifyContent: "center" }}>
                <span style={{ fontSize: "0.6rem", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "center", fontWeight: 700 }}>Final</span>
                {state.bracket.FINAL.matches.map((m) => {
                  const h = teams[m.homeTeamId];
                  const a = teams[m.awayTeamId];
                  return (
                    <div key={m.id} className="mini-bracket-node" style={{ borderColor: "var(--color-accent-gold)" }}>
                      <div className={`mini-bracket-team ${m.winnerId === m.homeTeamId ? "winner" : ""}`}>
                        <span>{h?.flag || "🏳️"}</span>
                        <span>{h?.code || "TBD"}</span>
                        {m.homeScore !== null && <span style={{ marginLeft: "auto" }}>{m.homeScore}</span>}
                      </div>
                      <div className={`mini-bracket-team ${m.winnerId === m.awayTeamId ? "winner" : ""}`}>
                        <span>{a?.flag || "🏳️"}</span>
                        <span>{a?.code || "TBD"}</span>
                        {m.awayScore !== null && <span style={{ marginLeft: "auto" }}>{m.awayScore}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Champion Column */}
              <div className="mini-bracket-round" style={{ justifyContent: "center", alignItems: "center" }}>
                <span style={{ fontSize: "0.6rem", textTransform: "uppercase", color: "var(--color-text-muted)", textAlign: "center", fontWeight: 700 }}>Champion</span>
                {state.championId ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                    <span className="mini-bracket-trophy">🏆</span>
                    <span style={{ fontSize: "1.25rem" }}>{teams[state.championId]?.flag}</span>
                    <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--color-accent-gold)", textTransform: "uppercase" }}>
                      {teams[state.championId]?.name}
                    </span>
                  </div>
                ) : (
                  <div style={{ opacity: 0.15, fontSize: "1.5rem" }}>🏆</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
