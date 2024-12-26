import { useState, useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from './ui/button';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection } from '@solana/web3.js';
import { Metaplex, walletAdapterIdentity, Nft, Sft, NftWithToken, SftWithToken } from '@metaplex-foundation/js';

export function NFTProfile() {
  const [profileImage, setProfileImage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  
  // Store NFT address in ref to avoid re-renders
  const nftAddressRef = useRef<string>('');

  const connection = new Connection(process.env.VITE_SOLANA_NETWORK || 'https://api.devnet.solana.com');
  const metaplex = new Metaplex(connection).use(walletAdapterIdentity(wallet));

  const fetchNFTs = async () => {
    if (!publicKey?.toBase58()) {
      console.log('No public key available');
      return;
    }
    
    try {
      setLoading(true);
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
