import { IChainWallet } from './IChainWallet';
import { ethers } from 'ethers';

class EthereumWallet implements IChainWallet {
  private provider: ethers.JsonRpcProvider;
  
  constructor() {
    // Initialize with a default provider (can be changed later)
    this.provider = new ethers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/your-api-key');
  }

  async createWallet(): Promise<any> {
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
      // Note: This is a placeholder. In real implementation, we need:
      // 1. Wallet instance with private key
      // 2. Gas estimation
      // 3. Proper error handling
      const wallet = ethers.Wallet.createRandom().connect(this.provider);
      const tx = await wallet.sendTransaction({
        to,
        value: ethers.parseEther(amount.toString()),
      });
      return tx.hash;
    } catch (error) {
      console.error('Error sending ETH:', error);
      throw error;
    }
  }

  validateAddress(address: string): boolean {
    return ethers.isAddress(address);
  }
}

export default new EthereumWallet();
