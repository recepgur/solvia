import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import ApiService from '../services/api';
import type { Message } from '../types/message';

export function useOfflineSync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { wallet } = useWallet();

  const syncMessages = useCallback(async () => {
    if (!wallet || syncing) return;

    try {
      setSyncing(true);
      const response = await ApiService.get('/api/v1/offline/sync', {
        params: {
          before: lastSyncTime?.toISOString(),
        },
      });

      setLastSyncTime(new Date());
      return response as Message[];
    } catch (error) {
      console.error('Offline sync error:', error);
      return [];
    } finally {
      setSyncing(false);
    }
  }, [wallet, lastSyncTime, syncing]);

  // Sync messages on mount and when wallet changes
  useEffect(() => {
    syncMessages();
  }, [wallet]);

  return {
    syncMessages,
    syncing,
    lastSyncTime,
  };
}
