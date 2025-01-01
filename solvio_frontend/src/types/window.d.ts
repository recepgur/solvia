declare interface Window {
  solana?: {
    isPhantom?: boolean;
    connect(): Promise<{ publicKey: string }>;
    disconnect(): Promise<void>;
    on(event: string, callback: (result: unknown) => void): void;
    request(params: { method: string }): Promise<{ publicKey: string }>;
  };
  ethereum?: {
    isMetaMask?: boolean;
    isCoinbaseWallet?: boolean;
    request(params: { method: string; params?: unknown[] }): Promise<unknown>;
    on(event: string, callback: (result: unknown) => void): void;
    removeListener(event: string, callback: (result: unknown) => void): void;
    selectedAddress: string | null;
    chainId: string;
    enable(): Promise<string[]>;
  };
  trustwallet?: {
    solana?: {
      connect(): Promise<{ publicKey: string }>;
      disconnect(): Promise<void>;
    };
    ethereum?: {
      request(params: { method: string; params?: unknown[] }): Promise<unknown>;
      selectedAddress: string | null;
    };
  };
  coinbaseWalletExtension?: {
    isConnected: boolean;
    connect(): Promise<{ address: string }>;
    disconnect(): Promise<void>;
  };
}
