import { IChainWallet } from './IChainWallet';
import { ethers, ContractTransactionResponse } from 'ethers';

interface TokenMetadata {
  decimals: number;
  symbol: string;
  name: string;
}

/**
 * Custom error types for ERC20 operations
 */
class ERC20Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ERC20Error';
  }
}

/**
 * Interface defining the required methods for ERC20 token interaction
 * Extends ethers.BaseContract to ensure compatibility with ethers.js Contract class
 */
interface ERC20Methods {
  /**
   * Get the token balance for a specific address
   * @param owner - The address to check the balance for
   * @returns The balance as a bigint
   */
  balanceOf(owner: string): Promise<bigint>;

  /**
   * Get the number of decimals for the token
   * @returns The number of decimals
   */
  decimals(): Promise<number>;

  /**
   * Get the token symbol
   * @returns The token symbol
   */
  symbol(): Promise<string>;

  /**
   * Get the token name
   * @returns The token name
   */
  name(): Promise<string>;

  /**
   * Get the total supply of the token
   * @returns The total supply as a bigint
   */
  totalSupply(): Promise<bigint>;

  /**
   * Get the amount of tokens that an owner allowed to a spender
   * @param owner - The address that owns the tokens
   * @param spender - The address that can spend the tokens
   * @returns The allowance amount as a bigint
   */
  allowance(owner: string, spender: string): Promise<bigint>;

  /**
   * Approve the passed address to spend the specified amount of tokens
   * @param spender - The address which will spend the funds
   * @param value - The amount of tokens to be spent as a bigint
   * @returns The transaction response
   */
  approve(spender: string, value: bigint): Promise<ContractTransactionResponse>;

  /**
   * Transfer tokens to another address
   * @param to - The recipient address
   * @param amount - The amount to transfer as a bigint
   * @returns The transaction response
   */
  transfer(to: string, amount: bigint): Promise<ContractTransactionResponse>;

  /**
   * Transfer tokens from one address to another
   * @param from - The address which you want to send tokens from
   * @param to - The address which you want to transfer to
   * @param value - The amount of tokens to be transferred as a bigint
   * @returns The transaction response
   */
  transferFrom(from: string, to: string, value: bigint): Promise<ContractTransactionResponse>;
}

// Minimal ERC20 ABI for basic token operations
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

export interface ERC20Token {
  address: string;
  symbol: string;
  decimals: number;
  name?: string;
}

export interface TokenBalance {
  token: ERC20Token;
  balance: number;
}

class EthereumWallet implements IChainWallet {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet | null = null;
  private tokenMetadata: Map<string, TokenMetadata> = new Map();
  
  constructor() {
    // Initialize with a default provider (can be changed later)
    this.provider = new ethers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/your-api-key');
    // Create a random wallet for testing - in production this should be properly managed
    const randomWallet = ethers.Wallet.createRandom();
    this.signer = new ethers.Wallet(randomWallet.privateKey, this.provider);
  }

