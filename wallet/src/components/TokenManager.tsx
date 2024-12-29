import React, { useState } from 'react';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import { TokenItem, ChainType, addToken, removeToken, getTokens } from '../store/tokenList';

interface AddTokenFormData {
  chain: ChainType;
  address: string;
  symbol: string;
  decimals: number;
  name: string;
}

const initialFormData: AddTokenFormData = {
  chain: 'solana',
  address: '',
  symbol: '',
  decimals: 0,
  name: ''
};

export const TokenManager: React.FC = () => {
  const [tokens, setTokens] = useState<TokenItem[]>(getTokens());
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<AddTokenFormData>(initialFormData);
  const { toast } = useToast();

  const handleAddToken = (e: React.FormEvent) => {
    e.preventDefault();
    const success = addToken(formData);
    
    if (success) {
      toast({
        title: 'Token Added',
        description: `Successfully added ${formData.symbol} token`,
      });
      setTokens(getTokens());
      setShowAddForm(false);
      setFormData(initialFormData);
    } else {
      toast({
        title: 'Error',
        description: 'Failed to add token. Please check the details and try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveToken = (chain: ChainType, address: string) => {
    const success = removeToken(chain, address);
    
    if (success) {
      toast({
        title: 'Token Removed',
        description: 'Token has been removed from your list',
      });
      setTokens(getTokens());
    } else {
      toast({
        title: 'Error',
        description: 'Failed to remove token',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold dark:text-white">Token Manager</h2>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : 'Add Token'}
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddToken} className="space-y-4 p-4 border rounded-lg dark:border-gray-700">
          <div className="space-y-2">
            <label className="block text-sm font-medium dark:text-gray-300">Chain</label>
            <select
              className="w-full p-2 border rounded dark:bg-darkBg/50 dark:border-gray-700 dark:text-white"
              value={formData.chain}
              onChange={(e) => setFormData({ ...formData, chain: e.target.value as ChainType })}
            >
              <option value="solana">Solana</option>
              <option value="ethereum">Ethereum</option>
              <option value="bitcoin">Bitcoin</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium dark:text-gray-300">Token Address</label>
            <input
              type="text"
              className="w-full p-2 border rounded dark:bg-darkBg/50 dark:border-gray-700 dark:text-white"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Token contract or mint address"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium dark:text-gray-300">Symbol</label>
            <input
              type="text"
              className="w-full p-2 border rounded dark:bg-darkBg/50 dark:border-gray-700 dark:text-white"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              placeholder="Token symbol (e.g., SOLV)"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium dark:text-gray-300">Name</label>
            <input
              type="text"
              className="w-full p-2 border rounded dark:bg-darkBg/50 dark:border-gray-700 dark:text-white"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Token name"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium dark:text-gray-300">Decimals</label>
            <input
              type="number"
              className="w-full p-2 border rounded dark:bg-darkBg/50 dark:border-gray-700 dark:text-white"
              value={formData.decimals}
              onChange={(e) => setFormData({ ...formData, decimals: parseInt(e.target.value) || 0 })}
              placeholder="Token decimals"
            />
          </div>

          <Button type="submit">Add Token</Button>
        </form>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-semibold dark:text-white">Your Tokens</h3>
        <div className="space-y-2">
          {tokens.map((token) => (
            <div
              key={`${token.chain}-${token.address}`}
              className="flex justify-between items-center p-4 border rounded-lg dark:border-gray-700 dark:bg-darkBg/50"
            >
              <div>
                <div className="font-medium dark:text-white">{token.symbol}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{token.name}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {token.chain} - {token.address}
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={() => handleRemoveToken(token.chain, token.address)}
                disabled={token.address === '7bsVvXbR3524sgms6zjCF2BN3vHxuLePfb5CrqrPt4MQ'}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
