import { create } from 'zustand';
import { clusterApiUrl } from '@solana/web3.js';
import { StateCreator } from 'zustand';

interface NetworkStore {
  network: string;
  customEndpoint: string | null;
  setNetwork: (network: string) => void;
  setCustomEndpoint: (endpoint: string | null) => void;
}

const createNetworkStore: StateCreator<NetworkStore> = (set) => ({
  network: import.meta.env.VITE_SOLANA_NETWORK || clusterApiUrl('devnet'),
  customEndpoint: null,
  setNetwork: (network: string) => set({ network }),
  setCustomEndpoint: (endpoint: string | null) => set({ customEndpoint: endpoint }),
});

export const useNetworkStore = create<NetworkStore>()(createNetworkStore);
