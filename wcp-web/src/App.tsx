import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { UpcomingMatches } from "./components/UpcomingMatches";
import { LiveSimulator } from "./components/LiveSimulator";
import { StatsPanel } from "./components/StatsPanel";
import { SettingsModal } from "./components/SettingsModal";
import type { Team } from "./utils/teams";
import type { Match } from "./utils/poisson";
import type { TournamentState } from "./utils/state";
import { Play, BarChart, Sparkles } from "lucide-react";
import { api } from "./utils/api";

export default function App() {
  // 1. Core State
  const [tournamentState, setTournamentState] = useState<TournamentState | null>(null);
  const [customTeams, setCustomTeams] = useState<Record<string, Team> | null>(null);
  const [loading, setLoading] = useState(true);

  const [userPredictions, setUserPredictions] = useState<Record<string, Match>>(() => {
    try {
      const saved = localStorage.getItem("wco_user_predictions");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [geminiKey, setGeminiKey] = useState(() => {
    return localStorage.getItem("wco_gemini_key") || "";
  });

  // Mobile Navigation state: 'home' | 'simulator' | 'stats'
  const [activeMobileView, setActiveMobileView] = useState<"home" | "simulator" | "stats">("home");

  // Load initial state from backend
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [state, teams] = await Promise.all([
          api.getTournament(),
          api.getTeams(),
        ]);
        setTournamentState(state);
        setCustomTeams(teams);
      } catch (err) {
        console.error("Failed to load initial tournament data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Get active matches list for current tournament stage
  const getMatchesForCurrentStage = (): Match[] => {
    if (!tournamentState) return [];

    const mergePredictions = (m: Match): Match => {
      const pred = userPredictions[m.id];
      if (pred) {
        return {
          ...m,
          ...pred,
          status: "COMPLETED",
        };
      }
      return m;
    };

    if (tournamentState.currentStage === "GROUPS") {
      const allGroupMatches: Match[] = [];
      Object.values(tournamentState.groups).forEach((group) => {
        allGroupMatches.push(...group.matches.map(mergePredictions));
      });
      return allGroupMatches.sort((a, b) => a.day - b.day);
    } else {
      const bracketMatches = tournamentState.bracket[tournamentState.currentStage]?.matches || [];
      return bracketMatches.map(mergePredictions).sort((a, b) => a.day - b.day);
    }
  };

  // Retrieve current active match object
  const getActiveMatch = (): Match | null => {
    if (!tournamentState || !activeMatchId) return null;
    const matches = getMatchesForCurrentStage();
    return matches.find((m) => m.id === activeMatchId) || null;
  };

  // 2. Action Handlers
  const handleSelectMatch = (matchId: string) => {
    setActiveMatchId(matchId);
    setActiveMobileView("simulator"); // Slide simulator view on mobile
  };

  const handleSaveGeminiKey = (key: string) => {
    setGeminiKey(key);
    localStorage.setItem("wco_gemini_key", key);
    alert("Gemini API Key saved successfully!");
  };

  const handleUpdateTeamStats = async (teamId: string, fifaPoints: number, squadValue: number) => {
    try {
      const updatedTeam = await api.updateTeam(teamId, fifaPoints, squadValue);
      setCustomTeams((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          [teamId]: updatedTeam,
        };
      });
      const updatedState = await api.getTournament();
      setTournamentState(updatedState);
    } catch (err: any) {
      alert(err.message || "Failed to update team ratings.");
    }
  };

  const handleResetAllTeams = async () => {
    if (window.confirm("Are you sure you want to reset all team ratings back to default?")) {
      try {
        const reset = await api.resetTeams();
        setCustomTeams(reset);
        const updatedState = await api.getTournament();
        setTournamentState(updatedState);
      } catch (err: any) {
        alert(err.message || "Failed to reset teams.");
      }
    }
  };

  const handleResetTournament = async () => {
    if (window.confirm("This will clear all simulated results and start the tournament over. Proceed?")) {
      try {
        const reset = await api.resetTournament();
        setTournamentState(reset);
        setUserPredictions({});
        localStorage.removeItem("wco_user_predictions");
        setActiveMatchId(null);
        setActiveMobileView("home");
      } catch (err: any) {
        alert(err.message || "Failed to reset tournament.");
      }
    }
  };

  /**
   * Logs a single match simulation outcome and handles bracket progression.
   */
  const handleSimulateSingleMatch = (
    matchId: string,
    simulatedMatch: Match,
    updatedState: TournamentState
  ) => {
    setUserPredictions((prev) => {
      const next = { ...prev, [matchId]: { ...simulatedMatch, simulatedByUser: true } };
      localStorage.setItem("wco_user_predictions", JSON.stringify(next));
      return next;
    });
    setTournamentState(updatedState);
  };

  const handleSimulateDay = async () => {
    try {
      const data = await api.simulateDay();
      const { matches, state } = data;
      setUserPredictions((prev) => {
        const next = { ...prev };
        matches.forEach((m) => {
          next[m.id] = { ...m, simulatedByUser: true };
        });
        localStorage.setItem("wco_user_predictions", JSON.stringify(next));
        return next;
      });
      setTournamentState(state);
      setActiveMatchId(null);
    } catch (err: any) {
      alert(err.message || "Failed to simulate matches for the day.");
    }
  };

  const handleFastForwardDay = async () => {
    try {
      const updatedState = await api.fastForwardDay();
      setTournamentState(updatedState);
    } catch (err: any) {
      alert(err.message || "Failed to fast forward calendar day.");
    }
  };


  if (loading || !tournamentState || !customTeams) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", justifyContent: "center", alignItems: "center", background: "#0a0f0d", color: "#e2e8f0" }}>
        <p style={{ fontFamily: "var(--font-heading)", letterSpacing: "1px", animation: "pulse 1.5s infinite" }}>LOADING WORLD CUP ORACLE...</p>
      </div>
    );
  }

  const activeMatch = getActiveMatch();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "150vh" }}>
      <Header
        currentStage={tournamentState.currentStage}
        currentDay={tournamentState.currentDay}
        onReset={handleResetTournament}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="app-layout">
        {/* Left Column (Feed/Fixtures) - Hide on mobile if not active */}
        <UpcomingMatches
          matches={getMatchesForCurrentStage()}
          teams={customTeams}
          activeMatchId={activeMatchId}
          onSelectMatch={handleSelectMatch}
          onSimulateDay={handleSimulateDay}
          currentStage={tournamentState.currentStage}
          currentDay={tournamentState.currentDay}
          className={`col-left ${activeMobileView !== "home" ? "col-hidden-mobile" : ""}`}
        />

        {/* Center Column (Live Simulator) - Hide on mobile if not active */}
        <LiveSimulator
          match={activeMatch}
          teams={customTeams}
          onSimulateSingleMatch={handleSimulateSingleMatch}
          geminiKey={geminiKey}
          currentDay={tournamentState.currentDay}
          onBack={() => setActiveMobileView("home")}
          className={`col-center ${activeMobileView !== "simulator" ? "col-hidden-mobile" : ""}`}
        />

        {/* Right Column (Stats/Bracket) - Hide on mobile if not active */}
        <StatsPanel
          state={tournamentState}
          teams={customTeams}
          activeMatch={activeMatch}
          className={`col-right ${activeMobileView !== "stats" ? "col-hidden-mobile" : ""}`}
        />
      </main>

      {/* Mobile Top-Level Tab bar */}
      <div className="mobile-tabs">
        <button
          className={`mobile-tab-btn ${activeMobileView === "home" ? "active" : ""}`}
          onClick={() => setActiveMobileView("home")}
        >
          <Play size={18} />
          <span>Matches</span>
        </button>
        <button
          className={`mobile-tab-btn ${activeMobileView === "simulator" ? "active" : ""}`}
          onClick={() => setActiveMobileView("simulator")}
        >
          <Sparkles size={18} />
          <span>Live Sim</span>
        </button>
        <button
          className={`mobile-tab-btn ${activeMobileView === "stats" ? "active" : ""}`}
          onClick={() => setActiveMobileView("stats")}
        >
          <BarChart size={18} />
          <span>Stats</span>
        </button>
        {/*
        <button
          className="mobile-tab-btn"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
        */}
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        geminiKey={geminiKey}
        onSaveGeminiKey={handleSaveGeminiKey}
        customTeams={customTeams}
        onUpdateTeamStats={handleUpdateTeamStats}
        onResetAllTeams={handleResetAllTeams}
        onFastForwardDay={handleFastForwardDay}
      />
    </div>
  );
}
