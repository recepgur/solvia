import { PublicKey } from '@solana/web3.js';

export type ChainType = 'solana' | 'ethereum' | 'bitcoin';

export interface TokenItem {
  chain: ChainType;
  address: string;   // contract address or mint address
  symbol: string;
  decimals: number;
  name: string;
  logo?: string;     // optional logo URL
}

// Default SOLV token
const DEFAULT_SOLV_TOKEN: TokenItem = {
  chain: 'solana',
  address: '7bsVvXbR3524sgms6zjCF2BN3vHxuLePfb5CrqrPt4MQ',
  symbol: 'SOLV',
  decimals: 9,
  name: 'Solvio Token'
};

// User's custom tokens
let userTokens: TokenItem[] = [DEFAULT_SOLV_TOKEN];

// Load tokens from localStorage if available
const loadTokens = () => {
  try {
    const stored = localStorage.getItem('userTokens');
    if (stored) {
      const parsed = JSON.parse(stored);
      userTokens = [DEFAULT_SOLV_TOKEN, ...parsed.filter((t: TokenItem) => 
        t.address !== DEFAULT_SOLV_TOKEN.address
      )];
    }
  } catch (error) {
    console.error('Failed to load tokens:', error);
  }
};

// Save tokens to localStorage
const saveTokens = () => {
  try {
    localStorage.setItem('userTokens', JSON.stringify(userTokens));
  } catch (error) {
    console.error('Failed to save tokens:', error);
  }
};

// Validate token address based on chain
const validateTokenAddress = (chain: ChainType, address: string): boolean => {
  try {
    switch (chain) {
      case 'solana':
        new PublicKey(address);
        return true;
      case 'ethereum':
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      case 'bitcoin':
        // Bitcoin doesn't have tokens, but keeping for future compatibility
        return true;
      default:
        return false;
    }
  } catch {
    return false;
  }
};

// Add a new token
export const addToken = (token: TokenItem): boolean => {
  try {
    // Validate address format
    if (!validateTokenAddress(token.chain, token.address)) {
      throw new Error('Invalid token address');
    }

    // Check if token already exists
    if (userTokens.some(t => t.address === token.address && t.chain === token.chain)) {
      throw new Error('Token already exists');
    }

    userTokens.push(token);
    saveTokens();
    return true;
  } catch (error) {
    console.error('Failed to add token:', error);
    return false;
  }
};

// Remove a token
export const removeToken = (chain: ChainType, address: string): boolean => {
  try {
    // Don't allow removing the default token
    if (address === DEFAULT_SOLV_TOKEN.address) {
      throw new Error('Cannot remove default token');
    }

    const initialLength = userTokens.length;
    userTokens = userTokens.filter(t => !(t.chain === chain && t.address === address));
    
    if (userTokens.length === initialLength) {
      throw new Error('Token not found');
    }

    saveTokens();
    return true;
  } catch (error) {
    console.error('Failed to remove token:', error);
    return false;
  }
};

// Get all tokens
export const getTokens = (): TokenItem[] => {
  return [...userTokens];
};

// Get tokens for a specific chain
export const getChainTokens = (chain: ChainType): TokenItem[] => {
  return userTokens.filter(t => t.chain === chain);
};

// Initialize tokens on module load
loadTokens();

export default {
  addToken,
  removeToken,
  getTokens,
  getChainTokens
};
