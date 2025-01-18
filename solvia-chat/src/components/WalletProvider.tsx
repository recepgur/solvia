import { FC, ReactNode } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'

// Configure the cluster using environment variables
const network = import.meta.env.VITE_SOLANA_NETWORK || 'mainnet-beta'
const endpoint = import.meta.env.VITE_RPC_ENDPOINT || clusterApiUrl(network)
const wallets = [
  new PhantomWalletAdapter({
    network: network as 'mainnet-beta' | 'devnet' | 'testnet'
  })
]

interface Props {
  children: ReactNode
}

export const SolanaWalletProvider: FC<Props> = ({ children }) => {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
