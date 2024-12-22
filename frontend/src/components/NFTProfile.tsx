import { useState, useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from './ui/button';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection } from '@solana/web3.js';
import { useNetworkStore } from '../stores/networkStore';
import { Metaplex, walletAdapterIdentity, Nft, Sft, NftWithToken, SftWithToken } from '@metaplex-foundation/js';

export function NFTProfile() {
  const [profileImage, setProfileImage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { publicKey, connected } = useWallet();
  
  // Store NFT address in ref to avoid re-renders
  const nftAddressRef = useRef<string>('');

  // Use network store for decentralized RPC endpoint management
  const { getCurrentEndpoint } = useNetworkStore();
  const connection = new Connection(getCurrentEndpoint());
  const metaplex = new Metaplex(connection).use(walletAdapterIdentity(useWallet()));

  const fetchNFTs = async () => {
    if (!connected) {
      console.warn('Wallet not connected, skipping NFT fetch');
      return;
    }
    
    if (!publicKey) {
      console.warn('No public key available, skipping NFT fetch');
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching NFTs for wallet:', publicKey.toString());
      
      // Validate connection before proceeding
      if (!connection) {
        throw new Error('No Solana connection available');
      }
      
      // Verify connection is responsive
      try {
        await connection.getLatestBlockhash();
      } catch (err) {
        console.error('Failed to verify Solana connection:', err);
        throw new Error('Failed to connect to Solana network');
      }
      
      const nfts = await metaplex.nfts().findAllByOwner({ owner: publicKey });
      
      for (const nft of nfts) {
        try {
          const nftData = await metaplex.nfts().findByMint({ mintAddress: nft.address }) as Nft | Sft | NftWithToken | SftWithToken;
          if (nftData.json?.image) {
            nftAddressRef.current = nft.address.toString();
            setProfileImage(nftData.json.image);
            // Store the selection in localStorage for persistence
            localStorage.setItem('profileNFT', JSON.stringify({
              address: nft.address.toString(),
              image: nftData.json.image,
              name: nftData.name
            }));
            break; // Use the first valid NFT found
          }
        } catch (err) {
          console.error('Error loading NFT metadata:', err);
          continue;
        }
      }
    } catch (error) {
      console.error('Error fetching NFTs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load saved NFT profile on component mount
  useEffect(() => {
    const savedNFT = localStorage.getItem('profileNFT');
    if (savedNFT) {
      const { image, address } = JSON.parse(savedNFT);
      setProfileImage(image);
      nftAddressRef.current = address;
    }
  }, []);

  const selectNFT = async () => {
    if (!connected) return;
    await fetchNFTs();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="relative h-32 w-32 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          {profileImage ? (
            <img
              src={profileImage}
              alt="NFT Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Upload className="h-8 w-8 text-zinc-400" />
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-4 text-center">
        <h2 className="text-2xl font-bold">NFT Profile</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Select an NFT from your wallet to use as your profile picture
        </p>
      </div>

      <div className="flex justify-center space-x-4">
        <WalletMultiButton />
        <Button 
          onClick={selectNFT} 
          disabled={!connected || loading}
          variant="outline"
        >
          {loading ? 'Loading NFTs...' : 'Select NFT'}
        </Button>
      </div>
    </div>
  );
}
