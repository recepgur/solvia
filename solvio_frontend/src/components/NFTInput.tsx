import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NFTInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function NFTInput({ value, onChange }: NFTInputProps) {
  return (
    <div className="grid w-full max-w-sm items-center gap-1.5 px-4 md:px-0">
      <Label htmlFor="nftAddress" className="text-sm md:text-base">NFT Mint Address (Optional)</Label>
      <Input
        className="text-sm md:text-base h-10 md:h-12"
        type="text"
        id="nftAddress"
        placeholder="Enter NFT mint address for access control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
