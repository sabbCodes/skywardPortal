import { honeycombClient, PROJECT_ID } from "@/lib/honeycombClient";
import { PROJECT_AUTHORITY } from "@/hooks/useHoneycombProfile";
import { sendClientTransactions } from "@honeycomb-protocol/edge-client/client/walletHelpers";
import { useWallet, WalletContextState } from "@solana/wallet-adapter-react";
import {
  CharacterStats,
  InventoryItem,
  Mission,
  GameState,
  Achievement,
  CombatAction,
  Enemy,
  Realm,
} from "@/types/game";
import base58 from "bs58";

// Type for Honeycomb profile
interface HoneycombProfile {
  platformData?: {
    custom?: Record<string, string | string[]>;
    xp?: number;
    achievements?: string[];
  };
  info?: {
    name?: string;
    bio?: string;
    pfp?: string;
  };
}

// Default starting stats - Enhanced for better new player experience
export const DEFAULT_STATS: CharacterStats = {
  level: 1,
  experience: 0,
  health: 120, // Increased from 100
  mana: 60, // Increased from 50
  attack: 15, // Increased from 10
  defense: 12, // Increased from 8
  speed: 15, // Increased from 12
  magic: 8, // Increased from 6
  maxHealth: 120,
  maxMana: 60,
};

// Sample missions with proper difficulty progression
export const SAMPLE_MISSIONS: Mission[] = [
  {
    id: "tutorial-1",
    name: "First Steps",
    description: "Complete your first adventure in the Ethereal Nexus",
    type: "exploration",
    difficulty: "easy",
    requirements: { level: 1 },
    rewards: {
      experience: 50,
      items: [
        {
          id: "basic-sword",
          name: "Training Sword",
          description: "A basic sword for beginners",
          type: "weapon",
          rarity: "common",
          stats: { attack: 5 },
          quantity: 1,
        },
      ],
    },
    isCompleted: false,
    isActive: true,
  },
  {
    id: "combat-1",
    name: "Shadow Hunter",
    description: "Defeat 1 shadow creature in the Dark Forest",
    type: "combat",
    difficulty: "easy",
    requirements: { level: 1 },
    rewards: {
      experience: 75,
      items: [
        {
          id: "shadow-essence",
          name: "Shadow Essence",
          description: "A mysterious dark material",
          type: "material",
          rarity: "uncommon",
          quantity: 2,
        },
      ],
    },
    isCompleted: false,
    isActive: false,
  },
  {
    id: "combat-2",
    name: "Dual Challenge",
    description: "Defeat 2 shadow creatures in the Dark Forest",
    type: "combat",
    difficulty: "medium",
    requirements: { level: 2 },
    rewards: {
      experience: 120,
      items: [
        {
          id: "enhanced-sword",
          name: "Enhanced Sword",
          description: "A stronger weapon for experienced fighters",
          type: "weapon",
          rarity: "uncommon",
          stats: { attack: 8 },
          quantity: 1,
        },
      ],
    },
    isCompleted: false,
    isActive: false,
  },
  {
    id: "combat-3",
    name: "Elite Hunter",
    description: "Defeat 3 elite shadow creatures",
    type: "combat",
    difficulty: "hard",
    requirements: { level: 3 },
    rewards: {
      experience: 200,
      items: [
        {
          id: "elite-armor",
          name: "Elite Armor",
          description: "Protective armor for elite warriors",
          type: "armor",
          rarity: "rare",
          stats: { defense: 10 },
          quantity: 1,
        },
      ],
    },
    isCompleted: false,
    isActive: false,
  },
];

