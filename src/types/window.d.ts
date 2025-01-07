interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request?: (...args: any[]) => Promise<any>;
  };
  solana?: {
    isPhantom?: boolean;
    connect?: () => Promise<{ publicKey: string }>;
    disconnect?: () => Promise<void>;
  };
}
