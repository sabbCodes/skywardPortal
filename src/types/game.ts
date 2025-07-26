export interface CharacterStats {
  level: number;
  experience: number;
  health: number;
  mana: number;
  attack: number;
  defense: number;
  speed: number;
  magic: number;
  maxHealth: number;
  maxMana: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: "weapon" | "armor" | "consumable" | "material" | "quest";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  stats?: Partial<CharacterStats>;
  quantity: number;
  icon?: string;
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  type: "combat" | "exploration" | "gathering" | "social";
  difficulty: "easy" | "medium" | "hard" | "epic";
  requirements: {
    level?: number;
    items?: string[];
    stats?: Partial<CharacterStats>;
  };
  rewards: {
    experience: number;
    items?: InventoryItem[];
    stats?: Partial<CharacterStats>;
  };
  isCompleted: boolean;
  isActive: boolean;
}

export interface GameState {
  character: {
    stats: CharacterStats;
    inventory: InventoryItem[];
    activeMissions: Mission[];
    completedMissions: string[];
    achievements: string[];
  };
  world: {
    currentRealm: string;
    discoveredAreas: string[];
    unlockedFeatures: string[];
  };
  guild?: {
    name: string;
    rank: string;
    contribution: number;
  };
  profile?: {
    info?: { name?: string; bio?: string; pfp?: string };
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  progress: number;
  maxProgress: number;
}

export interface CombatAction {
  id: string;
  name: string;
  type: "attack" | "defend" | "special" | "item";
  damage?: number;
  healing?: number;
  effects?: string[];
  cooldown: number;
  manaCost: number;
}

export interface Enemy {
  id: string;
  name: string;
  stats: CharacterStats;
  actions: CombatAction[];
  drops: InventoryItem[];
  experienceReward: number;
}

export interface Realm {
  id: string;
  name: string;
  description: string;
  level: number;
  enemies: Enemy[];
  resources: string[];
  missions: Mission[];
  isUnlocked: boolean;
}