// Sample enemies with progressive difficulty
export const SAMPLE_ENEMIES: Enemy[] = [
  {
    id: "shadow-creature",
    name: "Shadow Creature",
    stats: {
      level: 1,
      experience: 0,
      health: 30, // Reduced from 50
      mana: 15, // Reduced from 20
      attack: 6, // Reduced from 8
      defense: 3, // Reduced from 5
      speed: 8, // Reduced from 10
      magic: 2, // Reduced from 3
      maxHealth: 30,
      maxMana: 15,
    },
    actions: [
      {
        id: "shadow-claw",
        name: "Shadow Claw",
        type: "attack",
        damage: 8, // Reduced from 12
        cooldown: 0,
        manaCost: 0,
      },
    ],
    drops: [
      {
        id: "shadow-essence",
        name: "Shadow Essence",
        description: "A mysterious dark material",
        type: "material",
        rarity: "uncommon",
        quantity: 1,
      },
    ],
    experienceReward: 25,
  },
  {
    id: "elite-shadow",
    name: "Elite Shadow",
    stats: {
      level: 2,
      experience: 0,
      health: 50,
      mana: 20,
      attack: 10,
      defense: 6,
      speed: 12,
      magic: 4,
      maxHealth: 50,
      maxMana: 20,
    },
    actions: [
      {
        id: "shadow-blast",
        name: "Shadow Blast",
        type: "attack",
        damage: 12,
        cooldown: 0,
        manaCost: 0,
      },
    ],
    drops: [
      {
        id: "shadow-essence",
        name: "Shadow Essence",
        description: "A mysterious dark material",
        type: "material",
        rarity: "uncommon",
        quantity: 2,
      },
    ],
    experienceReward: 40,
  },
  {
    id: "shadow-lord",
    name: "Shadow Lord",
    stats: {
      level: 3,
      experience: 0,
      health: 80,
      mana: 30,
      attack: 15,
      defense: 10,
      speed: 15,
      magic: 8,
      maxHealth: 80,
      maxMana: 30,
    },
    actions: [
      {
        id: "shadow-storm",
        name: "Shadow Storm",
        type: "attack",
        damage: 18,
        cooldown: 0,
        manaCost: 0,
      },
    ],
    drops: [
      {
        id: "shadow-crystal",
        name: "Shadow Crystal",
        description: "A powerful dark crystal",
        type: "material",
        rarity: "rare",
        quantity: 1,
      },
    ],
    experienceReward: 60,
  },
];

// Sample realms
export const SAMPLE_REALMS: Realm[] = [
  {
    id: "ethereal-nexus",
    name: "Ethereal Nexus",
    description: "The mystical center of all realms",
    level: 1,
    enemies: [],
    resources: ["ethereal-crystal", "mana-essence"],
    missions: [SAMPLE_MISSIONS[0]],
    isUnlocked: true,
  },
  {
    id: "dark-forest",
    name: "Dark Forest",
    description: "A mysterious forest shrouded in shadows",
    level: 2,
    enemies: [SAMPLE_ENEMIES[0]],
    resources: ["shadow-essence", "dark-wood"],
    missions: [SAMPLE_MISSIONS[1]],
    isUnlocked: false,
  },
];

// Helper type guard for error
function hasMessage(e: unknown): e is { message: string } {
  return (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  );
}

export class GameService {
  private wallet: WalletContextState;

  constructor(wallet: WalletContextState) {
    this.wallet = wallet;
  }

