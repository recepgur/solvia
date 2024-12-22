import { type FC, useMemo, useEffect, useState } from 'react';
import { MoreVertical, Plus, Search, ArrowLeft, Sun, Moon, Wifi, WifiOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useNetworkStore } from '../stores/networkStore';

interface HeaderProps {
  view: 'chats' | 'status' | 'messages';
  onBack?: () => void;
  onCreateGroup?: () => void;
  chatName?: string;
  onlineStatus?: string;
  avatarUrl?: string;
}

export const Header: FC<HeaderProps> = ({ view, onBack, onCreateGroup, chatName, onlineStatus, avatarUrl }) => {
  useLanguage(); // Initialize language context for future translations
  const { network, setNetwork, setCustomEndpoint } = useNetworkStore();
  const [networkStatus, setNetworkStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  const currentNetwork = network || clusterApiUrl('mainnet-beta');
  
  // Update network when component mounts if not set
  useEffect(() => {
    if (!network) {
      setNetwork(clusterApiUrl('mainnet-beta'));
    }
  }, [network, setNetwork]);

  // Monitor network connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setNetworkStatus('connecting');
        const connection = new Connection(currentNetwork);
        await connection.getVersion();
        setNetworkStatus('connected');
      } catch (error) {
        console.error('Network connection error:', error);
        setNetworkStatus('error');
      }
    };

    checkConnection();
  }, [currentNetwork]);

  const networkOptions = useMemo(() => [
    { label: 'Mainnet Beta', value: clusterApiUrl('mainnet-beta') },
    { label: 'Devnet', value: clusterApiUrl('devnet') },
    { label: 'Testnet', value: clusterApiUrl('testnet') }
  ], []);

  const currentNetworkLabel = useMemo(() => {
    const networkMap = {
      [clusterApiUrl('mainnet-beta')]: 'Mainnet Beta',
      [clusterApiUrl('devnet')]: 'Devnet',
      [clusterApiUrl('testnet')]: 'Testnet'
    };
    return networkMap[currentNetwork] || 'Unknown';
  }, [currentNetwork]);

  if (view === 'messages' && chatName) {
    return (
      <div className="bg-[var(--app-background)] border-b border-[var(--border-light)] p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--hover-light)] dark:hover:bg-[var(--hover-dark)] transition-colors md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-[var(--bubble-in)] overflow-hidden">
            {avatarUrl && (
              <img 
                src={avatarUrl} 
                alt={chatName}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div>
            <h2 className="font-medium text-[var(--text-primary)]">{chatName}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{onlineStatus}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--hover-light)] dark:hover:bg-[var(--hover-dark)] transition-colors">
            <Search className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--hover-light)] dark:hover:bg-[var(--hover-dark)] transition-colors">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-r from-[var(--primary-accent)] to-[var(--secondary-accent)] backdrop-blur-sm shadow-lg flex justify-between items-center">
      <h1 className="text-xl font-bold text-white">Solvio</h1>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Select defaultValue={currentNetworkLabel}>
            <SelectTrigger className="w-40 text-sm bg-white/10 border-white/20 text-white flex items-center gap-2">
              {networkStatus === 'connected' && <Wifi className="w-4 h-4 text-green-500" />}
              {networkStatus === 'connecting' && <Wifi className="w-4 h-4 text-yellow-500 animate-pulse" />}
              {networkStatus === 'error' && <WifiOff className="w-4 h-4 text-red-500" />}
              <SelectValue placeholder="Select Network" /></SelectTrigger>
            <SelectContent>
              {networkOptions.map((option) => (
                <SelectItem
                  key={option.label}
                  value={option.label}
                  onClick={() => {
                    const network = networkOptions.find(opt => opt.label === option.label);
                    if (network) {
                      setNetwork(network.value);
                      setCustomEndpoint(null);
                    }
                  }}
                >
                  {option.label}
                </SelectItem>
              ))}
              <SelectItem value="custom" onClick={() => {
                const endpoint = prompt('Enter custom RPC endpoint URL:');
                if (endpoint) {
                  try {
                    new URL(endpoint); // Validate URL format
                    setCustomEndpoint(endpoint);
                    setNetwork(endpoint);
                  } catch {
                    alert('Invalid URL format. Please enter a valid RPC endpoint URL.');
                  }
                }
              }}>
                Custom RPC Endpoint
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {view === 'chats' && (
          <button
            onClick={onCreateGroup}
            className="p-2 rounded-full text-white hover:bg-white/10 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={() => document.documentElement.classList.toggle('dark')}
          className="p-2 rounded-full text-white hover:bg-white/10 transition-colors"
          aria-label="Toggle dark mode"
        >
          {document.documentElement.classList.contains('dark') ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>
        <button className="p-2 rounded-full text-white hover:bg-white/10 transition-colors">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
