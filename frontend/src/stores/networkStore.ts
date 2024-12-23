import { create } from 'zustand';
import { clusterApiUrl } from '@solana/web3.js';
import { StateCreator } from 'zustand';

// Parse RPC endpoints from environment
const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const getRPCEndpoints = async (): Promise<string[]> => {
  console.log('Initializing RPC endpoints...');
  
  const envEndpoints = (import.meta.env.VITE_SOLANA_RPC_ENDPOINTS?.split(',') || [])
    .map((url: string) => url.trim())
    .filter(isValidUrl);
    
  const defaultEndpoints = [
    clusterApiUrl('devnet'),
    'https://api.devnet.solana.com',
    'https://rpc.ankr.com/solana_devnet',
    'https://solana-devnet.g.alchemy.com/v2/demo'
  ].filter(isValidUrl);
  
  const allEndpoints = [...new Set([...envEndpoints, ...defaultEndpoints])];
  console.log('Available RPC endpoints:', allEndpoints);

  // Test each endpoint's health
  const healthyEndpoints = await Promise.all(
    allEndpoints.map(async (endpoint) => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getHealth'
          })
        });
        
        if (response.ok) {
          console.log(`RPC endpoint healthy: ${endpoint}`);
          return endpoint;
        }
        console.warn(`RPC endpoint unhealthy: ${endpoint}`);
        return null;
      } catch (error) {
        console.error(`RPC endpoint error: ${endpoint}`, error);
        return null;
      }
    })
  ).then(endpoints => endpoints.filter(Boolean) as string[]);

  if (healthyEndpoints.length === 0) {
    console.error('No healthy RPC endpoints found!');
    // Return all endpoints as fallback
    return allEndpoints;
  }

  console.log('Healthy RPC endpoints:', healthyEndpoints);
  return healthyEndpoints;
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

const createNetworkStore: StateCreator<NetworkStore> = (set, get) => {
  // Initialize with validated default endpoint
  const defaultEndpoint = 'https://api.devnet.solana.com';
  
  const store = {
    network: import.meta.env.VITE_SOLANA_NETWORK || 'devnet',
    rpcEndpoints: [defaultEndpoint], // Start with a known valid endpoint
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
  };

  // Initialize endpoints asynchronously
  getRPCEndpoints().then(endpoints => {
    if (endpoints.length > 0) {
      set({ rpcEndpoints: endpoints });
    }
  }).catch(error => {
    console.error('Failed to initialize RPC endpoints:', error);
  });

  return store;
};

export const useNetworkStore = create<NetworkStore>()(createNetworkStore);
