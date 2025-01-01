import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChainType } from '../types/messages';
import { Loader2 } from 'lucide-react';

interface NFTInputProps {
  value: string;
  onChange: (value: string) => void;
  selectedChain?: ChainType;
  isVerifying?: boolean;
  error?: string;
}

export function NFTInput({ value, onChange, selectedChain, isVerifying, error }: NFTInputProps) {
  const [isValid, setIsValid] = useState(true);

  const validateNFTAddress = (address: string) => {
    if (!address) {
      setIsValid(true);
      return;
    }

    let isValidFormat = false;
    
    switch (selectedChain) {
      case ChainType.SOLANA:
        // Solana addresses are base58-encoded and 32-44 characters long
        isValidFormat = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
        break;
      
      case ChainType.ETHEREUM:
      case ChainType.POLYGON:
      case ChainType.BSC:
        // EVM addresses are 40 hex characters with 0x prefix
        isValidFormat = /^0x[a-fA-F0-9]{40}$/.test(address);
        break;
      
      default:
        isValidFormat = true; // No validation if chain not selected
    }

    setIsValid(isValidFormat);
  };

  return (
    <div className="grid w-full max-w-sm items-center gap-1.5 px-4 md:px-0">
      <Label htmlFor="nftAddress" className="text-sm md:text-base">
        NFT {selectedChain ? `${selectedChain} ` : ''}Address (Optional)
      </Label>
      <div className="relative">
        <Input
          className={`text-sm md:text-base h-10 md:h-12 pr-8 ${!isValid || error ? 'border-red-500' : ''}`}
          type="text"
          id="nftAddress"
          placeholder={`Enter NFT ${selectedChain || ''} address for access control`}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            validateNFTAddress(e.target.value);
          }}
        />
        {isVerifying && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
      {(!isValid || error) && (
        <p className="text-sm text-red-500">
          {error || `Invalid NFT address format for ${selectedChain || 'selected'} chain`}
        </p>
      )}
    </div>
  );
}
