import { honeycombClient } from "./honeycombClient";
import { sendClientTransactions } from "@honeycomb-protocol/edge-client/client/walletHelpers";
import { WalletContextState } from "@solana/wallet-adapter-react";

export async function createHoneycombProject(wallet: WalletContextState) {
  if (!wallet.publicKey) throw new Error("Wallet not connected");
  const authority = wallet.publicKey.toBase58();
  const payer = authority;
  const name = "Skyward Guilds";
  const profileDataConfig = {
    achievements: ["Pioneer"],
    customDataFields: ["NFTs owned"],
  };

  const {
    createCreateProjectTransaction: { project: projectAddress, tx: txResponse },
  } = await honeycombClient.createCreateProjectTransaction({
    name,
    authority,
    payer,
    profileDataConfig,
  });

  await sendClientTransactions(honeycombClient, wallet, txResponse);

  console.log("Honeycomb Project Created! Project Address:", projectAddress);
  return projectAddress;
}
