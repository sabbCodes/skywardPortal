# Skyward Guilds

**Skyward Guilds** is an on-chain RPG game MVP built for the Honeycomb Protocol bounty. It features on-chain progression, player traits, and mission logic, all powered by the Honeycomb Protocol on Solana. Play, progress, and save your adventure on-chain!

---

## Table of Contents

- [Features](#features)
- [Game Concepts](#game-concepts)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Development](#development)
- [Honeycomb Protocol Integration](#honeycomb-protocol-integration)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **On-chain progression:** All player stats, inventory, and mission progress are stored on Solana via Honeycomb Protocol.
- **Solana wallet integration:** Connect with Phantom or Solflare.
- **Turn-based combat:** Fight enemies, gain XP, and collect loot.
- **Mission system:** Complete missions to unlock new content and rewards.
- **Event-driven UI:** Modern, animated UI with real-time feedback.
- **Save on-chain:** Save your progress to the blockchain with a single click.

---

## Game Concepts

- **Character Stats:** Level, experience, health, mana, attack, defense, speed, magic.
- **Inventory:** Collect weapons, materials, consumables, and trophies.
- **Missions:** Progress through a chain of missions, each with unique requirements and rewards.
- **Combat:** Turn-based battles with enemies, including critical hits, misses, and AI.
- **On-chain Profile:** Your game profile and progress are stored on-chain using Honeycomb Protocol.
- **Save Progress:** All gameplay is local until you choose to save on-chain (requires wallet signature).

---

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **UI:** Tailwind CSS, shadcn/ui, Lucide icons
- **Solana:** @solana/wallet-adapter, @honeycomb-protocol/edge-client
- **State Management:** React Query
- **On-chain:** Honeycomb Protocol (Solana devnet/mainnet)

---

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Yarn or npm
- A Solana wallet (Phantom or Solflare extension)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/skyward-guilds.git
   cd skyward-guilds
   ```

2. **Install dependencies:**

   ```bash
   yarn install
   # or
   npm install
   ```

3. **Start the development server:**

   ```bash
   yarn dev
   # or
   npm run dev
   ```

```

```

4. **Open in your browser:**

```

http://localhost:8080

```

---

## Development

- **Connect your wallet** (Phantom or Solflare) to start playing.
- **Play the game:** Complete missions, fight enemies, and collect loot.
- **Save Progress:** Click the "Save Progress" button after a victory/defeat to persist your progress on-chain (requires wallet signature).
- **Switch wallets:** Refresh the page after switching wallets to avoid context issues.

---

## Honeycomb Protocol Integration

- **On-chain storage:** All player data is stored in a Honeycomb profile on Solana.
- **Authentication:** Uses Honeycomb Edge Client's `authRequest` and `authConfirm` for secure API calls.
- **Saving:** Only the "Save Progress" button triggers an on-chain write and wallet signature.
- **Devnet endpoint:** Uses `https://rpc.test.honeycombprotocol.com` by default.

---

## Troubleshooting

- **Wallet not connected error:**

- Make sure your wallet is connected and unlocked.
- Refresh the page after switching wallets.
- If you see a wallet popup, do not close it until you've signed.

- **No wallet signature popup:**

- Only appears when you click "Save Progress".

- **On-chain save fails:**
- Check your wallet connection.
- Make sure you have devnet SOL for transaction fees.

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License

[MIT](LICENSE)

---

**For more details, see the code and comments in each file.**

```

```
