import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

// Custom wrapper to override default WalletMultiButton styles
const CustomWalletConnect = () => {
  const { connected } = useWallet();

  return (
    <div className="relative">
      <WalletMultiButton
        className={`
          bg-gradient-to-r from-cyan-500 to-purple-500
          hover:from-cyan-600 hover:to-purple-600
          text-white font-semibold px-6 py-3 rounded-lg flex items-center space-x-2 shadow-lg transition-all duration-300
          ${connected ? "pl-4 pr-4" : "animate-pulse"}
        `}
        style={{
          minWidth: 0,
          boxShadow: "0 4px 24px 0 rgba(56, 189, 248, 0.15)",
        }}
      />
    </div>
  );
};

export default CustomWalletConnect;
