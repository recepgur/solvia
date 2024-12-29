import * as bip39 from 'bip39';
import { WalletEncryption } from './walletEncryption';

export const generateSeedPhrase = (): string => {
  return bip39.generateMnemonic(128); // 12 words
};

export const validateSeedPhrase = (phrase: string): boolean => {
  return bip39.validateMnemonic(phrase);
};

export const encryptSeedPhrase = async (seedPhrase: string, password: string): Promise<string> => {
  return await WalletEncryption.encryptWallet(seedPhrase, password);
};

export const decryptSeedPhrase = async (encryptedPhrase: string, password: string): Promise<string> => {
  return await WalletEncryption.decryptWallet(encryptedPhrase, password);
};

export const storeSeedPhrase = async (seedPhrase: string, password: string): Promise<void> => {
  try {
    const encryptedPhrase = await encryptSeedPhrase(seedPhrase, password);
    localStorage.setItem('encryptedSeedPhrase', encryptedPhrase);
  } catch (error) {
    console.error('Failed to store seed phrase:', error);
    throw new Error('Failed to store seed phrase securely');
  }
};

export const getSeedPhrase = async (password: string): Promise<string | null> => {
  try {
    const encryptedPhrase = localStorage.getItem('encryptedSeedPhrase');
    if (!encryptedPhrase) return null;
    
    const decryptedPhrase = await decryptSeedPhrase(encryptedPhrase, password);
    if (!validateSeedPhrase(decryptedPhrase)) {
      throw new Error('Invalid seed phrase format');
    }
    
    return decryptedPhrase;
  } catch (error) {
    console.error('Failed to retrieve seed phrase:', error);
    return null;
  }
};