  // Parse game state from Honeycomb profile
  parseGameState(profile: HoneycombProfile): GameState {
    // Convert customData array to object
    const customDataArr = (
      profile as unknown as { customData?: [string, string][] }
    ).customData;
    let customData: Record<string, string | string[]> = {};
    if (Array.isArray(customDataArr)) {
      for (const [key, value] of customDataArr) {
        customData[key] = value;
      }
    } else {
      // fallback for old format
      customData = profile.platformData?.custom || {};
    }
    // Debug: log what's coming from the chain
    console.log("Honeycomb profile customData:", customData);
    console.log("Parsing inventory from:", customData.inventory);
    console.log("Parsing activeMissions from:", customData.activeMissions);

    // Defensive: parse numbers, fallback to defaults
    const stats = {
      level:
        parseInt((customData.level as string) ?? "") || DEFAULT_STATS.level,
      experience:
        parseInt((customData.experience as string) ?? "") ||
        DEFAULT_STATS.experience,
      health:
        parseInt((customData.health as string) ?? "") || DEFAULT_STATS.health,
      mana: parseInt((customData.mana as string) ?? "") || DEFAULT_STATS.mana,
      attack:
        parseInt((customData.attack as string) ?? "") || DEFAULT_STATS.attack,
      defense:
        parseInt((customData.defense as string) ?? "") || DEFAULT_STATS.defense,
      speed:
        parseInt((customData.speed as string) ?? "") || DEFAULT_STATS.speed,
      magic:
        parseInt((customData.magic as string) ?? "") || DEFAULT_STATS.magic,
      maxHealth:
        parseInt((customData.maxHealth as string) ?? "") ||
        DEFAULT_STATS.maxHealth,
      maxMana:
        parseInt((customData.maxMana as string) ?? "") || DEFAULT_STATS.maxMana,
    };

    console.log("Parsed stats from customData:", stats);

    // Defensive: parse arrays/objects
    let inventory = [];
    try {
      // Handle both array format (new) and JSON string format (old)
      if (Array.isArray(customData.inventory)) {
        // If it's an array, the first element should be the JSON string
        const inventoryString = customData.inventory[0];
        if (typeof inventoryString === "string") {
          // Try to decode as base64 first, then parse as JSON
          try {
            const decodedString = atob(inventoryString);
            inventory = JSON.parse(decodedString);
          } catch {
            // If base64 decode fails, try parsing as regular JSON
            inventory = JSON.parse(inventoryString);
          }
        } else {
          inventory = [];
        }
      } else if (typeof customData.inventory === "string") {
        // Try to decode as base64 first, then parse as JSON
        try {
          const decodedString = atob(customData.inventory);
          inventory = JSON.parse(decodedString);
        } catch {
          // If base64 decode fails, try parsing as regular JSON
          inventory = JSON.parse(customData.inventory);
        }
      } else {
        inventory = [];
      }
    } catch {
      inventory = [];
    }
    let activeMissions = [];
    try {
      // Handle both array format (new) and JSON string format (old)
      if (Array.isArray(customData.activeMissions)) {
        // If it's an array, the first element should be the JSON string
        const missionsString = customData.activeMissions[0];
        if (typeof missionsString === "string") {
          // Try to decode as base64 first, then parse as JSON
          try {
            const decodedString = atob(missionsString);
            activeMissions = JSON.parse(decodedString);
          } catch {
            // If base64 decode fails, try parsing as regular JSON
            activeMissions = JSON.parse(missionsString);
          }
        } else {
          activeMissions = [];
        }
      } else if (typeof customData.activeMissions === "string") {
        // Try to decode as base64 first, then parse as JSON
        try {
          const decodedString = atob(customData.activeMissions);
          activeMissions = JSON.parse(decodedString);
        } catch {
          // If base64 decode fails, try parsing as regular JSON
          activeMissions = JSON.parse(customData.activeMissions);
        }
      } else {
        activeMissions = [];
      }
    } catch {
      activeMissions = [];
    }

    console.log("Parsed inventory:", inventory);
    console.log("Parsed activeMissions:", activeMissions);

    let completedMissions = [];
    try {
      if (Array.isArray(customData.completedMissions)) {
        const missionsString = customData.completedMissions[0];
        if (typeof missionsString === "string") {
          completedMissions = missionsString.split(",");
        } else {
          completedMissions = [];
        }
      } else if (typeof customData.completedMissions === "string") {
        completedMissions = customData.completedMissions.split(",");
      } else {
        completedMissions = [];
      }
    } catch {
      completedMissions = [];
    }
    let achievements = [];
    try {
      if (Array.isArray(customData.achievements)) {
        const achievementsString = customData.achievements[0];
        if (typeof achievementsString === "string") {
          achievements = achievementsString.split(",");
        } else {
          achievements = [];
        }
      } else if (typeof customData.achievements === "string") {
        achievements = customData.achievements.split(",");
      } else {
        achievements = [];
      }
    } catch {
      achievements = [];
    }
    let discoveredAreas = [];
    try {
      if (Array.isArray(customData.discoveredAreas)) {
        const areasString = customData.discoveredAreas[0];
        if (typeof areasString === "string") {
          discoveredAreas = areasString.split(",");
        } else {
          discoveredAreas = ["ethereal-nexus"];
        }
      } else if (typeof customData.discoveredAreas === "string") {
        discoveredAreas = customData.discoveredAreas.split(",");
      } else {
        discoveredAreas = ["ethereal-nexus"];
      }
    } catch {
      discoveredAreas = ["ethereal-nexus"];
    }
    let unlockedFeatures = [];
    try {
      if (Array.isArray(customData.unlockedFeatures)) {
        const featuresString = customData.unlockedFeatures[0];
        if (typeof featuresString === "string") {
          unlockedFeatures = featuresString.split(",");
        } else {
          unlockedFeatures = ["basic-combat"];
        }
      } else if (typeof customData.unlockedFeatures === "string") {
        unlockedFeatures = customData.unlockedFeatures.split(",");
      } else {
        unlockedFeatures = ["basic-combat"];
      }
    } catch {
      unlockedFeatures = ["basic-combat"];
    }

    console.log("Parsed stats:", stats);
    console.log("Parsed completedMissions:", completedMissions);
    console.log("Parsed achievements:", achievements);
    console.log("Parsed discoveredAreas:", discoveredAreas);
    console.log("Parsed unlockedFeatures:", unlockedFeatures);

    const finalGameState = {
      character: {
        stats,
        inventory,
        activeMissions,
        completedMissions,
        achievements,
      },
      world: {
        currentRealm: Array.isArray(customData.currentRealm)
          ? customData.currentRealm[0] || "ethereal-nexus"
          : customData.currentRealm || "ethereal-nexus",
        discoveredAreas,
        unlockedFeatures,
      },
      guild: customData.guildName
        ? {
            name: Array.isArray(customData.guildName)
              ? customData.guildName[0]
              : customData.guildName,
            rank: Array.isArray(customData.guildRank)
              ? customData.guildRank[0] || "Member"
              : customData.guildRank || "Member",
            contribution:
              parseInt(
                Array.isArray(customData.guildContribution)
                  ? customData.guildContribution[0]
                  : customData.guildContribution
              ) || 0,
          }
        : undefined,
      profile: {
        info: profile.info,
      },
    };

    console.log("Final parsed game state:", finalGameState);
    return finalGameState;
  }

