declare interface Window {
  solana?: {
    isPhantom?: boolean;
    isSolflare?: boolean;
    connect(): Promise<{ publicKey: string }>;
    disconnect(): Promise<void>;
    on(event: string, callback: (result: unknown) => void): void;
    request(params: { method: string }): Promise<{ publicKey: string }>;
    provider?: {
      isPhantom?: boolean;
      isSolflare?: boolean;
    };
  };
  ethereum?: {
    isMetaMask?: boolean;
    isCoinbaseWallet?: boolean;
    isTrust?: boolean;
    provider?: {
      isMetaMask?: boolean;
      isCoinbaseWallet?: boolean;
      isTrust?: boolean;
    };
    request(params: { method: string; params?: unknown[] }): Promise<unknown>;
    on(event: string, callback: (result: unknown) => void): void;
    removeListener(event: string, callback: (result: unknown) => void): void;
    selectedAddress: string | null;
    chainId: string;
    enable(): Promise<string[]>;
  };
  trustwallet?: {
    isTrust?: boolean;
    solana?: {
      connect(): Promise<{ publicKey: string }>;
      disconnect(): Promise<void>;
      isTrust?: boolean;
    };
    ethereum?: {
      request(params: { method: string; params?: unknown[] }): Promise<unknown>;
      selectedAddress: string | null;
      isTrust?: boolean;
    };
  };
  coinbaseWalletExtension?: {
    isConnected: boolean;
    connect(): Promise<{ address: string }>;
    disconnect(): Promise<void>;
  };
  solflare?: {
    isSolflare?: boolean;
    connect(): Promise<{ publicKey: string }>;
    disconnect(): Promise<void>;
    request(params: { method: string }): Promise<{ publicKey: string }>;
  };
  WalletLink?: {
    isConnected: boolean;
    connect(): Promise<{ address: string }>;
    disconnect(): Promise<void>;
  };
}
