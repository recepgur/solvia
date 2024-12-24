import React, { ReactElement, ReactNode } from 'react';
import { render as rtlRender, RenderOptions as RTLRenderOptions, RenderResult } from '@testing-library/react';
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { WalletReadyState, WalletName, WalletNotConnectedError, MessageSignerWalletAdapter, SignerWalletAdapter } from '@solana/wallet-adapter-base';
import { BaseWalletAdapter, WalletError } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, WalletContext, WalletContextState } from '@solana/wallet-adapter-react';
// Import jest-dom once
import '@testing-library/jest-dom';
// Import crypto mock for testing
import './setup/crypto.mock';
import { LanguageProvider } from '../contexts/LanguageContext';

// Create mock wallet adapter class
class MockWalletAdapter extends BaseWalletAdapter implements MessageSignerWalletAdapter, SignerWalletAdapter {
    _publicKey: PublicKey | null = new PublicKey('11111111111111111111111111111111');
    _connected: boolean = true;
    _connecting: boolean = false;
    _supportedTransactionVersions = new Set(['legacy', 0] as const);
    
    readonly name = 'Mock Wallet' as WalletName<string>;
    readonly url = 'https://mock.wallet';
    readonly icon = 'mock-icon';

    constructor() {
        super();
        this._connecting = false;
        this._connected = true;
        this._publicKey = new PublicKey('11111111111111111111111111111111');
    }

    get connecting(): boolean {
        return this._connecting;
    }

    get connected(): boolean {
        return this._connected;
    }

    get publicKey(): PublicKey | null {
        return this._publicKey;
    }

    get readyState(): WalletReadyState {
        return WalletReadyState.Installed;
    }

    get supportedTransactionVersions() {
        return this._supportedTransactionVersions;
    }

    async connect(): Promise<void> {
        try {
            this._connecting = true;
            this.emit('readyStateChange', WalletReadyState.Installed);
            await new Promise(resolve => setTimeout(resolve, 100));
            this._connected = true;
            this.emit('connect', this._publicKey!);
        } catch (error: any) {
            this.emit('error', new WalletError(error?.message, error));
            throw error;
        } finally {
            this._connecting = false;
        }
    }

    async disconnect(): Promise<void> {
        this._connected = false;
        this._connecting = false;
        this.emit('disconnect');
    }

    async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
        if (!this._connected) throw new WalletNotConnectedError();
        return transaction;
    }

    async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
        if (!this._connected) throw new WalletNotConnectedError();
        return transactions;
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        if (!this._connected) throw new WalletNotConnectedError();
        return message;
    }

    async sendTransaction<T extends Transaction | VersionedTransaction>(
        _transaction: T,
        _connection: Connection,
        _options?: any
    ): Promise<string> {
        if (!this._connected) throw new WalletNotConnectedError();
        return "mock_transaction_signature";
    }
}

// Create a single mock adapter instance
const mockAdapter = new MockWalletAdapter();

// Create spies for the adapter methods
jest.spyOn(mockAdapter, 'connect');
jest.spyOn(mockAdapter, 'disconnect');
jest.spyOn(mockAdapter, 'signTransaction');
jest.spyOn(mockAdapter, 'signAllTransactions');
jest.spyOn(mockAdapter, 'signMessage');

// Mock the wallet adapter modules
jest.mock('@solana/wallet-adapter-react', () => {
  const actual = jest.requireActual('@solana/wallet-adapter-react');
  return {
    ...actual,
    useWallet: () => ({
      publicKey: mockAdapter.publicKey,
      connected: mockAdapter.connected,
      connecting: mockAdapter.connecting,
      disconnect: () => mockAdapter.disconnect(),
      connect: () => mockAdapter.connect(),
      select: () => {},
      wallet: mockAdapter,
      wallets: [mockAdapter],
      signTransaction: (transaction: Transaction | VersionedTransaction) => mockAdapter.signTransaction(transaction),
      signAllTransactions: (transactions: (Transaction | VersionedTransaction)[]) => mockAdapter.signAllTransactions(transactions),
      signMessage: (message: Uint8Array) => mockAdapter.signMessage(message),
    }),
    ConnectionProvider: actual.ConnectionProvider,
    WalletProvider: ({ children }: { children: ReactNode }) => {
      const walletContextValue: WalletContextState = {
        autoConnect: true,
        connecting: false,
        connected: true,
        disconnecting: false,
        select: (_walletName: WalletName | null) => {},
        connect: async () => {},
        disconnect: async () => {},
        wallet: {
          adapter: mockAdapter,
          readyState: WalletReadyState.Installed
        },
        wallets: [{
          adapter: mockAdapter,
          readyState: WalletReadyState.Installed
        }],
        publicKey: mockAdapter.publicKey,
        sendTransaction: mockAdapter.sendTransaction.bind(mockAdapter),
        signTransaction: mockAdapter.signTransaction.bind(mockAdapter),
        signAllTransactions: mockAdapter.signAllTransactions.bind(mockAdapter),
        signMessage: mockAdapter.signMessage.bind(mockAdapter),
        signIn: undefined
      };
      return React.createElement(WalletContext.Provider, { value: walletContextValue }, children);
    },
  };
});



// Set up mock connection endpoint
const mockEndpoint = 'http://localhost:8899';

// Define test providers component
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ConnectionProvider endpoint={mockEndpoint}>
      <WalletProvider wallets={[mockAdapter]} autoConnect>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

interface CustomRenderOptions extends Omit<RTLRenderOptions, 'wrapper'> {
  initialState?: any;
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult {
  const rendered = rtlRender(ui, { wrapper: AllTheProviders, ...options });
  return {
    ...rendered,
    rerender: (ui: ReactNode) => rtlRender(ui, { wrapper: AllTheProviders, ...options })
  };
}

// Export everything
export * from '@testing-library/react';
export { customRender as render };
export { mockAdapter };
export { AllTheProviders as TestProviders };
