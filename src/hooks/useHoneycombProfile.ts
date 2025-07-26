import { useQuery, useQueryClient } from "@tanstack/react-query";
import { honeycombClient, PROJECT_ID } from "@/lib/honeycombClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { sendClientTransactions } from "@honeycomb-protocol/edge-client/client/walletHelpers";

// Define a minimal Profile type for type safety
interface Profile {
  address?: string;
  info?: { wallet?: string; name?: string; bio?: string; pfp?: string };
  wallet?: string;
  platformData?: {
    xp?: number;
    achievements?: string[];
    custom?: Record<string, string>;
  };
  userId?: number;
  customData?: [string, string][];
}

function parseProfile(raw: unknown): Profile {
  const r = raw as {
    platformData?: {
      xp?: string | number;
      achievements?: string[];
      custom?: Record<string, string>;
    };
    info?: { wallet?: string; name?: string; bio?: string; pfp?: string };
    wallet?: string;
  };
  const xp = r.platformData?.xp;
  return {
    ...r,
    platformData: {
      ...r.platformData,
      xp: xp !== undefined ? Number(xp) : undefined,
    },
  };
}

export const PROJECT_AUTHORITY = "FD7MWBjwqRH41KmdnXiHNqdUMnjLHpXGCyZnXosVHcR";

export function useHoneycombProfile() {
  const wallet = useWallet();
  const queryClient = useQueryClient();

  return useQuery<Profile | null>({
    queryKey: ["honeycomb-profile", wallet.publicKey?.toBase58()],
    enabled: !!wallet.publicKey,
    queryFn: async () => {
      try {
        if (!wallet.publicKey) return null;
        const result = await honeycombClient.findProfiles({
          projects: [PROJECT_ID],
        });
        console.log("Debug - Found profiles:", result?.profile);
        if (result?.profile) {
          console.log("Debug - All profile wallet fields:");
          (result.profile as unknown as Profile[])
            .map(parseProfile)
            .forEach((p, i) => {
              // console.log(
              //   `Profile[${i}]: address=${p.address}, wallet=${p.wallet}, info.wallet=${p.info?.wallet}, custom.wallet=${p.platformData?.custom?.wallet}`
              // );
            });
        }
        console.log("Debug - Looking for wallet:", wallet.publicKey.toBase58());
        let profile =
          (result?.profile as unknown as Profile[] | undefined)
            ?.map(parseProfile)
            .find(
              (p) =>
                p.info?.wallet === wallet.publicKey.toBase58() ||
                p.wallet === wallet.publicKey.toBase58() ||
                p.platformData?.custom?.wallet ===
                  wallet.publicKey.toBase58() ||
                // Also check if the profile name matches our naming pattern
                (p.info?.name &&
                  p.info.name.startsWith("Adventurer-") &&
                  p.info.name.endsWith(wallet.publicKey.toBase58().slice(0, 4)))
            ) ?? null;
        console.log("Debug - Matched profile:", profile);

        // If no profile, create one automatically
        if (!profile) {
          console.log(
            "Debug - No profile found, creating new user and profile..."
          );
          try {
            // Generate a random Dicebear avatar
            const walletBase58 = wallet.publicKey.toBase58();
            const first4 = walletBase58.slice(0, 4);
            const pfp = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${walletBase58}`;
            const name = `Adventurer-${first4}`;
            const bio = "Skyward Guilds explorer";

            // Create user and profile
            const { createNewUserWithProfileTransaction: txResponse } =
              await honeycombClient.createNewUserWithProfileTransaction({
                project: PROJECT_ID,
                wallet: walletBase58,
                payer: walletBase58,
                profileIdentity: "main",
                userInfo: { name, bio, pfp },
              });
            // Sign and send the transaction
            await sendClientTransactions(honeycombClient, wallet, txResponse);
            console.log(
              "Profile created, now searching for profile by unique name..."
            );

            // Fetch all profiles and find the one with the unique name, with retry loop
            let newProfile = null;
            for (let attempt = 1; attempt <= 10; attempt++) {
              const afterCreate = await honeycombClient.findProfiles({
                projects: [PROJECT_ID],
              });
              newProfile = (
                afterCreate?.profile as unknown as Profile[] | undefined
              )
                ?.map(parseProfile)
                .find((p) => p.info?.name === name);
              if (newProfile && newProfile.address) {
                console.log(
                  `Profile found by unique name after creation on attempt ${attempt}`
                );
                break;
              }
              console.log(
                `Profile not found by unique name after creation, retrying (${attempt}/10)...`
              );
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
            if (newProfile && newProfile.address) {
              // Immediately update the profile to add wallet address to custom data using platform data update and project authority
              const { createUpdatePlatformDataTransaction: updateTx } =
                await honeycombClient.createUpdatePlatformDataTransaction({
                  profile: newProfile.address,
                  authority: PROJECT_AUTHORITY,
                  platformData: {
                    custom: {
                      add: [["wallet", walletBase58]],
                      remove: [],
                    },
                  },
                });
              await sendClientTransactions(honeycombClient, wallet, updateTx);
              console.log(
                "Custom data updated with wallet address using project authority!"
              );
            } else {
              console.warn(
                "Could not find new profile by unique name after creation and retries."
              );
            }
          } catch (createError) {
            // If user already exists with profile, just refetch
            if (
              createError.message?.includes("User already exists with profile")
            ) {
              console.log("User already exists with profile, refetching...");
            } else {
              throw createError;
            }
          }

          // Refetch profile after creation and update
          await queryClient.invalidateQueries({
            queryKey: ["honeycomb-profile", wallet.publicKey.toBase58()],
          });
          // Try fetching again
          const newResult = await honeycombClient.findProfiles({
            projects: [PROJECT_ID],
          });
          profile =
            (newResult?.profile as unknown as Profile[] | undefined)
              ?.map(parseProfile)
              .find(
                (p) =>
                  p.info?.wallet === wallet.publicKey.toBase58() ||
                  p.wallet === wallet.publicKey.toBase58() ||
                  p.platformData?.custom?.wallet === wallet.publicKey.toBase58()
              ) ?? null;
        }
        // Attach customData as [key, value] array for parseGameState compatibility
        if (profile && profile.platformData?.custom) {
          profile.customData = Object.entries(profile.platformData.custom);
        }
        return profile;
      } catch (err) {
        console.error("Error fetching or creating Honeycomb profile:", err);
        throw err;
      }
    },
  });
}