  async createWallet(): Promise<{ address: string; privateKey: string; }> {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    };
  }

  async getBalance(address: string): Promise<number> {
    try {
      const balance = await this.provider.getBalance(address);
      return Number(ethers.formatEther(balance));
    } catch (error) {
      console.error('Error getting ETH balance:', error);
      throw error;
    }
  }

  async sendTransaction(to: string, amount: number): Promise<string> {
    try {
      if (!this.validateAddress(to)) {
        throw new Error('Invalid recipient address');
      }

      // Note: This is a placeholder. In real implementation, we need:
      // 1. Wallet instance with private key
      // 2. Gas estimation
      // 3. Proper error handling
      if (!this.signer) {
        throw new Error('No signer available');
      }
      const tx = await this.signer.sendTransaction({
        to,
        value: ethers.parseUnits(amount.toString(), 18),
      });
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction failed');
      }
      return receipt.hash;
    } catch (error) {
      console.error('Error sending ETH:', error);
      throw error;
    }
  }

  validateAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  // ERC20 Token Methods
  /**
   * Get an ERC20 contract instance for the specified token address
   * @param tokenAddress - The address of the ERC20 token contract
   * @returns A typed contract instance implementing the IERC20 interface
   * @throws {ERC20Error} If the token address is invalid
   */
  private async getERC20Contract(tokenAddress: string): Promise<ethers.Contract & ERC20Methods> {
    if (!this.validateAddress(tokenAddress)) {
      throw new ERC20Error(`Invalid token address: ${tokenAddress}`);
    }

    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider) as ethers.Contract & ERC20Methods;

      // Validate that this is actually an ERC20 contract by checking required methods
      try {
        const [decimals, symbol, name] = await Promise.all([
          contract.decimals(),
          contract.symbol(),
          contract.name()
        ]).catch(() => {
          throw new ERC20Error('Contract does not implement required ERC20 methods');
        });

        // Cache token metadata
        this.tokenMetadata.set(tokenAddress, {
          decimals,
          symbol,
          name
        });

        return contract;
      } catch {
        throw new ERC20Error('Invalid ERC20 contract - missing required methods');
      }
    } catch (error) {
      if (error instanceof ERC20Error) {
        throw error;
      }
      throw new ERC20Error(`Failed to create ERC20 contract instance: ${(error as Error).message}`);
    }
  }

  /**
   * Get the balance of a specific ERC20 token for a user address
   * @param tokenAddress - The address of the ERC20 token contract
   * @param userAddress - The address to check the balance for
   * @returns A TokenBalance object containing token details and balance
   * @throws {ERC20Error} If the balance check fails
   */
  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<TokenBalance> {
    if (!this.validateAddress(userAddress)) {
      throw new ERC20Error(`Invalid user address: ${userAddress}`);
    }

    try {
      const contract = await this.getERC20Contract(tokenAddress);
      const [balance, decimals, symbol] = await Promise.all([
        contract.balanceOf(userAddress),
        contract.decimals(),
        contract.symbol()
      ]);
      
      return {
        token: {
          address: tokenAddress,
          symbol,
          decimals,
          name: this.tokenMetadata.get(tokenAddress)?.name || symbol
        },
        balance: parseFloat(ethers.formatUnits(balance, decimals))
      };
    } catch (error) {
      if (error instanceof ERC20Error) {
        throw error;
      }
      throw new ERC20Error(`Failed to get token balance: ${(error as Error).message}`);
    }
  }

  /**
   * Send tokens to another address
   * @param tokenAddress - The address of the ERC20 token contract
   * @param to - The recipient address
   * @param amount - The amount to send
   * @returns The transaction hash
   * @throws {ERC20Error} If the token transfer fails
   */
  async sendToken(tokenAddress: string, to: string, amount: string): Promise<string> {
    if (!this.validateAddress(to)) {
      throw new ERC20Error('Invalid recipient address');
    }

    try {
      if (!this.signer) {
        throw new ERC20Error('No signer available');
      }

      const contract = await this.getERC20Contract(tokenAddress);
      const decimals = await contract.decimals();
      const tokenContract = contract.connect(this.signer) as ethers.Contract & ERC20Methods;
      
      // Convert amount to proper decimal places
      const parsedAmount = ethers.parseUnits(amount, decimals);
      
      // Check if sender has sufficient balance
      const balance = await tokenContract.balanceOf(this.signer.address);
      if (balance < parsedAmount) {
        throw new ERC20Error('Insufficient token balance');
      }

      // Estimate gas for the transaction
      try {
        const data = tokenContract.interface.encodeFunctionData('transfer', [to, parsedAmount]);
        const txRequest = {
          from: this.signer.address,
          to: tokenAddress,
          data: data
        };
        await this.provider.estimateGas(txRequest);
      } catch (error) {
        throw new ERC20Error(`Transaction would fail: ${(error as Error).message}`);
      }

      const tx = await tokenContract.transfer(to, parsedAmount);
      try {
        const receipt = await tx.wait(1); // Wait for 1 confirmation
        if (!receipt || receipt.status === 0) {
          throw new ERC20Error('Transaction reverted on chain');
        }
        return receipt.hash;
      } catch (error) {
        if (error instanceof ERC20Error) {
          throw error;
        }
        throw new ERC20Error(`Transaction failed: ${(error as Error).message}`);
      }
    } catch (error) {
      if (error instanceof ERC20Error) {
        throw error;
      }
      throw new ERC20Error(`Failed to send token: ${(error as Error).message}`);
    }
  }
}

export default new EthereumWallet();
