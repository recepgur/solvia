import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { NFTInput } from './NFTInput';

type WalletType = 'phantom' | 'metamask' | 'trustwallet' | 'coinbase' | 'solflare';

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
  // Initialize window object safely and show loading state
  if (typeof window === 'undefined') return null;
  
  // Show loading animation while checking wallet availability
  const [isChecking, setIsChecking] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsChecking(false), 1500);
    return () => clearTimeout(timer);
  }, []);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<WalletType | null>(null);
  const [error, setError] = useState<WalletError | null>(null);
  const [nftMintAddress, setNftMintAddress] = useState<string>('');
  const [walletStates, setWalletStates] = useState<Record<WalletType, WalletState>>({
    phantom: { isConnected: false, address: null, hasNFTAccess: false },
    metamask: { isConnected: false, address: null, hasNFTAccess: false },
    trustwallet: { isConnected: false, address: null, hasNFTAccess: false },
    coinbase: { isConnected: false, address: null, hasNFTAccess: false },
    solflare: { isConnected: false, address: null, hasNFTAccess: false },
  });

  // Function to check if wallets are installed
  const checkWalletAvailability = (): WalletInfo[] => {
    // Enhanced mobile environment detection
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isInAppBrowser = /FBAV|FBAN|Line|Instagram|KAKAOTALK|NAVER|zalo|Snapchat|Viber|WhatsApp/i.test(navigator.userAgent);
    const isTrustWalletBrowser = /Trust\/|TrustWallet\//i.test(navigator.userAgent);
    const isMetaMaskBrowser = /MetaMask\/|MetaMaskMobile\//i.test(navigator.userAgent);
    const isCoinbaseBrowser = /CoinbaseBrowser\//i.test(navigator.userAgent);

    console.log('Environment Detection:', {
      isMobile,
      isInAppBrowser,
      isTrustWalletBrowser,
      isMetaMaskBrowser,
      isCoinbaseBrowser,
      userAgent: navigator.userAgent
    });

    // Enhanced Phantom detection (includes mobile deep linking and Solflare)
    console.log('Checking Phantom/Solflare availability:', {
      windowExists: typeof window !== 'undefined',
      solanaObject: window.solana,
      isPhantom: window.solana?.isPhantom,
      solflareObject: window.solflare,
      isSolflare: window.solflare?.isSolflare,
      providerPhantom: window.solana?.provider?.isPhantom,
      dappEnabled: document.querySelector('meta[name="dapp-enabled"]') !== null
    });

    const isPhantomInstalled = typeof window !== 'undefined' && (
      window.solana?.isPhantom === true ||
      (isMobile && !isInAppBrowser && (
        window.solflare?.isSolflare === true ||
        window.solana?.provider?.isPhantom === true ||
        document.querySelector('meta[name="dapp-enabled"]') !== null
      ))
    );
    
    // Enhanced MetaMask detection (includes mobile detection and in-app browser)
    console.log('Checking MetaMask availability:', {
      windowExists: typeof window !== 'undefined',
      ethereumObject: window.ethereum,
      isMetaMask: window.ethereum?.isMetaMask,
      providerMetaMask: window.ethereum?.provider?.isMetaMask,
      mobileCheck: isMobile && !isInAppBrowser
    });

    const isMetaMaskInstalled = typeof window !== 'undefined' && (
      window.ethereum?.isMetaMask === true ||
      (isMobile && !isInAppBrowser && (
        isMetaMaskBrowser ||
        window.ethereum?.provider?.isMetaMask === true ||
        window.ethereum?.provider?.isMetaMask ||
        document.querySelector('meta[name="dapp-enabled"]') !== null
      ))
    );
    
    // Enhanced Trust Wallet detection (includes mobile browser and in-app detection)
    const isTrustWalletInstalled = typeof window !== 'undefined' && (
      window.trustwallet?.isTrust === true ||
      window.ethereum?.isTrust === true ||
      (isMobile && !isInAppBrowser && (
        isTrustWalletBrowser ||
        window.ethereum?.provider?.isTrust === true ||
        window.trustwallet?.ethereum?.isTrust === true ||
        window.trustwallet?.solana?.isTrust === true ||
        document.querySelector('meta[name="dapp-enabled"]') !== null
      ))
    );
    
    // Enhanced Coinbase Wallet detection (includes mobile WalletLink and in-app browser)
    const isCoinbaseWalletInstalled = typeof window !== 'undefined' && (
      window.coinbaseWalletExtension?.isConnected ||
      window.ethereum?.isCoinbaseWallet === true ||
      (isMobile && !isInAppBrowser && (
        isCoinbaseBrowser ||
        window.ethereum?.provider?.isCoinbaseWallet === true ||
        window.WalletLink !== undefined ||
        window.ethereum?.provider?.isCoinbaseWallet ||
        document.querySelector('meta[name="dapp-enabled"]') !== null
      ))
    );

    // Log final detection results
    console.log('Final wallet detection results:', {
      phantom: isPhantomInstalled,
      metamask: isMetaMaskInstalled,
      trustwallet: isTrustWalletInstalled,
      coinbase: isCoinbaseWalletInstalled
    });

    return [
      {
        name: 'Phantom',
        type: 'phantom',
        icon: (
          <svg viewBox="0 0 128 128" className="w-5 h-5 flex-shrink-0">
            <path d="M64 0C28.7 0 0 28.7 0 64s28.7 64 64 64c11.2 0 21.7-2.9 30.8-7.9L48.4 55.3v36.6h-6.8V41.8h6.8l50.5 75.8C116.4 106.2 128 86.5 128 64c0-35.3-28.7-64-64-64zm22.1 84.6l-7.5-11.3V41.8h7.5v42.8z" fill="currentColor"/>
          </svg>
        ),
        installed: Boolean(isPhantomInstalled),
        installUrl: 'https://phantom.app/',
        supportedChains: ['solana']
      },
      {
        name: 'Solflare',
        type: 'solflare',
        icon: (
          <svg viewBox="0 0 96 96" className="w-5 h-5">
            <path d="M48 0C21.5 0 0 21.5 0 48s21.5 48 48 48 48-21.5 48-48S74.5 0 48 0zm0 84c-19.9 0-36-16.1-36-36s16.1-36 36-36 36 16.1 36 36-16.1 36-36 36z" fill="currentColor"/>
          </svg>
        ),
        installed: Boolean(window.solflare?.isSolflare),
        installUrl: 'https://solflare.com/',
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
        installed: Boolean(isMetaMaskInstalled),
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
        installed: Boolean(isTrustWalletInstalled),
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
        installed: Boolean(isCoinbaseWalletInstalled),
        installUrl: 'https://www.coinbase.com/wallet/downloads',
        supportedChains: ['ethereum', 'polygon', 'solana']
      }
    ];
  };

  const handleDisconnect = async (walletType: WalletType) => {
    try {
      // Clear any existing auth tokens and session data
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      localStorage.removeItem('user_session');
      sessionStorage.removeItem('user_session');
      localStorage.removeItem('wallet_connection');
      sessionStorage.removeItem('wallet_connection');
      
      switch (walletType) {
        case 'phantom':
          if (window.solana) {
            await window.solana.disconnect();
          } else if (window.solflare) {
            await window.solflare.disconnect();
          }
          break;
        
        case 'metamask':
          if (window.ethereum?.isMetaMask) {
            // Remove event listeners before disconnecting
            window.ethereum.removeListener('accountsChanged', () => handleDisconnect(walletType));
            window.ethereum.removeListener('chainChanged', () => handleDisconnect(walletType));
          }
          break;
        
        case 'trustwallet':
          if (window.trustwallet?.solana) {
            await window.trustwallet.solana.disconnect();
          } else if (window.trustwallet?.ethereum) {
            // Remove event listeners for Trust Wallet Ethereum
            window.ethereum?.removeListener('accountsChanged', () => handleDisconnect(walletType));
            window.ethereum?.removeListener('chainChanged', () => handleDisconnect(walletType));
          }
          break;
        
        case 'coinbase':
          if (window.coinbaseWalletExtension) {
            await window.coinbaseWalletExtension.disconnect();
          } else if (window.ethereum?.isCoinbaseWallet) {
            // Remove event listeners for Coinbase in-app browser
            window.ethereum.removeListener('accountsChanged', () => handleDisconnect(walletType));
            window.ethereum.removeListener('chainChanged', () => handleDisconnect(walletType));
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
    
    // Clear any existing auth tokens and session data
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('user_session');
    sessionStorage.removeItem('user_session');
    localStorage.removeItem('wallet_connection');
    sessionStorage.removeItem('wallet_connection');

    try {
      let address: string | null = null;
      let chainId: string | null = null;

      // Get and validate chain ID for Ethereum-based wallets
      if (walletType !== 'phantom' && walletType !== 'solflare' && window.ethereum) {
        try {
          const chainIdResponse = await window.ethereum.request({ method: 'eth_chainId' });
          chainId = chainIdResponse as string;
          
          // Validate chain ID
          const validChainIds = {
            ethereum: '0x1',    // Ethereum Mainnet
            polygon: '0x89',    // Polygon Mainnet
            bsc: '0x38'        // BSC Mainnet
          };
          
          if (!Object.values(validChainIds).includes(chainId)) {
            throw {
              type: 'unsupported_chain' as WalletErrorType,
              message: 'Please connect to Ethereum, Polygon, or BSC network',
              walletType
            };
          }
        } catch (error) {
          if ((error as { type?: WalletErrorType }).type === 'unsupported_chain') {
            throw error;
          }
          console.warn('Failed to get or validate chain ID:', error);
        }
      }

      switch (walletType) {
        case 'phantom':
          // Try Phantom first, then Solflare as fallback
          if (window.solana?.isPhantom) {
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
          } else if (window.solflare?.isSolflare) {
            try {
              const result = await window.solflare.connect();
              address = result.publicKey;
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
            // Use blockchain-specific NFT verification based on wallet type
            let nftVerified = false;
            
            if (walletType === 'phantom' || walletType === 'solflare') {
              // Solana NFT verification
              const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/verify-nft-solana`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  wallet_address: address,
                  nft_mint_address: nftMintAddress,
                }),
              });
              const data = await response.json();
              nftVerified = data.nft_verified;
            } else {
              // Ethereum/other chain NFT verification
              const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/verify-nft-evm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  wallet_address: address,
                  nft_contract_address: nftMintAddress,
                  chain_id: chainId,
                }),
              });
              const data = await response.json();
              nftVerified = data.nft_verified;
            }

            if (!nftVerified) {
              throw {
                type: 'unsupported_chain',
                message: `NFT ownership verification failed. Please ensure you own the required NFT (${nftMintAddress}) on the ${walletType === 'phantom' || walletType === 'solflare' ? 'Solana' : 'correct'} chain.`,
              };
            }

            // Update wallet state with NFT access
            setWalletStates(prev => ({
              ...prev,
              [walletType]: {
                ...prev[walletType],
                hasNFTAccess: true,
                nftMintAddress,
              }
            }));
          } catch (error: unknown) {
            const typedError = error as { type?: WalletErrorType; message?: string };
            if (typedError.type === 'unsupported_chain') {
              throw typedError;
            }
            throw {
              type: 'network_error' as WalletErrorType,
              message: 'NFT verification failed. Please check your connection and try again.',
              walletType,
            };
          }
        }

        // Chain ID was already obtained earlier
        
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
    <div className="min-h-screen bg-gray-50 p-4 overflow-x-hidden">
      <Card className="w-full max-w-md mx-auto mt-8 overflow-hidden">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Wallet className="w-6 h-6 flex-shrink-0" />
            <span className="truncate">Connect Wallet</span>
          </CardTitle>
          <CardDescription className="text-sm md:text-base">
            Choose your preferred wallet to connect. Supported chains: Solana, Ethereum, Polygon, BSC
          </CardDescription>
          {isChecking && (
            <div className="flex items-center justify-center mt-4 space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Checking wallet availability...</span>
            </div>
          )}
        </CardHeader>
      <CardContent className="space-y-4">
        {/* Only show NFT input if at least one compatible wallet is installed */}
        {wallets.some(w => w.installed) && (
          <div className="space-y-2">
            <NFTInput value={nftMintAddress} onChange={setNftMintAddress} />
            <p className="text-sm text-muted-foreground">
              Enter an NFT address to verify ownership for access control
            </p>
          </div>
        )}
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {!wallets.some(w => w.installed) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No compatible wallets detected. Please install one of the supported wallets to continue.
            </AlertDescription>
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
              <span className="flex-1 text-left truncate">{wallet.name}</span>
              {connectingWallet === wallet.type && (
                <span className="text-sm whitespace-nowrap">
                  {nftMintAddress ? 'Verifying NFT...' : 'Connecting...'}
                </span>
              )}
              {walletStates[wallet.type].isConnected && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-600 dark:text-green-500">Connected</span>
                  <span className="text-sm text-muted-foreground">
                    {walletStates[wallet.type].address?.slice(0, 6)}...{walletStates[wallet.type].address?.slice(-4)}
                  </span>
                </div>
              )}
              {!wallet.installed && !walletStates[wallet.type].isConnected && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Not installed</span>
                  <span className="text-xs text-muted-foreground hidden md:inline">
                    (Supports: {wallet.supportedChains.join(', ')})
                  </span>
                  <a
                    href={wallet.installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Install
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </Button>
          ))}
        </div>
      </CardContent>
      </Card>
    </div>
  );
}
