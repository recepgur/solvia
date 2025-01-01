import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, AlertCircle, ExternalLink } from 'lucide-react';
import { NFTInput } from './NFTInput';

type WalletType = 'phantom' | 'metamask' | 'trustwallet' | 'coinbase';

type WalletErrorType = 
  | 'not_installed'
  | 'user_rejected'
  | 'already_connected'
  | 'network_error'
  | 'unsupported_chain'
  | 'unknown';

interface WalletError {
  type: WalletErrorType;
  message: string;
  walletType: WalletType;
}

interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId?: string | number;
  balance?: string;
  hasNFTAccess?: boolean;
  nftMintAddress?: string;
}

interface WalletInfo {
  name: string;
  type: WalletType;
  icon: React.ReactNode;
  installed: boolean;
  installUrl: string;
  supportedChains: string[];
}

interface WalletConnectProps {
  onConnect: (address: string, walletType: WalletType) => void;
  onError?: (error: WalletError) => void;
  onDisconnect?: () => void;
}

export function WalletConnect({ onConnect, onError, onDisconnect }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<WalletType | null>(null);
  const [error, setError] = useState<WalletError | null>(null);
  const [nftMintAddress, setNftMintAddress] = useState<string>('');
  const [walletStates, setWalletStates] = useState<Record<WalletType, WalletState>>({
    phantom: { isConnected: false, address: null, hasNFTAccess: false },
    metamask: { isConnected: false, address: null, hasNFTAccess: false },
    trustwallet: { isConnected: false, address: null, hasNFTAccess: false },
    coinbase: { isConnected: false, address: null, hasNFTAccess: false },
  });

  // Function to check if wallets are installed
  const checkWalletAvailability = (): WalletInfo[] => {
    const isPhantomInstalled = typeof window !== 'undefined' && 
      window.solana?.isPhantom === true;
    
    const isMetaMaskInstalled = typeof window !== 'undefined' && 
      window.ethereum?.isMetaMask === true;
    
    const isTrustWalletInstalled = typeof window !== 'undefined' && 
      window.trustwallet !== undefined;
    
    const isCoinbaseWalletInstalled = typeof window !== 'undefined' && 
      (window.coinbaseWalletExtension !== undefined || window.ethereum?.isCoinbaseWallet === true);

    return [
      {
        name: 'Phantom',
        type: 'phantom',
        icon: (
          <svg viewBox="0 0 128 128" className="w-5 h-5">
            <path d="M64 0C28.7 0 0 28.7 0 64s28.7 64 64 64c11.2 0 21.7-2.9 30.8-7.9L48.4 55.3v36.6h-6.8V41.8h6.8l50.5 75.8C116.4 106.2 128 86.5 128 64c0-35.3-28.7-64-64-64zm22.1 84.6l-7.5-11.3V41.8h7.5v42.8z" fill="currentColor"/>
          </svg>
        ),
        installed: isPhantomInstalled,
        installUrl: 'https://phantom.app/',
        supportedChains: ['solana']
      },
      {
        name: 'MetaMask',
        type: 'metamask',
        icon: (
          <svg viewBox="0 0 318 318" className="w-5 h-5">
            <path d="M274.1 35.5l-99.5 73.9L193 65.8z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M44.4 35.5l98.7 74.6-17.5-44.3zm193.9 171.3l-26.5 40.6 56.7 15.6 16.3-55.3zm-204.4.9l16.2 55.3 56.7-15.6-26.5-40.6z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
        installed: isMetaMaskInstalled,
        installUrl: 'https://metamask.io/download/',
        supportedChains: ['ethereum', 'polygon', 'bsc']
      },
      {
        name: 'Trust Wallet',
        type: 'trustwallet',
        icon: (
          <svg viewBox="0 0 1024 1024" className="w-5 h-5">
            <path d="M512 0C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0zm244.6 437.2L512 731.8 267.4 437.2c-23.5-28.2-23.5-69.2 0-97.4 23.5-28.2 61.6-28.2 85.1 0L512 522.3l159.5-182.5c23.5-28.2 61.6-28.2 85.1 0 23.5 28.2 23.5 69.2 0 97.4z" fill="currentColor"/>
          </svg>
        ),
        installed: isTrustWalletInstalled,
        installUrl: 'https://trustwallet.com/download',
        supportedChains: ['ethereum', 'solana', 'bsc']
      },
      {
        name: 'Coinbase Wallet',
        type: 'coinbase',
        icon: (
          <svg viewBox="0 0 1024 1024" className="w-5 h-5">
            <path d="M512 0C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0zm0 745.7c-128.7 0-233.7-105-233.7-233.7s105-233.7 233.7-233.7 233.7 105 233.7 233.7-105 233.7-233.7 233.7z" fill="currentColor"/>
          </svg>
        ),
        installed: isCoinbaseWalletInstalled,
        installUrl: 'https://www.coinbase.com/wallet/downloads',
        supportedChains: ['ethereum', 'polygon', 'solana']
      }
    ];
  };

  const handleDisconnect = async (walletType: WalletType) => {
    try {
      switch (walletType) {
        case 'phantom':
          if (window.solana) {
            await window.solana.disconnect();
          }
          break;
        
        case 'metamask':
          if (window.ethereum?.isMetaMask) {
            // MetaMask doesn't have a disconnect method
            // We just clear the state
          }
          break;
        
        case 'trustwallet':
          if (window.trustwallet?.solana) {
            await window.trustwallet.solana.disconnect();
          }
          break;
        
        case 'coinbase':
          if (window.coinbaseWalletExtension) {
            await window.coinbaseWalletExtension.disconnect();
          }
          break;
      }

      setWalletStates(prev => ({
        ...prev,
        [walletType]: {
          ...prev[walletType],
          isConnected: false,
          address: null
        }
      }));
      
      onDisconnect?.();
    } catch (error) {
      console.error(`Failed to disconnect ${walletType}:`, error);
      const walletError: WalletError = {
        type: 'unknown',
        message: `Failed to disconnect from ${walletType}. Please try again.`,
        walletType
      };
      setError(walletError);
      onError?.(walletError);
    }
  };

  const handleConnect = async (walletType: WalletType) => {
    // Don't connect if already connected
    if (walletStates[walletType].isConnected) {
      const walletError: WalletError = {
        type: 'already_connected',
        message: `${walletType} is already connected.`,
        walletType
      };
      setError(walletError);
      onError?.(walletError);
      return;
    }

    setIsConnecting(true);
    setConnectingWallet(walletType);
    setError(null);

    try {
      let address: string | null = null;

      switch (walletType) {
        case 'phantom':
          if (window.solana) {
            try {
              await window.solana.connect();
              const response = await window.solana.request({ method: 'connect' });
              address = response.publicKey;
            } catch (err: unknown) {
              if ((err as { code?: number }).code === 4001) {
                throw { type: 'user_rejected', message: 'User rejected the connection request' };
              }
              throw err;
            }
          }
          break;
        
        case 'metamask':
          if (window.ethereum?.isMetaMask) {
            try {
              const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
              }) as string[];
              address = accounts[0];
            } catch (err: unknown) {
              if ((err as { code?: number }).code === 4001) {
                throw { type: 'user_rejected', message: 'User rejected the connection request' };
              }
              throw err;
            }
          }
          break;
        
        case 'trustwallet':
          if (window.trustwallet?.ethereum) {
            try {
              const accounts = await window.trustwallet.ethereum.request({
                method: 'eth_requestAccounts'
              }) as string[];
              address = accounts[0];
            } catch (err: unknown) {
              if ((err as { code?: number }).code === 4001) {
                throw { type: 'user_rejected', message: 'User rejected the connection request' };
              }
              throw err;
            }
          }
          break;
        
        case 'coinbase':
          if (window.ethereum?.isCoinbaseWallet) {
            try {
              const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
              }) as string[];
              address = accounts[0];
            } catch (err: unknown) {
              if ((err as { code?: number }).code === 4001) {
                throw { type: 'user_rejected', message: 'User rejected the connection request' };
              }
              throw err;
            }
          }
          break;
      }

        if (!address) {
          throw { type: 'unknown', message: `Failed to connect to ${walletType}` };
        }

        // Verify NFT ownership if mint address is provided
        if (nftMintAddress) {
          try {
            const response = await fetch('/auth/connect-wallet', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                wallet_address: address,
                nft_mint_address: nftMintAddress,
              }),
            });

            const data = await response.json();
            if (!data.nft_verified) {
              throw {
                type: 'unsupported_chain',
                message: 'NFT ownership verification failed. Access denied.',
              };
            }
          } catch (err) {
            throw {
              type: 'unsupported_chain',
              message: 'NFT verification failed. Please try again.',
            };
          }
        }

        // Get chain ID for Ethereum-based wallets
        let chainId: string | null = null;
        if (walletType !== 'phantom' && window.ethereum) {
          try {
            chainId = await window.ethereum.request({ method: 'eth_chainId' });
          } catch (err) {
            console.warn('Failed to get chain ID:', err);
          }
        }
        
        // Update wallet state
        setWalletStates(prev => ({
          ...prev,
          [walletType]: {
            ...prev[walletType],
            isConnected: true,
            address: address,
            chainId: chainId || undefined
          }
        }));

        // Add wallet event listeners
        if (walletType === 'phantom' && window.solana) {
          window.solana.on('disconnect', () => handleDisconnect(walletType));
        } else if (window.ethereum) {
          window.ethereum.on('accountsChanged', () => handleDisconnect(walletType));
          window.ethereum.on('chainChanged', () => handleDisconnect(walletType));
        }

        onConnect(address, walletType);
    } catch (error) {
      console.error(`Failed to connect ${walletType}:`, error);
      const walletError: WalletError = {
        type: 'unknown',
        message: `Failed to connect to ${walletType}. Please try again.`,
        walletType
      };
      setError(walletError);
      onError?.(walletError);
    } finally {
      setIsConnecting(false);
      setConnectingWallet(null);
    }
  };

  const wallets = checkWalletAvailability();

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-6 h-6" />
          Connect Wallet
        </CardTitle>
        <CardDescription>
          Choose your preferred wallet to connect. Supported chains: Solana, Ethereum, Polygon, BSC
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <NFTInput value={nftMintAddress} onChange={setNftMintAddress} />
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-2">
          {wallets.map((wallet) => (
            <Button
              key={wallet.type}
              disabled={isConnecting || (!wallet.installed && !walletStates[wallet.type].isConnected)}
              className="w-full flex items-center justify-start gap-2 h-12"
              variant={walletStates[wallet.type].isConnected ? "destructive" : wallet.installed ? "default" : "secondary"}
              onClick={() => {
                if (walletStates[wallet.type].isConnected) {
                  handleDisconnect(wallet.type);
                } else {
                  handleConnect(wallet.type);
                }
              }}
            >
              {wallet.icon}
              <span className="flex-1 text-left">{wallet.name}</span>
              {connectingWallet === wallet.type && (
                <span className="text-sm">Connecting...</span>
              )}
              {walletStates[wallet.type].isConnected && (
                <span className="text-sm">Connected: {walletStates[wallet.type].address?.slice(0, 6)}...</span>
              )}
              {!wallet.installed && !walletStates[wallet.type].isConnected && (
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">Not installed</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({wallet.supportedChains.join(', ')})
                  </span>
                  <a
                    href={wallet.installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:text-blue-600 inline-flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              )}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