  private parseInventory(inventoryData: string): InventoryItem[] {
    if (!inventoryData) return [];
    try {
      return JSON.parse(inventoryData);
    } catch {
      return [];
    }
  }

  private parseMissions(missionsData: string): Mission[] {
    if (!missionsData) return [];
    try {
      return JSON.parse(missionsData);
    } catch {
      return [];
    }
  }

  // Update game state on Honeycomb
  async updateGameState(
    profileAddress: string,
    gameState: GameState,
    accessToken?: string
  ): Promise<void> {
    if (!this.wallet.publicKey) throw new Error("Wallet not connected");
    if (!accessToken)
      throw new Error("Access token required for updateGameState");
    try {
      const walletAddress = this.wallet.publicKey.toBase58();
      const token = accessToken;
      // Clamp all numeric stats to 0-255
      const clamp = (val: number) => Math.max(0, Math.min(255, val));
      const clampStats = (
        stats: Partial<CharacterStats> | undefined
      ): Partial<CharacterStats> | undefined => {
        if (!stats) return stats;
        const result: Partial<CharacterStats> = {};
        for (const key in stats) {
          const value = stats[key as keyof CharacterStats];
          if (typeof value === "number") {
            result[key as keyof CharacterStats] = clamp(value);
          } else {
            result[key as keyof CharacterStats] = value;
          }
        }
        return result;
      };
      // Deep clamp all numbers in an object/array to 0-255
      function deepClampNumbers(obj: unknown): unknown {
        if (Array.isArray(obj)) {
          return obj.map(deepClampNumbers);
        } else if (obj && typeof obj === "object") {
          const result: Record<string, unknown> = {};
          for (const key in obj as Record<string, unknown>) {
            const value = (obj as Record<string, unknown>)[key];
            if (typeof value === "number") {
              result[key] = Math.max(0, Math.min(255, value));
            } else {
              result[key] = deepClampNumbers(value);
            }
          }
          return result;
        }
        return obj;
      }
      // Clamp inventory and activeMissions deeply
      const clampedInventory = deepClampNumbers(gameState.character.inventory);
      const clampedActiveMissions = deepClampNumbers(
        gameState.character.activeMissions
      );
      // Debug: log the stringified inventory and missions to check for >255 values
      console.log(
        "[DEBUG] clampedInventory:",
        JSON.stringify(clampedInventory)
      );
      console.log(
        "[DEBUG] clampedActiveMissions:",
        JSON.stringify(clampedActiveMissions)
      );
      const stats = gameState.character.stats;
      const clampedStats = {
        level: clamp(stats.level),
        experience: clamp(stats.experience),
        health: clamp(stats.health),
        mana: clamp(stats.mana),
        attack: clamp(stats.attack),
        defense: clamp(stats.defense),
        speed: clamp(stats.speed),
        magic: clamp(stats.magic),
        maxHealth: clamp(stats.maxHealth),
        maxMana: clamp(stats.maxMana),
      };
      // Create custom data for the platform data update (format: [["key", "value"]])
      // Simplified data to avoid character encoding issues
      const customDataArray = [
        ["level", String(clampedStats.level)],
        ["experience", String(clampedStats.experience)],
        ["health", String(clampedStats.health)],
        ["mana", String(clampedStats.mana)],
        ["attack", String(clampedStats.attack)],
        ["defense", String(clampedStats.defense)],
        ["speed", String(clampedStats.speed)],
        ["magic", String(clampedStats.magic)],
        ["maxHealth", String(clampedStats.maxHealth)],
        ["maxMana", String(clampedStats.maxMana)],
        ["completedMissions", gameState.character.completedMissions.join(",")],
        ["currentRealm", gameState.world.currentRealm],
        ["wallet", walletAddress],
      ];

      // Debug: log the custom data being sent
      console.log(
        "[DEBUG] customDataArray:",
        JSON.stringify(customDataArray, null, 2)
      );
      console.log("[DEBUG] customDataArray length:", customDataArray.length);
      console.log("[DEBUG] First few entries:", customDataArray.slice(0, 3));
      console.log(
        "[updateGameState] Profile address:",
        profileAddress,
        "Wallet:",
        walletAddress,
        "AccessToken:",
        token
      );

      // Try using profile update instead of platform data update
      const { createUpdateProfileTransaction: txResponse } =
        await honeycombClient.createUpdateProfileTransaction(
          {
            profile: profileAddress,
            payer: walletAddress,
            info: {
              name: gameState.profile?.info?.name || "Skyward Knight",
              bio:
                gameState.profile?.info?.bio || "Adventurer in Skyward Guilds",
              pfp: gameState.profile?.info?.pfp || "",
            },
            customData: {
              add: customDataArray,
              remove: [], // No keys to remove
            },
          },
          {
            fetchOptions: {
              headers: {
                authorization: `Bearer ${token}`,
              },
            },
          }
        );
      console.log("About to send update profile transaction:", txResponse);
      // Send the transaction
      await sendClientTransactions(honeycombClient, this.wallet, txResponse);
      console.log("Game state updated on-chain successfully!");
    } catch (error) {
      console.error("Error updating game state on-chain:", error);
      // Re-throw the error so the UI can handle it properly
      throw error;
    }
  }

