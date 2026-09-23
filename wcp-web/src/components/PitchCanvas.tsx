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

// Side-aware kit colors (no per-team data available from the API yet)
const HOME_COLOR = "#38bdf8";
const AWAY_COLOR = "#f43f5e";
const KIT_BORDER = "#ffffff";

const movePlayerTowards = (p: PlayerNode, tx: number, ty: number, speed: number) => {
  const dx = tx - p.posX;
  const dy = ty - p.posY;
  const dist = Math.hypot(dx, dy);
  if (dist <= speed) {
    p.posX = tx;
    p.posY = ty;
  } else {
    p.posX += (dx / dist) * speed;
    p.posY += (dy / dist) * speed;
  }
};

const INITIAL_PLAYERS: PlayerNode[] = [
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

  const [players] = useState<PlayerNode[]>(INITIAL_PLAYERS);

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
    particlesRef.current = [];
  }, [homeTeam, awayTeam]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let ballX = 50;
    let ballY = 50;
    let ballState: "HELD" | "PASSING" | "SHOOTING" | "SAVED" | "GOAL_CELEBRATION" = "HELD";

    let ballHolderId = 7;
    let passTargetId = 7;
    let passProgress = 0;
    let passSpeed = 0.04;
    let passStartX = 50;
    let passStartY = 50;

    let shootTargetX = 50;
    let shootTargetY = 50;
    let shootProgress = 0;
    let goalScored = false;
    let saveMade = false;

    let activeEventMin = -1;
    let activeEventType: "NONE" | "GOAL" | "MISS" = "NONE";
    let activeEventTeam: "HOME" | "AWAY" = "HOME";
    let buildupState: "MIDFIELD" | "ATTACK" | "SHOOT" | "DONE" = "MIDFIELD";
    let delayTimer = 0;
    let scorerId = -1;
    let shootSpeed = 0.05;

    const startPass = (targetId: number, startX: number, startY: number) => {
      ballState = "PASSING";
      passStartX = startX;
      passStartY = startY;
      passTargetId = targetId;
      passProgress = 0;

      const activePlayers = stateRef.current.players;
      const targetPlayer = activePlayers.find((p) => p.id === targetId);
      if (targetPlayer) {
        const dx = targetPlayer.posX - startX;
        const dy = targetPlayer.posY - startY;
        const dist = Math.hypot(dx, dy);
        const frames = Math.min(45, Math.max(12, dist / 1.4));
        passSpeed = 1 / frames;
      } else {
        passSpeed = 0.04;
      }
    };

    const spawnGoalExplosion = (targetX: number, targetY: number) => {
      const pColor = targetX > 50 ? HOME_COLOR : AWAY_COLOR;
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
        players: activePlayers,
      } = stateRef.current;

      if (!activePlaying) {
        ballX = 50;
        ballY = 50;
        ballState = "HELD";
        ballHolderId = 7;
        passTargetId = 7;
        buildupState = "MIDFIELD";
        activeEventType = "NONE";
        activeEventMin = -1;
        delayTimer = 0;
        particlesRef.current = [];
        return;
      }

      particlesRef.current.forEach((part) => {
        part.posX += part.velX;
        part.posY += part.velY;
        part.life -= 0.025;
      });
      particlesRef.current = particlesRef.current.filter((part) => part.life > 0);

      if (activeMin !== activeEventMin) {
        const matchingEvent = activeEvents.find((evt) => evt.minute === activeMin);
        if (matchingEvent && (matchingEvent.type === "GOAL" || matchingEvent.type === "MISS")) {
          activeEventMin = activeMin;
          activeEventType = matchingEvent.type as "GOAL" | "MISS";
          activeEventTeam = matchingEvent.teamId === activeHome.id ? "HOME" : "AWAY";
          buildupState = "MIDFIELD";

          const attackingMFs = activePlayers.filter(
            (p) => p.isHome === (activeEventTeam === "HOME") && p.label === "MF"
          );
          if (attackingMFs.length > 0) {
            const receiver = attackingMFs[Math.floor(Math.random() * attackingMFs.length)];
            startPass(receiver.id, ballX, ballY);
          }
        }
      }

      activePlayers.forEach((p) => {
        let targetX = p.baseX;
        let targetY = p.baseY;

        if (p.label === "GK") {
          targetY = ballY;
          if (targetY < 42) targetY = 42;
          if (targetY > 58) targetY = 58;
        } else {
          const dx = ballX - p.baseX;
          const dy = ballY - p.baseY;
          targetX += dx * 0.15;
          targetY += dy * 0.1;

          if (p.isHome) {
            if (targetX > 85) targetX = 85;
            if (targetX < 5) targetX = 5;
          } else {
            if (targetX < 15) targetX = 15;
            if (targetX > 95) targetX = 95;
          }
        }

        if (ballState === "HELD" && p.id === ballHolderId) {
          const goalDirection = p.isHome ? 1 : -1;
          targetX += goalDirection * 4;
        }

        p.posX += (targetX - p.posX) * 0.08;
        p.posY += (targetY - p.posY) * 0.08;
      });

      const holder = activePlayers.find((p) => p.id === ballHolderId);
      const targetPasser = activePlayers.find((p) => p.id === passTargetId);

      if (ballState === "HELD" && holder) {
        ballX = holder.posX;
        ballY = holder.posY;

        if (activeEventType !== "NONE") {
          if (buildupState === "MIDFIELD") {
            const teamFWs = activePlayers.filter(
              (p) => p.isHome === (activeEventTeam === "HOME") && p.label === "FW"
            );
            if (teamFWs.length > 0) {
              const receiver = teamFWs[Math.floor(Math.random() * teamFWs.length)];
              startPass(receiver.id, ballX, ballY);
              buildupState = "ATTACK";
            }
          } else if (buildupState === "ATTACK") {
            ballState = "SHOOTING";
            shootProgress = 0;
            scorerId = ballHolderId;

            const isHomeAttacking = activeEventTeam === "HOME";
            shootTargetX = isHomeAttacking ? 98.5 : 1.5;

            if (activeEventType === "GOAL") {
              shootTargetY = 44 + Math.random() * 12;
              goalScored = true;
              saveMade = false;
            } else {
              if (Math.random() < 0.5) {
                shootTargetY = 46 + Math.random() * 8;
                saveMade = true;
                goalScored = false;
              } else {
                shootTargetY = Math.random() < 0.5 ? 32 + Math.random() * 6 : 62 + Math.random() * 6;
                goalScored = false;
                saveMade = false;
              }
            }

            const dx = shootTargetX - holder.posX;
            const dy = shootTargetY - holder.posY;
            const dist = Math.hypot(dx, dy);
            const frames = Math.min(30, Math.max(10, dist / 2.2));
            shootSpeed = 1 / frames;

            buildupState = "SHOOT";
          }
        } else {
          delayTimer++;
          if (delayTimer > 90) {
            delayTimer = 0;
            const isIntercepted = Math.random() < 0.25;

            if (isIntercepted) {
              const opponents = activePlayers.filter((p) => p.isHome !== holder.isHome);
              let closestOpponent = opponents[0];
              let minDist = 99999;
              opponents.forEach((opp) => {
                const dx = opp.posX - ballX;
                const dy = opp.posY - ballY;
                const dist = dx * dx + dy * dy;
                if (dist < minDist) {
                  minDist = dist;
                  closestOpponent = opp;
                }
              });

              startPass(closestOpponent.id, ballX, ballY);
            } else {
              const teammates = activePlayers.filter((p) => p.isHome === holder.isHome && p.id !== holder.id);
              if (teammates.length > 0) {
                const receiver = teammates[Math.floor(Math.random() * teammates.length)];
                startPass(receiver.id, ballX, ballY);
              }
            }
          }
        }
      } else if (ballState === "PASSING" && targetPasser) {
        passProgress += passSpeed;
        if (passProgress >= 1) {
          passProgress = 1;
          ballState = "HELD";
          ballHolderId = passTargetId;
          delayTimer = 0;
        }
        ballX = passStartX + (targetPasser.posX - passStartX) * passProgress;
        ballY = passStartY + (targetPasser.posY - passStartY) * passProgress;
      } else if (ballState === "SHOOTING") {
        shootProgress += shootSpeed;

        const defendingGK = activePlayers.find(
          (p) => p.label === "GK" && p.isHome !== (activeEventTeam === "HOME")
        );
        if (defendingGK) {
          if (saveMade) {
            defendingGK.posY += (shootTargetY - defendingGK.posY) * 0.15;
          } else {
            const diveOffset = goalScored ? (shootTargetY > 50 ? -6 : 6) : 0;
            defendingGK.posY += (shootTargetY + diveOffset - defendingGK.posY) * 0.08;
          }
        }

        if (shootProgress >= 1) {
          shootProgress = 1;
          if (goalScored) {
            ballState = "GOAL_CELEBRATION";
            spawnGoalExplosion(shootTargetX, shootTargetY);
            delayTimer = 0;
          } else if (saveMade) {
            ballState = "SAVED";
            delayTimer = 0;
          } else {
            activeEventType = "NONE";
            const defenders = activePlayers.filter(
              (p) => p.isHome !== (activeEventTeam === "HOME") && p.label === "DF"
            );
            if (defenders.length > 0) {
              const receiver = defenders[Math.floor(Math.random() * defenders.length)];
              startPass(receiver.id, ballX, ballY);
            }
          }
        }

        ballX = holder!.posX + (shootTargetX - holder!.posX) * shootProgress;
        ballY = holder!.posY + (shootTargetY - holder!.posY) * shootProgress;
      } else if (ballState === "SAVED") {
        delayTimer++;
        const goalDirection = activeEventTeam === "HOME" ? 1 : -1;
        ballX = (activeEventTeam === "HOME" ? 95 : 5) - goalDirection * 5;
        ballY += Math.sin(delayTimer * 0.1) * 1.5;

        if (delayTimer > 45) {
          activeEventType = "NONE";
          const defenders = activePlayers.filter(
            (p) => p.isHome !== (activeEventTeam === "HOME") && p.label === "DF"
          );
          if (defenders.length > 0) {
            const receiver = defenders[Math.floor(Math.random() * defenders.length)];
            startPass(receiver.id, ballX, ballY);
          }
        }
      } else if (ballState === "GOAL_CELEBRATION") {
        delayTimer++;
        ballX = activeEventTeam === "HOME" ? 99 : 1;
        ballY = shootTargetY + Math.sin(delayTimer * 0.5) * 1.5;

        activePlayers.forEach((p) => {
          if (p.isHome === (activeEventTeam === "HOME")) {
            if (p.id === scorerId || p.label === "FW" || p.label === "MF") {
              const baseCelebrateX = activeEventTeam === "HOME" ? 90 : 10;
              const baseCelebrateY = 15;
              const offsetX = ((p.id * 7) % 13) - 6;
              const offsetY = ((p.id * 11) % 11) - 5;
              const targetX = baseCelebrateX + offsetX;
              const targetY = baseCelebrateY + offsetY;
              movePlayerTowards(p, targetX, targetY, 0.4);
            } else if (p.label === "DF") {
              const goalDirection = activeEventTeam === "HOME" ? 1 : -1;
              const targetX = p.baseX + goalDirection * 8;
              const targetY = p.baseY;
              movePlayerTowards(p, targetX, targetY, 0.15);
            } else if (p.label === "GK") {
              const targetX = p.baseX;
              const targetY = p.baseY + Math.sin(delayTimer * 0.1) * 2;
              movePlayerTowards(p, targetX, targetY, 0.08);
            }
          } else {
            movePlayerTowards(p, p.baseX, p.baseY, 0.1);
          }
        });

        if (delayTimer > 120) {
          activeEventType = "NONE";
          ballX = 50;
          ballY = 50;
          const defenders = activePlayers.filter(
            (p) => p.isHome !== (activeEventTeam === "HOME") && p.label === "MF"
          );
          if (defenders.length > 0) {
            const receiver = defenders[Math.floor(Math.random() * defenders.length)];
            startPass(receiver.id, 50, 50);
          }
        }
      }
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
      const { players: activePlayers } = stateRef.current;

      const radius = 9;

      activePlayers.forEach((p) => {
        const color = p.isHome ? HOME_COLOR : AWAY_COLOR;
        const borderColor = KIT_BORDER;

        const pX = (p.posX / 100) * canvasW;
        const pY = (p.posY / 100) * canvasH;

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
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.label, pX, pY);
      });
    };

    const drawBall = (canvasW: number, canvasH: number) => {
      const bX = (ballX / 100) * canvasW;
      const bY = (ballY / 100) * canvasH;

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

    const drawHUD = (canvasW: number) => {
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
      drawHUD(canvasW);

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
