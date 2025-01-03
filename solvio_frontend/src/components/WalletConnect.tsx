import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { detectMobile } from '@/utils/mobile';
import { Button } from '@/components/ui/button';
import { NFTInput } from './NFTInput';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WalletErrorType, type WalletError, type WalletType, type WalletInfo, type WalletState, type WalletConnectProps, type Environment } from '../types/wallet';

// Global wallet configuration
const WALLET_CONFIG: Record<WalletType, { 
  name: string; 
  installUrl: string; 
  supportedChains: string[] 
}> = {
  phantom: {
    name: 'Phantom',
    installUrl: 'https://phantom.app/',
    supportedChains: ['solana']
  },
  metamask: {
    name: 'MetaMask',
    installUrl: 'https://metamask.io/',
    supportedChains: ['ethereum', 'polygon', 'bsc']
  },
  trustwallet: {
    name: 'Trust Wallet',
    installUrl: 'https://trustwallet.com/',
    supportedChains: ['ethereum', 'polygon', 'bsc', 'solana']
  },
  coinbase: {
    name: 'Coinbase Wallet',
    installUrl: 'https://www.coinbase.com/wallet',
    supportedChains: ['ethereum', 'polygon', 'bsc']
  },
  solflare: {
    name: 'Solflare',
    installUrl: 'https://solflare.com/',
    supportedChains: ['solana']
  }
};
// Using types from wallet.ts

// SSR Fallback Component
export function SSRFallback() {
  return null;
}

// Main WalletConnect Component
// Using WalletConnectProps from wallet.ts

