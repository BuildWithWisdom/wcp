import React, { useEffect, useRef, useState } from "react";
import type { MatchEvent } from "../utils/poisson";
import type { Team } from "../utils/teams";

interface PitchCanvasProps {
  homeTeam: Team;
  awayTeam: Team;
  isPlaying: boolean;
  currentMinute: number;
  events: MatchEvent[];
  liveHomeScore: number;
  liveAwayScore: number;
}

interface PlayerNode {
  id: number;
  isHome: boolean;
  baseX: number;
  baseY: number;
  posX: number;
  posY: number;
  label: string;
}

interface VisualParticle {
  posX: number;
  posY: number;
  velX: number;
  velY: number;
  life: number;
  color: string;
}

const getTeamColor = (teamId: string): string => {
  const colorMap: Record<string, string> = {
    argentina: "#38bdf8",
    brazil: "#fbbf24",
    germany: "#e2e8f0",
    france: "#2563eb",
    spain: "#dc2626",
    portugal: "#991b1b",
    england: "#ffffff",
    italy: "#1d4ed8",
    netherlands: "#ea580c",
    belgium: "#be123c",
    croatia: "#e11d48",
    uruguay: "#60a5fa",
    usa: "#1e3a8a",
    mexico: "#16a34a",
    japan: "#1e40af",
    morocco: "#047857",
    qatar: "#881337",
    switzerland: "#dc2626",
  };
  return colorMap[teamId] || "#475569";
};

const getTeamBorderColor = (teamId: string): string => {
  const borderMap: Record<string, string> = {
    argentina: "#ffffff",
    brazil: "#16a34a",
    germany: "#0f172a",
    france: "#ffffff",
    spain: "#fbbf24",
    portugal: "#16a34a",
    england: "#dc2626",
    netherlands: "#ffffff",
    usa: "#ffffff",
    mexico: "#ffffff",
    japan: "#ffffff",
  };
  return borderMap[teamId] || "#ffffff";
};

