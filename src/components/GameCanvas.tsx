import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Play,
  Maximize2,
  Settings,
  Sword,
  Map,
  Target,
  Star,
  Zap,
  X,
} from "lucide-react";
import { useGameState } from "@/hooks/useGameState";
import { SAMPLE_ENEMIES } from "@/services/gameService";
import { Enemy } from "@/types/game";

interface GameCanvasProps {
  isConnected: boolean;
}

interface GameArea {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "combat" | "exploration" | "gathering" | "safe";
  enemies?: string[];
  rewards?: { experience: number; items?: string[] };
  isUnlocked: boolean;
}

interface ActiveGame {
  type: string;
  name: string;
  isActive: boolean;
}

interface GameObject {
  id: number;
  type: string;
  x: number;
  y: number;
  size: number;
  color: string;
  characterType?: string; // Added for humanoid characters
  name?: string; // Added for combat enemies
  maxHealth?: number; // Added for combat enemies
  attack?: number; // Added for combat enemies
  defense?: number; // Added for combat enemies
  experienceReward?: number; // Added for combat enemies
  health?: number;
  damage?: number;
  value?: number;
  destination?: string;
  rarity?: string;
  resource?: string;
  power?: number;
  effect?: string;
  magic?: number;
  piece?: number;
  number?: number;
  speed?: number;
  final?: boolean;
}

