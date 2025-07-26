import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sword, Shield, Zap, Star, Heart, Sparkles } from "lucide-react";
import { useGameState } from "@/hooks/useGameState";
import { useState, useEffect } from "react";

interface CombatEnemy {
  id: number;
  type: string;
  name?: string;
  health?: number;
  maxHealth?: number;
  attack?: number;
  defense?: number;
  experienceReward?: number;
}

interface CombatState {
  isInCombat: boolean;
  currentEnemy: CombatEnemy | null;
}

const GameActions = () => {
  const { gameState, gainExperience, addItem } = useGameState();
  const [combatState, setCombatState] = useState<CombatState>({
    isInCombat: false,
    currentEnemy: null,
  });

  // Listen for combat state updates
  useEffect(() => {
    const handleCombatUpdate = (event: CustomEvent) => {
      setCombatState({
        isInCombat: event.detail.isInCombat,
        currentEnemy: event.detail.currentEnemy,
      });
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

  if (!gameState) return null;

  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border border-white/20 p-4">
      <h3 className="text-white font-semibold mb-3">
        {combatState.isInCombat ? "Combat Actions" : "Quick Actions"}
      </h3>

      {combatState.isInCombat ? (
        // Combat actions
        <div className="space-y-2">
          <Button
            onClick={() => window.dispatchEvent(new CustomEvent("attackEnemy"))}
            className="bg-red-500 hover:bg-red-600 text-white w-full"
            disabled={!combatState.currentEnemy}
          >
            <Sword className="w-4 h-4 mr-2" />
            Attack
          </Button>
          <Button
            onClick={() => window.dispatchEvent(new CustomEvent("fleeCombat"))}
            className="bg-gray-500 hover:bg-gray-600 text-white w-full"
          >
            <Shield className="w-4 h-4 mr-2" />
            Flee
          </Button>
        </div>
      ) : (
        // Regular actions
        <div className="space-y-2">
          <Button
            onClick={() => {
              if (
                gameState.character.stats.health <
                gameState.character.stats.maxHealth
              ) {
                gameState.character.stats.health = Math.min(
                  gameState.character.stats.maxHealth,
                  gameState.character.stats.health + 20
                );
              }
            }}
            className="bg-green-500 hover:bg-green-600 text-white w-full"
            disabled={
              gameState.character.stats.health >=
              gameState.character.stats.maxHealth
            }
          >
            <Heart className="w-4 h-4 mr-2" />
            Restore Health
          </Button>
          <Button
            onClick={() => {
              if (
                gameState.character.stats.mana <
                gameState.character.stats.maxMana
              ) {
                gameState.character.stats.mana = Math.min(
                  gameState.character.stats.maxMana,
                  gameState.character.stats.mana + 15
                );
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white w-full"
            disabled={
              gameState.character.stats.mana >=
              gameState.character.stats.maxMana
            }
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Restore Mana
          </Button>
        </div>
      )}
    </Card>
  );
};

export default GameActions;
 