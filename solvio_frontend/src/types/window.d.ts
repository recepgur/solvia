interface SolanaRequestParams {
  method: string;
}

interface SolanaConnectRequest extends SolanaRequestParams {
  method: 'connect';
}

interface EthereumRequestParams {
  method: string;
  params?: unknown[];
}

interface EthChainIdRequest extends EthereumRequestParams {
  method: 'eth_chainId';
}

interface EthAccountsRequest extends EthereumRequestParams {
  method: 'eth_requestAccounts';
}

declare interface Window {
  solana?: {
    isPhantom?: boolean;
    isSolflare?: boolean;
    connect(): Promise<{ publicKey: string }>;
    disconnect(): Promise<void>;
    on(event: string, callback: (result: unknown) => void): void;
    request(params: SolanaConnectRequest): Promise<{ publicKey: string }>;
    request(params: SolanaRequestParams): Promise<{ publicKey: string }>;
    provider?: {
      isPhantom?: boolean;
      isSolflare?: boolean;
    };
  };
  ethereum?: {
    isMetaMask?: boolean;
    isCoinbaseWallet?: boolean;
    isTrust?: boolean;
    isBraveWallet?: boolean;
    provider?: {
      isMetaMask?: boolean;
      isCoinbaseWallet?: boolean;
      isTrust?: boolean;
      isBraveWallet?: boolean;
    };
    request(params: EthChainIdRequest): Promise<string>;
    request(params: EthAccountsRequest): Promise<string[]>;
    request(params: EthereumRequestParams): Promise<unknown>;
    on(event: 'chainChanged' | 'accountsChanged' | string, callback: (result: unknown) => void): void;
    removeListener(event: 'chainChanged' | 'accountsChanged' | string, callback: (result: unknown) => void): void;
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
      request(params: EthereumRequestParams): Promise<unknown>;
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
    request(params: SolanaConnectRequest): Promise<{ publicKey: string }>;
    request(params: SolanaRequestParams): Promise<{ publicKey: string }>;
  };
}
