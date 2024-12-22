import { create } from 'zustand';
import { clusterApiUrl } from '@solana/web3.js';
import { StateCreator } from 'zustand';

// Parse RPC endpoints from environment
const getRPCEndpoints = (): string[] => {
  const envEndpoints = import.meta.env.VITE_SOLANA_RPC_ENDPOINTS?.split(',') || [];
  const defaultEndpoints = [
    clusterApiUrl('devnet'),
    'https://rpc.ankr.com/solana_devnet',
    'https://solana-devnet.g.alchemy.com'
  ];
  return [...new Set([...envEndpoints, ...defaultEndpoints])];
};

interface NetworkStore {
  network: string;
  rpcEndpoints: string[];
  currentEndpointIndex: number;
  customEndpoint: string | null;
  setNetwork: (network: string) => void;
  setCustomEndpoint: (endpoint: string | null) => void;
  rotateEndpoint: () => void;
  getCurrentEndpoint: () => string;
}

const createNetworkStore: StateCreator<NetworkStore> = (set, get) => ({
  network: import.meta.env.VITE_SOLANA_NETWORK || 'devnet',
  rpcEndpoints: getRPCEndpoints(),
  currentEndpointIndex: 0,
  customEndpoint: null,
  setNetwork: (network: string) => set({ network }),
  setCustomEndpoint: (endpoint: string | null) => set({ customEndpoint: endpoint }),
  rotateEndpoint: () => set((state) => ({
    currentEndpointIndex: (state.currentEndpointIndex + 1) % state.rpcEndpoints.length
  })),
  getCurrentEndpoint: () => {
    const state = get();
    return state.customEndpoint || state.rpcEndpoints[state.currentEndpointIndex];
  }
});

export const useNetworkStore = create<NetworkStore>()(createNetworkStore);
