import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import '@solana/wallet-adapter-react-ui/styles.css'

// Initialize wallet adapter
const wallets = [new PhantomWalletAdapter()]

// Get network from environment
const network = import.meta.env.VITE_SOLANA_NETWORK || 'devnet'
const endpoint = clusterApiUrl(network)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </StrictMode>,
)
