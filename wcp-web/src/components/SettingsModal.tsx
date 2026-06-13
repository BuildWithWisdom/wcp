import React, { useState } from "react";
import type { Team } from "../utils/teams";
import { getTeamRatings } from "../utils/poisson";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  geminiKey: string;
  onSaveGeminiKey: (key: string) => void;
  customTeams: Record<string, Team>;
  onUpdateTeamStats: (teamId: string, fifaPoints: number, squadValue: number) => void;
  onResetAllTeams: () => void;
  onFastForwardDay: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  geminiKey,
  onSaveGeminiKey,
  customTeams,
  onUpdateTeamStats,
  onResetAllTeams,
  onFastForwardDay,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(geminiKey);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editFifaPoints, setEditFifaPoints] = useState(1500);
  const [editSquadValue, setEditSquadValue] = useState(100);

  if (!isOpen) return null;

  const handleSaveKey = () => {
    onSaveGeminiKey(apiKeyInput);
  };

  const handleEditClick = (team: Team) => {
    setEditingTeamId(team.id);
    setEditFifaPoints(team.fifaPoints);
    setEditSquadValue(team.squadValue);
  };

  const handleSaveTeamEdit = (teamId: string) => {
    onUpdateTeamStats(teamId, editFifaPoints, editSquadValue);
    setEditingTeamId(null);
  };

  const filteredTeams = Object.values(customTeams).filter(
    (team) =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ maxWidth: "600px", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Oracle Settings</span>
          <button className="icon-button" onClick={onClose} style={{ borderRadius: "4px", fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}>
            ✕
          </button>
        </div>

        <div className="scroller" style={{ flex: 1, paddingRight: "0.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Gemini API Section */}
          <div className="form-group" style={{ background: "rgba(255, 255, 255, 0.02)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <label className="form-label" style={{ color: "var(--color-accent-gold)", marginBottom: "0.5rem", display: "block" }}>
              Gemini API Integration
            </label>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
              Provide your Gemini API Key to unlock witty, context-aware AI post-match summaries. Stored safely on your browser.
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="password"
                className="form-input"
                placeholder="Enter Gemini API Key..."
                value={apiKeyInput}
                onChange={(event) => setApiKeyInput(event.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn-blue-outline" onClick={handleSaveKey} style={{ whiteSpace: "nowrap" }}>
                Save Key
              </button>
            </div>
          </div>

          {/* Developer Testing Section */}
          <div className="form-group" style={{ background: "rgba(255, 255, 255, 0.02)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <label className="form-label" style={{ color: "var(--color-accent-gold)", marginBottom: "0.5rem", display: "block" }}>
              Developer Controls (Testing Only)
            </label>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
              Fast forward the tournament calendar by 1 day to unlock upcoming fixtures and test simulated matches.
            </p>
            <button className="btn-blue-outline" onClick={onFastForwardDay} style={{ width: "100%", justifyContent: "center" }}>
              Fast Forward +1 Day
            </button>
          </div>

          {/* Teams Poisson Variables Customizer */}
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <label className="form-label" style={{ color: "var(--color-accent-blue)" }}>
                Poisson Team Strengths
              </label>
              <button
                className="section-link"
                onClick={onResetAllTeams}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                Reset All Strengths
              </button>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
              Tweak FIFA points and Squad values to influence expected goals calculation.
            </p>
            
            <input
              type="text"
              className="form-input"
              placeholder="Search team by name or group..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              style={{ marginBottom: "1rem", width: "100%" }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "300px", overflowY: "auto" }} className="scroller">
              {filteredTeams.map((team) => {
                const ratings = getTeamRatings(team);
                const isEditing = editingTeamId === team.id;

                return (
                  <div
                    key={team.id}
                    style={{
                      background: "rgba(0, 0, 0, 0.2)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      padding: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.25rem" }}>{team.flag}</span>
                        <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                          {team.name} <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>({team.code})</span>
                        </span>
                        <span
                          style={{
                            fontSize: "0.65rem",
                            background: "rgba(56, 189, 248, 0.1)",
                            color: "var(--color-accent-blue)",
                            padding: "0.1rem 0.3rem",
                            borderRadius: "4px",
                            fontWeight: 600,
                          }}
                        >
                          Group {team.group}
                        </span>
                      </div>
                      {!isEditing && (
                        <button
                          className="section-link"
                          onClick={() => handleEditClick(team)}
                          style={{ background: "none", border: "none", cursor: "pointer" }}
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>FIFA Points</span>
                            <input
                              type="number"
                              className="form-input"
                              value={editFifaPoints}
                              onChange={(event) => setEditFifaPoints(Number(event.target.value))}
                              style={{ padding: "0.4rem" }}
                            />
                          </div>
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>Squad Value (€M)</span>
                            <input
                              type="number"
                              className="form-input"
                              value={editSquadValue}
                              onChange={(event) => setEditSquadValue(Number(event.target.value))}
                              style={{ padding: "0.4rem" }}
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                          <button
                            className="btn-blue-outline"
                            onClick={() => setEditingTeamId(null)}
                            style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn-gold"
                            onClick={() => handleSaveTeamEdit(team.id)}
                            style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem", boxShadow: "none" }}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          display: "grid",
                          gridTemplateColumns: "repeat(4, 1fr)",
                          gap: "0.5rem",
                          fontSize: "0.7rem",
                          borderTop: "1px solid rgba(255,255,255,0.03)",
                          paddingTop: "0.5rem",
                        }}
                      >
                        <div>
                          <div style={{ color: "var(--color-text-muted)" }}>FIFA Points</div>
                          <div style={{ fontWeight: 600 }}>{team.fifaPoints}</div>
                        </div>
                        <div>
                          <div style={{ color: "var(--color-text-muted)" }}>Squad Value</div>
                          <div style={{ fontWeight: 600 }}>€{team.squadValue}M</div>
                        </div>
                        <div>
                          <div style={{ color: "var(--color-text-muted)" }}>Poisson Att</div>
                          <div style={{ fontWeight: 600, color: "var(--color-accent-blue)" }}>
                            {ratings.attack.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: "var(--color-text-muted)" }}>Poisson Def</div>
                          <div style={{ fontWeight: 600, color: "var(--color-accent-gold)" }}>
                            {ratings.defense.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-buttons">
          <button className="btn-gold" onClick={onClose}>
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
