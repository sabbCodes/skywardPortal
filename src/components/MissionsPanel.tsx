import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Map,
  Sword,
  Target,
  Trophy,
  Star,
  Clock,
  CheckCircle,
  Play,
} from "lucide-react";
import { useGameState } from "@/hooks/useGameState";
import { Mission } from "@/types/game";

const MissionsPanel = () => {
  const {
    gameState,
    availableMissions,
    startMission,
    completeMission,
    canStartMission,
    isStartingMission,
    isCompletingMission,
  } = useGameState();

  if (!gameState) {
    return (
      <Card className="bg-slate-800/50 backdrop-blur-sm border border-white/20 p-4">
        <div className="text-white/60 text-center">Loading missions...</div>
      </Card>
    );
  }

  const activeMissions = gameState.character.activeMissions;

  const getMissionIcon = (type: string) => {
    switch (type) {
      case "combat":
        return <Sword className="w-4 h-4 text-red-400" />;
      case "exploration":
        return <Map className="w-4 h-4 text-blue-400" />;
      case "gathering":
        return <Target className="w-4 h-4 text-green-400" />;
      case "social":
        return <Star className="w-4 h-4 text-yellow-400" />;
      default:
        return <Map className="w-4 h-4 text-gray-400" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "hard":
        return "bg-orange-500";
      case "epic":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleStartMission = (missionId: string) => {
    startMission(missionId);
  };

  const handleCompleteMission = (missionId: string) => {
    completeMission(missionId);
  };

  return (
    <div className="space-y-4">
      {/* Active Missions */}
      {activeMissions.length > 0 && (
        <Card className="bg-slate-800/50 backdrop-blur-sm border border-white/20 p-4">
          <h3 className="text-white font-semibold mb-3 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span>Active Missions</span>
          </h3>
          <div className="space-y-3">
            {activeMissions.map((mission) => (
              <div
                key={mission.id}
                className="bg-slate-700/50 rounded-lg p-3 border border-white/10"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getMissionIcon(mission.type)}
                    <span className="text-white font-medium">
                      {mission.name}
                    </span>
                    <Badge className={getDifficultyColor(mission.difficulty)}>
                      {mission.difficulty}
                    </Badge>
                  </div>
                  <Badge className="bg-blue-500 text-white">Active</Badge>
                </div>
                <p className="text-white/60 text-sm mb-3">
                  {mission.description}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-white/60">
                    <span>Rewards:</span>
                    <span className="text-white">
                      {mission.rewards.experience} XP
                      {mission.rewards.items &&
                        ` + ${mission.rewards.items.length} items`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Available Missions */}
      {availableMissions.length > 0 && (
        <Card className="bg-slate-800/50 backdrop-blur-sm border border-white/20 p-4">
          <h3 className="text-white font-semibold mb-3 flex items-center space-x-2">
            <Map className="w-5 h-5 text-green-400" />
            <span>Available Missions</span>
          </h3>
          <div className="space-y-3">
            {availableMissions.map((mission) => {
              const canStart = canStartMission(mission);
              const isCompleted =
                gameState.character.completedMissions.includes(mission.id);
              return (
                <div
                  key={mission.id}
                  className={`bg-slate-700/50 rounded-lg p-3 border ${
                    canStart
                      ? "border-white/10"
                      : "border-red-500/30 bg-red-500/10"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getMissionIcon(mission.type)}
                      <span className="text-white font-medium">
                        {mission.name}
                      </span>
                      <Badge className={getDifficultyColor(mission.difficulty)}>
                        {mission.difficulty}
                      </Badge>
                    </div>
                    {isCompleted ? (
                      <Badge className="bg-yellow-500 text-black">
                        Completed
                      </Badge>
                    ) : canStart ? (
                      <Badge className="bg-green-500 text-white">Ready</Badge>
                    ) : (
                      <Badge className="bg-gray-500 text-white">Locked</Badge>
                    )}
                  </div>
                  <p className="text-white/60 text-sm mb-3">
                    {mission.description}
                  </p>
                  {/* Requirements */}
                  {!canStart && (
                    <div className="mb-3 p-2 bg-red-500/20 rounded border border-red-500/30">
                      <p className="text-red-400 text-xs font-medium mb-1">
                        Requirements:
                      </p>
                      {mission.requirements.level && (
                        <p className="text-red-300 text-xs">
                          Level {mission.requirements.level} (Current:{" "}
                          {gameState.character.stats.level})
                        </p>
                      )}
                      {mission.requirements.items && (
                        <p className="text-red-300 text-xs">
                          Missing required items
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-white/60">
                      <span>Rewards:</span>
                      <span className="text-white">
                        {mission.rewards.experience} XP
                        {mission.rewards.items &&
                          ` + ${mission.rewards.items.length} items`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Completed Missions Summary */}
      {gameState.character.completedMissions.length > 0 && (
        <Card className="bg-slate-800/50 backdrop-blur-sm border border-white/20 p-4">
          <h3 className="text-white font-semibold mb-3 flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span>Completed Missions</span>
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-white/60 text-sm">
              {gameState.character.completedMissions.length} missions completed
            </span>
            <Badge className="bg-yellow-500 text-black">
              {gameState.character.completedMissions.length}
            </Badge>
          </div>
        </Card>
      )}

      {/* No Missions Available */}
      {availableMissions.length === 0 && activeMissions.length === 0 && (
        <Card className="bg-slate-800/50 backdrop-blur-sm border border-white/20 p-4">
          <div className="text-center space-y-2">
            <Map className="w-8 h-8 text-white/40 mx-auto" />
            <p className="text-white/60">No missions available</p>
            <p className="text-white/40 text-sm">
              Complete more missions to unlock new adventures!
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MissionsPanel;
