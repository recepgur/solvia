import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { uploadToIPFS, getFromIPFS } from '../services/ipfs';
import type { BackupData, BackupMetadata, RestoreOptions } from '../types/backup.d';

const BACKUP_VERSION = '1.0.0';
const BACKUP_INTERVAL = 1000 * 60 * 60; // 1 hour
const BACKUP_KEY_PREFIX = 'solvio_backup_';

export function useBackup() {
  const { publicKey } = useWallet();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState<BackupMetadata | null>(null);

  // Initialize IndexedDB for local backup storage
  const initializeDB = useCallback(async () => {
    const request = indexedDB.open('SolvioBackups', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('backups')) {
        db.createObjectStore('backups', { keyPath: 'timestamp' });
      }
    };

    return new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, []);

  // Store backup in IndexedDB
  const storeLocalBackup = useCallback(async (data: Partial<BackupData>) => {
    const db = await initializeDB();
    const transaction = db.transaction(['backups'], 'readwrite');
    const store = transaction.objectStore('backups');
    
    // Get latest backup to merge with
    const latestBackup = await getLocalBackup();
    const backup: BackupData = {
      messages: data.messages || latestBackup?.messages || [],
      chats: data.chats || latestBackup?.chats || [],
      groups: data.groups || latestBackup?.groups || [],
      presence: data.presence || latestBackup?.presence || [],
      timestamp: Date.now(),
      version: BACKUP_VERSION
    };
    
    return new Promise<void>((resolve, reject) => {
      const request = store.put(backup);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }, [initializeDB]);

  // Get local backup from IndexedDB
  const getLocalBackup = useCallback(async (timestamp?: number) => {
    const db = await initializeDB();
    const transaction = db.transaction(['backups'], 'readonly');
    const store = transaction.objectStore('backups');
    
    if (timestamp) {
      return new Promise<BackupData>((resolve, reject) => {
        const request = store.get(timestamp);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    // Get latest backup if no timestamp specified
    return new Promise<BackupData>((resolve, reject) => {
      const request = store.openCursor(null, 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor?.value);
      };
      request.onerror = () => reject(request.error);
    });
  }, [initializeDB]);

  // Create backup of all chat data
  const backupAllChats = useCallback(async (data?: Partial<BackupData>) => {
    if (!publicKey || isBackingUp) return;
    
    try {
      setIsBackingUp(true);

      // Use provided data or collect all chat data
      const existingBackup = await getLocalBackup();
      const backup: BackupData = {
        messages: data?.messages || existingBackup?.messages || [],
        chats: data?.chats || existingBackup?.chats || [],
        groups: data?.groups || existingBackup?.groups || [],
        presence: data?.presence || existingBackup?.presence || [],
        timestamp: Date.now(),
        version: BACKUP_VERSION
      };

      // Store locally first
      await storeLocalBackup(backup);

      // Then upload to IPFS
      const cid = await uploadToIPFS(backup);

      // Store backup metadata
      const metadata: BackupMetadata = {
        timestamp: backup.timestamp,
        version: BACKUP_VERSION,
        size: new Blob([JSON.stringify(backup)]).size,
        checksum: cid
      };

      // Store metadata in localStorage for quick access
      localStorage.setItem(
        `${BACKUP_KEY_PREFIX}${publicKey.toBase58()}`,
        JSON.stringify(metadata)
      );

      setLastBackup(metadata);
      return metadata;

    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    } finally {
      setIsBackingUp(false);
    }
  }, [publicKey, isBackingUp, storeLocalBackup]);

  // Restore chats from backup
  const restoreChats = useCallback(async (options: RestoreOptions = { mergeStrategy: 'merge' }) => {
    if (!publicKey || isRestoring) return;

    try {
      setIsRestoring(true);

      // Try local backup first
      let backup = await getLocalBackup(options.fromTimestamp);

      // If no local backup or specifically requesting from IPFS
      if (!backup) {
        const metadataStr = localStorage.getItem(`${BACKUP_KEY_PREFIX}${publicKey.toBase58()}`);
        if (metadataStr) {
          const metadata: BackupMetadata = JSON.parse(metadataStr);
          backup = await getFromIPFS(metadata.checksum);
        }
      }

      if (!backup) {
        throw new Error('No backup found');
      }

      // TODO: Implement restore logic based on options.mergeStrategy
      // This will need to integrate with message/chat/group stores

      return backup;

    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    } finally {
      setIsRestoring(false);
    }
  }, [publicKey, isRestoring, getLocalBackup]);

  // Setup automatic backup interval
  useEffect(() => {
    if (!publicKey) return;

    const interval = setInterval(backupAllChats, BACKUP_INTERVAL);
    return () => clearInterval(interval);
  }, [publicKey, backupAllChats]);

  return {
    backupAllChats,
    restoreChats,
    isBackingUp,
    isRestoring,
    lastBackup
  };
}
