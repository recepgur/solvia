import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { swapTokens } from '../utils/swap';
import { useLanguage } from '../contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2 } from 'lucide-react';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SwapModal({ isOpen, onClose }: SwapModalProps) {
  const { t } = useLanguage();
  const { connected } = useWallet();
  const [fromToken, setFromToken] = useState<'SOL' | 'SOLV'>('SOL');
  const [toToken, setToToken] = useState<'SOL' | 'SOLV'>('SOLV');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { connection } = useConnection();
  const wallet = useWallet();

  const handleSwap = async () => {
    if (!connected || !amount) return;
    
    setIsLoading(true);
    try {
      const success = await swapTokens(
        connection,
        wallet,
        fromToken,
        toToken,
        parseFloat(amount)
      );
      
      if (success) {
        // Show success message
        console.log('Swap successful');
      }
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('swap.title')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Select value={fromToken} onValueChange={(value: 'SOL' | 'SOLV') => setFromToken(value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('swap.select.from')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SOL">SOL</SelectItem>
                <SelectItem value="SOLV">SOLV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Select value={toToken} onValueChange={(value: 'SOL' | 'SOLV') => setToToken(value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('swap.select.to')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SOL">SOL</SelectItem>
                <SelectItem value="SOLV">SOLV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Input
              type="number"
              placeholder={t('swap.amount')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {t('swap.cancel')}
          </Button>
          <Button onClick={handleSwap} disabled={!connected || !amount || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('swap.loading')}
              </>
            ) : (
              t('swap.confirm')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