  // Add achievement and XP to profile
  async addAchievement(
    profileAddress: string,
    achievementId: string,
    xpAmount: number = 0
  ): Promise<void> {
    if (!this.wallet.publicKey) throw new Error("Wallet not connected");
    try {
      // Map achievement IDs to numbers (customize as needed)
      const achievementMap: { [key: string]: number } = {
        "first-steps": 0,
        "shadow-hunter": 1,
        "dual-challenger": 2,
        "elite-warrior": 3,
        "master-of-all": 4,
      };
      const achievementIndex = achievementMap[achievementId] ?? 0;
      // Logging for debugging
      console.log(
        "[addAchievement] Profile address:",
        profileAddress,
        "Wallet:",
        this.wallet.publicKey.toBase58()
      );
      // Create platform data update transaction
      const { createUpdatePlatformDataTransaction: txResponse } =
        await honeycombClient.createUpdatePlatformDataTransaction({
          profile: profileAddress,
          authority: PROJECT_AUTHORITY,
          platformData: {
            addXp: xpAmount.toString(),
            addAchievements: [achievementIndex],
            custom: {
              add: [["achievements", achievementId]],
              remove: [],
            },
          },
        });
      console.log(
        "About to send update platform data transaction:",
        txResponse
      );
      // Send the transaction
      await sendClientTransactions(honeycombClient, this.wallet, txResponse);
      console.log(`Achievement ${achievementId} added successfully!`);
    } catch (error) {
      console.error("Error adding achievement on-chain:", error);
    }
  }