const WalletConnect: React.FC<WalletConnectProps> = ({
  onConnect,
  onDisconnect,
  nftMintAddress = ''
}) => {
  const { toast } = useToast();

  // All state declarations at the top level
  const [environment] = useState<Environment | null>(() => {
    if (typeof window === 'undefined') return null;
    const userAgent = navigator.userAgent.toLowerCase();
    return {
      userAgent,
      isInAppBrowser: /fbav|fban|line|instagram|kakaotalk|naver|zalo|snapchat|viber|whatsapp/i.test(userAgent),
      isBrave: 'brave' in navigator,
      browserChecks: {
        trust: /trust\/|trustwallet\/|trust wallet/i.test(userAgent),
        metamask: /metamask\/|metamaskmobile\/|metamask mobile/i.test(userAgent),
        coinbase: /coinbasebrowser\/|coinbase wallet/i.test(userAgent),
        phantom: /phantom\/|phantommobile\/|phantom mobile/i.test(userAgent),
        solflare: /solflare\/|solflare mobile/i.test(userAgent)
      },
      providerChecks: {
        ethereum: Boolean(window.ethereum),
        solana: Boolean(window.solana),
        solflare: Boolean(window.solflare),
        trust: Boolean(window.trustwallet),
        coinbase: Boolean(window.coinbaseWalletExtension)
      }
    };
  });
  
  const [error, setError] = useState<WalletError | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [connectingWallet, setConnectingWallet] = useState<WalletType | null>(null);
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [currentNftMintAddress, setCurrentNftMintAddress] = useState<string>(nftMintAddress || '');

  // Check provider function
  const checkProvider = useCallback(async (walletType: WalletType, onError?: (error: WalletError) => void): Promise<boolean> => {
    try {
      switch (walletType) {
        case 'phantom':
          return Boolean(window.solana?.isPhantom);
        case 'metamask':
          return Boolean(window.ethereum?.isMetaMask);
        case 'trustwallet':
          return Boolean(window.trustwallet?.isTrust);
        case 'coinbase':
          return Boolean(window.ethereum?.isCoinbaseWallet);
        case 'solflare':
          return Boolean(window.solflare?.isSolflare);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error checking ${walletType} provider:`, error);
      if (onError) {
        onError({
          type: WalletErrorType.CONNECTION_ERROR,
          message: `Error checking ${walletType} provider`,
          walletType
        });
      }
      return false;
    }
  }, []);

  // Check wallet availability is defined below

  const [walletStates, setWalletStates] = useState<Record<WalletType, WalletState>>({
    phantom: { isConnected: false, address: null, hasNFTAccess: false },
    metamask: { isConnected: false, address: null, hasNFTAccess: false },
    trustwallet: { isConnected: false, address: null, hasNFTAccess: false },
    coinbase: { isConnected: false, address: null, hasNFTAccess: false },
    solflare: { isConnected: false, address: null, hasNFTAccess: false }
  });
  const [walletInstallStates, setWalletInstallStates] = useState({
    phantom: false,
    metamask: false,
    trustwallet: false,
    coinbase: false,
    solflare: false
  });
  const [walletChecks] = useState({
    isMetaMaskInstalled: false,
    isCoinbaseWalletInstalled: false,
    isTrustWalletInstalled: false
  });

  // Callback handler for disconnect
  const handleOnDisconnect = useCallback(() => {
    onDisconnect?.();
  }, [onDisconnect]);

  // Handle disconnect function
  const handleDisconnect = useCallback((walletType: WalletType) => {
    setWalletStates((prev: Record<WalletType, WalletState>) => ({
      ...prev,
      [walletType]: {
        ...prev[walletType],
        isConnected: false,
        address: null,
        hasNFTAccess: false
      }
    }));
    handleOnDisconnect();
  }, [handleOnDisconnect, setWalletStates]);

  // Handle connect function
  const handleConnect = useCallback(async (walletType: WalletType) => {
    try {
      setIsConnecting(true);
      setConnectingWallet(walletType);
      setError(null);

      // Don't connect if already connected
      if (walletStates[walletType].isConnected) {
        const walletError: WalletError = {
          type: WalletErrorType.ALREADY_CONNECTED,
          message: `${WALLET_CONFIG[walletType].name} is already connected.`,
          walletType
        };
        setError(walletError);
        toast({
          variant: "destructive",
          title: "Wallet Error",
          description: walletError.message
        });
        return;
      }

      // Check if wallet is installed
      const isInstalled = await checkProvider(walletType);
      if (!isInstalled) {
        const walletError: WalletError = {
          type: WalletErrorType.NOT_INSTALLED,
          message: `${WALLET_CONFIG[walletType].name} is not installed.`,
          walletType
        };
        setError(walletError);
        toast({
          variant: "destructive",
          title: "Wallet Error",
          description: walletError.message
        });
        return;
      }

      // Handle different wallet types
      let address: string;
      let chainIdForVerification: string | null = null;
      const validChainIds = {
        ethereum: ['0x1', '0x89', '0x38'], // Mainnet, Polygon, BSC
        solana: ['mainnet-beta']
      };

      switch (walletType) {
        case 'phantom':
        case 'solflare':
          try {
            const provider = walletType === 'phantom' ? window.solana : window.solflare;
            if (!provider) throw new Error('Provider not found');

            const resp = await provider.connect();
            address = resp.publicKey.toString();
          } catch (error) {
            console.error('Solana wallet connection error:', error);
            throw error;
          }
          break;

        case 'metamask':
        case 'trustwallet':
        case 'coinbase':
          try {
            if (!window.ethereum) throw new Error('No Ethereum provider found');

            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) throw new Error('No accounts found');

            // Get the current chain ID
            chainIdForVerification = await window.ethereum.request({ method: 'eth_chainId' });
            if (!validChainIds.ethereum.includes(chainIdForVerification)) {
              throw new Error('Unsupported chain. Please connect to Ethereum Mainnet, Polygon, or BSC.');
            }

            address = accounts[0];
          } catch (error) {
            console.error('Ethereum wallet connection error:', error);
            throw error;
          }
          break;

        default:
          throw new Error('Unsupported wallet type');
      }

      // Update wallet state
      setWalletStates(prev => ({
        ...prev,
        [walletType]: {
          ...prev[walletType],
          isConnected: true,
          address
        }
      }));

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
                chain_id: chainIdForVerification,
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
              nftMintAddress: nftMintAddress,
            }
          }));
        } catch (error) {
          console.error('NFT verification error:', error);
          throw error;
        }
      }

      // Add wallet event listeners and setup disconnect handlers
      const handleWalletDisconnect = () => {
        setWalletStates((prev: Record<WalletType, WalletState>) => ({
          ...prev,
          [walletType]: {
            ...prev[walletType],
            isConnected: false,
            address: null,
            hasNFTAccess: false
          }
        }));
        onDisconnect?.();
      };

      if (walletType === 'phantom' && window.solana) {
        window.solana.on('disconnect', handleWalletDisconnect);
      } else if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleWalletDisconnect);
        window.ethereum.on('chainChanged', handleWalletDisconnect);
      }

      // Call the onConnect callback if provided
      onConnect?.(address, walletType);
    } catch (error: unknown) {
      console.error(`Failed to connect ${walletType}:`, error);
      const walletError: WalletError = {
        type: WalletErrorType.CONNECTION_ERROR,
        message: error instanceof Error ? error.message : `Failed to connect ${WALLET_CONFIG[walletType].name}`,
        walletType
      };
      setError(walletError);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: walletError.message
      });
    } finally {
      setIsConnecting(false);
      setConnectingWallet(null);
    }
  }, [checkProvider, walletStates, nftMintAddress, onConnect, onDisconnect, setWalletStates, setError, setIsConnecting, setConnectingWallet, toast]);

  // Define wallet availability check function
  const checkWalletAvailability = useCallback(async (): Promise<WalletInfo[]> => {
    const wallets: WalletInfo[] = [];
    
    if (typeof window === 'undefined' || !environment) return wallets;
    
    // Update wallet installation status using environment checks
    const { providerChecks, browserChecks } = environment;
    console.log('Checking wallet availability:', { providerChecks, browserChecks });
    
    // Check each wallet's availability
    const walletChecks = {
      phantom: providerChecks.solana && Boolean(window.solana?.isPhantom),
      metamask: providerChecks.ethereum && Boolean(window.ethereum?.isMetaMask),
      trustwallet: providerChecks.trust,
      coinbase: providerChecks.coinbase || (providerChecks.ethereum && Boolean(window.ethereum?.isCoinbaseWallet)),
      solflare: providerChecks.solflare && Boolean(window.solflare?.isSolflare)
    };
    
    // Update state with results
    setWalletInstallStates({
      phantom: walletChecks.phantom,
      metamask: walletChecks.metamask,
      trustwallet: walletChecks.trustwallet,
      coinbase: walletChecks.coinbase,
      solflare: walletChecks.solflare
    });
    
    // Add wallets to the list
    Object.entries(walletInstallStates).forEach(([key, installed]) => {
      if (installed) {
        const type = key as WalletType;
        wallets.push({
          name: WALLET_CONFIG[type].name,
          type,
          icon: <Wallet className="h-5 w-5" />,
          installed: true,
          installUrl: WALLET_CONFIG[type].installUrl,
          supportedChains: WALLET_CONFIG[type].supportedChains
        });
      }
    });

    return wallets;
  }, [environment, walletInstallStates, setWalletInstallStates]);

  // Define environment check function
  const checkEnvironmentAndWallets = useCallback(async () => {
    if (typeof window === 'undefined' || !environment) return;
    
    console.log('Mobile Detection:', {
      isMobile: detectMobile(),
      userAgent: environment.userAgent,
      isInAppBrowser: environment.isInAppBrowser
    });
    
    // Enhanced wallet-specific browser detection
    const browserChecks = {
      isMetaMaskBrowser: /metamask\/|metamaskmobile\/|metamask mobile/i.test(environment.userAgent),
      isCoinbaseBrowser: /coinbasebrowser\/|coinbase wallet/i.test(environment.userAgent),
      isPhantomBrowser: /phantom\/|phantommobile\/|phantom mobile/i.test(environment.userAgent),
      isSolflareBrowser: /solflare\/|solflare mobile/i.test(environment.userAgent)
    };
    
    // Additional environment checks
    const isBrave = 'brave' in navigator;
    const hasEthereumProvider = Boolean(window.ethereum);
    const hasSolanaProvider = Boolean(window.solana);
    const hasSolflareProvider = Boolean(window.solflare);
    const hasTrustProvider = Boolean(window.trustwallet);
    const hasCoinbaseProvider = Boolean(window.coinbaseWalletExtension);
    
    // Deep environment logging
    console.log('Enhanced Environment Detection:', {
      userAgent: environment.userAgent,
      isMobile: detectMobile(),
      isInAppBrowser: environment.isInAppBrowser,
      browserSpecific: {
        isTrustWalletBrowser: walletChecks.isTrustWalletInstalled,
        ...browserChecks,
        isBrave
      },
      providers: {
        ethereum: hasEthereumProvider,
        solana: hasSolanaProvider,
        solflare: hasSolflareProvider,
        trust: hasTrustProvider,
        coinbase: hasCoinbaseProvider
      },
      providerDetails: {
        ethereum: window.ethereum?.isMetaMask ? 'MetaMask' : 
                 window.ethereum?.isTrust ? 'Trust' : 
                 window.ethereum?.isCoinbaseWallet ? 'Coinbase' : 
                 hasEthereumProvider ? 'Unknown' : 'None',
        solana: window.solana?.isPhantom ? 'Phantom' : 
                window.solflare?.isSolflare ? 'Solflare' : 
                hasSolanaProvider ? 'Unknown' : 'None'
      }
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

    // Log final detection results with enhanced Solana wallet info
    const walletResults = await checkWalletAvailability();
    console.log('Final wallet detection results:', {
      solana: {
        phantom: walletResults.find(w => w.type === 'phantom')?.installed || false,
        solflare: walletResults.find(w => w.type === 'solflare')?.installed || false,
        combined: (walletResults.find(w => w.type === 'phantom')?.installed || false) || 
                 (walletResults.find(w => w.type === 'solflare')?.installed || false)
      },
      metamask: walletResults.find(w => w.type === 'metamask')?.installed || false,
      trustwallet: walletResults.find(w => w.type === 'trustwallet')?.installed || false,
      coinbase: walletResults.find(w => w.type === 'coinbase')?.installed || false
    });
  }, [environment, checkWalletAvailability, walletChecks]);



  // Early return for SSR
  // Initialize wallet detection on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let mounted = true;
    const initializeWallets = async () => {
      try {
        setIsChecking(true);
        await checkEnvironmentAndWallets();
        const wallets = await checkWalletAvailability();
        if (mounted) {
          setAvailableWallets(wallets);
        }
      } catch (error) {
        console.error('Failed to initialize wallets:', error);
      } finally {
        if (mounted) {
          setIsChecking(false);
        }
      }
    };

    initializeWallets();
    
    return () => {
      mounted = false;
    };
  }, [checkEnvironmentAndWallets, checkWalletAvailability]);

  if (typeof window === 'undefined') {
    return <SSRFallback />;
  }

  // Component render
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
          {isConnecting && (
            <div className="flex items-center justify-center mt-4 space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Connecting to wallet...</span>
            </div>
          )}
          {isChecking && (
            <div className="flex items-center justify-center mt-4 space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Checking wallet availability...</span>
            </div>
          )}
        </CardHeader>
      <CardContent className="space-y-4">
        {/* Only show NFT input if at least one compatible wallet is installed */}
        {availableWallets.some(w => w.installed) && (
          <div className="space-y-2">
            <NFTInput value={currentNftMintAddress} onChange={setCurrentNftMintAddress} />
            <p className="text-sm text-muted-foreground">
              Enter an NFT address to verify ownership for access control
            </p>
          </div>
        )}
        
        {error?.message ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error?.message}</AlertDescription>
          </Alert>
        ) : null}

        {!availableWallets.some(w => w.installed) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No compatible wallets detected. Please install one of the supported wallets to continue.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-2">
          {availableWallets.map((wallet) => (
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
                  {currentNftMintAddress ? 'Verifying NFT...' : 'Connecting...'}
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

export default WalletConnect;
