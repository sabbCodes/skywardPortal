import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { useHoneycombProfile } from "./useHoneycombProfile";
import {
  GameService,
  DEFAULT_STATS,
  SAMPLE_MISSIONS,
} from "@/services/gameService";
import { GameState, Mission, InventoryItem } from "@/types/game";
import { useState, useEffect, useRef, useMemo } from "react";
import { honeycombClient } from "@/lib/honeycombClient";
import base58 from "bs58";

export function useGameState() {
  const wallet = useWallet();
  const { data: profile, isLoading: profileLoading } = useHoneycombProfile();
  const queryClient = useQueryClient();
  const gameService = useMemo(() => new GameService(wallet), [wallet]);
  const accessTokenRef = useRef<string | null>(null);

  // Helper to get or refresh access token
  const getAccessToken = async () => {
    if (accessTokenRef.current) return accessTokenRef.current;
    if (!wallet.publicKey || !wallet.signMessage)
      throw new Error("Wallet not connected or does not support signMessage");
    // 1. Request auth message
    const {
      authRequest: { message: authRequest },
    } = await honeycombClient.authRequest({
      wallet: wallet.publicKey.toBase58(),
    });
    // 2. User signs the message
    const encodedMessage = new TextEncoder().encode(authRequest);
    const signedUIntArray = await wallet.signMessage(encodedMessage);
    const signature = base58.encode(signedUIntArray);
    // 3. Confirm auth and get access token
    const { authConfirm } = await honeycombClient.authConfirm({
      wallet: wallet.publicKey.toBase58(),
      signature,
    });
    accessTokenRef.current = authConfirm.accessToken;
    return accessTokenRef.current;
  };

  // Get game state from profile
  const { data: gameState, isLoading: gameStateLoading } = useQuery<GameState>({
    queryKey: ["game-state", wallet.publicKey?.toBase58()],
    enabled: !!profile && !!wallet.publicKey,
    queryFn: () => {
      if (!profile) throw new Error("No profile found");
      return gameService.parseGameState(profile);
    },
  });

  // Update game state mutation
  const updateGameStateMutation = useMutation({
    mutationFn: async (newState: GameState) => {
      console.log("[DEBUG] updateGameStateMutation called", newState);
      if (!profile || !profile.address) throw new Error("No profile address");
      const accessToken = await getAccessToken();
      await gameService.updateGameState(profile.address, newState, accessToken);
      return newState;
    },
    onSuccess: (newState) => {
      console.log("[DEBUG] updateGameStateMutation onSuccess", newState);
      // Update the local cache with the newly saved state instead of invalidating
      queryClient.setQueryData(
        ["game-state", wallet.publicKey?.toBase58()],
        newState
      );
      // Only invalidate the profile query to refresh the profile data
      queryClient.invalidateQueries({
        queryKey: ["honeycomb-profile", wallet.publicKey?.toBase58()],
      });
    },
    onError: (error) => {
      console.error("[ERROR] updateGameStateMutation failed", error);
    },
  });

  // Game actions
  const gainExperienceMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!gameState) throw new Error("No game state");
      return await gameService.gainExperience(amount, gameState);
    },
    onSuccess: (newState) => {
      queryClient.setQueryData(
        ["game-state", wallet.publicKey?.toBase58()],
        newState
      );
    },
  });

  const startMissionMutation = useMutation({
    mutationFn: async (missionId: string) => {
      if (!gameState) throw new Error("No game state");
      return await gameService.startMission(missionId, gameState);
    },
    onSuccess: (newState) => {
      queryClient.setQueryData(
        ["game-state", wallet.publicKey?.toBase58()],
        newState
      );
    },
  });

  const completeMissionMutation = useMutation({
    mutationFn: async (missionId: string) => {
      console.log("[DEBUG] completeMissionMutation called", missionId);
      if (!gameState) throw new Error("No game state");
      if (!profile || !profile.address) throw new Error("No profile address");
      // Only update local state, do not call getAccessToken or update on-chain here
      return await gameService.completeMission(
        profile.address,
        missionId,
        gameState
      );
    },
    onSuccess: (newState) => {
      console.log("[DEBUG] completeMissionMutation onSuccess", newState);
      queryClient.setQueryData(
        ["game-state", wallet.publicKey?.toBase58()],
        newState
      );
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: InventoryItem) => {
      if (!gameState) throw new Error("No game state");
      return await gameService.addItemToInventory(item, gameState);
    },
    onSuccess: (newState) => {
      queryClient.setQueryData(
        ["game-state", wallet.publicKey?.toBase58()],
        newState
      );
    },
  });

  const useItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (!gameState) throw new Error("No game state");
      return await gameService.useItem(itemId, gameState);
    },
    onSuccess: (newState) => {
      queryClient.setQueryData(
        ["game-state", wallet.publicKey?.toBase58()],
        newState
      );
    },
  });

  // Available missions (not yet started)
  const availableMissions = SAMPLE_MISSIONS.filter(
    (mission) =>
      !gameState?.character.activeMissions.find((m) => m.id === mission.id) &&
      !gameState?.character.completedMissions.includes(mission.id)
  );

  // Check if player meets mission requirements
  const canStartMission = (mission: Mission) => {
    if (!gameState) return false;

    if (
      mission.requirements.level &&
      gameState.character.stats.level < mission.requirements.level
    ) {
      return false;
    }

    if (mission.requirements.items) {
      const hasItems = mission.requirements.items.every((itemId) =>
        gameState.character.inventory.some((item) => item.id === itemId)
      );
      if (!hasItems) return false;
    }

    return true;
  };

  // Listen for mission completion events from gameplay
  useEffect(() => {
    const handleCompleteMission = (event: CustomEvent) => {
      const { missionId } = event.detail;
      console.log("[DEBUG] handleCompleteMission event", missionId);
      if (gameState && missionId) {
        completeMissionMutation.mutate(missionId);
      }
    };

    const handleStartMission = (event: CustomEvent) => {
      const { missionId } = event.detail;
      console.log("[DEBUG] handleStartMission event", missionId);
      if (gameState && missionId) {
        startMissionMutation.mutate(missionId);
      }
    };

    window.addEventListener("completeMission", handleCompleteMission);
    window.addEventListener("startMission", handleStartMission);
    return () => {
      window.removeEventListener("completeMission", handleCompleteMission);
      window.removeEventListener("startMission", handleStartMission);
    };
  }, [gameState, completeMissionMutation, startMissionMutation]);

  return {
    // Data
    gameState,
    profile,
    availableMissions,

    // Loading states
    isLoading: profileLoading || gameStateLoading,

    // Mutations
    updateGameState: updateGameStateMutation, // Return the full mutation object
    gainExperience: gainExperienceMutation.mutate,
    startMission: startMissionMutation.mutate,
    completeMission: completeMissionMutation.mutate,
    addItem: addItemMutation.mutate,
    useItem: useItemMutation.mutate,

    // Utilities
    canStartMission,
    isUpdating: updateGameStateMutation.isPending,
    isGainingExperience: gainExperienceMutation.isPending,
    isStartingMission: startMissionMutation.isPending,
    isCompletingMission: completeMissionMutation.isPending,
    isAddingItem: addItemMutation.isPending,
    isUsingItem: useItemMutation.isPending,
    updateGameStateError: updateGameStateMutation.error,
  };
}
