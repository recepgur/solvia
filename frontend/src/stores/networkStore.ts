import create from 'zustand';
import { clusterApiUrl } from '@solana/web3.js';

interface NetworkStore {
  network: string;
  setNetwork: (network: string) => void;
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  network: process.env.VITE_SOLANA_NETWORK || clusterApiUrl('mainnet-beta'),
  setNetwork: (network: string) => set({ network }),
}));
