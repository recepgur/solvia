export interface IChainWallet {
  createWallet(): Promise<any>;
  getBalance(address: string): Promise<number>;
  sendTransaction(to: string, amount: number): Promise<string>;
  validateAddress(address: string): boolean;
}
