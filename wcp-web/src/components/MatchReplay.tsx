import React, { useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { PitchCanvas } from "./PitchCanvas";
import type { FixtureTeam, Prediction } from "../utils/api";
import type { Team } from "../utils/teams";

const TICK_MS = 60;
const FULL_DURATION_MS = 15000;

const toPitchTeam = (t: FixtureTeam): Team => ({
  id: t.id,
  name: t.name,
  code: t.tla ?? t.name.slice(0, 3).toUpperCase(),
  flag: "",
  group: "",
  fifaPoints: t.fifaPoints,
  squadValue: t.squadValue,
  keyPlayers: [],
});

interface MatchReplayProps {
  homeTeam: FixtureTeam;
  awayTeam: FixtureTeam;
  prediction: Prediction;
}

export const MatchReplay: React.FC<MatchReplayProps> = ({
  homeTeam,
  awayTeam,
  prediction,
}) => {
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [minute, setMinute] = useState(0);
  const [liveHome, setLiveHome] = useState(0);
  const [liveAway, setLiveAway] = useState(0);

  const tickRef = useRef(0);
  const pauseUntilRef = useRef(0);
  const firedRef = useRef<Set<number>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const lastEventMinute = prediction.timeline.reduce(
    (max, e) => Math.max(max, e.minute),
    0
  );
  const baseMinutes = prediction.decidedBy === "REGULAR" ? 90 : 120;
  const totalMinutes = Math.max(baseMinutes, lastEventMinute);
  const minutesPerTick = totalMinutes / (FULL_DURATION_MS / TICK_MS);

  const start = () => {
    tickRef.current = 0;
    pauseUntilRef.current = 0;
    firedRef.current = new Set();
    setMinute(0);
    setLiveHome(0);
    setLiveAway(0);
    setPhase("playing");
  };

  useEffect(() => {
    audioRef.current = new Audio("/sounds/goal.mp3");
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;

    const id = window.setInterval(() => {
      const now = Date.now();
      if (now < pauseUntilRef.current) return;

      tickRef.current += 1;
      const m = Math.min(totalMinutes, Math.floor(tickRef.current * minutesPerTick));
      setMinute(m);

      prediction.timeline.forEach((event, index) => {
        if (firedRef.current.has(index) || event.minute > m) return;
        firedRef.current.add(index);

        if (event.type === "GOAL") {
          if (event.teamId === homeTeam.id) setLiveHome((v) => v + 1);
          else setLiveAway((v) => v + 1);
          pauseUntilRef.current = now + 3200;
          audioRef.current?.play().catch(() => undefined);
        } else if (event.type === "MISS") {
          pauseUntilRef.current = now + 1800;
        }
      });

      if (m >= totalMinutes) setPhase("done");
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [phase, totalMinutes, minutesPerTick, prediction, homeTeam.id]);

  if (phase === "idle") {
    return (
      <button className="btn-blue-outline replay-cta" onClick={start}>
        <Play size={14} /> Watch simulation
      </button>
    );
  }

  return (
    <div className="match-replay">
      <div className="replay-frame">
        <PitchCanvas
          homeTeam={toPitchTeam(homeTeam)}
          awayTeam={toPitchTeam(awayTeam)}
          isPlaying={phase === "playing"}
          currentMinute={minute}
          events={prediction.timeline}
          liveHomeScore={liveHome}
          liveAwayScore={liveAway}
        />
        <span className="replay-minute">{phase === "done" ? "FT" : `${minute}'`}</span>
      </div>
      {phase === "done" && (
        <button className="btn-blue-outline replay-cta" onClick={start}>
          <RotateCcw size={14} /> Replay
        </button>
      )}
    </div>
  );
};
