import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletBalances } from '../hooks/useWalletBalances';
import { Loader2 } from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useLanguage } from '../contexts/LanguageContext';
import { useTokenVerification } from '../hooks/useTokenVerification';
import { SwapModal } from './SwapModal';
import { transferToken } from '../utils/solana';
import { useToast } from '../hooks/use-toast';

interface WalletDashboardProps {
  className?: string;
}

export function WalletDashboard({ className }: WalletDashboardProps) {
  const { t } = useLanguage();
  const { connection } = useConnection();
  const wallet = useWallet();
  const { solBalance, solvBalance, isLoading: balancesLoading, error: balancesError } = useWalletBalances();

  // Add debug logging for wallet state
  console.log('WalletDashboard render:', {
    hasConnection: !!connection,
    walletConnected: wallet.connected,
    walletPublicKey: wallet.publicKey?.toString(),
    environment: process.env.NODE_ENV,
    solBalance,
    solvBalance,
    isLoading: balancesLoading,
    error: balancesError,
    networkEndpoint: connection?.rpcEndpoint
  });
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const { hasToken } = useTokenVerification();
  const { toast } = useToast();

  const handleTransfer = async (tokenType: 'SOL' | 'SOLV') => {
    if (!amount || !recipientAddress || !wallet.connected) return;

    try {
      setIsTransferring(true);
      const amountNum = parseFloat(amount);

      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error(t('wallet.error.invalid.amount'));
      }

      const signature = await transferToken(
        connection,
        wallet,
        recipientAddress,
        tokenType,
        amountNum
      );

      // Reset form and show success message
      setAmount('');
      setRecipientAddress('');
      toast({
        title: t('wallet.transfer.success'),
        description: `${t('wallet.transfer.success.description')} ${signature}`,
      });
    } catch (error) {
      console.error(`Error transferring ${tokenType}:`, error);
      toast({
        title: t('wallet.transfer.error'),
        description: error instanceof Error ? error.message : t('wallet.error.unknown'),
        variant: 'destructive',
      });
    } finally {
      setIsTransferring(false);
    }
  };

  if (!wallet.connected) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-2xl font-bold">{t('connect.wallet')}</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          {t('connect.wallet.description')}
        </p>
        <WalletMultiButton />
      </div>
    );
  }

  if (balancesLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-zinc-600 dark:text-zinc-400">{t('wallet.loading')}</p>
      </div>
    );
  }

  if (balancesError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-2xl font-bold text-red-500">{t('wallet.error')}</h2>
        <p className="text-zinc-600 dark:text-zinc-400">{balancesError}</p>
      </div>
    );
  }

  return (
    <div className={`container mx-auto p-8 ${className || ''}`}>
      <Card className="p-6 bg-[var(--background)]">
        <h2 className="text-2xl font-bold mb-6">{t('wallet.dashboard')}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">{t('wallet.sol.balance')}</h3>
            <p className="text-2xl">{solBalance} SOL</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">{t('wallet.solv.balance')}</h3>
            <p className="text-2xl">{solvBalance} SOLV</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('wallet.transfer')}</h3>
          <Input
            placeholder={t('wallet.recipient')}
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
          />
          <Input
            type="number"
            placeholder={t('wallet.amount')}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="flex gap-4">
            <Button 
              onClick={() => handleTransfer('SOL')} 
              disabled={!amount || !recipientAddress || isTransferring}
            >
              {isTransferring ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t('wallet.transfer.sol')}
            </Button>
            <Button 
              onClick={() => handleTransfer('SOLV')} 
              disabled={!amount || !recipientAddress || !hasToken || isTransferring}
            >
              {isTransferring ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {t('wallet.transfer.solv')}
            </Button>
            <Button
              onClick={() => window.open('https://jup.ag/swap/SOL-SOLV', '_blank')}
              variant="outline"
              className="ml-auto"
            >
              {t('wallet.buy.solv')}
            </Button>
          </div>
        </div>
        <Button
          onClick={() => setIsSwapModalOpen(true)}
          className="w-full mt-4"
          variant="outline"
        >
          {t('swap.title')}
        </Button>
      </Card>
      <SwapModal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
      />
    </div>
  );
}
