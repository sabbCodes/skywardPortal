import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Sword, 
  Shield, 
  Zap, 
  Star, 
  Crown, 
  Heart,
  Sparkles,
  Map,
  Target,
} from "lucide-react";
import { useGameState } from "@/hooks/useGameState";
import { useState, useEffect } from "react";

interface CombatEnemy {
  id: number;
  name: string;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
}

interface CombatState {
  isInCombat: boolean;
  enemies: CombatEnemy[];
  combatLog: string[];
  currentEnemy: CombatEnemy | null;
}

const GameStats = () => {
  const { gameState, isLoading } = useGameState();
  const [combatState, setCombatState] = useState<CombatState>({
    isInCombat: false,
    enemies: [],
    combatLog: [],
    currentEnemy: null,
  });

  // Listen for combat state updates
  useEffect(() => {
    const handleCombatUpdate = (event: CustomEvent) => {
      setCombatState(event.detail);
    };

    window.addEventListener(
      "combatUpdate",
      handleCombatUpdate as EventListener
    );
    return () =>
      window.removeEventListener(
        "combatUpdate",
        handleCombatUpdate as EventListener
      );
  }, []);

  if (isLoading) {
    return <div className="text-white/80 p-4">Loading profile...</div>;
  }
  if (!gameState) {
    return <div className="text-white/60 p-4">No profile found.</div>;
  }

  const { stats, inventory, activeMissions } = gameState.character;
  const name = gameState.profile?.info?.name ?? "Skyward Knight";

  // Calculate experience progress
  const expNeeded = stats.level * 100;
  const expProgress = (stats.experience / expNeeded) * 100;

  return (
    <div className="space-y-4">
      {/* Player Level Card */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border border-white/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-semibold">
              Level {stats.level}
            </span>
          </div>
          <Badge className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white">
            {name}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Experience</span>
            <span className="text-white">
              {stats.experience} / {expNeeded}
            </span>
          </div>
          <Progress value={expProgress} className="h-2" />
        </div>
      </Card>

      {/* Health & Mana - Enhanced for combat */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border border-white/20 p-4">
        <h3 className="text-white font-semibold mb-3">
          {combatState.isInCombat ? "Combat Status" : "Vitality"}
        </h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4 text-red-400" />
                <span className="text-white/80 text-sm">Health</span>
              </div>
              <span className="text-white font-semibold">
                {stats.health} / {stats.maxHealth}
              </span>
            </div>
            <Progress
              value={(stats.health / stats.maxHealth) * 100}
              className="h-2"
            />
          </div>

          {/* Show enemy health bars when in combat */}
          {combatState.isInCombat &&
            combatState.enemies.map((enemy) => (
              <div key={enemy.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sword className="w-4 h-4 text-red-400" />
                    <span className="text-white/80 text-sm">{enemy.name}</span>
                  </div>
                  <span className="text-white font-semibold">
                    {enemy.health} / {enemy.maxHealth}
                  </span>
                </div>
                <Progress
                  value={((enemy.health || 0) / (enemy.maxHealth || 1)) * 100}
                  className="h-2"
                />
              </div>
            ))}

          {/* Show mana when not in combat */}
          {!combatState.isInCombat && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span className="text-white/80 text-sm">Mana</span>
                </div>
                <span className="text-white font-semibold">
                  {stats.mana} / {stats.maxMana}
                </span>
              </div>
              <Progress
                value={(stats.mana / stats.maxMana) * 100}
                className="h-2"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Character Stats */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border border-white/20 p-4">
        <h3 className="text-white font-semibold mb-3">Character Stats</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sword className="w-4 h-4 text-red-400" />
              <span className="text-white/80 text-sm">Attack</span>
            </div>
            <span className="text-white font-semibold">{stats.attack}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-white/80 text-sm">Defense</span>
            </div>
            <span className="text-white font-semibold">{stats.defense}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-white/80 text-sm">Speed</span>
            </div>
            <span className="text-white font-semibold">{stats.speed}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-purple-400" />
              <span className="text-white/80 text-sm">Magic</span>
            </div>
            <span className="text-white font-semibold">{stats.magic}</span>
          </div>
        </div>
      </Card>

      {/* Quick Inventory - Game Launcher */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border border-white/20 p-4">
        <h3 className="text-white font-semibold mb-3">Game Activities</h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Combat Game */}
          <div
            className="aspect-square bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-lg border border-red-500/30 flex flex-col items-center justify-center relative group hover:from-red-500/30 hover:to-red-600/30 transition-all duration-200 cursor-pointer transform hover:scale-105 hover:shadow-lg"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("launchGame", {
                  detail: { type: "combat", name: "Combat Arena" },
                })
              )
            }
          >
            <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-lg shadow-lg transform rotate-12 mb-2 flex items-center justify-center">
              <Sword className="w-6 h-6 text-white" />
            </div>
            <p className="text-white font-medium text-sm text-center">
              Combat Arena
            </p>
            <p className="text-white/60 text-xs text-center">Fight enemies</p>
            <div className="absolute top-2 right-2 w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
          </div>

          {/* Exploration Game */}
          <div
            className="aspect-square bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg border border-blue-500/30 flex flex-col items-center justify-center relative group hover:from-blue-500/30 hover:to-blue-600/30 transition-all duration-200 cursor-pointer transform hover:scale-105 hover:shadow-lg"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("launchGame", {
                  detail: { type: "exploration", name: "Exploration Zone" },
                })
              )
            }
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg shadow-lg transform rotate-12 mb-2 flex items-center justify-center">
              <Map className="w-6 h-6 text-white" />
            </div>
            <p className="text-white font-medium text-sm text-center">
              Exploration
            </p>
            <p className="text-white/60 text-xs text-center">Discover areas</p>
            <div className="absolute top-2 right-2 w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                </div>

          {/* Gathering Game */}
          <div
            className="aspect-square bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg border border-green-500/30 flex flex-col items-center justify-center relative group hover:from-green-500/30 hover:to-green-600/30 transition-all duration-200 cursor-pointer transform hover:scale-105 hover:shadow-lg"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("launchGame", {
                  detail: { type: "gathering", name: "Gathering Grounds" },
                })
              )
            }
          >
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-lg shadow-lg transform rotate-12 mb-2 flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <p className="text-white font-medium text-sm text-center">
              Gathering
            </p>
            <p className="text-white/60 text-xs text-center">
              Collect resources
            </p>
            <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>

          {/* Magic Game */}
          <div
            className="aspect-square bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg border border-purple-500/30 flex flex-col items-center justify-center relative group hover:from-purple-500/30 hover:to-purple-600/30 transition-all duration-200 cursor-pointer transform hover:scale-105 hover:shadow-lg"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("launchGame", {
                  detail: { type: "magic", name: "Magic Tower" },
                })
              )
            }
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg shadow-lg transform rotate-12 mb-2 flex items-center justify-center">
              <Star className="w-6 h-6 text-white" />
            </div>
            <p className="text-white font-medium text-sm text-center">
              Magic Tower
            </p>
            <p className="text-white/60 text-xs text-center">Cast spells</p>
            <div className="absolute top-2 right-2 w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
          </div>
          
          {/* Puzzle Game */}
          <div
            className="aspect-square bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-lg border border-yellow-500/30 flex flex-col items-center justify-center relative group hover:from-yellow-500/30 hover:to-yellow-600/30 transition-all duration-200 cursor-pointer transform hover:scale-105 hover:shadow-lg"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("launchGame", {
                  detail: { type: "puzzle", name: "Crystal Puzzle" },
                })
              )
            }
          >
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-lg transform rotate-12 mb-2 flex items-center justify-center">
              <div className="w-6 h-6 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded transform rotate-45"></div>
            </div>
            <p className="text-white font-medium text-sm text-center">
              Crystal Puzzle
            </p>
            <p className="text-white/60 text-xs text-center">Solve puzzles</p>
            <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
          </div>
          
          {/* Racing Game */}
          <div
            className="aspect-square bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-lg border border-cyan-500/30 flex flex-col items-center justify-center relative group hover:from-cyan-500/30 hover:to-cyan-600/30 transition-all duration-200 cursor-pointer transform hover:scale-105 hover:shadow-lg"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("launchGame", {
                  detail: { type: "racing", name: "Speed Trials" },
                })
              )
            }
          >
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-lg shadow-lg transform rotate-12 mb-2 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <p className="text-white font-medium text-sm text-center">
              Speed Trials
            </p>
            <p className="text-white/60 text-xs text-center">Race & compete</p>
            <div className="absolute top-2 right-2 w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Game Status */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex justify-between items-center text-xs">
            <span className="text-white/60">Active Games:</span>
            <span className="text-white font-medium">6 Available</span>
          </div>
        </div>
      </Card>

      {/* Active Missions - Enhanced for combat log */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border border-white/20 p-4">
        <h3 className="text-white font-semibold mb-3">
          {combatState.isInCombat ? "Combat Log" : "Combat Status"}
        </h3>
        <div className="space-y-2">
          {combatState.isInCombat ? (
            // Show combat log
            <div className="max-h-32 overflow-y-auto">
              {combatState.combatLog.map((log, index) => (
                <p key={index} className="text-white/80 text-xs mb-1">
                  {log}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-white/60 text-xs text-center">
              No active combat
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default GameStats;