const GameCanvas = ({ isConnected }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState, gainExperience, addItem, updateGameState } =
    useGameState();
  const [isInCombat, setIsInCombat] = useState(false);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [currentEnemy, setCurrentEnemy] = useState<GameObject | null>(null);
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(null);
  const [gameObjects, setGameObjects] = useState<GameObject[]>([]);
  const [combatResult, setCombatResult] = useState<{
    result: string;
    message: string;
    restart?: boolean;
  } | null>(null);
  const [currentMission, setCurrentMission] = useState<string | null>(null);
  const [playerPosition, setPlayerPosition] = useState({ x: 0.2, y: 0.4 });
  const [isMoving, setIsMoving] = useState(false);
  const [enemyMovement, setEnemyMovement] = useState<{
    [key: number]: {
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      speed: number;
    };
  }>({});
  // Add state for save progress UI
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<null | {
    success: boolean;
    message: string;
  }>(null);
  const [completedMissionsThisSession, setCompletedMissionsThisSession] =
    useState<string[]>([]);

  // Helper: Get next mission in chain
  const getNextMissionId = (currentId: string | null) => {
    if (!currentId) return null;
    const missionOrder = ["tutorial-1", "combat-1", "combat-2", "combat-3"];
    const idx = missionOrder.indexOf(currentId);
    if (idx >= 0 && idx < missionOrder.length - 1) {
      return missionOrder[idx + 1];
    }
    return null;
  };

  // Enhanced combat randomness and challenge
  const getEnemyStatsForMission = (missionId: string | null) => {
    // Harder scaling for each mission, with increased health
    switch (missionId) {
      case "combat-3":
        return { health: 140, attack: 28, defense: 14, speed: 18, crit: 0.25 };
      case "combat-2":
        return { health: 100, attack: 18, defense: 10, speed: 14, crit: 0.18 };
      case "combat-1":
        return { health: 60, attack: 12, defense: 6, speed: 10, crit: 0.12 };
      default:
        return { health: 40, attack: 7, defense: 3, speed: 7, crit: 0.08 };
    }
  };

  // Listen for game launch events
  useEffect(() => {
    const handleGameLaunch = (event: CustomEvent) => {
      const { type, name } = event.detail;
      setActiveGame({ type, name, isActive: true });
      setGameObjects([]); // Reset game objects

      // Determine and start the first available mission for this activity
      let missionId: string | null = null;
      if (type === "combat") {
        // Find the first available combat mission
        const missionOrder = ["combat-1", "combat-2", "combat-3"];
        missionId =
          missionOrder.find(
            (id) =>
              !gameState?.character.completedMissions.includes(id) &&
              !gameState?.character.activeMissions.some((m) => m.id === id)
          ) || null;
        // If all combat missions are done, fallback to last
        if (
          !missionId &&
          gameState?.character.completedMissions.includes("combat-3")
        ) {
          missionId = "combat-3";
        }
      } else if (type === "exploration") {
        missionId = "tutorial-1";
      }
      // Start the mission automatically if not already active
      if (
        missionId &&
        !gameState?.character.activeMissions.some((m) => m.id === missionId)
      ) {
        window.dispatchEvent(
          new CustomEvent("startMission", {
            detail: { missionId },
          })
        );
      }
      setCurrentMission(missionId);

      // Initialize game-specific objects
      switch (type) {
        case "combat":
          initializeCombatGame();
          break;
        case "exploration":
          initializeExplorationGame();
          break;
        case "gathering":
          initializeGatheringGame();
          break;
        case "magic":
          initializeMagicGame();
          break;
        case "puzzle":
          initializePuzzleGame();
          break;
        case "racing":
          initializeRacingGame();
          break;
      }
    };

    window.addEventListener("launchGame", handleGameLaunch as EventListener);
    return () =>
      window.removeEventListener(
        "launchGame",
        handleGameLaunch as EventListener
      );
  }, [gameState]);

  const initializeCombatGame = () => {
    // Get current player level and determine difficulty
    const playerLevel = gameState?.character.stats.level || 1;

    // Reset player position for new combat
    setPlayerPosition({ x: 0.2, y: 0.4 });

    // Determine number of enemies based on level
    let enemyCount = 1; // Level 1: 1 enemy
    if (playerLevel >= 2) enemyCount = 2; // Level 2: 2 enemies
    if (playerLevel >= 3) enemyCount = 3; // Level 3: 3 enemies

    // Create enemies based on difficulty
    const enemies = [];
    for (let i = 0; i < enemyCount; i++) {
      const enemyType =
        playerLevel >= 3
          ? "elite-shadow"
          : playerLevel >= 2
          ? "shadow-creature"
          : "shadow-creature";

      // Spread enemies in different positions around the arena
      const angle = (i / enemyCount) * Math.PI * 2;
      const distance = 0.3 + i * 0.1;
      const enemyX = 0.5 + Math.cos(angle) * distance;
      const enemyY = 0.5 + Math.sin(angle) * distance;

      const stats = getEnemyStatsForMission(currentMission);

      enemies.push({
        id: i + 1,
        type: "enemy",
        x: Math.max(0.1, Math.min(0.9, enemyX)),
        y: Math.max(0.1, Math.min(0.9, enemyY)),
        size: 50 + i * 5, // Slightly larger for higher level enemies
        color: "#dc2626",
        health: stats.health,
        maxHealth: stats.health,
        attack: stats.attack,
        defense: stats.defense,
        characterType: "enemy",
        name:
          playerLevel >= 3
            ? "Elite Shadow"
            : playerLevel >= 2
            ? "Shadow Creature"
            : "Shadow Creature",
        experienceReward: playerLevel >= 3 ? 60 : playerLevel >= 2 ? 40 : 25,
      });

      // Initialize enemy movement
      setEnemyMovement((prev) => ({
        ...prev,
        [i + 1]: {
          x: Math.max(0.1, Math.min(0.9, enemyX)),
          y: Math.max(0.1, Math.min(0.9, enemyY)),
          targetX: Math.max(
            0.1,
            Math.min(0.9, enemyX + (Math.random() - 0.5) * 0.2)
          ),
          targetY: Math.max(
            0.1,
            Math.min(0.9, enemyY + (Math.random() - 0.5) * 0.2)
          ),
          speed: 0.005 + Math.random() * 0.01,
        },
      }));
    }

    // Add player character with current position
    const gameObjects = [
      ...enemies,
      {
        id: 999, // High ID to avoid conflicts
        type: "player",
        x: playerPosition.x,
        y: playerPosition.y,
        size: 50,
        color: "#2563eb",
        characterType: "player",
        name: "You",
      },
    ];

    setGameObjects(gameObjects);

    // Start combat mode
    setIsInCombat(true);
    setCombatLog([
      `Combat initiated! Level ${playerLevel} challenge with ${enemyCount} enemy${
        enemyCount > 1 ? "s" : ""
      }!`,
      "Enemies are moving dynamically - use Arrow Keys/WASD to move, Enter to attack!",
    ]);
  };

  const initializeExplorationGame = () => {
    setPlayerPosition({ x: 0.8, y: 0.3 });
    setGameObjects([
      {
        id: 1,
        type: "npc",
        x: 0.2,
        y: 0.2,
        size: 55,
        color: "#f59e0b",
        value: 100,
        characterType: "npc",
      },
      {
        id: 2,
        type: "player",
        x: playerPosition.x,
        y: playerPosition.y,
        size: 50,
        color: "#8b5cf6",
        destination: "new-area",
        characterType: "player",
      },
      {
        id: 3,
        type: "npc",
        x: 0.5,
        y: 0.7,
        size: 45,
        color: "#ec4899",
        rarity: "rare",
        characterType: "npc",
      },
    ]);
  };

  const initializeGatheringGame = () => {
    setPlayerPosition({ x: 0.7, y: 0.6 });
    setGameObjects([
      {
        id: 1,
        type: "npc",
        x: 0.3,
        y: 0.4,
        size: 50,
        color: "#06b6d4",
        resource: "mana",
        characterType: "npc",
      },
      {
        id: 2,
        type: "player",
        x: playerPosition.x,
        y: playerPosition.y,
        size: 45,
        color: "#22c55e",
        resource: "health",
        characterType: "player",
      },
      {
        id: 3,
        type: "npc",
        x: 0.5,
        y: 0.2,
        size: 55,
        color: "#f97316",
        resource: "metal",
        characterType: "npc",
      },
    ]);
  };

  const initializeMagicGame = () => {
    setPlayerPosition({ x: 0.6, y: 0.7 });
    setGameObjects([
      {
        id: 1,
        type: "mage",
        x: 0.4,
        y: 0.3,
        size: 60,
        color: "#a855f7",
        power: 50,
        characterType: "mage",
      },
      {
        id: 2,
        type: "player",
        x: playerPosition.x,
        y: playerPosition.y,
        size: 50,
        color: "#eab308",
        effect: "fire",
        characterType: "player",
      },
      {
        id: 3,
        type: "mage",
        x: 0.2,
        y: 0.8,
        size: 55,
        color: "#f43f5e",
        magic: 75,
        characterType: "mage",
      },
    ]);
  };

  const initializePuzzleGame = () => {
    setGameObjects([
      {
        id: 1,
        type: "npc",
        x: 0.2,
        y: 0.3,
        size: 50,
        color: "#fbbf24",
        piece: 1,
        characterType: "npc",
      },
      {
        id: 2,
        type: "player",
        x: 0.8,
        y: 0.4,
        size: 45,
        color: "#fbbf24",
        piece: 2,
        characterType: "player",
      },
      {
        id: 3,
        type: "npc",
        x: 0.5,
        y: 0.8,
        size: 50,
        color: "#fbbf24",
        piece: 3,
        characterType: "npc",
      },
    ]);
  };

  const initializeRacingGame = () => {
    setGameObjects([
      {
        id: 1,
        type: "player",
        x: 0.3,
        y: 0.2,
        size: 55,
        color: "#10b981",
        number: 1,
        characterType: "player",
      },
      {
        id: 2,
        type: "player",
        x: 0.7,
        y: 0.5,
        size: 50,
        color: "#f59e0b",
        speed: 2,
        characterType: "player",
      },
      {
        id: 3,
        type: "npc",
        x: 0.5,
        y: 0.8,
        size: 60,
        color: "#ef4444",
        final: true,
        characterType: "npc",
      },
    ]);
  };

  const closeActiveGame = () => {
    setActiveGame(null);
    setGameObjects([]);
  };

  useEffect(() => {
    if (!canvasRef.current || !isConnected) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Simple animated background
    let animationId: number;
    let time = 0;

    const animate = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      // Clear canvas
      ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
      ctx.fillRect(0, 0, width, height);

      // Draw animated grid
      ctx.strokeStyle = "rgba(56, 189, 248, 0.3)";
      ctx.lineWidth = 1;

      const gridSize = 50;
      const offsetX = (time * 0.5) % gridSize;
      const offsetY = (time * 0.3) % gridSize;

      for (let x = -gridSize + offsetX; x < width + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = -gridSize + offsetY; y < height + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw 3D game objects when a game is active
      if (activeGame && gameObjects.length > 0) {
        gameObjects.forEach((obj) => {
          const objX = obj.x * width;
          const objY = obj.y * height;
          const objSize = obj.size;

          // Draw humanoid character instead of cube
          if (obj.characterType) {
            drawHumanoid(
              ctx,
              objX,
              objY,
              objSize,
              obj.characterType,
              time,
              obj.id
            );
          } else {
            // Fallback to original cube rendering
            const shadowOffset = 4;
            const highlightOffset = 2;

            // Shadow
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(
              objX + shadowOffset,
              objY + shadowOffset,
              objSize,
              objSize
            );

            // Main object with gradient
            const gradient = ctx.createLinearGradient(
              objX,
              objY,
              objX + objSize,
              objY + objSize
            );
            gradient.addColorStop(0, obj.color);
            gradient.addColorStop(0.5, obj.color + "80");
            gradient.addColorStop(1, obj.color + "40");

            ctx.fillStyle = gradient;
            ctx.fillRect(objX, objY, objSize, objSize);

            // Highlight
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            ctx.fillRect(
              objX + highlightOffset,
              objY + highlightOffset,
              objSize / 2,
              objSize / 2
            );

            // Border
            ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
            ctx.lineWidth = 2;
            ctx.strokeRect(objX, objY, objSize, objSize);

            // Object label
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.font = "bold 12px Arial";
            ctx.textAlign = "center";
            ctx.fillText(obj.type, objX + objSize / 2, objY + objSize + 15);
          }
        });
      }

      // Draw floating orbs (only when no game is active)
      if (!activeGame) {
        for (let i = 0; i < 5; i++) {
          const x = width * 0.2 + Math.sin(time * 0.01 + i) * width * 0.3;
          const y =
            height * 0.3 + Math.cos(time * 0.008 + i * 2) * height * 0.2;
          const radius = 20 + Math.sin(time * 0.02 + i) * 10;

          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
          gradient.addColorStop(0, `hsla(${180 + i * 60}, 70%, 60%, 0.8)`);
          gradient.addColorStop(1, `hsla(${180 + i * 60}, 70%, 60%, 0)`);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      time += 1;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isConnected, activeGame, gameObjects]);

  // Enhanced character drawing with realistic proportions and animations
  const drawHumanoid = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    type: string,
    time: number,
    objId: number
  ) => {
    const centerX = x + size / 2;
    const centerY = y + size / 2;

    // More realistic proportions
    const headSize = size * 0.22;
    const bodyWidth = size * 0.32;
    const bodyHeight = size * 0.42;
    const armLength = size * 0.38;
    const legLength = size * 0.45;
    const shoulderWidth = size * 0.4;

    // Enhanced animations with easing
    const walkOffset = Math.sin(time * 0.12) * 5;
    const armSwing = Math.sin(time * 0.18) * 12;
    const breathing = Math.sin(time * 0.06) * 4;
    const idleBob = Math.sin(time * 0.09) * 3;
    const headBob = Math.sin(time * 0.07) * 2;

    // Enhanced movement animation for keyboard controls
    const movementMultiplier = isMoving ? 2 : 1;
    const enhancedWalkOffset = walkOffset * movementMultiplier;
    const enhancedArmSwing = armSwing * movementMultiplier;

    // Attack animation state
    const isAttacking =
      type === "player" &&
      currentEnemy &&
      Math.abs(x - (currentEnemy.x || 0)) < 0.1;
    const attackSwing = isAttacking ? Math.sin(time * 0.3) * 15 : 0;

    // Enhanced color schemes with realistic shading
    let primaryColor,
      secondaryColor,
      accentColor,
      highlightColor,
      shadowColor,
      armorColor;
    switch (type) {
      case "enemy":
        primaryColor = "#dc2626";
        secondaryColor = "#991b1b";
        accentColor = "#fca5a5";
        highlightColor = "#fecaca";
        shadowColor = "#7f1d1d";
        armorColor = "#450a0a";
        break;
      case "player":
        primaryColor = "#2563eb";
        secondaryColor = "#1e40af";
        accentColor = "#93c5fd";
        highlightColor = "#dbeafe";
        shadowColor = "#1e3a8a";
        armorColor = "#1e3a8a";
        break;
      case "npc":
        primaryColor = "#059669";
        secondaryColor = "#047857";
        accentColor = "#6ee7b7";
        highlightColor = "#d1fae5";
        shadowColor = "#065f46";
        armorColor = "#064e3b";
        break;
      case "mage":
        primaryColor = "#7c3aed";
        secondaryColor = "#5b21b6";
        accentColor = "#c4b5fd";
        highlightColor = "#ede9fe";
        shadowColor = "#4c1d95";
        armorColor = "#581c87";
        break;
      default:
        primaryColor = "#6b7280";
        secondaryColor = "#4b5563";
        accentColor = "#d1d5db";
        highlightColor = "#f3f4f6";
        shadowColor = "#374151";
        armorColor = "#374151";
    }

    // Enhanced shadow with realistic blur and offset
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.ellipse(
      centerX + 4,
      centerY + size / 2 + 10,
      size / 2.2,
      size / 6,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw legs with realistic proportions and movement
    const leftLegX = centerX - bodyWidth / 2 - 4 + enhancedWalkOffset;
    const rightLegX = centerX + bodyWidth / 2 - 6 - enhancedWalkOffset;

    // Left leg
    const leftLegGradient = ctx.createLinearGradient(
      leftLegX,
      centerY + bodyHeight / 2,
      leftLegX + 10,
      centerY + bodyHeight / 2 + legLength
    );
    leftLegGradient.addColorStop(0, highlightColor);
    leftLegGradient.addColorStop(0.3, primaryColor);
    leftLegGradient.addColorStop(0.7, secondaryColor);
    leftLegGradient.addColorStop(1, shadowColor);

    ctx.fillStyle = leftLegGradient;
    ctx.fillRect(leftLegX, centerY + bodyHeight / 2, 10, legLength);

    // Right leg
    const rightLegGradient = ctx.createLinearGradient(
      rightLegX,
      centerY + bodyHeight / 2,
      rightLegX + 10,
      centerY + bodyHeight / 2 + legLength
    );
    rightLegGradient.addColorStop(0, highlightColor);
    rightLegGradient.addColorStop(0.3, primaryColor);
    rightLegGradient.addColorStop(0.7, secondaryColor);
    rightLegGradient.addColorStop(1, shadowColor);

    ctx.fillStyle = rightLegGradient;
    ctx.fillRect(rightLegX, centerY + bodyHeight / 2, 10, legLength);

    // Draw body with enhanced 3D effect and armor
    const bodyGradient = ctx.createLinearGradient(
      centerX - bodyWidth / 2,
      centerY - bodyHeight / 2 + breathing,
      centerX + bodyWidth / 2,
      centerY + bodyHeight / 2 + breathing
    );
    bodyGradient.addColorStop(0, highlightColor);
    bodyGradient.addColorStop(0.2, primaryColor);
    bodyGradient.addColorStop(0.5, secondaryColor);
    bodyGradient.addColorStop(0.8, shadowColor);
    bodyGradient.addColorStop(1, armorColor);

    ctx.fillStyle = bodyGradient;
    ctx.fillRect(
      centerX - bodyWidth / 2,
      centerY - bodyHeight / 2 + breathing + idleBob,
      bodyWidth,
      bodyHeight
    );

    // Draw shoulders/arms with enhanced animation
    const leftArmX = centerX - bodyWidth / 2 - 12;
    const rightArmX = centerX + bodyWidth / 2 + 2;
    const armY = centerY - bodyHeight / 2 + 15;

    // Left arm with attack animation
    const leftArmGradient = ctx.createLinearGradient(
      leftArmX,
      armY + enhancedArmSwing,
      leftArmX + 8,
      armY + enhancedArmSwing + armLength
    );
    leftArmGradient.addColorStop(0, highlightColor);
    leftArmGradient.addColorStop(0.4, primaryColor);
    leftArmGradient.addColorStop(0.8, secondaryColor);
    leftArmGradient.addColorStop(1, shadowColor);

    ctx.fillStyle = leftArmGradient;
    ctx.fillRect(
      leftArmX,
      armY + enhancedArmSwing + idleBob + (isAttacking ? attackSwing : 0),
      8,
      armLength
    );

    // Right arm (weapon arm)
    const rightArmGradient = ctx.createLinearGradient(
      rightArmX,
      armY - enhancedArmSwing,
      rightArmX + 8,
      armY - enhancedArmSwing + armLength
    );
    rightArmGradient.addColorStop(0, highlightColor);
    rightArmGradient.addColorStop(0.4, primaryColor);
    rightArmGradient.addColorStop(0.8, secondaryColor);
    rightArmGradient.addColorStop(1, shadowColor);

    ctx.fillStyle = rightArmGradient;
    ctx.fillRect(
      rightArmX,
      armY - enhancedArmSwing + idleBob + (isAttacking ? -attackSwing : 0),
      8,
      armLength
    );

    // Draw head with enhanced features
    const headGradient = ctx.createRadialGradient(
      centerX - 4,
      centerY -
        bodyHeight / 2 -
        headSize / 2 +
        breathing +
        idleBob +
        headBob -
        4,
      0,
      centerX,
      centerY - bodyHeight / 2 - headSize / 2 + breathing + idleBob + headBob,
      headSize
    );
    headGradient.addColorStop(0, highlightColor);
    headGradient.addColorStop(0.4, accentColor);
    headGradient.addColorStop(0.7, primaryColor);
    headGradient.addColorStop(1, secondaryColor);

    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY - bodyHeight / 2 - headSize / 2 + breathing + idleBob + headBob,
      headSize,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Enhanced facial features
    // Eyes with depth
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(
      centerX - 5,
      centerY -
        bodyHeight / 2 -
        headSize / 2 +
        breathing +
        idleBob +
        headBob -
        4,
      3,
      0,
      Math.PI * 2
    );
    ctx.arc(
      centerX + 5,
      centerY -
        bodyHeight / 2 -
        headSize / 2 +
        breathing +
        idleBob +
        headBob -
        4,
      3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Eye highlights
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(
      centerX - 6,
      centerY -
        bodyHeight / 2 -
        headSize / 2 +
        breathing +
        idleBob +
        headBob -
        5,
      1.5,
      0,
      Math.PI * 2
    );
    ctx.arc(
      centerX + 4,
      centerY -
        bodyHeight / 2 -
        headSize / 2 +
        breathing +
        idleBob +
        headBob -
        5,
      1.5,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Mouth
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY -
        bodyHeight / 2 -
        headSize / 2 +
        breathing +
        idleBob +
        headBob +
        3,
      2,
      0,
      Math.PI
    );
    ctx.stroke();

    // Enhanced weapons with realistic detail
    if (type === "enemy") {
      // Enhanced sword with metallic effect and glow
      const swordGradient = ctx.createLinearGradient(
        centerX + bodyWidth / 2 + 8,
        centerY - 15,
        centerX + bodyWidth / 2 + 25,
        centerY - 15
      );
      swordGradient.addColorStop(0, "#fbbf24");
      swordGradient.addColorStop(0.2, "#f59e0b");
      swordGradient.addColorStop(0.5, "#d97706");
      swordGradient.addColorStop(0.8, "#92400e");
      swordGradient.addColorStop(1, "#78350f");

      ctx.fillStyle = swordGradient;
      ctx.fillRect(centerX + bodyWidth / 2 + 8, centerY - 15, 17, 8);
      ctx.fillRect(centerX + bodyWidth / 2 + 22, centerY - 18, 5, 14);

      // Sword handle with grip
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(centerX + bodyWidth / 2 + 6, centerY - 12, 5, 10);

      // Sword glow effect
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "rgba(251, 191, 36, 0.3)";
      ctx.fillRect(centerX + bodyWidth / 2 + 8, centerY - 15, 17, 8);
      ctx.shadowBlur = 0;
    } else if (type === "mage") {
      // Enhanced staff with magical glow
      const staffGradient = ctx.createLinearGradient(
        centerX - bodyWidth / 2 - 18,
        centerY - 20,
        centerX - bodyWidth / 2 - 18,
        centerY - 40
      );
      staffGradient.addColorStop(0, "#8b5cf6");
      staffGradient.addColorStop(0.3, "#a855f7");
      staffGradient.addColorStop(0.7, "#7c3aed");
      staffGradient.addColorStop(1, "#5b21b6");

      ctx.fillStyle = staffGradient;
      ctx.fillRect(centerX - bodyWidth / 2 - 18, centerY - 20, 5, 25);

      // Magical orb with pulsing effect
      const orbPulse = Math.sin(time * 0.2) * 0.3 + 1;
      const orbGradient = ctx.createRadialGradient(
        centerX - bodyWidth / 2 - 18,
        centerY - 30,
        0,
        centerX - bodyWidth / 2 - 18,
        centerY - 30,
        10 * orbPulse
      );
      orbGradient.addColorStop(0, "#fbbf24");
      orbGradient.addColorStop(0.3, "#f59e0b");
      orbGradient.addColorStop(0.7, "#d97706");
      orbGradient.addColorStop(1, "#92400e");

      ctx.fillStyle = orbGradient;
      ctx.beginPath();
      ctx.arc(
        centerX - bodyWidth / 2 - 18,
        centerY - 30,
        10 * orbPulse,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Orb glow
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "rgba(251, 191, 36, 0.4)";
      ctx.beginPath();
      ctx.arc(
        centerX - bodyWidth / 2 - 18,
        centerY - 30,
        15 * orbPulse,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (type === "npc") {
      // Enhanced shield with metallic effect
      const shieldGradient = ctx.createRadialGradient(
        centerX - bodyWidth / 2 - 12,
        centerY,
        0,
        centerX - bodyWidth / 2 - 12,
        centerY,
        15
      );
      shieldGradient.addColorStop(0, "#10b981");
      shieldGradient.addColorStop(0.3, "#059669");
      shieldGradient.addColorStop(0.7, "#047857");
      shieldGradient.addColorStop(1, "#065f46");

      ctx.fillStyle = shieldGradient;
      ctx.beginPath();
      ctx.arc(centerX - bodyWidth / 2 - 12, centerY, 15, 0, Math.PI * 2);
      ctx.fill();

      // Shield border
      ctx.strokeStyle = "#065f46";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX - bodyWidth / 2 - 12, centerY, 15, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Enhanced glow effect with multiple layers
    const glowGradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      size * 1.4
    );
    glowGradient.addColorStop(0, `${primaryColor}70`);
    glowGradient.addColorStop(0.2, `${primaryColor}40`);
    glowGradient.addColorStop(0.5, `${primaryColor}20`);
    glowGradient.addColorStop(0.8, `${primaryColor}10`);
    glowGradient.addColorStop(1, "transparent");
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, size * 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Particle effects for different character types
    if (type === "mage") {
      // Magic particles with trail effect
      for (let i = 0; i < 5; i++) {
        const particleX = centerX + Math.sin(time * 0.1 + i) * 25;
        const particleY = centerY + Math.cos(time * 0.1 + i) * 25;
        const particleSize = 3 + Math.sin(time * 0.2 + i) * 2;
        const particleAlpha = 0.8 + Math.sin(time * 0.3 + i) * 0.2;

        ctx.fillStyle = `hsla(${280 + i * 30}, 70%, 60%, ${particleAlpha})`;
        ctx.beginPath();
        ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === "enemy") {
      // Dark aura particles
      for (let i = 0; i < 3; i++) {
        const particleX = centerX + Math.sin(time * 0.15 + i) * 20;
        const particleY = centerY + Math.cos(time * 0.15 + i) * 20;
        const particleSize = 2 + Math.sin(time * 0.25 + i) * 1;

        ctx.fillStyle = `hsla(0, 70%, 40%, 0.6)`;
        ctx.beginPath();
        ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Movement trail for enemies
      const enemyMovementData = enemyMovement[objId];
      if (enemyMovementData) {
        const speed = Math.sqrt(
          Math.pow(enemyMovementData.x - enemyMovementData.targetX, 2) +
            Math.pow(enemyMovementData.y - enemyMovementData.targetY, 2)
        );

        if (speed > 0.001) {
          // Movement trail
          for (let i = 0; i < 3; i++) {
            const trailX = centerX - i * 6;
            const trailY = centerY + size / 2 + 3;
            const trailSize = 2 - i * 0.5;

            ctx.fillStyle = `hsla(0, 70%, 40%, ${0.4 - i * 0.1})`;
            ctx.beginPath();
            ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
            ctx.fill();
          }

          // Movement speed indicator
          const speedIndicator = Math.min(speed * 100, 1);
          ctx.fillStyle = `hsla(0, 70%, 60%, ${speedIndicator * 0.8})`;
          ctx.beginPath();
          ctx.arc(centerX, centerY - size / 2 - 8, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (type === "player") {
      // Heroic sparkles
      for (let i = 0; i < 2; i++) {
        const particleX = centerX + Math.sin(time * 0.08 + i) * 18;
        const particleY = centerY + Math.cos(time * 0.08 + i) * 18;
        const particleSize = 2 + Math.sin(time * 0.16 + i) * 1;

        ctx.fillStyle = `hsla(210, 70%, 60%, 0.7)`;
        ctx.beginPath();
        ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Movement trail effect when moving
      if (isMoving) {
        for (let i = 0; i < 3; i++) {
          const trailX = centerX - i * 8;
          const trailY = centerY + size / 2 + 5;
          const trailSize = 3 - i;

          ctx.fillStyle = `hsla(210, 70%, 60%, ${0.3 - i * 0.1})`;
          ctx.beginPath();
          ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Attack animation effects
    if (isAttacking) {
      // Slash effect
      const slashGradient = ctx.createLinearGradient(
        centerX + bodyWidth / 2 + 20,
        centerY - 20,
        centerX + bodyWidth / 2 + 40,
        centerY + 20
      );
      slashGradient.addColorStop(0, "rgba(251, 191, 36, 0.8)");
      slashGradient.addColorStop(0.5, "rgba(251, 191, 36, 0.4)");
      slashGradient.addColorStop(1, "transparent");

      ctx.fillStyle = slashGradient;
      ctx.fillRect(centerX + bodyWidth / 2 + 20, centerY - 20, 20, 40);
    }
  };

  // Position-based combat mechanics
  const moveCharacterToEnemy = (targetEnemy: GameObject) => {
    if (!gameState) return;

    const player = gameObjects.find((obj) => obj.type === "player");
    if (!player) return;

    // Calculate distance to enemy
    const distance = Math.sqrt(
      Math.pow(player.x - targetEnemy.x, 2) +
        Math.pow(player.y - targetEnemy.y, 2)
    );

    // If already close enough, attack directly
    if (distance < 0.15) {
      setCurrentEnemy(targetEnemy);
      attackEnemy();
      return;
    }

    // Move player toward enemy with some randomness to make it more dynamic
    const moveSpeed = 0.03; // Slightly faster movement
    const dx = (targetEnemy.x - player.x) * moveSpeed;
    const dy = (targetEnemy.y - player.y) * moveSpeed;

    // Add slight randomness to movement
    const randomOffset = (Math.random() - 0.5) * 0.01;
    const finalDx = dx + randomOffset;
    const finalDy = dy + randomOffset;

    setGameObjects((prev) =>
      prev.map((obj) =>
        obj.type === "player"
          ? {
              ...obj,
              x: Math.max(0.1, Math.min(0.9, obj.x + finalDx)),
              y: Math.max(0.1, Math.min(0.9, obj.y + finalDy)),
            }
          : obj
      )
    );

    // Check if close enough after movement
    setTimeout(() => {
      const newPlayer = gameObjects.find((obj) => obj.type === "player");
      if (newPlayer) {
        const newDistance = Math.sqrt(
          Math.pow(newPlayer.x - targetEnemy.x, 2) +
            Math.pow(newPlayer.y - targetEnemy.y, 2)
        );

        if (newDistance < 0.15) {
          setCurrentEnemy(targetEnemy);
          // Show attack button or auto-attack
          setTimeout(() => attackEnemy(), 300);
        }
      }
    }, 100);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !gameState) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    // If a game is active, check for object clicks
    if (activeGame && gameObjects.length > 0) {
      const clickedObject = gameObjects.find((obj) => {
        const objX = obj.x;
        const objY = obj.y;
        const objSize = obj.size / rect.width; // Convert to relative size
        return (
          x >= objX && x <= objX + objSize && y >= objY && y <= objY + objSize
        );
      });

      if (clickedObject) {
        handleObjectClick(clickedObject);
        return;
      }
    }
  };

  const handleObjectClick = (object: GameObject) => {
    if (!gameState) return;

    // Don't allow clicking on player character
    if (object.type === "player") {
      return;
    }

    // If in combat mode and clicking enemy, move to engage
    if (isInCombat && object.type === "enemy" && object.health > 0) {
      moveCharacterToEnemy(object);
      return;
    }

    // If not in combat, handle regular object interactions
    let message = "";
    let experienceGain = 0;
    let itemToAdd = null;

    switch (object.type) {
      case "enemy":
        message = `You defeated the ${object.type}!`;
        experienceGain = 25;
        break;
      case "weapon":
        message = `You found a powerful ${object.type}!`;
        experienceGain = 15;
        itemToAdd = {
          id: `weapon-${object.id}`,
          name: "Enhanced Weapon",
          description: "A powerful weapon found in combat",
          type: "weapon",
          rarity: "rare",
          stats: { attack: object.damage || 10 },
          quantity: 1,
        };
        break;
      case "treasure":
        message = `You discovered a ${object.type} worth ${object.value} gold!`;
        experienceGain = 20;
        break;
      case "crystal":
        message = `You gathered a ${object.type} for mana restoration!`;
        experienceGain = 10;
        itemToAdd = {
          id: `crystal-${object.id}`,
          name: "Mana Crystal",
          description: "Restores mana when used",
          type: "consumable",
          rarity: "uncommon",
          quantity: 1,
        };
        break;
      case "spell":
        message = `You learned a new ${object.type}!`;
        experienceGain = 30;
        break;
      case "puzzle-piece":
        message = `You found puzzle piece ${object.piece}!`;
        experienceGain = 5;
        break;
      case "checkpoint":
        message = `Checkpoint ${object.number} reached!`;
        experienceGain = 15;
        break;
      default:
        message = `You interacted with the ${object.type}!`;
        experienceGain = 10;
    }

    // Apply rewards
    if (experienceGain > 0) {
      gainExperience(experienceGain);
    }
    if (itemToAdd) {
      addItem(itemToAdd);
    }

    // Remove the clicked object (but not player characters)
    if (object.type !== "player") {
      setGameObjects((prev) => prev.filter((obj) => obj.id !== object.id));
    }

    // Show feedback
    setCombatLog([message]);
  };

  // Enhanced combat randomness and challenge
  const attackEnemy = () => {
    if (!currentEnemy || !gameState) return;

    // Critical hit and miss chance
    const playerCritChance = 0.15;
    const enemyCritChance = getEnemyStatsForMission(currentMission).crit;
    const missChance = 0.1;

    // Player attack
    let playerDamage =
      Math.floor(Math.random() * (gameState.character.stats.attack * 0.8)) + 1;
    const playerCrit = Math.random() < playerCritChance;
    const playerMiss = Math.random() < missChance;
    if (playerMiss) playerDamage = 0;
    if (playerCrit) playerDamage = Math.floor(playerDamage * 2.2);

    // Enemy attack
    let enemyDamage =
      Math.floor(Math.random() * ((currentEnemy.attack || 6) * 0.9)) + 1;
    const enemyCrit = Math.random() < enemyCritChance;
    const enemyMiss = Math.random() < missChance;
    if (enemyMiss) enemyDamage = 0;
    if (enemyCrit) enemyDamage = Math.floor(enemyDamage * 2.3);

    // Update enemy health
    const updatedEnemies = gameObjects.map((obj) =>
      obj.id === currentEnemy.id
        ? { ...obj, health: Math.max(0, (obj.health || 0) - playerDamage) }
        : obj
    );
    setGameObjects(updatedEnemies);

    // Update player health
    const newPlayerHealth = gameState.character.stats.health - enemyDamage;
    gameState.character.stats.health = Math.max(0, newPlayerHealth);

    const newLog = [...combatLog];
    if (playerMiss) {
      newLog.push(`You miss your attack!`);
    } else if (playerCrit) {
      newLog.push(
        `Critical hit! You deal ${playerDamage} damage to ${
          currentEnemy.name || "enemy"
        }!`
      );
    } else {
      newLog.push(
        `You deal ${playerDamage} damage to ${currentEnemy.name || "enemy"}!`
      );
    }
    if (enemyMiss) {
      newLog.push(`${currentEnemy.name || "Enemy"} misses their attack!`);
    } else if (enemyCrit) {
      newLog.push(
        `Critical hit! ${
          currentEnemy.name || "Enemy"
        } deals ${enemyDamage} damage to you!`
      );
    } else {
      newLog.push(
        `${currentEnemy.name || "Enemy"} deals ${enemyDamage} damage to you!`
      );
    }

    // Check if enemy is defeated
    const defeatedEnemy = updatedEnemies.find(
      (obj) => obj.id === currentEnemy.id
    );
    if (defeatedEnemy && defeatedEnemy.health <= 0) {
      newLog.push(`You defeated ${currentEnemy.name || "enemy"}!`);
      gainExperience(currentEnemy.experienceReward || 25);
      setCurrentEnemy(null);

      // Check if all enemies are defeated
      const remainingEnemies = updatedEnemies.filter(
        (obj) => obj.type === "enemy" && obj.health > 0
      );
      if (remainingEnemies.length === 0) {
        newLog.push("🎉 VICTORY! All enemies defeated!");
        setIsInCombat(false);

        // Only restore 10% of max health
        const maxHealth = gameState.character.stats.maxHealth;
        gameState.character.stats.health = Math.min(
          gameState.character.stats.health + Math.floor(maxHealth * 0.1),
          maxHealth
        );

        // Victory rewards based on difficulty
        const playerLevel = gameState.character.stats.level;
        const victoryXP = playerLevel >= 3 ? 150 : playerLevel >= 2 ? 100 : 75;
        gainExperience(victoryXP);

        // Mission completion rewards
        if (currentMission) {
          const missionRewards = {
            "combat-1": { xp: 75, item: "Shadow Essence" },
            "combat-2": { xp: 120, item: "Enhanced Sword" },
            "combat-3": { xp: 200, item: "Elite Armor" },
            "tutorial-1": { xp: 50, item: "Training Sword" },
          };

          const reward =
            missionRewards[currentMission as keyof typeof missionRewards];
          if (reward) {
            gainExperience(reward.xp);
            addItem({
              id: `mission-${currentMission}`,
              name: reward.item,
              description: `Reward for completing ${currentMission}`,
              type: "material",
              rarity: "uncommon",
              quantity: 1,
            });
          }

          // Complete the mission through the game state system
          if (
            currentMission &&
            gameState?.character.activeMissions.some(
              (m) => m.id === currentMission
            ) &&
            !completedMissionsThisSession.includes(currentMission)
          ) {
            console.log(
              "[DEBUG] Dispatching completeMission for",
              currentMission
            );
            window.dispatchEvent(
              new CustomEvent("completeMission", {
                detail: { missionId: currentMission },
              })
            );
            setCompletedMissionsThisSession((prev) => [
              ...prev,
              currentMission,
            ]);
          }

          // Automatically start the next mission if available
          const nextMissionId = getNextMissionId(currentMission);
          if (
            nextMissionId &&
            !gameState?.character.completedMissions.includes(nextMissionId)
          ) {
            setTimeout(() => {
              console.log(
                "[DEBUG] Dispatching startMission for",
                nextMissionId
              );
              window.dispatchEvent(
                new CustomEvent("startMission", {
                  detail: { missionId: nextMissionId },
                })
              );
              setCurrentMission(nextMissionId);
              // Optionally, re-initialize combat for the next mission
              initializeCombatGame();
            }, 1200);
          }
        }

        addItem({
          id: "victory-loot",
          name: "Combat Trophy",
          description: "Proof of your victory",
          type: "material",
          rarity: "rare",
          quantity: 1,
        });

        // Dispatch victory event with mission info
        const missionName =
          currentMission === "combat-1"
            ? "Shadow Hunter"
            : currentMission === "combat-2"
            ? "Dual Challenge"
            : currentMission === "combat-3"
            ? "Elite Hunter"
            : "Tutorial";

        window.dispatchEvent(
          new CustomEvent("combatResult", {
            detail: {
              result: "victory",
              message: `Mission "${missionName}" completed! Gained ${victoryXP} experience!`,
            },
          })
        );
      }
    }
    // Defeat logic
    if (gameState.character.stats.health <= 0) {
      console.log("[DEBUG] Defeat logic triggered for", currentMission);
      newLog.push("💀 You have been defeated! Restarting this level...");
      setGameObjects((prev) => prev.filter((obj) => obj.type !== "player"));
      setIsInCombat(false);
      setCurrentEnemy(null);
      setTimeout(() => {
        setCombatResult({
          result: "defeat",
          message: "You have been defeated! Restarting this level...",
          restart: true,
        });
        // Restore player health/mana to max for retry
        if (gameState) {
          gameState.character.stats.health =
            gameState.character.stats.maxHealth;
          gameState.character.stats.mana = gameState.character.stats.maxMana;
          // Restart the current mission/level only
          if (currentMission) {
            window.dispatchEvent(
              new CustomEvent("startMission", {
                detail: { missionId: currentMission },
              })
            );
            setCurrentMission(currentMission);
            initializeCombatGame();
          }
        }
      }, 1200);
      setCombatLog(newLog);
      return;
    }
    setCombatLog(newLog);
  };

  const fleeCombat = () => {
    setIsInCombat(false);
    setCurrentEnemy(null);
    setCombatLog([...combatLog, "You fled from combat!"]);
  };

  // Send combat state updates to sidebar
  const updateCombatState = () => {
    const enemies = gameObjects.filter(
      (obj) => obj.type === "enemy" && obj.health > 0
    );
    window.dispatchEvent(
      new CustomEvent("combatUpdate", {
        detail: {
          isInCombat,
          enemies,
          combatLog,
          currentEnemy,
        },
      })
    );
  };

  // Update combat state whenever it changes
  useEffect(() => {
    updateCombatState();
  }, [isInCombat, gameObjects, combatLog, currentEnemy]);

  // Listen for combat actions from sidebar
  useEffect(() => {
    const handleAttackEnemy = () => {
      if (currentEnemy) {
        attackEnemy();
      }
    };

    const handleFleeCombat = () => {
      fleeCombat();
    };

    const handleCombatResult = (event: CustomEvent) => {
      setCombatResult(event.detail);
    };

    const handleCompleteMission = (event: CustomEvent) => {
      const { missionId } = event.detail;
      // This will be handled by the game state system
      console.log("Mission completed:", missionId);
    };

    window.addEventListener("attackEnemy", handleAttackEnemy);
    window.addEventListener("fleeCombat", handleFleeCombat);
    window.addEventListener("combatResult", handleCombatResult);
    window.addEventListener("completeMission", handleCompleteMission);

    return () => {
      window.removeEventListener("attackEnemy", handleAttackEnemy);
      window.removeEventListener("fleeCombat", handleFleeCombat);
      window.removeEventListener("combatResult", handleCombatResult);
      window.removeEventListener("completeMission", handleCompleteMission);
    };
  }, [currentEnemy]);

  // Listen for keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameState || !activeGame) return;

      // Attack with Enter key
      if (event.key === "Enter" && isInCombat) {
        // Find the closest enemy to attack
        const player = gameObjects.find((obj) => obj.type === "player");
        if (!player) return;

        const enemies = gameObjects.filter(
          (obj) => obj.type === "enemy" && obj.health > 0
        );
        if (enemies.length === 0) return;

        // Find the closest enemy
        let closestEnemy = enemies[0];
        let closestDistance = Math.sqrt(
          Math.pow(player.x - enemies[0].x, 2) +
            Math.pow(player.y - enemies[0].y, 2)
        );

        for (const enemy of enemies) {
          const distance = Math.sqrt(
            Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2)
          );
          if (distance < closestDistance) {
            closestDistance = distance;
            closestEnemy = enemy;
          }
        }

        // If close enough to attack, attack the closest enemy
        if (closestDistance < 0.15) {
          setCurrentEnemy(closestEnemy);
          attackEnemy();
        } else {
          // Move toward the closest enemy
          moveCharacterToEnemy(closestEnemy);
        }
        return;
      }

      const moveSpeed = 0.05;
      let newX = playerPosition.x;
      let newY = playerPosition.y;

      switch (event.key) {
        case "ArrowUp":
        case "w":
        case "W":
          newY = Math.max(0.1, playerPosition.y - moveSpeed);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          newY = Math.min(0.9, playerPosition.y + moveSpeed);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          newX = Math.max(0.1, playerPosition.x - moveSpeed);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          newX = Math.min(0.9, playerPosition.x + moveSpeed);
          break;
        default:
          return;
      }

      // Update player position
      setPlayerPosition({ x: newX, y: newY });
      setIsMoving(true);

      // Update game objects with new player position
      setGameObjects((prev) =>
        prev.map((obj) =>
          obj.type === "player" ? { ...obj, x: newX, y: newY } : obj
        )
      );

      // Stop moving animation after a short delay
      setTimeout(() => setIsMoving(false), 100);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, activeGame, playerPosition, isInCombat, gameObjects]);

  // Enemy movement system
  useEffect(() => {
    if (!isInCombat || !gameState) return;

    const moveEnemies = () => {
      setGameObjects((prev) =>
        prev.map((obj) => {
          if (obj.type !== "enemy" || obj.health <= 0) return obj;

          const enemyId = obj.id;
          const currentMovement = enemyMovement[enemyId] || {
            x: obj.x,
            y: obj.y,
            targetX: obj.x,
            targetY: obj.y,
            speed: 0.005 + Math.random() * 0.01, // Random speed between 0.005 and 0.015
          };

          // Get player position
          const player = prev.find((p) => p.type === "player");
          if (!player) return obj;

          // Calculate distance to player
          const distanceToPlayer = Math.sqrt(
            Math.pow(obj.x - player.x, 2) + Math.pow(obj.y - player.y, 2)
          );

          let newX = currentMovement.x;
          let newY = currentMovement.y;
          let newTargetX = currentMovement.targetX;
          let newTargetY = currentMovement.targetY;

          // If close to target, choose new target based on behavior
          const distanceToTarget = Math.sqrt(
            Math.pow(obj.x - currentMovement.targetX, 2) +
              Math.pow(obj.y - currentMovement.targetY, 2)
          );

          if (distanceToTarget < 0.05) {
            // Choose new random target, but avoid getting too close to player
            const angle = Math.random() * Math.PI * 2;
            const distance = 0.1 + Math.random() * 0.2; // Keep some distance from player

            newTargetX = Math.max(
              0.1,
              Math.min(0.9, player.x + Math.cos(angle) * distance)
            );
            newTargetY = Math.max(
              0.1,
              Math.min(0.9, player.y + Math.sin(angle) * distance)
            );
          }

          // Move towards target
          const dx = newTargetX - obj.x;
          const dy = newTargetY - obj.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 0.01) {
            newX = obj.x + (dx / distance) * currentMovement.speed;
            newY = obj.y + (dy / distance) * currentMovement.speed;
          }

          // Update movement state
          setEnemyMovement((prev) => ({
            ...prev,
            [enemyId]: {
              x: newX,
              y: newY,
              targetX: newTargetX,
              targetY: newTargetY,
              speed: currentMovement.speed,
            },
          }));

          return {
            ...obj,
            x: newX,
            y: newY,
          };
        })
      );
    };

    const interval = setInterval(moveEnemies, 50); // Update every 50ms for smooth movement

    return () => clearInterval(interval);
  }, [isInCombat, gameState, enemyMovement]);

  return (
    <Card className="bg-slate-900/50 backdrop-blur-sm border border-white/10 shadow-2xl rounded-2xl overflow-hidden relative group">
      {/* Canvas area */}
      <div className="relative aspect-video w-full bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
        {isConnected ? (
          <canvas
            ref={canvasRef}
            className="w-full h-full object-cover cursor-pointer"
            style={{ background: "transparent" }}
            onClick={handleCanvasClick}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 rounded-full flex items-center justify-center mx-auto border-4 border-white/10">
                <Play className="w-12 h-12 text-white/40" />
              </div>
              <p className="text-white/60 text-lg">
                Connect your wallet to enter the game world
              </p>
            </div>
          </div>
        )}

        {/* Combat Result Notification */}
        {combatResult && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800/95 rounded-lg p-6 max-w-md w-full mx-4 border border-white/20">
              <div className="text-center">
                <div
                  className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    combatResult.result === "victory"
                      ? "bg-green-500/20 border-2 border-green-400"
                      : "bg-red-500/20 border-2 border-red-400"
                  }`}
                >
                  {combatResult.result === "victory" ? (
                    <span className="text-3xl">🎉</span>
                  ) : (
                    <span className="text-3xl">💀</span>
                  )}
                </div>
                <h3
                  className={`text-xl font-bold mb-2 ${
                    combatResult.result === "victory"
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {combatResult.result === "victory"
                    ? "VICTORY!"
                    : "GAME OVER!"}
                </h3>
                <p className="text-white/80 mb-6">{combatResult.message}</p>
                {/* Save progress UI */}
                {saveResult ? (
                  <div
                    className={`mb-4 text-${
                      saveResult.success ? "green" : "red"
                    }-400 font-semibold`}
                  >
                    {saveResult.message}
                  </div>
                ) : isSaving ? (
                  <div className="mb-4 text-blue-400 font-semibold flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-blue-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      ></path>
                    </svg>
                    Saving progress... Please sign the transaction in your
                    wallet.
                  </div>
                ) : (
                  <>
                    <div className="mb-4 text-white/80 text-sm">
                      Want to save your progress on-chain? You'll need to sign a
                      transaction in your wallet.
                    </div>
                    <button
                      onClick={async () => {
                        console.log("[DEBUG] Save Progress clicked", {
                          gameState,
                        });
                        setIsSaving(true);
                        setSaveResult(null);
                        try {
                          await updateGameState.mutateAsync(gameState);
                          // Only show success if no error was thrown
                          setSaveResult({
                            success: true,
                            message: "Progress saved on-chain!",
                          });
                          console.log("[DEBUG] Save Progress success");
                        } catch (e) {
                          setSaveResult({
                            success: false,
                            message:
                              "Failed to save progress: " + (e?.message || e),
                          });
                          console.error("[DEBUG] Save Progress error", e);
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 mb-2"
                      disabled={isSaving}
                    >
                      Save Progress
                    </button>
                  </>
                )}
                {combatResult.restart ? (
                  <button
                    onClick={() => {
                      setCombatResult(null);
                      setSaveResult(null);
                      // Restart from first mission
                      window.dispatchEvent(
                        new CustomEvent("startMission", {
                          detail: { missionId: "combat-1" },
                        })
                      );
                      setCurrentMission("combat-1");
                      initializeCombatGame();
                    }}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200"
                  >
                    Restart
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setCombatResult(null);
                      setSaveResult(null);
                    }}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200"
                  >
                    Continue
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Combat overlay - REMOVED - Now shown in sidebar */}
        {/* {isInCombat && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-slate-800/90 rounded-lg p-6 max-w-2xl w-full mx-4">
              <h3 className="text-white font-bold text-lg mb-4 text-center">
                Combat Arena
              </h3>

              <div className="space-y-4 mb-6">
                <div className="bg-slate-700/50 rounded p-3">
                  <div className="flex justify-between text-white mb-2">
                    <span>Your Health</span>
                    <span>{gameState?.character.stats.health}/{gameState?.character.stats.maxHealth}</span>
                  </div>
                  <div className="w-full bg-red-900 rounded-full h-3">
                    <div
                      className="bg-red-500 h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          ((gameState?.character.stats.health || 0) /
                            (gameState?.character.stats.maxHealth || 1)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {gameObjects.filter(obj => obj.type === 'enemy' && obj.health > 0).map((enemy) => (
                  <div key={enemy.id} className="bg-slate-700/50 rounded p-3">
                    <div className="flex justify-between text-white mb-2">
                      <span>{enemy.name || 'Enemy'}</span>
                      <span>{enemy.health}/{enemy.maxHealth}</span>
                    </div>
                    <div className="w-full bg-red-900 rounded-full h-3">
                      <div
                        className="bg-red-500 h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            ((enemy.health || 0) / (enemy.maxHealth || 1)) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-6 max-h-32 overflow-y-auto bg-slate-700/30 rounded p-3">
                {combatLog.map((log, index) => (
                  <p key={index} className="text-white/80 text-sm">
                    {log}
                  </p>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={attackEnemy}
                  className="bg-red-500 hover:bg-red-600 text-white flex-1"
                  disabled={!currentEnemy}
                >
                  <Sword className="w-4 h-4 mr-2" />
                  Attack
                </Button>
                <Button
                  onClick={fleeCombat}
                  className="bg-gray-500 hover:bg-gray-600 text-white"
                >
                  Flee
                </Button>
              </div>
            </div>
          </div>
        )} */}

        {/* Game overlay when active - REMOVED POPUP */}
        {/* {activeGame && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-slate-800/90 rounded-lg p-6 max-w-2xl w-full mx-4 relative">
              <Button
                onClick={closeActiveGame}
                className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="text-center mb-6">
                <h3 className="text-white font-bold text-2xl mb-2">{activeGame.name}</h3>
                <p className="text-white/60">
                  {activeGame.type === "combat" && "Fight enemies and collect loot"}
                  {activeGame.type === "exploration" && "Discover hidden treasures and secrets"}
                  {activeGame.type === "gathering" && "Collect valuable resources"}
                  {activeGame.type === "magic" && "Cast powerful spells and enchantments"}
                  {activeGame.type === "puzzle" && "Solve challenging puzzles"}
                  {activeGame.type === "racing" && "Race through obstacles and challenges"}
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                <h4 className="text-white font-semibold mb-2">How to Play:</h4>
                <ul className="text-white/80 text-sm space-y-1">
                  <li>• Click on the 3D objects to interact with them</li>
                  <li>• Complete objectives to earn experience and rewards</li>
                  <li>• Use your character stats to overcome challenges</li>
                  <li>• Collect items and resources for your inventory</li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-700/30 rounded p-3">
                  <p className="text-white/60">Objects Found:</p>
                  <p className="text-white font-bold">{gameObjects.length}</p>
                </div>
                <div className="bg-slate-700/30 rounded p-3">
                  <p className="text-white/60">Game Type:</p>
                  <p className="text-white font-bold capitalize">{activeGame.type}</p>
                </div>
              </div>
            </div>
          </div>
        )} */}

        {/* Game overlay controls */}
        {isConnected && (
          <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button
              size="sm"
              variant="secondary"
              className="bg-black/40 backdrop-blur-sm text-white border-white/20 hover:bg-black/60"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-black/40 backdrop-blur-sm text-white border-white/20 hover:bg-black/60"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Loading indicator when connecting */}
        {isConnected && (
          <div className="absolute bottom-4 left-4">
            <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white/80 text-sm">Game World Active</span>
            </div>
          </div>
        )}

        {/* Selected area info */}
        {/* Removed game areas since we're using sidebar game cards */}
      </div>

      {/* Game info panel */}
      {isConnected && (
        <div className="p-4 bg-slate-800/50 backdrop-blur-sm border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              {activeGame ? (
                <>
                  <h3 className="text-white font-semibold">
                    {activeGame.name}
                  </h3>
                  <p className="text-white/60 text-sm">
                    {isInCombat
                      ? `Combat Mode • ${
                          gameObjects.filter(
                            (obj) => obj.type === "enemy" && obj.health > 0
                          ).length
                        } enemies remaining • Use Arrow Keys/WASD to move, Enter to attack`
                      : `Click 3D objects to interact • ${gameObjects.length} objects remaining • Use Arrow Keys/WASD to move`}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-white font-semibold">Ethereal Nexus</h3>
                  <p className="text-white/60 text-sm">
                    Click areas to interact • Combat • Explore • Gather
                  </p>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {activeGame ? (
                <>
                  <div className="flex items-center space-x-1">
                    <div
                      className={`w-3 h-3 rounded animate-pulse ${
                        isInCombat ? "bg-red-500" : "bg-green-500"
                      }`}
                    ></div>
                    <span className="text-white/60 text-xs">
                      {isInCombat ? "In Combat" : "Game Active"}
                    </span>
                  </div>
                  <Button
                    onClick={closeActiveGame}
                    size="sm"
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-white/60 text-xs">Combat</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-white/60 text-xs">Explore</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-white/60 text-xs">Gather</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default GameCanvas;
