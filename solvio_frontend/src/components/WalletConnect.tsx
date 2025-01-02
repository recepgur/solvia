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
  
  // State for wallet detection process
  const [isChecking, setIsChecking] = useState(true);
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  // Proper mobile detection based on user agent
  const [isMobileDevice] = useState(() => {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    const isInAppBrowser = /fbav|fban|line|instagram|kakaotalk|naver|zalo|snapchat|viber|whatsapp/i.test(userAgent);
    const isMobile = /iphone|ipad|android|mobile/i.test(userAgent);
    console.log('Mobile Detection:', { userAgent, isInAppBrowser, isMobile });
    return isMobile;
  });
  
  // Enhanced error messages in Turkish
  const getErrorMessage = (type: WalletErrorType, walletType: WalletType): string => {
    switch (type) {
      case 'not_installed':
        return `Lütfen ${walletType} cüzdanını yükleyin ve tekrar deneyin.`;
      case 'user_rejected':
        return 'Bağlantı reddedildi. Lütfen tekrar deneyin.';
      case 'already_connected':
        return `${walletType} zaten bağlı.`;
      case 'network_error':
        return 'Ağ hatası. Lütfen internet bağlantınızı kontrol edin.';
      case 'unsupported_chain':
        return 'Desteklenmeyen ağ. Lütfen doğru ağa geçin.';
      default:
        return 'Bir hata oluştu. Lütfen tekrar deneyin.';
    }
  };

  // Enhanced wallet detection with proper timing
  useEffect(() => {
    let mounted = true;
    
    const initializeWalletDetection = async () => {
      try {
        // Increased initial delay to ensure proper wallet extension initialization
        await new Promise(resolve => setTimeout(resolve, 3500));
        
        if (!mounted) return;
        
        // Check wallet availability after initial delay
        const wallets = checkWalletAvailability();
        console.log('Initial wallet detection:', wallets);
        setAvailableWallets(wallets);

        // Add retry detection after additional delay
        setTimeout(() => {
          if (!mounted) return;
          const retryWallets = checkWalletAvailability();
          console.log('Retry wallet detection:', retryWallets);
          // Only update if we found more wallets
          if (retryWallets.length > wallets.length) {
            console.log('Found additional wallets on retry');
            setAvailableWallets(retryWallets);
          }
        }, 3000);
      } catch (error) {
        console.error('Wallet detection error:', error);
      } finally {
        if (mounted) {
          setIsChecking(false);
        }
      }
    };
    
    initializeWalletDetection();
    
    return () => {
      mounted = false;
    };
  }, []);
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
    // Use isMobileDevice state for consistent mobile detection
    const userAgent = navigator.userAgent.toLowerCase();
    const isInAppBrowser = /fbav|fban|line|instagram|kakaotalk|naver|zalo|snapchat|viber|whatsapp/i.test(userAgent);
    
    console.log('Mobile Detection:', {
      isMobileDevice,
      userAgent,
      isInAppBrowser
    });
    
    // Enhanced wallet-specific browser detection
    const isTrustWalletBrowser = /trust\/|trustwallet\/|trust wallet/i.test(userAgent);
    const isMetaMaskBrowser = /metamask\/|metamaskmobile\/|metamask mobile/i.test(userAgent);
    const isCoinbaseBrowser = /coinbasebrowser\/|coinbase wallet/i.test(userAgent);
    const isPhantomBrowser = /phantom\/|phantommobile\/|phantom mobile/i.test(userAgent);
    const isSolflareBrowser = /solflare\/|solflare mobile/i.test(userAgent);
    
    // Additional environment checks
    const isBrave = 'brave' in navigator;
    const hasEthereumProvider = Boolean(window.ethereum);
    const hasSolanaProvider = Boolean(window.solana);
    const hasSolflareProvider = Boolean(window.solflare);
    const hasTrustProvider = Boolean(window.trustwallet);
    const hasCoinbaseProvider = Boolean(window.coinbaseWalletExtension);
    
    // Deep environment logging
    console.log('Enhanced Environment Detection:', {
      userAgent,
      isMobileDevice,
      isInAppBrowser,
      browserSpecific: {
        isTrustWalletBrowser,
        isMetaMaskBrowser,
        isCoinbaseBrowser,
        isPhantomBrowser,
        isSolflareBrowser,
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

    // Enhanced wallet detection using comprehensive checks
    const isPhantomInstalled = typeof window !== 'undefined' && (
      window.solana?.isPhantom === true ||
      (isMobileDevice && !isInAppBrowser && (
        isPhantomBrowser ||
        window.solana?.provider?.isPhantom === true ||
        (hasSolanaProvider && window.solana?.isPhantom) ||
        document.querySelector('meta[name="dapp-enabled"]') !== null
      ))
    );

    const isSolflareInstalled = typeof window !== 'undefined' && (
      window.solflare?.isSolflare === true ||
      (isMobileDevice && !isInAppBrowser && (
        isSolflareBrowser ||
        (hasSolflareProvider && window.solflare?.isSolflare) ||
        document.querySelector('meta[name="dapp-enabled"]') !== null
      ))
    );
    
    const isMetaMaskInstalled = typeof window !== 'undefined' && (
      (window.ethereum?.isMetaMask === true && !window.ethereum?.isBraveWallet) ||
      (isMobileDevice && !isInAppBrowser && (
        isMetaMaskBrowser ||
        (hasEthereumProvider && window.ethereum?.isMetaMask && !window.ethereum?.isBraveWallet) ||
        window.ethereum?.provider?.isMetaMask === true ||
        document.querySelector('meta[name="dapp-enabled"]') !== null
      ))
    );
    
    const isTrustWalletInstalled = typeof window !== 'undefined' && (
      window.trustwallet?.isTrust === true ||
      window.ethereum?.isTrust === true ||
      (isMobileDevice && !isInAppBrowser && (
        isTrustWalletBrowser ||
        (hasTrustProvider && (
          window.trustwallet?.ethereum?.isTrust === true ||
          window.trustwallet?.solana?.isTrust === true
        )) ||
        (hasEthereumProvider && window.ethereum?.isTrust) ||
        document.querySelector('meta[name="dapp-enabled"]') !== null
      ))
    );
    
    const isCoinbaseWalletInstalled = typeof window !== 'undefined' && (
      window.coinbaseWalletExtension?.isConnected ||
      window.ethereum?.isCoinbaseWallet === true ||
      (isMobileDevice && !isInAppBrowser && (
        isCoinbaseBrowser ||
        (hasCoinbaseProvider && window.coinbaseWalletExtension?.isConnected) ||
        (hasEthereumProvider && window.ethereum?.isCoinbaseWallet) ||
        window.WalletLink !== undefined ||
        document.querySelector('meta[name="dapp-enabled"]') !== null
      ))
    );

    // Log final detection results with enhanced Solana wallet info
    console.log('Final wallet detection results:', {
      solana: {
        phantom: isPhantomInstalled,
        solflare: isSolflareInstalled,
        combined: isPhantomInstalled || isSolflareInstalled
      },
      metamask: isMetaMaskInstalled,
      trustwallet: isTrustWalletInstalled,
      coinbase: isCoinbaseWalletInstalled
    });

    return [
      {
        name: 'Solana Wallet',
        type: 'phantom',
        icon: (
          <svg viewBox="0 0 128 128" className="w-5 h-5 flex-shrink-0">
            <path d="M64 0C28.7 0 0 28.7 0 64s28.7 64 64 64c11.2 0 21.7-2.9 30.8-7.9L48.4 55.3v36.6h-6.8V41.8h6.8l50.5 75.8C116.4 106.2 128 86.5 128 64c0-35.3-28.7-64-64-64zm22.1 84.6l-7.5-11.3V41.8h7.5v42.8z" fill="currentColor"/>
          </svg>
        ),
        installed: Boolean(isPhantomInstalled || isSolflareInstalled),
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

  const getMobileDeepLink = (walletType: WalletType): string | null => {
    if (!isMobileDevice) return null;

    const currentUrl = window.location.href;
    const encodedUrl = encodeURIComponent(currentUrl);

    switch (walletType) {
      case 'phantom':
        return /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase())
          ? `https://phantom.app/ul/browse/${encodedUrl}`
          : `https://phantom.app/ul/v1/connect?dapp_url=${encodedUrl}`;
      case 'metamask':
        return `https://metamask.app.link/dapp/${encodedUrl}`;
      case 'trustwallet':
        return `https://link.trustwallet.com/open_url?url=${encodedUrl}`;
      case 'coinbase':
        return `https://go.cb-w.com/dapp?cb_url=${encodedUrl}`;
      case 'solflare':
        return `https://solflare.com/ul/v1/connect?dapp_url=${encodedUrl}`;
      default:
        return null;
    }
  };

  const handleConnect = async (walletType: WalletType) => {
    // Check for mobile deep linking first
    if (isMobileDevice) {
      const deepLink = getMobileDeepLink(walletType);
      if (deepLink) {
        window.open(deepLink, '_blank');
        
        // Enhanced timeout and detection for mobile deep linking
        setTimeout(() => {
          const provider = window.solana || window.ethereum || window.trustwallet || window.coinbaseWalletExtension;
          console.log('Deep link provider check:', { 
            hasSolana: !!window.solana,
            hasEthereum: !!window.ethereum,
            hasTrust: !!window.trustwallet,
            hasCoinbase: !!window.coinbaseWalletExtension,
            walletType
          });
          
          if (!provider) {
            // Double-check after a short delay before showing error
            setTimeout(() => {
              const retryProvider = window.solana || window.ethereum || window.trustwallet || window.coinbaseWalletExtension;
              if (!retryProvider) {
                console.log('No provider found after retry');
                const error: WalletError = {
                  type: 'not_installed',
                  message: getErrorMessage('not_installed', walletType),
                  walletType
                };
                setError(error);
                onError?.(error);
              } else {
                console.log('Provider found on second check after deep link');
              }
            }, 2000);
          } else {
            console.log('Provider found after deep link');
          }
        }, 5000);
        return;
      }
    }

    // Don't connect if already connected
    if (walletStates[walletType].isConnected) {
      const walletError: WalletError = {
        type: 'already_connected',
        message: getErrorMessage('already_connected', walletType),
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
        {availableWallets.some(w => w.installed) && (
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
