import { IChainWallet } from './IChainWallet';
import solanaWallet from './solanaWallet';
import ethWallet from './ethWallet';
import btcWallet from './btcWallet';

export type ChainType = "solana" | "ethereum" | "bitcoin";

export function getChainWallet(chain: ChainType): IChainWallet {
  switch (chain) {
    case "ethereum":
      return ethWallet;
    case "bitcoin":
      return btcWallet;
    default:
      return solanaWallet;
  }
}

export function getTokenSymbol(chain: ChainType): string {
  switch (chain) {
    case "ethereum":
      return "ETH";
    case "bitcoin":
      return "BTC";
    default:
      return "SOLV";
  }
}

export function formatAddress(chain: ChainType, address: string): string {
  if (!address) return "";
  
  // Truncate long addresses for display
  if (address.length > 12) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  return address;
}