export const PitchCanvas: React.FC<PitchCanvasProps> = ({
  homeTeam,
  awayTeam,
  isPlaying,
  currentMinute,
  events,
  liveHomeScore,
  liveAwayScore,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);

  const [players, setPlayers] = useState<PlayerNode[]>([]);

  const activeSequenceRef = useRef<"NONE" | "GOAL" | "MISS">("NONE");
  const sequenceFrameRef = useRef<number>(0);
  const sequenceTeamRef = useRef<boolean>(true);
  const lastProcessedMinRef = useRef<number>(-1);

  const particlesRef = useRef<VisualParticle[]>([]);

  const stateRef = useRef({
    isPlaying,
    currentMinute,
    events,
    liveHomeScore,
    liveAwayScore,
    homeTeam,
    awayTeam,
    players,
  });

  useEffect(() => {
    stateRef.current = {
      isPlaying,
      currentMinute,
      events,
      liveHomeScore,
      liveAwayScore,
      homeTeam,
      awayTeam,
      players,
    };
  }, [isPlaying, currentMinute, events, liveHomeScore, liveAwayScore, homeTeam, awayTeam, players]);

  useEffect(() => {
    const homeList: PlayerNode[] = [
      { id: 1, isHome: true, baseX: 5, baseY: 50, posX: 5, posY: 50, label: "GK" },
      { id: 2, isHome: true, baseX: 20, baseY: 20, posX: 20, posY: 20, label: "DF" },
      { id: 3, isHome: true, baseX: 20, baseY: 40, posX: 20, posY: 40, label: "DF" },
      { id: 4, isHome: true, baseX: 20, baseY: 60, posX: 20, posY: 60, label: "DF" },
      { id: 5, isHome: true, baseX: 20, baseY: 80, posX: 20, posY: 80, label: "DF" },
      { id: 6, isHome: true, baseX: 40, baseY: 30, posX: 40, posY: 30, label: "MF" },
      { id: 7, isHome: true, baseX: 35, baseY: 50, posX: 35, posY: 50, label: "MF" },
      { id: 8, isHome: true, baseX: 40, baseY: 70, posX: 40, posY: 70, label: "MF" },
      { id: 9, isHome: true, baseX: 60, baseY: 20, posX: 60, posY: 20, label: "FW" },
      { id: 10, isHome: true, baseX: 65, baseY: 50, posX: 65, posY: 50, label: "FW" },
      { id: 11, isHome: true, baseX: 60, baseY: 80, posX: 60, posY: 80, label: "FW" },
    ];

    const awayList: PlayerNode[] = [
      { id: 12, isHome: false, baseX: 95, baseY: 50, posX: 95, posY: 50, label: "GK" },
      { id: 13, isHome: false, baseX: 80, baseY: 20, posX: 80, posY: 20, label: "DF" },
      { id: 14, isHome: false, baseX: 80, baseY: 40, posX: 80, posY: 40, label: "DF" },
      { id: 15, isHome: false, baseX: 80, baseY: 60, posX: 80, posY: 60, label: "DF" },
      { id: 16, isHome: false, baseX: 80, baseY: 80, posX: 80, posY: 80, label: "DF" },
      { id: 17, isHome: false, baseX: 60, baseY: 30, posX: 60, posY: 30, label: "MF" },
      { id: 18, isHome: false, baseX: 65, baseY: 50, posX: 65, posY: 50, label: "MF" },
      { id: 19, isHome: false, baseX: 60, baseY: 70, posX: 60, posY: 70, label: "MF" },
      { id: 20, isHome: false, baseX: 40, baseY: 20, posX: 40, posY: 20, label: "FW" },
      { id: 21, isHome: false, baseX: 35, baseY: 50, posX: 35, posY: 50, label: "FW" },
      { id: 22, isHome: false, baseX: 40, baseY: 80, posX: 40, posY: 80, label: "FW" },
    ];

    setPlayers([...homeList, ...awayList]);
    activeSequenceRef.current = "NONE";
    sequenceFrameRef.current = 0;
    lastProcessedMinRef.current = -1;
    particlesRef.current = [];
  }, [homeTeam, awayTeam]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let localBallX = 50;
    let localBallY = 50;

    const spawnGoalExplosion = (targetX: number, targetY: number) => {
      const { homeTeam: activeHome, awayTeam: activeAway } = stateRef.current;
      const pColor = targetX > 50 ? getTeamColor(activeHome.id) : getTeamColor(activeAway.id);
      for (let pIdx = 0; pIdx < 30; pIdx++) {
        particlesRef.current.push({
          posX: targetX,
          posY: targetY,
          velX: (Math.random() - 0.5) * 4 - (targetX > 50 ? 2 : -2),
          velY: (Math.random() - 0.5) * 4,
          life: 1.0,
          color: pColor,
        });
      }
    };

    const updateSimulation = () => {
      const {
        isPlaying: activePlaying,
        currentMinute: activeMin,
        events: activeEvents,
        homeTeam: activeHome,
      } = stateRef.current;

      if (!activePlaying) {
        activeSequenceRef.current = "NONE";
        sequenceFrameRef.current = 0;
        lastProcessedMinRef.current = -1;
        particlesRef.current = [];
        return;
      }

      if (activeMin !== lastProcessedMinRef.current) {
        lastProcessedMinRef.current = activeMin;
        const matchingEvent = activeEvents.find((evt) => evt.minute === activeMin);
        if (matchingEvent) {
          if (matchingEvent.type === "GOAL") {
            activeSequenceRef.current = "GOAL";
            sequenceFrameRef.current = 0;
            sequenceTeamRef.current = matchingEvent.teamId === activeHome.id;
          } else if (matchingEvent.type === "MISS") {
            activeSequenceRef.current = "MISS";
            sequenceFrameRef.current = 0;
            sequenceTeamRef.current = matchingEvent.teamId === activeHome.id;
          }
        }
      }

      const isHomeSequence = sequenceTeamRef.current;

      if (activeSequenceRef.current !== "NONE") {
        sequenceFrameRef.current += 1;
        const currentFrame = sequenceFrameRef.current;

        if (currentFrame < 45) {
          const startX = 50;
          const startY = 50;
          const midX = isHomeSequence ? 70 : 30;
          const midY = 35 + (activeMin % 3) * 10;
          const progress = currentFrame / 45;
          localBallX = startX + (midX - startX) * progress;
          localBallY = startY + (midY - startY) * progress;
        } else if (currentFrame < 80) {
          const midX = isHomeSequence ? 70 : 30;
          const midY = 35 + (activeMin % 3) * 10;
          const shootX = isHomeSequence ? 88 : 12;
          const shootY = 40 + (activeMin % 2) * 20;
          const progress = (currentFrame - 45) / 35;
          localBallX = midX + (shootX - midX) * progress;
          localBallY = midY + (shootY - midY) * progress;
        } else if (currentFrame < 110) {
          const shootX = isHomeSequence ? 88 : 12;
          const shootY = 40 + (activeMin % 2) * 20;
          const goalX = isHomeSequence ? 98.5 : 1.5;
          const goalY = activeSequenceRef.current === "GOAL" ? 47 + (activeMin % 2) * 6 : 32 + (activeMin % 2) * 36;
          const progress = (currentFrame - 80) / 30;
          localBallX = shootX + (goalX - shootX) * progress;
          localBallY = shootY + (goalY - shootY) * progress;

          if (currentFrame === 109 && activeSequenceRef.current === "GOAL") {
            spawnGoalExplosion(goalX, goalY);
          }
        } else if (currentFrame < 150) {
          if (activeSequenceRef.current === "GOAL") {
            localBallX = isHomeSequence ? 99 : 1;
          } else {
            const bounceTargetX = isHomeSequence ? 90 : 10;
            const bounceTargetY = 50;
            const progress = (currentFrame - 110) / 40;
            localBallX = (isHomeSequence ? 98.5 : 1.5) + (bounceTargetX - (isHomeSequence ? 98.5 : 1.5)) * progress;
            localBallY = (32 + (activeMin % 2) * 36) + (bounceTargetY - (32 + (activeMin % 2) * 36)) * progress;
          }
        } else {
          activeSequenceRef.current = "NONE";
          sequenceFrameRef.current = 0;
        }
      } else {
        const passFrequency = 50;
        const passPhase = Math.floor(Date.now() / (passFrequency * 40)) % 4;
        const isHomePossession = (Math.floor(Date.now() / 8000) % 2) === 0;

        if (isHomePossession) {
          if (passPhase === 0) {
            localBallX = 20 + Math.sin(Date.now() * 0.001) * 2;
            localBallY = 40 + Math.cos(Date.now() * 0.001) * 5;
          } else if (passPhase === 1) {
            localBallX = 40 + Math.cos(Date.now() * 0.0015) * 3;
            localBallY = 30 + Math.sin(Date.now() * 0.0015) * 6;
          } else if (passPhase === 2) {
            localBallX = 35 + Math.sin(Date.now() * 0.002) * 4;
            localBallY = 50 + Math.cos(Date.now() * 0.002) * 3;
          } else {
            localBallX = 60 + Math.cos(Date.now() * 0.001) * 5;
            localBallY = 50 + Math.sin(Date.now() * 0.001) * 10;
          }
        } else {
          if (passPhase === 0) {
            localBallX = 80 + Math.cos(Date.now() * 0.001) * 2;
            localBallY = 60 + Math.sin(Date.now() * 0.001) * 5;
          } else if (passPhase === 1) {
            localBallX = 60 + Math.sin(Date.now() * 0.0015) * 3;
            localBallY = 70 + Math.cos(Date.now() * 0.0015) * 6;
          } else if (passPhase === 2) {
            localBallX = 65 + Math.cos(Date.now() * 0.002) * 4;
            localBallY = 50 + Math.sin(Date.now() * 0.002) * 3;
          } else {
            localBallX = 40 + Math.sin(Date.now() * 0.001) * 5;
            localBallY = 50 + Math.cos(Date.now() * 0.001) * 10;
          }
        }
      }

      particlesRef.current.forEach((part) => {
        part.posX += part.velX;
        part.posY += part.velY;
        part.life -= 0.02;
      });
      particlesRef.current = particlesRef.current.filter((part) => part.life > 0);
    };

    const drawField = (canvasW: number, canvasH: number) => {
      ctx.fillStyle = "#0c1524";
      ctx.fillRect(0, 0, canvasW, canvasH);

      ctx.fillStyle = "rgba(16, 185, 129, 0.03)";
      ctx.fillRect(0, 0, canvasW, canvasH);

      ctx.strokeStyle = "rgba(16, 185, 129, 0.25)";
      ctx.lineWidth = 1.5;

      ctx.strokeRect(10, 10, canvasW - 20, canvasH - 20);

      ctx.beginPath();
      ctx.moveTo(canvasW / 2, 10);
      ctx.lineTo(canvasW / 2, canvasH - 10);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(canvasW / 2, canvasH / 2, canvasH * 0.15, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(canvasW / 2, canvasH / 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(16, 185, 129, 0.5)";
      ctx.fill();

      const boxW = canvasW * 0.15;
      const boxH = canvasH * 0.5;

      ctx.strokeRect(10, (canvasH - boxH) / 2, boxW, boxH);

      ctx.strokeRect(canvasW - 10 - boxW, (canvasH - boxH) / 2, boxW, boxH);

      const goalW = 8;
      const goalH = canvasH * 0.18;
      ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
      ctx.strokeRect(10 - goalW, (canvasH - goalH) / 2, goalW, goalH);
      ctx.strokeRect(canvasW - 10, (canvasH - goalH) / 2, goalW, goalH);
    };

    const drawPlayers = (canvasW: number, canvasH: number) => {
      const {
        isPlaying: activePlaying,
        homeTeam: activeHome,
        awayTeam: activeAway,
        players: activePlayers,
      } = stateRef.current;

      const radius = 9;

      activePlayers.forEach((p) => {
        let pX = (p.baseX / 100) * canvasW;
        let pY = (p.baseY / 100) * canvasH;

        if (activePlaying && activeSequenceRef.current === "NONE") {
          const noiseX = Math.sin(Date.now() * 0.002 + p.id) * 6;
          const noiseY = Math.cos(Date.now() * 0.002 + p.id) * 4;

          const distToBallX = (localBallX / 100) * canvasW - pX;
          const distToBallY = (localBallY / 100) * canvasH - pY;
          const dist = Math.sqrt(distToBallX * distToBallX + distToBallY * distToBallY);

          if (dist < 100) {
            const pull = (100 - dist) / 100;
            pX += distToBallX * pull * 0.25;
            pY += distToBallY * pull * 0.25;
          }

          pX += noiseX;
          pY += noiseY;
        } else if (activePlaying && activeSequenceRef.current !== "NONE") {
          const isHomeSeq = sequenceTeamRef.current;
          const progress = sequenceFrameRef.current / 150;

          if (p.isHome === isHomeSeq && p.label === "FW") {
            const targetX = (p.baseX + 15) / 100 * canvasW;
            pX += (targetX - pX) * Math.min(progress * 1.5, 1.0);
          } else if (p.isHome !== isHomeSeq && p.label === "DF") {
            const targetX = (p.baseX - (isHomeSeq ? 5 : -5)) / 100 * canvasW;
            pX += (targetX - pX) * Math.min(progress * 1.2, 1.0);
          }

          if (p.label === "GK") {
            const targetBallY = (localBallY / 100) * canvasH;
            pY += (targetBallY - pY) * 0.2;
          }
        }

        const teamId = p.isHome ? activeHome.id : activeAway.id;
        const color = getTeamColor(teamId);
        const borderColor = getTeamBorderColor(teamId);

        ctx.beginPath();
        ctx.arc(pX, pY, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pX, pY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 0;
        ctx.stroke();

        ctx.fillStyle = p.isHome ? "#0f172a" : "#ffffff";
        if (color === "#ffffff" || color === "#e2e8f0") {
          ctx.fillStyle = "#1e293b";
        }
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.label, pX, pY);
      });
    };

    const drawBall = (canvasW: number, canvasH: number) => {
      const bX = (localBallX / 100) * canvasW;
      const bY = (localBallY / 100) * canvasH;

      ctx.beginPath();
      ctx.arc(bX, bY, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#fbbf24";
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 12;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(bX, bY, 4.5, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.0;
      ctx.shadowBlur = 0;
      ctx.stroke();
    };

    const drawParticles = (canvasW: number, canvasH: number) => {
      particlesRef.current.forEach((part) => {
        const pX = (part.posX / 100) * canvasW;
        const pY = (part.posY / 100) * canvasH;

        ctx.beginPath();
        ctx.arc(pX, pY, 2.5 * part.life, 0, Math.PI * 2);
        ctx.fillStyle = part.color;
        ctx.globalAlpha = part.life;
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
    };

    const drawHUD = (canvasW: number, _canvasH: number) => {
      const {
        isPlaying: activePlaying,
        currentMinute: activeMin,
        liveHomeScore: activeHomeScore,
        liveAwayScore: activeAwayScore,
        homeTeam: activeHome,
        awayTeam: activeAway,
      } = stateRef.current;

      if (!activePlaying) return;

      const hudW = Math.min(canvasW * 0.52, 300);
      const hudH = 36;
      const hudX = (canvasW - hudW) / 2;
      const hudY = 18;

      ctx.save();
      ctx.fillStyle = "rgba(10, 17, 30, 0.82)";
      ctx.beginPath();
      const radius = 8;
      ctx.moveTo(hudX + radius, hudY);
      ctx.lineTo(hudX + hudW - radius, hudY);
      ctx.quadraticCurveTo(hudX + hudW, hudY, hudX + hudW, hudY + radius);
      ctx.lineTo(hudX + hudW, hudY + hudH - radius);
      ctx.quadraticCurveTo(hudX + hudW, hudY + hudH, hudX + hudW - radius, hudY + hudH);
      ctx.lineTo(hudX + radius, hudY + hudH);
      ctx.quadraticCurveTo(hudX, hudY + hudH, hudX, hudY + hudH - radius);
      ctx.lineTo(hudX, hudY + radius);
      ctx.quadraticCurveTo(hudX, hudY, hudX + radius, hudY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(251, 191, 36, 0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const midX = canvasW / 2;
      const midY = hudY + hudH / 2;

      ctx.font = "bold 14px sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fbbf24";
      ctx.textAlign = "center";
      ctx.fillText(`${activeHomeScore}`, midX - 12, midY);
      ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
      ctx.fillText("-", midX, midY);
      ctx.fillStyle = "#fbbf24";
      ctx.fillText(`${activeAwayScore}`, midX + 12, midY);

      ctx.font = "600 11px sans-serif";
      ctx.fillStyle = "#e2e8f0";
      ctx.textAlign = "right";
      ctx.fillText(activeHome.code || activeHome.name.substring(0, 3).toUpperCase(), midX - 28, midY);
      ctx.textAlign = "left";
      ctx.fillText(activeAway.code || activeAway.name.substring(0, 3).toUpperCase(), midX + 28, midY);

      const minLabel = activeMin > 120 ? "PEN" : activeMin > 90 ? `ET ${activeMin}'` : `${activeMin}'`;
      ctx.font = "600 9px sans-serif";
      ctx.fillStyle = "#10b981";
      ctx.textAlign = "center";
      ctx.fillText(minLabel, midX, hudY + hudH + 12);

      ctx.restore();
    };

    const renderFrame = () => {
      const canvasW = canvas.width;
      const canvasH = canvas.height;

      updateSimulation();
      drawField(canvasW, canvasH);
      drawPlayers(canvasW, canvasH);
      drawBall(canvasW, canvasH);
      drawParticles(canvasW, canvasH);
      drawHUD(canvasW, canvasH);

      requestRef.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", overflow: "hidden", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(10, 17, 30, 0.4)", backdropFilter: "blur(12px)", boxSizing: "border-box", padding: "0.5rem" }}>
      <canvas
        ref={canvasRef}
        width={600}
        height={360}
        style={{
          width: "100%",
          height: "auto",
          aspectRatio: "5/3",
          borderRadius: "8px",
          display: "block",
        }}
      />
    </div>
  );
};