  // Helper method to get profile address
  private async getProfileAddress(): Promise<string | null> {
    try {
      const result = await honeycombClient.findProfiles({
        projects: [PROJECT_ID],
      });

      if (result?.profile && result.profile.length > 0) {
        const walletStr = this.wallet.publicKey?.toBase58();
        const first4 = walletStr?.slice(0, 4);
        const uniqueName = first4 ? `Adventurer-${first4}` : undefined;
        const userProfile = result.profile.find((p) => {
          const profile = p as unknown as {
            wallet?: string;
            info?: { wallet?: string; name?: string };
            platformData?: { custom?: { wallet?: string } };
            address?: string;
          };
          return (
            profile.info?.wallet === walletStr ||
            profile.wallet === walletStr ||
            profile.platformData?.custom?.wallet === walletStr ||
            (uniqueName && profile.info?.name === uniqueName)
          );
        });
        if (userProfile) {
          console.log("Matched profile:", userProfile);
          return userProfile.address;
        }
        // Log all profiles for debugging
        console.log("No direct match, profiles:", result.profile);
      }
      return null;
    } catch (error) {
      console.error("Error finding profile:", error);
      return null;
    }
  }

  // Game actions
  async gainExperience(
    amount: number,
    gameState: GameState
  ): Promise<GameState> {
    const newState = { ...gameState };
    newState.character.stats.experience += amount;

    // Check for level up
    const expNeeded = newState.character.stats.level * 100;
    if (newState.character.stats.experience >= expNeeded) {
      newState.character.stats.level += 1;
      newState.character.stats.experience -= expNeeded;
      newState.character.stats.maxHealth += 10;
      newState.character.stats.maxMana += 5;
      newState.character.stats.attack += 2;
      newState.character.stats.defense += 1;
      newState.character.stats.speed += 1;
      newState.character.stats.magic += 1;

      // Restore health and mana on level up
      newState.character.stats.health = newState.character.stats.maxHealth;
      newState.character.stats.mana = newState.character.stats.maxMana;
    }

    // await this.updateGameState(newState); // Only save on-chain after mission/game completion
    return newState;
  }

  async startMission(
    missionId: string,
    gameState: GameState
  ): Promise<GameState> {
    const mission = SAMPLE_MISSIONS.find((m) => m.id === missionId);
    if (!mission) throw new Error("Mission not found");

    const newState = { ...gameState };
    const existingMission = newState.character.activeMissions.find(
      (m) => m.id === missionId
    );

    if (!existingMission) {
      newState.character.activeMissions.push({ ...mission, isActive: true });
    }

    // await this.updateGameState(newState); // Only save on-chain after mission/game completion
    return newState;
  }

  async completeMission(
    profileAddress: string,
    missionId: string,
    gameState: GameState
  ): Promise<GameState> {
    const newState = { ...gameState };
    const missionIndex = newState.character.activeMissions.findIndex(
      (m) => m.id === missionId
    );

    if (missionIndex === -1) throw new Error("Mission not found");

    const mission = newState.character.activeMissions[missionIndex];
    mission.isCompleted = true;
    mission.isActive = false;

    // Apply rewards
    newState.character.stats.experience += mission.rewards.experience;
    if (mission.rewards.items) {
      newState.character.inventory.push(...mission.rewards.items);
    }
    if (mission.rewards.stats) {
      Object.assign(newState.character.stats, mission.rewards.stats);
    }

    newState.character.completedMissions.push(missionId);
    newState.character.activeMissions.splice(missionIndex, 1);

    return newState;
  }

  async addItemToInventory(
    item: InventoryItem,
    gameState: GameState
  ): Promise<GameState> {
    const newState = { ...gameState };
    const existingItem = newState.character.inventory.find(
      (i) => i.id === item.id
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      newState.character.inventory.push(item);
    }

    // await this.updateGameState(newState); // Only save on-chain after mission/game completion
    return newState;
  }

  async useItem(itemId: string, gameState: GameState): Promise<GameState> {
    const newState = { ...gameState };
    const itemIndex = newState.character.inventory.findIndex(
      (i) => i.id === itemId
    );

    if (itemIndex === -1) throw new Error("Item not found");

    const item = newState.character.inventory[itemIndex];
    if (item.quantity <= 1) {
      newState.character.inventory.splice(itemIndex, 1);
    } else {
      item.quantity -= 1;
    }

    // Apply item effects
    if (item.stats) {
      Object.assign(newState.character.stats, item.stats);
    }

    // await this.updateGameState(newState); // Only save on-chain after mission/game completion
    return newState;
  }
}
