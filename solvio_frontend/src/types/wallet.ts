export type WalletType = 'phantom' | 'metamask' | 'trustwallet' | 'coinbase' | 'solflare';

export enum WalletErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  DISCONNECT_ERROR = 'DISCONNECT_ERROR',
  NFT_VERIFICATION_ERROR = 'NFT_VERIFICATION_ERROR',
  CHAIN_SWITCH_ERROR = 'CHAIN_SWITCH_ERROR',
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  NOT_INSTALLED = 'NOT_INSTALLED',
  USER_REJECTED = 'USER_REJECTED',
  ALREADY_CONNECTED = 'ALREADY_CONNECTED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNSUPPORTED_CHAIN = 'UNSUPPORTED_CHAIN',
  UNKNOWN = 'UNKNOWN'
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  hasNFTAccess: boolean;
  chainId?: string;
  nftMintAddress?: string;
}

export type Environment = {
  userAgent: string;
  isInAppBrowser: boolean;
  isBrave: boolean;
  browserChecks: {
    trust: boolean;
    metamask: boolean;
    coinbase: boolean;
    phantom: boolean;
    solflare: boolean;
  };
  providerChecks: {
    ethereum: boolean;
    solana: boolean;
    solflare: boolean;
    trust: boolean;
    coinbase: boolean;
  };
};

export interface WalletError {
  type: WalletErrorType;
  message: string;
  walletType: WalletType;
}

export interface WalletInfo {
  type: WalletType;
  name: string;
  icon: JSX.Element;
  installed: boolean;
  installUrl: string;
  supportedChains: string[];
}

export type ErrorMessageFn = (walletType: WalletType) => string;
export type ErrorMessage = string | ErrorMessageFn;

export interface WalletConnectProps {
  onConnect?: (address: string, walletType: WalletType) => void;
  onError?: (error: WalletError) => void;
  onDisconnect?: () => void;
  nftMintAddress?: string;
}
